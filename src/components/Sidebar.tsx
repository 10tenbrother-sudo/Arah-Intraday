import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Zap,
  Activity,
  TrendingUp,
  Calendar,
  Radio,
  Brain,
  Star,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  User as UserIcon,
  LogOut,
  History,
  GitMerge,
  Target,
} from 'lucide-react';
import { User } from '../types';
import { ThemeToggle } from './ThemeToggle';

export type NavTabId =
  | 'terminal'
  | 'arah_market'
  | 'intraday_map'
  | 'today_catalysts'
  | 'markets'
  | 'intermarket'
  | 'currency'
  | 'history'
  | 'macro'
  | 'events'
  | 'intelligence'
  | 'watchlist'
  | 'admin';

interface SidebarProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  isOpen: boolean; // mobile drawer
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  marketMapCount?: number;
  catalystsCount?: number;
  user?: User | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
  marketMapCount = 13,
  catalystsCount,
  user,
  onOpenAuth,
  onLogout,
  theme = 'light',
  onToggleTheme,
}) => {
  // Navigation structure as specified: MAIN, RESEARCH, TOOLS
  const navSections = [
    {
      group: 'MAIN',
      items: [
        {
          id: 'terminal' as NavTabId,
          label: 'Overview',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'markets' as NavTabId,
          label: 'Markets',
          icon: Activity,
          badge: null,
        },
        {
          id: 'macro' as NavTabId,
          label: 'Calendar',
          icon: Calendar,
          badge: null,
        },
        {
          id: 'events' as NavTabId,
          label: 'News Wire',
          icon: Radio,
          badge: 'LIVE',
          badgeClass: 'badge-bullish',
        },
        {
          id: 'intelligence' as NavTabId,
          label: 'AI Analysis',
          icon: Brain,
          badge: null,
        },
      ],
    },
    {
      group: 'RESEARCH',
      items: [
        {
          id: 'arah_market' as NavTabId,
          label: 'Market Bias',
          icon: Target,
          badge: 'BIAS',
          badgeClass: 'badge-neutral',
        },
        {
          id: 'intraday_map' as NavTabId,
          label: 'Market Map',
          icon: Compass,
          badge: `${marketMapCount}`,
          badgeClass: 'badge-neutral',
        },
        {
          id: 'today_catalysts' as NavTabId,
          label: 'Catalysts',
          icon: Zap,
          badge: catalystsCount !== undefined ? `${catalystsCount}` : null,
          badgeClass: 'badge-warning',
        },
        {
          id: 'intermarket' as NavTabId,
          label: 'Intermarket Flows',
          icon: GitMerge,
          badge: null,
        },
        {
          id: 'currency' as NavTabId,
          label: 'Currency G8',
          icon: TrendingUp,
          badge: 'G8',
          badgeClass: 'badge-neutral',
        },
        {
          id: 'history' as NavTabId,
          label: 'Historical Data',
          icon: History,
          badge: null,
        },
      ],
    },
    {
      group: 'TOOLS',
      items: [
        {
          id: 'watchlist' as NavTabId,
          label: 'Watchlist',
          icon: Star,
          badge: null,
        },
        ...(user?.role === 'ADMIN' ? [{
          id: 'admin' as NavTabId,
          label: 'System & Feeds',
          icon: Settings,
          badge: 'ADMIN',
          badgeClass: 'badge-warning',
        }] : []),
      ],
    },
  ];

  const handleSelect = (id: NavTabId) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Institutional Sidebar Container */}
      <aside
        id="arah-market-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-150 ease-in-out lg:static border-r select-none terminal-sidebar ${
          isOpen ? 'translate-x-0 w-60' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-14' : 'lg:w-60'}`}
        style={{
          background: 'var(--bg-sidebar)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Brand Header */}
        <div
          className="h-12 px-3.5 flex items-center justify-between shrink-0 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs bg-[var(--accent)] text-white shrink-0 shadow-xs">
              IM
            </div>
            {(!isCollapsed || isOpen) && (
              <div className="truncate">
                <div className="font-mono font-bold text-xs tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>INTRADAY</span>
                  <span className="text-[9px] px-1 py-0 rounded font-mono font-semibold bg-[var(--bg-section-alt)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                    PRO
                  </span>
                </div>
                <div className="text-[9px] font-mono text-[var(--text-muted)] tracking-wider">
                  MARKET INTELLIGENCE
                </div>
              </div>
            )}
          </div>

          {/* Close mobile, collapse toggle desktop */}
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] lg:hidden cursor-pointer"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
              title={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
              id="toggle-sidebar-collapse-btn"
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {navSections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              {(!isCollapsed || isOpen) && (
                <div className="px-2 pb-1 text-[9.5px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-semibold">
                  {sec.group}
                </div>
              )}

              {sec.items.map(item => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer group relative ${
                      isActive
                        ? 'bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)] font-semibold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-section-alt)]'
                    }`}
                    title={isCollapsed && !isOpen ? item.label : undefined}
                    id={`nav-item-${item.id}`}
                  >
                    {/* Active Accent Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-[var(--accent)]" />
                    )}

                    <Icon
                      className={`w-4 h-4 shrink-0 transition ${
                        isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                      }`}
                    />

                    {(!isCollapsed || isOpen) && (
                      <span className="truncate flex-1 text-left font-sans text-xs">
                        {item.label}
                      </span>
                    )}

                    {(!isCollapsed || isOpen) && item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1 py-0 rounded border ${
                          isActive
                            ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] border-transparent'
                            : item.badgeClass || 'badge-neutral'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: Feed Status & User Account Profile */}
        <div
          className="p-2.5 border-t shrink-0 font-mono text-[11px]"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-section-alt)',
          }}
          id="sidebar-footer-corner"
        >
          {(!isCollapsed || isOpen) ? (
            <div className="space-y-2">
              {/* Telemetry Indicator */}
              <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--bullish)]" />
                  <span className="text-[10px] font-mono font-semibold tracking-wider text-[var(--text-primary)]">
                    FEED: ACTIVE
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[var(--text-muted)]">
                  100ms
                </span>
              </div>

              {/* User Account / Profile Box */}
              {user ? (
                <div
                  className="flex items-center justify-between gap-2 p-1.5 rounded border"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  id="sidebar-user-card"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-[10px] bg-[var(--accent)] text-white shrink-0">
                      {user.name ? user.name.slice(0, 2).toUpperCase() : 'TR'}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate font-sans">
                        {user.name}
                      </div>
                      <div className="text-[9px] text-[var(--text-muted)] font-mono">
                        {user.role || 'TRADER'} · {user.plan || 'PRO'}
                      </div>
                    </div>
                  </div>

                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--bearish)] transition cursor-pointer"
                      title="Sign out"
                      id="sidebar-logout-btn"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded font-mono text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition cursor-pointer shadow-xs"
                  id="sidebar-login-btn"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>TRADER LOGIN</span>
                </button>
              )}
              {/* Theme Switcher Row */}
              {onToggleTheme && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">TEMA:</span>
                  <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="pill" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--bullish)]" title="Feed: ACTIVE" />
              {onToggleTheme && (
                <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="button" />
              )}
              {user ? (
                <div
                  className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-[10px] bg-[var(--accent)] text-white cursor-pointer"
                  title={`${user.name} (${user.role})`}
                  onClick={onLogout}
                >
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'TR'}
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="p-1 rounded text-[var(--text-primary)]"
                  title="Trader Login"
                >
                  <UserIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';
