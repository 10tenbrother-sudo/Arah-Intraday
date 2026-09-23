import React, { useState, useMemo } from 'react';
import { MarketPrice, IntradayAssetBias } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Star,
  LineChart,
} from 'lucide-react';
import { Tooltip, MetricTooltip } from './Tooltip';

interface MarketDataGridProps {
  prices: MarketPrice[];
  watchlistSymbols: string[];
  intradayMap?: IntradayAssetBias[];
  onToggleWatchlist: (symbol: string, assetType: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSelectSymbol: (symbol: string) => void;
  onOpenChart?: (symbol: string) => void;
}

export const MarketDataGrid: React.FC<MarketDataGridProps> = React.memo(({
  prices,
  watchlistSymbols,
  intradayMap = [],
  onToggleWatchlist,
  onRefresh,
  isRefreshing,
  onSelectSymbol,
  onOpenChart,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const intradayLookup = useMemo(() => {
    const map = new Map<string, IntradayAssetBias>();
    intradayMap.forEach(item => map.set(item.symbol, item));
    return map;
  }, [intradayMap]);

  const filteredPrices = useMemo(() => {
    return prices.filter(p => {
      if (filterType === 'ALL') return true;
      if (filterType === 'FOREX') return p.asset_type === 'FOREX' || p.symbol === 'USD';
      if (filterType === 'INDICES') return p.asset_type === 'INDEX';
      if (filterType === 'COMMODITIES') return p.symbol === 'XAUUSD' || p.asset_type === 'COMMODITY';
      if (filterType === 'CRYPTO') return p.symbol === 'BTC' || p.asset_type === 'CRYPTO';
      if (filterType === 'BONDS') return p.symbol === 'US10Y' || p.asset_type === 'BOND';
      return true;
    });
  }, [prices, filterType]);

  const getBiasBadgeClass = (bias?: string) => {
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

  return (
    <section className="space-y-4 font-sans" id="market-data-grid-root">
      {/* Header & Asset Class Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="headline-h3 text-[var(--text-primary)]">
              Market surveillance
            </h2>
            <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
              {filteredPrices.length} of {prices.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--bullish)]" />
            <span className="metadata-label text-[9px] text-[var(--text-muted)]">
              Streaming
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenChart && (
            <button
              onClick={() => onOpenChart('US30')}
              className="h-8 px-3 rounded-md text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-section-alt)] flex items-center gap-1.5 transition cursor-pointer"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Chart</span>
            </button>
          )}

          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-[var(--bg-section-alt)]">
            {['ALL', 'COMMODITIES', 'CRYPTO', 'INDICES', 'FOREX', 'BONDS'].map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`h-7 px-2.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  filterType === f
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh prices"
            className="h-8 w-8 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-section-alt)] flex items-center justify-center transition cursor-pointer disabled:opacity-50"
            id="refresh-surveillance-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[var(--accent)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Market Instrument Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {filteredPrices.map(item => {
          const isUnavailable = item.status === 'UNAVAILABLE';
          const isPos = item.change_24h_pct > 0;
          const isNeg = item.change_24h_pct < 0;
          const isBookmarked = watchlistSymbols.includes(item.symbol);
          const biasData = intradayLookup.get(item.symbol);

          // Sparkline points
          const sparkPoints = item.sparkline_1h && item.sparkline_1h.length > 1
            ? item.sparkline_1h
            : [item.price * 0.998, item.price];
          const minSpark = Math.min(...sparkPoints);
          const maxSpark = Math.max(...sparkPoints);
          const sparkRange = maxSpark - minSpark || 1;
          const svgPoints = sparkPoints
            .map((val, idx) => {
              const x = (idx / (sparkPoints.length - 1)) * 64;
              const y = 20 - ((val - minSpark) / sparkRange) * 18;
              return `${x},${y}`;
            })
            .join(' ');

          const formattedPrice = isUnavailable ? (
            'UNAVAILABLE'
          ) : item.symbol === 'US10Y' ? (
            `${item.price.toFixed(3)}%`
          ) : (
            item.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: item.symbol === 'JPY' || item.asset_type === 'FOREX' ? 4 : 2,
            })
          );

          return (
            <div
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className="group rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 hover:border-[var(--active-border)] hover:shadow-[var(--shadow-raised)] transition cursor-pointer flex flex-col justify-between gap-2.5 select-none"
            >
              <div>
                {/* Header: Symbol + Name + Controls */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{item.symbol}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--bg-section-alt)] text-[var(--text-muted)] tracking-wide">
                      {item.asset_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {onOpenChart && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChart(item.tv_symbol || item.symbol);
                        }}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition cursor-pointer"
                        title={`Open TradingView Chart (${item.tv_symbol || item.symbol})`}
                      >
                        <LineChart className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist(item.symbol, item.asset_type);
                      }}
                      className={`p-1.5 rounded-md transition cursor-pointer ${
                        isBookmarked ? 'text-[var(--warning)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-[var(--text-muted)] truncate mb-2" title={item.display_name}>
                  {item.display_name}
                </div>

                {/* Price + 24h Change + Sparkline */}
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums leading-tight">
                      {formattedPrice}
                    </div>
                    {!isUnavailable && (
                      <div
                        className={`flex items-center gap-1 text-[11px] font-semibold tabular-nums mt-0.5 ${
                          isPos ? 'text-[var(--bullish)]' : isNeg ? 'text-[var(--bearish)]' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {isPos ? <TrendingUp className="w-3 h-3" /> : isNeg ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        <span>{isPos ? '+' : ''}{item.change_24h_pct.toFixed(2)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Sparkline curve */}
                  {!isUnavailable && (
                    <svg className="w-16 h-7 shrink-0 overflow-visible opacity-80" viewBox="0 0 64 22">
                      <polyline
                        fill="none"
                        stroke={isPos ? 'var(--bullish)' : isNeg ? 'var(--bearish)' : 'var(--text-muted)'}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={svgPoints}
                      />
                    </svg>
                  )}
                </div>
              </div>

              {/* Intraday Bias Strip */}
              {biasData && (
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="metadata-label text-[9px] text-[var(--text-muted)]">Bias</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${getBiasBadgeClass(biasData.overall_bias)}`}>
                      {biasData.overall_bias}
                    </span>
                  </div>

                  <div className="text-[var(--text-muted)] tabular-nums text-[10px]">
                    Conf <strong className="text-[var(--text-secondary)] font-semibold">{biasData.confidence}%</strong>
                  </div>
                </div>
              )}

              {/* Card Footer: Provenance & Status */}
              <div className="pt-2 border-t text-[10px] flex items-center justify-between text-[var(--text-muted)]" style={{ borderColor: 'var(--border-hairline)' }}>
                <span className="truncate max-w-[110px]">{item.source}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'LIVE' ? 'bg-[var(--bullish)]' : 'bg-[var(--warning)]'}`} />
                  <span className="metadata-label text-[9px]">{item.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

MarketDataGrid.displayName = 'MarketDataGrid';
