import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { requireAuth, AuthenticatedRequest } from '../auth/authService.js';
import { EntitlementService } from '../auth/entitlementService.js';
import { UserWatchlist } from '../types.js';

export const userRouter = Router();

// GET watchlist
userRouter.get('/watchlist', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const list = db.getUserWatchlist(userId);
  const prices = db.getAllMarketPrices();

  // Enhance with live prices
  const enhanced = list.map(item => {
    const p = prices.find(x => x.symbol === item.symbol);
    return {
      ...item,
      market_data: p || null,
    };
  });

  res.json({ watchlist: enhanced });
});

// POST add to watchlist
userRouter.post('/watchlist', requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const userId = user.id;
  const { symbol, asset_type, notes } = req.body;
  if (!symbol) {
    res.status(400).json({ error: 'Symbol is required.' });
    return;
  }

  // Server-side usage limit check
  const limits = EntitlementService.getUserLimits(user);
  const currentList = db.getUserWatchlist(userId);
  if (currentList.length >= limits.watchlistLimit) {
    res.status(403).json({
      error: `Watchlist limit reached: Your ${user.plan || 'FREE'} plan allows a maximum of ${limits.watchlistLimit} symbols. Upgrade to expand your watchlist capacity.`,
      code: 'WATCHLIST_LIMIT_REACHED',
      limit: limits.watchlistLimit,
      current_count: currentList.length,
    });
    return;
  }

  const item: UserWatchlist = {
    id: `wl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    user_id: userId,
    symbol: symbol.toUpperCase(),
    asset_type: asset_type || 'ASSET',
    notes: notes || '',
    added_at: new Date().toISOString(),
  };

  db.addToWatchlist(item);
  res.json({ success: true, item });
});

// DELETE remove from watchlist
userRouter.delete('/watchlist/:symbol', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const symbol = req.params.symbol.toUpperCase();
  const removed = db.removeFromWatchlist(userId, symbol);
  res.json({ success: removed, symbol });
});

// GET user settings / preferences
userRouter.get('/preferences', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const prefs = db.getUserPreferences(userId);
  res.json({ preferences: prefs });
});

// POST update user subscription plan
userRouter.post('/subscription', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { plan } = req.body;
  if (!['FREE', 'PRO', 'INSTITUTIONAL'].includes(plan)) {
    res.status(400).json({ error: 'Invalid plan selected. Must be FREE, PRO, or INSTITUTIONAL.' });
    return;
  }

  const updated = db.updateUser(userId, {
    plan,
    subscription_status: 'active',
  });

  if (!updated) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json({
    success: true,
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      is_verified: updated.is_verified,
      avatar_url: updated.avatar_url,
      plan: updated.plan,
      subscription_status: updated.subscription_status,
      subscription_expires_at: updated.subscription_expires_at,
    },
  });
});

// GET current user entitlements & usage limits
userRouter.get('/entitlements', requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const limits = EntitlementService.getUserLimits(user);
  const aiUsage = EntitlementService.getAIUsage(user.id, user);
  const watchlist = db.getUserWatchlist(user.id);

  res.json({
    plan: user.plan || 'FREE',
    role: user.role,
    subscription_status: user.subscription_status || 'active',
    subscription_expires_at: user.subscription_expires_at,
    limits: {
      ...limits,
      currentWatchlistCount: watchlist.length,
      aiUsedToday: aiUsage.used,
      aiRemainingToday: aiUsage.remaining,
    },
    permissions: {
      market_radar: EntitlementService.canAccessFeature(user, 'MARKET_RADAR'),
      currency_strength_matrix: EntitlementService.canAccessFeature(user, 'CURRENCY_STRENGTH_MATRIX'),
      macro_news_wire: EntitlementService.canAccessFeature(user, 'MACRO_NEWS_WIRE'),
      economic_calendar: EntitlementService.canAccessFeature(user, 'ECONOMIC_CALENDAR'),
      tradingview_charts: EntitlementService.canAccessFeature(user, 'TRADINGVIEW_CHARTS'),
      ai_overview_refresh: EntitlementService.canAccessFeature(user, 'AI_OVERVIEW_REFRESH'),
      ai_deep_analysis: EntitlementService.canAccessFeature(user, 'AI_DEEP_ANALYSIS'),
      sse_priority_stream: EntitlementService.canAccessFeature(user, 'SSE_PRIORITY_STREAM'),
      persistent_watchlist: EntitlementService.canAccessFeature(user, 'PERSISTENT_WATCHLIST'),
      custom_telegram_scraper: EntitlementService.canAccessFeature(user, 'CUSTOM_TELEGRAM_SCRAPER'),
      admin_system_panel: EntitlementService.canAccessFeature(user, 'ADMIN_SYSTEM_PANEL'),
      api_data_export: EntitlementService.canAccessFeature(user, 'API_DATA_EXPORT'),
    },
  });
});


