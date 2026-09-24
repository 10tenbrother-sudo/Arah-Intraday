import React, { useMemo } from 'react';
import { ArahMarketTodayData, CurrencyStrength, MarketPrice } from '../types';
import { Compass, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ExecutiveMarketBriefProps {
  strengths: CurrencyStrength[];
  prices: MarketPrice[];
  globalRegime: ArahMarketTodayData['globalRegime'] | null;
  onOpenChart: (symbol: string) => void;
  onNavigateMarketBias: () => void;
}

export const ExecutiveMarketBrief: React.FC<ExecutiveMarketBriefProps> = ({
  strengths,
  prices,
  globalRegime,
  onOpenChart,
  onNavigateMarketBias,
}) => {
  // Price lookup
  const priceMap = useMemo(() => {
    const map = new Map<string, MarketPrice>();
    prices.forEach(p => map.set(p.symbol.toUpperCase(), p));
    return map;
  }, [prices]);

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

    // Regime is owned by the server dossier; deriving a second one here let
    // Overview and Market Bias publish conflicting labels for the same market.
    const regimeTitle = globalRegime?.title ?? 'AWAITING REGIME DATA';
    const regimeBadgeClass = globalRegime
      ? globalRegime.riskScore < 0
        ? 'badge-bearish'
        : 'badge-bullish'
      : 'badge-warning';

    const regimeRead = globalRegime ? regimeTitle.toLowerCase() : 'undetermined';
    const summaryText = `Markets are trading in a ${regimeRead} regime. Wall Street is led by the US100 ${us100Change >= 0 ? 'higher' : 'lower'} at ${us100Change >= 0 ? '+' : ''}${us100Change.toFixed(2)}%, with the US 10Y yield ${us10yChange >= 0 ? 'up' : 'down'} at ${us10yPrice.toFixed(3)}%. In FX, ${strongest.currency} carries the widest dispersion (+${strongest.strength_score.toFixed(1)}pt) while ${weakest.currency} is the weakest leg (${weakest.strength_score.toFixed(1)}pt). Gold (XAU/USD) is trading ${goldChange >= 0 ? 'higher' : 'lower'} at $${Math.round(goldPrice)}.`;

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
  }, [strengths, priceMap, globalRegime]);


  return (
    <div className="terminal-panel p-4 space-y-4 font-sans" id="market-summary-and-entry-brief">
      {/* Header: Title & Regime Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="metadata-label text-[10px] text-[var(--accent)] font-mono">
              SYNTHESIS & MACRO DIRECTIVES
            </span>
            <span className="text-[var(--border-subtle)]">·</span>
            <h2 className="text-xs sm:text-sm font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider">
              MARKET CONCLUSION & MACRO SUMMARY
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans leading-relaxed">
            Consensus macro telemetry from currency divergence, the yield curve anchor, and asset sentiment. Per-pair entry plans live in Market Bias.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          <span className="text-[10px] text-[var(--text-muted)]">REGIME:</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${marketSynthesis.regimeBadgeClass}`}>
            {marketSynthesis.regimeTitle}
          </span>
          <button
            onClick={onNavigateMarketBias}
            className="ml-1 px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10.5px] font-semibold transition cursor-pointer"
          >
            ENTRY PLANS →
          </button>
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
                <strong className="text-[var(--text-primary)] font-semibold">Tech Leadership:</strong> Nasdaq (US100) is {marketSynthesis.us100Change >= 0 ? 'holding gains' : 'under pressure'} at {marketSynthesis.us100Change >= 0 ? '+' : ''}{marketSynthesis.us100Change.toFixed(2)}%, {marketSynthesis.us100Change >= 0 ? 'supported by corporate capex flows' : 'as high-multiple tech de-rates against the yield backdrop'}.
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
                <strong className="text-[var(--text-primary)] font-semibold">Treasury Yield Anchor:</strong> US10Y at {marketSynthesis.us10yPrice.toFixed(3)}% is {marketSynthesis.us10yChange >= 0 ? 'rising, tightening valuation support for risk assets' : 'easing, loosening the discount-rate pressure on risk assets'}.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t text-[11px] text-[var(--text-muted)] flex items-center justify-between font-mono" style={{ borderColor: 'var(--border-hairline)' }}>
            <span>BIAS FOCUS:</span>
            <span className={`font-bold ${globalRegime && globalRegime.riskScore < 0 ? 'text-[var(--bearish)]' : 'text-[var(--bullish)]'}`}>
              {globalRegime && globalRegime.riskScore < 0
                ? `Defensive ${marketSynthesis.strongest.currency} vs ${marketSynthesis.weakest.currency}`
                : `Long ${marketSynthesis.strongest.currency} vs ${marketSynthesis.weakest.currency}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
