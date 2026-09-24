import {
  MarketPrice,
  CurrencyStrength,
  MarketEvent,
  EconomicEvent,
  AIAnalysis,
  MarketTheme,
  TelegramChannel,
  User,
  UserWatchlist,
  CentralBankSpeech,
  CurrencyMacroContext,
  UnifiedMarketContext,
  IntradayAssetBias,
  TodayCatalyst,
  ArahMarketTodayData,
  SubscriptionPlan,
  DailyMarketSnapshot,
  MarketMemoryInsight,
  HistoricalCurrencyComparison,
  SmtpStatusResponse,
  SmtpTestResponse,
} from '../types';

export const API_BASE = '/api';

let memoryToken: string | null = null;
let memoryUser: User | null = null;

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    const token =
      localStorage.getItem('arah_market_auth_token') ||
      localStorage.getItem('nexus_auth_token') ||
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('arah_market_auth_token');
    if (token && typeof token === 'string' && token.trim().length > 0) {
      memoryToken = token;
      return token;
    }
    return null;
  } catch {
    return memoryToken;
  }
}

export function setAuthToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) {
      localStorage.setItem('arah_market_auth_token', token);
      localStorage.setItem('nexus_auth_token', token);
      localStorage.setItem('auth_token', token);
      try { sessionStorage.setItem('arah_market_auth_token', token); } catch {}
    } else {
      localStorage.removeItem('arah_market_auth_token');
      localStorage.removeItem('nexus_auth_token');
      localStorage.removeItem('auth_token');
      try { sessionStorage.removeItem('arah_market_auth_token'); } catch {}
    }
  } catch (e) {
    console.warn('[Storage] Could not persist auth token:', e);
  }
}

export function getStoredUser(): User | null {
  if (memoryUser && typeof memoryUser === 'object' && memoryUser.id) return memoryUser;
  try {
    const raw =
      localStorage.getItem('arah_market_user') ||
      localStorage.getItem('nexus_user') ||
      localStorage.getItem('auth_user') ||
      sessionStorage.getItem('arah_market_user');
    if (raw) {
      const parsed = typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('['))
        ? JSON.parse(raw)
        : null;
      if (parsed && typeof parsed === 'object' && parsed.id && parsed.email) {
        memoryUser = parsed;
        return parsed;
      }
    }
    return null;
  } catch {
    return memoryUser;
  }
}

export function setStoredUser(user: User | null): void {
  memoryUser = user;
  try {
    if (user && typeof user === 'object' && user.id) {
      const json = JSON.stringify(user);
      localStorage.setItem('arah_market_user', json);
      localStorage.setItem('nexus_user', json);
      localStorage.setItem('auth_user', json);
      try { sessionStorage.setItem('arah_market_user', json); } catch {}
    } else {
      localStorage.removeItem('arah_market_user');
      localStorage.removeItem('nexus_user');
      localStorage.removeItem('auth_user');
      try { sessionStorage.removeItem('arah_market_user'); } catch {}
    }
  } catch (e) {
    console.warn('[Storage] Could not persist user:', e);
  }
}

export interface SavedAccount {
  email: string;
  name?: string;
  role?: string;
  lastLogin?: string;
}

export function getRegisteredAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem('arah_market_saved_accounts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRegisteredAccount(account: SavedAccount): void {
  try {
    const existing = getRegisteredAccounts();
    const filtered = existing.filter(a => a.email.toLowerCase() !== account.email.toLowerCase());
    filtered.unshift({
      ...account,
      lastLogin: new Date().toISOString(),
    });
    localStorage.setItem('arah_market_saved_accounts', JSON.stringify(filtered.slice(0, 10)));
  } catch {}
}

async function request<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers,
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      const err: any = new Error(errorJson.error || errorJson.message || `Request failed with status ${res.status}`);
      err.code = errorJson.code;
      err.email = errorJson.email;
      err.verificationUrl = errorJson.verificationUrl;
      err.status = res.status;
      throw err;
    }

    return await res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      const timeoutErr: any = new Error(`Request to ${endpoint} timed out after ${timeoutMs}ms`);
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  // Markets
  getMarkets: () => request<{ prices: MarketPrice[]; count: number }>('/markets'),
  getMarketSessions: () => request<{ sessions: any[]; active_sessions_count: number }>('/markets/status'),
  refreshMarkets: () => request<{ success: boolean }>('/markets/refresh', { method: 'POST' }),

  // Events & News
  getEvents: (limit = 50, impact?: string) =>
    request<{ events: MarketEvent[]; count: number; impact_filter?: string }>(
      `/events?limit=${limit}${impact ? `&impact=${impact}` : ''}`
    ),
  getEventDetail: (id: string) => request<{
    event: MarketEvent;
    sources: any[];
    timeline: any[];
    affected_markets: MarketPrice[];
    affected_currencies: CurrencyStrength[];
    ai_analysis: AIAnalysis | null;
  }>(`/events/${id}`),
  reanalyzeEvent: (id: string) => request<{ success: boolean; analysis: AIAnalysis }>(`/events/${id}/analyze`, { method: 'POST' }),
  triggerNews: (payload?: {
    title?: string;
    content?: string;
    category?: string;
    source_name?: string;
    language?: string;
    affected_assets?: string[];
    affected_currencies?: string[];
  }) => request<{
    success: boolean;
    message: string;
    news: any;
    event: MarketEvent;
    isDuplicate: boolean;
    isNew?: boolean;
    timestamp: string;
  }>('/news/trigger', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  }),

  // Currency Strength
  getCurrencyStrength: () => request<{ currency_strength: CurrencyStrength[]; source: string }>('/currency-strength'),
  getCurrencyChartFeed: (range: '1d' | '2d' = '1d') =>
    request<{
      success: boolean;
      range: string;
      series: Array<{ key: string; values: [number, number][] }>;
      source: string;
      timestamp: string;
    }>(`/currency-strength/chart-feed?range=${range}`),
  getCurrencyStrengthHistory: (currency?: string) =>
    request<{ history: Array<{ id: string; currency: string; strength_score: number; timestamp: string }>; count: number }>(
      '/currency-strength/history' + (currency ? `?currency=${currency}` : '')
    ),
  refreshCurrencyStrength: () => request<{ success: boolean; currency_strength: CurrencyStrength[] }>('/currency-strength/refresh', { method: 'POST' }),

  // Intraday Market Map & Today's Catalysts
  getArahMarketToday: () => request<{ success: boolean; data: ArahMarketTodayData; timestamp: string }>('/intelligence/arah-market'),
  getIntradayMarketMap: () => request<{ market_map: IntradayAssetBias[]; count: number; timestamp: string }>('/intelligence/intraday-map'),
  getTodayCatalysts: () => request<{ catalysts: TodayCatalyst[]; count: number; timestamp: string }>('/macro/today-catalysts'),

  // Macro Calendar
  getEconomicCalendar: (limit = 200, status?: string) =>
    request<{ calendar: EconomicEvent[]; count: number; upcoming_count?: number; released_count?: number; next_event?: EconomicEvent }>(
      `/macro/calendar?limit=${limit}${status ? `&status=${status}` : ''}`
    ),
  refreshEconomicCalendar: () => request<{ success: boolean; count: number }>('/macro/refresh', { method: 'POST' }),

  // Intelligence & AI
  getMarketThemes: () => request<{ themes: MarketTheme[] }>('/intelligence/themes'),
  getCentralBankSpeeches: () => request<{ speeches: CentralBankSpeech[]; count: number }>('/intelligence/central-bank-speeches'),
  getMacroContext: () => request<{ contexts: CurrencyMacroContext[]; count: number }>('/intelligence/macro-context'),
  getUnifiedMarketContext: () => request<{ context: UnifiedMarketContext }>('/intelligence/unified-context'),
  getMarketImpact: () => request<{ high_impact_events: MarketEvent[]; currency_dispersion: CurrencyStrength[]; market_overview_prices: any[] }>('/intelligence/impact'),
  getRelationshipMatrix: () => request<{ relationship_matrix: any[] }>('/intelligence/relationships'),
  getAIOverview: () => request<{ market_overview: AIAnalysis }>('/intelligence/ai'),
  refreshAIOverview: () => request<{ success: boolean; market_overview: AIAnalysis }>('/intelligence/ai/refresh', { method: 'POST' }),

  // Auth & User
  getMe: () => request<{ user: User; preferences: any; watchlist: UserWatchlist[] }>('/auth/me'),
  login: (credentials: { email: string; password: string }) => request<{ user: User; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  firebaseLogin: (payload: { idToken: string }) =>
    request<{ user: User; token: string; success: boolean }>('/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  register: (payload: { email: string; password: string; name: string }) => request<{
    success: boolean;
    status: 'pending_verification' | 'verified';
    message: string;
    email: string;
    token?: string;
    verificationUrl?: string;
    user: User;
  }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getAccounts: () => request<{ success: boolean; users: Array<{ email: string; name: string; role: string; plan?: string }> }>('/auth/accounts'),
  verifyEmail: (token: string) => request<{
    success: boolean;
    message: string;
    token: string;
    user: User;
  }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  }),
  verifyCode: (email: string, code: string) => request<{
    success: boolean;
    message: string;
    token: string;
    user: User;
  }>('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  }),
  checkVerificationStatus: (email: string) => request<{
    email: string;
    is_verified: boolean;
    verification_status: string;
    token?: string;
    user?: User;
  }>(`/auth/check-status?email=${encodeURIComponent(email)}`),
  resendVerification: (email: string) => request<{
    success: boolean;
    message: string;
    code?: string;
    verificationUrl?: string;
  }>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  getWatchlist: () => request<{ watchlist: UserWatchlist[] }>('/user/watchlist'),
  addToWatchlist: (symbol: string, asset_type: string) => request<{ success: boolean; item: UserWatchlist }>('/user/watchlist', {
    method: 'POST',
    body: JSON.stringify({ symbol, asset_type }),
  }),
  removeFromWatchlist: (symbol: string) => request<{ success: boolean; symbol: string }>(`/user/watchlist/${symbol}`, {
    method: 'DELETE',
  }),
  updateSubscription: (plan: SubscriptionPlan) => request<{ success: boolean; user: User }>('/user/subscription', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  }),
  getUserEntitlements: () => request<any>('/user/entitlements'),
  requestPasswordReset: (email: string) => request<{ message: string; resetUrl?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  forgotPassword: (email: string) => request<{ success: boolean; message: string; resetUrl?: string; email: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  resetPassword: (payload: { token: string; newPassword: string }) => request<{
    success: boolean;
    message: string;
    token: string;
    user: User;
  }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  requestMagicLink: (email: string) => request<{ success: boolean; message: string; magicUrl?: string; email: string }>('/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  verifyMagicLink: (token: string) => request<{
    success: boolean;
    message: string;
    token: string;
    user: User;
  }>('/auth/magic-link-verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  }),


  // Admin
  getSystemHealth: () => request<any>('/admin/system-health'),
  getAdminUsers: (params?: { search?: string; role?: string; plan?: string; status?: string; verified?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.role) q.set('role', params.role);
    if (params?.plan) q.set('plan', params.plan);
    if (params?.status) q.set('status', params.status);
    if (params?.verified) q.set('verified', params.verified);
    const qs = q.toString();
    return request<{
      users: User[];
      count: number;
      metrics?: {
        total: number;
        verified: number;
        unverified: number;
        admins: number;
        pro: number;
        institutional: number;
        free: number;
      };
    }>(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  createAdminUser: (data: {
    name: string;
    email: string;
    password?: string;
    role?: 'USER' | 'ADMIN';
    plan?: 'FREE' | 'PRO' | 'INSTITUTIONAL';
    subscription_status?: string;
    is_verified?: boolean;
  }) => request<{ success: boolean; user: User; initial_password?: string }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateAdminUser: (id: string, updates: {
    name?: string;
    email?: string;
    role?: string;
    plan?: string;
    subscription_status?: string;
    is_verified?: boolean;
  }) => request<{ success: boolean; user: User }>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }),
  deleteAdminUser: (id: string) => request<{ success: boolean; message: string; deleted_id: string }>(`/admin/users/${id}`, {
    method: 'DELETE',
  }),
  resetAdminUserPassword: (id: string, new_password?: string) => request<{
    success: boolean;
    message: string;
    temporary_password?: string;
  }>(`/admin/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ new_password }),
  }),
  generateAdminUserMagicLink: (id: string) => request<{
    success: boolean;
    token: string;
    magic_link: string;
    user_email: string;
    expires_at: string;
  }>(`/admin/users/${id}/magic-link`, {
    method: 'POST',
  }),
  toggleAdminUserVerification: (id: string) => request<{
    success: boolean;
    is_verified: boolean;
    user: User;
    message: string;
  }>(`/admin/users/${id}/toggle-verification`, {
    method: 'POST',
  }),
  getSources: () => request<{ sources: any[]; count: number }>('/admin/sources'),
  toggleSource: (id: string, is_enabled: boolean) => request<any>(`/admin/sources/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_enabled }),
  }),
  getTelegramChannels: () => request<{ channels: TelegramChannel[]; count: number }>('/admin/telegram'),
  addTelegramChannel: (handle: string, title?: string, language?: string) => request<any>('/admin/telegram', {
    method: 'POST',
    body: JSON.stringify({ handle, title, language }),
  }),
  toggleTelegramChannel: (handle: string, is_enabled: boolean) => request<any>(`/admin/telegram/${handle}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_enabled }),
  }),
  deleteTelegramChannel: (handle: string) => request<any>(`/admin/telegram/${handle}`, {
    method: 'DELETE',
  }),
  triggerTelegramScrape: (handle: string) => request<any>(`/admin/telegram/${handle}/scrape`, {
    method: 'POST',
  }),
  getDuplicates: () => request<{ total_deduplicated_events: number; events: any[] }>('/admin/duplicates'),
  runGlobalIngest: () => request<any>('/sync', { method: 'POST' }).catch(() => request<any>('/admin/ingest/run-all', { method: 'POST' })),
  getSourcesAudit: () => request<{
    total_sources: number;
    active_sources: number;
    sources: any[];
    telegram_channels: any[];
    integrity_stats: {
      total_canonical_events: number;
      multi_source_verified_events: number;
      total_news_items: number;
    };
    timestamp: string;
  }>('/sources'),
  injectTestArticle: (payload: { title: string; content?: string; source_name?: string; language?: string }) => request<any>('/admin/ingest/test-article', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Historical Market Memory & Snapshots
  getDailySnapshots: (range = 'ALL', date?: string, limit = 30) =>
    request<{ snapshots: DailyMarketSnapshot[]; count: number }>(`/history/snapshots?range=${range}${date ? `&date=${date}` : ''}&limit=${limit}`),
  getDailySnapshotDetail: (date: string) =>
    request<{
      snapshot: DailyMarketSnapshot;
      events: MarketEvent[];
      economic_events: EconomicEvent[];
      currency_history: any[];
    }>(`/history/snapshot/${date}`),
  getMarketMemoryInsights: () =>
    request<{ insights: MarketMemoryInsight[]; count: number }>('/history/insights'),
  getHistoricalCurrencyComparison: () =>
    request<{ comparisons: HistoricalCurrencyComparison[]; count: number; source: string }>('/history/currency-comparison'),
  generateDailySnapshot: (date?: string) =>
    request<{ success: boolean; snapshot: DailyMarketSnapshot }>('/history/generate-snapshot', {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),

  // Admin SMTP Management & Connection Tester
  getSmtpStatus: () => request<SmtpStatusResponse>('/admin/smtp/status'),
  testSmtpConnection: (payload?: { send_test_email?: boolean; recipient?: string }) =>
    request<SmtpTestResponse>('/admin/smtp/test', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
};
