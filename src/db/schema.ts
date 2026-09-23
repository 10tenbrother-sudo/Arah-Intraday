// src/db/schema.ts
import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, integer, doublePrecision } from 'drizzle-orm/pg-core';

// Users table with Firebase Auth UID & profile
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase Auth UID or internal unique ID
  email: text('email').notNull().unique(),
  name: text('name').notNull().default('Trader'),
  role: text('role').notNull().default('USER'), // 'USER' | 'ADMIN'
  isVerified: boolean('is_verified').notNull().default(false),
  plan: text('plan').notNull().default('PRO'), // 'FREE' | 'PRO' | 'INSTITUTIONAL'
  subscriptionStatus: text('subscription_status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Watchlist entries linked to user
export const watchlists = pgTable('watchlists', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  symbol: text('symbol').notNull(),
  assetType: text('asset_type').notNull().default('ASSET'),
  notes: text('notes'),
  addedAt: timestamp('added_at').defaultNow(),
});

// User preferences
export const preferences = pgTable('preferences', {
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey(),
  timezone: text('timezone').notNull().default('UTC'),
  language: text('language').notNull().default('id'),
  theme: text('theme').notNull().default('dark'),
  defaultMarketView: text('default_market_view').notNull().default('overview'),
  density: text('density').notNull().default('normal'),
  audioAlerts: boolean('audio_alerts').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Daily market snapshot archive
export const dailySnapshots = pgTable('daily_snapshots', {
  id: text('id').primaryKey(),
  date: text('date').notNull().unique(), // 'YYYY-MM-DD'
  title: text('title').notNull(),
  marketReactionSummary: text('market_reaction_summary'),
  aiSummary: text('ai_summary'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Market prices cache
export const marketPrices = pgTable('market_prices', {
  symbol: text('symbol').primaryKey(),
  displayName: text('display_name').notNull(),
  assetType: text('asset_type').notNull(),
  price: doublePrecision('price').notNull(),
  change24h: doublePrecision('change_24h').notNull(),
  change24hPct: doublePrecision('change_24h_pct').notNull(),
  high24h: doublePrecision('high_24h'),
  low24h: doublePrecision('low_24h'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  watchlist: many(watchlists),
  preferences: one(preferences, {
    fields: [users.id],
    references: [preferences.userId],
  }),
}));

export const watchlistsRelations = relations(watchlists, ({ one }) => ({
  user: one(users, {
    fields: [watchlists.userId],
    references: [users.id],
  }),
}));
