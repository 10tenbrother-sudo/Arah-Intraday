import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

import { seedDatabase } from './server/db/seed.js';
import { db } from './server/db/database.js';
import { authRouter } from './server/routes/authRoutes.js';
import { marketRouter } from './server/routes/marketRoutes.js';
import { newsRouter } from './server/routes/newsRoutes.js';
import { eventRouter } from './server/routes/eventRoutes.js';
import { currencyRouter } from './server/routes/currencyRoutes.js';
import { macroRouter } from './server/routes/macroRoutes.js';
import { intelligenceRouter } from './server/routes/intelligenceRoutes.js';
import { userRouter } from './server/routes/userRoutes.js';
import { adminRouter } from './server/routes/adminRoutes.js';
import { streamRouter } from './server/routes/streamRoutes.js';
import { historyRouter } from './server/routes/historyRoutes.js';

import { MarketDataService } from './server/ingestion/marketData.js';
import { TelegramIngestionService } from './server/ingestion/telegram.js';
import { CurrencyStrengthService } from './server/ingestion/currencyStrength.js';
import { MacroDataService } from './server/ingestion/macroData.js';
import { IntradayMarketMapEngine } from './server/intelligence/intradayMarketMap.js';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUserById } from './src/db/users.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Core middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logger for diagnostic tracing
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        if (res.statusCode >= 400) {
          console.warn(`[HTTP] ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
        }
      });
    }
    next();
  });

  // 1. Mount API Routes FIRST
  app.use('/api/auth', authRouter);
  app.use('/api/markets', marketRouter);
  app.use('/api/news', newsRouter);
  app.use('/api/events', eventRouter);
  app.use('/api/currency-strength', currencyRouter);
  app.use('/api/macro', macroRouter);
  app.use('/api/intelligence', intelligenceRouter);
  app.use('/api/user', userRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/stream', streamRouter);
  app.use('/api/history', historyRouter);

  // Cloud SQL relational database endpoints
  app.get('/api/cloudsql/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        res.status(401).json({ error: 'Missing authenticated user' });
        return;
      }
      const user = await getOrCreateUser(req.user.uid, req.user.email || '', req.user.name);
      res.json({ success: true, user });
    } catch (err: any) {
      console.error('Failed to get Cloud SQL user:', err);
      res.status(500).json({ error: err.message || 'Database error' });
    }
  });

  // Unified global synchronization across all ingested elements and external sources
  app.post('/api/sync', async (req, res) => {
    try {
      const [mktResult, macroResult, csResult, tgResult] = await Promise.allSettled([
        MarketDataService.updateMarketPrices(),
        MacroDataService.fetchEconomicCalendar(),
        CurrencyStrengthService.fetchLiveStrength(),
        TelegramIngestionService.runAllChannels(),
      ]);

      res.json({
        success: true,
        synchronized_at: new Date().toISOString(),
        results: {
          market_prices: mktResult.status === 'fulfilled' ? { status: 'ok', count: mktResult.value.length } : { status: 'error', reason: mktResult.reason?.message },
          macro_calendar: macroResult.status === 'fulfilled' ? { status: 'ok', count: macroResult.value.length } : { status: 'error', reason: macroResult.reason?.message },
          currency_strength: csResult.status === 'fulfilled' ? { status: 'ok', count: csResult.value.length } : { status: 'error', reason: csResult.reason?.message },
          news_sources: tgResult.status === 'fulfilled' ? { status: 'ok', data: tgResult.value } : { status: 'error', reason: tgResult.reason?.message },
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Source Transparency & Integrity Audit Endpoint
  app.get('/api/sources', async (req, res) => {
    try {
      const sources = await db.getAllSources();
      const channels = await db.getAllTelegramChannels();
      const events = await db.getAllEvents(100);
      const news = await db.getAllNews(100);

      res.json({
        total_sources: sources.length,
        active_sources: sources.filter(s => s.status === 'LIVE' && s.is_enabled).length,
        sources: sources.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          endpoint_url: s.endpoint_url,
          status: s.status,
          is_enabled: s.is_enabled,
          last_success_at: s.last_success_at,
          error_count: s.error_count,
        })),
        telegram_channels: channels.map(c => ({
          handle: c.handle,
          title: c.title,
          language: c.language,
          is_enabled: c.is_enabled,
          last_ingested_at: c.last_ingested_at,
          status: c.status,
        })),
        integrity_stats: {
          total_canonical_events: events.length,
          multi_source_verified_events: events.filter(e => e.source_count > 1).length,
          total_news_items: news.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Market Intelligence Platform API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // 2. Initialize Seed & Baseline Ingestion
  try {
    seedDatabase();
    console.log('[System] Database seeded and initialized.');

    // Run initial ingestion routines asynchronously without blocking server boot
    setTimeout(async () => {
      console.log('[System] Launching initial real-time data synchronization pass...');
      try {
        await Promise.allSettled([
          MarketDataService.updateMarketPrices(),
          MacroDataService.fetchEconomicCalendar(),
          CurrencyStrengthService.fetchLiveStrength(),
          TelegramIngestionService.runAllChannels(),
        ]);
        console.log('[System] Initial real-time data synchronization complete.');
      } catch (e: any) {
        console.warn('[System] Initial sync notice:', e.message);
      }
    }, 500);

    // Schedule background periodic ingestion
    // High-frequency real market data ticks (every 10 seconds)
    setInterval(() => {
      MarketDataService.updateMarketPrices().catch(err => {
        console.warn('[Scheduler] Market tick notice:', err.message);
      });
    }, 10000);

    // Telegram channels scraper (every 30 seconds for real-time breaking news)
    setInterval(() => {
      TelegramIngestionService.runAllChannels().catch(err => {
        console.warn('[Scheduler] Telegram scrape notice:', err.message);
      });
    }, 30000);

    // Currency strength refresh (every 45 seconds)
    setInterval(() => {
      CurrencyStrengthService.fetchLiveStrength().catch(err => {
        console.warn('[Scheduler] Currency strength notice:', err.message);
      });
    }, 45000);

    // Economic calendar live refresh (every 60 seconds)
    setInterval(() => {
      MacroDataService.fetchEconomicCalendar().catch(err => {
        console.warn('[Scheduler] Macro calendar notice:', err.message);
      });
    }, 60000);

    // Automated Daily Market Snapshot Generator (every 10 minutes)
    setInterval(async () => {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const existing = await db.getDailySnapshotByDate(todayStr);
        if (!existing) {
          console.log(`[Scheduler] Generating automated daily snapshot for ${todayStr}...`);
          // Trigger generation
          const map = await IntradayMarketMapEngine.getIntradayMarketMap();
          const strengths = await db.getCurrencyStrength();
          const biases: Record<string, any> = {};
          map.forEach(async (item: any) => {
            biases[item.symbol] = {
              symbol: item.symbol,
              bias: item.overall_bias,
              score: item.direction_score,
              price: item.price,
              change_24h_pct: item.change_24h_pct,
              strength_label: item.direction_score > 30 ? 'Strong' : item.direction_score < -30 ? 'Weak' : 'Moderate',
              major_catalyst: item.today_key_catalyst,
              last_updated: item.last_updated,
            };
          });

          await db.saveDailySnapshot({
            id: `snapshot_${todayStr}`,
            date: todayStr,
            timestamp: new Date().toISOString(),
            title: `Daily Market Snapshot: ${todayStr}`,
            market_biases: biases,
            currency_strength: strengths.map((s, idx) => ({
              currency: s.currency,
              score: s.strength_score,
              rank: idx + 1,
              direction: s.change_direction,
            })),
            major_catalysts: map.slice(0, 5).map((m: any) => ({
              event_name: m.today_key_catalyst,
              currency: m.symbol === 'XAUUSD' ? 'USD' : m.symbol,
              impact: 'HIGH',
              actual: m.current_market_reaction,
            })),
            market_reaction_summary: 'Automated end-of-session daily snapshot recorded permanently.',
            ai_summary: `Multi-asset regime recorded for ${todayStr}.`,
            ai_why: ['Automated capture of live telemetry into permanent memory database.'],
            ai_risk: ['Standard session volatility boundaries apply.'],
            ai_context: [`Archived session ${todayStr}.`],
            historical_insights: [`Daily snapshot committed to memory.`],
            created_at: new Date().toISOString(),
          } as any);
        }
      } catch (err: any) {
        console.warn('[Scheduler] Daily snapshot generation notice:', err.message);
      }
    }, 600000);
  } catch (err: any) {
    console.error('[System] Error during server initialization:', err);
  }

  // 3. Vite Middleware (SPA handling)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Real-Time Market Intelligence Platform listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
