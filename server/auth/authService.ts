/**
 * Authentication and Session Management Service
 * Supports Register, Login, Token generation/verification,
 * RBAC (USER, ADMIN), and Protected Route Middlewares.
 */

import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { User, UserRole, UserPreferences } from '../types.js';
import { mailService, MailService, EmailSendResult } from '../services/mailService.js';

const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

function resolveSecret(): string {
  const fromEnv = process.env.APP_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[FATAL] APP_SECRET is not set (or is shorter than 32 characters). ' +
      'Set it in the environment before starting production.'
    );
  }

  // A fixed development fallback would let anyone forge a token for this
  // instance, since the constant is published in the repository. Mint a random
  // one instead: sessions stop surviving a restart, which is the safe trade.
  console.warn(
    '[Auth] APP_SECRET is not set - using a random per-process secret. ' +
    'Sessions will not survive a server restart. Set APP_SECRET for persistent sessions.'
  );
  return crypto.randomBytes(48).toString('hex');
}

const JWT_SECRET = resolveSecret();

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
}

/** User shape that is safe to send to a client: no credential material. */
export function toPublicUser(user: User) {
  const {
    password_hash: _passwordHash,
    salt: _salt,
    last_order_id: _lastOrderId,
    payment_method: _paymentMethod,
    billing_cycle: _billingCycle,
    ...safe
  } = user;
  return safe;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export class AuthService {
  public static hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, s, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
      .toString('hex');
    return { hash, salt: s };
  }

  public static verifyPassword(password: string, hash: string, salt: string): boolean {
    if (!password || !hash || !salt) return false;
    try {
      const derived = crypto.pbkdf2Sync(
        password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST
      );
      const stored = Buffer.from(hash, 'hex');
      if (derived.length !== stored.length) return false;
      return crypto.timingSafeEqual(derived, stored);
    } catch {
      return false;
    }
  }

  /**
   * Issues stateless signed authorization token
   */
  public static generateToken(user: User): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      })
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Validates token and returns decoded payload
   */
  static async verifyToken(token: string): Promise<AuthTokenPayload | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, payload, signature] = parts;

      const expectedSig = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (signature !== expectedSig) return null;

      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as AuthTokenPayload;
      if (decoded.exp < Math.floor(Date.now() / 1000)) return null;

      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Registers a new user with mandatory email verification link delivery
   */
  public static async register(
    email: string,
    password: string,
    name: string,
    baseUrl: string
  ): Promise<{
    user: User;
    token?: string;
    code?: string;
    status: 'pending_verification' | 'verified';
    message: string;
    mailResult?: EmailSendResult;
    verificationUrl?: string;
  }> {
    const cleanEmail = email.toLowerCase().trim();
    const existing = await db.getUserByEmail(cleanEmail);
    if (existing) {
      if (!existing.is_verified || existing.verification_status === 'pending_verification') {
        const tokenRecord = await db.createVerificationToken(existing.id, existing.email, 24);
        const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(tokenRecord.token)}`;
        const mailResult = await mailService.sendVerificationEmail(existing.email, existing.name, tokenRecord.token, baseUrl, tokenRecord.code);
        const err: any = new Error('This email is already registered but not verified. A fresh activation code and link have been sent to your email.');
        err.code = 'EMAIL_NOT_VERIFIED';
        err.email = cleanEmail;
        err.code_otp = tokenRecord.code;
        err.verificationUrl = verificationUrl;
        throw err;
      }
      throw new Error('This email address is already registered. Sign in with your password instead.');
    }

    if (password.length < 6) {
      throw new Error('Password minimal 6 karakter.');
    }

    const { hash, salt } = this.hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Registration never grants elevated privileges: the email address is
    // self-asserted and unverified at this point. Admin rights are assigned
    // through the admin API only.
    const newUser: User = {
      id: userId,
      email: cleanEmail,
      password_hash: hash,
      salt,
      name: name.trim() || cleanEmail.split('@')[0] || 'Trader',
      role: 'USER',
      is_verified: false,
      verification_status: 'pending_verification',
      plan: 'FREE',
      subscription_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.insertUser(newUser);

    const defaultPrefs: UserPreferences = {
      user_id: userId,
      timezone: 'UTC',
      language: 'en',
      theme: 'dark',
      default_market_view: 'XAUUSD',
      density: 'compact',
      audio_alerts: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.upsertUserPreferences(defaultPrefs);

    // Create 24h verification token and send verification email
    const tokenRecord = await db.createVerificationToken(newUser.id, newUser.email, 24);
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(tokenRecord.token)}`;
    const mailResult = await mailService.sendVerificationEmail(newUser.email, newUser.name, tokenRecord.token, baseUrl, tokenRecord.code);

    return {
      user: newUser,
      status: 'pending_verification',
      message: 'Registration successful. Check your inbox to activate your account.',
      mailResult,
      code: tokenRecord.code,
      verificationUrl,
    };
  }

  /**
   * Authenticates user credentials with verification enforcement
   */
  public static async login(email: string, password: string): Promise<{ user: User; token: string }>  {
    const cleanEmail = email.toLowerCase().trim();
    let user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      const err: any = new Error('This email address is not registered with ArahMarket. Create a new account instead.');
      err.code = 'USER_NOT_FOUND';
      err.email = cleanEmail;
      throw err;
    }

    const isValid = this.verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      const err: any = new Error('Incorrect password for this account. Check it again or use the password reset flow.');
      err.code = 'INVALID_PASSWORD';
      err.email = cleanEmail;
      throw err;
    }

    // Enforce email verification check
    if (!user.is_verified || user.verification_status === 'pending_verification') {
      const err: any = new Error('Your account is not active yet. Verify your email first using the link we sent.');
      err.code = 'EMAIL_NOT_VERIFIED';
      err.email = cleanEmail;
      throw err;
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * Verifies an email token from verification_tokens table and activates user
   */
  public static async verifyEmail(token: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }>  {
    const res = await db.consumeVerificationToken(token);
    if (!res.success || !res.user) {
      return { success: false, error: res.error || 'That verification token is invalid or has expired.' };
    }

    const sessionToken = this.generateToken(res.user);
    return {
      success: true,
      user: res.user,
      token: sessionToken,
    };
  }

  /**
   * Verifies an email using 6-digit numeric OTP code and activates user
   */
  public static async verifyCode(email: string, code: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }>  {
    const res = await db.consumeVerificationCode(email, code);
    if (!res.success || !res.user) {
      return { success: false, error: res.error || 'That verification code is incorrect or has expired.' };
    }

    const sessionToken = this.generateToken(res.user);
    return {
      success: true,
      user: res.user,
      token: sessionToken,
    };
  }

  /**
   * Generates a password reset token and sends email
   */
  public static async requestPasswordReset(
    email: string,
    baseUrl: string
  ): Promise<{ success: boolean; message: string; mailSent: boolean; resetUrl?: string; email: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      const err: any = new Error('This email address is not registered with ArahMarket.');
      err.code = 'USER_NOT_FOUND';
      err.email = cleanEmail;
      throw err;
    }

    const tokenRecord = await db.createPasswordResetToken(user.id, user.email, 2);
    const result = await mailService.sendPasswordResetEmail(
      user.email,
      user.name,
      tokenRecord.token,
      baseUrl
    );

    // Never claim an email went out when the transport never ran. The previous
    // unconditional "sent to your email" made a misconfigured SMTP look like a
    // missing inbox message, which is the hardest possible thing to debug.
    const linkVisible = MailService.linksVisibleToCaller();
    let message: string;
    if (result.devMode) {
      message = linkVisible
        ? 'No mail transport is configured, so no email was sent. Use the reset link returned below.'
        : 'No mail transport is configured, so no email was sent. Ask an operator for the link in the server log.';
      console.warn(
        `[Auth] Password reset for ${user.email} was generated in dev mode; no email left the server. ` +
        'Set AUTH_DEV_LINK_ECHO=true to receive the link in the response, or configure SMTP_* for real delivery.'
      );
    } else if (!result.success) {
      message = 'The reset link was created but the email could not be delivered. Request a new link or contact support.';
      console.error(`[Auth] Password reset email for ${user.email} failed: ${result.error || 'unknown error'}`);
    } else {
      message = 'A password reset link has been sent to your email.';
    }

    return {
      success: true,
      message,
      mailSent: !result.devMode && result.success,
      resetUrl: result.devMode && linkVisible ? result.resetUrl : undefined,
      email: user.email,
    };
  }

  /**
   * Resets user password using valid reset token and logs them in
   */
  public static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; user: User; token: string }>  {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('The new password must be at least 6 characters.');
    }

    const res = await db.consumeToken(token, 'password_reset');
    if (!res.success || !res.user) {
      throw new Error(res.error || 'That password reset link is invalid or has expired.');
    }

    const { hash, salt } = this.hashPassword(newPassword);
    const updated = await db.updateUser(res.user.id, {
      password_hash: hash,
      salt,
      is_verified: true,
      verification_status: 'verified',
    });

    if (!updated) {
      throw new Error('Could not update the user password.');
    }

    const sessionToken = this.generateToken(updated);
    return {
      success: true,
      message: 'Password updated. You have been signed in automatically.',
      user: updated,
      token: sessionToken,
    };
  }

  /**
   * Passwordless Magic Link Request
   */
  public static async requestMagicLink(
    email: string,
    baseUrl: string
  ): Promise<{ success: boolean; message: string; magicUrl?: string; email: string }> {
    const cleanEmail = email.toLowerCase().trim();
    let user = await db.getUserByEmail(cleanEmail);

    // If user does not exist yet, provision account seamlessly
    if (!user) {
      const pass = this.hashPassword(crypto.randomBytes(16).toString('hex'));
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      user = {
        id: userId,
        email: cleanEmail,
        password_hash: pass.hash,
        salt: pass.salt,
        name: cleanEmail.split('@')[0] || 'Trader',
        role: 'USER',
        is_verified: true,
        verification_status: 'verified',
        plan: 'FREE',
        subscription_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.insertUser(user);
    }

    const tokenRecord = await db.createMagicLinkToken(user.id, user.email, 1);
    const result = await mailService.sendMagicLinkEmail(
      user.email,
      user.name,
      tokenRecord.token,
      baseUrl
    );

    return {
      success: true,
      message: 'A magic sign-in link has been sent to your email.',
      magicUrl: result.magicUrl,
      email: user.email,
    };
  }

  /**
   * Verifies magic link token and produces session JWT
   */
  public static async verifyMagicLink(token: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }>  {
    const res = await db.consumeToken(token, 'magic_link');
    if (!res.success || !res.user) {
      return { success: false, error: res.error || 'That sign-in link is invalid or has expired.' };
    }

    const updated = await db.updateUser(res.user.id, {
      is_verified: true,
      verification_status: 'verified',
    }) || res.user;

    const sessionToken = this.generateToken(updated);
    return {
      success: true,
      user: updated,
      token: sessionToken,
    };
  }

  /**
   * Resends verification email for unverified user
   */
  public static async resendVerification(
    email: string,
    baseUrl: string
  ): Promise<{ success: boolean; message: string; code?: string; mailResult: EmailSendResult; verificationUrl?: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('No account found with this email address.');
    }

    if (user.is_verified && user.verification_status !== 'pending_verification') {
      throw new Error('Your account was already verified. Sign in to the terminal directly.');
    }

    const tokenRecord = await db.createVerificationToken(user.id, user.email, 24);
    const mailResult = await mailService.sendVerificationEmail(
      user.email,
      user.name,
      tokenRecord.token,
      baseUrl,
      tokenRecord.code
    );

    return {
      success: true,
      message: 'A new verification code and link have been sent to your email.',
      mailResult,
      code: tokenRecord.code,
      verificationUrl: mailResult.devMode ? mailResult.verificationUrl : undefined,
    };
  }
}

/**
 * Express Middleware: Require Authentication
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : queryToken;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
    return;
  }

  const payload = await AuthService.verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  // Resolve the caller strictly from stored records. Never trust role, email or
  // plan from the token body, and never create an account from a token — doing
  // so let a forged payload mint its own admin user.
  const user =
    (await db.getUserById(payload.userId)) ||
    (payload.email ? await db.getUserByEmail(payload.email) : null);

  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Account no longer exists' });
    return;
  }

  if (!user.is_verified || user.verification_status === 'pending_verification') {
    await db.updateUser(user.id, { is_verified: true, verification_status: 'verified' });
    user.is_verified = true;
    user.verification_status = 'verified';
  }

  req.user = user;
  next();
}

/**
 * Express Middleware: Require ADMIN Role
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }
    next();
  });
}

/**
 * Express Middleware: Optional Authentication (sets req.user if valid token provided)
 */
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : queryToken;

  if (token) {
    const payload = await AuthService.verifyToken(token);
    if (payload) {
      let user = await db.getUserById(payload.userId);
      if (!user && payload.email) {
        user = await db.getUserByEmail(payload.email);
      }
      if (user) req.user = user;
    }
  }
  next();
}
