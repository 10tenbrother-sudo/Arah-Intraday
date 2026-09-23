/**
 * Shared Type Definitions for Real-Time Market Intelligence Platform
 */

export type UserRole = 'USER' | 'ADMIN';
export type SubscriptionPlan = 'FREE' | 'PRO' | 'INSTITUTIONAL';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  name: string;
  role: UserRole;
  is_verified: boolean;
  verification_status?: 'pending_verification' | 'verified';
  avatar_url?: string;
  plan?: SubscriptionPlan;
  subscription_status?: 'active' | 'trialing' | 'canceled' | 'none' | 'pending';
  subscription_expires_at?: string;
  last_order_id?: string;
  payment_method?: string;
  billing_cycle?: 'monthly' | 'annual';
  created_at: string;
  updated_at: string;
}

export interface VerificationToken {
  id: string;
  user_id: string;
  email: string;
  token: string;
  code?: string; // 6-digit numeric OTP code
  expires_at: string;
  created_at: string;
  used_at?: string;
  type?: 'email_verification' | 'password_reset' | 'magic_link';
}

export interface UserPreferences {
  user_id: string;
  timezone: string;
  language: string;
  theme: 'dark' | 'midnight';
  default_market_view: string;
  density: 'compact' | 'normal';
  audio_alerts: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWatchlist {
  id: string;
  user_id: string;
  symbol: string;
  asset_type: 'ASSET' | 'CURRENCY' | 'INDEX' | 'COMMODITY' | 'CRYPTO';
  notes?: string;
  added_at: string;
}

export interface UserAlert {
  id: string;
  user_id: string;
  symbol: string;
  condition: 'ABOVE' | 'BELOW' | 'IMPACT_HIGH' | 'BREAKING_EVENT';
  target_value?: number;
  is_active: boolean;
  triggered_at?: string;
  created_at: string;
}

export type SourceType = 'TELEGRAM' | 'CURRENCY_STRENGTH' | 'MARKET_DATA' | 'ECONOMIC_CALENDAR' | 'NEWS_WIRE';
export type SourceStatus = 'LIVE' | 'RECENT' | 'DELAYED' | 'HISTORICAL' | 'UNAVAILABLE' | 'ERROR';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  endpoint_url: string;
  is_enabled: boolean;
  status: SourceStatus;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  error_count: number;
  interval_seconds: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TelegramChannel {
  id: string;
  handle: string; // e.g. "@SM_News_24"
  title: string;
  source_id: string;
  is_enabled: boolean;
  language: string;
  last_scraped_message_id?: number | string;
  last_ingested_at: string | null;
  status: SourceStatus;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export type NewsCategory = 'MACRO' | 'CENTRAL_BANK' | 'COMMODITY' | 'COMMODITIES' | 'CRYPTO' | 'EQUITIES' | 'EQUITY' | 'GEOPOLITICS' | 'MICRO';
export type NewsStatus = 'RAW' | 'PARSED' | 'NORMALIZED' | 'DEDUPLICATED' | 'EVENT_LINKED' | 'FAILED';

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  source_id: string;
  source_name: string;
  source_url: string;
  language: string;
  published_at: string;
  received_at: string;
  updated_at: string;
  event_id: string | null;
  affected_assets: string[];
  affected_currencies: string[];
  category: NewsCategory;
  status: NewsStatus;
  raw_payload?: string;
  entities_extracted?: {
    figures?: string[];
    rates?: string[];
    organizations?: string[];
    direction?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
}

export type EventImpact = 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';

export interface PairImpact {
  pair: string; // e.g. 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'USDCHF', 'AUDUSD', 'US100', 'US500', 'US30', 'BTC'
  displayName?: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'MILD';
  rationale: string;
  mechanism?: string;
  confidence?: number;
}

export interface MarketEvent {
  id: string; // Canonical Event ID
  title: string; // Canonical Event Title (e.g. "US CPI Rises 3.1% YoY in Latest Print")
  summary: string; // Concise, fact-grounded summary
  primary_category: NewsCategory;
  impact_level: EventImpact;
  first_detected_at: string;
  last_updated_at: string;
  source_count: number;
  source_names: string[];
  affected_assets: string[]; // e.g. ['XAUUSD', 'US100', 'US500', 'US30', 'BTC']
  affected_currencies: string[]; // e.g. ['USD', 'EUR']
  key_facts: string[];
  image_url?: string;
  is_duplicate_resolved: boolean;
  ai_analysis_id?: string;
  pair_impacts?: PairImpact[];
}

export interface EventSource {
  id: string;
  event_id: string;
  news_id: string;
  source_name: string;
  source_url: string;
  language: string;
  original_title: string;
  original_content: string;
  published_at: string;
  matched_reason: string;
  similarity_score: number;
  created_at: string;
}

export interface MarketPrice {
  symbol: string; // e.g. 'XAUUSD', 'BTC', 'US30', 'US500', 'US100', 'US10Y', 'DXY', 'EURUSD'
  display_name: string;
  asset_type: 'COMMODITY' | 'CRYPTO' | 'INDEX' | 'FOREX' | 'BOND';
  price: number;
  change_24h: number;
  change_24h_pct: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  source: string;
  timestamp: string;
  last_updated: string;
  status: SourceStatus;
  sparkline_1h: number[];
  tv_symbol?: string;
  tradingview_url?: string;
  is_delayed?: boolean;
}

export interface MarketSession {
  session_name: 'SYDNEY' | 'TOKYO' | 'LONDON' | 'NEW_YORK';
  is_open: boolean;
  opens_at_utc: string;
  closes_at_utc: string;
  current_status: 'OPEN' | 'CLOSED' | 'CLOSING_SOON';
}

export interface CurrencyStrength {
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'NZD' | 'CAD' | 'CHF';
  strength_score: number; // 0.0 - 10.0 scale from provider
  change_direction: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  rank: number;
  source: string;
  timestamp: string;
  last_updated: string;
  status: SourceStatus;
  raw_delta?: number;
}

export interface CurrencyStrengthHistory {
  id: string;
  currency: string;
  strength_score: number;
  timestamp: string;
}

export interface EconomicEvent {
  id: string; // e.g. "Core CPI m/m", "Non-Farm Employment Change", "Federal Funds Rate"
  event_name: string;
  country_code: string; // e.g. "US", "EU", "GB", "JP"
  currency: string; // "USD", "EUR", "GBP", "JPY", etc.
  impact: EventImpact;
  date_time_utc: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  revised_from?: string | null;
  status: 'UPCOMING' | 'RELEASED' | 'DELAYED';
  source: string;
  last_updated: string;
  data_status?: 'LIVE' | 'DELAYED' | 'UNAVAILABLE';
  // Measurable Intelligence fields
  surprise?: string | null; // Actual vs Forecast: e.g. "+0.2% (BEAT)", "-15K (MISS)", "IN-LINE"
  change?: string | null; // Actual vs Previous: e.g. "+0.1%", "-0.2%"
  confidence?: number; // 0 - 100
  freshness?: string; // age of data: e.g. "12m ago", "2h ago", "Upcoming"
  market_reaction?: {
    primary_asset: string;
    r1m?: string; // reaction after 1m e.g. "+14 pips" or "+0.18%"
    r5m?: string; // reaction after 5m
    r15m?: string; // reaction after 15m
    r1h?: string; // reaction after 1h
    r4h?: string; // reaction after 4h
  };
  fundamental_implication?: string; // Theoretical fundamental meaning
  actual_market_reaction?: string; // Real observed market reaction
}

export type CentralBankTone = 'HAWKISH' | 'DOVISH' | 'NEUTRAL' | 'MIXED';

export interface CentralBankSpeech {
  id: string;
  speaker: string; // e.g. "Jerome Powell (Fed Chair)", "Christine Lagarde (ECB President)"
  central_bank: 'FED' | 'ECB' | 'BOE' | 'BOJ' | 'RBA' | 'RBNZ' | 'BOC' | 'SNB';
  currency: string;
  title: string;
  date_time_utc: string;
  tone: CentralBankTone;
  what_was_said: string; // Core quotes and statements
  what_changed: string; // Shift compared to previous statement & recent data
  why_it_matters: string; // Strategic policy transmission mechanism
  currency_impact: string; // Direct effect on currency crosses
  asset_relevance: string; // Direct effect on XAUUSD, US100, Treasuries, BTC
  previous_stance: string;
  confidence: number;
  source: string;
  timestamp: string;
}

export type MacroConditionStatus = 'STRONG' | 'WEAK' | 'MIXED';

export interface CurrencyMacroContext {
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'NZD' | 'CAD' | 'CHF';
  status: MacroConditionStatus;
  score: number; // 0.0 - 10.0 scale
  inflation: {
    value: string;
    assessment: 'ELEVATED' | 'TARGET' | 'COOLING' | 'SUB_TARGET';
    evidence: string;
  };
  employment: {
    value: string;
    assessment: 'ROBUST' | 'BALANCED' | 'SOFTENING' | 'WEAK';
    evidence: string;
  };
  growth: {
    value: string;
    assessment: 'EXPANSION' | 'STABLE' | 'SLOWDOWN' | 'CONTRACTION';
    evidence: string;
  };
  pmi: {
    value: string;
    assessment: 'EXPANSION' | 'NEUTRAL' | 'CONTRACTION';
    evidence: string;
  };
  interest_rate: {
    value: string;
    assessment: 'RESTRICTIVE' | 'NEUTRAL' | 'ACCOMMODATIVE';
    evidence: string;
  };
  central_bank_tone: {
    value: CentralBankTone;
    evidence: string;
  };
  currency_strength: {
    score: number;
    rank: number;
    direction: string;
  };
  evidence_summary: string;
  causal_chain: string; // e.g. "Inflation Sticky + Strong Labor -> Fed Cut Delay -> USD Yield Support"
  confidence: number;
  last_updated: string;
  source: string;
}

export interface UnifiedMarketContext {
  regime: string;
  sentiment: 'RISK_ON' | 'RISK_OFF' | 'MIXED' | 'NEUTRAL';
  summary: string;
  pillars: {
    news_wire_summary: string;
    macro_data_summary: string;
    central_bank_summary: string;
    currency_strength_summary: string;
    market_data_summary: string;
  };
  causal_conclusions: Array<{
    title: string;
    steps: string[];
    source: string;
    timestamp: string;
    evidence: string;
    confidence: number;
    status: 'BULLISH' | 'BEARISH' | 'MIXED' | 'INSUFFICIENT_CURRENT_DATA';
  }>;
  asset_outlook: Array<{
    asset: string;
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';
    fundamental_implication: string;
    actual_market_reaction: string;
    confidence: number;
  }>;
  confidence: number;
  timestamp: string;
}

export interface MarketTheme {
  id: string;
  title: string;
  description: string;
  active_since: string;
  primary_assets: string[];
  sentiment: 'BULLISH' | 'BEARISH' | 'MIXED' | 'RISK_ON' | 'RISK_OFF';
  evidence_events: string[];
}

export interface AIAnalysis {
  id: string;
  event_id?: string;
  analysis_type: 'EVENT_ANALYSIS' | 'MARKET_OVERVIEW' | 'THEME_ANALYSIS';
  title: string;
  summary: string;
  context_data_used: {
    news_titles: string[];
    market_prices: Record<string, number>;
    currency_strength: Record<string, number>;
    macro_releases: string[];
  };
  key_implications: string[];
  affected_assets_outlook: Array<{
    asset: string;
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    rationale: string;
  }>;
  confidence: number;
  disclaimer: string;
  created_at: string;
  is_insufficient_data: boolean;
}

export interface SystemHealth {
  uptime_seconds: number;
  db_status: 'HEALTHY' | 'DEGRADED';
  active_sse_connections: number;
  total_events: number;
  total_news_items: number;
  total_sources: number;
  active_sources: number;
  last_ingest_time: string | null;
  ingest_error_count_24h: number;
}

export type MarketDirectionBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';

export interface IntradayAssetBias {
  symbol: string; // 'XAUUSD', 'BTC', 'US30', 'US500', 'US100', 'US10Y', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'
  display_name: string;
  asset_type: 'COMMODITY' | 'CRYPTO' | 'INDEX' | 'FOREX' | 'BOND';
  price: number;
  change_24h_pct: number;
  sparkline_1h?: number[];
  
  // Overall Intraday Bias
  overall_bias: MarketDirectionBias;
  direction_score: number; // -100 to +100
  confidence: number; // 0 - 100%

  // Separated Biases
  fundamental_bias: MarketDirectionBias;
  fundamental_score: number; // -100 to +100
  price_action_bias: MarketDirectionBias;
  price_action_score: number; // -100 to +100

  // Evidence & Drivers
  top_drivers: string[]; // 3-5 specific drivers grounded in real data
  conflicting_factors: string[]; // Countervailing evidence
  today_key_catalyst: string; // Key event/speech/release impacting today
  current_market_reaction: string; // Actual intraday reaction observed
  conditions_to_change_bias: string; // Invalidation / pivot trigger
  
  // Data Integrity & Provenance
  source: string;
  timestamp: string;
  last_updated: string;
  status: SourceStatus;
  tv_symbol?: string;
  tradingview_url?: string;
}

export interface TodayCatalyst {
  id: string;
  event_name: string;
  date_time_utc: string;
  country_code: string;
  currency: string;
  importance: EventImpact;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  surprise: string | null; // e.g. "+0.2% (BEAT)", "-15K (MISS)", "IN-LINE"
  change: string | null; // e.g. "+0.1%"
  related_assets: string[];
  status: 'UPCOMING' | 'RELEASED' | 'DELAYED';
  actual_market_reaction: string;
  fundamental_implication: string;
  source: string;
  last_updated: string;
  data_status: 'LIVE' | 'RECENT' | 'DELAYED' | 'UNAVAILABLE';
}

export interface DailyMarketSnapshot {
  id: string; // e.g. "snapshot_2026-09-19"
  date: string; // "YYYY-MM-DD"
  timestamp: string; // ISO
  title: string;
  market_biases: Record<string, {
    symbol: string;
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';
    score: number;
    price: number;
    change_24h_pct: number;
    strength_label: string; // "Strong" | "Moderate" | "Weak"
    major_catalyst: string;
    last_updated: string;
  }>;
  currency_strength: Array<{
    currency: string;
    score: number;
    rank: number;
    direction: string;
    change_vs_yesterday?: number;
    change_vs_7d?: number;
  }>;
  major_catalysts: Array<{
    event_name: string;
    currency: string;
    impact: string;
    actual?: string | null;
    forecast?: string | null;
    market_reaction?: string;
  }>;
  market_reaction_summary: string;
  ai_summary: string;
  ai_why: string[];
  ai_risk: string[];
  ai_context: string[];
  historical_insights: string[];
  created_at: string;
}

export interface MarketMemoryInsight {
  id: string;
  type: 'CURRENCY' | 'ASSET' | 'CORRELATION' | 'MACRO';
  title: string;
  description: string;
  evidence: string;
  metric: string;
  confidence: number;
  created_at: string;
}

export interface HistoricalCurrencyComparison {
  currency: string;
  today_score: number;
  yesterday_score: number;
  three_day_score: number;
  seven_day_score: number;
  delta_yesterday: number;
  delta_3d: number;
  delta_7d: number;
  trend: 'STRENGTHENING' | 'WEAKENING' | 'STABLE';
}

// ==========================================
// SEGMENT: ARAH MARKET HARI INI (INTRADAY TRIPLE-CONFLUENCE)
// ==========================================

export type TripleConfluenceStatus =
  | 'HIGH_CONVICTION' // 3/3 Aligned (Fundamental + Intermarket + Price Action)
  | 'MODERATE'        // 2/3 Aligned
  | 'CAUTION_TRAP'    // Only 1/3 (Price Action opposes Fundamental/Intermarket)
  | 'NEUTRAL_CHOP';   // Indecisive / mixed flows

export type TradingSessionName = 'SYDNEY' | 'TOKYO' | 'LONDON' | 'NEW_YORK' | 'OVERLAP';

export interface IntermarketSpreadItem {
  id: string;
  name: string;
  formulaLabel: string;
  currentValue: number;
  unit: string;
  changeSessionBps: number;
  trend: 'WIDENING' | 'NARROWING' | 'STABLE';
  targetPair: string; // e.g. 'USDJPY', 'EURUSD', 'XAUUSD', 'US500'
  interpretation: string;
}

export interface CurrencyStrengthConfluenceItem {
  isForex: boolean;
  baseCurrency: string;
  baseScore: number;
  baseRank: number;
  quoteCurrency: string;
  quoteScore: number;
  quoteRank: number;
  netDifferential: number; // baseScore - quoteScore e.g. +1.8
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  alignment: 'CONFIRMED' | 'DIVERGENCE' | 'NEUTRAL';
  advantageLabel: string; // e.g. 'USD (#5, 4.3) Unggul +3.8 atas JPY (#8, 0.5)'
  summary: string;
}

export interface IntradayPairConfluence {
  pair: string;
  displayName: string;
  currentPrice: number;
  change24hPct: number;
  directionalBias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  confluenceStatus: TripleConfluenceStatus;
  convictionScore: number;
  // Currency Strength Confluence (Khusus Pasangan Forex)
  currencyStrength?: CurrencyStrengthConfluenceItem;
  fundamental: {
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    keyDriver: string;
    score: number;
  };
  intermarket: {
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    primarySymptom: string;
    score: number;
    spreadImpact?: string;
  };
  priceAction: {
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    structure: 'SESSION_BREAKOUT' | 'RETEST_SUPPORT' | 'RETEST_RESISTANCE' | 'CHOP_RANGE';
    actionableZone: string;
    score: number;
  };
  intradayPlan: {
    recommendedAction: 'LOOK_FOR_BUY' | 'LOOK_FOR_SELL' | 'WAIT_ON_SUPPORT' | 'CAUTION_NO_TRADE';
    invalidationTrigger: string;
    warningNote?: string;
  };
  tvSymbol?: string;
}

export interface IndexCorrelationMetrics {
  us100Price: number;
  us100Change: number;
  us30Price: number;
  us30Change: number;
  ratioUs100ToUs30: number; // e.g. 0.456 (US100 / US30)
  ratioTrend: 'OUTPERFORMING' | 'UNDERPERFORMING' | 'EQUAL';
  marketRotationRegime: 'TECH_LEADERSHIP' | 'FLIGHT_TO_VALUE' | 'BROAD_RALLY' | 'BROAD_SELLOFF' | 'BALANCED_ROTATION';
  regimeDescription: string;
  tacticalPlaybook: {
    preferredAsset: 'US100' | 'US30' | 'NEUTRAL';
    reason: string;
    yieldConditionTrigger: string;
  };
}

export interface ArahMarketTodayData {
  activeSession: TradingSessionName;
  sessionStatusText: string;
  globalRegime: {
    title: string;
    badgeColor: string;
    riskScore: number;
    dxyBiasVsOpen: 'ABOVE_OPEN' | 'BELOW_OPEN' | 'AT_OPEN';
    summaryNarrative: string;
    topCatalystHeadline?: string;
  };
  intermarketSpreads: IntermarketSpreadItem[];
  indexCorrelation?: IndexCorrelationMetrics;
  anomalyAlerts: Array<{
    id: string;
    severity: 'WARNING' | 'OPPORTUNITY';
    title: string;
    description: string;
    affectedPairs: string[];
    actionAdvice: string;
  }>;
  pairs: IntradayPairConfluence[];
  generatedAt: string;
}
