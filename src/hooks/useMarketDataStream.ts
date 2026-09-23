import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MarketPrice,
  CurrencyStrength,
  MarketEvent,
  EconomicEvent,
  IntradayAssetBias,
  TodayCatalyst,
  ArahMarketTodayData,
  AIAnalysis,
} from '../types';
import { api } from '../lib/api';
import { useSSE } from '../lib/useSSE';
import { AutoTriggerConfig } from '../components/AutoTriggerNewsModal';
import { TriggeredNewsAlert } from '../components/BreakingNewsAlertPopup';
import { soundManager } from '../lib/sound';

export function useMarketDataStream(options: {
  autoTriggerConfig: AutoTriggerConfig;
  onNewAlert: (alert: TriggeredNewsAlert) => void;
  markAlertAsSeen: (key: string) => boolean;
}) {
  const { autoTriggerConfig, onNewAlert, markAlertAsSeen } = options;

  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [strengths, setStrengths] = useState<CurrencyStrength[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [calendar, setCalendar] = useState<EconomicEvent[]>([]);
  const [overview, setOverview] = useState<AIAnalysis | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [intradayMap, setIntradayMap] = useState<IntradayAssetBias[]>([]);
  const [todayCatalysts, setTodayCatalysts] = useState<TodayCatalyst[]>([]);
  const [arahMarketData, setArahMarketData] = useState<ArahMarketTodayData | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [isRefreshingCS, setIsRefreshingCS] = useState(false);
  const [isRefreshingMacro, setIsRefreshingMacro] = useState(false);
  const [isRefreshingIntraday, setIsRefreshingIntraday] = useState(false);
  const [isRefreshingCatalysts, setIsRefreshingCatalysts] = useState(false);
  const [isRefreshingArah, setIsRefreshingArah] = useState(false);

  // Debounced map recalculation ref to avoid burst calls on SSE ticks
  const intradayDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerDebouncedIntradayRefresh = useCallback(() => {
    if (intradayDebounceTimerRef.current) return;
    intradayDebounceTimerRef.current = setTimeout(() => {
      intradayDebounceTimerRef.current = null;
      api.getIntradayMarketMap()
        .then(res => setIntradayMap(res.market_map))
        .catch(() => {});
    }, 1200); // 1.2s batching
  }, []);

  // Real-time SSE listener
  const { status: sseStatus } = useSSE({
    enabled: true,
    onMarketPrices: (updatedPrices: MarketPrice[]) => {
      setPrices(updatedPrices);
      triggerDebouncedIntradayRefresh();
    },
    onCurrencyStrength: (updatedStrengths: CurrencyStrength[]) => {
      setStrengths(updatedStrengths);
      triggerDebouncedIntradayRefresh();
    },
    onNewsIngested: (data: any) => {
      if (data?.eventId) {
        const alertKey = String(data.news?.id || data.eventId || '');
        api.getEventDetail(data.eventId).then(res => {
          if (res.event) {
            setEvents(prev => {
              if (prev.some(e => e.id === res.event.id)) return prev;
              return [res.event, ...prev];
            });

            if (!markAlertAsSeen(alertKey)) return;

            if (
              autoTriggerConfig.minImpact === 'ALL' ||
              res.event.impact_level === 'CRITICAL' ||
              res.event.impact_level === 'HIGH' ||
              (autoTriggerConfig.minImpact !== 'CRITICAL' && res.event.impact_level === 'MEDIUM')
            ) {
              if (autoTriggerConfig.soundEnabled) {
                soundManager.playBreakingNewsChime();
              }
              const newAlert: TriggeredNewsAlert = {
                id: `alert_sse_${res.event.id}_${Date.now()}`,
                event: res.event,
                newsTitle: data.news?.title || res.event.title,
                newsContent: data.news?.content || res.event.summary,
                sourceName: data.news?.source_name || res.event.source_names?.[0],
                sourceUrl: data.news?.source_url,
                triggeredAt: new Date(),
              };
              onNewAlert(newAlert);
            }
          }
        }).catch(() => {});
      }
    },
    onEventUpdated: (updatedEvent: MarketEvent) => {
      setEvents(prev => {
        const index = prev.findIndex(e => e.id === updatedEvent.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedEvent;
          return next;
        }
        return [updatedEvent, ...prev];
      });
    },
    onEconomicCalendar: (updatedCalendar: EconomicEvent[]) => {
      setCalendar(updatedCalendar);
      api.getTodayCatalysts().then(res => setTodayCatalysts(res.catalysts)).catch(() => {});
    },
  });

  // Initial Full Load
  const loadInitialData = useCallback(async () => {
    try {
      setInitialLoading(true);
      const [mktRes, curRes, evtRes, calRes, sesRes, mapRes, catRes, arahRes] = await Promise.allSettled([
        api.getMarkets(),
        api.getCurrencyStrength(),
        api.getEvents(40),
        api.getEconomicCalendar(200),
        api.getMarketSessions(),
        api.getIntradayMarketMap(),
        api.getTodayCatalysts(),
        api.getArahMarketToday(),
      ]);

      if (mktRes.status === 'fulfilled') setPrices(mktRes.value.prices);
      if (curRes.status === 'fulfilled') setStrengths(curRes.value.currency_strength);
      if (evtRes.status === 'fulfilled') setEvents(evtRes.value.events);
      if (calRes.status === 'fulfilled') setCalendar(calRes.value.calendar);
      if (sesRes.status === 'fulfilled') setSessions(sesRes.value.sessions);
      if (mapRes.status === 'fulfilled') setIntradayMap(mapRes.value.market_map);
      if (catRes.status === 'fulfilled') setTodayCatalysts(catRes.value.catalysts);
      if (arahRes.status === 'fulfilled' && arahRes.value?.data) setArahMarketData(arahRes.value.data);
    } catch (err) {
      console.warn('Initialization notice:', err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // Global Ingestion Trigger
  const triggerGlobalSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      await api.runGlobalIngest();
      const [eRes, cRes, mRes, mapRes, catRes] = await Promise.allSettled([
        api.getEvents(40),
        api.getCurrencyStrength(),
        api.getMarkets(),
        api.getIntradayMarketMap(),
        api.getTodayCatalysts(),
      ]);
      if (eRes.status === 'fulfilled') setEvents(eRes.value.events);
      if (cRes.status === 'fulfilled') setStrengths(cRes.value.currency_strength);
      if (mRes.status === 'fulfilled') setPrices(mRes.value.prices);
      if (mapRes.status === 'fulfilled') setIntradayMap(mapRes.value.market_map);
      if (catRes.status === 'fulfilled') setTodayCatalysts(catRes.value.catalysts);
    } catch (err) {
      console.error('Manual sync notice:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Individual refreshed actions
  const refreshPrices = useCallback(async () => {
    setIsRefreshingPrices(true);
    try {
      await api.refreshMarkets();
      const res = await api.getMarkets();
      setPrices(res.prices);
    } finally {
      setIsRefreshingPrices(false);
    }
  }, []);

  const refreshCurrencyStrength = useCallback(async () => {
    setIsRefreshingCS(true);
    try {
      const res = await api.refreshCurrencyStrength();
      setStrengths(res.currency_strength);
    } finally {
      setIsRefreshingCS(false);
    }
  }, []);

  const refreshIntradayMap = useCallback(async () => {
    setIsRefreshingIntraday(true);
    try {
      const res = await api.getIntradayMarketMap();
      setIntradayMap(res.market_map);
    } finally {
      setIsRefreshingIntraday(false);
    }
  }, []);

  const refreshCatalysts = useCallback(async () => {
    setIsRefreshingCatalysts(true);
    try {
      const res = await api.getTodayCatalysts();
      setTodayCatalysts(res.catalysts);
    } finally {
      setIsRefreshingCatalysts(false);
    }
  }, []);

  const refreshArahMarket = useCallback(async () => {
    setIsRefreshingArah(true);
    try {
      const res = await api.getArahMarketToday();
      if (res.data) setArahMarketData(res.data);
    } catch (e) {
      console.error('Failed to refresh Arah Market:', e);
    } finally {
      setIsRefreshingArah(false);
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await api.getEvents(40);
      setEvents(res.events);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const refreshMacroCalendar = useCallback(async () => {
    setIsRefreshingMacro(true);
    try {
      await api.refreshEconomicCalendar();
      const res = await api.getEconomicCalendar();
      setCalendar(res.calendar);
    } finally {
      setIsRefreshingMacro(false);
    }
  }, []);

  return {
    // Data
    prices,
    setPrices,
    strengths,
    setStrengths,
    events,
    setEvents,
    calendar,
    setCalendar,
    overview,
    setOverview,
    sessions,
    intradayMap,
    setIntradayMap,
    todayCatalysts,
    setTodayCatalysts,
    arahMarketData,
    setArahMarketData,

    // Status
    sseStatus,
    initialLoading,
    isSyncing,
    isRefreshingPrices,
    isRefreshingCS,
    isRefreshingMacro,
    isRefreshingIntraday,
    isRefreshingCatalysts,
    isRefreshingArah,

    // Actions
    loadInitialData,
    triggerGlobalSync,
    refreshPrices,
    refreshCurrencyStrength,
    refreshIntradayMap,
    refreshCatalysts,
    refreshArahMarket,
    refreshEvents,
    refreshMacroCalendar,
  };
}
