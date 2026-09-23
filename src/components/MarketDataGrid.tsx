import React, { useState, useMemo } from 'react';
import { MarketPrice, IntradayAssetBias } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Star,
  Activity,
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
    <div className="terminal-panel p-3.5 sm:p-4 space-y-3 font-sans" id="market-data-grid-root">
      {/* Header & Asset Class Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <Activity className="w-3.5 h-3.5 text-[var(--accent)]" />
          <h2 className="metadata-label text-[11px] text-[var(--text-primary)]">
            LIVE MARKET SURVEILLANCE ({prices.length})
          </h2>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--bullish)]" />
            <span className="text-[9px] font-mono font-semibold px-1 py-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[var(--text-secondary)]">
              SYNCED
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs">
          {onOpenChart && (
            <button
              onClick={() => onOpenChart('US30')}
              className="h-6 px-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] flex items-center gap-1 text-[10.5px] font-semibold transition cursor-pointer"
            >
              <LineChart className="w-3 h-3 text-[var(--accent)]" />
              <span>TV CHART</span>
            </button>
          )}

          <div className="flex items-center border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] p-0.5 rounded text-[10.5px]">
            {['ALL', 'COMMODITIES', 'CRYPTO', 'INDICES', 'FOREX', 'BONDS'].map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`h-5 px-1.5 rounded font-semibold transition cursor-pointer ${
                  filterType === f
                    ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh prices"
            className="h-6 w-6 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition cursor-pointer"
            id="refresh-surveillance-btn"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[var(--accent)]' : ''}`} />
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
              className="terminal-panel p-2.5 hover:border-[var(--text-primary)] transition cursor-pointer flex flex-col justify-between space-y-2 select-none"
            >
              <div>
                {/* Header: Symbol + Name + Controls */}
                <div className="flex items-center justify-between mb-1 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[var(--text-primary)]">{item.symbol}</span>
                    <span className="text-[9px] px-1 py-0 rounded border border-[var(--border-subtle)] text-[var(--text-muted)]">
                      {item.asset_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {onOpenChart && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChart(item.tv_symbol || item.symbol);
                        }}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
                        title={`Open TradingView Chart (${item.tv_symbol || item.symbol})`}
                      >
                        <LineChart className="w-3 h-3 text-[var(--accent)]" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist(item.symbol, item.asset_type);
                      }}
                      className={`p-1 rounded transition cursor-pointer ${
                        isBookmarked ? 'text-[var(--warning)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Star className="w-3 h-3" fill={isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-[var(--text-secondary)] truncate mb-1.5" title={item.display_name}>
                  {item.display_name}
                </div>

                {/* Price + 24h Change + Sparkline */}
                <div className="flex items-center justify-between gap-2 mb-2 font-mono">
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                      {formattedPrice}
                    </div>
                    {!isUnavailable && (
                      <div
                        className={`flex items-center gap-1 text-[10.5px] font-semibold tabular-nums mt-0.5 ${
                          isPos ? 'text-[var(--bullish)]' : isNeg ? 'text-[var(--bearish)]' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {isPos ? <TrendingUp className="w-2.5 h-2.5" /> : isNeg ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                        <span>{isPos ? '+' : ''}{item.change_24h_pct.toFixed(2)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Sparkline curve */}
                  {!isUnavailable && (
                    <svg className="w-16 h-6 shrink-0 overflow-visible" viewBox="0 0 64 22">
                      <polyline
                        fill="none"
                        stroke={isPos ? 'var(--bullish)' : isNeg ? 'var(--bearish)' : 'var(--text-muted)'}
                        strokeWidth="1.5"
                        points={svgPoints}
                      />
                    </svg>
                  )}
                </div>

                {/* Intraday Bias Strip */}
                {biasData && (
                  <div className="flex items-center justify-between px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[10px] font-mono">
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--text-muted)] text-[9px]">BIAS:</span>
                      <span className={`px-1 py-0 rounded text-[9px] font-bold ${getBiasBadgeClass(biasData.overall_bias)}`}>
                        {biasData.overall_bias}
                      </span>
                    </div>

                    <div className="text-[var(--text-muted)] tabular-nums text-[9.5px]">
                      CONF: <strong className="text-[var(--text-primary)]">{biasData.confidence}%</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Provenance & Status */}
              <div className="pt-1.5 border-t text-[9px] font-mono flex items-center justify-between text-[var(--text-muted)]" style={{ borderColor: 'var(--border-hairline)' }}>
                <span className="truncate max-w-[100px]">{item.source}</span>
                <div className="flex items-center gap-1">
                  <span className={`w-1 h-1 rounded-full ${item.status === 'LIVE' ? 'bg-[var(--bullish)]' : 'bg-[var(--warning)]'}`} />
                  <span>{item.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

MarketDataGrid.displayName = 'MarketDataGrid';
