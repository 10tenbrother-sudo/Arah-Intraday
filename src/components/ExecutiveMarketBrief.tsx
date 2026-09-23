import React, { useState, useMemo } from 'react';
import {
  CurrencyStrength,
  IntradayAssetBias,
  TodayCatalyst,
  MarketPrice,
  EconomicEvent,
} from '../types';
import {
  Sparkles,
  TrendingUp,
  Compass,
  Zap,
  Target,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Activity,
} from 'lucide-react';
import { getCurrencyFlagUrl } from '../lib/assets';

interface ExecutiveMarketBriefProps {
  strengths: CurrencyStrength[];
  intradayMap: IntradayAssetBias[];
  todayCatalysts: TodayCatalyst[];
  prices: MarketPrice[];
  calendar: EconomicEvent[];
  onOpenChart: (symbol: string) => void;
  onSelectSymbol: (symbol: string | null) => void;
}

interface TradeSuggestion {
  id: string;
  symbol: string;
  name: string;
  category: 'FX_CROSS' | 'FX_MAJOR' | 'COMMODITY' | 'INDEX' | 'BOND';
  action: 'STRONG_BUY' | 'BUY' | 'STRONG_SELL' | 'SELL' | 'AVOID_CHOP';
  actionLabel: string;
  biasConfidence: number;
  deltaOrScore?: string;
  tradeStyle: string;
  entryZone: string;
  invalidationLevel: string;
  targetProjection: string;
  fundamentalDriver: string;
  riskNote: string;
  tier: 'PRIME_A' | 'HIGH' | 'SPECULATIVE' | 'AVOID';
}

export const ExecutiveMarketBrief: React.FC<ExecutiveMarketBriefProps> = ({
  strengths,
  intradayMap,
  todayCatalysts,
  prices,
  calendar,
  onOpenChart,
  onSelectSymbol,
}) => {
  const [filterCategory, setFilterCategory] = useState<
    'ALL' | 'PRIME' | 'INDICES' | 'COMMODITIES' | 'BONDS' | 'CROSSES' | 'MAJORS' | 'AVOID'
  >('ALL');

  // Currency score lookup
  const curScoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    strengths.forEach(s => {
      map[s.currency] = s.strength_score;
    });
    return map;
  }, [strengths]);

  // Price lookup
  const priceMap = useMemo(() => {
    const map = new Map<string, MarketPrice>();
    prices.forEach(p => map.set(p.symbol.toUpperCase(), p));
    return map;
  }, [prices]);

  // Intraday bias lookup
  const biasMap = useMemo(() => {
    const map = new Map<string, IntradayAssetBias>();
    intradayMap.forEach(item => map.set(item.symbol.toUpperCase(), item));
    return map;
  }, [intradayMap]);

  // 1. DYNAMIC MARKET SYNTHESIS CALCULATION
  const marketSynthesis = useMemo(() => {
    const sortedStrengths = [...strengths].sort((a, b) => b.strength_score - a.strength_score);
    const strongest = sortedStrengths[0] || { currency: 'USD', strength_score: 7.8 };
    const weakest = sortedStrengths[sortedStrengths.length - 1] || { currency: 'JPY', strength_score: 2.1 };

    const us100Price = priceMap.get('US100')?.price || 23421;
    const us100Change = priceMap.get('US100')?.change_24h_pct || 0.41;

    const goldPrice = priceMap.get('XAUUSD')?.price || 2654.8;
    const goldChange = priceMap.get('XAUUSD')?.change_24h_pct || 0.73;

    const dxyPrice = priceMap.get('USD')?.price || 101.24;
    const dxyChange = priceMap.get('USD')?.change_24h_pct || 0.18;

    const us10yPrice = priceMap.get('US10Y')?.price || 4.085;
    const us10yChange = priceMap.get('US10Y')?.change_24h_pct || -0.32;

    const bullishCount = intradayMap.filter(a => a.overall_bias === 'BULLISH').length;
    const bearishCount = intradayMap.filter(a => a.overall_bias === 'BEARISH').length;

    let regimeTitle = 'BALANCED ROTATION';
    let regimeBadgeClass = 'badge-warning';

    if (bullishCount >= 7) {
      regimeTitle = 'RISK-ON DOMINANT';
      regimeBadgeClass = 'badge-bullish';
    } else if (bearishCount >= 7) {
      regimeTitle = 'DEFENSIVE / RISK-OFF';
      regimeBadgeClass = 'badge-bearish';
    }

    const summaryText = `Markets are trading in a ${regimeTitle} regime. Wall Street is led by the US100 on technology earnings momentum, with the US 10Y yield steady near ${us10yPrice.toFixed(3)}%. In FX, ${strongest.currency} carries the widest dispersion (+${strongest.strength_score.toFixed(1)}pt) while ${weakest.currency} is the weakest leg (${weakest.strength_score.toFixed(1)}pt). Gold (XAU/USD) remains bid as a macro hedge above $${Math.round(goldPrice)}.`;

    return {
      strongest,
      weakest,
      us100Price,
      us100Change,
      goldPrice,
      goldChange,
      dxyPrice,
      dxyChange,
      us10yPrice,
      us10yChange,
      regimeTitle,
      regimeBadgeClass,
      summaryText,
    };
  }, [strengths, priceMap, intradayMap]);

  // 2. PAIR ENTRY OPPORTUNITIES CALCULATION
  const tradeSuggestions = useMemo(() => {
    const list: TradeSuggestion[] = [];

    const currencyPairs = [
      {
        symbol: 'USDJPY',
        base: 'USD',
        quote: 'JPY',
        category: 'FX_MAJOR' as const,
        name: 'US Dollar / Japanese Yen',
        catalyst: 'US-Japan yield spread and Fed-BoJ policy divergence',
        entryLogic: 'Pullback to M15 EMA21 or H1 support',
        invalidation: 'Break below pivot support',
        target: 'Intraday swing-high resistance',
      },
      {
        symbol: 'EURUSD',
        base: 'EUR',
        quote: 'USD',
        category: 'FX_MAJOR' as const,
        name: 'Euro / US Dollar',
        catalyst: 'ECB easing expectations against US growth resilience',
        entryLogic: 'Sell the rally into H1 supply',
        invalidation: 'H1 close above supply resistance',
        target: 'Prior swing-low liquidity',
      },
      {
        symbol: 'GBPUSD',
        base: 'GBP',
        quote: 'USD',
        category: 'FX_MAJOR' as const,
        name: 'British Pound / US Dollar',
        catalyst: 'BoE inflation data and Bank of England rate differential',
        entryLogic: 'Rejection confirmation at H1 order block',
        invalidation: 'Break of H1 swing structure',
        target: 'H4 discount demand zone',
      },
      {
        symbol: 'AUDJPY',
        base: 'AUD',
        quote: 'JPY',
        category: 'FX_CROSS' as const,
        name: 'Australian Dollar / Japanese Yen',
        catalyst: 'Risk sentiment barometer and carry-trade appetite',
        entryLogic: 'Long on intraday pivot retest',
        invalidation: 'Break of M30 support structure',
        target: 'Daily R1 / R2 resistance',
      },
      {
        symbol: 'EURJPY',
        base: 'EUR',
        quote: 'JPY',
        category: 'FX_CROSS' as const,
        name: 'Euro / Japanese Yen',
        catalyst: 'European versus Japanese yield divergence',
        entryLogic: 'Volume-confirmed breakout in the London session',
        invalidation: 'False breakout reversal',
        target: 'Prior session high',
      },
      {
        symbol: 'GBPJPY',
        base: 'GBP',
        quote: 'JPY',
        category: 'FX_CROSS' as const,
        name: 'British Pound / Japanese Yen',
        catalyst: 'London-session volatility momentum and carry flow',
        entryLogic: 'Dip buying at H1 EMA50',
        invalidation: 'Break of 40-pip swing low',
        target: 'Yearly / weekly high',
      },
      {
        symbol: 'USDCHF',
        base: 'USD',
        quote: 'CHF',
        category: 'FX_MAJOR' as const,
        name: 'US Dollar / Swiss Franc',
        catalyst: 'SNB easing against US yields',
        entryLogic: 'Buy limit in H1 discount zone',
        invalidation: 'Break of SNB support',
        target: '0.9000+ supply zone',
      },
    ];

    for (const p of currencyPairs) {
      const baseScore = curScoreMap[p.base] ?? 5.0;
      const quoteScore = curScoreMap[p.quote] ?? 5.0;
      const delta = baseScore - quoteScore;
      const absDelta = Math.abs(delta);

      let action: TradeSuggestion['action'] = 'AVOID_CHOP';
      let actionLabel = 'AVOID (FLAT BASKET)';
      let tier: TradeSuggestion['tier'] = 'AVOID';
      let tradeStyle = 'Sideways';

      if (delta >= 3.0) {
        action = 'STRONG_BUY';
        actionLabel = 'STRONG BUY (LONG)';
        tier = 'PRIME_A';
        tradeStyle = 'Strong Trend Flow';
      } else if (delta >= 1.6) {
        action = 'BUY';
        actionLabel = 'BUY ON PULLBACK';
        tier = 'HIGH';
        tradeStyle = 'Dip Buying';
      } else if (delta <= -3.0) {
        action = 'STRONG_SELL';
        actionLabel = 'STRONG SELL (SHORT)';
        tier = 'PRIME_A';
        tradeStyle = 'Strong Downtrend Flow';
      } else if (delta <= -1.6) {
        action = 'SELL';
        actionLabel = 'SELL ON RALLY';
        tier = 'HIGH';
        tradeStyle = 'Rally Shorting';
      }

      const confidence = Math.min(94, Math.max(50, Math.round(55 + absDelta * 11)));

      list.push({
        id: p.symbol,
        symbol: p.symbol,
        name: p.name,
        category: p.category,
        action,
        actionLabel,
        biasConfidence: confidence,
        deltaOrScore: `Δ ${delta > 0 ? '+' : ''}${delta.toFixed(1)}pt`,
        tradeStyle,
        entryZone: p.entryLogic,
        invalidationLevel: p.invalidation,
        targetProjection: p.target,
        fundamentalDriver: p.catalyst,
        riskNote: tier === 'PRIME_A' ? 'High conviction intermarket alignment' : 'Watch high-impact calendar releases',
        tier,
      });
    }

    // Gold Setup
    const goldPrice = priceMap.get('XAUUSD');
    const goldBias = biasMap.get('XAUUSD');
    if (goldPrice) {
      const isBull = (goldBias?.overall_bias ?? 'BULLISH') === 'BULLISH';
      list.push({
        id: 'XAUUSD',
        symbol: 'XAUUSD',
        name: 'Gold / US Dollar',
        category: 'COMMODITY',
        action: isBull ? 'STRONG_BUY' : 'SELL',
        actionLabel: isBull ? 'STRONG BUY (BUY THE DIP)' : 'SELL ON RALLY',
        biasConfidence: goldBias?.confidence ?? 78,
        deltaOrScore: `Bias: ${goldBias?.overall_bias ?? 'BULLISH'} (${goldPrice.change_24h_pct >= 0 ? '+' : ''}${goldPrice.change_24h_pct.toFixed(2)}%)`,
        tradeStyle: 'Safe-Haven Momentum / Dip Buying',
        entryZone: `Demand zone $${(goldPrice.price - 8.5).toFixed(1)} - $${(goldPrice.price - 3.0).toFixed(1)}`,
        invalidationLevel: goldBias?.conditions_to_change_bias || `Break below $${(goldPrice.price - 22.0).toFixed(1)}`,
        targetProjection: `$${(goldPrice.price + 25.0).toFixed(1)} / ATH Resistance`,
        fundamentalDriver: goldBias?.top_drivers?.[0] || 'Geopolitical hedge & real yield pressure.',
        riskNote: 'High volatility during New York opening (19:30 WIB)',
        tier: 'PRIME_A',
      });
    }

    // US100 Setup
    const us100Price = priceMap.get('US100');
    const us100Bias = biasMap.get('US100');
    if (us100Price) {
      const isBull = (us100Bias?.overall_bias ?? 'BULLISH') === 'BULLISH' || us100Price.change_24h_pct >= 0;
      list.push({
        id: 'US100',
        symbol: 'US100',
        name: 'Nasdaq 100 Tech Index',
        category: 'INDEX',
        action: isBull ? 'STRONG_BUY' : 'BUY',
        actionLabel: isBull ? 'STRONG BUY (MOMENTUM LONG)' : 'BUY ON PULLBACK',
        biasConfidence: Math.max(86, us100Bias?.confidence ?? 88),
        deltaOrScore: `Tech Bias: ${us100Bias?.overall_bias ?? 'BULLISH'} (${us100Price.change_24h_pct >= 0 ? '+' : ''}${us100Price.change_24h_pct.toFixed(2)}%)`,
        tradeStyle: 'Tech Super-Trend & Pullback Dip',
        entryZone: `Discount H1 demand ${Math.round(us100Price.price - 85)} - ${Math.round(us100Price.price - 25)}`,
        invalidationLevel: `Breakdown under support ${Math.round(us100Price.price - 190)}`,
        targetProjection: `ATH expansion ${Math.round(us100Price.price + 260)}+ (RR 1:2.8)`,
        fundamentalDriver: 'AI hyperscaler capex & stable semiconductor revenues.',
        riskNote: 'High volume spike at Wall Street opening (20:30 WIB)',
        tier: 'PRIME_A',
      });
    }

    return list.sort((a, b) => {
      const order = { PRIME_A: 1, HIGH: 2, SPECULATIVE: 3, AVOID: 4 };
      return order[a.tier] - order[b.tier];
    });
  }, [curScoreMap, biasMap, priceMap]);

  // Filtered trade list
  const filteredSuggestions = useMemo(() => {
    if (filterCategory === 'PRIME') {
      return tradeSuggestions.filter(t => t.tier === 'PRIME_A');
    }
    if (filterCategory === 'INDICES') {
      return tradeSuggestions.filter(t => t.category === 'INDEX');
    }
    if (filterCategory === 'COMMODITIES') {
      return tradeSuggestions.filter(t => t.category === 'COMMODITY');
    }
    if (filterCategory === 'BONDS') {
      return tradeSuggestions.filter(t => t.category === 'BOND');
    }
    if (filterCategory === 'MAJORS') {
      return tradeSuggestions.filter(t => t.category === 'FX_MAJOR' && t.tier !== 'AVOID');
    }
    if (filterCategory === 'CROSSES') {
      return tradeSuggestions.filter(t => t.category === 'FX_CROSS' && t.tier !== 'AVOID');
    }
    if (filterCategory === 'AVOID') {
      return tradeSuggestions.filter(t => t.tier === 'AVOID');
    }
    return tradeSuggestions;
  }, [tradeSuggestions, filterCategory]);

  return (
    <div className="terminal-panel p-4 space-y-4 font-sans" id="market-summary-and-entry-brief">
      {/* Header: Title & Regime Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="metadata-label text-[10px] text-[var(--accent)] font-mono">
              SYNTHESIS & TRADE DIRECTIVES
            </span>
            <span className="text-[var(--border-subtle)]">·</span>
            <h2 className="text-xs sm:text-sm font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider">
              MARKET CONCLUSION & RECOMMENDED ENTRY SETUPS
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans leading-relaxed">
            Consensus macro telemetry and high-probability trade setups ranked by currency divergence, yield curve anchor, and asset sentiment.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          <span className="text-[10px] text-[var(--text-muted)]">REGIME:</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${marketSynthesis.regimeBadgeClass}`}>
            {marketSynthesis.regimeTitle}
          </span>
        </div>
      </div>

      {/* Part 1: Narrative Conclusion & Key Catalyst Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Narrative Box (7 Columns) */}
        <div className="lg:col-span-7 terminal-panel-alt p-3.5 space-y-2.5 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="metadata-label text-[10px] text-[var(--text-primary)] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>EXECUTIVE MACRO SUMMARY</span>
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              REAL-TIME WIB
            </span>
          </div>

          <p className="text-xs sm:text-[13px] text-[var(--text-primary)] leading-relaxed font-sans">
            {marketSynthesis.summaryText}
          </p>

          {/* Quick Snapshot Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t font-mono text-xs tabular-nums" style={{ borderColor: 'var(--border-hairline)' }}>
            <div className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <span className="text-[9.5px] text-[var(--text-muted)] block">LEAD (STRONG)</span>
              <span className="font-bold text-[var(--bullish)] flex items-center gap-1 mt-0.5">
                <ArrowUpRight className="w-3 h-3" />
                {marketSynthesis.strongest.currency} ({marketSynthesis.strongest.strength_score.toFixed(1)})
              </span>
            </div>

            <div className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <span className="text-[9.5px] text-[var(--text-muted)] block">LAG (WEAK)</span>
              <span className="font-bold text-[var(--bearish)] flex items-center gap-1 mt-0.5">
                <ArrowDownRight className="w-3 h-3" />
                {marketSynthesis.weakest.currency} ({marketSynthesis.weakest.strength_score.toFixed(1)})
              </span>
            </div>

            <div
              onClick={() => onOpenChart('US100')}
              className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition cursor-pointer"
            >
              <span className="text-[9.5px] text-[var(--text-muted)] block">NASDAQ (US100)</span>
              <span className={`font-bold mt-0.5 block ${marketSynthesis.us100Change >= 0 ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`}>
                {marketSynthesis.us100Price.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({marketSynthesis.us100Change >= 0 ? '+' : ''}{marketSynthesis.us100Change.toFixed(2)}%)
              </span>
            </div>

            <div
              onClick={() => onOpenChart('XAUUSD')}
              className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition cursor-pointer"
            >
              <span className="text-[9.5px] text-[var(--text-muted)] block">GOLD (XAU)</span>
              <span className={`font-bold mt-0.5 block ${marketSynthesis.goldChange >= 0 ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`}>
                ${marketSynthesis.goldPrice.toFixed(1)} ({marketSynthesis.goldChange >= 0 ? '+' : ''}{marketSynthesis.goldChange.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* 3 Drivers Box (5 Columns) */}
        <div className="lg:col-span-5 terminal-panel-alt p-3.5 flex flex-col justify-between space-y-2 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
            <span className="metadata-label text-[10px] text-[var(--text-primary)] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>KEY INTRADAY CATALYSTS</span>
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">DRIVER STACK</span>
          </div>

          <div className="space-y-2 text-xs font-sans">
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded font-mono font-bold text-[10px] bg-[var(--bg-surface-elevated)] text-[var(--accent)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <p className="text-[var(--text-secondary)] leading-snug">
                <strong className="text-[var(--text-primary)] font-semibold">Tech Leadership:</strong> Nasdaq (US100) continues expanding high-momentum demand supported by corporate capex.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded font-mono font-bold text-[10px] bg-[var(--bg-surface-elevated)] text-[var(--accent)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <p className="text-[var(--text-secondary)] leading-snug">
                <strong className="text-[var(--text-primary)] font-semibold">G8 Divergence Spread:</strong> {marketSynthesis.strongest.currency} vs {marketSynthesis.weakest.currency} delta stands at {(marketSynthesis.strongest.strength_score - marketSynthesis.weakest.strength_score).toFixed(1)} points.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded font-mono font-bold text-[10px] bg-[var(--bg-surface-elevated)] text-[var(--accent)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <p className="text-[var(--text-secondary)] leading-snug">
                <strong className="text-[var(--text-primary)] font-semibold">Treasury Yield Anchor:</strong> US10Y stability around {marketSynthesis.us10yPrice.toFixed(3)}% provides valuation stability for risk assets.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t text-[11px] text-[var(--text-muted)] flex items-center justify-between font-mono" style={{ borderColor: 'var(--border-hairline)' }}>
            <span>BIAS FOCUS:</span>
            <span className="font-bold text-[var(--bullish)]">Long US100 & G8 Divergence Pairs</span>
          </div>
        </div>
      </div>

      {/* Part 2: Trade Opportunities Grid */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="metadata-label text-[11px] text-[var(--text-primary)]">
              HIGH-PROBABILITY TRADE SETUPS ({filteredSuggestions.length})
            </h3>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-1 border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] p-0.5 rounded text-[10.5px] font-mono shrink-0 overflow-x-auto">
            {(['ALL', 'PRIME', 'INDICES', 'COMMODITIES', 'CROSSES', 'MAJORS', 'AVOID'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat as any)}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Setups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSuggestions.map(item => {
            const isPrime = item.tier === 'PRIME_A';
            const isBuy = item.action.includes('BUY');
            const isSell = item.action.includes('SELL');
            const isAvoid = item.action === 'AVOID_CHOP';

            return (
              <div
                key={item.id}
                className={`terminal-panel p-3.5 flex flex-col justify-between space-y-3 transition ${
                  isPrime ? 'border-[var(--active-border)] bg-[var(--active-bg)]' : ''
                }`}
              >
                <div>
                  {/* Card Header: Symbol & Flags */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {item.symbol.length === 6 && !item.symbol.startsWith('US') && !item.symbol.startsWith('XA') ? (
                        <div className="flex items-center -space-x-1 shrink-0">
                          <img
                            src={getCurrencyFlagUrl(item.symbol.slice(0, 3))}
                            alt={item.symbol.slice(0, 3)}
                            referrerPolicy="no-referrer"
                            className="w-4 h-3 object-cover rounded-xs border border-[var(--border-subtle)]"
                          />
                          <img
                            src={getCurrencyFlagUrl(item.symbol.slice(3, 6))}
                            alt={item.symbol.slice(3, 6)}
                            referrerPolicy="no-referrer"
                            className="w-4 h-3 object-cover rounded-xs border border-[var(--border-subtle)]"
                          />
                        </div>
                      ) : (
                        <span className="w-5 h-4 rounded text-[9px] font-mono font-bold flex items-center justify-center border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[var(--text-primary)]">
                          {item.symbol.slice(0, 2)}
                        </span>
                      )}

                      <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                        {item.symbol}
                      </span>

                      {isPrime && (
                        <span className="text-[8.5px] font-mono font-bold px-1 py-0 rounded badge-accent">
                          PRIME A+
                        </span>
                      )}
                    </div>

                    <div className="text-right font-mono tabular-nums">
                      <span className="text-[11px] font-bold text-[var(--text-primary)]">
                        {item.biasConfidence}% CONVICTION
                      </span>
                    </div>
                  </div>

                  {/* Name & Delta */}
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono pb-2 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                    <span className="truncate pr-2 font-sans">{item.name}</span>
                    <span className="shrink-0">{item.deltaOrScore}</span>
                  </div>

                  {/* Action Directive Strip */}
                  <div className="my-2.5">
                    <div
                      className={`py-1.5 px-2.5 rounded text-xs font-mono font-bold flex items-center justify-between border ${
                        isBuy
                          ? 'badge-bullish'
                          : isSell
                          ? 'badge-bearish'
                          : 'badge-warning'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {isBuy ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : isSell ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                        <span>{item.actionLabel}</span>
                      </span>
                      <span className="text-[9.5px] font-normal opacity-80">
                        {item.tradeStyle}
                      </span>
                    </div>
                  </div>

                  {/* Fundamental Driver */}
                  <div className="text-[11px] text-[var(--text-secondary)] font-sans p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)]">
                    <strong className="text-[var(--text-primary)] font-mono text-[10px] block uppercase tracking-wider mb-0.5">
                      RATIONALE:
                    </strong>
                    <p className="leading-snug">{item.fundamentalDriver}</p>
                  </div>
                </div>

                {/* Levels & Controls */}
                <div className="space-y-2 pt-1 font-mono text-[10px]">
                  {!isAvoid ? (
                    <div className="grid grid-cols-2 gap-1.5 p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] tabular-nums">
                      <div>
                        <span className="text-[var(--text-muted)] block">ENTRY ZONE</span>
                        <span className="text-[var(--text-primary)] font-semibold block truncate" title={item.entryZone}>
                          {item.entryZone}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block">INVALIDATION (SL)</span>
                        <span className="text-[var(--bearish)] font-semibold block truncate" title={item.invalidationLevel}>
                          {item.invalidationLevel}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[10.5px] text-[var(--warning)] font-sans">
                      Divergence near parity. Range chop expected; avoid breakout entries.
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => onOpenChart(item.symbol)}
                      className="flex-1 py-1.5 px-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-[11px] font-mono font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LineChart className="w-3 h-3 text-[var(--accent)]" />
                      <span>TRADINGVIEW CHART</span>
                    </button>
                    <button
                      onClick={() => onSelectSymbol(item.symbol)}
                      className="py-1.5 px-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-mono transition cursor-pointer"
                      title="Inspect symbol"
                    >
                      SURVEILLANCE →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
