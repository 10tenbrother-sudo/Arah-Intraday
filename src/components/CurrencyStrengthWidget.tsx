import React, { useState, useEffect } from 'react';
import { CurrencyStrength, HistoricalCurrencyComparison } from '../types';
import {
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  LineChart,
  BarChart3,
} from 'lucide-react';
import { MetricTooltip, MetricInfoIcon } from './Tooltip';
import { api } from '../lib/api';
import { CurrencyStrengthChart } from './CurrencyStrengthChart';

interface CurrencyStrengthWidgetProps {
  strengths: CurrencyStrength[];
  onRefresh: () => void;
  isRefreshing: boolean;
  onSelectCurrency?: (currency: string) => void;
  initialTab?: 'CHART' | 'LIVE' | 'COMPARISON' | 'ARCHIVE';
}

export const CurrencyStrengthWidget: React.FC<CurrencyStrengthWidgetProps> = React.memo(({
  strengths,
  onRefresh,
  isRefreshing,
  onSelectCurrency,
  initialTab = 'CHART',
}) => {
  const [subTab, setSubTab] = useState<'CHART' | 'LIVE' | 'COMPARISON' | 'ARCHIVE'>(initialTab);
  const [comparisons, setComparisons] = useState<HistoricalCurrencyComparison[]>([]);
  const [archiveDate, setArchiveDate] = useState<string>('2026-09-19');
  const [archiveStrengths, setArchiveStrengths] = useState<any[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState<boolean>(false);

  // Load historical comparisons when tab switches
  useEffect(() => {
    if (subTab === 'COMPARISON' && comparisons.length === 0) {
      api.getHistoricalCurrencyComparison()
        .then(res => {
          if (res.comparisons) setComparisons(res.comparisons);
        })
        .catch(err => console.error('[CurrencyStrength] Comparison load error:', err));
    }
  }, [subTab, comparisons.length]);

  // Load archive date strengths when archiveDate changes
  useEffect(() => {
    if (subTab === 'ARCHIVE') {
      setIsLoadingArchive(true);
      api.getDailySnapshotDetail(archiveDate)
        .then(res => {
          if (res.snapshot?.currency_strength) {
            setArchiveStrengths(res.snapshot.currency_strength);
          }
        })
        .catch(err => console.error('[CurrencyStrength] Archive date load error:', err))
        .finally(() => setIsLoadingArchive(false));
    }
  }, [subTab, archiveDate]);

  const getDirectionBadgeClass = (dir: string) => {
    switch (dir) {
      case 'STRONG_BUY':
      case 'BUY':
        return 'badge-bullish';
      case 'STRONG_SELL':
      case 'SELL':
        return 'badge-bearish';
      case 'NEUTRAL':
      default:
        return 'badge-neutral';
    }
  };

  return (
    <div className="terminal-panel p-3.5 flex flex-col h-full space-y-3 font-sans" id="currency-strength-widget-root">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-2.5 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
        <div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--accent)]" />
            <h2 className="metadata-label text-[10.5px] text-[var(--text-primary)]">
              CURRENCY STRENGTH G8
            </h2>
            <MetricInfoIcon term="CURRENCY_STRENGTH" position="bottom" />
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[9.5px] font-mono text-[var(--text-muted)]">
            <span>FEED:</span>
            <a
              href="https://currency-strength.com/en/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline flex items-center gap-0.5"
            >
              <span>currency-strength.com</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh currency strength scores"
          className="h-6 w-6 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[var(--accent)]' : ''}`} />
        </button>
      </div>

      {/* Mode Sub-Tabs */}
      <div className="grid grid-cols-4 border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] p-0.5 rounded text-[10.5px] font-mono">
        <button
          onClick={() => setSubTab('CHART')}
          className={`py-1 rounded font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
            subTab === 'CHART'
              ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <LineChart className="w-3 h-3" />
          <span>CHART</span>
        </button>
        <button
          onClick={() => setSubTab('LIVE')}
          className={`py-1 rounded font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
            subTab === 'LIVE'
              ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BarChart3 className="w-3 h-3" />
          <span>METER</span>
        </button>
        <button
          onClick={() => setSubTab('COMPARISON')}
          className={`py-1 rounded font-semibold transition cursor-pointer ${
            subTab === 'COMPARISON'
              ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          DELTA
        </button>
        <button
          onClick={() => setSubTab('ARCHIVE')}
          className={`py-1 rounded font-semibold transition cursor-pointer ${
            subTab === 'ARCHIVE'
              ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          ARCHIVE
        </button>
      </div>

      {/* VIEW 0: AUTHENTIC G8 MULTI-LINE TREND CHART */}
      {subTab === 'CHART' && (
        <div className="flex-1 flex flex-col min-h-[280px]">
          <CurrencyStrengthChart
            strengths={strengths}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            onSelectCurrency={onSelectCurrency}
          />
        </div>
      )}

      {/* VIEW 1: LIVE FLOW METER */}
      {subTab === 'LIVE' && (
        <div className="space-y-1.5 flex-1 overflow-y-auto font-mono text-xs">
          {strengths.map(item => {
            const pct = Math.min(100, Math.max(5, (item.strength_score / 10) * 100));

            return (
              <div
                key={item.currency}
                onClick={() => onSelectCurrency?.(item.currency)}
                className="p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:border-[var(--border-strong)] transition cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted)] font-bold">
                      #{item.rank}
                    </span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {item.currency}
                    </span>
                    <span className={`text-[8.5px] px-1 py-0 rounded border font-semibold ${getDirectionBadgeClass(item.change_direction)}`}>
                      {item.change_direction.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.raw_delta !== undefined && (
                      <span className={`text-[10px] font-bold ${item.raw_delta >= 0 ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}`}>
                        {item.raw_delta >= 0 ? '+' : ''}{item.raw_delta.toFixed(2)}
                      </span>
                    )}
                    <span className="font-bold text-[var(--text-primary)] text-sm">
                      {item.strength_score.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">/ 10</span>
                  </div>
                </div>

                {/* Clean hairline meter bar */}
                <div className="h-1.5 w-full rounded-full overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.strength_score >= 6.0
                        ? 'bg-[var(--bullish)]'
                        : item.strength_score <= 3.5
                        ? 'bg-[var(--bearish)]'
                        : 'bg-[var(--text-muted)]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: HISTORICAL COMPARISON */}
      {subTab === 'COMPARISON' && (
        <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs">
          {comparisons.map(c => {
            const isStrengthening = c.trend === 'STRENGTHENING';
            const isWeakening = c.trend === 'WEAKENING';

            return (
              <div
                key={c.currency}
                className="p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--text-primary)]">{c.currency}</span>
                  <span className={`text-[9px] px-1 py-0 rounded border font-semibold ${
                    isStrengthening ? 'badge-bullish' : isWeakening ? 'badge-bearish' : 'badge-neutral'
                  }`}>
                    {c.trend}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 text-[10px] tabular-nums p-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div>
                    <span className="text-[9px] text-[var(--text-muted)] block">TODAY</span>
                    <span className="font-bold text-[var(--text-primary)]">{c.today_score.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--text-muted)] block">Y-DAY</span>
                    <span>{c.yesterday_score.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--text-muted)] block">3-DAY</span>
                    <span>{c.three_day_score.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--text-muted)] block">7-DAY</span>
                    <span>{c.seven_day_score.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                  <span>Δ Y-Day: <strong className={c.delta_yesterday >= 0 ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}>{c.delta_yesterday >= 0 ? '+' : ''}{c.delta_yesterday.toFixed(2)}</strong></span>
                  <span>Δ 7D: <strong className={c.delta_7d >= 0 ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'}>{c.delta_7d >= 0 ? '+' : ''}{c.delta_7d.toFixed(2)}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: ARCHIVE */}
      {subTab === 'ARCHIVE' && (
        <div className="flex-1 overflow-y-auto space-y-2 text-xs font-mono">
          <div className="p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] flex items-center justify-between gap-2">
            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-semibold">
              <Calendar className="w-3 h-3 text-[var(--accent)]" />
              <span>DATE:</span>
            </span>
            <input
              type="date"
              value={archiveDate}
              onChange={e => e.target.value && setArchiveDate(e.target.value)}
              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2 py-0.5 text-xs text-[var(--text-primary)] font-mono outline-none"
            />
          </div>

          {isLoadingArchive ? (
            <div className="p-4 text-center text-[var(--text-muted)] text-xs">
              Loading archive...
            </div>
          ) : (
            <div className="space-y-1">
              {archiveStrengths.map((item: any) => (
                <div
                  key={item.currency}
                  className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] flex items-center justify-between text-xs tabular-nums"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted)] font-bold">#{item.rank}</span>
                    <span className="font-bold text-[var(--text-primary)]">{item.currency}</span>
                  </div>
                  <span className="font-bold text-[var(--text-primary)]">
                    {Number(item.score).toFixed(1)} / 10
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Relative Currency Pairing Quick Insight */}
      {strengths.length >= 2 && subTab === 'LIVE' && (
        <div className="pt-2 border-t text-[10px] font-mono text-[var(--text-muted)]" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="flex items-center justify-between text-[var(--text-primary)] font-bold mb-0.5">
            <span>DIVERGENCE LEAD:</span>
            <span className="text-[var(--accent)]">
              {strengths[0]?.currency} vs {strengths[strengths.length - 1]?.currency}
            </span>
          </div>
          <p className="leading-tight text-[var(--text-secondary)] font-sans">
            Score disparity of {(strengths[0]?.strength_score - strengths[strengths.length - 1]?.strength_score).toFixed(1)} points signals cleanest trending momentum.
          </p>
        </div>
      )}
    </div>
  );
});

CurrencyStrengthWidget.displayName = 'CurrencyStrengthWidget';
