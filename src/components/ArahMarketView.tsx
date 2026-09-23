import React, { useState, useMemo } from 'react';
import {
  ArahMarketTodayData,
  IntradayPairConfluence,
  TripleConfluenceStatus,
} from '../types';
import {
  Target,
  RefreshCw,
  Clock,
  Zap,
  AlertTriangle,
  ExternalLink,
  Flame,
  Activity,
} from 'lucide-react';
import { getCurrencyFlagUrl } from '../lib/assets';
import { EmptyState } from './shared/EmptyState';
import { LoadingState } from './shared/LoadingState';

interface ArahMarketViewProps {
  data: ArahMarketTodayData | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onOpenChart: (symbol: string) => void;
}

export const ArahMarketView: React.FC<ArahMarketViewProps> = React.memo(({
  data,
  isLoading,
  onRefresh,
  isRefreshing,
  onOpenChart,
}) => {
  const [selectedPairFilter, setSelectedPairFilter] = useState<'ALL' | 'HIGH_CONVICTION' | 'MODERATE' | 'CAUTION'>('ALL');

  const filteredPairs = useMemo(() => {
    if (!data?.pairs) return [];
    if (selectedPairFilter === 'HIGH_CONVICTION') {
      return data.pairs.filter(p => p.confluenceStatus === 'HIGH_CONVICTION');
    }
    if (selectedPairFilter === 'MODERATE') {
      return data.pairs.filter(p => p.confluenceStatus === 'MODERATE');
    }
    if (selectedPairFilter === 'CAUTION') {
      return data.pairs.filter(p => p.confluenceStatus === 'CAUTION_TRAP' || p.confluenceStatus === 'NEUTRAL_CHOP');
    }
    return data.pairs;
  }, [data, selectedPairFilter]);

  if (isLoading && !data) {
    return (
      <div className="py-12">
        <LoadingState
          variant="cards"
          count={3}
          message="Compiling Intraday Triple-Confluence Dossier..."
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-8">
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8 text-[var(--warning)]" />}
          title="Market Bias Dossier Unavailable"
          description="Synchronizing fundamental pillars, intermarket spreads, and session volume profile."
          action={{
            label: 'Refresh Dossier',
            onClick: onRefresh,
          }}
        />
      </div>
    );
  }

  const { activeSession, sessionStatusText, globalRegime, intermarketSpreads, anomalyAlerts, pairs } = data;

  const getConfluenceBadge = (status: TripleConfluenceStatus) => {
    switch (status) {
      case 'HIGH_CONVICTION':
        return {
          label: '3/3 HIGH CONVICTION',
          badgeClass: 'badge-bullish',
        };
      case 'MODERATE':
        return {
          label: '2/3 MODERATE',
          badgeClass: 'badge-neutral',
        };
      case 'CAUTION_TRAP':
        return {
          label: '1/3 TRAP RISK',
          badgeClass: 'badge-bearish',
        };
      case 'NEUTRAL_CHOP':
      default:
        return {
          label: 'CHOPPY FLOW',
          badgeClass: 'badge-neutral',
        };
    }
  };

  return (
    <div className="space-y-4" id="arah-market-dossier-view">
      {/* 1. TOP HEADER & SESSION BAROMETER */}
      <section className="terminal-panel p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="metadata-label text-[10px] text-[var(--accent)]">
                TRIPLE-CONFLUENCE DOSSIER
              </span>
              <span className="text-[var(--border-subtle)]">·</span>
              <span className="text-[10px] font-mono text-[var(--text-secondary)] font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-[var(--accent)]" />
                <span>{activeSession.toUpperCase()} SESSION ACTIVE</span>
              </span>
            </div>

            <h1 className="headline-h2 text-[var(--text-primary)]">
              MARKET BIAS & CONFLUENCE DOSSIER
            </h1>

            <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] font-sans leading-relaxed">
              {sessionStatusText} — Multi-pillar alignment combining macroeconomic catalysts, intermarket transmissions (US10Y and DXY), and intraday auction market structure.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-mono">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-7 px-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>SYNC SESSION</span>
            </button>
          </div>
        </div>

        {/* Global Regime & DXY Position Bar */}
        <div className="pt-3 border-t grid grid-cols-1 md:grid-cols-3 gap-3" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="md:col-span-2 terminal-panel-alt p-3 flex flex-col justify-between space-y-2 border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <span className="metadata-label text-[10px] text-[var(--text-muted)]">
                GLOBAL INTRADAY REGIME
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded badge-bullish">
                {globalRegime.title.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans">
              {globalRegime.summaryNarrative}
            </p>
            {globalRegime.topCatalystHeadline && (
              <div className="pt-1.5 border-t text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 font-mono" style={{ borderColor: 'var(--border-hairline)' }}>
                <Flame className="w-3 h-3 text-[var(--accent)] shrink-0" />
                <span className="truncate">
                  <strong>PRIMARY DRIVER:</strong> {globalRegime.topCatalystHeadline}
                </span>
              </div>
            )}
          </div>

          <div className="terminal-panel-alt p-3 flex flex-col justify-between space-y-2 border border-[var(--border-subtle)] font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="metadata-label text-[10px] text-[var(--text-muted)]">
                DXY SESSION OPEN
              </span>
              <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold ${
                globalRegime.dxyBiasVsOpen === 'ABOVE_OPEN' ? 'badge-bearish' : 'badge-bullish'
              }`}>
                {globalRegime.dxyBiasVsOpen === 'ABOVE_OPEN' ? '▲ ABOVE OPEN' : '▼ BELOW OPEN'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-sans leading-snug">
              Dollar index direction relative to session open sets the gravitational pull across major foreign exchange crosses.
            </p>
            <div className="pt-1.5 border-t flex items-center justify-between text-[10px] text-[var(--text-muted)]" style={{ borderColor: 'var(--border-hairline)' }}>
              <span>RISK APPETITE SCORE:</span>
              <span className="font-bold text-[var(--text-primary)]">
                {globalRegime.riskScore > 0 ? `+${globalRegime.riskScore}` : globalRegime.riskScore} / 100
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERMARKET SPREAD ENGINE & ANOMALY RADAR */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Anomaly Alerts (1 column) */}
        <div className="lg:col-span-1 terminal-panel p-3.5 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 metadata-label text-[10px] text-[var(--text-primary)] mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>SESSION ANOMALY RADAR</span>
            </div>
            <div className="space-y-2">
              {anomalyAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded border text-xs space-y-1 font-mono ${
                    alert.severity === 'WARNING' ? 'badge-warning' : 'badge-bullish'
                  }`}
                >
                  <div className="font-bold text-[11px] leading-tight">
                    {alert.title}
                  </div>
                  <p className="text-[10px] leading-relaxed opacity-90 font-sans">
                    {alert.description}
                  </p>
                  <div className="pt-1 border-t text-[10px] border-current opacity-80">
                    <strong>ACTION:</strong> {alert.actionAdvice}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <span className="text-[9.5px] font-mono text-[var(--text-muted)] pt-1">
            *Anomaly filters prevent liquidity traps & falseouts.
          </span>
        </div>

        {/* 4 Intermarket Spread Gauges (3 columns) */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {intermarketSpreads.map(spread => (
            <div
              key={spread.id}
              className="terminal-panel p-3 flex flex-col justify-between space-y-2"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] mb-1">
                  <span className="font-semibold uppercase tracking-wider">{spread.formulaLabel}</span>
                  <span className="px-1 py-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] font-bold text-[var(--text-primary)]">
                    {spread.targetPair}
                  </span>
                </div>
                <div className="text-xs font-bold text-[var(--text-primary)] truncate font-mono" title={spread.name}>
                  {spread.name}
                </div>
                <div className="flex items-baseline gap-2 mt-1 tabular-nums">
                  <span className="text-lg font-mono font-bold text-[var(--text-primary)]">
                    {spread.currentValue > 0 ? `+${spread.currentValue}` : spread.currentValue}{spread.unit}
                  </span>
                  <span className={`text-[10px] font-mono font-semibold ${
                    spread.changeSessionBps >= 0 ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'
                  }`}>
                    {spread.changeSessionBps >= 0 ? `+${spread.changeSessionBps}` : spread.changeSessionBps} bps
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t text-[10px] text-[var(--text-secondary)] leading-snug font-sans" style={{ borderColor: 'var(--border-hairline)' }}>
                {spread.interpretation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. PRIMARY CONFLUENCE PAIRS BOARD */}
      <section className="terminal-panel p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
          <div>
            <h2 className="headline-h3 text-[var(--text-primary)] flex items-center gap-2">
              <span>INTRADAY PAIRS CONFLUENCE BOARD</span>
              <span className="text-xs font-mono font-normal text-[var(--text-muted)]">
                ({filteredPairs.length} ACTIVE ASSETS)
              </span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-sans">
              Triangulated analysis across Fundamental catalysts, Intermarket yields/DXY, and Technical price action.
            </p>
          </div>

          <div className="flex items-center gap-1 border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] p-0.5 rounded text-xs font-mono shrink-0 overflow-x-auto">
            {(['ALL', 'HIGH_CONVICTION', 'MODERATE', 'CAUTION'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setSelectedPairFilter(filter)}
                className={`px-2.5 py-1 rounded transition cursor-pointer text-[10.5px] font-semibold ${
                  selectedPairFilter === filter
                    ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {filter === 'ALL'
                  ? `ALL (${pairs.length})`
                  : filter === 'HIGH_CONVICTION'
                  ? '3/3 HIGH CONVICTION'
                  : filter === 'MODERATE'
                  ? '2/3 MODERATE'
                  : 'CAUTION / TRAP'}
              </button>
            ))}
          </div>
        </div>

        {/* Pairs Grid */}
        {filteredPairs.length === 0 ? (
          <EmptyState
            icon={<Target className="w-6 h-6 text-[var(--text-muted)]" />}
            title="No pairs matched selected filter"
            description="Adjust your confluence filter criteria to display other instruments."
            action={{
              label: 'Show All Instruments',
              onClick: () => setSelectedPairFilter('ALL'),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {filteredPairs.map(p => {
              const badge = getConfluenceBadge(p.confluenceStatus);
              const c1 = p.pair.length === 6 ? p.pair.slice(0, 3) : null;
              const c2 = p.pair.length === 6 ? p.pair.slice(3, 6) : null;

              return (
                <div
                  key={p.pair}
                  className="terminal-panel p-3.5 flex flex-col justify-between space-y-3 hover:border-[var(--text-primary)] transition"
                >
                  <div>
                    {/* Top Row: Symbol, Price, & 24h Change */}
                    <div className="flex items-center justify-between gap-2 mb-2 font-mono">
                      <div className="flex items-center gap-2">
                        {c1 && c2 ? (
                          <div className="flex items-center -space-x-1 shrink-0">
                            <img
                              src={getCurrencyFlagUrl(c1)}
                              alt={c1}
                              referrerPolicy="no-referrer"
                              className="w-3.5 h-2.5 object-cover rounded-xs border border-[var(--border-subtle)]"
                            />
                            <img
                              src={getCurrencyFlagUrl(c2)}
                              alt={c2}
                              referrerPolicy="no-referrer"
                              className="w-3.5 h-2.5 object-cover rounded-xs border border-[var(--border-subtle)]"
                            />
                          </div>
                        ) : (
                          <span className="w-5 h-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)] shrink-0">
                            {p.pair.slice(0, 2)}
                          </span>
                        )}
                        <div>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">
                            {p.pair}
                          </h3>
                          <div className="text-[10px] text-[var(--text-muted)] font-sans truncate max-w-[120px]">
                            {p.displayName}
                          </div>
                        </div>
                      </div>

                      <div className="text-right tabular-nums">
                        <div className="text-xs font-bold text-[var(--text-primary)]">
                          {p.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </div>
                        <div className={`text-[10px] font-semibold ${
                          p.change24hPct >= 0 ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'
                        }`}>
                          {p.change24hPct >= 0 ? `+${p.change24hPct.toFixed(2)}%` : `${p.change24hPct.toFixed(2)}%`}
                        </div>
                      </div>
                    </div>

                    {/* Confluence Status Banner */}
                    <div className={`mb-2.5 px-2 py-1 rounded border text-[10px] font-mono font-bold flex items-center justify-between ${badge.badgeClass}`}>
                      <span>{badge.label}</span>
                      <span className="tabular-nums">{p.convictionScore}%</span>
                    </div>

                    {/* Currency Strength Net Divergence */}
                    {p.currencyStrength ? (
                      <div className="mb-2.5 p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[10px] font-mono">
                        <div className="flex items-center justify-between mb-1 text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                          <span>G8 SPREAD:</span>
                          <span className="font-bold text-[var(--text-primary)]">
                            {p.currencyStrength.alignment}
                          </span>
                        </div>
                        <div className="flex items-center justify-between tabular-nums">
                          <span className="font-bold text-[var(--text-primary)]">
                            {p.currencyStrength.baseCurrency} ({p.currencyStrength.baseScore.toFixed(1)})
                          </span>
                          <span className={`px-1.5 py-0.2 rounded font-bold ${
                            p.currencyStrength.netDifferential > 0 ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'
                          }`}>
                            Δ {p.currencyStrength.netDifferential > 0 ? `+${p.currencyStrength.netDifferential.toFixed(1)}` : p.currencyStrength.netDifferential.toFixed(1)}
                          </span>
                          <span className="font-bold text-[var(--text-primary)]">
                            {p.currencyStrength.quoteCurrency} ({p.currencyStrength.quoteScore.toFixed(1)})
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {/* 3 Pillars Breakdown */}
                    <div className="space-y-1.5 text-[10.5px] font-mono p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)]">
                      <div>
                        <div className="flex items-center justify-between text-[9.5px] text-[var(--text-muted)] uppercase">
                          <span>1. FUNDAMENTAL</span>
                          <span className={`font-bold ${p.fundamental.bias === 'BULLISH' ? 'text-[var(--bullish)]' : p.fundamental.bias === 'BEARISH' ? 'text-[var(--bearish)]' : 'text-[var(--text-muted)]'}`}>
                            {p.fundamental.bias}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] font-sans line-clamp-1">
                          {p.fundamental.keyDriver}
                        </p>
                      </div>

                      <div className="pt-1 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                        <div className="flex items-center justify-between text-[9.5px] text-[var(--text-muted)] uppercase">
                          <span>2. INTERMARKET</span>
                          <span className={`font-bold ${p.intermarket.bias === 'BULLISH' ? 'text-[var(--bullish)]' : p.intermarket.bias === 'BEARISH' ? 'text-[var(--bearish)]' : 'text-[var(--text-muted)]'}`}>
                            {p.intermarket.bias}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] font-sans line-clamp-1">
                          {p.intermarket.primarySymptom}
                        </p>
                      </div>

                      <div className="pt-1 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                        <div className="flex items-center justify-between text-[9.5px] text-[var(--text-muted)] uppercase">
                          <span>3. PRICE ACTION</span>
                          <span className={`font-bold ${p.priceAction.bias === 'BULLISH' ? 'text-[var(--bullish)]' : p.priceAction.bias === 'BEARISH' ? 'text-[var(--bearish)]' : 'text-[var(--text-muted)]'}`}>
                            {p.priceAction.bias}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] font-sans line-clamp-1">
                          {p.priceAction.actionableZone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-2 border-t font-mono" style={{ borderColor: 'var(--border-hairline)' }}>
                    <div className="flex items-center justify-between mb-2 text-[10px]">
                      <span className="text-[var(--text-muted)] uppercase">PLAN:</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {p.intradayPlan.recommendedAction.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenChart(p.tvSymbol || p.pair)}
                      className="w-full py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-[10.5px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3 text-[var(--accent)]" />
                      <span>OPEN CHART</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
});

ArahMarketView.displayName = 'ArahMarketView';
