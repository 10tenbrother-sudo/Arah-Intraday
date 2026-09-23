import React, { useState, useEffect, useMemo } from 'react';
import {
  Menu,
  Search,
  Globe2,
  RefreshCw,
  Clock,
  X,
  Zap,
  Sun,
  Moon,
  Radio,
  User as UserIcon,
} from 'lucide-react';
import { SSEConnectionState } from '../lib/useSSE';
import { NavTabId } from './Sidebar';
import { Tooltip, MetricTooltip } from './Tooltip';
import { Button } from './ui/button';
import { User } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  sseStatus: SSEConnectionState;
  sessions: any[];
  onTriggerGlobalSync: () => void;
  isSyncing: boolean;
  onToggleMobileMenu: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenAutoTriggerModal?: () => void;
  isAutoTriggerActive?: boolean;
  autoTriggerSecondsRemaining?: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  user?: User | null;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  activeTab,
  setActiveTab,
  sseStatus,
  sessions,
  onTriggerGlobalSync,
  isSyncing,
  onToggleMobileMenu,
  searchQuery = '',
  onSearchChange,
  onOpenAutoTriggerModal,
  isAutoTriggerActive = false,
  autoTriggerSecondsRemaining = 0,
  theme = 'dark',
  onToggleTheme,
  user,
  onOpenAuth,
}) => {
  const [timeState, setTimeState] = useState<{
    wibTime: string;
    utcTime: string;
    dateStr: string;
  }>({
    wibTime: '',
    utcTime: '',
    dateStr: '',
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).toUpperCase();

      const wibTime = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const utcTime = now.toLocaleTimeString('en-GB', {
        timeZone: 'UTC',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      setTimeState({ dateStr, wibTime: `${wibTime} WIB`, utcTime: `${utcTime} UTC` });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatViewLabel = (tab: NavTabId): string => {
    switch (tab) {
      case 'terminal':
        return 'OVERVIEW DASHBOARD';
      case 'arah_market':
        return 'MARKET BIAS DOSSIER';
      case 'intraday_map':
        return 'INTRADAY MARKET MAP';
      case 'today_catalysts':
        return "TODAY'S CATALYSTS";
      case 'intermarket':
        return 'INTERMARKET FLOWS';
      case 'markets':
        return 'MARKET SURVEILLANCE';
      case 'currency':
        return 'CURRENCY STRENGTH G8';
      case 'history':
        return 'HISTORICAL MEMORY';
      case 'macro':
        return 'ECONOMIC CALENDAR';
      case 'events':
        return 'CANONICAL NEWS WIRE';
      case 'intelligence':
        return 'AI MARKET INTELLIGENCE';
      case 'watchlist':
        return 'ACTIVE WATCHLIST';
      case 'admin':
        return 'SYSTEM & FEEDS';
      default:
        return String(tab)
          .replace(/_/g, ' ')
          .toUpperCase();
    }
  };

  // Only display currently active / open sessions
  const activeSessions = useMemo(() => {
    return (sessions || []).filter(s => s.current_status === 'OPEN');
  }, [sessions]);

  const activeSessionName = activeSessions.length > 0
    ? activeSessions.map(s => s.session_name.toUpperCase()).join(' + ')
    : 'ASIA SESSION';

  return (
    <header
      className="border-b sticky top-0 z-30 shrink-0 transition-colors terminal-header"
      style={{
        background: 'var(--bg-header)',
        borderColor: 'var(--border-subtle)',
      }}
      id="arah-market-header"
    >
      <div className="h-12 px-3 sm:px-4 flex items-center justify-between gap-3">
        {/* Left Section: Mobile Menu + View Title + Live Status */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] lg:hidden cursor-pointer transition"
            title="Open Navigation"
            id="mobile-menu-toggle-btn"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <h1 className="text-xs sm:text-[13px] font-mono font-bold tracking-tight text-[var(--text-primary)] uppercase">
              {formatViewLabel(activeTab)}
            </h1>

            {/* Connection Live Indicator */}
            <Tooltip
              title="SSE Streaming Feed"
              badge={sseStatus === 'CONNECTED' ? 'LIVE' : 'RECONNECTING'}
              badgeColor={
                sseStatus === 'CONNECTED'
                  ? 'badge-bullish text-[9px] px-1 py-0'
                  : 'badge-warning text-[9px] px-1 py-0'
              }
              content={
                sseStatus === 'CONNECTED'
                  ? 'Live Server-Sent Events stream connected. Institutional price ticks and canonical wires streaming with zero delay.'
                  : 'Re-establishing high-frequency institutional feed connection.'
              }
              whyItMatters="Guarantees actionable real-time signals without manual browser reloads."
              position="bottom"
            >
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] cursor-help">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    sseStatus === 'CONNECTED' ? 'bg-[var(--bullish)]' : 'bg-[var(--warning)] animate-ping'
                  }`}
                />
                <span className="text-[9.5px] font-mono font-semibold tracking-wider text-[var(--text-secondary)]">
                  {sseStatus === 'CONNECTED' ? 'FEED LIVE' : 'SYNCING'}
                </span>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Center Section: Compact Search Bar */}
        {onSearchChange && (
          <div className="hidden md:flex items-center relative w-60 lg:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search ticker, news, catalyst..."
              className="h-7 w-full bg-[var(--bg-section-alt)] border border-[var(--border-subtle)] focus:border-[var(--text-primary)] rounded pl-8 pr-10 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] transition outline-none"
            />
            {searchQuery ? (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none px-1 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[9px] font-mono text-[var(--text-muted)]">
                ⌘K
              </span>
            )}
          </div>
        )}

        {/* Right Section: Market Status, Exact Time, Theme Toggle, Actions */}
        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          {/* Active Session & Market Open Status */}
          <div className="hidden xl:flex items-center gap-2 h-7 px-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[11px] text-[var(--text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--bullish)]" />
            <span className="font-semibold text-[var(--text-primary)] tracking-wide">
              MARKET OPEN
            </span>
            <span className="text-[var(--border-subtle)]">|</span>
            <span className="text-[var(--text-muted)] tracking-wider">
              {activeSessionName}
            </span>
          </div>

          {/* Current Date & Time (Tabular Numerals) */}
          <div className="hidden sm:flex items-center gap-2 h-7 px-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] text-[11px] tabular-nums">
            <span className="text-[var(--text-muted)] font-mono">{timeState.dateStr}</span>
            <span className="text-[var(--border-subtle)]">·</span>
            <span className="font-bold text-[var(--text-primary)] font-mono">
              {timeState.wibTime || 'LIVE'}
            </span>
          </div>

          {/* Theme Toggle (Pure White vs Pure Black, absolutely no black line on white and no white line on black) */}
          {onToggleTheme && (
            <ThemeToggle
              theme={theme}
              onToggle={onToggleTheme}
              variant="pill"
            />
          )}

          {/* Auto-Trigger News Button */}
          {onOpenAutoTriggerModal && (
            <button
              onClick={onOpenAutoTriggerModal}
              className={`h-7 px-2 rounded border text-[11px] font-mono flex items-center gap-1.5 transition cursor-pointer ${
                isAutoTriggerActive
                  ? 'badge-warning'
                  : 'bg-[var(--bg-section-alt)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="News Auto-Trigger Settings"
              id="open-auto-trigger-modal-btn"
            >
              <Zap className={`w-3 h-3 ${isAutoTriggerActive ? 'text-[var(--warning)] animate-pulse' : ''}`} />
              <span className="hidden md:inline">
                {isAutoTriggerActive ? `TRIGGER (${autoTriggerSecondsRemaining}s)` : 'TRIGGER'}
              </span>
            </button>
          )}

          {/* Global Ingestion Sync Trigger */}
          <button
            onClick={onTriggerGlobalSync}
            disabled={isSyncing}
            className="h-7 px-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-[11px] font-mono flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Synchronize all real-time market feeds"
            id="global-sync-btn"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[var(--accent)]' : ''}`} />
            <span className="hidden sm:inline font-semibold">{isSyncing ? 'SYNCING' : 'SYNC'}</span>
          </button>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
