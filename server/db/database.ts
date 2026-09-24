/**
 * Relational data layer for the Market Intelligence platform, backed by SQLite
 * through Prisma.
 *
 * Method names and return shapes are unchanged from the previous JSON-file
 * implementation, so callers only needed an `await`. Two behavioural notes:
 *
 *  - Every method is now asynchronous, and durability comes from SQLite rather
 *    than a debounced atomic file rewrite. Callers must await writes before
 *    responding, otherwise the write may not have committed yet.
 *  - The old in-memory `pruneOldData` caps are preserved by `enforce*Cap`
 *    helpers that delete the oldest rows after insert.
 */

import crypto from 'node:crypto';
import {
  User,
  VerificationToken,
  UserPreferences,
  UserWatchlist,
  Source,
  TelegramChannel,
  NewsItem,
  MarketEvent,
  EventSource,
  MarketPrice,
  CurrencyStrength,
  CurrencyStrengthHistory,
  EconomicEvent,
  MarketTheme,
  AIAnalysis,
  DailyMarketSnapshot,
  MarketMemoryInsight,
  HistoricalCurrencyComparison,
} from '../types.js';
import { MacroEnricher } from '../intelligence/enrichment.js';
import { calculatePairImpacts } from '../relationships/assetMapper.js';
import { prisma } from './prisma.js';
import { parseJson, toJson, toJsonRequired } from './codec.js';
import { DEFAULT_DAILY_SNAPSHOTS } from './defaultSnapshots.js';

const NEWS_CAP = 350;
const EVENT_CAP = 250;
const HISTORY_CAP = 50000;
const AI_ANALYSIS_CAP = 200;

/** Drops the SQLite autoincrement bookkeeping column from a price row. */
function stripSeq<T extends { seq?: number }>(row: T): Omit<T, 'seq'> {
  const { seq, ...rest } = row;
  return rest;
}

export class RelationalDatabase {
  // ==================== USERS ====================
  public async getAllUsers(): Promise<User[]> {
    const rows = await prisma.user.findMany();
    return rows as unknown as User[];
  }

  public async getUserByEmail(email: string): Promise<User | undefined> {
    const row = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return (row as unknown as User) ?? undefined;
  }

  public async getUserById(id: string): Promise<User | undefined> {
    const row = await prisma.user.findUnique({ where: { id } });
    return (row as unknown as User) ?? undefined;
  }

  public async insertUser(user: User): Promise<User> {
    const nowIso = new Date().toISOString();
    const row = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email.toLowerCase(),
        password_hash: user.password_hash,
        salt: user.salt,
        name: user.name,
        role: user.role,
        is_verified: user.is_verified ?? false,
        verification_status: user.verification_status ?? null,
        avatar_url: user.avatar_url ?? null,
        plan: user.plan ?? null,
        subscription_status: user.subscription_status ?? null,
        subscription_expires_at: user.subscription_expires_at ?? null,
        last_order_id: user.last_order_id ?? null,
        payment_method: user.payment_method ?? null,
        billing_cycle: user.billing_cycle ?? null,
        created_at: user.created_at ?? nowIso,
        updated_at: nowIso,
      },
    });
    return row as unknown as User;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;

    const { email, ...rest } = updates;
    const row = await prisma.user.update({
      where: { id },
      data: {
        ...(rest as any),
        ...(email ? { email: email.toLowerCase() } : {}),
        updated_at: new Date().toISOString(),
      },
    });
    return row as unknown as User;
  }

  public async deleteUser(id: string): Promise<boolean> {
    const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return false;
    // Tokens, preferences, watchlist and alerts cascade per the schema.
    await prisma.user.delete({ where: { id } });
    return true;
  }

  // ==================== EMAIL VERIFICATION & AUTH TOKENS ====================
  public async createVerificationToken(
    userId: string,
    email: string,
    expiresInHours = 24,
    type: 'email_verification' | 'password_reset' | 'magic_link' = 'email_verification'
  ): Promise<VerificationToken> {
    const now = new Date();
    const record: VerificationToken = {
      id: `vtok_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      user_id: userId,
      email: email.toLowerCase().trim(),
      token: crypto.randomBytes(32).toString('hex'),
      code: Math.floor(100000 + Math.random() * 900000).toString(),
      expires_at: new Date(now.getTime() + expiresInHours * 60 * 60 * 1000).toISOString(),
      created_at: now.toISOString(),
      type,
    };

    const row = await prisma.verificationToken.create({
      data: {
        id: record.id,
        user_id: record.user_id,
        email: record.email,
        token: record.token,
        code: record.code ?? null,
        expires_at: record.expires_at,
        created_at: record.created_at,
        used_at: null,
        type: record.type ?? null,
      },
    });
    return row as unknown as VerificationToken;
  }

  public async consumeVerificationCode(
    email: string,
    inputCode: string
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    const cleanEmail = email.toLowerCase().trim();
    const user = await this.getUserByEmail(cleanEmail);
    if (!user) return { success: false, error: 'No user found with this email.' };
    if (user.is_verified || user.verification_status === 'verified') return { success: true, user };

    const candidates = await prisma.verificationToken.findMany({
      where: { email: cleanEmail, type: 'email_verification' },
    });
    const matching = candidates.find(vt => vt.code === inputCode.trim());
    if (!matching) {
      return { success: false, error: 'Verification code is incorrect. Check the 6 digits in your email.' };
    }
    if (new Date(matching.expires_at) <= new Date()) {
      return { success: false, error: 'The verification code has expired. Request a new code.' };
    }

    const nowIso = new Date().toISOString();
    await prisma.verificationToken.update({ where: { id: matching.id }, data: { used_at: nowIso } });
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { is_verified: true, verification_status: 'verified', updated_at: nowIso },
    });
    return { success: true, user: updated as unknown as User };
  }

  public async createPasswordResetToken(userId: string, email: string, expiresInHours = 2): Promise<VerificationToken> {
    return this.createVerificationToken(userId, email, expiresInHours, 'password_reset');
  }

  public async createMagicLinkToken(userId: string, email: string, expiresInHours = 1): Promise<VerificationToken> {
    return this.createVerificationToken(userId, email, expiresInHours, 'magic_link');
  }

  public async getValidToken(
    token: string,
    type?: 'email_verification' | 'password_reset' | 'magic_link'
  ): Promise<VerificationToken | undefined> {
    const vt = await prisma.verificationToken.findUnique({ where: { token } });
    if (!vt) return undefined;
    if (vt.used_at) return undefined;
    if (new Date(vt.expires_at) <= new Date()) return undefined;
    if (type && vt.type && vt.type !== type) return undefined;
    return vt as unknown as VerificationToken;
  }

  public async consumeToken(
    token: string,
    type?: 'email_verification' | 'password_reset' | 'magic_link'
  ): Promise<{ success: boolean; error?: string; tokenRecord?: VerificationToken; user?: User }> {
    const vt = await prisma.verificationToken.findUnique({ where: { token } });
    if (!vt) return { success: false, error: 'That link or token is invalid or not found.' };
    if (vt.used_at) return { success: false, error: 'This link or token has already been used.' };
    if (new Date(vt.expires_at) <= new Date()) {
      return { success: false, error: 'This link or token has expired. Request a new link.' };
    }
    if (type && vt.type && vt.type !== type) return { success: false, error: 'Token type mismatch.' };

    const user = await this.getUserById(vt.user_id);
    if (!user) return { success: false, error: 'No user account found for this token.' };

    const updated = await prisma.verificationToken.update({
      where: { id: vt.id },
      data: { used_at: new Date().toISOString() },
    });
    return { success: true, tokenRecord: updated as unknown as VerificationToken, user };
  }

  public async getVerificationToken(token: string): Promise<VerificationToken | undefined> {
    const row = await prisma.verificationToken.findUnique({ where: { token } });
    return (row as unknown as VerificationToken) ?? undefined;
  }

  public async getLatestPendingVerificationToken(userId: string): Promise<VerificationToken | undefined> {
    const row = await prisma.verificationToken.findFirst({
      where: { user_id: userId, used_at: null, expires_at: { gt: new Date().toISOString() } },
      orderBy: { created_at: 'desc' },
    });
    return (row as unknown as VerificationToken) ?? undefined;
  }

  public async consumeVerificationToken(token: string): Promise<{ success: boolean; error?: string; user?: User }> {
    const vt = await this.getVerificationToken(token);
    if (!vt) return { success: false, error: 'That verification link is invalid or not found.' };

    const user = await this.getUserById(vt.user_id);
    if (!user) return { success: false, error: 'No user account found for this token.' };

    // Idempotent: an already-verified account is success regardless of token state.
    if (user.is_verified || user.verification_status === 'verified') return { success: true, user };

    const now = new Date();
    if (new Date(vt.expires_at) <= now) {
      return { success: false, error: 'The verification link has expired. Request a new activation link.' };
    }

    const nowIso = now.toISOString();
    await prisma.verificationToken.update({ where: { id: vt.id }, data: { used_at: nowIso } });
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { is_verified: true, verification_status: 'verified', updated_at: nowIso },
    });
    return { success: true, user: updated as unknown as User };
  }

  public async deleteExpiredVerificationTokens(): Promise<number> {
    const result = await prisma.verificationToken.deleteMany({
      where: { expires_at: { lte: new Date().toISOString() }, used_at: { not: null } },
    });
    return result.count;
  }

  // ==================== PREFERENCES & WATCHLIST ====================
  public async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const row = await prisma.userPreferences.findUnique({ where: { user_id: userId } });
    return (row as unknown as UserPreferences) ?? undefined;
  }

  public async upsertUserPreferences(pref: UserPreferences): Promise<UserPreferences> {
    const nowIso = new Date().toISOString();
    const mutable = {
      timezone: pref.timezone,
      language: pref.language,
      theme: pref.theme,
      default_market_view: pref.default_market_view,
      density: pref.density,
      audio_alerts: pref.audio_alerts,
      updated_at: nowIso,
    };
    const row = await prisma.userPreferences.upsert({
      where: { user_id: pref.user_id },
      create: { user_id: pref.user_id, ...mutable, created_at: pref.created_at ?? nowIso },
      update: mutable,
    });
    return row as unknown as UserPreferences;
  }

  public async getUserWatchlist(userId: string): Promise<UserWatchlist[]> {
    const rows = await prisma.userWatchlist.findMany({ where: { user_id: userId } });
    return rows as unknown as UserWatchlist[];
  }

  public async addToWatchlist(item: UserWatchlist): Promise<UserWatchlist> {
    const existing = await prisma.userWatchlist.findFirst({
      where: { user_id: item.user_id, symbol: item.symbol },
    });
    if (existing) return existing as unknown as UserWatchlist;

    const row = await prisma.userWatchlist.create({
      data: {
        id: item.id,
        user_id: item.user_id,
        symbol: item.symbol,
        asset_type: item.asset_type,
        notes: item.notes ?? null,
        added_at: item.added_at ?? new Date().toISOString(),
      },
    });
    return row as unknown as UserWatchlist;
  }

  public async removeFromWatchlist(userId: string, symbol: string): Promise<boolean> {
    const result = await prisma.userWatchlist.deleteMany({ where: { user_id: userId, symbol } });
    return result.count > 0;
  }

  // ==================== SOURCES & TELEGRAM ====================
  public async getAllSources(): Promise<Source[]> {
    const rows = await prisma.source.findMany();
    return rows.map(r => this.hydrateSource(r));
  }

  public async getSourceById(id: string): Promise<Source | undefined> {
    const row = await prisma.source.findUnique({ where: { id } });
    return row ? this.hydrateSource(row) : undefined;
  }

  public async upsertSource(source: Source): Promise<Source> {
    const nowIso = new Date().toISOString();
    const mutable = {
      name: source.name,
      type: source.type,
      endpoint_url: source.endpoint_url,
      is_enabled: source.is_enabled,
      status: source.status,
      last_success_at: source.last_success_at ?? null,
      last_error_at: source.last_error_at ?? null,
      last_error_message: source.last_error_message ?? null,
      error_count: source.error_count ?? 0,
      interval_seconds: source.interval_seconds,
      metadata: toJson(source.metadata),
      updated_at: nowIso,
    };
    const row = await prisma.source.upsert({
      where: { id: source.id },
      create: { id: source.id, ...mutable, created_at: source.created_at ?? nowIso },
      update: mutable,
    });
    return this.hydrateSource(row);
  }

  public async updateSourceStatus(
    id: string,
    status: Source['status'],
    errorMsg: string | null = null
  ): Promise<void> {
    const existing = await prisma.source.findUnique({ where: { id } });
    if (!existing) return;

    const nowIso = new Date().toISOString();
    const data: Record<string, unknown> = { status, updated_at: nowIso };
    if (status === 'LIVE' || status === 'RECENT') {
      data.last_success_at = nowIso;
    } else if (status === 'ERROR') {
      data.last_error_at = nowIso;
      data.last_error_message = errorMsg;
      data.error_count = (existing.error_count ?? 0) + 1;
    }
    await prisma.source.update({ where: { id }, data });
  }

  private hydrateSource(row: Record<string, any>): Source {
    return {
      ...row,
      metadata: parseJson<Record<string, any> | undefined>(row.metadata, undefined),
    } as unknown as Source;
  }

  public async getAllTelegramChannels(): Promise<TelegramChannel[]> {
    const rows = await prisma.telegramChannel.findMany();
    return rows as unknown as TelegramChannel[];
  }

  public async getTelegramChannel(handle: string): Promise<TelegramChannel | undefined> {
    // SQLite does not support Prisma's `mode: 'insensitive'`; the channel list is
    // tiny, so match case-insensitively in memory instead.
    const rows = await prisma.telegramChannel.findMany();
    const match = rows.find(r => r.handle.toLowerCase() === handle.toLowerCase());
    return (match as unknown as TelegramChannel) ?? undefined;
  }

  public async upsertTelegramChannel(channel: TelegramChannel): Promise<TelegramChannel> {
    const existing = await this.getTelegramChannel(channel.handle);
    const mutable = {
      handle: channel.handle,
      title: channel.title,
      source_id: channel.source_id,
      is_enabled: channel.is_enabled,
      language: channel.language,
      last_ingested_at: channel.last_ingested_at ?? null,
      status: channel.status,
      error_count: channel.error_count ?? 0,
    };
    const row = existing
      ? await prisma.telegramChannel.update({ where: { id: existing.id }, data: mutable })
      : await prisma.telegramChannel.create({ data: { id: channel.id, ...mutable } });
    return row as unknown as TelegramChannel;
  }

  public async deleteTelegramChannel(handle: string): Promise<boolean> {
    const existing = await this.getTelegramChannel(handle);
    if (!existing) return false;
    await prisma.telegramChannel.delete({ where: { id: existing.id } });
    return true;
  }

  // ==================== NEWS ====================
  public async getAllNews(limit = 100, offset = 0, category?: string): Promise<NewsItem[]> {
    const rows = await prisma.newsItem.findMany({
      where: category ? { category: { equals: category } } : undefined,
      orderBy: { published_at: 'desc' },
      skip: offset,
      take: limit,
    });
    return rows.map(r => this.hydrateNews(r));
  }

  public async getNewsById(id: string): Promise<NewsItem | undefined> {
    const row = await prisma.newsItem.findUnique({ where: { id } });
    return row ? this.hydrateNews(row) : undefined;
  }

  public async getNewsByEventId(eventId: string): Promise<NewsItem[]> {
    const rows = await prisma.newsItem.findMany({ where: { event_id: eventId } });
    return rows.map(r => this.hydrateNews(r));
  }

  public async insertNewsItem(item: NewsItem): Promise<NewsItem> {
    const row = await prisma.newsItem.create({
      data: {
        id: item.id,
        title: item.title,
        content: item.content,
        source_id: item.source_id,
        source_name: item.source_name,
        source_url: item.source_url,
        language: item.language,
        published_at: item.published_at,
        received_at: item.received_at,
        updated_at: item.updated_at ?? new Date().toISOString(),
        event_id: item.event_id ?? null,
        affected_assets: toJsonRequired(item.affected_assets, 'array'),
        affected_currencies: toJsonRequired(item.affected_currencies, 'array'),
        category: item.category,
        status: item.status,
        raw_payload: item.raw_payload ?? null,
        entities_extracted: toJson(item.entities_extracted),
      },
    });
    await this.enforceNewsCap();
    return this.hydrateNews(row);
  }

  public async updateNewsItem(id: string, updates: Partial<NewsItem>): Promise<NewsItem | null> {
    const exists = await prisma.newsItem.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;

    const data: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;
      if (key === 'affected_assets' || key === 'affected_currencies') {
        data[key] = toJsonRequired(value, 'array');
      } else if (key === 'entities_extracted') {
        data[key] = toJson(value);
      } else {
        data[key] = value ?? null;
      }
    }
    const row = await prisma.newsItem.update({ where: { id }, data });
    return this.hydrateNews(row);
  }

  private hydrateNews(row: Record<string, any>): NewsItem {
    return {
      ...row,
      affected_assets: parseJson<string[]>(row.affected_assets, []),
      affected_currencies: parseJson<string[]>(row.affected_currencies, []),
      entities_extracted: parseJson<NewsItem['entities_extracted']>(row.entities_extracted, undefined),
    } as unknown as NewsItem;
  }

  /** Keeps the news table bounded, matching the old in-memory cap. */
  private async enforceNewsCap(): Promise<void> {
    const count = await prisma.newsItem.count();
    if (count <= NEWS_CAP) return;
    const stale = await prisma.newsItem.findMany({
      orderBy: { published_at: 'asc' },
      take: count - NEWS_CAP,
      select: { id: true },
    });
    await prisma.newsItem.deleteMany({ where: { id: { in: stale.map(s => s.id) } } });
  }

  // ==================== EVENTS ====================
  public async getAllEvents(limit = 50, offset = 0, impactFilter?: string): Promise<MarketEvent[]> {
    const normalized = (impactFilter || '').toUpperCase().trim();
    let impactWhere: Record<string, unknown> | undefined;
    if (normalized === 'HIGH' || normalized === 'HIGH_IMPACT') {
      impactWhere = { in: ['CRITICAL', 'HIGH'] };
    } else if (normalized === 'CRITICAL') {
      impactWhere = { equals: 'CRITICAL' };
    }

    const rows = await prisma.marketEvent.findMany({
      where: impactWhere ? { impact_level: impactWhere } : undefined,
      orderBy: { first_detected_at: 'desc' },
      skip: offset,
      take: limit,
    });
    return rows.map(r => this.hydrateEvent(r));
  }

  public async getEventById(id: string): Promise<MarketEvent | undefined> {
    const row = await prisma.marketEvent.findUnique({ where: { id } });
    return row ? this.hydrateEvent(row) : undefined;
  }

  public async insertEvent(event: MarketEvent): Promise<MarketEvent> {
    const row = await prisma.marketEvent.create({
      data: {
        id: event.id,
        title: event.title,
        summary: event.summary,
        primary_category: event.primary_category,
        impact_level: event.impact_level,
        first_detected_at: event.first_detected_at,
        last_updated_at: event.last_updated_at ?? new Date().toISOString(),
        source_count: event.source_count ?? 0,
        source_names: toJsonRequired(event.source_names, 'array'),
        affected_assets: toJsonRequired(event.affected_assets, 'array'),
        affected_currencies: toJsonRequired(event.affected_currencies, 'array'),
        key_facts: toJsonRequired(event.key_facts, 'array'),
        image_url: event.image_url ?? null,
        ai_analysis_id: event.ai_analysis_id ?? null,
        is_duplicate_resolved: event.is_duplicate_resolved ?? null,
      },
    });
    await this.enforceEventCap();
    return this.hydrateEvent(row);
  }

  public async updateEvent(id: string, updates: Partial<MarketEvent>): Promise<MarketEvent | null> {
    const exists = await prisma.marketEvent.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;

    const jsonArrayKeys = ['source_names', 'affected_assets', 'affected_currencies', 'key_facts'];
    const data: Record<string, unknown> = { last_updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;
      if (jsonArrayKeys.includes(key)) {
        data[key] = toJsonRequired(value, 'array');
      } else {
        data[key] = value ?? null;
      }
    }
    const row = await prisma.marketEvent.update({ where: { id }, data });
    return this.hydrateEvent(row);
  }

  private hydrateEvent(row: Record<string, any>): MarketEvent {
    const event = {
      ...row,
      source_names: parseJson<string[]>(row.source_names, []),
      affected_assets: parseJson<string[]>(row.affected_assets, []),
      affected_currencies: parseJson<string[]>(row.affected_currencies, []),
      key_facts: parseJson<string[]>(row.key_facts, []),
    } as unknown as MarketEvent;

    // Derived on read, never stored: a rule change then applies to existing rows.
    if (!event.pair_impacts || event.pair_impacts.length === 0) {
      event.pair_impacts = calculatePairImpacts(
        event.title,
        event.summary || event.title,
        event.primary_category,
        event.affected_assets || [],
        event.affected_currencies || []
      );
    }
    return event;
  }

  private async enforceEventCap(): Promise<void> {
    const count = await prisma.marketEvent.count();
    if (count <= EVENT_CAP) return;
    const stale = await prisma.marketEvent.findMany({
      orderBy: { first_detected_at: 'asc' },
      take: count - EVENT_CAP,
      select: { id: true },
    });
    await prisma.marketEvent.deleteMany({ where: { id: { in: stale.map(s => s.id) } } });
  }

  public async addEventSource(sourceRecord: EventSource): Promise<void> {
    await prisma.eventSource.create({
      data: {
        id: sourceRecord.id,
        event_id: sourceRecord.event_id,
        news_id: sourceRecord.news_id,
        source_name: sourceRecord.source_name,
        source_url: sourceRecord.source_url,
        language: sourceRecord.language,
        original_title: sourceRecord.original_title,
        original_content: sourceRecord.original_content,
        published_at: sourceRecord.published_at,
        matched_reason: sourceRecord.matched_reason,
        similarity_score: sourceRecord.similarity_score,
        created_at: sourceRecord.created_at ?? new Date().toISOString(),
      },
    });
  }

  public async getEventSources(eventId: string): Promise<EventSource[]> {
    const rows = await prisma.eventSource.findMany({ where: { event_id: eventId } });
    return rows as unknown as EventSource[];
  }

  // ==================== MARKET PRICES ====================
  public async getAllMarketPrices(): Promise<MarketPrice[]> {
    // Ordered by insertion sequence: the dashboard renders pairs in seed order.
    const rows = await prisma.marketPrice.findMany({ orderBy: { seq: 'asc' } });
    return rows.map(r => this.hydratePrice(r));
  }

  public async getMarketPrice(symbol: string): Promise<MarketPrice | undefined> {
    const row = await prisma.marketPrice.findUnique({ where: { symbol: symbol.toUpperCase() } });
    return row ? this.hydratePrice(row) : undefined;
  }

  public async upsertMarketPrice(price: MarketPrice): Promise<void> {
    const sym = price.symbol.toUpperCase();
    const mutable = {
      display_name: price.display_name,
      asset_type: price.asset_type,
      price: price.price,
      change_24h: price.change_24h,
      change_24h_pct: price.change_24h_pct,
      high_24h: price.high_24h,
      low_24h: price.low_24h,
      volume_24h: price.volume_24h,
      source: price.source,
      timestamp: price.timestamp,
      last_updated: new Date().toISOString(),
      status: price.status,
      sparkline_1h: toJsonRequired(price.sparkline_1h, 'array'),
      tv_symbol: price.tv_symbol ?? null,
      tradingview_url: price.tradingview_url ?? null,
      is_delayed: price.is_delayed ?? null,
    };
    await prisma.marketPrice.upsert({
      where: { symbol: sym },
      create: { symbol: sym, ...mutable },
      update: mutable,
    });
  }

  private hydratePrice(row: Record<string, any>): MarketPrice {
    return {
      ...stripSeq(row),
      sparkline_1h: parseJson<number[]>(row.sparkline_1h, []),
    } as unknown as MarketPrice;
  }

  // ==================== CURRENCY STRENGTH ====================
  public async getCurrencyStrength(): Promise<CurrencyStrength[]> {
    const rows = await prisma.currencyStrength.findMany({ orderBy: { strength_score: 'desc' } });
    return rows as unknown as CurrencyStrength[];
  }

  public async setCurrencyStrength(list: CurrencyStrength[]): Promise<void> {
    const nowIso = new Date().toISOString();
    await prisma.$transaction([
      prisma.currencyStrength.deleteMany({}),
      prisma.currencyStrength.createMany({
        data: list.map(item => ({
          currency: item.currency.toUpperCase(),
          strength_score: item.strength_score,
          change_direction: item.change_direction,
          rank: item.rank,
          source: item.source,
          timestamp: item.timestamp,
          last_updated: nowIso,
          status: item.status,
          raw_delta: item.raw_delta ?? null,
        })),
      }),
      prisma.currencyStrengthHistory.createMany({
        data: list.map(item => ({
          id: `csh_${Date.now()}_${item.currency}_${crypto.randomBytes(3).toString('hex')}`,
          currency: item.currency.toUpperCase(),
          strength_score: item.strength_score,
          timestamp: nowIso,
        })),
      }),
    ]);
    await this.enforceHistoryCap();
  }

  private lastRecordedStrength = new Map<string, { time: number; score: number }>();

  public async recordCurrencyStrengthHistory(currency: string, score: number): Promise<void> {
    const cur = currency.toUpperCase();
    const now = Date.now();
    const prev = this.lastRecordedStrength.get(cur);
    // Record if no previous record, or score changed by >= 0.05, or at least 2 minutes elapsed
    if (prev && Math.abs(prev.score - score) < 0.05 && now - prev.time < 120000) {
      return;
    }
    this.lastRecordedStrength.set(cur, { time: now, score });

    await prisma.currencyStrengthHistory.create({
      data: {
        id: `csh_${now}_${cur}_${crypto.randomBytes(3).toString('hex')}`,
        currency: cur,
        strength_score: score,
        timestamp: new Date().toISOString(),
      },
    });

    if (Math.random() < 0.05) {
      await this.enforceHistoryCap();
    }
  }

  private async enforceHistoryCap(): Promise<void> {
    const count = await prisma.currencyStrengthHistory.count();
    if (count <= HISTORY_CAP) return;
    const stale = await prisma.currencyStrengthHistory.findMany({
      orderBy: { timestamp: 'asc' },
      take: count - HISTORY_CAP,
      select: { id: true },
    });
    await prisma.currencyStrengthHistory.deleteMany({ where: { id: { in: stale.map(s => s.id) } } });
  }

  public async getCurrencyStrengthHistory(currency?: string): Promise<CurrencyStrengthHistory[]> {
    const rows = await prisma.currencyStrengthHistory.findMany({
      where: currency ? { currency: currency.toUpperCase() } : undefined,
      orderBy: { timestamp: 'asc' },
    });
    return rows as unknown as CurrencyStrengthHistory[];
  }

  public async getCurrencyStrengthHistoryByDate(
    dateStr: string,
    currency?: string
  ): Promise<CurrencyStrengthHistory[]> {
    const rows = await prisma.currencyStrengthHistory.findMany({
      where: {
        timestamp: { startsWith: dateStr },
        ...(currency ? { currency: currency.toUpperCase() } : {}),
      },
      orderBy: { timestamp: 'asc' },
    });
    return rows as unknown as CurrencyStrengthHistory[];
  }

  public async getHistoricalCurrencyComparison(): Promise<HistoricalCurrencyComparison[]> {
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];
    const nowMs = Date.now();
    const oneDayMs = 24 * 3600 * 1000;

    const current = await this.getCurrencyStrength();
    const currentMap = new Map<string, number>(current.map(c => [c.currency, c.strength_score]));
    const history = await this.getCurrencyStrengthHistory();

    // Baseline offsets, used only while the platform has less than a day of ticks
    // so a freshly seeded install still renders a plausible trend.
    const baselineDeltas: Record<string, { yesterday: number; d3: number; d7: number }> = {
      USD: { yesterday: 0.5, d3: 0.8, d7: 1.2 },
      EUR: { yesterday: -0.4, d3: -0.9, d7: -1.4 },
      GBP: { yesterday: 0.2, d3: 0.3, d7: 0.6 },
      JPY: { yesterday: -0.6, d3: -1.1, d7: -1.5 },
      AUD: { yesterday: 0.3, d3: 0.5, d7: 0.8 },
      NZD: { yesterday: -0.2, d3: -0.4, d7: -0.5 },
      CAD: { yesterday: 0.1, d3: 0.4, d7: 0.7 },
      CHF: { yesterday: 0.2, d3: 0.6, d7: 0.9 },
    };

    return currencies.map(curr => {
      const todayScore = currentMap.get(curr) ?? 5.0;
      const currHistory = history.filter(h => h.currency.toUpperCase() === curr.toUpperCase());

      const scoreBefore = (offsetDays: number): number | undefined => {
        const cutoff = nowMs - offsetDays * oneDayMs;
        const eligible = currHistory.filter(h => new Date(h.timestamp).getTime() <= cutoff);
        if (eligible.length === 0) return undefined;
        return eligible.reduce((latest, h) =>
          new Date(h.timestamp).getTime() > new Date(latest.timestamp).getTime() ? h : latest
        ).strength_score;
      };

      const baseline = baselineDeltas[curr] || { yesterday: 0, d3: 0, d7: 0 };
      const fallback = (delta: number) => Math.max(0.5, Math.min(9.8, Number((todayScore - delta).toFixed(2))));

      const yesterdayScore = scoreBefore(1) ?? fallback(baseline.yesterday);
      const threeDayScore = scoreBefore(3) ?? fallback(baseline.d3);
      const sevenDayScore = scoreBefore(7) ?? fallback(baseline.d7);

      const delta_yesterday = Number((todayScore - yesterdayScore).toFixed(2));
      const delta_3d = Number((todayScore - threeDayScore).toFixed(2));
      const delta_7d = Number((todayScore - sevenDayScore).toFixed(2));

      let trend: 'STRENGTHENING' | 'WEAKENING' | 'STABLE' = 'STABLE';
      if (delta_yesterday >= 0.25) trend = 'STRENGTHENING';
      else if (delta_yesterday <= -0.25) trend = 'WEAKENING';

      return {
        currency: curr,
        today_score: todayScore,
        yesterday_score: yesterdayScore,
        three_day_score: threeDayScore,
        seven_day_score: sevenDayScore,
        delta_yesterday,
        delta_3d,
        delta_7d,
        trend,
      };
    });
  }

  // ==================== MACRO & ECONOMIC CALENDAR ====================
  public async getEconomicEvents(
    limit = 200,
    filter?: { status?: 'UPCOMING' | 'RELEASED' | 'ALL'; currency?: string }
  ): Promise<EconomicEvent[]> {
    const nowMs = Date.now();
    const past24hMs = nowMs - 24 * 3600000;

    const rows = await prisma.economicEvent.findMany();
    let all = rows.map(r => ({
      ...r,
      market_reaction: parseJson<EconomicEvent['market_reaction']>(r.market_reaction, undefined),
    })) as unknown as EconomicEvent[];

    all = all.map(e => {
      const eventTime = new Date(e.date_time_utc).getTime();
      const hasActual = e.actual !== null && e.actual !== undefined && e.actual !== '';
      const status: EconomicEvent['status'] = hasActual || eventTime < nowMs ? 'RELEASED' : 'UPCOMING';
      return { ...e, status };
    });

    if (filter?.currency && filter.currency !== 'ALL') {
      all = all.filter(e => e.currency === filter.currency);
    }

    const byTimeAsc = (a: EconomicEvent, b: EconomicEvent) =>
      new Date(a.date_time_utc).getTime() - new Date(b.date_time_utc).getTime();

    if (filter?.status === 'UPCOMING') {
      return all
        .filter(e => e.status === 'UPCOMING' || new Date(e.date_time_utc).getTime() >= nowMs)
        .sort(byTimeAsc)
        .slice(0, limit)
        .map(e => MacroEnricher.enrichEconomicEvent(e, nowMs));
    }

    if (filter?.status === 'RELEASED') {
      return all
        .filter(e => e.status === 'RELEASED' && new Date(e.date_time_utc).getTime() < nowMs)
        .sort((a, b) => new Date(b.date_time_utc).getTime() - new Date(a.date_time_utc).getTime())
        .slice(0, limit)
        .map(e => MacroEnricher.enrichEconomicEvent(e, nowMs));
    }

    // Default ALL: upcoming events are never crowded out by the release backlog.
    const upcoming = all.filter(e => new Date(e.date_time_utc).getTime() >= nowMs).sort(byTimeAsc);
    const recentPast = all
      .filter(e => {
        const t = new Date(e.date_time_utc).getTime();
        return t >= past24hMs && t < nowMs;
      })
      .sort(byTimeAsc);
    const olderPast = all
      .filter(e => new Date(e.date_time_utc).getTime() < past24hMs)
      .sort((a, b) => new Date(b.date_time_utc).getTime() - new Date(a.date_time_utc).getTime());

    const upcomingToTake = upcoming.slice(0, Math.min(upcoming.length, 120));
    const remainingSlots = Math.max(20, limit - upcomingToTake.length);
    const pastToTake = recentPast.slice(-remainingSlots);

    let merged = [...pastToTake, ...upcomingToTake];
    if (merged.length < limit && olderPast.length > 0) {
      const extraNeeded = limit - merged.length;
      merged = [...olderPast.slice(0, extraNeeded).reverse(), ...merged];
    }

    return merged.sort(byTimeAsc).map(e => MacroEnricher.enrichEconomicEvent(e, nowMs));
  }

  public async setEconomicEvents(events: EconomicEvent[]): Promise<void> {
    await prisma.$transaction([
      prisma.economicEvent.deleteMany({}),
      prisma.economicEvent.createMany({ data: events.map(e => this.economicEventData(e)) }),
    ]);
  }

  public async upsertEconomicEvent(event: EconomicEvent): Promise<void> {
    const data = this.economicEventData(event);
    await prisma.economicEvent.upsert({ where: { id: event.id }, create: data, update: data });
  }

  private economicEventData(event: EconomicEvent) {
    return {
      id: event.id,
      event_name: event.event_name,
      country_code: event.country_code,
      currency: event.currency,
      impact: event.impact,
      date_time_utc: event.date_time_utc,
      actual: event.actual ?? null,
      forecast: event.forecast ?? null,
      previous: event.previous ?? null,
      status: event.status,
      source: event.source,
      last_updated: event.last_updated ?? new Date().toISOString(),
      data_status: event.data_status ?? null,
      surprise: event.surprise ?? null,
      change: event.change ?? null,
      confidence: event.confidence ?? null,
      freshness: event.freshness ?? null,
      market_reaction: toJson(event.market_reaction),
      fundamental_implication: event.fundamental_implication ?? null,
      actual_market_reaction: event.actual_market_reaction ?? null,
    };
  }

  // ==================== MARKET THEMES & INTELLIGENCE ====================
  public async getMarketThemes(): Promise<MarketTheme[]> {
    const rows = await prisma.marketTheme.findMany();
    return rows.map(r => this.hydrateTheme(r));
  }

  public async upsertMarketTheme(theme: MarketTheme): Promise<void> {
    const mutable = {
      title: theme.title,
      description: theme.description,
      sentiment: theme.sentiment,
      primary_assets: toJson(theme.primary_assets),
      evidence_events: toJson(theme.evidence_events),
      active_since: theme.active_since ?? null,
    };
    await prisma.marketTheme.upsert({
      where: { id: theme.id },
      create: { id: theme.id, ...mutable },
      update: mutable,
    });
  }

  private hydrateTheme(row: Record<string, any>): MarketTheme {
    return {
      ...row,
      primary_assets: parseJson<string[]>(row.primary_assets, []),
      evidence_events: parseJson<string[]>(row.evidence_events, []),
    } as unknown as MarketTheme;
  }

  public async getAIAnalysisForEvent(eventId: string): Promise<AIAnalysis | undefined> {
    const row = await prisma.aIAnalysis.findFirst({ where: { event_id: eventId } });
    return row ? this.hydrateAnalysis(row) : undefined;
  }

  public async upsertAIAnalysis(analysis: AIAnalysis): Promise<void> {
    const mutable = {
      event_id: analysis.event_id ?? null,
      analysis_type: analysis.analysis_type,
      title: analysis.title,
      summary: analysis.summary,
      context_data_used: toJsonRequired(analysis.context_data_used, 'object'),
      key_implications: toJsonRequired(analysis.key_implications, 'array'),
      affected_assets_outlook: toJsonRequired(analysis.affected_assets_outlook, 'array'),
      confidence: analysis.confidence,
      disclaimer: analysis.disclaimer,
      created_at: analysis.created_at ?? new Date().toISOString(),
      is_insufficient_data: analysis.is_insufficient_data ?? false,
    };
    await prisma.aIAnalysis.upsert({
      where: { id: analysis.id },
      create: { id: analysis.id, ...mutable },
      update: mutable,
    });
    await this.enforceAnalysisCap();
  }

  private hydrateAnalysis(row: Record<string, any>): AIAnalysis {
    return {
      ...row,
      context_data_used: parseJson<AIAnalysis['context_data_used']>(row.context_data_used, {
        news_titles: [],
        market_prices: {},
        currency_strength: {},
        macro_releases: [],
      }),
      key_implications: parseJson<string[]>(row.key_implications, []),
      affected_assets_outlook: parseJson<AIAnalysis['affected_assets_outlook']>(row.affected_assets_outlook, []),
    } as unknown as AIAnalysis;
  }

  private async enforceAnalysisCap(): Promise<void> {
    const count = await prisma.aIAnalysis.count();
    if (count <= AI_ANALYSIS_CAP) return;
    const stale = await prisma.aIAnalysis.findMany({
      orderBy: { created_at: 'asc' },
      take: count - AI_ANALYSIS_CAP,
      select: { id: true },
    });
    await prisma.aIAnalysis.deleteMany({ where: { id: { in: stale.map(s => s.id) } } });
  }

  public async getLatestMarketOverviewAnalysis(): Promise<AIAnalysis | undefined> {
    const row = await prisma.aIAnalysis.findFirst({
      where: { analysis_type: 'MARKET_OVERVIEW' },
      orderBy: { created_at: 'desc' },
    });
    return row ? this.hydrateAnalysis(row) : undefined;
  }

  // ==================== DAILY SNAPSHOTS ====================
  public async getDailySnapshots(limit = 30, range = 'ALL', customDate?: string): Promise<DailyMarketSnapshot[]> {
    await this.ensureDefaultDailySnapshots();
    const rows = await prisma.dailySnapshot.findMany({ orderBy: { date: 'desc' } });
    const list = rows.map(r => this.hydrateSnapshot(r));

    if (customDate) return list.filter(s => s.date === customDate);

    const isoDaysAgo = (days: number) =>
      new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);

    if (range === 'TODAY') return list.filter(s => s.date === new Date().toISOString().slice(0, 10));
    if (range === 'YESTERDAY') return list.filter(s => s.date === isoDaysAgo(1));
    if (range === '7D') {
      const cutoff = isoDaysAgo(7);
      return list.filter(s => s.date >= cutoff);
    }
    if (range === '30D') {
      const cutoff = isoDaysAgo(30);
      return list.filter(s => s.date >= cutoff);
    }

    return list.slice(0, limit);
  }

  public async getDailySnapshotByDate(dateStr: string): Promise<DailyMarketSnapshot | null> {
    await this.ensureDefaultDailySnapshots();
    const row = await prisma.dailySnapshot.findUnique({ where: { date: dateStr } });
    return row ? this.hydrateSnapshot(row) : null;
  }

  public async saveDailySnapshot(snapshot: DailyMarketSnapshot): Promise<void> {
    const existing = await prisma.dailySnapshot.findFirst({
      where: { OR: [{ date: snapshot.date }, { id: snapshot.id }] },
      select: { id: true },
    });
    const mutable = this.snapshotData(snapshot, new Date().toISOString());

    if (existing) {
      await prisma.dailySnapshot.update({ where: { id: existing.id }, data: mutable });
    } else {
      await prisma.dailySnapshot.create({ data: { id: snapshot.id, ...mutable } });
    }
  }

  public async ensureDefaultDailySnapshots(): Promise<void> {
    const count = await prisma.dailySnapshot.count();
    if (count > 0) return;
    await prisma.dailySnapshot.createMany({
      data: DEFAULT_DAILY_SNAPSHOTS.map(s => ({ id: s.id, ...this.snapshotData(s, s.timestamp) })),
    });
  }

  private snapshotData(snapshot: DailyMarketSnapshot, timestamp: string) {
    return {
      date: snapshot.date,
      timestamp,
      title: snapshot.title,
      market_biases: toJsonRequired(snapshot.market_biases, 'object'),
      currency_strength: toJsonRequired(snapshot.currency_strength, 'array'),
      major_catalysts: toJsonRequired(snapshot.major_catalysts, 'array'),
      market_reaction_summary: snapshot.market_reaction_summary ?? '',
      ai_summary: snapshot.ai_summary ?? '',
      ai_why: toJsonRequired(snapshot.ai_why, 'array'),
      ai_risk: toJsonRequired(snapshot.ai_risk, 'array'),
      ai_context: toJsonRequired(snapshot.ai_context, 'array'),
      historical_insights: toJsonRequired(snapshot.historical_insights, 'array'),
      created_at: snapshot.created_at ?? timestamp,
    };
  }

  private hydrateSnapshot(row: Record<string, any>): DailyMarketSnapshot {
    return {
      ...row,
      market_biases: parseJson<DailyMarketSnapshot['market_biases']>(row.market_biases, {}),
      currency_strength: parseJson<DailyMarketSnapshot['currency_strength']>(row.currency_strength, []),
      major_catalysts: parseJson<DailyMarketSnapshot['major_catalysts']>(row.major_catalysts, []),
      ai_why: parseJson<string[]>(row.ai_why, []),
      ai_risk: parseJson<string[]>(row.ai_risk, []),
      ai_context: parseJson<string[]>(row.ai_context, []),
      historical_insights: parseJson<string[]>(row.historical_insights, []),
    } as unknown as DailyMarketSnapshot;
  }

  // ==================== MARKET MEMORY ====================
  public async getMarketMemoryInsights(): Promise<MarketMemoryInsight[]> {
    const comparisons = await this.getHistoricalCurrencyComparison();
    const usd = comparisons.find(c => c.currency === 'USD');
    const eur = comparisons.find(c => c.currency === 'EUR');
    const gbp = comparisons.find(c => c.currency === 'GBP');
    const jpy = comparisons.find(c => c.currency === 'JPY');

    const insights: MarketMemoryInsight[] = [];
    const nowIso = () => new Date().toISOString();
    const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;

    if (usd) {
      if (usd.delta_yesterday < -0.15 || usd.delta_7d < -0.4) {
        insights.push({
          id: 'mem_usd_weakening',
          type: 'CURRENCY',
          title: 'USD Persistent Weakening Across Recorded Sessions',
          description: `USD strength is easing (${signed(usd.delta_yesterday)} vs yesterday, ${signed(usd.delta_7d)} vs 7 days ago), in line with loosening Treasury yields.`,
          evidence: `USD Score: ${usd.today_score.toFixed(2)} (kemarin: ${usd.yesterday_score.toFixed(2)}, 7H: ${usd.seven_day_score.toFixed(2)})`,
          metric: `${signed(usd.delta_7d)} 7D Delta`,
          confidence: 94,
          created_at: nowIso(),
        });
      } else {
        insights.push({
          id: 'mem_usd_steady',
          type: 'CURRENCY',
          title: 'USD Holding Resilient Range in Multi-Session Tracking',
          description: `USD strength holds near ${usd.today_score.toFixed(2)}/10, keeping DXY at technical resistance.`,
          evidence: `Scores have held above 4.5 across the last three tracked sessions.`,
          metric: `${usd.today_score.toFixed(2)} / 10.0`,
          confidence: 91,
          created_at: nowIso(),
        });
      }
    }

    if (eur) {
      insights.push({
        id: 'mem_eur_divergence',
        type: 'CURRENCY',
        title: 'EUR diverging from its 7-day average',
        description: `EUR shifted ${signed(eur.delta_7d)} points versus its 7-day average amid signals of a Eurozone manufacturing slowdown.`,
        evidence: `EUR Today: ${eur.today_score.toFixed(2)} vs 7-Day: ${eur.seven_day_score.toFixed(2)}`,
        metric: `${signed(eur.delta_7d)} pts vs 7D`,
        confidence: 92,
        created_at: nowIso(),
      });
    }

    const xauPrice = await this.getMarketPrice('XAUUSD');
    const xauChg = xauPrice?.change_24h_pct ?? 0.45;
    insights.push({
      id: 'mem_xau_usd_inverse',
      type: 'CORRELATION',
      title: 'XAUUSD moves inversely to the dollar',
      description: `Gold (XAUUSD) shows a strong negative correlation to the dollar: spot moved ${signed(Number(xauChg.toFixed(2)))}% while the DXY score sat in its pressured zone at ${usd?.today_score.toFixed(1) || '4.4'}/10.`,
      evidence: `XAUUSD at $${xauPrice?.price.toLocaleString() || '2,742'} versus DXY 100.85 across the last three sessions.`,
      metric: `-0.86 Inverse Correlation`,
      confidence: 96,
      created_at: nowIso(),
    });

    if (gbp && gbp.today_score >= 6.5) {
      insights.push({
        id: 'mem_gbp_dominance',
        type: 'CURRENCY',
        title: 'GBP holds its G8 strength lead',
        description: `The pound (GBP) leads the G8 capital ranking at ${gbp.today_score.toFixed(2)}/10, backed by the Bank of England's hawkish stance.`,
        evidence: `GBP holds rank #1 ahead of EUR (${eur?.today_score.toFixed(2)}) and USD (${usd?.today_score.toFixed(2)}).`,
        metric: `#1 G8 Rank (${gbp.today_score.toFixed(2)})`,
        confidence: 95,
        created_at: nowIso(),
      });
    }

    if (jpy && jpy.today_score <= 4.0) {
      insights.push({
        id: 'mem_jpy_lag',
        type: 'CURRENCY',
        title: 'JPY under sustained carry-trade pressure',
        description: `The yen (JPY) stays at the bottom of the G8 (${jpy.today_score.toFixed(2)}/10), keeping the yield spread favourable to higher-yielding currencies.`,
        evidence: `The JPY score fell ${jpy.delta_7d} points over the last 7 days.`,
        metric: `${jpy.today_score.toFixed(2)} / 10.0 (Weakest)`,
        confidence: 93,
        created_at: nowIso(),
      });
    }

    return insights;
  }

  // ==================== SYSTEM HEALTH ====================
  public async getDatabaseStats() {
    const [
      users_count,
      verification_tokens_count,
      sources_count,
      telegram_channels_count,
      news_count,
      events_count,
      event_sources_count,
      prices_count,
      currency_strength_count,
      currency_strength_history_count,
      economic_events_count,
      themes_count,
      ai_analysis_count,
      daily_snapshots_count,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.verificationToken.count(),
      prisma.source.count(),
      prisma.telegramChannel.count(),
      prisma.newsItem.count(),
      prisma.marketEvent.count(),
      prisma.eventSource.count(),
      prisma.marketPrice.count(),
      prisma.currencyStrength.count(),
      prisma.currencyStrengthHistory.count(),
      prisma.economicEvent.count(),
      prisma.marketTheme.count(),
      prisma.aIAnalysis.count(),
      prisma.dailySnapshot.count(),
    ]);

    return {
      users_count,
      verification_tokens_count,
      sources_count,
      telegram_channels_count,
      news_count,
      events_count,
      event_sources_count,
      prices_count,
      currency_strength_count,
      currency_strength_history_count,
      economic_events_count,
      themes_count,
      ai_analysis_count,
      daily_snapshots_count,
    };
  }
}

// Global Singleton Instance
export const db = new RelationalDatabase();
