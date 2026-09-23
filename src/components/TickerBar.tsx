import React from 'react';
import { MarketPrice } from '../types';
import { TrendingUp, TrendingDown, Minus, LineChart } from 'lucide-react';

interface TickerBarProps {
  prices: MarketPrice[];
  selectedSymbol: string | null;
  onSelectSymbol: (symbol: string) => void;
  onOpenChart?: (symbol: string) => void;
}

export const TickerBar: React.FC<TickerBarProps> = React.memo(({
  prices,
  selectedSymbol,
  onSelectSymbol,
  onOpenChart,
}) => {
  return (
    <div
      className="border-b overflow-x-auto no-scrollbar py-1 px-3 sm:px-4 flex items-center gap-2 shrink-0 select-none text-xs font-mono"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
      id="market-ticker-strip"
    >
      {/* Feed Label */}
      <div className="flex items-center gap-1.5 shrink-0 pr-2.5 border-r" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--bullish)]" />
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
          STREAM
        </span>
      </div>

      {/* Non-Delayed Charts Action */}
      {onOpenChart && (
        <button
          onClick={() => onOpenChart('US30')}
          className="flex items-center gap-1.5 h-6 px-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-[10.5px] font-mono shrink-0 transition cursor-pointer"
          title="Open Non-Delayed Institutional Charts (US30, SPX500, BTCUSD, DXY, US100)"
        >
          <LineChart className="w-3 h-3 text-[var(--accent)]" />
          <span className="font-semibold">NON-DELAYED CHARTS</span>
        </button>
      )}

      {/* Realtime Asset Items */}
      <div className="flex items-center gap-1.5 shrink-0">
        {prices.map(item => {
          const isSelected = selectedSymbol === item.symbol;
          const isPositive = item.change_24h_pct > 0;
          const isNegative = item.change_24h_pct < 0;

          // Decimal precision based on asset class
          const formattedPrice = item.symbol === 'US10Y'
            ? `${item.price.toFixed(3)}%`
            : item.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: item.symbol === 'JPY' || item.asset_type === 'FOREX' ? 4 : 2,
              });

          return (
            <button
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className={`flex items-center gap-2 h-6 px-2 rounded border font-mono transition cursor-pointer shrink-0 tabular-nums ${
                isSelected
                  ? 'border-[var(--active-border)] bg-[var(--active-bg)] text-[var(--active-text)] shadow-xs ring-1 ring-[var(--accent)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:border-[var(--border-strong)] text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="font-bold tracking-tight">{item.symbol}</span>
                <span
                  className={`w-1 h-1 rounded-full ${
                    item.status === 'LIVE'
                      ? 'bg-[var(--bullish)]'
                      : item.status === 'DELAYED'
                      ? 'bg-[var(--warning)]'
                      : 'bg-[var(--bearish)]'
                  }`}
                  title={`${item.status} · ${item.source}`}
                />
              </div>

              <span className="font-semibold tabular-nums text-[11px]">{formattedPrice}</span>

              <div
                className={`flex items-center gap-0.5 text-[10.5px] font-bold tabular-nums ${
                  isPositive
                    ? 'text-[var(--bullish)]'
                    : isNegative
                    ? 'text-[var(--bearish)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-2.5 h-2.5" />
                ) : isNegative ? (
                  <TrendingDown className="w-2.5 h-2.5" />
                ) : (
                  <Minus className="w-2.5 h-2.5" />
                )}
                <span>
                  {isPositive ? '+' : ''}
                  {item.change_24h_pct.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

TickerBar.displayName = 'TickerBar';
