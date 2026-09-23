import React, { useEffect } from 'react';
import {
  Activity,
  Layers,
  TrendingUp,
  Radio,
  Brain,
  CheckCircle2,
  ArrowRight,
  BarChart2,
  Globe2,
  Zap,
  ChevronRight,
  Flame,
  Clock,
  Sparkles,
  Compass,
  LineChart,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { User } from '../types';
import { CATEGORY_HERO_IMAGES, getCurrencyFlagUrl } from '../lib/assets';
import { ThemeToggle } from './ThemeToggle';

interface PublicLandingPageProps {
  currentPath: string;
  onNavigate: (to: string) => void;
  user?: User | null;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  currentPath,
  onNavigate,
  user,
  theme = 'light',
  onToggleTheme,
}) => {
  // Auto-scroll to specific section when path is /features
  useEffect(() => {
    if (currentPath === '/features') {
      const el = document.getElementById('features-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPath]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-[var(--accent)] selection:text-white transition-colors duration-150">
      {/* 1. INSTITUTIONAL TOP BAR */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between terminal-header"
        style={{
          background: 'var(--bg-header)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-6">
          {/* Brand Mark */}
          <div
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs bg-[var(--accent)] text-white shrink-0 shadow-xs">
              IM
            </div>
            <div>
              <div className="text-xs font-bold tracking-wider font-mono text-[var(--text-primary)] flex items-center gap-1.5">
                <span>ARAH MARKET</span>
                <span className="text-[9px] px-1 py-0 rounded font-mono font-semibold bg-[var(--bg-section-alt)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  TERMINAL
                </span>
              </div>
              <div className="text-[9px] font-mono text-[var(--text-muted)] tracking-wider">
                MACRO INTELLIGENCE DESK
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => onNavigate('/features')}
              className={`px-3 py-1.5 rounded transition cursor-pointer ${
                currentPath === '/features'
                  ? 'bg-[var(--active-bg)] text-[var(--active-text)] font-semibold border border-[var(--active-border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              FITUR UTAMA
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('markets-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            >
              14 CORE ASSETS
            </button>
            <button
              onClick={() => onNavigate('/dashboard')}
              className="px-3 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>LIVE DESK</span>
            </button>
          </nav>
        </div>

        {/* Action Buttons & Theme Switcher */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {onToggleTheme && (
            <ThemeToggle
              theme={theme}
              onToggle={onToggleTheme}
              variant="pill"
            />
          )}
          <button
            onClick={() => onNavigate('/login')}
            className="px-3.5 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-section-alt)] text-[var(--text-primary)] transition cursor-pointer font-medium"
            id="landing-login-btn"
          >
            MASUK
          </button>
          <button
            onClick={() => onNavigate('/dashboard')}
            className="px-4 py-1.5 rounded bg-[var(--accent)] hover:opacity-90 text-white font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
            id="landing-register-btn"
          >
            <span>BUKA TERMINAL</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. EDITORIAL HERO SECTION */}
      <section className="relative px-4 sm:px-8 pt-12 sm:pt-20 pb-16 max-w-6xl mx-auto w-full text-center flex flex-col items-center">
        {/* Unboxed Precision Metadata */}
        <div className="flex items-center gap-2 mb-6 font-mono text-xs">
          <span className="w-2 h-2 rounded-xs bg-[var(--accent)]" />
          <span className="metadata-label text-[10px] sm:text-xs text-[var(--text-muted)] tracking-wider">
            INSTITUTIONAL MACROECONOMIC & CROSS-ASSET SURVEILLANCE
          </span>
        </div>

        {/* Space Grotesk Editorial Headline */}
        <h1 className="headline-display text-[var(--text-primary)] max-w-4xl">
          Grounded Macro Intel, Currency Flow & Directional Bias
        </h1>

        {/* Clean Subtitle */}
        <p className="mt-5 text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed font-sans">
          Eliminating market noise with G8 relative currency dispersion, 14 core intraday directional biases, canonical news deduplication, and multi-session historical permanence.
        </p>

        {/* High-Contrast CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto font-mono text-xs">
          <button
            onClick={() => onNavigate('/dashboard')}
            className="w-full sm:w-auto px-6 py-3 rounded bg-[var(--accent)] hover:opacity-90 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>MASUK KE TERMINAL DESK</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('features-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto px-5 py-3 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-section-alt)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LineChart className="w-4 h-4 text-[var(--accent)]" />
            <span>LIHAT ARSITEKTUR FITUR</span>
          </button>
        </div>

        {/* Institutional Metric Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 font-mono text-xs text-[var(--text-secondary)] border-y py-3 w-full max-w-3xl" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--bullish)]">●</span>
            <span className="font-semibold text-[var(--text-primary)]">G8 FLOW DISPERSION</span>
            <span className="text-[var(--text-muted)]">(28 Cross Pairs)</span>
          </div>
          <div className="text-[var(--border-subtle)]">·</div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--accent)]">●</span>
            <span className="font-semibold text-[var(--text-primary)]">14 CORE ASSET RADAR</span>
            <span className="text-[var(--text-muted)]">(FX, Gold, US100, BTC)</span>
          </div>
          <div className="text-[var(--border-subtle)]">·</div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--bullish)]">●</span>
            <span className="font-semibold text-[var(--text-primary)]">ZERO DUPLICATION WIRE</span>
          </div>
        </div>

        {/* 3. AUTHENTIC TERMINAL PREVIEW SHOWCASE (NO FAKE MACOS DOTS) */}
        <div className="mt-10 w-full max-w-5xl terminal-panel overflow-hidden text-left shadow-lg">
          {/* Terminal Console Status Strip */}
          <div
            className="px-4 py-2.5 border-b flex items-center justify-between font-mono text-xs"
            style={{
              backgroundColor: 'var(--bg-section-alt)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-xs bg-[var(--accent)]" />
              <span className="font-bold tracking-wider text-[var(--text-primary)]">
                MACRO SURVEILLANCE CONSOLE · REAL-TIME INTEL
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-[var(--bullish)] flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--bullish)]" />
                SSE STREAMING LIVE
              </span>
              <span className="text-[var(--text-muted)] hidden sm:inline">LATENCY &lt;45MS</span>
            </div>
          </div>

          {/* 3-Column Terminal Deck */}
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-[var(--bg-canvas)]">
            {/* Panel 1: Intraday Bias Snapshot */}
            <div className="terminal-panel p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b font-mono text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-bold flex items-center gap-1.5 text-[var(--text-primary)]">
                  <Activity className="w-3.5 h-3.5 text-[var(--accent)]" />
                  INTRADAY BIAS (14 ASSETS)
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">DESK RADAR</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                {/* GBPJPY */}
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-section-alt)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center -space-x-1 shrink-0">
                      <img
                        src={getCurrencyFlagUrl('GBP')}
                        alt="GBP"
                        className="w-3.5 h-2.5 object-cover rounded-xs border border-[var(--border-subtle)]"
                      />
                      <img
                        src={getCurrencyFlagUrl('JPY')}
                        alt="JPY"
                        className="w-3.5 h-2.5 object-cover rounded-xs border border-[var(--border-subtle)]"
                      />
                    </div>
                    <div>
                      <span className="font-bold text-[var(--text-primary)]">GBPJPY</span>
                      <span className="text-[10px] text-[var(--text-muted)] block font-sans">BoE hold vs BoJ easing</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold badge-bullish">
                    STRONG BUY
                  </span>
                </div>

                {/* XAUUSD */}
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-section-alt)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="w-4 h-3 rounded bg-amber-500/15 text-amber-500 text-[9px] font-bold flex items-center justify-center font-mono">Au</span>
                      <img
                        src={getCurrencyFlagUrl('USD')}
                        alt="USD"
                        className="w-3.5 h-2.5 object-cover rounded-xs border border-[var(--border-subtle)]"
                      />
                    </div>
                    <div>
                      <span className="font-bold text-[var(--text-primary)]">XAUUSD</span>
                      <span className="text-[10px] text-[var(--text-muted)] block font-sans">Safe-haven + rate cuts</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold badge-bullish">
                    BULLISH
                  </span>
                </div>

                {/* US100 */}
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-section-alt)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-3 rounded bg-purple-500/15 text-purple-400 text-[9px] font-bold flex items-center justify-center font-mono">NQ</span>
                    <div>
                      <span className="font-bold text-[var(--text-primary)]">US100</span>
                      <span className="text-[10px] text-[var(--text-muted)] block font-sans">Yield pullback tailwind</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold badge-bullish">
                    BULLISH
                  </span>
                </div>
              </div>
            </div>

            {/* Panel 2: G8 Currency Strength Dispersion */}
            <div className="terminal-panel p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b font-mono text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-bold flex items-center gap-1.5 text-[var(--text-primary)]">
                  <TrendingUp className="w-3.5 h-3.5 text-[var(--accent)]" />
                  G8 CURRENCY STRENGTH
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">SCORE 0 - 10</span>
              </div>
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[var(--text-primary)] font-bold flex items-center gap-1.5">
                      <img src={getCurrencyFlagUrl('GBP')} alt="GBP" className="w-3.5 h-2.5 object-cover rounded-xs" />
                      GBP (Rank #1)
                    </span>
                    <span className="text-[var(--bullish)] font-bold tabular-nums">8.2 / 10.0</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-section-alt)] rounded-xs overflow-hidden border border-[var(--border-subtle)]">
                    <div className="h-full bg-[var(--bullish)] w-[82%]" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[var(--text-primary)] font-bold flex items-center gap-1.5">
                      <img src={getCurrencyFlagUrl('AUD')} alt="AUD" className="w-3.5 h-2.5 object-cover rounded-xs" />
                      AUD (Rank #2)
                    </span>
                    <span className="text-[var(--bullish)] font-bold tabular-nums">7.4 / 10.0</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-section-alt)] rounded-xs overflow-hidden border border-[var(--border-subtle)]">
                    <div className="h-full bg-[var(--bullish)] w-[74%]" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[var(--text-primary)] font-bold flex items-center gap-1.5">
                      <img src={getCurrencyFlagUrl('JPY')} alt="JPY" className="w-3.5 h-2.5 object-cover rounded-xs" />
                      JPY (Rank #8)
                    </span>
                    <span className="text-[var(--bearish)] font-bold tabular-nums">2.1 / 10.0</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-section-alt)] rounded-xs overflow-hidden border border-[var(--border-subtle)]">
                    <div className="h-full bg-[var(--bearish)] w-[21%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 3: Canonical Event Deduplicated Wire */}
            <div className="terminal-panel p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b font-mono text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-bold flex items-center gap-1.5 text-[var(--text-primary)]">
                  <Brain className="w-3.5 h-3.5 text-[var(--accent)]" />
                  DEDUPLICATED MACRO WIRE
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">CANONICAL</span>
              </div>
              <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] p-2.5 space-y-2">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="badge-warning px-1 py-0.2 rounded font-bold">
                    HIGH IMPACT · FOMC
                  </span>
                  <span className="text-[var(--text-muted)]">2m ago</span>
                </div>
                <div className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                  US 10Y Yields Ease as Fed Rate Expectations Consolidate
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug font-sans line-clamp-2">
                  10-year benchmark yields slip to 4.12%, fueling steady cross-asset bid into gold and euro while capping US dollar momentum.
                </p>
                <div className="pt-1.5 border-t flex items-center gap-1.5 text-[10px] font-mono" style={{ borderColor: 'var(--border-hairline)' }}>
                  <span className="badge-bullish px-1 py-0.2 rounded">EURUSD ▲</span>
                  <span className="badge-bearish px-1 py-0.2 rounded">USDJPY ▼</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Bottom Status Line */}
          <div
            className="px-4 py-2.5 border-t flex items-center justify-between font-mono text-xs text-[var(--text-secondary)]"
            style={{
              backgroundColor: 'var(--bg-section-alt)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <span className="text-[11px]">
              Continuous institutional streaming &bull; Zero simulated loss &bull; Permanent multi-session history.
            </span>
            <button
              onClick={() => onNavigate('/dashboard')}
              className="text-[var(--text-primary)] hover:opacity-80 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>BUKA TERMINAL</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. KEY ARCHITECTURAL FEATURES (SWISS EDITORIAL GRID) */}
      <section id="features-section" className="py-16 px-4 sm:px-8 border-t bg-[var(--bg-section-alt)]" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="metadata-label text-xs text-[var(--text-muted)] mb-2">
              SYSTEM ARCHITECTURE & CAPABILITIES
            </div>
            <h2 className="headline-h1 text-[var(--text-primary)]">
              Engineered for High-Conviction Decisions
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2 font-sans">
              Pure signal over noise. Structured data flows directly into actionable intraday biases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Feature 1 */}
            <div className="terminal-panel overflow-hidden flex flex-col group transition">
              <div className="relative h-36 w-full overflow-hidden bg-[var(--bg-canvas)]">
                <img
                  src={CATEGORY_HERO_IMAGES.FOREX}
                  alt="Forex Currencies"
                  className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]/90 border border-[var(--border-subtle)] px-2 py-0.5 rounded">
                    G8 CURRENCY STRENGTH
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                  Rigorous relative score calculations across 28 global currency pairs. Rapidly identify the highest divergence between the strongest and weakest currencies.
                </p>
                <div className="pt-2 text-[11px] font-mono font-semibold text-[var(--accent)] flex items-center gap-1">
                  <span>Monitor live relative flow</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="terminal-panel overflow-hidden flex flex-col group transition">
              <div className="relative h-36 w-full overflow-hidden bg-[var(--bg-canvas)]">
                <img
                  src={CATEGORY_HERO_IMAGES.OVERVIEW}
                  alt="Market Mapping"
                  className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]/90 border border-[var(--border-subtle)] px-2 py-0.5 rounded">
                    14 ASSET INTRADAY RADAR
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                  Comprehensive macro direction mapped across Forex, Gold, Silver, Brent Oil, Equity Benchmarks (SPX, Nasdaq, Dow), Treasury Yields, and Bitcoin.
                </p>
                <div className="pt-2 text-[11px] font-mono font-semibold text-[var(--bullish)] flex items-center gap-1">
                  <span>Explore cross-asset matrix</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="terminal-panel overflow-hidden flex flex-col group transition">
              <div className="relative h-36 w-full overflow-hidden bg-[var(--bg-canvas)]">
                <img
                  src={CATEGORY_HERO_IMAGES.NEWS_WIRE}
                  alt="Market News"
                  className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]/90 border border-[var(--border-subtle)] px-2 py-0.5 rounded">
                    DEDUPLICATED NEWS WIRE
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                  Multi-source clustering resolves 50 redundant reports into a single canonical event record with direct pair transmission impacts and rationale.
                </p>
                <div className="pt-2 text-[11px] font-mono font-semibold text-[var(--accent)] flex items-center gap-1">
                  <span>Filtered high & critical impact</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="terminal-panel overflow-hidden flex flex-col group transition">
              <div className="relative h-36 w-full overflow-hidden bg-[var(--bg-canvas)]">
                <img
                  src={CATEGORY_HERO_IMAGES.CENTRAL_BANK}
                  alt="Central Bank Telemetry"
                  className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]/90 border border-[var(--border-subtle)] px-2 py-0.5 rounded">
                    CENTRAL BANK SURVEILLANCE
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                  Track interest rate trajectories, governor statements, and policy stances from the Fed, ECB, Bank of England, and Bank of Japan in one place.
                </p>
                <div className="pt-2 text-[11px] font-mono font-semibold text-[var(--text-primary)] flex items-center gap-1">
                  <span>Hawkish / dovish tracker</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="terminal-panel overflow-hidden flex flex-col group transition">
              <div className="relative h-36 w-full overflow-hidden bg-[var(--bg-canvas)]">
                <img
                  src={CATEGORY_HERO_IMAGES.INTERMARKET}
                  alt="Intermarket Flow"
                  className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]/90 border border-[var(--border-subtle)] px-2 py-0.5 rounded">
                    INTERMARKET FLOW TRANSMISSION
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                  Deep analysis of the dynamic relationships between the US Dollar Index (DXY), 10-year yields, commodities, and equities before positioning.
                </p>
                <div className="pt-2 text-[11px] font-mono font-semibold text-[var(--text-primary)] flex items-center gap-1">
                  <span>Inspect cross-asset flows</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="terminal-panel overflow-hidden flex flex-col group transition">
              <div className="relative h-36 w-full overflow-hidden bg-[var(--bg-canvas)]">
                <img
                  src={CATEGORY_HERO_IMAGES.MACRO_DATA}
                  alt="Economic Calendar"
                  className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]/90 border border-[var(--border-subtle)] px-2 py-0.5 rounded">
                    MACROECONOMIC CALENDAR (WIB)
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                  Schedule of CPI, NFP, GDP, and PMI releases with automatic local WIB (UTC+7) countdown, consensus variance, and historical release tracking.
                </p>
                <div className="pt-2 text-[11px] font-mono font-semibold text-[var(--text-primary)] flex items-center gap-1">
                  <span>Synchronized live releases</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 14 CORE ASSETS SPECIFICATION */}
      <section id="markets-section" className="py-16 px-4 sm:px-8 border-t bg-[var(--bg-canvas)]" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="metadata-label text-xs text-[var(--text-muted)] mb-2">
              INSTRUMENT SURVEILLANCE COVERAGE
            </div>
            <h2 className="headline-h1 text-[var(--text-primary)]">
              All 14 Core Institutional Markets
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2 font-sans">
              Real-time prices, continuous catalysts, and verified directional bias scores.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            {/* Class 1 */}
            <div className="terminal-panel p-3.5 space-y-2.5">
              <div className="text-[var(--text-primary)] font-bold uppercase tracking-wider text-[11px] pb-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                <span>FX MAJORS (G8)</span>
                <span className="text-[var(--text-muted)] text-[10px]">7 PAIRS</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { sym: 'EURUSD', name: 'Euro / US Dollar', flag: 'EUR' },
                  { sym: 'GBPUSD', name: 'British Pound / Dollar', flag: 'GBP' },
                  { sym: 'USDJPY', name: 'US Dollar / Yen', flag: 'JPY' },
                  { sym: 'AUDUSD', name: 'Aussie / US Dollar', flag: 'AUD' },
                ].map(p => (
                  <div key={p.sym} className="flex items-center justify-between p-1.5 rounded bg-[var(--bg-section-alt)] border border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <img src={getCurrencyFlagUrl(p.flag)} alt={p.flag} className="w-3.5 h-2.5 object-cover rounded-xs border border-[var(--border-subtle)]" />
                      <span className="font-bold text-[var(--text-primary)]">{p.sym}</span>
                    </div>
                    <span className="text-[var(--text-muted)] text-[10.5px] font-sans">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Class 2 */}
            <div className="terminal-panel p-3.5 space-y-2.5">
              <div className="text-[var(--text-primary)] font-bold uppercase tracking-wider text-[11px] pb-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                <span>METALS & COMMODITIES</span>
                <span className="text-[var(--text-muted)] text-[10px]">GOLD / OIL</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { sym: 'XAUUSD', name: 'Spot Gold / USD', tag: 'Au', color: 'bg-amber-500/15 text-amber-500' },
                  { sym: 'XAGUSD', name: 'Spot Silver / USD', tag: 'Ag', color: 'bg-slate-500/15 text-slate-400' },
                  { sym: 'BRENT', name: 'Brent Crude Oil', tag: 'Oil', color: 'bg-orange-500/15 text-orange-500' },
                  { sym: 'WTI', name: 'WTI Crude Oil', tag: 'Oil', color: 'bg-orange-500/15 text-orange-500' },
                ].map(p => (
                  <div key={p.sym} className="flex items-center justify-between p-1.5 rounded bg-[var(--bg-section-alt)] border border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-3 rounded text-[9px] font-bold flex items-center justify-center ${p.color}`}>{p.tag}</span>
                      <span className="font-bold text-[var(--text-primary)]">{p.sym}</span>
                    </div>
                    <span className="text-[var(--text-muted)] text-[10.5px] font-sans">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Class 3 */}
            <div className="terminal-panel p-3.5 space-y-2.5">
              <div className="text-[var(--text-primary)] font-bold uppercase tracking-wider text-[11px] pb-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                <span>EQUITY BENCHMARKS</span>
                <span className="text-[var(--text-muted)] text-[10px]">INDICES</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { sym: 'US500', name: 'S&P 500 Index' },
                  { sym: 'NAS100', name: 'Nasdaq 100 Tech' },
                  { sym: 'US30', name: 'Dow Jones 30' },
                  { sym: 'GER40', name: 'German DAX' },
                ].map(p => (
                  <div key={p.sym} className="flex items-center justify-between p-1.5 rounded bg-[var(--bg-section-alt)] border border-[var(--border-subtle)]">
                    <span className="font-bold text-[var(--text-primary)]">{p.sym}</span>
                    <span className="text-[var(--text-muted)] text-[10.5px] font-sans">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Class 4 */}
            <div className="terminal-panel p-3.5 space-y-2.5">
              <div className="text-[var(--text-primary)] font-bold uppercase tracking-wider text-[11px] pb-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                <span>YIELDS & CRYPTO</span>
                <span className="text-[var(--text-muted)] text-[10px]">DXY / BTC</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { sym: 'DXY', name: 'US Dollar Index', flag: 'USD' },
                  { sym: 'US10Y', name: '10-Yr US Treasury', tag: '10Y', color: 'bg-emerald-500/15 text-emerald-500' },
                  { sym: 'BTCUSD', name: 'Bitcoin Core', tag: '₿', color: 'bg-amber-500/15 text-amber-500' },
                  { sym: 'ETHUSD', name: 'Ethereum Network', tag: 'Ξ', color: 'bg-purple-500/15 text-purple-400' },
                ].map(p => (
                  <div key={p.sym} className="flex items-center justify-between p-1.5 rounded bg-[var(--bg-section-alt)] border border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      {p.flag ? (
                        <img src={getCurrencyFlagUrl(p.flag)} alt={p.flag} className="w-3.5 h-2.5 object-cover rounded-xs border border-[var(--border-subtle)]" />
                      ) : (
                        <span className={`w-4 h-3 rounded text-[9px] font-bold flex items-center justify-center ${p.color}`}>{p.tag}</span>
                      )}
                      <span className="font-bold text-[var(--text-primary)]">{p.sym}</span>
                    </div>
                    <span className="text-[var(--text-muted)] text-[10.5px] font-sans">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION SECTION */}
      <section className="py-16 px-4 sm:px-8 border-t bg-[var(--bg-section-alt)] text-center" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="w-10 h-10 rounded flex items-center justify-center bg-[var(--accent)] text-white mx-auto font-mono font-bold text-base shadow-xs">
            IM
          </div>
          <h2 className="headline-h1 text-[var(--text-primary)]">
            Ready to Navigate Macro Volatility with Real Intel?
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl mx-auto font-sans">
            Instant access to real-time currency dispersion, intraday asset biases, economic calendars, and verified intermarket signals on a single institutional screen.
          </p>
          <div className="pt-3 flex items-center justify-center font-mono text-xs">
            <button
              onClick={() => onNavigate('/dashboard')}
              className="px-8 py-3 rounded bg-[var(--accent)] hover:opacity-90 text-white font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>BUKA TERMINAL DESK SEKARANG</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="mt-auto border-t bg-[var(--bg-canvas)] px-4 sm:px-8 py-8 text-xs font-mono text-[var(--text-secondary)]" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-[var(--accent)] text-white font-bold text-[10px] shadow-xs">
              IM
            </div>
            <span className="font-bold text-[var(--text-primary)] tracking-wide">ARAH MARKET</span>
            <span className="text-[var(--text-muted)]">&bull; Institutional Macroeconomic Surveillance Desk</span>
          </div>

          <div className="flex items-center gap-5 text-xs">
            <button onClick={() => onNavigate('/')} className="hover:text-[var(--text-primary)] transition cursor-pointer">
              BERANDA
            </button>
            <button onClick={() => onNavigate('/features')} className="hover:text-[var(--text-primary)] transition cursor-pointer">
              FITUR
            </button>
            <button onClick={() => onNavigate('/dashboard')} className="text-[var(--accent)] hover:underline font-bold transition cursor-pointer">
              LIVE TERMINAL
            </button>
            <button onClick={() => onNavigate('/login')} className="hover:text-[var(--text-primary)] transition cursor-pointer">
              MASUK
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]" style={{ borderColor: 'var(--border-hairline)' }}>
          <div>
            &copy; {new Date().getFullYear()} Arah Market Systems &bull; All rights reserved.
          </div>
          <div>
            Institutional market intelligence platform for macroeconomic research and directional surveillance.
          </div>
        </div>
      </footer>
    </div>
  );
};
