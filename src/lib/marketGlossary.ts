export interface GlossaryItem {
  term: string;
  shortLabel: string;
  category: 'TIMING' | 'MACRO' | 'PRICE_ACTION' | 'CURRENCY' | 'INTELLIGENCE' | 'EXECUTION';
  definition: string;
  formulaOrInterpretation?: string;
  whyItMatters: string;
}

export const MARKET_GLOSSARY: Record<string, GlossaryItem> = {
  WIB: {
    term: 'Western Indonesian Time (WIB)',
    shortLabel: 'WIB',
    category: 'TIMING',
    definition: 'UTC+7 / Jakarta time. The desk reference clock for tracking international session opens and closes.',
    formulaOrInterpretation: 'WIB = UTC + 7h. London opens around 14:00-15:00 WIB, New York around 19:00-20:00 WIB.',
    whyItMatters: 'Lets traders track macro release schedules and liquidity overlaps without manual conversion.'
  },
  UTC: {
    term: 'Coordinated Universal Time (UTC)',
    shortLabel: 'UTC',
    category: 'TIMING',
    definition: 'The global time standard without daylight saving, used by financial institutions and banking news feeds.',
    formulaOrInterpretation: 'UTC+0. All raw data is stamped in UTC before conversion to the trader local time.',
    whyItMatters: 'Prevents timing mismatches when synchronising feeds across exchanges (Tokyo, London, New York).'
  },
  CCY: {
    term: 'Currency',
    shortLabel: 'CCY',
    category: 'CURRENCY',
    definition: 'Three-letter international standard code (ISO 4217) representing a sovereign currency (USD, EUR, GBP, JPY, AUD, CAD, CHF, NZD).',
    whyItMatters: 'Determines which asset or pair is directly affected by a given economic release.'
  },
  ACTUAL: {
    term: 'Actual Release',
    shortLabel: 'ACTUAL',
    category: 'MACRO',
    definition: 'The official figure published directly by a national statistics body (for example US BLS, BEA, Eurostat, ONS).',
    formulaOrInterpretation: 'Compared directly against consensus/forecast to compute the surprise deviation.',
    whyItMatters: 'The primary catalyst for instant re-pricing across global financial markets.'
  },
  FORECAST: {
    term: 'Consensus / Forecast',
    shortLabel: 'FORECAST',
    category: 'MACRO',
    definition: 'Median estimate from surveys of institutional economists and investment banks ahead of the official release.',
    formulaOrInterpretation: 'Market price has generally already priced this forecast in.',
    whyItMatters: 'If the actual matches the forecast exactly, the price reaction is often minimal because the market anticipated it.'
  },
  PREVIOUS: {
    term: 'Previous Reading',
    shortLabel: 'PREVIOUS',
    category: 'MACRO',
    definition: 'The figure from the prior reporting period (last month / last quarter), including the latest official revision.',
    formulaOrInterpretation: 'Used to gauge the direction of the macro trend (acceleration versus deceleration).',
    whyItMatters: 'Large revisions to the previous figure often trigger follow-through volatility even when the actual meets forecast.'
  },
  SURPRISE: {
    term: 'Macro Surprise',
    shortLabel: 'SURPRISE',
    category: 'MACRO',
    definition: 'The mathematical gap between the actual figure and the consensus/forecast.',
    formulaOrInterpretation: 'BEAT = actual above consensus. MISS = actual below consensus.',
    whyItMatters: 'The larger the surprise, the sharper the volatility and institutional order flow.'
  },
  BEAT: {
    term: 'Data Beat',
    shortLabel: 'BEAT',
    category: 'MACRO',
    definition: 'The actual economic figure came in stronger or higher than the analyst consensus.',
    whyItMatters: 'Typically strengthens the related currency (for example an NFP beat supports USD).'
  },
  MISS: {
    term: 'Data Miss',
    shortLabel: 'MISS',
    category: 'MACRO',
    definition: 'The actual economic figure came in weaker or lower than the analyst consensus.',
    whyItMatters: 'Typically weakens the related currency or raises expectations of a policy rate cut.'
  },
  IMPACT: {
    term: 'Impact Tier',
    shortLabel: 'IMPACT',
    category: 'MACRO',
    definition: 'Classification of the volatility a news release can generate in the related instruments.',
    formulaOrInterpretation: 'CRITICAL (red): CPI, NFP, policy rates. HIGH (amber): retail sales, GDP, PMI. MEDIUM (blue): trade balance.',
    whyItMatters: 'Helps traders manage position risk and avoid sudden spread widening.'
  },
  OVERALL_BIAS: {
    term: 'Intraday Market Bias',
    shortLabel: 'BIAS',
    category: 'INTELLIGENCE',
    definition: 'Synthesis of the institutional intraday trend direction: BULLISH, BEARISH, NEUTRAL (sideways), or MIXED (two-way).',
    formulaOrInterpretation: 'Derived from order flow, rate differentials, and multi-timeframe technical trend.',
    whyItMatters: 'Steers traders to trade with the dominant institutional momentum (trend following).'
  },
  CONFIDENCE: {
    term: 'Confidence Score',
    shortLabel: 'CONF',
    category: 'INTELLIGENCE',
    definition: 'The system level of confidence (0 - 100%) in the analysed bias direction.',
    formulaOrInterpretation: 'The more macro and liquidity variables agree, the higher the confidence score (>80% = high).',
    whyItMatters: 'Helps traders filter high-probability signals from speculative ones.'
  },
  CHANGE_24H: {
    term: '24H Percentage Change',
    shortLabel: '24H CHG',
    category: 'PRICE_ACTION',
    definition: 'Percentage change in the current price versus the close 24 hours earlier.',
    formulaOrInterpretation: '((Current Price - Price 24h Ago) / Price 24h Ago) * 100%',
    whyItMatters: 'Identifies which assets are seeing the strongest inflow or outflow of funds.'
  },
  RANGE_24H: {
    term: '24H Price Range (High / Low)',
    shortLabel: '24H RANGE',
    category: 'PRICE_ACTION',
    definition: 'The highest and lowest prices reached over the past 24 hours.',
    whyItMatters: 'Shows the daily volatility envelope and where price sits relative to the daily extremes.'
  },
  SPREAD: {
    term: 'Bid-Ask Spread',
    shortLabel: 'SPREAD',
    category: 'EXECUTION',
    definition: 'The difference between the highest bid and lowest ask from liquidity providers.',
    whyItMatters: 'A direct transaction cost. Around macro releases the spread can widen sharply.'
  },
  ATR: {
    term: 'Average True Range (ATR)',
    shortLabel: 'ATR',
    category: 'PRICE_ACTION',
    definition: 'A technical indicator measuring the average daily price range over a set period (usually 14 days).',
    formulaOrInterpretation: 'High ATR = highly volatile market; low ATR = consolidation / compression phase.',
    whyItMatters: 'Institutions use it to set rational stop-loss distance without getting swept by market noise.'
  },
  ADR: {
    term: 'Average Daily Range (ADR Usage)',
    shortLabel: 'ADR',
    category: 'PRICE_ACTION',
    definition: 'The percentage of the average daily range already consumed by price in the current session.',
    formulaOrInterpretation: 'If ADR usage > 90%, the asset is near exhaustion and retracement risk rises.',
    whyItMatters: 'Stops traders chasing price that is already overextended relative to its mean.'
  },
  REACTION_HORIZONS: {
    term: 'Reaction Horizons (R1M, R5M, R15M, R1H, R4H)',
    shortLabel: 'REACTION',
    category: 'MACRO',
    definition: 'The real price move recorded in the primary benchmark asset after a news release, measured over 1 minute, 5 minutes, 15 minutes, 1 hour, and 4 hours.',
    whyItMatters: 'Proves whether a release drove a sustained trend or only a momentary spike.'
  },
  PRIMARY_ASSET: {
    term: 'Primary Benchmark Asset',
    shortLabel: 'BENCHMARK',
    category: 'MACRO',
    definition: 'The most liquid instrument the system tracks to measure news transmission (for example DXY for USD, US10Y for yields, EURUSD for the Eurozone).',
    whyItMatters: 'Serves as the standard reference for cross-market correlation analysis.'
  },
  FUNDAMENTAL_IMPLICATION: {
    term: 'Fundamental Implication',
    shortLabel: 'FUNDAMENTAL',
    category: 'INTELLIGENCE',
    definition: 'Medium-term theoretical analysis of central bank policy direction (hawkish versus dovish) implied by the latest economic data.',
    whyItMatters: 'Helps traders understand the macro regime beyond short-term scalping moves.'
  },
  ACTUAL_MARKET_REACTION: {
    term: 'Actual Market Reaction',
    shortLabel: 'MARKET REACTION',
    category: 'INTELLIGENCE',
    definition: 'Empirical record of price movement, spread volatility, and liquidity absorption observed live as the event unfolded.',
    whyItMatters: 'Verifies whether the real market move matched the fundamental theory or showed a flow mismatch.'
  },
  CURRENCY_STRENGTH: {
    term: 'Currency Strength Score',
    shortLabel: 'STRENGTH',
    category: 'CURRENCY',
    definition: 'A relative strength score (0.0 - 10.0 scale) measuring one currency against the other seven majors.',
    formulaOrInterpretation: 'Score > 7.0 = strong; 4.5 - 5.5 = neutral; < 3.0 = weak.',
    whyItMatters: 'Helps pair the strongest currency against the weakest for the highest-probability trend trades.'
  },
  DIVERGENCE_DELTA: {
    term: 'Divergence Delta',
    shortLabel: 'DELTA',
    category: 'CURRENCY',
    definition: 'The mathematical gap between the base and quote currency strength scores of a pair.',
    formulaOrInterpretation: 'Delta = base score - quote score. Delta >= +4.0 (strong buy); <= -4.0 (strong sell); near 0 (chop/sideways).',
    whyItMatters: 'High-delta pairs carry the cleanest trend momentum, while low-delta pairs are prone to false breakouts.'
  },
  PRIME_PAIR: {
    term: 'Prime Trade Opportunity',
    shortLabel: 'PRIME',
    category: 'EXECUTION',
    definition: 'Pairs with high fundamental strength dispersion (delta above 4.0) that suit trend-following strategies.',
    whyItMatters: 'Saves analysis time by filtering straight to the most favourable pairs.'
  },
  CHOP_AVOID: {
    term: 'Chop / Whipsaw Avoid Tier',
    shortLabel: 'CHOP',
    category: 'EXECUTION',
    definition: 'A condition where both currencies are evenly matched, so price moves back and forth without a clear trend.',
    whyItMatters: 'Warns traders away from breakout strategies or holding swing positions in these instruments.'
  },
  SSE_STATUS: {
    term: 'Server-Sent Events (SSE) Live Feed Status',
    shortLabel: 'SSE',
    category: 'EXECUTION',
    definition: 'Connection status indicator for the real-time stream between the user interface and the backend server.',
    formulaOrInterpretation: 'LIVE (green) = streaming; RECONNECTING (amber) = restoring the connection; OFFLINE (red) = failed.',
    whyItMatters: 'Ensures the prices, spreads, and calendar a trader sees are current without delay.'
  },
  FRESHNESS: {
    term: 'Data Freshness & Provenance',
    shortLabel: 'FRESHNESS',
    category: 'INTELLIGENCE',
    definition: 'Validation of data age and official institutional sources (TradingView, FairEconomy, central banks) to guarantee metric authenticity.',
    whyItMatters: 'Ensures traders do not make financial decisions on stale data or fabricated estimates.'
  }
};
