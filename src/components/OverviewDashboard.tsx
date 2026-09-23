import React, { useState, useMemo } from 'react';
import {
  Zap,
  ArrowRight,
  TrendingUp,
  Activity,
  Radio,
  RefreshCw,
  Flame,
  Clock,
  ChevronRight,
  Target,
} from 'lucide-react';
import {
  MarketPrice,
  CurrencyStrength,
  MarketEvent,
  EconomicEvent,
  AIAnalysis,
  IntradayAssetBias,
  TodayCatalyst,
} from '../types';
import { CurrencyStrengthWidget } from './CurrencyStrengthWidget';
import { MarketDataGrid } from './MarketDataGrid';
import { ExecutiveMarketBrief } from './ExecutiveMarketBrief';
import { NavTabId } from './Sidebar';
import { EmptyState } from './shared/EmptyState';

interface OverviewDashboardProps {
  intradayMap: IntradayAssetBias[];
  todayCatalysts: TodayCatalyst[];
  prices: MarketPrice[];
  strengths: CurrencyStrength[];
  events: MarketEvent[];
  calendar: EconomicEvent[];
  overview: AIAnalysis | null;
  watchlistSymbols: string[];
  selectedSymbol: string | null;
  onSelectSymbol: (symbol: string | null) => void;
  onNavigateTab: (tab: NavTabId) => void;
  onToggleWatchlist: (symbol: string, assetType: string) => void;
  onOpenChart: (symbol: string) => void;
  onSelectEvent: (eventId: string) => void;
  onRefreshPrices: () => Promise<void>;
  isRefreshingPrices: boolean;
  onRefreshCS: () => Promise<void>;
  isRefreshingCS: boolean;
  onSyncWire: () => Promise<void>;
  isSyncingWire: boolean;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = React.memo(({
  intradayMap,
  todayCatalysts,
  prices,
  strengths,
  events,
  calendar,
  overview,
  watchlistSymbols,
  selectedSymbol,
  onSelectSymbol,
  onNavigateTab,
  onToggleWatchlist,
  onOpenChart,
  onSelectEvent,
  onRefreshPrices,
  isRefreshingPrices,
  onRefreshCS,
  isRefreshingCS,
  onSyncWire,
  isSyncingWire,
}) => {
  const [wireImpactFilter, setWireImpactFilter] = useState<'HIGH' | 'ALL'>('HIGH');
  const [newsFeedTab, setNewsFeedTab] = useState<'news' | 'calendar'>('news');

  const highImpactEvents = useMemo(() => {
    return events.filter(e => e.impact_level === 'CRITICAL' || e.impact_level === 'HIGH');
  }, [events]);

  const wireDisplayEvents = useMemo(() => {
    if (wireImpactFilter === 'HIGH') {
      return highImpactEvents;
    }
    return events;
  }, [wireImpactFilter, highImpactEvents, events]);

  // Executive KPI telemetry calculations
  const kpiStats = useMemo(() => {
    let strongest: CurrencyStrength | null = null;
    let weakest: CurrencyStrength | null = null;
    if (strengths && strengths.length > 0) {
      const sorted = [...strengths].sort((a, b) => b.strength_score - a.strength_score);
      strongest = sorted[0];
      weakest = sorted[sorted.length - 1];
    }

    const bullishCount = intradayMap.filter(a => a.overall_bias === 'BULLISH').length;
    const bearishCount = intradayMap.filter(a => a.overall_bias === 'BEARISH').length;

    let overallRegime = 'BALANCED / ROTATIONAL';
    let regimeStatus = 'NEUTRAL';
    if (bullishCount >= 7) {
      overallRegime = 'RISK-ON DOMINANT';
      regimeStatus = 'BULLISH';
    } else if (bearishCount >= 7) {
      overallRegime = 'DEFENSIVE / RISK-OFF';
      regimeStatus = 'BEARISH';
    }

    const upcomingHigh = calendar.find(
      c => c.status === 'UPCOMING' && (c.impact === 'CRITICAL' || c.impact === 'HIGH')
    );

    // Fast asset snapshots
    const gold = prices.find(p => p.symbol === 'XAUUSD');
    const dxy = prices.find(p => p.symbol === 'USD');
    const us100 = prices.find(p => p.symbol === 'US100');
    const us10y = prices.find(p => p.symbol === 'US10Y');

    return {
      strongest,
      weakest,
      bullishCount,
      bearishCount,
      overallRegime,
      regimeStatus,
      upcomingHigh,
      gold,
      dxy,
      us100,
      us10y,
    };
  }, [strengths, intradayMap, calendar, prices]);

  return (
    <div className="space-y-4" id="terminal-overview-dashboard">
      {/* ======================================================== */}
      {/* 1. SWISS EDITORIAL MARKET OVERVIEW HERO                 */}
      {/* ======================================================== */}
      <section
        className="terminal-panel p-4 sm:p-5 border transition-colors"
        id="editorial-market-overview"
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          {/* Left Column: Bold Typography & Market Narrative */}
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="metadata-label text-[10px] text-[var(--text-muted)]">
                MARKET INTELLIGENCE · SURVEILLANCE DESK
              </span>
              <span className="text-[var(--border-subtle)]">·</span>
              <span className="text-[10px] font-mono text-[var(--accent)] font-semibold">
                INTRADAY REGIME
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="headline-h2 text-[var(--text-primary)]">
                TODAY'S MARKET REGIME: {kpiStats.overallRegime}
              </h1>
              <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed font-sans">
                Cross-asset analysis across G8 currencies, US benchmark yields, technology equities, and gold. High-conviction setups prioritized based on intermarket yield differentials and liquidity flows.
              </p>
            </div>

            {/* Quick Navigation Action Strip */}
            <div className="pt-1 flex items-center gap-2 flex-wrap text-xs font-mono">
              <button
                onClick={() => onNavigateTab('arah_market')}
                className="h-7 px-3 rounded font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer bg-[var(--accent)] text-white hover:opacity-90 shadow-xs"
              >
                <Target className="w-3.5 h-3.5" />
                <span>MARKET BIAS DOSSIER</span>
              </button>

              <button
                onClick={() => onNavigateTab('currency')}
                className="h-7 px-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5 text-[var(--bullish)]" />
                <span>G8 CURRENCY MATRIX</span>
              </button>

              <button
                onClick={() => onNavigateTab('intermarket')}
                className="h-7 px-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>INTERMARKET FLOWS</span>
              </button>

              <button
                onClick={() => onNavigateTab('events')}
                className="h-7 px-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>CANONICAL WIRE</span>
              </button>
            </div>
          </div>

          {/* Right Column: 5-Second Market Snapshot Table */}
          <div
            className="w-full lg:w-80 shrink-0 border rounded p-3 space-y-2.5 font-mono text-xs"
            style={{
              backgroundColor: 'var(--bg-section-alt)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
              <span className="metadata-label text-[10px] text-[var(--text-secondary)]">
                5-SECOND SCAN
              </span>
              <span className="text-[10px] font-semibold text-[var(--bullish)]">
                {kpiStats.bullishCount} BULL / {kpiStats.bearishCount} BEAR
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] tabular-nums">
              <div className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[9.5px] uppercase tracking-wider text-[var(--text-muted)] block">
                  US DOLLAR (DXY)
                </span>
                <span className="font-bold text-[var(--text-primary)]">
                  {kpiStats.dxy?.price.toFixed(2) || '101.24'}
                  <span className={`ml-1 text-[10px] ${((kpiStats.dxy?.change_24h_pct ?? 0) >= 0) ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`}>
                    {((kpiStats.dxy?.change_24h_pct ?? 0) >= 0) ? '+' : ''}
                    {(kpiStats.dxy?.change_24h_pct ?? 0.18).toFixed(2)}%
                  </span>
                </span>
              </div>

              <div className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[9.5px] uppercase tracking-wider text-[var(--text-muted)] block">
                  GOLD (XAUUSD)
                </span>
                <span className="font-bold text-[var(--text-primary)]">
                  ${kpiStats.gold?.price.toFixed(1) || '2,654.8'}
                  <span className={`ml-1 text-[10px] ${((kpiStats.gold?.change_24h_pct ?? 0) >= 0) ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`}>
                    {((kpiStats.gold?.change_24h_pct ?? 0) >= 0) ? '+' : ''}
                    {(kpiStats.gold?.change_24h_pct ?? 0.73).toFixed(2)}%
                  </span>
                </span>
              </div>

              <div className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[9.5px] uppercase tracking-wider text-[var(--text-muted)] block">
                  NASDAQ (US100)
                </span>
                <span className="font-bold text-[var(--text-primary)]">
                  {kpiStats.us100?.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '23,421'}
                  <span className={`ml-1 text-[10px] ${((kpiStats.us100?.change_24h_pct ?? 0) >= 0) ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`}>
                    {((kpiStats.us100?.change_24h_pct ?? 0) >= 0) ? '+' : ''}
                    {(kpiStats.us100?.change_24h_pct ?? 0.41).toFixed(2)}%
                  </span>
                </span>
              </div>

              <div className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[9.5px] uppercase tracking-wider text-[var(--text-muted)] block">
                  10Y YIELD (US10Y)
                </span>
                <span className="font-bold text-[var(--text-primary)]">
                  {kpiStats.us10y?.price.toFixed(3) || '4.085'}%
                  <span className={`ml-1 text-[10px] ${((kpiStats.us10y?.change_24h_pct ?? 0) <= 0) ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`}>
                    {((kpiStats.us10y?.change_24h_pct ?? 0) >= 0) ? '+' : ''}
                    {(kpiStats.us10y?.change_24h_pct ?? -0.32).toFixed(2)}%
                  </span>
                </span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[10px] text-[var(--text-muted)] border-t" style={{ borderColor: 'var(--border-hairline)' }}>
              <span>LEAD: <strong className="text-[var(--bullish)]">{kpiStats.strongest?.currency || 'USD'} ({kpiStats.strongest?.strength_score.toFixed(1) || '7.8'})</strong></span>
              <span>LAG: <strong className="text-[var(--bearish)]">{kpiStats.weakest?.currency || 'JPY'} ({kpiStats.weakest?.strength_score.toFixed(1) || '2.1'})</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. 4-COLUMN STRUCTURAL KPI TELEMETRY GRID               */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Market Regime */}
        <div className="terminal-panel p-3 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="metadata-label text-[10px] text-[var(--text-muted)]">
              REGIME
            </span>
            <span
              className={`text-[9.5px] px-1 py-0 font-mono font-semibold rounded border ${
                kpiStats.regimeStatus === 'BULLISH'
                  ? 'badge-bullish'
                  : kpiStats.regimeStatus === 'BEARISH'
                  ? 'badge-bearish'
                  : 'badge-neutral'
              }`}
            >
              {kpiStats.regimeStatus}
            </span>
          </div>
          <div className="text-xs font-mono font-bold text-[var(--text-primary)]">
            {kpiStats.overallRegime}
          </div>
          <div className="text-[10px] font-mono text-[var(--text-muted)]">
            Distribution across 13 core tracking assets
          </div>
        </div>

        {/* KPI 2: Currency Divergence */}
        <div className="terminal-panel p-3 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="metadata-label text-[10px] text-[var(--text-muted)]">
              G8 DIVERGENCE
            </span>
            <button
              onClick={() => onNavigateTab('currency')}
              className="text-[10px] font-mono text-[var(--accent)] hover:underline cursor-pointer"
            >
              Matrix →
            </button>
          </div>
          <div className="text-xs font-mono font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <span className="text-[var(--bullish)]">{kpiStats.strongest?.currency || 'USD'}</span>
            <span className="text-[var(--text-muted)]">vs</span>
            <span className="text-[var(--bearish)]">{kpiStats.weakest?.currency || 'JPY'}</span>
            <span className="text-[10px] font-normal text-[var(--text-muted)] ml-auto">
              Δ {((kpiStats.strongest?.strength_score ?? 6) - (kpiStats.weakest?.strength_score ?? 2)).toFixed(1)}pt
            </span>
          </div>
          <div className="text-[10px] font-mono text-[var(--text-muted)]">
            Maximum directional divergence basket
          </div>
        </div>

        {/* KPI 3: Key Imminent Catalyst */}
        <div className="terminal-panel p-3 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="metadata-label text-[10px] text-[var(--text-muted)]">
              NEXT HIGH IMPACT
            </span>
            {kpiStats.upcomingHigh && (
              <span className="text-[9px] font-mono font-semibold px-1 py-0 rounded badge-warning">
                {kpiStats.upcomingHigh.currency}
              </span>
            )}
          </div>
          <div className="text-xs font-mono font-bold text-[var(--text-primary)] truncate" title={kpiStats.upcomingHigh?.event_name}>
            {kpiStats.upcomingHigh?.event_name || 'No imminent high-impact data'}
          </div>
          <div className="text-[10px] font-mono text-[var(--text-muted)]">
            {kpiStats.upcomingHigh ? (
              `${new Date(kpiStats.upcomingHigh.date_time_utc).toLocaleTimeString('id-ID', {
                timeZone: 'Asia/Jakarta',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
              })} WIB`
            ) : 'Calendar clear for next session'}
          </div>
        </div>

        {/* KPI 4: Intermarket Flow Transmissions */}
        <div className="terminal-panel p-3 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="metadata-label text-[10px] text-[var(--text-muted)]">
              CROSS-ASSET ENGINE
            </span>
            <button
              onClick={() => onNavigateTab('intermarket')}
              className="text-[10px] font-mono text-[var(--accent)] hover:underline cursor-pointer"
            >
              Flows →
            </button>
          </div>
          <div className="text-xs font-mono font-bold text-[var(--text-primary)]">
            US10Y → US100 / XAU
          </div>
          <div className="text-[10px] font-mono text-[var(--text-muted)]">
            Bond yield discount anchor active
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. EXECUTIVE MARKET BRIEF (KESIMPULAN & TRADE ENTRIES)   */}
      {/* ======================================================== */}
      <ExecutiveMarketBrief
        strengths={strengths}
        intradayMap={intradayMap}
        todayCatalysts={todayCatalysts}
        prices={prices}
        calendar={calendar}
        onOpenChart={onOpenChart}
        onSelectSymbol={onSelectSymbol}
      />

      {/* ======================================================== */}
      {/* 4. CANONICAL NEWS WIRE & ECONOMIC CALENDAR               */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Real-Time Wire Feed (8 Columns) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="terminal-panel p-3.5 space-y-3">
            {/* Header with Switcher Tabs & Impact Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] p-0.5 text-xs font-mono">
                  <button
                    onClick={() => setNewsFeedTab('news')}
                    className={`h-6 px-2.5 rounded font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      newsFeedTab === 'news'
                        ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Radio className="w-3 h-3" />
                    <span>CANONICAL WIRE</span>
                    <span className="text-[9px] px-1 py-0 rounded border border-transparent opacity-80">
                      {events.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setNewsFeedTab('calendar')}
                    className={`h-6 px-2.5 rounded font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      newsFeedTab === 'calendar'
                        ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Activity className="w-3 h-3" />
                    <span>ECONOMIC CALENDAR</span>
                    <span className="text-[9px] px-1 py-0 rounded border border-transparent opacity-80">
                      {calendar.length}
                    </span>
                  </button>
                </div>

                {newsFeedTab === 'news' && (
                  <div className="flex items-center gap-1 text-[10.5px] font-mono">
                    <button
                      onClick={() => setWireImpactFilter('HIGH')}
                      className={`h-6 px-2 rounded border transition cursor-pointer ${
                        wireImpactFilter === 'HIGH'
                          ? 'badge-bearish'
                          : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      title="Filter high-impact wires only"
                    >
                      HIGH IMPACT ({highImpactEvents.length})
                    </button>
                    <button
                      onClick={() => setWireImpactFilter('ALL')}
                      className={`h-6 px-2 rounded border transition cursor-pointer ${
                        wireImpactFilter === 'ALL'
                          ? 'border-[var(--text-primary)] text-[var(--text-primary)] font-bold'
                          : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      title="Show all wire headlines"
                    >
                      ALL ({events.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onSyncWire}
                  disabled={isSyncingWire}
                  className="h-6 px-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10.5px] font-mono flex items-center gap-1 transition cursor-pointer"
                  title="Sync Wire Feeds"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingWire ? 'animate-spin' : ''}`} />
                  <span>SYNC</span>
                </button>

                <button
                  onClick={() => onNavigateTab(newsFeedTab === 'news' ? 'events' : 'macro')}
                  className="h-6 px-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-[10.5px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <span>FULL VIEW</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Editorial Table Rows for Wire Feeds */}
            {newsFeedTab === 'news' ? (
              wireDisplayEvents.length === 0 ? (
                <EmptyState
                  icon={<Flame className="w-5 h-5 text-[var(--bearish)]" />}
                  title={`No ${wireImpactFilter === 'HIGH' ? 'High Impact' : ''} news headlines`}
                  description="Institutional wire feeds update dynamically when breaking catalysts arrive."
                  action={wireImpactFilter === 'HIGH' ? {
                    label: `Show all wires (${events.length})`,
                    onClick: () => setWireImpactFilter('ALL'),
                  } : undefined}
                />
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                  {wireDisplayEvents.slice(0, 5).map(event => {
                    const eventDate = new Date(event.last_updated_at || event.first_detected_at);
                    const eventTime = isNaN(eventDate.getTime())
                      ? 'LIVE'
                      : eventDate.toLocaleTimeString('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          hour12: false,
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                    const isCritical = event.impact_level === 'CRITICAL';
                    const isHigh = event.impact_level === 'HIGH';

                    return (
                      <div
                        key={event.id}
                        onClick={() => onSelectEvent(event.id)}
                        className="py-2.5 px-2 hover:bg-[var(--bg-section-alt)] rounded transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-[var(--text-muted)] font-bold shrink-0 tabular-nums">
                            {eventTime}
                          </span>
                          <span className="text-[9px] px-1 py-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[var(--text-secondary)] shrink-0">
                            {event.source_names?.[0] || 'WIRE'}
                          </span>
                          <p className="text-[var(--text-primary)] font-sans text-xs font-medium truncate" title={event.title}>
                            {event.title}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                          {/* Pair impacts */}
                          {(event.pair_impacts || []).slice(0, 2).map(pi => (
                            <span
                              key={pi.pair}
                              className={`text-[8.5px] px-1 py-0 rounded border font-semibold ${
                                pi.bias === 'BULLISH'
                                  ? 'badge-bullish'
                                  : pi.bias === 'BEARISH'
                                  ? 'badge-bearish'
                                  : 'badge-neutral'
                              }`}
                            >
                              {pi.pair} {pi.bias === 'BULLISH' ? '▲' : pi.bias === 'BEARISH' ? '▼' : '●'}
                            </span>
                          ))}

                          <span
                            className={`text-[8.5px] px-1 py-0 rounded border font-semibold ${
                              isCritical
                                ? 'badge-bearish'
                                : isHigh
                                ? 'badge-warning'
                                : 'badge-neutral'
                            }`}
                          >
                            {event.impact_level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* High-Density Economic Calendar Rows */
              <div className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                {calendar.slice(0, 5).map(item => (
                  <div
                    key={item.id}
                    className="py-2.5 px-2 hover:bg-[var(--bg-section-alt)] rounded transition flex items-center justify-between font-mono text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-[9.5px] px-1 py-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] font-bold text-[var(--text-primary)] shrink-0">
                        {item.currency}
                      </span>
                      <span className="text-[var(--text-primary)] truncate font-sans text-xs">
                        {item.event_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[10px] tabular-nums">
                      <span className="font-bold text-[var(--text-primary)]">
                        {new Date(item.date_time_utc).toLocaleTimeString('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          hour12: false,
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        WIB
                      </span>
                      <span
                        className={`text-[8.5px] px-1 py-0 rounded border font-bold ${
                          item.impact === 'CRITICAL' || item.impact === 'HIGH'
                            ? 'badge-bearish'
                            : 'badge-neutral'
                        }`}
                      >
                        {item.impact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Macro Catalysts Radar & AI Digest (4 Columns) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Today's Key Catalysts */}
          <div className="terminal-panel p-3.5 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
                <h3 className="metadata-label text-[10px] text-[var(--text-primary)]">
                  TODAY'S CATALYSTS
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('today_catalysts')}
                className="text-[10px] font-mono text-[var(--accent)] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Detail</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5">
              {todayCatalysts.slice(0, 3).map(cat => (
                <div
                  key={cat.id}
                  className="p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] space-y-1 font-mono"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] px-1 py-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold">
                        {cat.currency}
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate max-w-[140px]">
                        {cat.event_name}
                      </span>
                    </div>
                    <span
                      className={`text-[8px] px-1 py-0 rounded border font-bold ${
                        cat.status === 'RELEASED' ? 'badge-bullish' : 'badge-warning'
                      }`}
                    >
                      {cat.status}
                    </span>
                  </div>

                  <div className="text-[10px] text-[var(--text-secondary)] font-sans line-clamp-1">
                    <strong className="text-[var(--text-primary)] font-mono mr-1">ACTION:</strong>
                    {cat.actual_market_reaction}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Macro Synthesis Digest */}
          {overview && (
            <div className="terminal-panel p-3.5 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                <span className="metadata-label text-[10px] text-[var(--text-primary)] flex items-center gap-1">
                  <span>AI MACRO SYNTHESIS</span>
                </span>
                <button
                  onClick={() => onNavigateTab('intelligence')}
                  className="text-[10px] font-mono text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Deep Analysis →
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-sans leading-relaxed line-clamp-3">
                {overview.summary}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MARKET SURVEILLANCE & G8 CURRENCY FLOW MATRIX         */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Live 13 Assets Surveillance Grid (8 Columns) */}
        <div className="lg:col-span-8">
          <MarketDataGrid
            prices={prices}
            watchlistSymbols={watchlistSymbols}
            intradayMap={intradayMap}
            onToggleWatchlist={onToggleWatchlist}
            onRefresh={onRefreshPrices}
            isRefreshing={isRefreshingPrices}
            onSelectSymbol={onSelectSymbol}
            onOpenChart={onOpenChart}
          />
        </div>

        {/* Right Column: Currency Strength Widget (4 Columns) */}
        <div className="lg:col-span-4">
          <CurrencyStrengthWidget
            strengths={strengths}
            onRefresh={onRefreshCS}
            isRefreshing={isRefreshingCS}
            onSelectCurrency={cur => onSelectSymbol(cur === selectedSymbol ? null : cur)}
            initialTab="CHART"
          />
        </div>
      </div>
    </div>
  );
});

OverviewDashboard.displayName = 'OverviewDashboard';
