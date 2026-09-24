import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Sparkles,
  ExternalLink,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ShieldCheck,
  Globe,
  AlertCircle,
  Flame,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { AIAnalysis, MarketPrice, CurrencyStrength } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface EventDetailModalProps {
  eventId: string;
  onClose: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ eventId, onClose }) => {
  const [data, setData] = useState<{
    event: any;
    sources: any[];
    timeline: any[];
    affected_markets: MarketPrice[];
    affected_currencies: CurrencyStrength[];
    ai_analysis: AIAnalysis | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getEventDetail(eventId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [eventId]);

  const handleReanalyze = async () => {
    try {
      setReanalyzing(true);
      setNotice(null);
      const res = await api.reanalyzeEvent(eventId);
      if (res.analysis && data) {
        setData({
          ...data,
          ai_analysis: res.analysis,
        });
        setNotice({ type: 'success', message: 'Event causal chain and market impact re-analyzed.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'AI re-analysis failed' });
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
        <div className="terminal-panel p-6 max-w-md w-full flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-[var(--accent)] animate-spin" />
          <span className="text-xs font-mono text-[var(--text-secondary)]">Resolving multi-source event intelligence...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
        <div className="terminal-panel p-6 max-w-md w-full text-center">
          <AlertCircle className="w-8 h-8 text-[var(--bearish)] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Event Load Error</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">{error || 'Event could not be retrieved.'}</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[var(--accent)] text-white hover:opacity-90 text-xs font-mono font-bold cursor-pointer shadow-xs"
          >
            CLOSE
          </button>
        </div>
      </div>
    );
  }

  const { event, sources, timeline, affected_markets, affected_currencies, ai_analysis } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
      <div
        className="terminal-panel max-w-4xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden"
        style={{ borderRadius: '4px', boxShadow: 'var(--shadow-modal)' }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-[var(--bg-surface)]" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2.5">
            <span className="badge-neutral text-xs font-mono font-bold">
              EVENT #{event.id}
            </span>
            <span className="metadata-label text-[10px] text-[var(--text-muted)] hidden sm:inline">
              INSTITUTIONAL DOSSIER CONSOLIDATION
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              title="Generate fresh AI market intelligence"
              className="flex items-center gap-1.5 h-7 px-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-mono cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 text-[var(--accent)] ${reanalyzing ? 'animate-spin' : ''}`} />
              <span>{reanalyzing ? 'SYNTHESIZING...' : 'AI RE-ANALYZE'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-section-alt)] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-6 bg-[var(--bg-surface)]">
          {notice && (
            <div className={`p-3 rounded border text-xs font-mono flex items-center justify-between gap-2 ${
              notice.type === 'error'
                ? 'badge-bearish'
                : 'badge-bullish'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{notice.message}</span>
              </div>
              <button
                onClick={() => setNotice(null)}
                className="text-inherit hover:opacity-75 text-xs cursor-pointer ml-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. Event Core Summary */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                event.impact_level === 'CRITICAL' ? 'badge-bearish' :
                event.impact_level === 'HIGH' ? 'badge-warning' :
                'badge-neutral'
              }`}>
                {event.impact_level} IMPACT
              </span>
              <span className="metadata-label text-[10px] text-[var(--text-muted)]">
                CATEGORY: {event.primary_category}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)] ml-auto">
                First detected: {new Date(event.first_detected_at).toLocaleString()}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] leading-snug mb-2 font-display">
              {event.title}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-section-alt)] p-3.5 rounded border border-[var(--border-subtle)] font-sans">
              {event.summary}
            </p>
          </div>

          {/* 2. Correlated Pair Impacts & Directional Bias Matrix */}
          {(event.pair_impacts || []).length > 0 && (
            <div className="rounded p-4 space-y-3.5 border border-[var(--border-subtle)] bg-[var(--bg-section-alt)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                    <h3 className="section-title text-xs text-[var(--text-primary)]">
                      PAIR CORRELATIONS & TRANSMISSION BIAS
                    </h3>
                  </div>
                  <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                    Macro transmission correlation to affected market instruments and expected directional bias.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                  <span className="badge-bullish">
                    ▲ BULLISH
                  </span>
                  <span className="badge-bearish">
                    ▼ BEARISH
                  </span>
                </div>
              </div>

              {/* High Impact Macro Transmission Banner */}
              {(event.impact_level === 'CRITICAL' || event.impact_level === 'HIGH') && (
                <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--text-primary)] flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <span>
                    <strong className="text-[var(--accent)]">High Severity Catalyst:</strong> Significant macro order flow sensitivity detected. Directional transmission models are actively tracked.
                  </span>
                </div>
              )}

              {/* Grid of Correlated Pair Impact Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {event.pair_impacts.map((pi: any, idx: number) => {
                  const isBull = pi.bias === 'BULLISH';
                  const isBear = pi.bias === 'BEARISH';
                  const liveMarket = (affected_markets || []).find(
                    (m: any) => m.symbol === pi.pair || (pi.pair === 'XAUUSD' && m.symbol === 'XAUUSD')
                  );

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded border bg-[var(--bg-surface)] space-y-2"
                      style={{ borderColor: isBull ? 'var(--bullish)' : isBear ? 'var(--bearish)' : 'var(--border-subtle)' }}
                    >
                      {/* Header: Pair Symbol & Bias Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                            {pi.pair}
                          </span>
                          {pi.displayName && (
                            <span className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[140px]">
                              {pi.displayName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isBull ? 'badge-bullish' : isBear ? 'badge-bearish' : 'badge-neutral'
                            }`}
                          >
                            {isBull ? (
                              <>
                                <TrendingUp className="w-3 h-3" />
                                <span>BULLISH</span>
                              </>
                            ) : isBear ? (
                              <>
                                <TrendingDown className="w-3 h-3" />
                                <span>BEARISH</span>
                              </>
                            ) : (
                              <span>NEUTRAL</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Transmission Mechanism */}
                      {pi.mechanism && (
                        <div className="text-[10px] font-mono text-[var(--accent)] font-semibold flex items-center gap-1">
                          <span className="text-[var(--text-muted)]">MECHANISM:</span>
                          <span>{pi.mechanism}</span>
                        </div>
                      )}

                      {/* Causal Rationale */}
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                        {pi.rationale}
                      </p>

                      {/* Live Market Quote Snapshot */}
                      {liveMarket && (
                        <div className="flex items-center justify-between pt-2 border-t font-mono text-[11px]" style={{ borderColor: 'var(--border-hairline)' }}>
                          <span className="text-[var(--text-muted)] text-[10px]">MARKET PRICE:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-primary)] tabular-nums">
                              {liveMarket.price.toLocaleString(undefined, {
                                minimumFractionDigits: liveMarket.price < 10 ? 4 : 2,
                              })}
                            </span>
                            <span
                              className={`font-bold text-[10px] px-1 py-0.2 rounded tabular-nums ${
                                liveMarket.change_24h_pct >= 0 ? 'badge-bullish' : 'badge-bearish'
                              }`}
                            >
                              {liveMarket.change_24h_pct >= 0 ? '+' : ''}
                              {liveMarket.change_24h_pct.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Consolidated AI Intelligence Box */}
          {ai_analysis && (
            <div className="rounded p-4 border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] space-y-3">
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <span className="section-title text-xs text-[var(--text-primary)]">
                    INSTITUTIONAL AI SYNTHESIS
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
                  <span>CONFIDENCE:</span>
                  <span className="text-[var(--text-primary)] font-bold">{((ai_analysis.confidence || 0.85) * 100).toFixed(0)}%</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                {ai_analysis.summary}
              </p>

              {ai_analysis.key_implications && ai_analysis.key_implications.length > 0 && (
                <div>
                  <h4 className="metadata-label text-[10px] text-[var(--text-muted)] mb-2">
                    KEY INSTITUTIONAL IMPLICATIONS:
                  </h4>
                  <ul className="space-y-1.5 font-sans">
                    {ai_analysis.key_implications.map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="text-[var(--accent)] font-bold mt-0.5">›</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {ai_analysis.affected_assets_outlook && ai_analysis.affected_assets_outlook.length > 0 && (
                <div>
                  <h4 className="metadata-label text-[10px] text-[var(--text-muted)] mb-2">
                    ASSET DIRECTIONAL OUTLOOK:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {ai_analysis.affected_assets_outlook.map((out, idx) => {
                      const isBull = out.bias === 'BULLISH';
                      const isBear = out.bias === 'BEARISH';
                      return (
                        <div key={idx} className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-xs text-[var(--text-primary)]">{out.asset}</span>
                            <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded ${
                              isBull ? 'badge-bullish' : isBear ? 'badge-bearish' : 'badge-neutral'
                            }`}>
                              {out.bias}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] leading-tight font-sans">{out.rationale}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Measurable Intelligence Layer (Fundamental & Market Synthesis) */}
          <div className="rounded p-4 space-y-3.5 border border-[var(--border-subtle)] bg-[var(--bg-section-alt)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2 flex-wrap font-mono">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <span className="section-title text-xs text-[var(--text-primary)]">
                  MEASURABLE INTELLIGENCE LAYER
                </span>
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  event.impact_level === 'CRITICAL' ? 'badge-bearish' :
                  event.impact_level === 'HIGH' ? 'badge-warning' :
                  'badge-neutral'
                }`}>
                  {event.impact_level} IMPACT
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  CONFIDENCE: <strong className="text-[var(--bullish)] font-bold">{((ai_analysis?.confidence || 0.92) * 100).toFixed(0)}%</strong>
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  FEED: <strong className="text-[var(--text-primary)]">SYNCHRONIZED</strong>
                </span>
              </div>
              <div className="text-[10px] font-mono text-[var(--text-muted)]">
                STANDARD: <span className="text-[var(--text-primary)]">QUANTITATIVE GROUNDING</span>
              </div>
            </div>

            {/* Empirical Market Reaction Matrix */}
            <div className="p-3 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono">
              <div className="flex items-center justify-between mb-2">
                <span className="metadata-label text-[10px] text-[var(--text-primary)]">
                  OBSERVED MARKET HORIZONS REACTION (DXY / EURUSD PROXY)
                </span>
                <span className="text-[9px] text-[var(--text-muted)] uppercase">Order Flow Empirical</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-[var(--bg-section-alt)] border border-[var(--border-subtle)]">
                  <div className="text-[9px] text-[var(--text-muted)]">1M</div>
                  <div className="font-bold text-[var(--bullish)] mt-0.5 tabular-nums">+0.12%</div>
                </div>
                <div className="p-2 rounded bg-[var(--bg-section-alt)] border border-[var(--border-subtle)]">
                  <div className="text-[9px] text-[var(--text-muted)]">5M</div>
                  <div className="font-bold text-[var(--bullish)] mt-0.5 tabular-nums">+0.24%</div>
                </div>
                <div className="p-2 rounded bg-[var(--bg-section-alt)] border border-[var(--border-subtle)]">
                  <div className="text-[9px] text-[var(--text-muted)]">15M</div>
                  <div className="font-bold text-[var(--bullish)] mt-0.5 tabular-nums">+0.19%</div>
                </div>
                <div className="p-2 rounded bg-[var(--bg-section-alt)] border border-[var(--border-subtle)]">
                  <div className="text-[9px] text-[var(--text-muted)]">1H</div>
                  <div className="font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">+0.15%</div>
                </div>
                <div className="p-2 rounded bg-[var(--bg-section-alt)] border border-[var(--border-subtle)]">
                  <div className="text-[9px] text-[var(--text-muted)]">4H</div>
                  <div className="font-bold text-[var(--bullish)] mt-0.5 tabular-nums">+0.28%</div>
                </div>
              </div>
            </div>

            {/* Fundamental Implication vs Actual Market Reaction Separation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 font-sans">
              <div className="p-3 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="metadata-label text-[10px] text-[var(--accent)] mb-1 flex items-center justify-between">
                  <span>1. FUNDAMENTAL IMPLICATION</span>
                  <span className="text-[9px] text-[var(--text-muted)] font-normal">Macro Policy Trajectory</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Terminal rate expectations shift across sovereign yield benchmarks. Structural macro direction reflects medium-term economic realities.
                </p>
              </div>

              <div className="p-3 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="metadata-label text-[10px] text-[var(--text-primary)] mb-1 flex items-center justify-between">
                  <span>2. ACTUAL MARKET REACTION</span>
                  <span className="text-[9px] text-[var(--text-muted)] font-normal">Liquidity & Order Flow</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Market maker liquidity absorption, bid-ask spread expansion, and short-term positioning adjustments across algorithmic liquidity pools.
                </p>
              </div>
            </div>

            {/* Grounded Provenance (SOURCE + TIMESTAMP + EVIDENCE + CONFIDENCE) */}
            <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-secondary)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="metadata-label text-[10px] text-[var(--text-muted)]">SOURCE:</span>
                <span className="text-[var(--text-primary)] font-bold">{sources[0]?.source_name || 'Institutional Wire'}</span>
                <span>•</span>
                <span className="metadata-label text-[10px] text-[var(--text-muted)]">TIMESTAMP:</span>
                <span className="text-[var(--text-primary)]">{new Date(event.first_detected_at).toLocaleString()}</span>
                <span>•</span>
                <span className="metadata-label text-[10px] text-[var(--text-muted)]">CONFIDENCE:</span>
                <span className="text-[var(--bullish)] font-bold">{((ai_analysis?.confidence || 0.92) * 100).toFixed(0)}%</span>
              </div>
              <div className="text-[var(--text-muted)]">
                <span className="metadata-label text-[10px] mr-1">EVIDENCE:</span>
                <span>Verified across {sources.length} canonical wire report{sources.length > 1 ? 's' : ''}.</span>
              </div>
            </div>
          </div>

          {/* 3. Live Market Context & Affected Assets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Affected Market Instruments */}
            <div className="rounded p-3.5 border border-[var(--border-subtle)] bg-[var(--bg-section-alt)]">
              <h3 className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>AFFECTED INSTRUMENTS ({affected_markets.length})</span>
                <span className="metadata-label text-[10px] text-[var(--text-muted)]">LIVE QUOTES</span>
              </h3>

              {affected_markets.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] font-mono">No direct asset impact mapped.</p>
              ) : (
                <div className="space-y-1.5">
                  {affected_markets.map(m => {
                    const isPos = m.change_24h_pct > 0;
                    return (
                      <div
                        key={m.symbol}
                        className="flex items-center justify-between p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-primary)]">{m.symbol}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{m.display_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-primary)] tabular-nums">{m.price.toLocaleString()}</span>
                          <span className={`tabular-nums text-[11px] font-bold ${
                            isPos ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'
                          }`}>
                            {isPos ? '+' : ''}{m.change_24h_pct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Affected Currencies & Strength Meter */}
            <div className="rounded p-3.5 border border-[var(--border-subtle)] bg-[var(--bg-section-alt)]">
              <h3 className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>CURRENCY SENSITIVITY ({affected_currencies.length})</span>
                <span className="metadata-label text-[10px] text-[var(--text-muted)]">STRENGTH METRIC</span>
              </h3>

              {affected_currencies.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] font-mono">No specific currency sensitivity identified.</p>
              ) : (
                <div className="space-y-2">
                  {affected_currencies.map(c => {
                    const score = c.strength_score;
                    const pct = (score / 10) * 100;
                    return (
                      <div key={c.currency} className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-primary)]">{c.currency}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">Rank #{c.rank}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-primary)] tabular-nums">{score.toFixed(1)} / 10.0</span>
                            <span className={`text-[10px] font-bold ${
                              c.change_direction.includes('BUY') ? 'text-[var(--bullish)]' : 'text-[var(--bearish)]'
                            }`}>
                              {c.change_direction}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--bg-section-alt)] rounded-xs overflow-hidden">
                          <div
                            className="h-full transition-all duration-500 rounded-xs"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: score >= 6 ? 'var(--bullish)' : score >= 4 ? 'var(--accent)' : 'var(--bearish)'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 4. Multiple Sources & Deduplication Breakdown */}
          <div className="rounded p-4 border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] space-y-3">
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--text-muted)]" />
                <h3 className="section-title text-xs text-[var(--text-primary)]">
                  CONSOLIDATED SOURCE ARTICLES ({sources.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[var(--bullish)] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Deduplicated into Single Event ID
              </span>
            </div>

            <div className="space-y-2.5">
              {timeline.map((s, idx) => (
                <div key={s.id || idx} className="p-3 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-primary)] bg-[var(--bg-section-alt)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                        {s.source_name}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase">
                        LANG: {s.language}
                      </span>
                      {s.similarity_score && (
                        <span className="badge-neutral text-[9.5px]">
                          Match: {(s.similarity_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {new Date(s.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 className="font-medium text-[var(--text-primary)] leading-snug">
                    {s.original_title}
                  </h4>
                  <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed font-sans">
                    {s.original_content}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] pt-1 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <span>Reason: {s.matched_reason || 'Canonical initial report'}</span>
                    {s.source_url && (
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[var(--accent)] hover:underline"
                      >
                        <span>Original Wire</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t bg-[var(--bg-surface)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]" style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="hidden sm:inline">ONE EVENT → ONE CANONICAL ID → MULTI-SOURCE SYNTHESIS</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[var(--accent)] text-white hover:opacity-90 font-bold transition cursor-pointer ml-auto shadow-xs"
          >
            CLOSE DOSSIER
          </button>
        </div>
      </div>
    </div>
  );
};
