import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { TelegramChannel, Source } from '../types.js';
import { TelegramIngestionService } from '../ingestion/telegram.js';
import { MarketDataService } from '../ingestion/marketData.js';
import { CurrencyStrengthService } from '../ingestion/currencyStrength.js';
import { MacroDataService } from '../ingestion/macroData.js';
import { processNewsThroughPipeline } from '../ingestion/pipeline.js';
import { sseBroker } from '../realtime/sse.js';
import { requireAdmin, AuthenticatedRequest, AuthService } from '../auth/authService.js';
import { mailService } from '../services/mailService.js';

export const adminRouter = Router();

// Enforce ADMIN role authentication across all admin endpoints
adminRouter.use(requireAdmin as any);

// 1. GET System Health & Database Metrics
adminRouter.get('/system-health', async (req, res) => {
  const stats = await db.getDatabaseStats();
  const sources = await db.getAllSources();
  const errorSources = sources.filter(s => s.status === 'ERROR' || s.error_count > 0);

  res.json({
    uptime_seconds: process.uptime(),
    memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    db_status: 'HEALTHY',
    active_sse_connections: sseBroker.getActiveCount(),
    database_stats: stats,
    sources_summary: {
      total: sources.length,
      live: sources.filter(s => s.status === 'LIVE').length,
      delayed: sources.filter(s => s.status === 'DELAYED').length,
      error: errorSources.length,
    },
    timestamp: new Date().toISOString(),
  });
});

// 2. Sources Management
adminRouter.get('/sources', async (req, res) => {
  const sources = await db.getAllSources();
  res.json({ sources, count: sources.length });
});

adminRouter.patch('/sources/:id', async (req, res) => {
  const { id } = req.params;
  const { is_enabled, status } = req.body;
  const src = await db.getSourceById(id);
  if (!src) {
    res.status(404).json({ error: 'Source not found.' });
    return;
  }
  const updated = await db.upsertSource({
    ...src,
    is_enabled: is_enabled !== undefined ? Boolean(is_enabled) : src.is_enabled,
    status: status || src.status,
  });
  res.json({ success: true, source: updated });
});

// 3. Telegram Channels Management
adminRouter.get('/telegram', async (req, res) => {
  const channels = await db.getAllTelegramChannels();
  res.json({ channels, count: channels.length });
});

adminRouter.post('/telegram', async (req, res) => {
  const { handle, title, language } = req.body;
  if (!handle) {
    res.status(400).json({ error: 'Telegram channel handle (e.g. @channel_name) is required.' });
    return;
  }

  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
  const existing = await db.getTelegramChannel(cleanHandle);
  if (existing) {
    res.status(400).json({ error: `Channel ${cleanHandle} already registered.` });
    return;
  }

  // Also create linked Source record
  const sourceId = `src_tg_${cleanHandle.replace('@', '').toLowerCase()}`;
  await db.upsertSource({
    id: sourceId,
    name: title || `Telegram: ${cleanHandle}`,
    type: 'TELEGRAM',
    endpoint_url: `https://t.me/s/${cleanHandle.replace('@', '')}`,
    is_enabled: true,
    status: 'LIVE',
    last_success_at: new Date().toISOString(),
    last_error_at: null,
    last_error_message: null,
    error_count: 0,
    interval_seconds: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const newChannel: TelegramChannel = {
    id: `tg_${Date.now()}`,
    handle: cleanHandle,
    title: title || cleanHandle,
    source_id: sourceId,
    is_enabled: true,
    language: language || 'en',
    last_ingested_at: null,
    status: 'LIVE',
    error_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db.upsertTelegramChannel(newChannel);
  res.json({ success: true, channel: newChannel });
});

adminRouter.patch('/telegram/:handle', async (req, res) => {
  const cleanHandle = req.params.handle.startsWith('@') ? req.params.handle : `@${req.params.handle}`;
  const channel = await db.getTelegramChannel(cleanHandle);
  if (!channel) {
    res.status(404).json({ error: 'Telegram channel not found.' });
    return;
  }

  const { is_enabled, title, language } = req.body;
  const updated = await db.upsertTelegramChannel({
    ...channel,
    is_enabled: is_enabled !== undefined ? Boolean(is_enabled) : channel.is_enabled,
    title: title || channel.title,
    language: language || channel.language,
  });

  res.json({ success: true, channel: updated });
});

adminRouter.delete('/telegram/:handle', async (req, res) => {
  const cleanHandle = req.params.handle.startsWith('@') ? req.params.handle : `@${req.params.handle}`;
  const deleted = await db.deleteTelegramChannel(cleanHandle);
  res.json({ success: deleted });
});

// Trigger manual scrape of specific channel
adminRouter.post('/telegram/:handle/scrape', async (req, res) => {
  const cleanHandle = req.params.handle.startsWith('@') ? req.params.handle : `@${req.params.handle}`;
  const channel = await db.getTelegramChannel(cleanHandle);
  if (!channel) {
    res.status(404).json({ error: 'Channel not found.' });
    return;
  }

  try {
    const result = await TelegramIngestionService.scrapeChannel(channel);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Ingest & Duplicate Inspector
adminRouter.get('/duplicates', async (req, res) => {
  const events = await db.getAllEvents(50);
  const deduplicatedEvents = events.filter(e => e.source_count > 1 || e.is_duplicate_resolved);

  const report = deduplicatedEvents.map(async e => {
    const sources = await db.getEventSources(e.id);
    return {
      event_id: e.id,
      title: e.title,
      summary: e.summary,
      source_count: e.source_count,
      languages: Array.from(new Set(sources.map(s => s.language))),
      sources: sources.map(s => ({
        source_name: s.source_name,
        language: s.language,
        original_title: s.original_title,
        matched_reason: s.matched_reason,
        similarity_score: s.similarity_score,
        published_at: s.published_at,
      })),
    };
  });

  res.json({
    total_deduplicated_events: report.length,
    events: report,
    timestamp: new Date().toISOString(),
  });
});

// 5. Manual Ingestion Simulator / Feed Injector (for custom testing & instant verification)
adminRouter.post('/ingest/test-article', async (req, res) => {
  const { title, content, source_name, language } = req.body;
  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  try {
    const newsItem = {
      id: `test_${Date.now()}`,
      title,
      content: content || title,
      source_id: 'src_manual_test',
      source_name: source_name || 'Admin Wire Test',
      source_url: 'https://marketintel.pro/internal/wire',
      language: language || 'en',
      published_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      event_id: null,
      affected_assets: [],
      affected_currencies: [],
      category: 'MACRO' as const,
      status: 'RAW' as const,
    };

    const outcome = await processNewsThroughPipeline(newsItem);
    res.json({
      success: true,
      outcome,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Trigger global ingestion sweep across all systems
adminRouter.post('/ingest/run-all', async (req, res) => {
  try {
    const tgResult = await TelegramIngestionService.runAllChannels();
    const csResult = await CurrencyStrengthService.fetchLiveStrength();
    const mktResult = await MarketDataService.updateMarketPrices();
    const macroResult = await MacroDataService.fetchEconomicCalendar();

    res.json({
      success: true,
      results: {
        telegram: tgResult,
        currency_strength: { count: csResult.length },
        market_prices: { count: mktResult.length },
        macro_calendar: { count: macroResult.length },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. User & Access Management (Admin Only)
adminRouter.get('/users', async (req: Request, res: Response) => {
  const { search, role, plan, status, verified } = req.query;
  let allUsers = await db.getAllUsers();

  const total = allUsers.length;
  const verifiedCount = allUsers.filter(u => u.is_verified).length;
  const adminCount = allUsers.filter(u => u.role === 'ADMIN').length;
  const proCount = allUsers.filter(u => u.plan === 'PRO').length;
  const institutionalCount = allUsers.filter(u => u.plan === 'INSTITUTIONAL').length;

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    allUsers = allUsers.filter(u =>
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  }

  if (role && role !== 'ALL') {
    allUsers = allUsers.filter(u => u.role === role);
  }

  if (plan && plan !== 'ALL') {
    allUsers = allUsers.filter(u => (u.plan || 'FREE') === plan);
  }

  if (status && status !== 'ALL') {
    allUsers = allUsers.filter(u => (u.subscription_status || 'active') === status);
  }

  if (verified && verified !== 'ALL') {
    const isV = verified === 'true';
    allUsers = allUsers.filter(u => Boolean(u.is_verified) === isV);
  }

  const users = allUsers.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    is_verified: u.is_verified,
    verification_status: u.verification_status,
    plan: u.plan || 'FREE',
    subscription_status: u.subscription_status || 'active',
    subscription_expires_at: u.subscription_expires_at,
    created_at: u.created_at,
    updated_at: u.updated_at,
  }));

  res.json({
    users,
    count: users.length,
    metrics: {
      total,
      verified: verifiedCount,
      unverified: total - verifiedCount,
      admins: adminCount,
      pro: proCount,
      institutional: institutionalCount,
      free: total - (proCount + institutionalCount),
    },
  });
});

// Admin Create New User
adminRouter.post('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, role, plan, subscription_status, is_verified } = req.body;
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email address is required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await db.getUserByEmail(cleanEmail);
    if (existing) {
      res.status(400).json({ error: `User with email ${cleanEmail} already exists.` });
      return;
    }

    const effectivePassword = password && password.length >= 6 ? password : `Pass_${Math.random().toString(36).slice(-8)}!`;
    const { hash, salt } = AuthService.hashPassword(effectivePassword);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newUser: any = {
      id: userId,
      email: cleanEmail,
      password_hash: hash,
      salt,
      name: (name || cleanEmail.split('@')[0] || 'Trader').trim(),
      role: role === 'ADMIN' ? 'ADMIN' : 'USER',
      is_verified: is_verified !== undefined ? Boolean(is_verified) : true,
      verification_status: is_verified !== false ? 'verified' : 'pending_verification',
      plan: ['FREE', 'PRO', 'INSTITUTIONAL'].includes(plan) ? plan : 'FREE',
      subscription_status: subscription_status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.insertUser(newUser);

    await db.upsertUserPreferences({
      user_id: userId,
      timezone: 'UTC',
      language: 'en',
      theme: 'dark',
      default_market_view: 'XAUUSD',
      density: 'compact',
      audio_alerts: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        is_verified: newUser.is_verified,
        plan: newUser.plan,
        subscription_status: newUser.subscription_status,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at,
      },
      initial_password: password ? undefined : effectivePassword,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user.' });
  }
});

// Admin Update User Details & Access
adminRouter.patch('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, role, plan, subscription_status, is_verified } = req.body;

  const target = await db.getUserById(id);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Prevent demoting the last remaining admin
  if (target.role === 'ADMIN' && role === 'USER') {
    const adminCount = (await db.getAllUsers()).filter(u => u.role === 'ADMIN').length;
    if (adminCount <= 1) {
      res.status(400).json({ error: 'Cannot demote the only remaining administrator.' });
      return;
    }
  }

  const updates: any = {};
  if (name && typeof name === 'string') {
    updates.name = name.trim();
  }
  if (email && typeof email === 'string' && email.includes('@')) {
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail !== target.email.toLowerCase()) {
      const exists = await db.getUserByEmail(cleanEmail);
      if (exists) {
        res.status(400).json({ error: 'Another user already uses this email.' });
        return;
      }
      updates.email = cleanEmail;
    }
  }
  if (role && ['USER', 'ADMIN'].includes(role)) {
    updates.role = role;
  }
  if (plan && ['FREE', 'PRO', 'INSTITUTIONAL'].includes(plan)) {
    updates.plan = plan;
  }
  if (subscription_status && ['active', 'trialing', 'canceled', 'expired'].includes(subscription_status)) {
    updates.subscription_status = subscription_status;
  }
  if (is_verified !== undefined) {
    updates.is_verified = Boolean(is_verified);
    updates.verification_status = Boolean(is_verified) ? 'verified' : 'pending_verification';
  }

  const updated = await db.updateUser(id, updates);
  res.json({
    success: true,
    user: {
      id: updated?.id,
      email: updated?.email,
      name: updated?.name,
      role: updated?.role,
      is_verified: updated?.is_verified,
      verification_status: updated?.verification_status,
      plan: updated?.plan,
      subscription_status: updated?.subscription_status,
      created_at: updated?.created_at,
      updated_at: updated?.updated_at,
    },
  });
});

// Admin Delete User
adminRouter.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const target = await db.getUserById(id);

  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Prevent admin from deleting themselves
  if (req.user && req.user.id === id) {
    res.status(400).json({
      error: 'Cannot delete your own active administrator account.',
    });
    return;
  }

  // Prevent deleting the last remaining admin
  if (target.role === 'ADMIN') {
    const remainingAdmins = (await db.getAllUsers()).filter(u => u.role === 'ADMIN' && u.id !== id);
    if (remainingAdmins.length === 0) {
      res.status(400).json({
        error: 'Cannot delete the only remaining administrator account in the system.',
      });
      return;
    }
  }

  const email = target.email;
  const success = await db.deleteUser(id);
  if (!success) {
    res.status(500).json({ error: 'Failed to delete user from database.' });
    return;
  }

  res.json({
    success: true,
    message: `Akun user ${email} berhasil dihapus permanen beserta seluruh preferensi & watchlist-nya.`,
    deleted_id: id,
  });
});

// Admin Force Password Reset
adminRouter.post('/users/:id/reset-password', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { new_password } = req.body;

  const target = await db.getUserById(id);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const passToSet = (new_password && typeof new_password === 'string' && new_password.length >= 6)
    ? new_password
    : `Reset_${Math.random().toString(36).slice(-6)}!2026`;

  const { hash, salt } = AuthService.hashPassword(passToSet);
  await db.updateUser(id, {
    password_hash: hash,
    salt,
  });

  res.json({
    success: true,
    message: `Password akun ${target.email} berhasil di-reset.`,
    temporary_password: passToSet,
  });
});

// Admin Generate Magic Login Link
adminRouter.post('/users/:id/magic-link', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const target = await db.getUserById(id);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const tokenRecord = await db.createVerificationToken(target.id, target.email, 48, 'magic_link');
  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const magicLink = `${protocol}://${host}/magic-verify?token=${tokenRecord.token}`;

  res.json({
    success: true,
    token: tokenRecord.token,
    magic_link: magicLink,
    user_email: target.email,
    expires_at: tokenRecord.expires_at,
  });
});

// Admin Toggle Verification
adminRouter.post('/users/:id/toggle-verification', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const target = await db.getUserById(id);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const nextStatus = !target.is_verified;
  const updated = await db.updateUser(id, {
    is_verified: nextStatus,
    verification_status: nextStatus ? 'verified' : 'pending_verification',
  });

  res.json({
    success: true,
    is_verified: updated?.is_verified,
    user: updated,
    message: nextStatus ? `User ${target.email} telah diverifikasi.` : `Status verifikasi user ${target.email} dicabut.`,
  });
});

// Admin SMTP Configuration Status
adminRouter.get('/smtp/status', (req: AuthenticatedRequest, res: Response) => {
  const config = mailService.getSmtpConfigSummary();
  const lastSent = mailService.getLastSentEmail();
  res.json({
    success: true,
    config,
    last_sent: lastSent
      ? {
          to: lastSent.to,
          subject: lastSent.subject,
          sentAt: lastSent.sentAt,
        }
      : null,
    server_time: new Date().toISOString(),
  });
});

// Admin SMTP Live Connection & Authentication Tester
adminRouter.post('/smtp/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { recipient, send_test_email } = req.body || {};
    const testRecipient = send_test_email ? (recipient || req.user?.email || '').trim() : undefined;

    const result = await mailService.verifySmtpConnection(testRecipient);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      connected: false,
      testEmailSent: false,
      message: `Terjadi kesalahan saat menguji SMTP: ${err.message || String(err)}`,
      config: mailService.getSmtpConfigSummary(),
    });
  }
});


