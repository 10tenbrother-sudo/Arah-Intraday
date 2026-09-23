import React, { useState } from 'react';
import { UserWatchlist, MarketPrice, User } from '../types';
import { Star, Trash2, Plus, TrendingUp, TrendingDown, Minus, LogIn, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { getUserLimits } from '../lib/plans';

interface WatchlistViewProps {
  watchlist: UserWatchlist[];
  prices: MarketPrice[];
  onRemove: (symbol: string) => void;
  onAdd: (symbol: string, assetType: string) => void;
  onSelectSymbol: (symbol: string) => void;
  user?: User | null;
  onOpenAuth?: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = React.memo(({
  watchlist,
  prices,
  onRemove,
  onAdd,
  onSelectSymbol,
  user,
  onOpenAuth,
}) => {
  const [newSymbol, setNewSymbol] = useState('');
  const [newType, setNewType] = useState('ASSET');

  const limits = getUserLimits(user as any);
  const isAtLimit = watchlist.length >= limits.watchlistLimit;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol) return;
    if (isAtLimit) {
      return;
    }
    onAdd(newSymbol.toUpperCase().trim(), newType);
    setNewSymbol('');
  };

  const commonAssets = ['XAUUSD', 'BTC', 'US30', 'US500', 'US100', 'EUR', 'GBP', 'JPY'];

  return (
    <section className="space-y-5 font-sans">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-3 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="headline-h3 text-[var(--text-primary)]">Watchlist</h2>
            <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
              {watchlist.length} of {limits.watchlistLimit}
            </span>
            {isAtLimit && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning)]">
                Quota reached
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Real-time quotes and 24-hour ranges for the instruments you track.
          </p>
        </div>

        {/* Add custom symbol form */}
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add ticker, e.g. XAUUSD"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            className="bg-[var(--bg-section-alt)] border border-transparent focus:border-[var(--border-strong)] px-3 h-9 rounded-md text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none w-48 transition"
          />
          <button
            type="submit"
            className="px-3.5 h-9 rounded-md bg-[var(--accent)] hover:opacity-90 text-white font-semibold text-xs transition cursor-pointer shadow-[var(--accent-glow)]"
          >
            Add
          </button>
        </form>
      </div>

      {/* Guest Mode Notice */}
      {!user && (
        <div
          className="p-3.5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
          style={{ backgroundColor: 'var(--accent-subtle)' }}
        >
          <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
            <LogIn className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>
              You are browsing as a guest. Sign in to sync this watchlist across devices.
            </span>
          </div>
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 rounded-md bg-[var(--accent)] text-white font-semibold text-[11px] transition cursor-pointer shrink-0 shadow-[var(--accent-glow)]"
            >
              Sign in
            </button>
          )}
        </div>
      )}

      {/* Quick Add Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="metadata-label text-[9px] text-[var(--text-muted)]">Quick add</span>
        {commonAssets.map(sym => {
          const isAdded = watchlist.some(w => w.symbol === sym);
          return (
            <button
              key={sym}
              disabled={isAdded}
              onClick={() => onAdd(sym, 'ASSET')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                isAdded
                  ? 'bg-[var(--bg-section-alt)] text-[var(--text-muted)] cursor-default'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-section-alt)] cursor-pointer'
              }`}
            >
              {isAdded ? `✓ ${sym}` : `+ ${sym}`}
            </button>
          );
        })}
      </div>

      {/* Watchlist Table */}
      {watchlist.length === 0 ? (
        <div className="py-14 text-center text-xs text-[var(--text-muted)]">
          Nothing tracked yet. Add an instrument above to follow its live quote.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-subtle)' }}>
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Instrument</th>
                <th className="text-right">Last</th>
                <th className="text-right">24h change</th>
                <th className="text-right">24h high</th>
                <th className="text-right">24h low</th>
                <th className="text-center">Feed</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map(item => {
                const price = prices.find(p => p.symbol === item.symbol) || item.market_data;
                const isPos = price ? price.change_24h_pct > 0 : false;
                const isNeg = price ? price.change_24h_pct < 0 : false;

                return (
                  <tr key={item.symbol} onClick={() => onSelectSymbol(item.symbol)} className="cursor-pointer">
                    <td>
                      <div className="font-semibold text-[var(--text-primary)]">{item.symbol}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{price?.display_name || item.asset_type}</div>
                    </td>

                    <td className="text-right font-semibold text-[var(--text-primary)] tabular-nums">
                      {price ? price.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                    </td>

                    <td className="text-right tabular-nums">
                      {price ? (
                        <span className={`font-semibold tabular-nums ${
                          isPos ? 'text-[var(--bullish)]' : isNeg ? 'text-[var(--bearish)]' : 'text-[var(--text-muted)]'
                        }`}>
                          {isPos ? '+' : ''}{price.change_24h_pct.toFixed(2)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="text-right text-[var(--text-secondary)] tabular-nums">
                      {price?.high_24h.toFixed(1) || '—'}
                    </td>

                    <td className="text-right text-[var(--text-secondary)] tabular-nums">
                      {price?.low_24h.toFixed(1) || '—'}
                    </td>

                    <td className="text-center">
                      <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-semibold ${
                        price?.status === 'LIVE' ? 'badge-bullish' : 'badge-neutral'
                      }`}>
                        {price?.status || 'SAVED'}
                      </span>
                    </td>

                    <td className="text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(item.symbol);
                        }}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--bearish)] hover:bg-[var(--bg-section-alt)] transition cursor-pointer"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
});

WatchlistView.displayName = 'WatchlistView';
