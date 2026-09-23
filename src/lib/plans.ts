/**
 * Centralized Plan Configuration & Entitlements Definition
 * Single source of truth for Plans, Pricing, Entitlements, and Usage Limits.
 */

export type SubscriptionPlanId = 'FREE' | 'PRO' | 'INSTITUTIONAL';
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'none' | 'expired';

export type FeaturePermission =
  | 'MARKET_RADAR'              // Real-time Intraday Bias Radar (Core Assets)
  | 'CURRENCY_STRENGTH_MATRIX'  // G8 Currency Strength Matrix & Heatmap
  | 'MACRO_NEWS_WIRE'           // Curated Macro News Wire & RSS Ingestion
  | 'ECONOMIC_CALENDAR'         // Economic Calendar with Consensus & Actuals
  | 'TRADINGVIEW_CHARTS'        // TradingView Modals & Technical Integration
  | 'AI_OVERVIEW_REFRESH'       // AI-driven Macro Market Overview generation/refresh
  | 'AI_DEEP_ANALYSIS'          // Advanced AI causal chains & event reanalysis
  | 'SSE_PRIORITY_STREAM'       // Sub-second SSE real-time event updates
  | 'PERSISTENT_WATCHLIST'      // Cloud-synced Watchlist beyond single session
  | 'CUSTOM_TELEGRAM_SCRAPER'   // Telegram Scraping Control Panel & Feed Injector
  | 'ADMIN_SYSTEM_PANEL'        // System Health, Data Sources & Raw Deduplication
  | 'API_DATA_EXPORT';          // Direct raw data exports & telemetry access

export interface PlanLimits {
  watchlistLimit: number;           // Max items allowed in user watchlist (e.g. 5 vs 50 vs 500)
  aiGenerationsPerDay: number;      // Max Gemini AI overview refreshes / re-analyses per day
  streamRateHz: number;             // Real-time SSE frequency limit
  customTelegramChannels: number;   // Number of custom public Telegram feeds user can ingest
}

export interface PlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  badge?: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: 'USD';
  description: string;
  popular?: boolean;
  accentColor: 'slate' | 'cyan' | 'purple';
  features: string[];
  exclusiveFeatures: string[];
  permissions: FeaturePermission[];
  limits: PlanLimits;
}

export const PLANS: Record<SubscriptionPlanId, PlanDefinition> = {
  FREE: {
    id: 'FREE',
    name: 'Evaluation Tier',
    tagline: 'Basic Market Surveillance',
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'USD',
    description: 'Real-time market radar and economic calendar for individual traders evaluating terminal intelligence.',
    accentColor: 'slate',
    features: [
      'Real-time Intraday Bias Radar (13 Core Assets)',
      'G8 Currency Strength Matrix & Heatmap',
      'Curated Macro News Wire & RSS Ingestion',
      'Economic Calendar with Consensus & Actuals',
      'Unlimited Cloud Watchlist (up to 500 symbols)',
      'TradingView Chart Modals & Verified Snapshots',
      'Sub-second SSE Live Data Priority Stream',
      'AI-Powered Macro Summaries & Causal Logic',
      'Today\'s Catalysts Beat/Miss Real-Time Analysis',
      'Central Bank Speech Hawkish/Dovish Tone Engine',
      'Free Unlimited Access (No Payment Required)',
    ],
    exclusiveFeatures: [
      'Full Macro Intelligence & Real-Time Surveillance',
      'Automated Macro Causal Impact Chains',
    ],
    permissions: [
      'MARKET_RADAR',
      'CURRENCY_STRENGTH_MATRIX',
      'MACRO_NEWS_WIRE',
      'ECONOMIC_CALENDAR',
      'TRADINGVIEW_CHARTS',
      'AI_OVERVIEW_REFRESH',
      'AI_DEEP_ANALYSIS',
      'SSE_PRIORITY_STREAM',
      'PERSISTENT_WATCHLIST',
      'CUSTOM_TELEGRAM_SCRAPER',
      'ADMIN_SYSTEM_PANEL',
      'API_DATA_EXPORT',
    ],
    limits: {
      watchlistLimit: 500,
      aiGenerationsPerDay: 500,
      streamRateHz: 50,
      customTelegramChannels: 25,
    },
  },
  PRO: {
    id: 'PRO',
    name: 'Trader Pro',
    badge: 'FREE ACCESS',
    tagline: 'Full Institutional Macro Engine',
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'USD',
    popular: true,
    description: 'High-frequency macro intelligence, sub-second streaming, unlimited cloud watchlists, and AI catalyst breakdowns.',
    accentColor: 'cyan',
    features: [
      'Everything in Evaluation Tier',
      'Sub-second SSE Live Data Priority Stream',
      'AI-Powered Macro Summaries & Causal Logic',
      'Today\'s Catalysts Beat/Miss Real-Time Analysis',
      'Central Bank Speech Hawkish/Dovish Tone Engine',
      'Persistent Cloud Watchlists (up to 500 symbols)',
      'Full Multi-Timeframe TradingView Modals',
      'Configurable Sound & Visual Price Threshold Alerts',
    ],
    exclusiveFeatures: [
      'Sub-second real-time event alerts',
      'Automated macro causal impact chains',
      'Priority WebSocket/SSE connection pool',
    ],
    permissions: [
      'MARKET_RADAR',
      'CURRENCY_STRENGTH_MATRIX',
      'MACRO_NEWS_WIRE',
      'ECONOMIC_CALENDAR',
      'TRADINGVIEW_CHARTS',
      'AI_OVERVIEW_REFRESH',
      'AI_DEEP_ANALYSIS',
      'SSE_PRIORITY_STREAM',
      'PERSISTENT_WATCHLIST',
      'CUSTOM_TELEGRAM_SCRAPER',
      'ADMIN_SYSTEM_PANEL',
      'API_DATA_EXPORT',
    ],
    limits: {
      watchlistLimit: 500,
      aiGenerationsPerDay: 500,
      streamRateHz: 50,
      customTelegramChannels: 25,
    },
  },
  INSTITUTIONAL: {
    id: 'INSTITUTIONAL',
    name: 'Desk & Institutional',
    badge: 'DESK & PROP',
    tagline: 'Multi-Seat Enterprise Telemetry',
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'USD',
    description: 'Enterprise pipeline control, private Telegram feed scraping engine, custom webhooks, and administrative multi-seat authority.',
    accentColor: 'purple',
    features: [
      'Everything in Trader Pro',
      'Telegram Feed Ingestion Scraper Control Panel',
      'Custom Source Management & Ingestion Overrides',
      'Raw Relational Database Inspection & Admin View',
      'High-Throughput Dedicated Server-Sent Event Gateway',
      'Institutional SLA & 99.99% Uptime Guarantee',
      'Direct API Access & Exportable Data Dumps',
      'Multi-Seat License & Team Admin Controls',
    ],
    exclusiveFeatures: [
      'Full Admin Panel & Channel Scraper access',
      'Direct pipeline diagnostic telemetry',
      'Dedicated compliance audit logs',
    ],
    permissions: [
      'MARKET_RADAR',
      'CURRENCY_STRENGTH_MATRIX',
      'MACRO_NEWS_WIRE',
      'ECONOMIC_CALENDAR',
      'TRADINGVIEW_CHARTS',
      'AI_OVERVIEW_REFRESH',
      'AI_DEEP_ANALYSIS',
      'SSE_PRIORITY_STREAM',
      'PERSISTENT_WATCHLIST',
      'CUSTOM_TELEGRAM_SCRAPER',
      'ADMIN_SYSTEM_PANEL',
      'API_DATA_EXPORT',
    ],
    limits: {
      watchlistLimit: 500,
      aiGenerationsPerDay: 500,
      streamRateHz: 50,
      customTelegramChannels: 25,
    },
  },
};

/**
 * Returns effective plan for a user
 * Note: An ADMIN role always possesses all permissions and maximum limits,
 * but their subscription plan is maintained separately.
 */
export function getEffectivePlan(planId?: SubscriptionPlanId): PlanDefinition {
  if (planId && PLANS[planId]) {
    return PLANS[planId];
  }
  return PLANS.FREE;
}

/**
 * Checks if a user has access to a specific feature permission
 */
export function hasPermission(
  user: { role?: string; plan?: SubscriptionPlanId; subscription_status?: string } | null | undefined,
  permission: FeaturePermission
): boolean {
  // All features unlocked
  return true;
}

/**
 * Returns effective limits for a user
 */
export function getUserLimits(
  user: { role?: string; plan?: SubscriptionPlanId } | null | undefined
): PlanLimits {
  // Grant generous institutional limits to all users
  return PLANS.INSTITUTIONAL.limits;
}
