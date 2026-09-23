/**
 * Authentication and Session Management Service
 * Supports Register, Login, Token generation/verification,
 * RBAC (USER, ADMIN), and Protected Route Middlewares.
 */

import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { User, UserRole, UserPreferences } from '../types.js';
import { mailService, EmailSendResult } from '../services/mailService.js';

const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

function resolveSecret(): string {
  const fromEnv = process.env.APP_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[FATAL] APP_SECRET tidak diset (atau kurang dari 32 karakter). ' +
      'Set di environment variable sebelum menjalankan production.'
    );
  }
  console.warn('[Auth] APP_SECRET belum diset — memakai secret sementara khusus development.');
  return 'dev-only-insecure-secret-do-not-use-in-production';
}

const JWT_SECRET = resolveSecret();

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
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
  public static verifyToken(token: string): AuthTokenPayload | null {
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
    const existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      if (!existing.is_verified || existing.verification_status === 'pending_verification') {
        const tokenRecord = db.createVerificationToken(existing.id, existing.email, 24);
        const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(tokenRecord.token)}`;
        const mailResult = await mailService.sendVerificationEmail(existing.email, existing.name, tokenRecord.token, baseUrl, tokenRecord.code);
        const err: any = new Error('Akun dengan email ini sudah terdaftar namun belum diverifikasi. Kode dan tautan aktivasi baru telah dikirimkan ke email Anda.');
        err.code = 'EMAIL_NOT_VERIFIED';
        err.email = cleanEmail;
        err.code_otp = tokenRecord.code;
        err.verificationUrl = verificationUrl;
        throw err;
      }
      throw new Error('Alamat email ini sudah terdaftar. Silakan langsung masuk (login) menggunakan kata sandi Anda.');
    }

    if (password.length < 6) {
      throw new Error('Password minimal 6 karakter.');
    }

    const { hash, salt } = this.hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isAdminAccount = cleanEmail === 'danwil028@gmail.com' || cleanEmail === 'wildanmn1933@gmail.com' || cleanEmail === 'admin@marketintel.pro';

    const newUser: User = {
      id: userId,
      email: cleanEmail,
      password_hash: hash,
      salt,
      name: name.trim() || cleanEmail.split('@')[0] || 'Trader',
      role: isAdminAccount ? 'ADMIN' : 'USER',
      is_verified: false,
      verification_status: 'pending_verification',
      plan: isAdminAccount ? 'INSTITUTIONAL' : 'FREE',
      subscription_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.insertUser(newUser);

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
    db.upsertUserPreferences(defaultPrefs);

    // Create 24h verification token and send verification email
    const tokenRecord = db.createVerificationToken(newUser.id, newUser.email, 24);
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(tokenRecord.token)}`;
    const mailResult = await mailService.sendVerificationEmail(newUser.email, newUser.name, tokenRecord.token, baseUrl, tokenRecord.code);

    return {
      user: newUser,
      status: 'pending_verification',
      message: 'Pendaftaran berhasil! Silakan periksa kotak masuk email Anda untuk mengaktifkan akun.',
      mailResult,
      code: tokenRecord.code,
      verificationUrl,
    };
  }

  /**
   * Authenticates user credentials with verification enforcement
   */
  public static login(email: string, password: string): { user: User; token: string } {
    const cleanEmail = email.toLowerCase().trim();
    let user = db.getUserByEmail(cleanEmail);
    if (!user) {
      const err: any = new Error('Alamat email belum terdaftar di ArahMarket. Silakan daftar akun baru.');
      err.code = 'USER_NOT_FOUND';
      err.email = cleanEmail;
      throw err;
    }

    const isValid = this.verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      const err: any = new Error('Kata sandi salah untuk akun ini. Silakan periksa kembali atau gunakan fitur Reset Kata Sandi.');
      err.code = 'INVALID_PASSWORD';
      err.email = cleanEmail;
      throw err;
    }

    // Enforce email verification check
    if (!user.is_verified || user.verification_status === 'pending_verification') {
      const err: any = new Error('Akun Anda belum aktif. Silakan verifikasi email Anda terlebih dahulu melalui tautan yang kami kirimkan.');
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
  public static verifyEmail(token: string): { success: boolean; user?: User; token?: string; error?: string } {
    const res = db.consumeVerificationToken(token);
    if (!res.success || !res.user) {
      return { success: false, error: res.error || 'Token verifikasi tidak valid atau telah kedaluwarsa.' };
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
  public static verifyCode(email: string, code: string): { success: boolean; user?: User; token?: string; error?: string } {
    const res = db.consumeVerificationCode(email, code);
    if (!res.success || !res.user) {
      return { success: false, error: res.error || 'Kode verifikasi tidak sesuai atau telah kedaluwarsa.' };
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
  ): Promise<{ success: boolean; message: string; resetUrl?: string; email: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const user = db.getUserByEmail(cleanEmail);
    if (!user) {
      const err: any = new Error('Alamat email belum terdaftar di ArahMarket.');
      err.code = 'USER_NOT_FOUND';
      err.email = cleanEmail;
      throw err;
    }

    const tokenRecord = db.createPasswordResetToken(user.id, user.email, 2);
    const result = await mailService.sendPasswordResetEmail(
      user.email,
      user.name,
      tokenRecord.token,
      baseUrl
    );

    return {
      success: true,
      message: 'Tautan pengaturan ulang kata sandi telah dikirim ke email Anda.',
      resetUrl: result.resetUrl,
      email: user.email,
    };
  }

  /**
   * Resets user password using valid reset token and logs them in
   */
  public static resetPassword(
    token: string,
    newPassword: string
  ): { success: boolean; message: string; user: User; token: string } {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Kata sandi baru minimal harus 6 karakter.');
    }

    const res = db.consumeToken(token, 'password_reset');
    if (!res.success || !res.user) {
      throw new Error(res.error || 'Tautan reset kata sandi tidak valid atau telah kedaluwarsa.');
    }

    const { hash, salt } = this.hashPassword(newPassword);
    const updated = db.updateUser(res.user.id, {
      password_hash: hash,
      salt,
      is_verified: true,
      verification_status: 'verified',
    });

    if (!updated) {
      throw new Error('Gagal memperbarui kata sandi pengguna.');
    }

    const sessionToken = this.generateToken(updated);
    return {
      success: true,
      message: 'Kata sandi berhasil diperbarui! Anda telah otomatis masuk.',
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
    let user = db.getUserByEmail(cleanEmail);

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
      db.insertUser(user);
    }

    const tokenRecord = db.createMagicLinkToken(user.id, user.email, 1);
    const result = await mailService.sendMagicLinkEmail(
      user.email,
      user.name,
      tokenRecord.token,
      baseUrl
    );

    return {
      success: true,
      message: 'Tautan masuk langsung (Magic Link) telah dikirim ke email Anda.',
      magicUrl: result.magicUrl,
      email: user.email,
    };
  }

  /**
   * Verifies magic link token and produces session JWT
   */
  public static verifyMagicLink(token: string): { success: boolean; user?: User; token?: string; error?: string } {
    const res = db.consumeToken(token, 'magic_link');
    if (!res.success || !res.user) {
      return { success: false, error: res.error || 'Tautan masuk tidak valid atau telah kedaluwarsa.' };
    }

    const updated = db.updateUser(res.user.id, {
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
   * Direct password reset by email (for self-recovery / instant reset)
   */
  public static directPasswordReset(
    email: string,
    newPassword: string
  ): { success: boolean; user: User; token: string } {
    const cleanEmail = email.toLowerCase().trim();
    const user = db.getUserByEmail(cleanEmail);
    if (!user) {
      const err: any = new Error('Akun dengan email ini tidak ditemukan.');
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }
    const { hash, salt } = this.hashPassword(newPassword);
    const updated = db.updateUser(user.id, {
      password_hash: hash,
      salt,
      is_verified: true,
      verification_status: 'verified',
    });
    if (!updated) {
      throw new Error('Gagal memperbarui kata sandi.');
    }
    const token = this.generateToken(updated);
    return { success: true, user: updated, token };
  }

  /**
   * Resends verification email for unverified user
   */
  public static async resendVerification(
    email: string,
    baseUrl: string
  ): Promise<{ success: boolean; message: string; code?: string; mailResult: EmailSendResult; verificationUrl?: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const user = db.getUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('Akun dengan alamat email ini tidak ditemukan.');
    }

    if (user.is_verified && user.verification_status !== 'pending_verification') {
      throw new Error('Akun Anda sudah terverifikasi sebelumnya. Silakan langsung masuk ke terminal.');
    }

    const tokenRecord = db.createVerificationToken(user.id, user.email, 24);
    const mailResult = await mailService.sendVerificationEmail(
      user.email,
      user.name,
      tokenRecord.token,
      baseUrl,
      tokenRecord.code
    );

    return {
      success: true,
      message: 'Kode dan tautan verifikasi baru telah dikirimkan ke email Anda.',
      mailResult,
      code: tokenRecord.code,
      verificationUrl: mailResult.devMode ? mailResult.verificationUrl : undefined,
    };
  }
}

/**
 * Express Middleware: Require Authentication
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : queryToken;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
    return;
  }

  const payload = AuthService.verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  let user = db.getUserById(payload.userId);
  if (!user && payload.email) {
    user = db.getUserByEmail(payload.email);
  }
  if (!user) {
    // If the token is cryptographically verified by server secret, auto-recover user so session is permanent
    const cleanEmail = payload.email.toLowerCase().trim();
    const isAdminAccount = payload.role === 'ADMIN' || cleanEmail === 'danwil028@gmail.com' || cleanEmail === 'wildanmn1933@gmail.com' || cleanEmail === 'admin@marketintel.pro';
    const defaultPass = AuthService.hashPassword('Trader123!');
    const recoveredUser: User = {
      id: payload.userId,
      email: cleanEmail,
      password_hash: defaultPass.hash,
      salt: defaultPass.salt,
      name: cleanEmail.split('@')[0],
      role: isAdminAccount ? 'ADMIN' : 'USER',
      is_verified: true,
      verification_status: 'verified',
      plan: isAdminAccount ? 'INSTITUTIONAL' : 'FREE',
      subscription_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.insertUser(recoveredUser);
    user = recoveredUser;
  }

  if (!user.is_verified || user.verification_status === 'pending_verification') {
    db.updateUser(user.id, { is_verified: true, verification_status: 'verified' });
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
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : queryToken;

  if (token) {
    const payload = AuthService.verifyToken(token);
    if (payload) {
      let user = db.getUserById(payload.userId);
      if (!user && payload.email) {
        user = db.getUserByEmail(payload.email);
      }
      if (user) req.user = user;
    }
  }
  next();
}
