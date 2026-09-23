import { useState, useEffect, useCallback, useRef } from 'react';
import { AutoTriggerConfig } from '../components/AutoTriggerNewsModal';
import { TriggeredNewsAlert } from '../components/BreakingNewsAlertPopup';
import { api } from '../lib/api';
import { soundManager } from '../lib/sound';
import { MarketEvent } from '../types';

export function useNewsAlertManager(options: {
  onEventReceived?: (event: MarketEvent) => void;
}) {
  const { onEventReceived } = options;

  const [autoTriggerConfig, setAutoTriggerConfig] = useState<AutoTriggerConfig>(() => {
    try {
      const saved = localStorage.getItem('arah_auto_trigger_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      enabled: false, // Default to false: rely on real-time Telegram SSE stream
      intervalSeconds: 60,
      minImpact: 'HIGH',
      soundEnabled: true,
      selectedCategory: 'ALL',
    };
  });

  const [isAutoTriggerModalOpen, setIsAutoTriggerModalOpen] = useState(false);
  const [autoTriggerSecondsRemaining, setAutoTriggerSecondsRemaining] = useState(autoTriggerConfig.intervalSeconds);
  const [totalTriggeredCount, setTotalTriggeredCount] = useState(0);
  const [newsAlerts, setNewsAlerts] = useState<TriggeredNewsAlert[]>([]);
  const [isTriggeringNews, setIsTriggeringNews] = useState(false);
  const isTriggeringNewsRef = useRef(false);

  // Set of news and event keys that have ALREADY been shown in a popup
  const seenAlertKeysRef = useRef<Set<string>>(new Set<string>());

  const markAlertAsSeen = useCallback((key: string): boolean => {
    if (!key) return false;
    if (seenAlertKeysRef.current.has(key)) return false;
    seenAlertKeysRef.current.add(key);
    return true;
  }, []);

  const handleUpdateAutoTriggerConfig = useCallback((updates: Partial<AutoTriggerConfig>) => {
    setAutoTriggerConfig(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('arah_auto_trigger_config', JSON.stringify(next));
      } catch {}
      return next;
    });
    if (updates.intervalSeconds !== undefined) {
      setAutoTriggerSecondsRemaining(updates.intervalSeconds);
    }
  }, []);

  const handleTriggerNewsNow = useCallback(async (preset?: {
    category?: string;
    title?: string;
    content?: string;
    affected_assets?: string[];
    affected_currencies?: string[];
  }) => {
    if (isTriggeringNewsRef.current) return;

    try {
      isTriggeringNewsRef.current = true;
      setIsTriggeringNews(true);
      const res = await api.triggerNews(preset);
      if (res.success && res.event && res.isNew !== false) {
        const alertKey = String(res.news?.id || res.event.id || '');
        if (!markAlertAsSeen(alertKey)) return;

        setTotalTriggeredCount(prev => prev + 1);

        if (autoTriggerConfig.soundEnabled) {
          soundManager.playBreakingNewsChime();
        }

        const newAlert: TriggeredNewsAlert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          event: res.event,
          newsTitle: res.news?.title || res.event.title,
          newsContent: res.news?.content || res.event.summary,
          sourceName: res.news?.source_name || res.event.source_names?.[0],
          sourceUrl: res.news?.source_url,
          triggeredAt: new Date(),
        };

        setNewsAlerts([newAlert]);
        if (onEventReceived) {
          onEventReceived(res.event);
        }
      }
    } catch (err: any) {
      console.warn('[AutoTrigger] News trigger network notice:', err?.message || err);
    } finally {
      isTriggeringNewsRef.current = false;
      setIsTriggeringNews(false);
    }
  }, [autoTriggerConfig.soundEnabled, markAlertAsSeen, onEventReceived]);

  const handleDismissAlert = useCallback(() => {
    setNewsAlerts([]);
  }, []);

  const handleDismissAllAlerts = useCallback(() => {
    setNewsAlerts([]);
  }, []);

  const addAlert = useCallback((alert: TriggeredNewsAlert) => {
    setNewsAlerts([alert]);
  }, []);

  // Interval Countdown
  useEffect(() => {
    if (!autoTriggerConfig.enabled) return;

    setAutoTriggerSecondsRemaining(autoTriggerConfig.intervalSeconds);
    const interval = setInterval(() => {
      setAutoTriggerSecondsRemaining(prev => {
        if (prev <= 1) {
          if (!isTriggeringNewsRef.current) {
            handleTriggerNewsNow();
          }
          return autoTriggerConfig.intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoTriggerConfig.enabled, autoTriggerConfig.intervalSeconds, handleTriggerNewsNow]);

  return {
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
  };
}
