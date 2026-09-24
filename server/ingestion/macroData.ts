/**
 * Macroeconomic Data & Calendar Ingestion Engine
 * Pulls CURRENT REAL macroeconomic releases and forward schedules:
 * CPI, PPI, NFP, GDP, Interest rates, Central bank speeches & rate decisions,
 * Employment data, PMI, Retail sales, Unemployment, Inflation.
 *
 * Primary source: TradingView Institutional Economic Calendar API
 * Secondary fallback: FairEconomy Economic Calendar feed
 */

import { db } from '../db/database.js';
import { EconomicEvent } from '../types.js';
import { sseBroker } from '../realtime/sse.js';
import { MacroIntelligenceEngine } from '../intelligence/macroIntelligence.js';

export class MacroDataService {
  /**
   * Fetches real macroeconomic releases from TradingView
   */
  public static async fetchEconomicCalendar(): Promise<EconomicEvent[]> {
    const now = new Date();
    // Query window: 3 days past (for recent actual releases) to 7 days future (upcoming events)
    const from = new Date(now.getTime() - 3 * 86400000).toISOString();
    const to = new Date(now.getTime() + 7 * 86400000).toISOString();
    const nowIso = now.toISOString();

    // 1. Primary: TradingView Economic Calendar API
    try {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 8000);
      const tvUrl = `https://economic-calendar.tradingview.com/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

      const response = await fetch(tvUrl, {
        signal: ctrl.signal,
        headers: {
          'Origin': 'https://www.tradingview.com',
          'Referer': 'https://www.tradingview.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const rawEvents = json.result || [];

        if (Array.isArray(rawEvents) && rawEvents.length > 0) {
          const mapped = this.normalizeTradingViewEvents(rawEvents, now);

          // Update database with 100% real events
          await db.setEconomicEvents(mapped);
          await db.updateSourceStatus('src_macro_calendar', 'LIVE');

          // Broadcast real calendar data over SSE (prioritizing upcoming & recent releases)
          const prioritizedForSSE = await db.getEconomicEvents(120);
          sseBroker.broadcast('economic_calendar', prioritizedForSSE);
          return mapped;
        }
      }
    } catch (err: any) {
      console.warn('[MacroData] Primary TradingView fetch error:', err.message);
    }

    // 2. Fallback: FairEconomy Calendar Feed
    try {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const rawEvents = await res.json();
        if (Array.isArray(rawEvents) && rawEvents.length > 0) {
          const mapped = this.normalizeFairEconomyEvents(rawEvents, now);
          await db.setEconomicEvents(mapped);
          await db.updateSourceStatus('src_macro_calendar', 'LIVE');
          sseBroker.broadcast('economic_calendar', mapped.slice(0, 50));
          return mapped;
        }
      }
    } catch (err: any) {
      console.warn('[MacroData] Fallback FairEconomy fetch error:', err.message);
    }

    // If both providers failed, mark source status UNAVAILABLE
    await db.updateSourceStatus('src_macro_calendar', 'ERROR', 'Economic Calendar providers unreachable');

    // Return existing events marked as UNAVAILABLE rather than masquerading as fresh live
    const existing = (await db.getEconomicEvents(50)).map(e => ({
      ...e,
      data_status: 'UNAVAILABLE' as const,
      source: `${e.source} (Provider Unreachable)`,
      last_updated: nowIso,
    }));

    return existing;
  }

  /**
   * Normalizes TradingView API events
   */
  private static normalizeTradingViewEvents(rawItems: any[], now: Date): EconomicEvent[] {
    const nowMs = now.getTime();
    const nowIso = now.toISOString();

    // Priority major trading currencies
    const majorCurrencies = new Set(['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY']);

    // Filter for events with major currencies or medium/high importance
    const relevant = rawItems.filter(e => {
      if (!e.title) return false;
      const currency = (e.currency || '').toUpperCase();
      if (majorCurrencies.has(currency)) return true;
      return typeof e.importance === 'number' && e.importance >= 0;
    });

    const mapped: EconomicEvent[] = relevant.map(item => {
      // Determine impact level
      let impact: EconomicEvent['impact'] = 'LOW';
      const title = item.title || 'Macro Economic Indicator';

      if (item.importance === 1) {
        if (/cpi|pce|nfp|fed|fomc|interest rate|rate decision|gdp|inflation|payrolls|central bank|powell|lagarde/i.test(title)) {
          impact = 'CRITICAL';
        } else {
          impact = 'HIGH';
        }
      } else if (item.importance === 0) {
        impact = 'MEDIUM';
      }

      const unit = item.unit ? `${item.unit}` : '';
      const hasActual = item.actual !== null && item.actual !== undefined && item.actual !== '';
      const actualStr = hasActual ? `${item.actual}${unit}` : null;
      const forecastStr = item.forecast !== null && item.forecast !== undefined && item.forecast !== '' ? `${item.forecast}${unit}` : null;
      const previousStr = item.previous !== null && item.previous !== undefined && item.previous !== '' ? `${item.previous}${unit}` : null;

      const eventDate = new Date(item.date);
      const isPast = eventDate.getTime() <= nowMs;
      const status: EconomicEvent['status'] = hasActual || isPast ? 'RELEASED' : 'UPCOMING';

      const rawEvent: EconomicEvent = {
        id: `econ_tv_${item.id || item.indicator || Math.random().toString(36).substring(2, 9)}`,
        event_name: title,
        country_code: (item.country || item.currency || 'US').toUpperCase(),
        currency: (item.currency || 'USD').toUpperCase(),
        impact,
        date_time_utc: eventDate.toISOString(),
        actual: actualStr,
        forecast: forecastStr,
        previous: previousStr,
        status,
        source: 'TradingView Macro Feed',
        last_updated: nowIso,
        data_status: 'LIVE',
      };

      return MacroIntelligenceEngine.enrichEconomicEvent(rawEvent, nowMs);
    });

    // Sort around now:
    // Released events in last 48h and upcoming events in next 7 days, sorted chronologically
    mapped.sort((a, b) => new Date(a.date_time_utc).getTime() - new Date(b.date_time_utc).getTime());

    return mapped;
  }

  /**
   * Normalizes FairEconomy fallback events
   */
  private static normalizeFairEconomyEvents(rawItems: any[], now: Date): EconomicEvent[] {
    const nowIso = now.toISOString();
    const nowMs = now.getTime();

    return rawItems.map((item, index) => {
      let impact: EconomicEvent['impact'] = 'LOW';
      const rawImpact = (item.impact || '').toLowerCase();
      if (rawImpact.includes('high') || rawImpact.includes('red')) impact = 'HIGH';
      else if (rawImpact.includes('med') || rawImpact.includes('orange')) impact = 'MEDIUM';

      const title = item.title || 'Economic Indicator';
      if (/cpi|nfp|fed|fomc|interest rate|gdp|inflation|payrolls/i.test(title)) {
        impact = 'CRITICAL';
      }

      const hasActual = item.actual !== null && item.actual !== undefined && item.actual !== '';
      const eventDate = item.date ? new Date(item.date) : now;
      const isPast = eventDate.getTime() <= nowMs;

      const rawEvent: EconomicEvent = {
        id: `econ_fe_${item.id || index}_${eventDate.getTime()}`,
        event_name: title,
        country_code: (item.country || 'US').toUpperCase(),
        currency: (item.currency || item.country || 'USD').toUpperCase(),
        impact,
        date_time_utc: eventDate.toISOString(),
        actual: hasActual ? `${item.actual}` : null,
        forecast: item.forecast || null,
        previous: item.previous || null,
        status: hasActual || isPast ? 'RELEASED' : 'UPCOMING',
        source: 'FairEconomy Institutional Feed',
        last_updated: nowIso,
        data_status: 'LIVE',
      };

      return MacroIntelligenceEngine.enrichEconomicEvent(rawEvent, nowMs);
    });
  }
}
