import { Router, Response } from 'express';
import { AuthService, requireAuth, AuthenticatedRequest } from '../auth/authService.js';
import { db } from '../db/database.js';
import { getOrCreateUser } from '../../src/db/users.ts';

export const authRouter = Router();

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

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email address and password are required.' });
      return;
    }

    const baseUrl = getBaseUrl(req);
    const result = await AuthService.register(email, password, name || 'Trader', baseUrl);

    res.status(201).json({
      success: true,
      status: result.status,
      message: result.message,
      email: result.user.email,
      token: result.token,
      verificationUrl: result.verificationUrl,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        is_verified: result.user.is_verified,
        verification_status: result.user.verification_status,
        plan: result.user.plan || 'FREE',
        subscription_status: result.user.subscription_status || 'active',
      },
    });
  } catch (err: any) {
    if (err.code === 'EMAIL_NOT_VERIFIED') {
      res.status(403).json({
        error: err.message,
        code: 'EMAIL_NOT_VERIFIED',
        email: err.email,
        verificationUrl: err.verificationUrl,
      });
      return;
    }
    res.status(400).json({ error: err.message });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email address and password are required.' });
      return;
    }
    const result = await AuthService.login(email, password);
    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        is_verified: result.user.is_verified,
        verification_status: result.user.verification_status,
        plan: result.user.plan || 'FREE',
        subscription_status: result.user.subscription_status || 'active',
        subscription_expires_at: result.user.subscription_expires_at,
      },
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
      res.status(403).json({
        error: err.message,
        code: 'EMAIL_NOT_VERIFIED',
        email: err.email || cleanEmail,
        verificationUrl,
      });
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

authRouter.post('/firebase-login', async (req, res) => {
  try {
    const { email, name, uid } = req.body;
    if (!email || !uid) {
      res.status(400).json({ error: 'Email address and Firebase UID are required.' });
      return;
    }
    const cleanEmail = email.toLowerCase().trim();
    let user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      user = {
        id: uid,
        email: cleanEmail,
        password_hash: '',
        salt: '',
        name: name || cleanEmail.split('@')[0] || 'Trader',
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
      await getOrCreateUser(uid, cleanEmail, name);
    } catch (sqlErr) {
      console.warn('[Cloud SQL] User sync notice:', sqlErr);
    }

    const token = AuthService.generateToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: user.is_verified,
        verification_status: user.verification_status,
        plan: user.plan || 'PRO',
        subscription_status: user.subscription_status || 'active',
      },
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
authRouter.post('/verify-code', async (req, res) => {
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
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      is_verified: true,
      verification_status: 'verified',
      plan: result.user.plan || 'FREE',
      subscription_status: result.user.subscription_status || 'active',
    },
  });
});

/**
 * Resends verification email for a registered user pending verification
 */
authRouter.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Alamat email wajib diisi.' });
      return;
    }

    const baseUrl = getBaseUrl(req);
    const result = await AuthService.resendVerification(email, baseUrl);

    res.json({
      success: true,
      message: result.message,
      code: result.code,
      verificationUrl: result.verificationUrl,
    });
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
  res.json({ user: updated });
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
authRouter.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Alamat email wajib diisi.' });
      return;
    }
    const baseUrl = getBaseUrl(req);
    const result = await AuthService.requestPasswordReset(email, baseUrl);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message, code: err.code });
  }
});

/**
 * Reset Password using Token or Direct Recovery
 */
authRouter.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, email, directReset } = req.body;

    if (directReset && email && newPassword) {
      const result = await AuthService.directPasswordReset(email, newPassword);
      res.json({
        success: true,
        message: 'Password updated. You have been signed in automatically.',
        user: result.user,
        token: result.token,
      });
      return;
    }

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Verification token and new password are required.' });
      return;
    }

    const result = await AuthService.resetPassword(token, newPassword);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Password Reset Legacy/Compatibility Endpoint
 */
authRouter.post('/password-reset', async (req, res) => {
  try {
    const { token, newPassword, password, email } = req.body;
    const targetPassword = newPassword || password;

    if (token && targetPassword) {
      const result = await AuthService.resetPassword(token, targetPassword);
      res.json(result);
      return;
    }

    if (email && targetPassword) {
      const result = await AuthService.directPasswordReset(email, targetPassword);
      res.json({
        success: true,
        message: 'Password updated.',
        user: result.user,
        token: result.token,
      });
      return;
    }

    res.status(400).json({ error: 'Incomplete parameters for the password reset.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Passwordless Magic Link Request
 */
authRouter.post('/magic-link', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Alamat email wajib diisi.' });
      return;
    }
    const baseUrl = getBaseUrl(req);
    const result = await AuthService.requestMagicLink(email, baseUrl);
    res.json(result);
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
    user: result.user,
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
    user: result.user,
  });
});

authRouter.get('/accounts', async (req, res) => {
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
 */
authRouter.post('/quick-login', async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || 'danwil028@gmail.com').toLowerCase().trim();
    let user = await db.getUserByEmail(cleanEmail);
    const isAdminAccount = cleanEmail === 'danwil028@gmail.com' || cleanEmail === 'wildanmn1933@gmail.com' || cleanEmail === 'admin@marketintel.pro';

    if (!user) {
      // Auto register user if not found for seamless recovery
      const pass = AuthService.hashPassword('Trader123!');
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: cleanEmail,
        password_hash: pass.hash,
        salt: pass.salt,
        name: cleanEmail.split('@')[0] || 'Trader',
        role: isAdminAccount ? 'ADMIN' : 'USER',
        is_verified: true,
        verification_status: 'verified',
        plan: isAdminAccount ? 'INSTITUTIONAL' : 'FREE',
        subscription_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.insertUser(user);
    } else {
      const updates: any = {};
      if (!user.is_verified) {
        updates.is_verified = true;
        updates.verification_status = 'verified';
      }
      if (isAdminAccount && user.role !== 'ADMIN') {
        updates.role = 'ADMIN';
        updates.plan = 'INSTITUTIONAL';
      }
      if (Object.keys(updates).length > 0) {
        user = await db.updateUser(user.id, updates) || user;
      }
    }

    const token = AuthService.generateToken(user);
    res.json({
      success: true,
      message: `Berhasil masuk sebagai ${user.name} (${user.email}).`,
      token,
      user,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
