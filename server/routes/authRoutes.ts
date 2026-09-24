import { Router, Response } from 'express';
import { AuthService, requireAuth, requireAdmin, AuthenticatedRequest, toPublicUser } from '../auth/authService.js';
import { db } from '../db/database.js';
import { getOrCreateUser } from '../../src/db/users.ts';
import { adminAuth } from '../../src/lib/firebase-admin.ts';
import { mailService, MailService } from '../services/mailService.js';
import { authLimiter, credentialLimiter } from '../middleware/rateLimit.js';

export const authRouter = Router();

/**
 * Verification/reset links are only echoed back outside production, so local
 * development stays usable without an SMTP server while a deployed instance
 * never hands a token to whoever happened to call the endpoint.
 */
function exposeLink<T extends { verificationUrl?: string; resetUrl?: string; magicUrl?: string }>(
  payload: T
): T {
  if (MailService.linksVisibleToCaller()) return payload;
  const { verificationUrl, resetUrl, magicUrl, ...rest } = payload;
  return rest as T;
}

function getBaseUrl(req: any): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const protoHeader = (req.headers['x-forwarded-proto'] as string | undefined) || req.protocol || 'https';
  const protocol = protoHeader.split(',')[0].trim();
  const hostHeader = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host || 'localhost:3000';
  const host = hostHeader.split(',')[0].trim();
  return `${protocol}://${host}`;
}

authRouter.post('/register', credentialLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email address and password are required.' });
      return;
    }

    const baseUrl = getBaseUrl(req);
    const result = await AuthService.register(email, password, name || 'Trader', baseUrl);

    res.status(201).json(exposeLink({
      success: true,
      status: result.status,
      message: result.message,
      email: result.user.email,
      token: result.token,
      verificationUrl: result.verificationUrl,
      user: toPublicUser(result.user),
    }));
  } catch (err: any) {
    if (err.code === 'EMAIL_NOT_VERIFIED') {
      res.status(403).json(exposeLink({
        error: err.message,
        code: 'EMAIL_NOT_VERIFIED',
        email: err.email,
        verificationUrl: err.verificationUrl,
      }));
      return;
    }
    res.status(400).json({ error: err.message });
  }
});

authRouter.post('/login', credentialLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email address and password are required.' });
      return;
    }
    const result = await AuthService.login(email, password);
    res.json({
      user: toPublicUser(result.user),
      token: result.token,
    });
  } catch (err: any) {
    const cleanEmail = (req.body.email || '').toLowerCase().trim();
    const baseUrl = getBaseUrl(req);

    if (err.code === 'EMAIL_NOT_VERIFIED') {
      const user = await db.getUserByEmail(err.email || cleanEmail);
      let verificationUrl: string | undefined;
      if (user) {
        let tokenRecord = await db.getLatestPendingVerificationToken(user.id);
        if (!tokenRecord) {
          tokenRecord = await db.createVerificationToken(user.id, user.email, 24);
        }
        verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(tokenRecord.token)}`;
      }
      res.status(403).json(exposeLink({
        error: err.message,
        code: 'EMAIL_NOT_VERIFIED',
        email: err.email || cleanEmail,
        verificationUrl,
      }));
      return;
    }

    const existingUser = cleanEmail ? await db.getUserByEmail(cleanEmail) : null;
    res.status(401).json({
      error: err.message || 'Authentication failed. Check your email and password.',
      code: err.code || (existingUser ? 'INVALID_PASSWORD' : 'USER_NOT_FOUND'),
      email: cleanEmail,
      userExists: Boolean(existingUser),
    });
  }
});

authRouter.post('/firebase-login', credentialLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      res.status(400).json({ error: 'A Firebase ID token is required.' });
      return;
    }

    // The client controls its own request body, so the identity must come from
    // the signed token Firebase issued — never from `email`/`uid` fields.
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch (verifyErr: any) {
      console.warn('[Auth] Rejected firebase-login token:', verifyErr?.code || verifyErr?.message);
      res.status(401).json({ error: 'Invalid or expired Google sign-in token. Please sign in again.' });
      return;
    }

    if (!decoded.email) {
      res.status(400).json({ error: 'That Google account has no verified email address.' });
      return;
    }

    const cleanEmail = decoded.email.toLowerCase().trim();
    const uid = decoded.uid;
    const displayName = typeof decoded.name === 'string' ? decoded.name : undefined;

    let user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      user = {
        id: uid,
        email: cleanEmail,
        password_hash: '',
        salt: '',
        name: displayName || cleanEmail.split('@')[0] || 'Trader',
        role: 'USER',
        is_verified: true,
        verification_status: 'verified',
        plan: 'PRO',
        subscription_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.insertUser(user);
    } else {
      user = await db.updateUser(user.id, {
        is_verified: true,
        verification_status: 'verified',
        updated_at: new Date().toISOString(),
      }) || user;
    }

    // Also sync to Cloud SQL PostgreSQL
    try {
      await getOrCreateUser(uid, cleanEmail, displayName);
    } catch (sqlErr) {
      console.warn('[Cloud SQL] User sync notice:', sqlErr);
    }

    const token = AuthService.generateToken(user);
    res.json({
      success: true,
      token,
      user: toPublicUser(user),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Verifies email via GET (direct click from email client)
 * If opened in browser (Accept: text/html), serves a stylized redirect card.
 * If requested via API/Fetch, responds with JSON.
 */
authRouter.get('/verify-email', async (req, res) => {
  const token = req.query.token as string | undefined;

  if (!token) {
    if (req.accepts('html')) {
      res.status(400).send(renderVerificationResultHtml(false, 'No verification token parameter found.'));
      return;
    }
    res.status(400).json({ error: 'A verification token parameter is required.' });
    return;
  }

  const result = await AuthService.verifyEmail(token);

  if (!result.success || !result.user || !result.token) {
    const errorMsg = result.error || 'That verification token is invalid or has expired.';
    if (req.accepts('html')) {
      res.status(400).send(renderVerificationResultHtml(false, errorMsg));
      return;
    }
    res.status(400).json({ error: errorMsg });
    return;
  }

  if (req.accepts('html')) {
    res.send(renderVerificationResultHtml(true, 'Your email address is verified. Your trading account is now active.', result.token, result.user));
    return;
  }

  res.json({
    success: true,
    message: 'Email verified. Your account is now active.',
    token: result.token,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      is_verified: true,
      verification_status: 'verified',
    },
  });
});

/**
 * Verifies email via POST (programmatic verification from UI)
 */
authRouter.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'A verification token is required.' });
    return;
  }

  const result = await AuthService.verifyEmail(token);
  if (!result.success || !result.user || !result.token) {
    res.status(400).json({ error: result.error || 'That token is invalid or has expired.' });
    return;
  }

  res.json({
    success: true,
    message: 'Email verified. Your account is now active.',
    token: result.token,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      is_verified: true,
      verification_status: 'verified',
    },
  });
});

/**
 * Checks verification status by email (for auto-polling in UI)
 */
authRouter.get('/check-status', async (req, res) => {
  const email = ((req.query.email as string) || '').toLowerCase().trim();
  if (!email) {
    res.status(400).json({ error: 'Parameter email wajib disertakan.' });
    return;
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const isVerified = user.is_verified || user.verification_status === 'verified';
  const token = isVerified ? AuthService.generateToken(user) : undefined;

  res.json({
    email: user.email,
    is_verified: isVerified,
    verification_status: user.verification_status,
    token,
    user: isVerified ? {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_verified: true,
      verification_status: 'verified',
      plan: user.plan || 'FREE',
      subscription_status: user.subscription_status || 'active',
    } : undefined,
  });
});

/**
 * Verifies email via 6-digit OTP code (typed directly in UI)
 */
authRouter.post('/verify-code', credentialLimiter, async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: 'Email address and the 6-digit verification code are required.' });
    return;
  }

  const result = await AuthService.verifyCode(email, code);
  if (!result.success || !result.user || !result.token) {
    res.status(400).json({ error: result.error || 'That verification code is incorrect or has expired.' });
    return;
  }

  res.json({
    success: true,
    message: 'Email verified. Your account is now active.',
    token: result.token,
    user: toPublicUser(result.user),
  });
});

/**
 * Resends verification email for a registered user pending verification
 */
authRouter.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Alamat email wajib diisi.' });
      return;
    }

    const baseUrl = getBaseUrl(req);
    const result = await AuthService.resendVerification(email, baseUrl);

    res.json(exposeLink({
      success: true,
      message: result.message,
      verificationUrl: result.verificationUrl,
    }));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const preferences = await db.getUserPreferences(user.id);
  const watchlist = await db.getUserWatchlist(user.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_verified: user.is_verified,
      verification_status: user.verification_status,
      avatar_url: user.avatar_url,
      plan: user.plan || (user.role === 'ADMIN' ? 'INSTITUTIONAL' : 'FREE'),
      subscription_status: user.subscription_status || 'active',
      subscription_expires_at: user.subscription_expires_at,
    },
    preferences,
    watchlist,
  });
});

authRouter.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name, avatar_url } = req.body;
  const updated = await db.updateUser(user.id, { name, avatar_url });
  res.json({ user: updated ? toPublicUser(updated) : null });
});

authRouter.put('/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { timezone, language, theme, default_market_view, density, audio_alerts } = req.body;
  const prefs = await db.upsertUserPreferences({
    user_id: user.id,
    timezone: timezone || 'UTC',
    language: language || 'en',
    theme: theme || 'dark',
    default_market_view: default_market_view || 'XAUUSD',
    density: density || 'compact',
    audio_alerts: Boolean(audio_alerts),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  res.json({ preferences: prefs });
});

/**
 * Request Password Reset (Sends email with reset link)
 */
authRouter.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Alamat email wajib diisi.' });
      return;
    }
    const baseUrl = getBaseUrl(req);
    const result = await AuthService.requestPasswordReset(email, baseUrl);
    res.json(exposeLink(result));
  } catch (err: any) {
    res.status(400).json({ error: err.message, code: err.code });
  }
});

/**
 * Reset Password using Token or Direct Recovery
 */
authRouter.post('/reset-password', credentialLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Verification token and new password are required.' });
      return;
    }

    const result = await AuthService.resetPassword(token, newPassword);
    res.json({
      success: result.success,
      message: result.message,
      token: result.token,
      user: toPublicUser(result.user),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Password Reset Legacy/Compatibility Endpoint
 *
 * Only the token-based path is honoured. Resetting from an email alone let any
 * caller overwrite any account's password, so it is no longer accepted.
 */
authRouter.post('/password-reset', credentialLimiter, async (req, res) => {
  try {
    const { token, newPassword, password } = req.body;
    const targetPassword = newPassword || password;

    if (!token || !targetPassword) {
      res.status(400).json({
        error: 'A reset token and a new password are required. Request a reset link first.',
      });
      return;
    }

    const result = await AuthService.resetPassword(token, targetPassword);
    res.json({
      success: result.success,
      message: result.message,
      token: result.token,
      user: toPublicUser(result.user),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Passwordless Magic Link Request
 */
authRouter.post('/magic-link', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Alamat email wajib diisi.' });
      return;
    }
    const baseUrl = getBaseUrl(req);
    const result = await AuthService.requestMagicLink(email, baseUrl);
    res.json(exposeLink(result));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Direct Magic Link verification via browser GET
 */
authRouter.get('/magic-link', async (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    if (req.accepts('html')) {
      res.status(400).send(renderVerificationResultHtml(false, 'No sign-in token parameter found.'));
      return;
    }
    res.status(400).json({ error: 'A sign-in token parameter is required.' });
    return;
  }

  const result = await AuthService.verifyMagicLink(token);
  if (!result.success || !result.user || !result.token) {
    const errorMsg = result.error || 'That sign-in link is invalid or has expired.';
    if (req.accepts('html')) {
      res.status(400).send(renderVerificationResultHtml(false, errorMsg));
      return;
    }
    res.status(400).json({ error: errorMsg });
    return;
  }

  if (req.accepts('html')) {
    res.send(
      renderVerificationResultHtml(
        true,
        `Selamat datang kembali, ${result.user.name}! Mengalihkan ke terminal trading...`,
        result.token,
        result.user.name
      )
    );
    return;
  }

  res.json({
    success: true,
    message: 'Signed in via instant link.',
    token: result.token,
    user: toPublicUser(result.user),
  });
});

/**
 * Magic Link verification via programmatic POST
 */
authRouter.post('/magic-link-verify', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'Token wajib disertakan.' });
    return;
  }
  const result = await AuthService.verifyMagicLink(token);
  if (!result.success || !result.user || !result.token) {
    res.status(400).json({ error: result.error || 'That sign-in link is invalid or has expired.' });
    return;
  }
  res.json({
    success: true,
    message: 'Signed in.',
    token: result.token,
    user: toPublicUser(result.user),
  });
});

authRouter.get('/accounts', requireAdmin, async (_req, res) => {
  try {
    const users = (await db.getAllUsers()).map(u => ({
      email: u.email,
      name: u.name,
      role: u.role,
      plan: u.plan,
      is_verified: u.is_verified,
    }));
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Emergency Quick Login / Demo Trader Login
 *
 * Removed: it issued a session (admin, for known addresses) from an email alone,
 * with no password and no token. Use POST /login or /firebase-login instead.
 */
authRouter.post('/quick-login', credentialLimiter, (_req, res) => {
  res.status(410).json({
    error: 'Endpoint ini sudah dinonaktifkan. Silakan masuk memakai email dan password, atau Google Sign-In.',
    code: 'ENDPOINT_REMOVED',
  });
});

function renderVerificationResultHtml(success: boolean, message: string, token?: string, user?: any): string {
  const userSafe = user
    ? {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: true,
        verification_status: 'verified',
        plan: user.plan || (user.role === 'ADMIN' ? 'INSTITUTIONAL' : 'FREE'),
      }
    : null;

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${success ? 'Email Terverifikasi' : 'Verification failed'} • ArahMarket</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #020617;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background-color: #0f172a;
      border: 1px solid ${success ? '#06b6d4' : '#ef4444'};
      border-radius: 16px;
      padding: 36px 32px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .icon {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      background-color: ${success ? 'rgba(6, 182, 212, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
      color: ${success ? '#06b6d4' : '#ef4444'};
    }
    h1 {
      font-size: 22px;
      margin: 0 0 12px;
      font-weight: 700;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 28px;
    }
    .btn {
      display: inline-block;
      background-color: ${success ? '#06b6d4' : '#334155'};
      color: ${success ? '#020617' : '#f8fafc'};
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    .hint-box {
      margin-top: 24px;
      padding: 14px;
      border-radius: 8px;
      background: rgba(6, 182, 212, 0.08);
      border: 1px solid rgba(6, 182, 212, 0.2);
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .account-badge {
      display: inline-block;
      margin: 8px 0 16px;
      padding: 4px 12px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-family: monospace;
      font-size: 12px;
      color: #38bdf8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✓' : '✕'}</div>
    <h1>${success ? 'Account activated!' : 'Verification failed'}</h1>
    ${userSafe && userSafe.email ? `<div class="account-badge">${userSafe.email}</div>` : ''}
    <p>${message}</p>
    
    <a href="/" id="action-btn" class="btn">${success ? 'Open the trading terminal' : 'Back to home'}</a>

    ${
      success
        ? `
    <div class="hint-box">
      <strong>Next step:</strong> you can return to the <strong>ArahMarket</strong> tab in your browser. The terminal will automatically recognise your now-active account.
    </div>
    `
        : ''
    }
  </div>
  ${
    success && token
      ? `
  <script>
    try {
      var tok = ${JSON.stringify(token)};
      var usr = ${JSON.stringify(userSafe)};
      localStorage.setItem('arah_market_auth_token', tok);
      localStorage.setItem('auth_token', tok);
      localStorage.setItem('nexus_auth_token', tok);
      try { sessionStorage.setItem('arah_market_auth_token', tok); } catch(e){}
      if (usr) {
        var str = JSON.stringify(usr);
        localStorage.setItem('arah_market_user', str);
        localStorage.setItem('auth_user', str);
        localStorage.setItem('nexus_user', str);
        try { sessionStorage.setItem('arah_market_user', str); } catch(e){}
      }
      
      // Notify any other active tab via BroadcastChannel & localStorage event
      try {
        var bc = new BroadcastChannel('arah_market_auth');
        bc.postMessage({ type: 'EMAIL_VERIFIED', token: tok, user: usr });
      } catch(e){}
      try {
        localStorage.setItem('arah_market_verified_ping', String(Date.now()));
      } catch(e){}
    } catch(e) {}
  </script>
  `
      : ''
  }
</body>
</html>
  `.trim();
}
