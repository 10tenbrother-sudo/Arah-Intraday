import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Radio,
  Brain,
  GitMerge,
  Calendar,
  Target,
  Star,
  Globe2,
  ShieldCheck,
  Clock,
  Gauge,
} from 'lucide-react';
import { api } from '../lib/api';
import { MarketPrice, CurrencyStrength } from '../types';
import { getCurrencyFlagUrl } from '../lib/assets';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../lib/theme';

interface LandingPageProps {
  onNavigate: (to: string) => void;
  onOpenAuth: () => void;
}

const fmtPrice = (v: number, symbol: string) => {
  if (!Number.isFinite(v)) return '—';
  const digits = v >= 1000 ? 0 : v >= 100 ? 1 : v >= 10 ? 2 : v >= 1 ? 4 : 5;
  return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenAuth }) => {
  const { theme, toggleTheme } = useTheme();
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [strengths, setStrengths] = useState<CurrencyStrength[]>([]);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.getMarkets().catch(() => ({ prices: [] as MarketPrice[] })),
      api.getCurrencyStrength().catch(() => ({ currency_strength: [] as CurrencyStrength[] })),
      api.getEvents(500, 'HIGH').catch(() => ({ events: [] as unknown[] })),
    ]).then(([m, s, e]) => {
      if (!alive) return;
      setPrices(m.prices || []);
      setStrengths(s.currency_strength || []);
      setEventCount(Array.isArray(e.events) ? e.events.length : null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Arah Market — Macro & FX Intelligence';
    return () => {
      document.title = prev;
    };
  }, []);

  // A live desk reads the widest movers first, not an alphabetical list.
  const movers = useMemo(
    () =>
      [...prices]
        .filter(p => Number.isFinite(p.change_24h_pct))
        .sort((a, b) => Math.abs(b.change_24h_pct) - Math.abs(a.change_24h_pct))
        .slice(0, 6),
    [prices],
  );

  const rankedCurrencies = useMemo(
    () => [...strengths].sort((a, b) => (b.strength_score ?? 0) - (a.strength_score ?? 0)).slice(0, 8),
    [strengths],
  );

  // Strength scores are signed with a small practical range, so scale the bar
  // to the strongest observed reading instead of a fixed 0-100 domain.
  const maxAbsScore = useMemo(
    () => rankedCurrencies.reduce((max, c) => Math.max(max, Math.abs(c.strength_score ?? 0)), 0),
    [rankedCurrencies],
  );

  const range = (list: number[]) => {
    const clean = list.filter(Number.isFinite);
    if (!clean.length) return null;
    return { min: Math.min(...clean), max: Math.max(...clean), mid: (Math.min(...clean) + Math.max(...clean)) / 2 };
  };

  const moverRange = range(movers.map(m => Math.abs(m.change_24h_pct)));

  const capabilities = [
    {
      icon: Radio,
      route: '/news',
      title: 'Canonical news wire',
      body: 'Every headline deduplicated across sources, graded by impact, and mapped to the instruments it actually moves. No repeats, no filler.',
    },
    {
      icon: Target,
      route: '/arah-market',
      title: 'Market bias dossier',
      body: 'Fundamental and price-action reads scored separately per pair, then reconciled into one conviction-weighted verdict.',
    },
    {
      icon: GitMerge,
      route: '/intermarket',
      title: 'Intermarket flows',
      body: 'Rate differentials, index correlations, and commodity linkage evaluated as one transmission chain rather than isolated charts.',
    },
    {
      icon: Calendar,
      route: '/calendar',
      title: 'Economic calendar',
      body: 'Scheduled releases with live actual-versus-forecast surprise scoring and the realised market reaction attached.',
    },
    {
      icon: Brain,
      route: '/intelligence',
      title: 'AI analysis',
      body: 'Gemini synthesises the session into a written macro regime read, grounded strictly in verified prices and released data.',
    },
    {
      icon: Activity,
      route: '/markets',
      title: 'Market surveillance',
      body: 'Live price grid across FX majors, metals, energy, indices, and crypto with spread and session context.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <header
        className="sticky top-0 z-40 h-14 px-4 sm:px-8 flex items-center justify-between border-b backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--bg-header) 88%, transparent)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs bg-[var(--accent)] text-white">
            AM
          </div>
          <span className="font-mono font-bold text-xs tracking-wider">
            ARAH <span className="text-[var(--accent)]">MARKET</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          <a href="#desk" className="hover:text-[var(--text-primary)] transition">The desk</a>
          <a href="#capability" className="hover:text-[var(--text-primary)] transition">Capability</a>
          <a href="#coverage" className="hover:text-[var(--text-primary)] transition">Coverage</a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={toggleTheme} variant="button" />
          <button
            onClick={onOpenAuth}
            className="press hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold transition"
            style={{ background: 'var(--accent)', color: '#FFFFFF' }}
          >
            <span>Open terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ============ HERO: split, not centered (VARIANCE 5) ============ */}
      <section id="desk" className="px-4 sm:px-8 pt-16 pb-14 lg:pt-20 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-start">
          <div className="lg:col-span-6 xl:col-span-5">
            <h1 className="headline-display max-w-[15ch]">
              The macro desk that shows its evidence.
            </h1>

            <p className="mt-5 text-base leading-relaxed max-w-[46ch]" style={{ color: 'var(--text-secondary)' }}>
              Cross-asset intelligence for FX and macro traders. Every bias ships with its drivers,
              counter-evidence, and the condition that invalidates it.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <button
                onClick={onOpenAuth}
                className="press inline-flex items-center gap-2 px-4 py-2.5 rounded text-sm font-semibold transition"
                style={{ background: 'var(--accent)', color: '#FFFFFF' }}
              >
                Open terminal
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#capability"
                className="press inline-flex items-center gap-2 px-4 py-2.5 rounded text-sm font-semibold border transition"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
              >
                See what it tracks
              </a>
            </div>
          </div>

          {/* Live tape: real values from the running feed, sorted by movement */}
          <div className="lg:col-span-6 xl:col-span-7">
            <div className="terminal-panel overflow-hidden">
              <div className="section-head px-3.5 py-2.5">
                <span className="metadata-label" style={{ color: 'var(--text-secondary)' }}>
                  Live tape
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: loading ? 'var(--warning)' : 'var(--bullish)' }}
                  />
                  {loading ? 'connecting' : `${prices.length} instruments`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="px-3.5 py-3 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                        <div className="skeleton h-3 w-20 mb-2" />
                        <div className="skeleton h-4 w-28" />
                      </div>
                    ))
                  : movers.map(m => {
                      const up = m.change_24h_pct >= 0;
                      return (
                        <div
                          key={m.symbol}
                          className="px-3.5 py-3 border-b flex items-center justify-between gap-3"
                          style={{ borderColor: 'var(--border-hairline)' }}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{m.display_name}</div>
                            <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                              {m.symbol} · {m.asset_type}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="num text-sm font-semibold">{fmtPrice(m.price, m.symbol)}</div>
                            <div className={`num text-[11px] font-semibold flex items-center justify-end gap-0.5 ${up ? 'num-pos' : 'num-neg'}`}>
                              {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {fmtPct(m.change_24h_pct)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
              </div>

              {!loading && movers.length > 0 && moverRange && (
                <div className="px-3.5 py-2 flex items-center gap-2 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  <Gauge className="w-3 h-3" />
                  <span>24h dispersion {moverRange.min.toFixed(2)}% – {moverRange.max.toFixed(2)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ DESK PANEL: coverage numbers, not marketing claims ============ */}
      <section className="px-4 sm:px-8 py-10 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-section-alt)' }}>
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: 'var(--border-subtle)' }}>
          {[
            { k: 'Instruments tracked', v: prices.length ? String(prices.length) : '—' },
            { k: 'Currencies ranked', v: rankedCurrencies.length ? String(rankedCurrencies.length) : '—' },
            { k: 'Calendar events', v: eventCount !== null ? String(eventCount) : '—' },
            { k: 'Realtime transport', v: 'SSE' },
          ].map(stat => (
            <div key={stat.k} className="px-4 py-5" style={{ background: 'var(--bg-canvas)' }}>
              <div className="num text-2xl font-semibold">{stat.v}</div>
              <div className="metadata-label mt-1.5" style={{ color: 'var(--text-muted)' }}>
                {stat.k}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ CAPABILITY: 2-col rows, no 3-equal-card row ============ */}
      <section id="capability" className="px-4 sm:px-8 py-16 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1400px] mx-auto">
          <h2 className="headline-h1 max-w-[22ch]">
            Six systems, one reading of the session.
          </h2>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-px" style={{ background: 'var(--border-subtle)' }}>
            {capabilities.map(cap => {
              const Icon = cap.icon;
              return (
                <button
                  key={cap.title}
                  onClick={() => onNavigate(cap.route)}
                  className="press group text-left px-5 py-6 transition flex items-start gap-4"
                  style={{ background: 'var(--bg-canvas)' }}
                >
                  <span
                    className="mt-0.5 w-8 h-8 rounded flex items-center justify-center shrink-0 border"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-section-alt)' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {cap.title}
                      <ArrowUpRight
                        className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition"
                        style={{ color: 'var(--accent)' }}
                      />
                    </span>
                    <span className="mt-1.5 block text-[13px] leading-relaxed max-w-[52ch]" style={{ color: 'var(--text-secondary)' }}>
                      {cap.body}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ COVERAGE: currency ranking, real dispersion ============ */}
      <section id="coverage" className="px-4 sm:px-8 py-16 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-section-alt)' }}>
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <h2 className="headline-h2 max-w-[20ch]">
              Strength is relative, so we rank it.
            </h2>
            <p className="mt-4 text-[13px] leading-relaxed max-w-[46ch]" style={{ color: 'var(--text-secondary)' }}>
              G8 currencies scored against each other on the same session basis. The strongest and
              weakest legs are what pair selection actually keys off.
            </p>
            <div className="mt-5 space-y-2 text-[12px] font-mono" style={{ color: 'var(--text-muted)' }}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                <span>Grounds every read in released data</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                <span>Updated through the trading session</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="terminal-panel overflow-hidden">
              <div className="section-head px-3.5 py-2.5">
                <span className="metadata-label" style={{ color: 'var(--text-secondary)' }}>Currency ranking</span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>session basis</span>
              </div>

              {loading ? (
                <div className="p-3.5 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-7 w-full" />)}
                </div>
              ) : rankedCurrencies.length === 0 ? (
                <div className="px-3.5 py-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  Currency strength feed is warming up.
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                  {rankedCurrencies.map((c, i) => {
                    const score = c.strength_score ?? 0;
                    const pct = maxAbsScore > 0 ? Math.min(100, (Math.abs(score) / maxAbsScore) * 100) : 0;
                    const up = score >= 0;
                    return (
                      <div key={c.currency} className="px-3.5 py-2.5 flex items-center gap-3">
                        <span className="num text-[11px] w-4" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                        <img
                          src={getCurrencyFlagUrl(c.currency)}
                          alt=""
                          className="w-5 h-3.5 object-cover rounded-sm border"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        />
                        <span className="font-mono text-xs font-semibold w-10">{c.currency}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-section-alt)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: up ? 'var(--bullish)' : 'var(--bearish)' }}
                          />
                        </div>
                        <span className={`num text-xs font-semibold w-14 text-right ${up ? 'num-pos' : 'num-neg'}`}>
                          {up ? '+' : ''}{score.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="px-4 sm:px-8 py-16">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="headline-h2 max-w-[24ch]">
              Read the session before the session reads you.
            </h2>
            <p className="mt-3 text-[13px] max-w-[52ch]" style={{ color: 'var(--text-secondary)' }}>
              Sign in to open the full terminal, or browse the public views without an account.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenAuth}
              className="press inline-flex items-center gap-2 px-4 py-2.5 rounded text-sm font-semibold"
              style={{ background: 'var(--accent)', color: '#FFFFFF' }}
            >
              Open terminal
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#capability"
              className="press inline-flex items-center gap-2 px-4 py-2.5 rounded text-sm font-semibold border"
              style={{ borderColor: 'var(--border-strong)' }}
            >
              Capability
            </a>
          </div>
        </div>
      </section>

      <footer className="mt-auto px-4 sm:px-8 py-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
          <span>Arah Market — macro &amp; FX intelligence</span>
          <span className="flex items-center gap-1.5">
            <Globe2 className="w-3 h-3" />
            Research tooling. Not investment advice.
          </span>
        </div>
      </footer>
    </div>
  );
};
