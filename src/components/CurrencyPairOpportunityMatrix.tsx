import React, { useState, useMemo } from 'react';
import { CurrencyStrength } from '../types';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  BarChart2,
  CheckCircle2,
  XCircle,
  LineChart,
} from 'lucide-react';
import { Tooltip, MetricTooltip, MetricInfoIcon } from './Tooltip';

interface PairOpportunity {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  baseScore: number;
  quoteScore: number;
  delta: number; // base - quote
  absDelta: number;
  action: 'STRONG_BUY' | 'BUY' | 'NEUTRAL_CHOP' | 'SELL' | 'STRONG_SELL';
  tier: 'PRIME' | 'MODERATE' | 'CHOP_AVOID';
  tradeStyle: string;
  catalyst: string;
  sessionSuitability: string;
}

interface CurrencyPairOpportunityMatrixProps {
  strengths: CurrencyStrength[];
  onOpenChart?: (symbol: string) => void;
  onSelectSymbol?: (symbol: string) => void;
}

const TRADABLE_PAIRS: Array<{
  symbol: string;
  base: string;
  quote: string;
  catalyst: string;
  session: string;
}> = [
  { symbol: 'AUDCAD', base: 'AUD', quote: 'CAD', catalyst: 'RBA hawkish rate stance & iron ore/metals exports vs BoC easing cycle & crude price dynamics', session: 'Asian / New York Overlap' },
  { symbol: 'GBPJPY', base: 'GBP', quote: 'JPY', catalyst: 'BoE terminal rate resilience vs BoJ ultra-dovish yield suppression', session: 'London / Tokyo Overlap' },
  { symbol: 'AUDJPY', base: 'AUD', quote: 'JPY', catalyst: 'Commodity/Risk-on carry beta vs Yen funding liquidation', session: 'Asian / Early London' },
  { symbol: 'GBPUSD', base: 'GBP', quote: 'USD', catalyst: 'UK services inflation persistence vs softening US Treasury yields & Fed rate cut expectations', session: 'London / New York Overlap' },
  { symbol: 'EURJPY', base: 'EUR', quote: 'JPY', catalyst: 'ECB yield plateau vs negative real rate differential in Japan', session: 'London Session' },
  { symbol: 'EURUSD', base: 'EUR', quote: 'USD', catalyst: 'Eurozone industrial stabilization vs DXY dollar index consolidation', session: 'London / New York Overlap' },
  { symbol: 'AUDUSD', base: 'AUD', quote: 'USD', catalyst: 'RBA hawkish hold & commodities demand vs cooling US labor market', session: 'Asian / New York' },
  { symbol: 'NZDUSD', base: 'NZD', quote: 'USD', catalyst: 'Dairy terms-of-trade vs Fed monetary easing trajectory', session: 'Asian Session' },
  { symbol: 'USDCAD', base: 'USD', quote: 'CAD', catalyst: 'Crude oil correlation vs BoC interest rate easing cycle', session: 'New York Session' },
  { symbol: 'USDCHF', base: 'USD', quote: 'CHF', catalyst: 'SNB negative intervention bias vs US dollar safe-haven yields', session: 'European / US Session' },
  { symbol: 'EURGBP', base: 'EUR', quote: 'GBP', catalyst: 'UK vs Eurozone gilt spread and economic momentum differential', session: 'London Session' },
  { symbol: 'CADJPY', base: 'CAD', quote: 'JPY', catalyst: 'Energy export terms vs Japanese trade deficit flow', session: 'Tokyo / NY Session' },
  { symbol: 'CHFJPY', base: 'CHF', quote: 'JPY', catalyst: 'Swiss Franc defensive appreciation vs weak Yen carry flows', session: 'European Session' },
  { symbol: 'NZDCAD', base: 'NZD', quote: 'CAD', catalyst: 'Cross-commodity parity with minimal macro divergence', session: 'Pacific Session' },
  { symbol: 'EURAUD', base: 'EUR', quote: 'AUD', catalyst: 'Eurozone manufacturing drag vs Australian resource export terms', session: 'London / Asian' },
  { symbol: 'GBPAUD', base: 'GBP', quote: 'AUD', catalyst: 'BoE services CPI momentum vs Australian mining risk beta', session: 'London Session' },
  { symbol: 'AUDNZD', base: 'AUD', quote: 'NZD', catalyst: 'Trans-Tasman monetary divergence (RBA rate pause vs RBNZ easing)', session: 'Asian Session' },
  { symbol: 'AUDCHF', base: 'AUD', quote: 'CHF', catalyst: 'Commodity carry appreciation vs Swiss Franc safe haven positioning', session: 'Asian / European' },
  { symbol: 'CADCHF', base: 'CAD', quote: 'CHF', catalyst: 'Oil revenue terms-of-trade vs Swiss Franc negative interest rate sensitivity', session: 'NY / European' },
];

export const CurrencyPairOpportunityMatrix: React.FC<CurrencyPairOpportunityMatrixProps> = React.memo(({
  strengths,
  onOpenChart,
  onSelectSymbol,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PRIME_LONGS' | 'PRIME_SHORTS' | 'AVOID'>('ALL');

  // Compute map of currency scores
  const scoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of strengths) {
      map[s.currency] = s.strength_score;
    }
    return map;
  }, [strengths]);

  // Compute live pair rankings with divergence deltas
  const pairOpportunities = useMemo<PairOpportunity[]>(() => {
    return TRADABLE_PAIRS.map(p => {
      const baseScore = scoreMap[p.base] ?? 5.0;
      const quoteScore = scoreMap[p.quote] ?? 5.0;
      const delta = parseFloat((baseScore - quoteScore).toFixed(1));
      const absDelta = Math.abs(delta);

      let action: PairOpportunity['action'] = 'NEUTRAL_CHOP';
      let tier: PairOpportunity['tier'] = 'CHOP_AVOID';
      let tradeStyle = 'Rangebound / Scalp Only';

      if (delta >= 4.0) {
        action = 'STRONG_BUY';
        tier = 'PRIME';
        tradeStyle = 'Trend Follow / Buy Dips';
      } else if (delta >= 2.0) {
        action = 'BUY';
        tier = 'MODERATE';
        tradeStyle = 'Bullish Continuation';
      } else if (delta <= -4.0) {
        action = 'STRONG_SELL';
        tier = 'PRIME';
        tradeStyle = 'Trend Follow / Sell Rallies';
      } else if (delta <= -2.0) {
        action = 'SELL';
        tier = 'MODERATE';
        tradeStyle = 'Bearish Continuation';
      } else {
        action = 'NEUTRAL_CHOP';
        tier = 'CHOP_AVOID';
        tradeStyle = 'High Whipsaw / Avoid Breakouts';
      }

      return {
        symbol: p.symbol,
        baseCurrency: p.base,
        quoteCurrency: p.quote,
        baseScore,
        quoteScore,
        delta,
        absDelta,
        action,
        tier,
        tradeStyle,
        catalyst: p.catalyst,
        sessionSuitability: p.session,
      };
    }).sort((a, b) => b.absDelta - a.absDelta);
  }, [scoreMap]);

  // Filter pairs according to user view
  const filteredPairs = useMemo(() => {
    if (filter === 'PRIME_LONGS') {
      return pairOpportunities.filter(p => p.delta >= 2.5);
    }
    if (filter === 'PRIME_SHORTS') {
      return pairOpportunities.filter(p => p.delta <= -2.5);
    }
    if (filter === 'AVOID') {
      return pairOpportunities.filter(p => p.absDelta < 1.8);
    }
    return pairOpportunities;
  }, [pairOpportunities, filter]);

  // Top prime opportunities
  const topLong = pairOpportunities.find(p => p.delta > 3.0);
  const topShort = pairOpportunities.find(p => p.delta < -3.0);
  const topAvoid = pairOpportunities.find(p => p.absDelta < 1.2);

  return (
    <div className="terminal-panel p-4 sm:p-5 space-y-4 font-sans" id="currency-pair-opportunities">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--accent)] rounded-xs" />
            <h3 className="section-title text-xs sm:text-sm text-[var(--text-primary)]">
              CURRENCY PAIR OPPORTUNITY MATRIX
            </h3>
            <MetricInfoIcon term="PRIME_PAIR" position="bottom" />
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
            High-probability pairs ranked by central-bank score divergence and macro delta.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-1 p-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-xs font-mono shrink-0">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-xs transition cursor-pointer text-[11px] font-semibold ${
              filter === 'ALL'
                ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            ALL PAIRS
          </button>
          <button
            onClick={() => setFilter('PRIME_LONGS')}
            className={`px-2.5 py-1 rounded-xs transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold ${
              filter === 'PRIME_LONGS'
                ? 'bg-[var(--bullish)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--bullish)]'
            }`}
          >
            <ArrowUpRight className="w-3 h-3" />
            <span>TOP LONGS</span>
          </button>
          <button
            onClick={() => setFilter('PRIME_SHORTS')}
            className={`px-2.5 py-1 rounded-xs transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold ${
              filter === 'PRIME_SHORTS'
                ? 'bg-[var(--bearish)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--bearish)]'
            }`}
          >
            <ArrowDownRight className="w-3 h-3" />
            <span>TOP SHORTS</span>
          </button>
          <MetricTooltip term="CHOP_AVOID" underline={false}>
            <button
              onClick={() => setFilter('AVOID')}
              className={`px-2.5 py-1 rounded-xs transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold ${
                filter === 'AVOID'
                  ? 'bg-[var(--warning)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--warning)]'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>CHOP / AVOID</span>
            </button>
          </MetricTooltip>
        </div>
      </div>

      {/* Top 3 Executive Decision Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Prime Long */}
        {topLong && (
          <div className="p-3.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] font-mono border-l-2" style={{ borderLeftColor: 'var(--bullish)' }}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="metadata-label text-[var(--bullish)] flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PRIME LONG BIAS
              </span>
              <span className="badge-bullish text-xs tabular-nums font-bold">+{topLong.delta} DELTA</span>
            </div>
            <div className="text-base font-bold text-[var(--text-primary)] mt-1.5 flex items-baseline gap-2">
              <span className="font-mono tracking-tight">{topLong.symbol}</span>
              <span className="text-xs font-normal text-[var(--text-muted)]">
                ({topLong.baseCurrency} {topLong.baseScore} vs {topLong.quoteCurrency} {topLong.quoteScore})
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-sans mt-2 leading-relaxed">
              {topLong.catalyst}
            </p>
            <div className="mt-2.5 pt-2 border-t text-[10.5px] text-[var(--bullish)] font-mono flex items-center justify-between" style={{ borderColor: 'var(--border-hairline)' }}>
              <span>STRATEGY: Buy Dips / Trend</span>
              <span className="text-[var(--text-muted)]">{topLong.sessionSuitability}</span>
            </div>
          </div>
        )}

        {/* Second Prime Opportunity (Next High Divergence) */}
        {pairOpportunities[1] && pairOpportunities[1] !== topLong && (
          <div className="p-3.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] font-mono border-l-2" style={{ borderLeftColor: 'var(--accent)' }}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="metadata-label text-[var(--accent)] flex items-center gap-1 font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                HIGH DIVERGENCE #2
              </span>
              <span className="badge-neutral text-xs tabular-nums font-bold">
                {pairOpportunities[1].delta > 0 ? `+${pairOpportunities[1].delta}` : pairOpportunities[1].delta} DELTA
              </span>
            </div>
            <div className="text-base font-bold text-[var(--text-primary)] mt-1.5 flex items-baseline gap-2">
              <span className="font-mono tracking-tight">{pairOpportunities[1].symbol}</span>
              <span className="text-xs font-normal text-[var(--text-muted)]">
                ({pairOpportunities[1].baseCurrency} {pairOpportunities[1].baseScore} vs {pairOpportunities[1].quoteCurrency} {pairOpportunities[1].quoteScore})
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-sans mt-2 leading-relaxed">
              {pairOpportunities[1].catalyst}
            </p>
            <div className="mt-2.5 pt-2 border-t text-[10.5px] text-[var(--text-primary)] font-mono flex items-center justify-between" style={{ borderColor: 'var(--border-hairline)' }}>
              <span>STRATEGY: {pairOpportunities[1].tradeStyle}</span>
              <span className="text-[var(--text-muted)]">{pairOpportunities[1].sessionSuitability}</span>
            </div>
          </div>
        )}

        {/* Avoid Chop Warning */}
        {topAvoid && (
          <div className="p-3.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] font-mono border-l-2" style={{ borderLeftColor: 'var(--warning)' }}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="metadata-label text-[var(--warning)] flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                CHOP / AVOID
              </span>
              <span className="badge-warning text-xs tabular-nums font-bold">{topAvoid.delta} DELTA</span>
            </div>
            <div className="text-base font-bold text-[var(--text-primary)] mt-1.5 flex items-baseline gap-2">
              <span className="font-mono tracking-tight">{topAvoid.symbol}</span>
              <span className="text-xs font-normal text-[var(--text-muted)]">
                ({topAvoid.baseCurrency} {topAvoid.baseScore} vs {topAvoid.quoteCurrency} {topAvoid.quoteScore})
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-sans mt-2 leading-relaxed">
              Parity between base and quote scores indicates tight consolidation, heightened whipsaw risk, and low directional follow-through.
            </p>
            <div className="mt-2.5 pt-2 border-t text-[10.5px] text-[var(--warning)] font-mono flex items-center justify-between" style={{ borderColor: 'var(--border-hairline)' }}>
              <span>ACTION: Avoid Breakouts</span>
              <span className="text-[var(--text-muted)]">Mean Revert Only</span>
            </div>
          </div>
        )}
      </div>

      {/* Ranked Pair Opportunity Table */}
      <div className="rounded border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="table-header border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <th className="py-2.5 px-3">
                  <MetricTooltip term="CCY" underline={false}>
                    <span>PAIR</span>
                  </MetricTooltip>
                </th>
                <th className="py-2.5 px-3">
                  <MetricTooltip term="OVERALL_BIAS" underline={false}>
                    <span>STATUS / BIAS</span>
                  </MetricTooltip>
                </th>
                <th className="py-2.5 px-3">
                  <MetricTooltip term="DIVERGENCE_DELTA" underline={false}>
                    <span>DIVERGENCE DELTA</span>
                  </MetricTooltip>
                </th>
                <th className="py-2.5 px-3 hidden md:table-cell">
                  <MetricTooltip term="CURRENCY_STRENGTH" underline={false}>
                    <span>BASE VS QUOTE</span>
                  </MetricTooltip>
                </th>
                <th className="py-2.5 px-3 hidden lg:table-cell">
                  <MetricTooltip term="FUNDAMENTAL_IMPLICATION" underline={false}>
                    <span>FUNDAMENTAL / MACRO DRIVER</span>
                  </MetricTooltip>
                </th>
                <th className="py-2.5 px-3 hidden sm:table-cell">
                  <MetricTooltip term="PRIME_PAIR" underline={false}>
                    <span>TRADING STYLE</span>
                  </MetricTooltip>
                </th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
              {filteredPairs.map((p) => {
                const isLong = p.delta >= 2.0;
                const isShort = p.delta <= -2.0;

                return (
                  <tr
                    key={p.symbol}
                    className="table-row transition cursor-pointer group"
                    onClick={() => onSelectSymbol?.(p.symbol)}
                  >
                    <td className="py-2 px-3 font-bold text-[var(--text-primary)]">
                      <span className="group-hover:text-[var(--accent)] transition text-sm">
                        {p.symbol}
                      </span>
                    </td>

                    <td className="py-2 px-3">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-bold border uppercase tracking-wider inline-flex items-center gap-1 ${
                          p.action === 'STRONG_BUY'
                            ? 'badge-bullish'
                            : p.action === 'BUY'
                            ? 'badge-bullish'
                            : p.action === 'STRONG_SELL'
                            ? 'badge-bearish'
                            : p.action === 'SELL'
                            ? 'badge-bearish'
                            : 'badge-warning'
                        }`}
                      >
                        {p.action === 'STRONG_BUY' && <ArrowUpRight className="w-2.5 h-2.5" />}
                        {p.action === 'STRONG_SELL' && <ArrowDownRight className="w-2.5 h-2.5" />}
                        {p.action === 'NEUTRAL_CHOP' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {p.action.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold tabular-nums text-sm ${
                            isLong ? 'text-[var(--bullish)]' : isShort ? 'text-[var(--bearish)]' : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {p.delta > 0 ? `+${p.delta}` : p.delta}
                        </span>
                        {/* Visual divergence bar */}
                        <div className="w-16 h-1.5 bg-[var(--bg-section-alt)] rounded-xs overflow-hidden border border-[var(--border-subtle)] hidden sm:block">
                          <div
                            className={`h-full ${
                              isLong ? 'bg-[var(--bullish)]' : isShort ? 'bg-[var(--bearish)]' : 'bg-[var(--warning)]'
                            }`}
                            style={{
                              width: `${Math.min(100, (p.absDelta / 8.0) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-2 px-3 hidden md:table-cell text-[var(--text-secondary)] text-[11px] tabular-nums">
                      <span className="font-semibold text-[var(--text-primary)]">{p.baseCurrency}</span> ({p.baseScore}) vs{' '}
                      <span className="font-semibold text-[var(--text-primary)]">{p.quoteCurrency}</span> ({p.quoteScore})
                    </td>

                    <td className="py-2 px-3 hidden lg:table-cell text-[var(--text-secondary)] font-sans text-xs max-w-xs truncate">
                      {p.catalyst}
                    </td>

                    <td className="py-2 px-3 hidden sm:table-cell text-[11px] text-[var(--text-muted)]">
                      {p.tradeStyle}
                    </td>

                    <td className="py-2 px-3 text-right">
                      {onOpenChart && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenChart(p.symbol);
                          }}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-section-alt)] transition cursor-pointer"
                          title={`Open ${p.symbol} Chart`}
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trader Discipline Guide */}
      <div className="p-2.5 bg-[var(--bg-section-alt)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-secondary)] font-sans flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <span>
            <strong className="text-[var(--text-primary)] font-mono">DIVERGENCE RULE:</strong> Pair highest score (&gt; 7.0) with lowest score (&lt; 3.0) for maximum trend momentum and tightest stop-loss invalidation.
          </span>
        </div>
        <span className="metadata-label text-[10px] text-[var(--accent)] shrink-0">DISPERSION ENGINE ACTIVE</span>
      </div>
    </div>
  );
});

CurrencyPairOpportunityMatrix.displayName = 'CurrencyPairOpportunityMatrix';
