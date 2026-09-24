/**
 * Seed foundational sources, telegram channels, market prices, and admin user
 */

import { db } from './database.js';
import crypto from 'node:crypto';
import {
  Source,
  TelegramChannel,
  MarketPrice,
  CurrencyStrength,
  EconomicEvent,
  MarketTheme,
  User,
} from '../types.js';

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 210_000, 64, 'sha512').toString('hex');
  return { hash, salt: s };
}

export async function seedDatabase(): Promise<void> {
  const stats = await db.getDatabaseStats();

  // 1. Seed Admin & Demo User if not present
  if (stats.users_count === 0) {
    // The bootstrap admin password must come from the environment. A password
    // baked into the repository is public, so without ADMIN_INITIAL_PASSWORD we
    // create a random one and print it once instead of shipping a known secret.
    const configuredAdminPassword = process.env.ADMIN_INITIAL_PASSWORD;
    const generatedPassword = !configuredAdminPassword;
    const adminPassword = configuredAdminPassword || crypto.randomBytes(18).toString('base64url');
    const adminPass = hashPassword(adminPassword);

    const adminUser: User = {
      id: 'usr_admin_001',
      email: process.env.ADMIN_EMAIL || 'admin@marketintel.pro',
      password_hash: adminPass.hash,
      salt: adminPass.salt,
      name: 'Chief Market Officer',
      role: 'ADMIN',
      is_verified: true,
      plan: 'INSTITUTIONAL',
      subscription_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.insertUser(adminUser);

    if (generatedPassword) {
      console.warn(
        `[Seed] Bootstrap admin created: ${adminUser.email}\n` +
        `[Seed] Generated password (shown once): ${adminPassword}\n` +
        `[Seed] Set ADMIN_INITIAL_PASSWORD to control this value.`
      );
    }

    const traderPassword = process.env.DEMO_USER_PASSWORD || crypto.randomBytes(18).toString('base64url');
    const traderPass = hashPassword(traderPassword);
    const traderUser: User = {
      id: 'usr_trader_002',
      email: 'trader@marketintel.pro',
      password_hash: traderPass.hash,
      salt: traderPass.salt,
      name: 'Pro Trader',
      role: 'USER',
      is_verified: true,
      plan: 'PRO',
      subscription_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.insertUser(traderUser);

    if (!process.env.DEMO_USER_PASSWORD) {
      console.warn(
        `[Seed] Demo account created: ${traderUser.email}\n` +
        `[Seed] Generated password (shown once): ${traderPassword}\n` +
        `[Seed] Set DEMO_USER_PASSWORD to control this value.`
      );
    }

    await db.upsertUserPreferences({
      user_id: traderUser.id,
      timezone: 'UTC',
      language: 'en',
      theme: 'dark',
      default_market_view: 'XAUUSD',
      density: 'compact',
      audio_alerts: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await db.addToWatchlist({
      id: 'wl_1',
      user_id: traderUser.id,
      symbol: 'XAUUSD',
      asset_type: 'COMMODITY',
      notes: 'Key safe-haven & inflation hedge',
      added_at: new Date().toISOString(),
    });
    await db.addToWatchlist({
      id: 'wl_2',
      user_id: traderUser.id,
      symbol: 'BTC',
      asset_type: 'CRYPTO',
      notes: 'High beta liquidity gauge',
      added_at: new Date().toISOString(),
    });
    await db.addToWatchlist({
      id: 'wl_3',
      user_id: traderUser.id,
      symbol: 'US100',
      asset_type: 'INDEX',
      notes: 'Tech benchmark',
      added_at: new Date().toISOString(),
    });
  }

  // Grant ADMIN authority only to addresses listed in ADMIN_EMAILS. Previously
  // three hardcoded addresses were promoted on every boot, and a missing account
  // was created with a known password — anyone able to register one of those
  // addresses could claim admin. Bootstrap is now opt-in and credential-free:
  // an existing account is promoted, never created.
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  for (const adminEmail of adminEmails) {
    const existing = await db.getUserByEmail(adminEmail);
    if (!existing) {
      console.warn(
        `[Seed] ADMIN_EMAILS lists ${adminEmail} but no such account exists. ` +
        'Register it first, then restart to promote it.'
      );
      continue;
    }
    if (existing.role !== 'ADMIN') {
      await db.updateUser(existing.id, {
        role: 'ADMIN',
        plan: 'INSTITUTIONAL',
        subscription_status: 'active',
      });
      console.log(`[Seed] Promoted ${adminEmail} to ADMIN.`);
    }
  }

  // 2. Seed Sources
  if (stats.sources_count === 0) {
    const sources: Source[] = [
      {
        id: 'src_tg_financialjuice',
        name: 'Telegram: FinancialJuice Wire',
        type: 'TELEGRAM',
        endpoint_url: 'https://t.me/s/financialjuice',
        is_enabled: true,
        status: 'LIVE',
        last_success_at: new Date().toISOString(),
        last_error_at: null,
        last_error_message: null,
        error_count: 0,
        interval_seconds: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'src_tg_watcherguru',
        name: 'Telegram: Watcher Guru Breaking',
        type: 'TELEGRAM',
        endpoint_url: 'https://t.me/s/WatcherGuru',
        is_enabled: true,
        status: 'LIVE',
        last_success_at: new Date().toISOString(),
        last_error_at: null,
        last_error_message: null,
        error_count: 0,
        interval_seconds: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'src_tg_cointelegraph',
        name: 'Telegram: Cointelegraph News',
        type: 'TELEGRAM',
        endpoint_url: 'https://t.me/s/cointelegraph',
        is_enabled: true,
        status: 'LIVE',
        last_success_at: new Date().toISOString(),
        last_error_at: null,
        last_error_message: null,
        error_count: 0,
        interval_seconds: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'src_tg_fxstreet_id',
        name: 'Telegram: FXStreet Indonesia',
        type: 'TELEGRAM',
        endpoint_url: 'https://t.me/s/fxstreetforexindonesia',
        is_enabled: true,
        status: 'LIVE',
        last_success_at: new Date().toISOString(),
        last_error_at: null,
        last_error_message: null,
        error_count: 0,
        interval_seconds: 45,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'src_currency_strength',
        name: 'Currency Strength Engine',
        type: 'CURRENCY_STRENGTH',
        endpoint_url: 'https://currency-strength.com/en/',
        is_enabled: true,
        status: 'LIVE',
        last_success_at: new Date().toISOString(),
        last_error_at: null,
        last_error_message: null,
        error_count: 0,
        interval_seconds: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'src_market_feed',
        name: 'Global Financial Market Feeds',
        type: 'MARKET_DATA',
        endpoint_url: 'https://api.coingecko.com/api/v3',
        is_enabled: true,
        status: 'LIVE',
        last_success_at: new Date().toISOString(),
        last_error_at: null,
        last_error_message: null,
        error_count: 0,
        interval_seconds: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'src_macro_calendar',
        name: 'Global Macroeconomic Calendar',
        type: 'ECONOMIC_CALENDAR',
        endpoint_url: 'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
        is_enabled: true,
        status: 'LIVE',
        last_success_at: new Date().toISOString(),
        last_error_at: null,
        last_error_message: null,
        error_count: 0,
        interval_seconds: 120,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    for (const s of sources) {
      await db.upsertSource(s);
    }
  }

  // 3. Seed Telegram Channels (Ensure active 24/7 financial & crypto wires are always present)
  const coreTelegramChannels: TelegramChannel[] = [
    {
      id: 'tg_sm_news_24h',
      handle: '@SM_News_24h',
      title: 'SM News 24h Breaking Wire',
      source_id: 'src_tg_sm_news_24h',
      is_enabled: true,
      language: 'en',
      last_scraped_message_id: 'initial',
      last_ingested_at: new Date().toISOString(),
      status: 'LIVE',
      error_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tg_financialjuice',
      handle: '@financialjuice',
      title: 'FinancialJuice Real-Time Wire',
      source_id: 'src_tg_financialjuice',
      is_enabled: true,
      language: 'en',
      last_scraped_message_id: 'initial',
      last_ingested_at: new Date().toISOString(),
      status: 'LIVE',
      error_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tg_watcherguru',
      handle: '@WatcherGuru',
      title: 'Watcher Guru Breaking',
      source_id: 'src_tg_watcherguru',
      is_enabled: true,
      language: 'en',
      last_scraped_message_id: 'initial',
      last_ingested_at: new Date().toISOString(),
      status: 'LIVE',
      error_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tg_cointelegraph',
      handle: '@cointelegraph',
      title: 'Cointelegraph Market Intelligence',
      source_id: 'src_tg_cointelegraph',
      is_enabled: true,
      language: 'en',
      last_scraped_message_id: 'initial',
      last_ingested_at: new Date().toISOString(),
      status: 'LIVE',
      error_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tg_fxstreet_id',
      handle: '@fxstreetforexindonesia',
      title: 'FXStreet Forex Indonesia',
      source_id: 'src_tg_fxstreet_id',
      is_enabled: true,
      language: 'id',
      last_scraped_message_id: 'initial',
      last_ingested_at: new Date().toISOString(),
      status: 'LIVE',
      error_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  for (const c of coreTelegramChannels) {
    const existing = await db.getTelegramChannel(c.handle);
    if (!existing) {
      await db.upsertSource({
        id: c.source_id,
        name: c.title,
        type: 'TELEGRAM',
        endpoint_url: `https://t.me/s/${c.handle.replace('@', '')}`,
        is_enabled: true,
        status: 'LIVE',
        last_success_at: new Date().toISOString(),
        last_error_at: null,
        last_error_message: null,
        error_count: 0,
        interval_seconds: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await db.upsertTelegramChannel(c);
    }
  }

  // Deactivate obsolete / dead channels
  const deadChannel = await db.getTelegramChannel('@SM_News_24');
  if (deadChannel && deadChannel.is_enabled) {
    await db.upsertTelegramChannel({ ...deadChannel, is_enabled: false, status: 'ERROR' });
  }

  // 4. Market Prices are populated directly via real-time market data service (MarketDataService.updateMarketPrices())

  // 5. Seed Currency Strength baseline
  if (stats.currency_strength_count === 0) {
    const csList: CurrencyStrength[] = [
      {
        currency: 'GBP',
        strength_score: 8.2,
        change_direction: 'STRONG_BUY',
        rank: 1,
        source: 'https://currency-strength.com/en/',
        timestamp: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        status: 'LIVE',
      },
      {
        currency: 'AUD',
        strength_score: 7.4,
        change_direction: 'BUY',
        rank: 2,
        source: 'https://currency-strength.com/en/',
        timestamp: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        status: 'LIVE',
      },
      {
        currency: 'EUR',
        strength_score: 6.8,
        change_direction: 'BUY',
        rank: 3,
        source: 'https://currency-strength.com/en/',
        timestamp: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        status: 'LIVE',
      },
      {
        currency: 'NZD',
        strength_score: 5.9,
        change_direction: 'NEUTRAL',
        rank: 4,
        source: 'https://currency-strength.com/en/',
        timestamp: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        status: 'LIVE',
      },
      {
        currency: 'CAD',
        strength_score: 4.8,
        change_direction: 'NEUTRAL',
        rank: 5,
        source: 'https://currency-strength.com/en/',
        timestamp: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        status: 'LIVE',
      },
      {
        currency: 'CHF',
        strength_score: 4.2,
        change_direction: 'SELL',
        rank: 6,
        source: 'https://currency-strength.com/en/',
        timestamp: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        status: 'LIVE',
      },
      {
        currency: 'USD',
        strength_score: 3.5,
        change_direction: 'SELL',
        rank: 7,
        source: 'https://currency-strength.com/en/',
        timestamp: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        status: 'LIVE',
      },
      {
        currency: 'JPY',
        strength_score: 2.1,
        change_direction: 'STRONG_SELL',
        rank: 8,
        source: 'https://currency-strength.com/en/',
        timestamp: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        status: 'LIVE',
      },
    ];
    await db.setCurrencyStrength(csList);
  }

  // 6. Macroeconomic Releases & Economic Calendar are populated directly via real-time macro data service (MacroDataService.fetchEconomicCalendar())

  // 7. Seed Active Market Themes
  if (stats.themes_count === 0) {
    const themes: MarketTheme[] = [
      {
        id: 'thm_fed_rate_path',
        title: 'Fed Rate Cut Trajectory & Soft Landing',
        description: 'Markets are pricing multiple 25bps Fed rate cuts following moderating inflation and stabilizing labor prints.',
        active_since: new Date(Date.now() - 14 * 86400000).toISOString(),
        primary_assets: ['USD', 'XAUUSD', 'US100', 'US500', 'US30'],
        sentiment: 'RISK_ON',
        evidence_events: ['US CPI rises 3.1% YoY in line with consensus'],
      },
      {
        id: 'thm_gold_all_time_high',
        title: 'Central Bank Gold Accumulation & Geopolitical Hedge',
        description: 'Persistent physical bullion bids from global reserve managers alongside lower real yield expectations keep gold elevated.',
        active_since: new Date(Date.now() - 30 * 86400000).toISOString(),
        primary_assets: ['XAUUSD', 'USD', 'BTC'],
        sentiment: 'BULLISH',
        evidence_events: ['Global gold reserves hit record allocations'],
      },
      {
        id: 'thm_tech_capex_momentum',
        title: 'Enterprise AI Infrastructure Spending',
        description: 'Megacap hyperscalers sustaining semiconductor and cloud computing capital expenditure, bolstering US100 resilience.',
        active_since: new Date(Date.now() - 45 * 86400000).toISOString(),
        primary_assets: ['US100', 'US500', 'BTC'],
        sentiment: 'BULLISH',
        evidence_events: ['Semiconductor foundry bookings outperform estimates'],
      },
    ];

    for (const t of themes) {
      await db.upsertMarketTheme(t);
    }
  }

  console.log('[DB] Seed completed successfully. Current stats:', await db.getDatabaseStats());
}
