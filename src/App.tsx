import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MarketPrice,
  CurrencyStrength,
  MarketEvent,
  EconomicEvent,
  AIAnalysis,
  User,
  UserWatchlist,
  IntradayAssetBias,
  TodayCatalyst,
  ArahMarketTodayData,
} from './types';
import { api, setAuthToken, getAuthToken, getStoredUser, setStoredUser } from './lib/api';
import {
  auth,
  fbSignOut,
  doc,
  setDoc,
  serverTimestamp,
  db as firestoreDb,
} from './lib/firebase';

import { Sidebar, NavTabId } from './components/Sidebar';
import { Header } from './components/Header';
import { TickerBar } from './components/TickerBar';
import { EventCard } from './components/EventCard';
import { EventDetailModal } from './components/EventDetailModal';
import { CurrencyStrengthWidget } from './components/CurrencyStrengthWidget';
import { MarketDataGrid } from './components/MarketDataGrid';
import { MacroCalendarView } from './components/MacroCalendarView';
import { AIIntelligenceView } from './components/AIIntelligenceView';
import { AdminPanel } from './components/AdminPanel';
import { WatchlistView } from './components/WatchlistView';
import { TradingViewChartModal } from './components/TradingViewChartModal';
import { ArahMarketView } from './components/ArahMarketView';
import { CurrencyPairOpportunityMatrix } from './components/CurrencyPairOpportunityMatrix';
import { IntermarketRelationshipMatrix } from './components/IntermarketRelationshipMatrix';
import { MarketHistoryView } from './components/MarketHistoryView';
import { OverviewDashboard } from './components/OverviewDashboard';
import { PublicLandingPage } from './components/PublicLandingPage';
import { AuthPage } from './components/AuthPage';
import { AutoTriggerNewsModal } from './components/AutoTriggerNewsModal';
import { BreakingNewsAlertPopup } from './components/BreakingNewsAlertPopup';
import { Toaster } from './components/ui/sonner';
import { useMarketDataStream } from './hooks/useMarketDataStream';
import { useNewsAlertManager } from './hooks/useNewsAlertManager';
import {
  useLocation,
  isPublicRoute,
  isPrivateRoute,
  routeToTab,
  tabToRoute,
} from './lib/router';
import { motion, AnimatePresence } from 'motion/react';

import {
  Layers,
  Search,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  Radio,
  RefreshCw,
  Compass,
  Zap,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Activity,
  BarChart2,
  Flame,
  Filter,
} from 'lucide-react';

export default function App() {
  // Router Location
  const { path, navigate } = useLocation();
  // If an auth token is stored in localStorage or memory, set isAuthChecking true so route enforcement waits for validation
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(() => Boolean(getAuthToken()));

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<NavTabId>(() => routeToTab(path));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile drawer
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop compact
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [chartModalSymbol, setChartModalSymbol] = useState<string | null>(null);

  // User State
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [watchlist, setWatchlist] = useState<UserWatchlist[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  // News impact filter: default to HIGH so traders see high-impact news with accurate pair impacts
  const [impactFilter, setImpactFilter] = useState<'HIGH' | 'CRITICAL' | 'ALL'>('HIGH');

  // Pagination for Canonical Event Wire (optimized rendering for large event lists)
  const [wirePage, setWirePage] = useState(1);
  const WIRE_PAGE_SIZE = 18;

  // Modular Hook 1: News & Breaking News Alert Manager
  const {
    autoTriggerConfig,
    isAutoTriggerModalOpen,
    setIsAutoTriggerModalOpen,
    autoTriggerSecondsRemaining,
    totalTriggeredCount,
    newsAlerts,
    isTriggeringNews,
    markAlertAsSeen,
    handleUpdateAutoTriggerConfig,
    handleTriggerNewsNow,
    handleDismissAlert,
    handleDismissAllAlerts,
    addAlert,
  } = useNewsAlertManager({
    onEventReceived: (newEvent) => {
      setEvents(prev => [newEvent, ...prev.filter(e => e.id !== newEvent.id)]);
    },
  });

  // Modular Hook 2: Core Data Collections & SSE Stream Manager
  const {
    prices,
    setPrices,
    strengths,
    setStrengths,
    events,
    setEvents,
    calendar,
    setCalendar,
    overview,
    sessions,
    intradayMap,
    setIntradayMap,
    todayCatalysts,
    setTodayCatalysts,
    arahMarketData,
    setArahMarketData,

    sseStatus,
    initialLoading,
    isSyncing,
    isRefreshingPrices,
    isRefreshingCS,
    isRefreshingMacro,
    isRefreshingIntraday,
    isRefreshingCatalysts,
    isRefreshingArah,

    loadInitialData,
    triggerGlobalSync,
    refreshPrices,
    refreshCurrencyStrength,
    refreshIntradayMap,
    refreshCatalysts,
    refreshArahMarket,
    refreshEvents,
    refreshMacroCalendar,
  } = useMarketDataStream({
    autoTriggerConfig,
    onNewAlert: addAlert,
    markAlertAsSeen,
  });

  // Tab change handler that updates route
  const handleTabChange = useCallback((newTab: NavTabId) => {
    setActiveTab(newTab);
    const targetRoute = tabToRoute(newTab);
    if (targetRoute !== path) {
      navigate(targetRoute);
    }
  }, [navigate, path]);

  // Check current user session on mount
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        const token = getAuthToken();
        const cachedUser = getStoredUser();
        if (cachedUser && isMounted) {
          setUser(cachedUser);
        }

        if (token) {
          try {
            const meRes = await api.getMe();
            if (isMounted) {
              setUser(meRes.user);
              setStoredUser(meRes.user);
              setWatchlist(meRes.watchlist || []);
            }
          } catch (apiErr: any) {
            // Only clear token if server explicitly responds with 401 or 403 (invalid/expired credentials)
            if (apiErr.status === 401 || apiErr.status === 403 || apiErr.code === 'INVALID_TOKEN') {
              console.warn('[Auth] Session token expired or invalid, signing out.');
              setAuthToken(null);
              setStoredUser(null);
              if (isMounted) setUser(null);
            } else {
              // Network disconnect, timeout or server restart: retain cached session!
              console.warn('[Auth] Network or transient notice during session check:', apiErr?.message);
            }
          }
        } else {
          setStoredUser(null);
          if (isMounted) setUser(null);
        }
      } catch (err) {
        console.warn('Session verification notice:', err);
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
          loadInitialData();
        }
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, [loadInitialData]);

  // Route enforcement & sync
  useEffect(() => {
    if (isAuthChecking) return;

    if (!user) {
      // Unauthenticated user attempting to access private route -> redirect to /login
      if (isPrivateRoute(path)) {
        navigate('/login', true);
      }
    } else {
      // Authenticated user
      if (path === '/' || path === '/login' || path === '/register') {
        navigate('/dashboard', true);
      } else if (isPrivateRoute(path)) {
        const expectedTab = routeToTab(path);
        if (expectedTab !== activeTab) {
          setActiveTab(expectedTab);
        }
      }
    }
  }, [user, path, isAuthChecking, navigate, activeTab]);

  // Watchlist Toggle with Firestore sync
  const handleToggleWatchlist = useCallback(async (symbol: string, assetType: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const exists = watchlist.some(w => w.symbol === symbol);
    if (exists) {
      await api.removeFromWatchlist(symbol);
      setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
    } else {
      const res = await api.addToWatchlist(symbol, assetType);
      if (res.item) setWatchlist(prev => [...prev, res.item]);
    }
    // Persist watchlist to Firestore database
    try {
      const userDocRef = doc(firestoreDb, 'users', user.id);
      const nextSymbols = exists
        ? watchlist.filter(w => w.symbol !== symbol).map(w => w.symbol)
        : [...watchlist.map(w => w.symbol), symbol];
      await setDoc(userDocRef, {
        watchlistSymbols: nextSymbols,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (fsErr) {
      console.warn('[Firestore] Watchlist sync notice:', fsErr);
    }
  }, [user, watchlist, navigate]);

  // Logout Handler with Firebase Sign-Out
  const handleLogout = useCallback(() => {
    fbSignOut(auth).catch(() => {});
    setAuthToken(null);
    setStoredUser(null);
    setUser(null);
    setWatchlist([]);
    navigate('/login');
  }, [navigate]);

  const handleAuthSuccess = useCallback(async (u: User, token?: string) => {
    if (token) {
      setAuthToken(token);
    }
    setUser(u);
    setStoredUser(u);
    try {
      const me = await api.getMe();
      setUser(me.user);
      setStoredUser(me.user);
      setWatchlist(me.watchlist || []);
    } catch (err) {
      console.warn('Profile hydration notice:', err);
    }
    loadInitialData();
    navigate('/dashboard', true);
  }, [loadInitialData, navigate]);

  const handleSelectSymbol = useCallback((sym: string | null) => {
    setSelectedSymbol(prev => (prev === sym ? null : sym));
  }, []);

  const handleOpenChart = useCallback((sym: string) => {
    setChartModalSymbol(sym);
  }, []);

  const handleSelectEvent = useCallback((id: string | null) => {
    setSelectedEventId(id);
  }, []);

  // Filtered Events for Wire - strictly newest first
  const filteredEvents = useMemo(() => {
    return events
      .filter(e => {
        if (impactFilter === 'HIGH' && e.impact_level !== 'CRITICAL' && e.impact_level !== 'HIGH') {
          return false;
        }
        if (impactFilter === 'CRITICAL' && e.impact_level !== 'CRITICAL') {
          return false;
        }
        if (categoryFilter !== 'ALL' && e.primary_category !== categoryFilter) return false;
        if (selectedSymbol && !e.affected_assets.includes(selectedSymbol) && !e.affected_currencies.includes(selectedSymbol)) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = e.title.toLowerCase().includes(q);
          const matchSummary = e.summary.toLowerCase().includes(q);
          const matchSources = e.source_names.some(s => s.toLowerCase().includes(q));
          const matchAssets = e.affected_assets.some(a => a.toLowerCase().includes(q));
          const matchCurrs = e.affected_currencies.some(c => c.toLowerCase().includes(q));
          return matchTitle || matchSummary || matchSources || matchAssets || matchCurrs;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.first_detected_at).getTime() || 0;
        const timeB = new Date(b.first_detected_at).getTime() || 0;
        return timeB - timeA;
      });
  }, [events, impactFilter, categoryFilter, selectedSymbol, searchQuery]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setWirePage(1);
  }, [impactFilter, categoryFilter, selectedSymbol, searchQuery]);

  const totalWirePages = Math.max(1, Math.ceil(filteredEvents.length / WIRE_PAGE_SIZE));
  const paginatedEvents = useMemo(() => {
    const startIndex = (wirePage - 1) * WIRE_PAGE_SIZE;
    return filteredEvents.slice(startIndex, startIndex + WIRE_PAGE_SIZE);
  }, [filteredEvents, wirePage, WIRE_PAGE_SIZE]);

  const watchlistSymbols = useMemo(() => watchlist.map(w => w.symbol), [watchlist]);

  // Screen 1: Session Verification
  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-mono" style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-xs bg-[var(--accent)] text-white shadow-xs">
            IM
          </div>
          <span className="text-sm font-bold tracking-wider font-mono text-[var(--text-primary)]">
            ARAH <span className="text-[var(--accent)]">MARKET</span>
          </span>
        </div>
        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-ping" />
          <span>Verifying encrypted terminal session...</span>
        </div>
      </div>
    );
  }

  // Screen 2: Unauthenticated Visitor Flow (Auth Pages & Optional Public Landing)
  if (!user) {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const hasToken = searchParams ? searchParams.has('token') : false;

    if (hasToken && path !== '/reset-password') {
      return (
        <AuthPage
          mode="verify-email"
          onNavigate={navigate}
          onSuccess={(u, tok) => handleAuthSuccess(u, tok)}
        />
      );
    }

    if (path === '/login') {
      return (
        <AuthPage
          mode="login"
          onNavigate={navigate}
          onSuccess={(u, tok) => handleAuthSuccess(u, tok)}
        />
      );
    }

    if (path === '/register') {
      return (
        <AuthPage
          mode="register"
          onNavigate={navigate}
          onSuccess={(u, tok) => handleAuthSuccess(u, tok)}
        />
      );
    }

    if (path === '/verify-email') {
      return (
        <AuthPage
          mode="verify-email"
          onNavigate={navigate}
          onSuccess={(u, tok) => handleAuthSuccess(u, tok)}
        />
      );
    }

    if (path === '/forgot-password') {
      return (
        <AuthPage
          mode="forgot-password"
          onNavigate={navigate}
          onSuccess={(u, tok) => handleAuthSuccess(u, tok)}
        />
      );
    }

    if (path === '/reset-password') {
      return (
        <AuthPage
          mode="reset-password"
          onNavigate={navigate}
          onSuccess={(u, tok) => handleAuthSuccess(u, tok)}
        />
      );
    }

    if (path === '/magic-link') {
      navigate('/login');
      return null;
    }

    if (path === '/landing' || path === '/features') {
      return (
        <PublicLandingPage
          currentPath={path}
          onNavigate={navigate}
          user={user}
        />
      );
    }

    // Default flow: direct access to the Linear Pro Terminal workspace for all visitors & traders
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Global Responsive Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        user={user}
        onOpenAuth={() => navigate('/login')}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          sseStatus={sseStatus}
          sessions={sessions}
          onTriggerGlobalSync={triggerGlobalSync}
          isSyncing={isSyncing}
          onToggleMobileMenu={() => setIsSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenAutoTriggerModal={() => setIsAutoTriggerModalOpen(true)}
          isAutoTriggerActive={autoTriggerConfig.enabled}
          autoTriggerSecondsRemaining={autoTriggerSecondsRemaining}
        />

        {/* Real-time Ticker Bar */}
        <TickerBar
          prices={prices}
          selectedSymbol={selectedSymbol}
          onSelectSymbol={(sym) => {
            handleSelectSymbol(sym);
            if (activeTab !== 'terminal') handleTabChange('terminal');
          }}
          onOpenChart={handleOpenChart}
        />

        {/* Active Instrument Filter Strip */}
        {selectedSymbol && (
          <div className="bg-cyan-950/70 border-b border-cyan-800/60 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-cyan-300">
            <div className="flex items-center gap-2">
              <span>FILTERED BY INSTRUMENT:</span>
              <strong className="text-white font-bold bg-cyan-900 px-2 py-0.5 rounded">{selectedSymbol}</strong>
              <span className="text-slate-400 hidden sm:inline">Highlighting events and macro correlations</span>
            </div>
            <button
              onClick={() => setSelectedSymbol(null)}
              className="text-cyan-400 hover:text-white underline cursor-pointer"
            >
              Clear Filter ×
            </button>
          </div>
        )}

        {/* 3. Primary Views Workspace */}
        <main className="flex-1 p-3 sm:p-4 max-w-[1720px] w-full mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full space-y-4"
            >
          {/* VIEW 1: TERMINAL / OVERVIEW DASHBOARD */}
          {activeTab === 'terminal' && (
            <OverviewDashboard
              intradayMap={intradayMap}
              todayCatalysts={todayCatalysts}
              prices={prices}
              strengths={strengths}
              events={filteredEvents}
              calendar={calendar}
              overview={overview}
              watchlistSymbols={watchlistSymbols}
              selectedSymbol={selectedSymbol}
              onSelectSymbol={handleSelectSymbol}
              onNavigateTab={handleTabChange}
              onToggleWatchlist={handleToggleWatchlist}
              onOpenChart={handleOpenChart}
              onSelectEvent={handleSelectEvent}
              onRefreshPrices={refreshPrices}
              isRefreshingPrices={isRefreshingPrices}
              onRefreshCS={refreshCurrencyStrength}
              isRefreshingCS={isRefreshingCS}
              onSyncWire={refreshEvents}
              isSyncingWire={isSyncing}
            />
          )}

          {/* VIEW 1.5: ARAH MARKET HARI INI (TRIPLE-CONFLUENCE INTRADAY) */}
          {activeTab === 'arah_market' && (
            <ArahMarketView
              data={arahMarketData}
              isLoading={initialLoading}
              onRefresh={refreshArahMarket}
              isRefreshing={isRefreshingArah}
              onOpenChart={handleOpenChart}
            />
          )}

          {/* VIEW 4: LIVE MARKET SURVEILLANCE GRID */}
          {activeTab === 'markets' && (
            <div className="space-y-4">
              <MarketDataGrid
                prices={prices}
                watchlistSymbols={watchlistSymbols}
                intradayMap={intradayMap}
                onToggleWatchlist={handleToggleWatchlist}
                onRefresh={refreshPrices}
                isRefreshing={isRefreshingPrices}
                onSelectSymbol={handleSelectSymbol}
                onOpenChart={handleOpenChart}
              />
            </div>
          )}

          {/* VIEW: INTERMARKET RELATIONSHIP MATRIX */}
          {activeTab === 'intermarket' && (
            <IntermarketRelationshipMatrix
              prices={prices}
              strengths={strengths}
              onOpenChart={handleOpenChart}
              onSelectSymbol={handleSelectSymbol}
              onRefresh={async () => {
                await Promise.all([refreshPrices(), refreshCurrencyStrength()]);
              }}
              isRefreshing={isRefreshingPrices || isRefreshingCS}
            />
          )}

          {/* VIEW 5: CURRENCY MATRIX */}
          {activeTab === 'currency' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5">
                <CurrencyStrengthWidget
                  strengths={strengths}
                  onRefresh={refreshCurrencyStrength}
                  isRefreshing={isRefreshingCS}
                />
              </div>

              <div className="lg:col-span-7">
                <CurrencyPairOpportunityMatrix
                  strengths={strengths}
                  onOpenChart={handleOpenChart}
                  onSelectSymbol={handleSelectSymbol}
                />
              </div>
            </div>
          )}

          {/* VIEW 6: MACRO CALENDAR */}
          {activeTab === 'macro' && (
            <MacroCalendarView
              events={calendar}
              onRefresh={refreshMacroCalendar}
              isRefreshing={isRefreshingMacro}
            />
          )}

          {/* VIEW 7: CANONICAL EVENT WIRE */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="terminal-panel p-4 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xs sm:text-sm font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[var(--accent)]" />
                      <span>DEDUPLICATED EVENT WIRE</span>
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">
                      ONE EVENT → ONE CANONICAL ID → MULTIPLE SOURCES → DIRECT TRANSMISSION
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={refreshEvents}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-mono font-medium transition cursor-pointer disabled:opacity-50"
                      title="Sync wire with latest source releases"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[var(--accent)]' : ''}`} />
                      <span>Sync Wire</span>
                    </button>

                    <input
                      type="text"
                      placeholder="Search news, pairs, assets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-[var(--bg-section-alt)] border border-[var(--border-subtle)] px-3 py-1.5 rounded text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none w-48 sm:w-60 focus:border-[var(--text-primary)] transition"
                    />
                  </div>
                </div>

                {/* Filter Controls: Impact Level & Category */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                  {/* Impact Filter Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs">
                    <span className="metadata-label text-[10px] text-[var(--text-muted)] flex items-center gap-1 mr-1">
                      <Filter className="w-3 h-3 text-[var(--accent)]" />
                      <span>IMPACT:</span>
                    </span>

                    <button
                      onClick={() => setImpactFilter('HIGH')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold border transition cursor-pointer ${
                        impactFilter === 'HIGH'
                          ? 'badge-warning border-[var(--warning)]'
                          : 'bg-[var(--bg-section-alt)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                      }`}
                      title="Show only High & Critical impact events for reliable pair correlations"
                    >
                      <Flame className="w-3.5 h-3.5 text-[var(--warning)]" />
                      <span>HIGH IMPACT</span>
                      <span className="text-[9px] px-1 py-0 rounded bg-[var(--warning-border)] text-[var(--warning)]">
                        {events.filter(e => e.impact_level === 'CRITICAL' || e.impact_level === 'HIGH').length}
                      </span>
                    </button>

                    <button
                      onClick={() => setImpactFilter('CRITICAL')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold border transition cursor-pointer ${
                        impactFilter === 'CRITICAL'
                          ? 'badge-bearish border-[var(--bearish)]'
                          : 'bg-[var(--bg-section-alt)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                      }`}
                      title="Show only critical macro events (Rates, geopolitical disruptions, liquidity shocks)"
                    >
                      <Zap className="w-3.5 h-3.5 text-[var(--bearish)]" />
                      <span>CRITICAL ONLY</span>
                      <span className="text-[9px] px-1 py-0 rounded bg-[var(--bearish-border)] text-[var(--bearish)]">
                        {events.filter(e => e.impact_level === 'CRITICAL').length}
                      </span>
                    </button>

                    <button
                      onClick={() => setImpactFilter('ALL')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium border transition cursor-pointer ${
                        impactFilter === 'ALL'
                          ? 'bg-[var(--active-bg)] text-[var(--active-text)] border-[var(--active-border)] shadow-xs font-semibold'
                          : 'bg-[var(--bg-section-alt)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>ALL LEVELS ({events.length})</span>
                    </button>
                  </div>

                  {/* Category Filter Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto text-xs font-mono">
                    {['ALL', 'MACRO', 'CENTRAL_BANK', 'COMMODITIES', 'GEOPOLITICS', 'CRYPTO'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition cursor-pointer border ${
                          categoryFilter === cat
                            ? 'bg-[var(--active-bg)] text-[var(--active-text)] border-[var(--active-border)] font-bold shadow-xs'
                            : 'bg-[var(--bg-section-alt)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* High Impact Mode Explanatory Banner */}
                {impactFilter !== 'ALL' && (
                  <div className="p-2.5 rounded border flex items-center justify-between text-xs font-mono badge-warning">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-[var(--warning)] shrink-0" />
                      <span>
                        <strong>High Impact Filter Active:</strong> Displaying high-volatility macro drivers (Monetary Policy, CPI, Geopolitics, Commodities) for maximum transmission precision.
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 hidden sm:inline ml-2">
                      {filteredEvents.length} of {events.length} events
                    </span>
                  </div>
                )}
              </div>

              {filteredEvents.length === 0 ? (
                <div className="terminal-panel p-10 text-center space-y-3 font-mono">
                  <Flame className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">No events match the selected criteria</h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                    No active wire stories found {impactFilter !== 'ALL' ? `with impact ${impactFilter}` : ''} in the selected category.
                  </p>
                  <button
                    onClick={() => {
                      setImpactFilter('ALL');
                      setCategoryFilter('ALL');
                      setSearchQuery('');
                    }}
                    className="px-3.5 py-1.5 rounded bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--accent)] text-xs font-mono font-bold transition cursor-pointer border border-[var(--border-subtle)]"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {paginatedEvents.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onClick={() => setSelectedEventId(event.id)}
                      />
                    ))}
                  </div>

                  {/* High-Performance Pagination Bar */}
                  {totalWirePages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded terminal-panel text-xs font-mono text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-secondary)]">
                          Showing <strong className="text-[var(--text-primary)]">{(wirePage - 1) * WIRE_PAGE_SIZE + 1}</strong> -{' '}
                          <strong className="text-[var(--text-primary)]">{Math.min(wirePage * WIRE_PAGE_SIZE, filteredEvents.length)}</strong> of{' '}
                          <strong className="text-[var(--text-primary)]">{filteredEvents.length}</strong> events
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setWirePage(prev => Math.max(1, prev - 1))}
                          disabled={wirePage === 1}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer border border-[var(--border-subtle)]"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Prev</span>
                        </button>

                        <div className="flex items-center gap-1 px-2">
                          <span className="text-[var(--text-primary)] font-bold">{wirePage}</span>
                          <span className="text-[var(--text-muted)]">/</span>
                          <span className="text-[var(--text-secondary)]">{totalWirePages}</span>
                        </div>

                        <button
                          onClick={() => setWirePage(prev => Math.min(totalWirePages, prev + 1))}
                          disabled={wirePage >= totalWirePages}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer border border-[var(--border-subtle)]"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW 8: AI INTELLIGENCE */}
          {activeTab === 'intelligence' && (
            <AIIntelligenceView
              initialOverview={overview}
              user={user}
            />
          )}

          {/* VIEW 8.5: MARKET HISTORY & PERMANENT MEMORY */}
          {activeTab === 'history' && (
            <MarketHistoryView
              onOpenChart={handleOpenChart}
            />
          )}

          {/* VIEW 9: WATCHLIST */}
          {activeTab === 'watchlist' && (
            <WatchlistView
              watchlist={watchlist}
              prices={prices}
              user={user}
              onOpenAuth={() => navigate('/login')}
              onRemove={async (symbol) => {
                await api.removeFromWatchlist(symbol);
                setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
              }}
              onAdd={async (symbol, assetType) => {
                try {
                  const res = await api.addToWatchlist(symbol, assetType);
                  if (res.item) setWatchlist(prev => [...prev, res.item]);
                } catch (err: any) {
                  console.warn('[Watchlist] Add item notice:', err?.message);
                }
              }}
              onSelectSymbol={(sym) => {
                handleSelectSymbol(sym);
                handleTabChange('terminal');
              }}
            />
          )}

          {/* VIEW 10: ADMIN PANEL */}
          {activeTab === 'admin' && (
            user?.role === 'ADMIN' ? (
              <AdminPanel currentUser={user} />
            ) : (
              <div className="max-w-md mx-auto my-12 p-6 rounded border text-center font-mono bg-[var(--bg-surface)] border-[var(--border-subtle)]">
                <div className="w-12 h-12 mx-auto rounded-full bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 mb-4">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-wider">Access Restricted</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Administrative Telemetry & Feed Orchestration is restricted to system administrators with verified authority.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    onClick={() => handleTabChange('terminal')}
                    className="px-4 py-2 bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded border border-[var(--border-subtle)] transition cursor-pointer"
                  >
                    Return to Terminal
                  </button>
                </div>
              </div>
            )
          )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 3. Event Detail Modal */}
      {selectedEventId && (
        <EventDetailModal
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
        />
      )}

      {/* 5. TradingView Interactive Candlestick Chart Modal */}
      {chartModalSymbol && (
        <TradingViewChartModal
          initialSymbol={chartModalSymbol}
          prices={prices}
          onClose={() => setChartModalSymbol(null)}
        />
      )}

      {/* 6. Real-time Breaking News Alert Popup (Floating Toast / Banner Alert) */}
      <BreakingNewsAlertPopup
        alerts={newsAlerts}
        onDismiss={handleDismissAlert}
        onDismissAll={handleDismissAllAlerts}
        onOpenEventDetail={(event) => setSelectedEventId(event.id)}
        onOpenChart={(sym) => setChartModalSymbol(sym)}
        onOpenTriggerModal={() => setIsAutoTriggerModalOpen(true)}
      />

      {/* 7. Auto-Trigger News Configuration & Action Modal */}
      <AutoTriggerNewsModal
        isOpen={isAutoTriggerModalOpen}
        onClose={() => setIsAutoTriggerModalOpen(false)}
        config={autoTriggerConfig}
        onUpdateConfig={handleUpdateAutoTriggerConfig}
        onTriggerNow={handleTriggerNewsNow}
        isTriggering={isTriggeringNews}
        secondsRemaining={autoTriggerSecondsRemaining}
        totalTriggeredCount={totalTriggeredCount}
      />

      {/* shadcn Sonner Toast Provider */}
      <Toaster position="top-right" richColors />
    </div>
  );
}
