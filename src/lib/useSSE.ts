import { useEffect, useState, useRef, useCallback } from 'react';
import { getAuthToken } from './api';

export type SSEConnectionState = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

interface UseSSEOptions {
  enabled?: boolean;
  onMarketPrices?: (data: any) => void;
  onCurrencyStrength?: (data: any) => void;
  onEventUpdated?: (data: any) => void;
  onNewsIngested?: (data: any) => void;
  onEconomicCalendar?: (data: any) => void;
  onAIAnalysis?: (data: any) => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const isEnabled = options.enabled !== false;
  const [status, setStatus] = useState<SSEConnectionState>('CONNECTING');
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [messagesReceived, setMessagesReceived] = useState<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (!isEnabled) {
      setStatus('DISCONNECTED');
      return;
    }

    const token = getAuthToken();
    const url = token ? `/api/stream?token=${encodeURIComponent(token)}` : '/api/stream';

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('open', () => {
      setStatus('CONNECTED');
    });

    es.addEventListener('handshake', () => {
      setStatus('CONNECTED');
      setMessagesReceived(prev => prev + 1);
    });

    es.addEventListener('heartbeat', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastHeartbeat(data.timestamp);
        setStatus('CONNECTED');
        setMessagesReceived(prev => prev + 1);
      } catch {}
    });

    const handleMarketPrices = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        const prices = Array.isArray(parsed) ? parsed : (parsed.prices || [parsed]);
        optionsRef.current.onMarketPrices?.(prices);
        setMessagesReceived(prev => prev + 1);
      } catch {}
    };

    es.addEventListener('market_prices', handleMarketPrices);
    es.addEventListener('market_update', handleMarketPrices);

    es.addEventListener('currency_strength', (e) => {
      try {
        const data = JSON.parse(e.data);
        const strengths = Array.isArray(data) ? data : (data.strengths || data.currency_strength || [data]);
        optionsRef.current.onCurrencyStrength?.(strengths);
        setMessagesReceived(prev => prev + 1);
      } catch {}
    });

    es.addEventListener('event_updated', (e) => {
      try {
        const data = JSON.parse(e.data);
        optionsRef.current.onEventUpdated?.(data);
        setMessagesReceived(prev => prev + 1);
      } catch {}
    });

    es.addEventListener('news_ingested', (e) => {
      try {
        const data = JSON.parse(e.data);
        optionsRef.current.onNewsIngested?.(data);
        setMessagesReceived(prev => prev + 1);
      } catch {}
    });

    const handleEconomicCalendar = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        const calendar = Array.isArray(parsed) ? parsed : (parsed.events || parsed.calendar || [parsed]);
        optionsRef.current.onEconomicCalendar?.(calendar);
        setMessagesReceived(prev => prev + 1);
      } catch {}
    };

    es.addEventListener('economic_calendar', handleEconomicCalendar);
    es.addEventListener('calendar_update', handleEconomicCalendar);

    es.addEventListener('ai_analysis_updated', (e) => {
      try {
        const data = JSON.parse(e.data);
        optionsRef.current.onAIAnalysis?.(data);
        setMessagesReceived(prev => prev + 1);
      } catch {}
    });

    es.onerror = () => {
      setStatus('CONNECTING');
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return {
    status,
    lastHeartbeat,
    messagesReceived,
    reconnect: connect,
  };
}
