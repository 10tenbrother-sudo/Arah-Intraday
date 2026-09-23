import React from 'react';
import { MarketEvent } from '../types';
import { Layers, Clock, ArrowRight, Flame, Zap, Newspaper } from 'lucide-react';
import { getCurrencyFlagUrl } from '../lib/assets';

interface EventCardProps {
  event: MarketEvent;
  onClick: () => void;
  isSelected?: boolean;
}

export const EventCard: React.FC<EventCardProps> = React.memo(({ event, onClick, isSelected }) => {
  const getImpactBadgeClass = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'badge-bearish';
      case 'HIGH':
        return 'badge-warning';
      case 'MEDIUM':
        return 'badge-bullish';
      default:
        return 'badge-neutral';
    }
  };

  const timeAgo = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return 'recently';
    const diff = Math.floor((Date.now() - time) / 1000);
    if (diff <= 15) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div
      onClick={onClick}
      className={`terminal-panel p-3.5 transition cursor-pointer flex flex-col justify-between space-y-2.5 ${
        isSelected
          ? 'border-[var(--text-primary)] ring-1 ring-[var(--text-primary)]'
          : 'hover:border-[var(--text-primary)]'
      }`}
    >
      <div>
        {/* Top Meta Bar */}
        <div className="flex items-center justify-between gap-2 mb-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="metadata-label text-[10px] text-[var(--text-muted)]">
              {event.primary_category}
            </span>
            <span className="text-[var(--border-subtle)]">·</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ${getImpactBadgeClass(event.impact_level)}`}>
              {event.impact_level}
            </span>
            {event.source_count > 1 && (
              <span className="text-[9.5px] px-1 py-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[var(--text-secondary)] font-semibold">
                {event.source_count} SOURCES
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] shrink-0">
            <Clock className="w-3 h-3 text-[var(--accent)]" />
            <span>{timeAgo(event.first_detected_at)}</span>
          </div>
        </div>

        {/* Event Title */}
        <h3 className="headline-h3 text-sm text-[var(--text-primary)] transition leading-snug mb-1.5 line-clamp-2">
          {event.title}
        </h3>

        {/* Event Summary */}
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-2.5 font-sans">
          {event.summary}
        </p>

        {/* Correlated Pair Impacts & Directional Bias */}
        {(event.pair_impacts || []).length > 0 && (
          <div className="mb-2 p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)]">
            <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)] mb-1 uppercase tracking-wider">
              <span>PAIR TRANSMISSION:</span>
              <span className="text-[var(--accent)] font-semibold">DIRECT BIAS</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {event.pair_impacts!.slice(0, 4).map((pi) => {
                const isBull = pi.bias === 'BULLISH';
                const isBear = pi.bias === 'BEARISH';
                const c1 = pi.pair.slice(0, 3);
                const c2 = pi.pair.slice(3, 6);

                return (
                  <div
                    key={pi.pair}
                    title={`${pi.displayName || pi.pair}: ${pi.bias} (${pi.mechanism || pi.rationale})`}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold border transition ${
                      isBull
                        ? 'badge-bullish'
                        : isBear
                        ? 'badge-bearish'
                        : 'badge-neutral'
                    }`}
                  >
                    {pi.pair.length === 6 && (
                      <div className="flex items-center -space-x-1 shrink-0">
                        <img
                          src={getCurrencyFlagUrl(c1)}
                          alt={c1}
                          referrerPolicy="no-referrer"
                          className="w-3 h-2 object-cover rounded-xs border border-[var(--border-subtle)]"
                        />
                        <img
                          src={getCurrencyFlagUrl(c2)}
                          alt={c2}
                          referrerPolicy="no-referrer"
                          className="w-3 h-2 object-cover rounded-xs border border-[var(--border-subtle)]"
                        />
                      </div>
                    )}
                    <span>{pi.pair}</span>
                    <span>{isBull ? '▲' : isBear ? '▼' : '●'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="pt-2 border-t font-mono text-[10px] flex items-center justify-between text-[var(--text-muted)]" style={{ borderColor: 'var(--border-hairline)' }}>
        <span className="truncate max-w-[140px] uppercase">
          {event.source_names?.[0] || 'Institutional Wire'}
        </span>
        <span className="text-[var(--accent)] font-semibold flex items-center gap-1">
          <span>INTEL DOSSIER</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </span>
      </div>
    </div>
  );
});

EventCard.displayName = 'EventCard';
