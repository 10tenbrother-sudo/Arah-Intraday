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
    <div className="terminal-panel p-4 space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--accent)] rounded-xs" />
            <h2 className="section-title text-xs sm:text-sm text-[var(--text-primary)]">
              PORTFOLIO & WATCHLIST ({watchlist.length}/{limits.watchlistLimit})
            </h2>
            {isAtLimit && (
              <span className="badge-warning text-[9.5px]">
                QUOTA REACHED
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-[var(--text-secondary)] mt-1">
            Real-time price streams and correlation tracking for user-curated assets.
          </p>
        </div>

        {/* Add custom symbol form */}
        <form onSubmit={handleAdd} className="flex items-center gap-1.5 font-mono">
          <input
            type="text"
            placeholder="Add Ticker (e.g. XAUUSD)"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            className="bg-[var(--bg-section-alt)] border border-[var(--border-subtle)] px-2.5 py-1 rounded text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none w-44"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded bg-[var(--accent)] hover:opacity-90 text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            + ADD
          </button>
        </form>
      </div>

      {/* Guest Mode Notice */}
      {!user && (
        <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <LogIn className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>
              Guest mode active: Sign in to sync your personal watchlist across devices and save to Cloud.
            </span>
          </div>
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1 rounded bg-[var(--accent)] text-white font-bold text-[11px] transition cursor-pointer shrink-0"
            >
              AUTHENTICATE
            </button>
          )}
        </div>
      )}

      {/* Quick Add Pills */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
        <span className="metadata-label text-[10px] text-[var(--text-muted)]">QUICK ADD:</span>
        {commonAssets.map(sym => {
          const isAdded = watchlist.some(w => w.symbol === sym);
          return (
            <button
              key={sym}
              disabled={isAdded}
              onClick={() => onAdd(sym, 'ASSET')}
              className={`px-2 py-0.5 rounded border text-[11px] transition cursor-pointer ${
                isAdded
                  ? 'bg-[var(--bg-section-alt)] text-[var(--text-muted)] border-[var(--border-subtle)] opacity-60 cursor-default'
                  : 'bg-[var(--bg-section-alt)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
              }`}
            >
              {isAdded ? `✓ ${sym}` : `+ ${sym}`}
            </button>
          );
        })}
      </div>

      {/* Watchlist Table */}
      {watchlist.length === 0 ? (
        <div className="py-12 text-center text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-section-alt)] rounded border border-[var(--border-subtle)]">
          Your personal watchlist is empty. Add instruments above to monitor live quotes and spreads.
        </div>
      ) : (
        <div className="rounded border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="table-header border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <th className="py-2 px-3">SYMBOL / ASSET</th>
                  <th className="py-2 px-3 text-right">LAST PRICE</th>
                  <th className="py-2 px-3 text-right">24H CHANGE</th>
                  <th className="py-2 px-3 text-right">24H HIGH</th>
                  <th className="py-2 px-3 text-right">24H LOW</th>
                  <th className="py-2 px-3 text-center">FEED</th>
                  <th className="py-2 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                {watchlist.map(item => {
                  const price = prices.find(p => p.symbol === item.symbol) || item.market_data;
                  const isPos = price ? price.change_24h_pct > 0 : false;
                  const isNeg = price ? price.change_24h_pct < 0 : false;

                  return (
                    <tr
                      key={item.symbol}
                      onClick={() => onSelectSymbol(item.symbol)}
                      className="table-row transition cursor-pointer"
                    >
                      <td className="py-2 px-3">
                        <div className="font-bold text-[var(--text-primary)] text-sm">{item.symbol}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{price?.display_name || item.asset_type}</div>
                      </td>

                      <td className="py-2 px-3 text-right font-bold text-[var(--text-primary)] tabular-nums">
                        {price ? price.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                      </td>

                      <td className="py-2 px-3 text-right tabular-nums">
                        {price ? (
                          <span className={`font-bold tabular-nums ${
                            isPos ? 'text-[var(--bullish)]' : isNeg ? 'text-[var(--bearish)]' : 'text-[var(--text-muted)]'
                          }`}>
                            {isPos ? '+' : ''}{price.change_24h_pct.toFixed(2)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-2 px-3 text-right text-[var(--text-secondary)] tabular-nums">
                        {price?.high_24h.toFixed(1) || '—'}
                      </td>

                      <td className="py-2 px-3 text-right text-[var(--text-secondary)] tabular-nums">
                        {price?.low_24h.toFixed(1) || '—'}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                          price?.status === 'LIVE' ? 'badge-bullish' : 'badge-neutral'
                        }`}>
                          {price?.status || 'SAVED'}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(item.symbol);
                          }}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--bearish)] hover:bg-[var(--bg-section-alt)] transition cursor-pointer"
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
        </div>
      )}
    </div>
  );
});

WatchlistView.displayName = 'WatchlistView';
