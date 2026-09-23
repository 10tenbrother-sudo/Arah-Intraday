import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  IntradayAssetBias,
  MarketDirectionBias,
  MarketPrice,
} from '../types';
import {
  Compass,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  LineChart,
  Radio,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrencyFlagUrl } from '../lib/assets';
import { EmptyState } from './shared/EmptyState';

interface IntradayMarketMapViewProps {
  data: IntradayAssetBias[];
  prices: MarketPrice[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onOpenChart: (symbol: string) => void;
  onSelectSymbol?: (symbol: string | null) => void;
}

export const IntradayMarketMapView: React.FC<IntradayMarketMapViewProps> = ({
  data,
  prices,
  onRefresh,
  isRefreshing,
  onOpenChart,
  onSelectSymbol,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'COMMODITY' | 'CRYPTO' | 'INDEX' | 'BOND' | 'FOREX'>('ALL');
  const [selectedBias, setSelectedBias] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Live Pulse state tracking
  const [pulsingAssets, setPulsingAssets] = useState<Record<string, { direction: 'UP' | 'DOWN'; timestamp: number }>>({});
  const prevPricesRef = useRef<Map<string, number>>(new Map());
  const pulseTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Map latest prices
  const latestPricesMap = useMemo(() => {
    const map = new Map<string, MarketPrice>();
    prices.forEach(p => map.set(p.symbol.toUpperCase(), p));
    return map;
  }, [prices]);

  // Track live real-time price tick pulses
  useEffect(() => {
    prices.forEach(p => {
      const sym = p.symbol.toUpperCase();
      const prevPrice = prevPricesRef.current.get(sym);

      if (prevPrice !== undefined && prevPrice !== p.price) {
        const direction = p.price > prevPrice ? 'UP' : 'DOWN';
        setPulsingAssets(prev => ({
          ...prev,
          [sym]: { direction, timestamp: Date.now() },
        }));

        const existingTimer = pulseTimersRef.current.get(sym);
        if (existingTimer) clearTimeout(existingTimer);

        const timer = setTimeout(() => {
          setPulsingAssets(prev => {
            if (!prev[sym]) return prev;
            const next = { ...prev };
            delete next[sym];
            return next;
          });
          pulseTimersRef.current.delete(sym);
        }, 1800);

        pulseTimersRef.current.set(sym, timer);
      }

      prevPricesRef.current.set(sym, p.price);
    });
  }, [prices]);

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      pulseTimersRef.current.forEach(timer => clearTimeout(timer));
      pulseTimersRef.current.clear();
    };
  }, []);

  // Summary statistics
  const stats = useMemo(() => {
    let bullish = 0;
    let bearish = 0;
    let neutral = 0;
    let mixed = 0;

    data.forEach(item => {
      if (item.overall_bias === 'BULLISH') bullish++;
      else if (item.overall_bias === 'BEARISH') bearish++;
      else if (item.overall_bias === 'NEUTRAL') neutral++;
      else if (item.overall_bias === 'MIXED') mixed++;
    });

    return { total: data.length, bullish, bearish, neutral, mixed };
  }, [data]);

  // Filtered Assets
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (selectedCategory !== 'ALL' && item.asset_type !== selectedCategory) return false;
      if (selectedBias !== 'ALL' && item.overall_bias !== selectedBias) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSymbol = item.symbol.toLowerCase().includes(q);
        const matchName = item.display_name.toLowerCase().includes(q);
        const matchCatalyst = item.today_key_catalyst.toLowerCase().includes(q);
        const matchDrivers = item.top_drivers.some(d => d.toLowerCase().includes(q));
        return matchSymbol || matchName || matchCatalyst || matchDrivers;
      }
      return true;
    });
  }, [data, selectedCategory, selectedBias, searchQuery]);

  const getBiasBadgeClass = (bias: MarketDirectionBias) => {
    switch (bias) {
      case 'BULLISH':
        return 'badge-bullish';
      case 'BEARISH':
        return 'badge-bearish';
      case 'MIXED':
      case 'NEUTRAL':
      default:
        return 'badge-neutral';
    }
  };

  const getBiasIcon = (bias: MarketDirectionBias) => {
    switch (bias) {
      case 'BULLISH':
        return <TrendingUp className="w-3.5 h-3.5 text-[var(--bullish)]" />;
      case 'BEARISH':
        return <TrendingDown className="w-3.5 h-3.5 text-[var(--bearish)]" />;
      default:
        return <Minus className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
    }
  };

  const formatAssetPrice = (symbol: string, price: number) => {
    if (symbol === 'US10Y') return `${price.toFixed(3)}%`;
    if (symbol === 'JPY' || symbol.includes('JPY')) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    }
    if (symbol === 'BTC' || symbol === 'BTCUSD') {
      return Math.round(price).toLocaleString();
    }
    if (price > 1000) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    }
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 });
  };

  return (
    <div className="space-y-4 font-sans" id="intraday-market-map-view">
      {/* 1. Header Banner */}
      <section className="terminal-panel p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="metadata-label text-[10px] text-[var(--accent)] font-mono">
              REAL-TIME MAP
            </span>
            <span className="text-[var(--border-subtle)]">·</span>
            <span className="text-[10px] font-mono text-[var(--text-secondary)] font-semibold">
              13 CORE ASSETS SYNCHRONIZED
            </span>
          </div>

          <h1 className="headline-h2 text-[var(--text-primary)]">
            INTRADAY MARKET MAP
          </h1>

          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] font-sans leading-relaxed">
            Multi-factor synthesis connecting <strong>Macro Data + Central Bank Guidance + Currency Disparity + Benchmark Yields</strong> into actionable intraday bias.
          </p>
        </div>

        {/* Global Bias Balance Counters & Control Actions */}
        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] tabular-nums">
            <span className="text-[10px] text-[var(--text-muted)] font-semibold">BIAS:</span>
            <span className="text-[var(--bullish)] font-bold">{stats.bullish} BULL</span>
            <span className="text-[var(--border-subtle)]">/</span>
            <span className="text-[var(--bearish)] font-bold">{stats.bearish} BEAR</span>
            <span className="text-[var(--border-subtle)]">/</span>
            <span className="text-[var(--text-muted)] font-bold">{stats.neutral + stats.mixed} NEUT</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-7 px-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>SYNC</span>
          </button>
        </div>
      </section>

      {/* 2. Filter Bar & View Mode Toggle */}
      <div className="terminal-panel p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mr-1">CLASS:</span>
          {(['ALL', 'COMMODITY', 'CRYPTO', 'INDEX', 'BOND', 'FOREX'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded transition cursor-pointer text-[10.5px] font-semibold ${
                selectedCategory === cat
                  ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Bias Filters */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mr-1">BIAS:</span>
          {(['ALL', 'BULLISH', 'BEARISH', 'NEUTRAL'] as const).map(b => (
            <button
              key={b}
              onClick={() => setSelectedBias(b as any)}
              className={`px-2 py-0.5 rounded transition cursor-pointer text-[10.5px] font-semibold ${
                selectedBias === b
                  ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Search & Layout View Toggles */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-52">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search asset, catalyst..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-7 bg-[var(--bg-section-alt)] border border-[var(--border-subtle)] focus:border-[var(--text-primary)] rounded pl-8 pr-2 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
            />
          </div>

          <div className="flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] p-0.5">
            <button
              onClick={() => setViewMode('CARDS')}
              className={`h-6 px-2 rounded text-[10.5px] font-semibold cursor-pointer ${
                viewMode === 'CARDS'
                  ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              CARDS
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`h-6 px-2 rounded text-[10.5px] font-semibold cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              TABLE
            </button>
          </div>
        </div>
      </div>

      {/* 3. Display: Grid Cards Mode */}
      {viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredData.map(asset => {
            const badgeClass = getBiasBadgeClass(asset.overall_bias);
            const isExpanded = expandedSymbol === asset.symbol;
            const priceInfo = latestPricesMap.get(asset.symbol);
            const currentPrice = priceInfo?.price ?? asset.price;
            const currentChange = priceInfo?.change_24h_pct ?? asset.change_24h_pct;
            const pulse = pulsingAssets[asset.symbol];
            const isPulsingUp = pulse?.direction === 'UP';

            return (
              <div
                key={asset.symbol}
                className="terminal-panel p-3.5 flex flex-col justify-between space-y-3 hover:border-[var(--text-primary)] transition"
              >
                {/* Header: Symbol, Price, & Change */}
                <div>
                  <div className="flex items-start justify-between gap-2 border-b pb-2.5" style={{ borderColor: 'var(--border-hairline)' }}>
                    <div>
                      <div className="flex items-center gap-2">
                        {asset.symbol.length === 6 && !asset.symbol.startsWith('US') && !asset.symbol.startsWith('XA') ? (
                          <div className="flex items-center -space-x-1 shrink-0">
                            <img
                              src={getCurrencyFlagUrl(asset.symbol.slice(0, 3))}
                              alt={asset.symbol.slice(0, 3)}
                              referrerPolicy="no-referrer"
                              className="w-4 h-3 object-cover rounded-xs border border-[var(--border-subtle)]"
                            />
                            <img
                              src={getCurrencyFlagUrl(asset.symbol.slice(3, 6))}
                              alt={asset.symbol.slice(3, 6)}
                              referrerPolicy="no-referrer"
                              className="w-4 h-3 object-cover rounded-xs border border-[var(--border-subtle)]"
                            />
                          </div>
                        ) : (
                          <span className="w-5 h-4 rounded text-[9px] font-mono font-bold border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                            {asset.symbol.slice(0, 2)}
                          </span>
                        )}

                        <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                          {asset.symbol}
                        </span>

                        <span className="text-[9px] font-mono px-1 py-0 rounded border border-[var(--border-subtle)] text-[var(--text-muted)]">
                          {asset.asset_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] font-sans truncate max-w-[200px] mt-0.5">
                        {asset.display_name}
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums">
                      <div className="font-bold text-xs text-[var(--text-primary)]">
                        {formatAssetPrice(asset.symbol, currentPrice)}
                      </div>
                      <div className={`text-[10px] font-semibold ${
                        currentChange >= 0 ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'
                      }`}>
                        {currentChange >= 0 ? '+' : ''}{currentChange.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Overall Bias Banner */}
                  <div className={`my-2.5 px-2.5 py-1.5 rounded border text-xs font-mono font-bold flex items-center justify-between ${badgeClass}`}>
                    <div className="flex items-center gap-1.5">
                      {getBiasIcon(asset.overall_bias)}
                      <span>{asset.overall_bias}</span>
                    </div>
                    <span className="text-[11px] tabular-nums">
                      {asset.confidence}% CONVICTION
                    </span>
                  </div>

                  {/* Split Biases: Fundamental vs Technical */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)]">
                      <span className="text-[9px] text-[var(--text-muted)] block uppercase tracking-wider">
                        FUNDAMENTAL
                      </span>
                      <span className={`font-bold mt-0.5 block ${
                        asset.fundamental_bias === 'BULLISH' ? 'text-[var(--bullish)]' : asset.fundamental_bias === 'BEARISH' ? 'text-[var(--bearish)]' : 'text-[var(--text-muted)]'
                      }`}>
                        {asset.fundamental_bias}
                      </span>
                    </div>

                    <div className="p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)]">
                      <span className="text-[9px] text-[var(--text-muted)] block uppercase tracking-wider">
                        PRICE ACTION
                      </span>
                      <span className={`font-bold mt-0.5 block ${
                        asset.price_action_bias === 'BULLISH' ? 'text-[var(--bullish)]' : asset.price_action_bias === 'BEARISH' ? 'text-[var(--bearish)]' : 'text-[var(--text-muted)]'
                      }`}>
                        {asset.price_action_bias}
                      </span>
                    </div>
                  </div>

                  {/* Today's Key Catalyst */}
                  <div className="mt-2 p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[11px] font-sans">
                    <strong className="text-[10px] font-mono text-[var(--text-primary)] block uppercase tracking-wider mb-0.5">
                      CATALYST:
                    </strong>
                    <p className="text-[var(--text-secondary)] leading-snug line-clamp-2">
                      {asset.today_key_catalyst}
                    </p>
                  </div>
                </div>

                {/* Footer Controls: Chart & Details Toggle */}
                <div className="pt-2 border-t font-mono text-xs flex items-center gap-1.5" style={{ borderColor: 'var(--border-hairline)' }}>
                  <button
                    onClick={() => onOpenChart(asset.tv_symbol || asset.symbol)}
                    className="flex-1 h-7 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-[10.5px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <LineChart className="w-3 h-3 text-[var(--accent)]" />
                    <span>CHART</span>
                  </button>

                  <button
                    onClick={() => setExpandedSymbol(isExpanded ? null : asset.symbol)}
                    className="h-7 px-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] text-[10.5px] flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>{isExpanded ? 'LESS' : 'DRIVERS'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Expanded Drivers Section */}
                {isExpanded && (
                  <div className="pt-2 border-t space-y-2 text-xs font-mono" style={{ borderColor: 'var(--border-hairline)' }}>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                      PRIMARY DRIVERS:
                    </div>
                    <ul className="space-y-1 text-[11px] text-[var(--text-secondary)] font-sans list-disc pl-4">
                      {asset.top_drivers.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>

                    {asset.conditions_to_change_bias && (
                      <div className="p-2 rounded border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[10.5px] text-[var(--warning)] font-sans">
                        <strong>INVALIDATION:</strong> {asset.conditions_to_change_bias}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Table / Scanner View Mode */
        <div className="terminal-panel overflow-x-auto">
          <table className="w-full text-left text-xs font-mono divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
            <thead>
              <tr className="table-header">
                <th className="py-2.5 px-3">ASSET</th>
                <th className="py-2.5 px-3">TYPE</th>
                <th className="py-2.5 px-3 text-right">PRICE</th>
                <th className="py-2.5 px-3 text-right">24H</th>
                <th className="py-2.5 px-3">OVERALL BIAS</th>
                <th className="py-2.5 px-3 text-right">CONFIDENCE</th>
                <th className="py-2.5 px-3">TODAY'S CATALYST</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
              {filteredData.map(asset => {
                const priceInfo = latestPricesMap.get(asset.symbol);
                const currentPrice = priceInfo?.price ?? asset.price;
                const currentChange = priceInfo?.change_24h_pct ?? asset.change_24h_pct;
                const badgeClass = getBiasBadgeClass(asset.overall_bias);

                return (
                  <tr key={asset.symbol} className="table-row">
                    <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">
                      {asset.symbol}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-[var(--text-muted)]">
                      {asset.asset_type}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-primary)] font-semibold">
                      {formatAssetPrice(asset.symbol, currentPrice)}
                    </td>
                    <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${
                      currentChange >= 0 ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'
                    }`}>
                      {currentChange >= 0 ? '+' : ''}{currentChange.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[9.5px] px-1.5 py-0.5 rounded border font-semibold ${badgeClass}`}>
                        {asset.overall_bias}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-primary)] font-semibold">
                      {asset.confidence}%
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-[var(--text-secondary)] font-sans truncate max-w-xs">
                      {asset.today_key_catalyst}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onOpenChart(asset.tv_symbol || asset.symbol)}
                        className="h-6 px-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-[10px] font-semibold transition cursor-pointer"
                      >
                        CHART
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
