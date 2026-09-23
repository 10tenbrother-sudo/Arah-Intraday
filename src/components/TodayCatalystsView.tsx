import React, { useState, useMemo } from 'react';
import {
  Zap,
  Clock,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  BarChart2,
} from 'lucide-react';
import { TodayCatalyst, ImpactLevel } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { EmptyState } from './shared/EmptyState';

interface TodayCatalystsViewProps {
  catalysts: TodayCatalyst[];
  onRefresh: () => void;
  isRefreshing: boolean;
  onSelectAsset?: (symbol: string) => void;
  onOpenChart?: (symbol: string) => void;
}

export const TodayCatalystsView: React.FC<TodayCatalystsViewProps> = React.memo(({
  catalysts,
  onRefresh,
  isRefreshing,
  onSelectAsset,
  onOpenChart,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UPCOMING' | 'RELEASED'>('ALL');
  const [filterImportance, setFilterImportance] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return catalysts.filter(c => {
      if (filterStatus === 'UPCOMING' && c.status !== 'UPCOMING') return false;
      if (filterStatus === 'RELEASED' && c.status !== 'RELEASED') return false;
      if (filterImportance === 'CRITICAL' && c.importance !== 'CRITICAL') return false;
      if (filterImportance === 'HIGH' && c.importance !== 'CRITICAL' && c.importance !== 'HIGH') return false;
      return true;
    });
  }, [catalysts, filterStatus, filterImportance]);

  const stats = useMemo(() => {
    let upcoming = 0;
    let released = 0;
    let critical = 0;
    catalysts.forEach(c => {
      if (c.status === 'UPCOMING') upcoming++;
      if (c.status === 'RELEASED') released++;
      if (c.importance === 'CRITICAL') critical++;
    });
    return { total: catalysts.length, upcoming, released, critical };
  }, [catalysts]);

  const formatSurpriseBadge = (surprise: string | null) => {
    if (!surprise) return null;
    const isPositive = surprise.includes('BEAT') || surprise.startsWith('+');
    const isNegative = surprise.includes('MISS') || surprise.startsWith('-');

    if (isPositive) {
      return (
        <span className="badge-bullish text-[10px] font-mono tabular-nums flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3" />
          {surprise}
        </span>
      );
    }
    if (isNegative) {
      return (
        <span className="badge-bearish text-[10px] font-mono tabular-nums flex items-center gap-1">
          <ArrowDownRight className="w-3 h-3" />
          {surprise}
        </span>
      );
    }
    return (
      <span className="badge-neutral text-[10px] font-mono tabular-nums">
        {surprise}
      </span>
    );
  };

  const formatCountdown = (dateUtc: string) => {
    const diff = new Date(dateUtc).getTime() - Date.now();
    if (diff > 0) {
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (hours > 0) return `In ${hours}h ${mins}m`;
      return `In ${mins}m`;
    } else {
      const pastMin = Math.floor(Math.abs(diff) / 60000);
      if (pastMin < 60) return `${pastMin}m ago`;
      const pastHours = Math.floor(pastMin / 60);
      return `${pastHours}h ago`;
    }
  };

  return (
    <div className="space-y-4 font-sans" id="today-catalysts-root">
      {/* 1. Header Ribbon */}
      <div className="terminal-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--accent)] rounded-xs" />
            <h2 className="section-title text-sm sm:text-base text-[var(--text-primary)]">
              TODAY'S KEY CATALYSTS
            </h2>
            <span className="badge-warning text-[9.5px]">
              CURRENT SESSION
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] max-w-2xl font-mono">
            High-impact economic data releases, rate decisions, and central bank speeches scheduled for today with surprise tracking and transmission analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">TODAY:</span>
            <span className="text-[var(--text-primary)] font-bold">{stats.upcoming} Upcoming</span>
            <span className="text-[var(--border-strong)]">|</span>
            <span className="text-[var(--bullish)] font-bold">{stats.released} Released</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 h-8 px-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[var(--text-primary)] hover:border-[var(--text-primary)] text-xs font-mono font-medium transition cursor-pointer"
            id="refresh-today-catalysts-btn"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[var(--accent)]' : ''}`} />
            <span>SYNC</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Ribbon */}
      <div className="terminal-panel p-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="metadata-label text-[10px] text-[var(--text-muted)] mr-1">STATUS:</span>
          {(['ALL', 'UPCOMING', 'RELEASED'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`h-7 px-2.5 rounded-xs text-[11px] font-mono font-medium transition cursor-pointer ${
                filterStatus === st
                  ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] font-bold shadow-xs'
                  : 'bg-[var(--bg-section-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="metadata-label text-[10px] text-[var(--text-muted)] mr-1">SEVERITY:</span>
          {(['ALL', 'CRITICAL', 'HIGH'] as const).map(imp => (
            <button
              key={imp}
              onClick={() => setFilterImportance(imp)}
              className={`h-7 px-2.5 rounded-xs text-[11px] font-mono font-medium transition cursor-pointer ${
                filterImportance === imp
                  ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] font-bold shadow-xs'
                  : 'bg-[var(--bg-section-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
              }`}
            >
              {imp}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Catalyst Cards List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Zap className="w-6 h-6 text-[var(--text-muted)]" />}
            title="No Catalysts Matching Filter"
            description="No economic releases or events match the currently selected criteria."
            action={{
              label: 'Reset Filters',
              onClick: () => {
                setFilterStatus('ALL');
                setFilterImportance('ALL');
              },
            }}
          />
        ) : (
          filtered.map(item => {
            const isExpanded = expandedId === item.id;
            const isCritical = item.importance === 'CRITICAL';
            const isHigh = item.importance === 'HIGH';

            return (
              <div
                key={item.id}
                id={`catalyst-card-${item.id}`}
                className="terminal-panel p-4 space-y-3 transition"
              >
                {/* Top Row: Currency, Time, Event Name, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[var(--text-primary)]">
                      {item.currency}
                    </span>

                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span>{item.event_name}</span>
                        <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          isCritical
                            ? 'badge-bearish'
                            : isHigh
                            ? 'badge-warning'
                            : 'badge-neutral'
                        }`}>
                          {item.importance}
                        </span>
                      </h3>
                      <div className="text-[11px] font-mono text-[var(--text-secondary)] flex items-center gap-2 mt-0.5 flex-wrap">
                        <Clock className="w-3 h-3 text-[var(--accent)]" />
                        <span>
                          {new Date(item.date_time_utc).toLocaleDateString('en-US', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })},{' '}
                          <strong className="text-[var(--text-primary)] font-bold">
                            {new Date(item.date_time_utc).toLocaleTimeString('en-US', {
                              hour12: false,
                              hour: '2-digit',
                              minute: '2-digit',
                            })} UTC
                          </strong>
                        </span>
                        <span>•</span>
                        <span className="text-[var(--accent)] font-semibold">{formatCountdown(item.date_time_utc)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      item.status === 'RELEASED'
                        ? 'badge-bullish'
                        : 'badge-warning'
                    }`}>
                      {item.status}
                    </span>

                    {item.surprise && formatSurpriseBadge(item.surprise)}
                  </div>
                </div>

                {/* Macro Release Metrics: Actual / Forecast / Previous / Surprise / Change */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 rounded p-2.5 border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-center font-mono text-xs">
                  <div>
                    <div className="metadata-label text-[9.5px] text-[var(--text-muted)]">ACTUAL</div>
                    <div className={`font-bold text-sm tabular-nums ${item.actual ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                      {item.actual ?? '—'}
                    </div>
                  </div>

                  <div>
                    <div className="metadata-label text-[9.5px] text-[var(--text-muted)]">FORECAST</div>
                    <div className="text-[var(--text-secondary)] text-sm font-medium tabular-nums">{item.forecast ?? '—'}</div>
                  </div>

                  <div>
                    <div className="metadata-label text-[9.5px] text-[var(--text-muted)]">PREVIOUS</div>
                    <div className="text-[var(--text-muted)] text-sm tabular-nums">{item.previous ?? '—'}</div>
                  </div>

                  <div>
                    <div className="metadata-label text-[9.5px] text-[var(--text-muted)]">SURPRISE</div>
                    <div className="font-semibold text-[var(--text-primary)]">{item.surprise ?? '—'}</div>
                  </div>

                  <div>
                    <div className="metadata-label text-[9.5px] text-[var(--text-muted)]">CHANGE</div>
                    <div className="text-[var(--text-secondary)] font-medium tabular-nums">{item.change ?? '—'}</div>
                  </div>
                </div>

                {/* Related Assets (Clickable) */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                  <span className="metadata-label text-[10px] text-[var(--text-muted)]">AFFECTED ASSETS:</span>
                  {item.related_assets.map(asset => (
                    <button
                      key={asset}
                      onClick={() => {
                        onSelectAsset?.(asset);
                        onOpenChart?.(asset);
                      }}
                      className="px-2 py-0.5 rounded bg-[var(--bg-section-alt)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] border border-[var(--border-subtle)] text-[11px] transition cursor-pointer flex items-center gap-1"
                      title={`Inspect ${asset}`}
                    >
                      <span>{asset}</span>
                      <BarChart2 className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  ))}
                </div>

                {/* Actual Market Reaction & Fundamental Implication */}
                <div className="rounded p-2.5 border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] space-y-1.5 text-xs">
                  <div>
                    <span className="metadata-label text-[10px] text-[var(--accent)] font-semibold block mb-0.5">
                      {item.status === 'RELEASED' ? 'ACTUAL MARKET REACTION:' : 'TRANSMISSION MECHANISM:'}
                    </span>
                    <p className="text-[var(--text-primary)] leading-relaxed font-sans">
                      {item.actual_market_reaction}
                    </p>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--border-hairline)' }}>
                      <span className="metadata-label text-[10px] text-[var(--text-muted)] block">
                        FUNDAMENTAL IMPLICATION:
                      </span>
                      <p className="text-[var(--text-secondary)] leading-relaxed font-sans">
                        {item.fundamental_implication}
                      </p>
                      <div className="text-[10px] font-mono text-[var(--text-muted)] pt-1 flex items-center justify-between">
                        <span>Source: {item.source}</span>
                        <span>
                          Updated:{' '}
                          {new Date(item.last_updated).toLocaleTimeString('en-US', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}{' '}
                          UTC
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expand / Collapse Action */}
                <div className="flex items-center justify-end text-xs font-mono">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition cursor-pointer flex items-center gap-1 text-[11px]"
                  >
                    <span>{isExpanded ? 'Hide Implication' : 'Deep Dive Implication'}</span>
                    <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

TodayCatalystsView.displayName = 'TodayCatalystsView';
