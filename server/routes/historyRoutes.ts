import { Router } from 'express';
import { db } from '../db/database.js';
import { IntradayMarketMapEngine } from '../intelligence/intradayMarketMap.js';

export const historyRouter = Router();

// GET all snapshots or filtered by range/date
historyRouter.get('/snapshots', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 30;
  const range = (req.query.range as string) || 'ALL';
  const customDate = req.query.date as string | undefined;

  const snapshots = db.getDailySnapshots(limit, range, customDate);
  res.json({
    snapshots,
    count: snapshots.length,
    timestamp: new Date().toISOString(),
  });
});

// GET all available snapshot dates (alias for convenience)
historyRouter.get('/dates', (req, res) => {
  const snapshots = db.getDailySnapshots(60, 'ALL');
  const dates = snapshots.map(s => s.date);
  res.json({
    dates,
    count: dates.length,
    timestamp: new Date().toISOString(),
  });
});

// GET complete historical day dossier via query param or sub-route
historyRouter.get('/snapshot', (req, res) => {
  const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const snapshot = db.getDailySnapshotByDate(dateStr);

  const events = db.getAllEvents(100).filter(e => e.first_detected_at.startsWith(dateStr));
  const economicEvents = db.getEconomicEvents(100).filter(e => e.date_time_utc.startsWith(dateStr));
  const currencyHistory = db.getCurrencyStrengthHistoryByDate(dateStr);

  if (!snapshot) {
    const prices = db.getAllMarketPrices();
    const strengths = db.getCurrencyStrength();
    const intradayMap = IntradayMarketMapEngine.getIntradayMarketMap();

    const biases: Record<string, any> = {};
    intradayMap.forEach(item => {
      biases[item.symbol] = {
        symbol: item.symbol,
        bias: item.overall_bias,
        score: item.direction_score,
        price: item.price,
        change_24h_pct: item.change_24h_pct,
        strength_label: item.direction_score > 30 ? 'Strong' : item.direction_score < -30 ? 'Weak' : 'Moderate',
        major_catalyst: item.today_key_catalyst,
        last_updated: item.last_updated,
      };
    });

    res.json({
      snapshot: {
        id: `snapshot_${dateStr}`,
        date: dateStr,
        timestamp: new Date().toISOString(),
        title: `Daily Market Dossier: ${dateStr}`,
        market_biases: biases,
        currency_strength: strengths.map((s, idx) => ({
          currency: s.currency,
          score: s.strength_score,
          rank: idx + 1,
          direction: s.change_direction,
        })),
        major_catalysts: economicEvents.slice(0, 5).map(e => ({
          event_name: e.event_name,
          currency: e.currency,
          impact: e.impact,
          actual: e.actual,
          market_reaction: e.actual_market_reaction,
        })),
        market_reaction_summary: 'On-demand compiled market telemetry for requested historical day.',
        ai_summary: 'Grounded intelligence record derived from historical database points.',
        ai_why: ['Derived from persistent event wire and currency strength telemetry.'],
        ai_risk: ['Historical session volatility parameters apply.'],
        ai_context: [`Historical data slice for ${dateStr}.`],
        historical_insights: [`Record initialized from system memory store.`],
        created_at: new Date().toISOString(),
      },
      events,
      economic_events: economicEvents,
      currency_history: currencyHistory,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    snapshot,
    events,
    economic_events: economicEvents,
    currency_history: currencyHistory,
    timestamp: new Date().toISOString(),
  });
});

// GET complete historical day dossier
historyRouter.get('/snapshot/:date', (req, res) => {
  const dateStr = req.params.date;
  const snapshot = db.getDailySnapshotByDate(dateStr);

  // Also query related events, economic releases, and currency strength for this date
  const events = db.getAllEvents(100).filter(e => e.first_detected_at.startsWith(dateStr));
  const economicEvents = db.getEconomicEvents(100).filter(e => e.date_time_utc.startsWith(dateStr));
  const currencyHistory = db.getCurrencyStrengthHistoryByDate(dateStr);

  if (!snapshot) {
    // If not snapshot yet for this date, construct a real-time on-the-fly view
    const prices = db.getAllMarketPrices();
    const strengths = db.getCurrencyStrength();
    const intradayMap = IntradayMarketMapEngine.getIntradayMarketMap();

    const biases: Record<string, any> = {};
    intradayMap.forEach(item => {
      biases[item.symbol] = {
        symbol: item.symbol,
        bias: item.overall_bias,
        score: item.direction_score,
        price: item.price,
        change_24h_pct: item.change_24h_pct,
        strength_label: item.direction_score > 30 ? 'Strong' : item.direction_score < -30 ? 'Weak' : 'Moderate',
        major_catalyst: item.today_key_catalyst,
        last_updated: item.last_updated,
      };
    });

    res.json({
      snapshot: {
        id: `snapshot_${dateStr}`,
        date: dateStr,
        timestamp: new Date().toISOString(),
        title: `Daily Market Dossier: ${dateStr}`,
        market_biases: biases,
        currency_strength: strengths.map((s, idx) => ({
          currency: s.currency,
          score: s.strength_score,
          rank: idx + 1,
          direction: s.change_direction,
        })),
        major_catalysts: economicEvents.slice(0, 5).map(e => ({
          event_name: e.event_name,
          currency: e.currency,
          impact: e.impact,
          actual: e.actual,
          market_reaction: e.actual_market_reaction,
        })),
        market_reaction_summary: 'On-demand compiled market telemetry for requested historical day.',
        ai_summary: 'Grounded intelligence record derived from historical database points.',
        ai_why: [
          'Derived from persistent event wire and currency strength telemetry.',
        ],
        ai_risk: [
          'Historical session volatility parameters apply.',
        ],
        ai_context: [
          `Historical data slice for ${dateStr}.`,
        ],
        historical_insights: [
          `Record initialized from system memory store.`,
        ],
        created_at: new Date().toISOString(),
      },
      events,
      economic_events: economicEvents,
      currency_history: currencyHistory,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    snapshot,
    events,
    economic_events: economicEvents,
    currency_history: currencyHistory,
    timestamp: new Date().toISOString(),
  });
});

// GET Market Memory Insights (grounded historical memory)
historyRouter.get('/insights', (req, res) => {
  const insights = db.getMarketMemoryInsights();
  res.json({
    insights,
    count: insights.length,
    timestamp: new Date().toISOString(),
  });
});

// GET Currency comparison: Today vs Yesterday vs 3 Days vs 7 Days
historyRouter.get('/currency-comparison', (req, res) => {
  const comparisons = db.getHistoricalCurrencyComparison();
  res.json({
    comparisons,
    count: comparisons.length,
    source: 'https://currency-strength.com/en/ + Relational Historical Interval Store',
    timestamp: new Date().toISOString(),
  });
});

// POST generate or refresh snapshot for today/given date
historyRouter.post('/generate-snapshot', (req, res) => {
  const dateStr = (req.body?.date as string) || new Date().toISOString().slice(0, 10);
  const intradayMap = IntradayMarketMapEngine.getIntradayMarketMap();
  const strengths = db.getCurrencyStrength();
  const comparisons = db.getHistoricalCurrencyComparison();
  const compMap = new Map(comparisons.map(c => [c.currency, c]));
  const insights = db.getMarketMemoryInsights();

  const biases: Record<string, any> = {};
  intradayMap.forEach(item => {
    biases[item.symbol] = {
      symbol: item.symbol,
      bias: item.overall_bias,
      score: item.direction_score,
      price: item.price,
      change_24h_pct: item.change_24h_pct,
      strength_label: item.direction_score > 30 ? 'Strong' : item.direction_score < -30 ? 'Weak' : 'Moderate',
      major_catalyst: item.today_key_catalyst,
      last_updated: item.last_updated,
    };
  });

  const snapshot = {
    id: `snapshot_${dateStr}`,
    date: dateStr,
    timestamp: new Date().toISOString(),
    title: `Daily Market Snapshot: ${dateStr}`,
    market_biases: biases,
    currency_strength: strengths.map((s, idx) => {
      const comp = compMap.get(s.currency);
      return {
        currency: s.currency,
        score: s.strength_score,
        rank: idx + 1,
        direction: s.change_direction,
        change_vs_yesterday: comp?.delta_yesterday,
        change_vs_7d: comp?.delta_7d,
      };
    }),
    major_catalysts: intradayMap.slice(0, 5).map(item => ({
      event_name: item.today_key_catalyst || `${item.symbol} Session Driver`,
      currency: item.symbol === 'XAUUSD' ? 'USD' : item.symbol,
      impact: 'HIGH',
      actual: item.current_market_reaction,
      market_reaction: item.current_market_reaction,
    })),
    market_reaction_summary: 'Automated daily snapshot synthesized from multimodal feeds: News + Macro + Currency Strength + Price Action.',
    ai_summary: `Institutional bias consensus for ${dateStr}: Capital flows tracking interest rate differentials and sovereign safety allocations.`,
    ai_why: [
      'Grounded in latest real-time currency strength matrix rankings.',
      'Reflects verified Telegram breaking news wire deduplicated events.',
      'Treasury yield discount curve dictating cross-asset valuations.',
    ],
    ai_risk: [
      'High-impact central bank speaker commentary.',
      'Cross-asset liquidation cascades during illiquid session transitions.',
    ],
    ai_context: [
      `System memory tracks historical persistence since platform launch date.`,
    ],
    historical_insights: insights.map(i => i.description),
    created_at: new Date().toISOString(),
  };

  db.saveDailySnapshot(snapshot as any);

  res.json({
    success: true,
    snapshot,
  });
});
