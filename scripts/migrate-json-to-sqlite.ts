/**
 * One-time migration: legacy JSON store -> SQLite (Prisma).
 *
 * Reads data/market_intelligence.db.json (read-only) and writes through the
 * Prisma-backed data layer so serialisation and derived fields behave exactly as
 * the running app expects. Existing SQLite rows are replaced for the tables the
 * JSON store owned; unrelated tables are left alone.
 *
 * Usage: npx tsx scripts/migrate-json-to-sqlite.ts [--force]
 */

import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../server/db/prisma.js';
import { db } from '../server/db/database.js';

const SOURCE = path.resolve(process.cwd(), 'data/market_intelligence.db.json');
const FORCE = process.argv.includes('--force');

type JsonStore = Record<string, any>;

function readStore(): JsonStore {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Source JSON store not found at ${SOURCE}`);
  }
  return JSON.parse(fs.readFileSync(SOURCE, 'utf8')) as JsonStore;
}

const count = (store: JsonStore, key: string): number =>
  Array.isArray(store[key]) ? store[key].length : 0;

/**
 * Collapses rows that share a key, keeping the last occurrence. The JSON store
 * accumulated duplicate ids over time (repeated wire snapshots, repeated
 * strength samples); SQLite enforces uniqueness, so the newer row wins.
 */
function dedupe(rows: any[] | undefined, keyOf: (row: any) => string): any[] {
  const byKey = new Map<string, any>();
  for (const row of rows ?? []) byKey.set(keyOf(row), row);
  return [...byKey.values()];
}

async function main() {
  const store = readStore();

  const existing = await prisma.marketPrice.count();
  if (existing > 0 && !FORCE) {
    console.log(
      `SQLite already holds ${existing} market prices; nothing to do. Re-run with --force to overwrite.`
    );
    return;
  }

  await clearTables();

  for (const user of dedupe(store.users, u => u.id)) {
    await db.insertUser(user);
  }
  console.log(`users: ${count(store, 'users')}`);

  for (const token of dedupe(store.verification_tokens, v => v.id)) {
    await prisma.verificationToken.create({
      data: {
        id: token.id,
        user_id: token.user_id,
        email: token.email,
        token: token.token,
        code: token.code ?? null,
        expires_at: token.expires_at,
        created_at: token.created_at,
        used_at: token.used_at ?? null,
        type: token.type ?? null,
      },
    });
  }
  console.log(`verification_tokens: ${count(store, 'verification_tokens')}`);

  for (const pref of dedupe(store.user_preferences, p => p.id ?? p.user_id)) {
    await db.upsertUserPreferences(pref);
  }
  console.log(`user_preferences: ${count(store, 'user_preferences')}`);

  for (const item of dedupe(store.user_watchlists, w => w.id)) {
    await db.addToWatchlist(item);
  }
  console.log(`user_watchlists: ${count(store, 'user_watchlists')}`);

  // The legacy JSON store was pruned over time, so some rows reference sources,
  // events or news that no longer exist. Derive the id sets up front and give
  // orphaned news a placeholder source so the foreign keys stay satisfiable
  // instead of aborting the whole migration.
  const sourceIds = new Set((store.sources ?? []).map((s: any) => s.id));
  const eventIds = new Set((store.events ?? []).map((e: any) => e.id));
  const newsIds = new Set((store.news ?? []).map((n: any) => n.id));

  const orphanSourceIds = new Set(
    (store.news ?? [])
      .map((n: any) => n.source_id)
      .filter((id: string) => id && !sourceIds.has(id))
  );

  let placeholders = 0;
  for (const sourceId of orphanSourceIds) {
    await db.upsertSource({
      id: String(sourceId),
      name: String(sourceId),
      type: 'NEWS_WIRE',
      endpoint_url: '',
      is_enabled: false,
      status: 'HISTORICAL',
      last_success_at: null,
      last_error_at: null,
      last_error_message: null,
      error_count: 0,
      interval_seconds: 0,
      metadata: { reconstructed: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    placeholders++;
  }

  const droppedNewsEventRefs = (store.news ?? []).filter(
    (n: any) => n.event_id && !eventIds.has(n.event_id)
  ).length;

  let droppedLinks = 0;
  for (const link of dedupe(store.event_sources, l => l.id)) {
    if (!eventIds.has(link.event_id) || !newsIds.has(link.news_id)) droppedLinks++;
  }

  for (const source of dedupe(store.sources, s => s.id)) {
    await db.upsertSource(source);
  }
  console.log(`sources: ${count(store, 'sources')} (+${placeholders} reconstructed)`);

  for (const channel of dedupe(store.telegram_channels, c => c.id)) {
    await db.upsertTelegramChannel(channel);
  }
  console.log(`telegram_channels: ${count(store, 'telegram_channels')}`);

  // Events go before news: NewsItem.event_id is a foreign key to MarketEvent.
  for (const event of dedupe(store.events, e => e.id)) {
    await db.insertEvent(event);
  }
  console.log(`events: ${count(store, 'events')}`);

  for (const item of dedupe(store.news, n => n.id)) {
    const eventId = item.event_id && eventIds.has(item.event_id) ? item.event_id : null;
    await db.insertNewsItem({ ...item, event_id: eventId });
  }
  console.log(
    `news: ${count(store, 'news')}` +
      (droppedNewsEventRefs ? ` (${droppedNewsEventRefs} dangling event refs cleared)` : '')
  );

  for (const link of store.event_sources ?? []) {
    if (!eventIds.has(link.event_id) || !newsIds.has(link.news_id)) continue;
    await db.addEventSource(link);
  }
  console.log(
    `event_sources: ${count(store, 'event_sources')}` +
      (droppedLinks ? ` (${droppedLinks} orphan links skipped)` : '')
  );

  // Insertion order is preserved so pair ordering in the UI stays stable.
  for (const price of dedupe(store.market_prices, m => m.symbol)) {
    await db.upsertMarketPrice(price);
  }
  console.log(`market_prices: ${count(store, 'market_prices')}`);

  if ((store.currency_strength ?? []).length > 0) {
    await db.setCurrencyStrength(store.currency_strength);
  }
  console.log(`currency_strength: ${count(store, 'currency_strength')}`);

  for (const row of dedupe(store.currency_strength_history, r => r.id ?? `csh_${r.timestamp}_${r.currency}`)) {
    await prisma.currencyStrengthHistory.create({
      data: {
        id: row.id ?? `csh_${row.timestamp}_${row.currency}`,
        currency: row.currency,
        strength_score: row.strength_score,
        timestamp: row.timestamp,
      },
    });
  }
  console.log(`currency_strength_history: ${count(store, 'currency_strength_history')}`);

  for (const event of dedupe(store.economic_events, e => e.id)) {
    await db.upsertEconomicEvent(event);
  }
  console.log(`economic_events: ${count(store, 'economic_events')}`);

  for (const theme of dedupe(store.market_themes, t => t.id)) {
    await db.upsertMarketTheme(theme);
  }
  console.log(`market_themes: ${count(store, 'market_themes')}`);

  let droppedAnalyses = 0;
  for (const analysis of dedupe(store.ai_analysis, a => a.id)) {
    const eventId = analysis.event_id && eventIds.has(analysis.event_id) ? analysis.event_id : null;
    if (analysis.event_id && !eventId) droppedAnalyses++;
    await db.upsertAIAnalysis({ ...analysis, event_id: eventId });
  }
  console.log(
    `ai_analysis: ${count(store, 'ai_analysis')}` +
      (droppedAnalyses ? ` (${droppedAnalyses} dangling event refs cleared)` : '')
  );

  for (const snapshot of dedupe(store.daily_snapshots, s => s.id)) {
    await db.saveDailySnapshot(snapshot);
  }
  console.log(`daily_snapshots: ${count(store, 'daily_snapshots')}`);

  const stats = await db.getDatabaseStats();
  console.log('\nMigration complete. SQLite row counts:');
  console.table(stats);
}

async function clearTables() {
  await prisma.$transaction([
    prisma.eventSource.deleteMany({}),
    prisma.newsItem.deleteMany({}),
    prisma.marketEvent.deleteMany({}),
    prisma.marketPrice.deleteMany({}),
    prisma.currencyStrengthHistory.deleteMany({}),
    prisma.currencyStrength.deleteMany({}),
    prisma.economicEvent.deleteMany({}),
    prisma.marketTheme.deleteMany({}),
    prisma.aIAnalysis.deleteMany({}),
    prisma.dailySnapshot.deleteMany({}),
    prisma.telegramChannel.deleteMany({}),
    prisma.source.deleteMany({}),
  ]);
  await prisma.userWatchlist.deleteMany({});
  await prisma.userPreferences.deleteMany({});
  await prisma.verificationToken.deleteMany({});
  await prisma.user.deleteMany({});
}

main()
  .catch(err => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
