import { Router } from 'express';
import { db } from '../db/database.js';
import { MarketDataService } from '../ingestion/marketData.js';

export const marketRouter = Router();

// GET all market prices
marketRouter.get('/', async (req, res) => {
  const prices = await db.getAllMarketPrices();
  res.json({
    prices,
    count: prices.length,
    timestamp: new Date().toISOString(),
  });
});

// GET all market prices (alias /prices)
marketRouter.get('/prices', async (req, res) => {
  const prices = await db.getAllMarketPrices();
  res.json({
    prices,
    count: prices.length,
    timestamp: new Date().toISOString(),
  });
});

// GET market status & trading sessions
marketRouter.get('/status', (req, res) => {
  const now = new Date();
  const utcHour = now.getUTCHours();

  const sessions = [
    {
      session_name: 'SYDNEY',
      is_open: utcHour >= 21 || utcHour < 6,
      opens_at_utc: '21:00 UTC',
      closes_at_utc: '06:00 UTC',
      current_status: (utcHour >= 21 || utcHour < 6) ? 'OPEN' : 'CLOSED',
    },
    {
      session_name: 'TOKYO',
      is_open: utcHour >= 0 && utcHour < 9,
      opens_at_utc: '00:00 UTC',
      closes_at_utc: '09:00 UTC',
      current_status: (utcHour >= 0 && utcHour < 9) ? 'OPEN' : 'CLOSED',
    },
    {
      session_name: 'LONDON',
      is_open: utcHour >= 8 && utcHour < 16,
      opens_at_utc: '08:00 UTC',
      closes_at_utc: '16:00 UTC',
      current_status: (utcHour >= 8 && utcHour < 16) ? 'OPEN' : (utcHour === 7 ? 'CLOSING_SOON' : 'CLOSED'),
    },
    {
      session_name: 'NEW_YORK',
      is_open: utcHour >= 13 && utcHour < 21,
      opens_at_utc: '13:00 UTC',
      closes_at_utc: '21:00 UTC',
      current_status: (utcHour >= 13 && utcHour < 21) ? 'OPEN' : 'CLOSED',
    },
  ];

  res.json({
    utc_time: now.toISOString(),
    sessions,
    active_sessions_count: sessions.filter(s => s.is_open).length,
  });
});

// GET single symbol detail
marketRouter.get('/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const price = await db.getMarketPrice(symbol);
  if (!price) {
    res.status(404).json({ error: `Symbol ${symbol} not found in market registry.` });
    return;
  }

  // Find related events affecting this symbol
  const allEvents = await db.getAllEvents(20);
  const relatedEvents = allEvents.filter(e =>
    e.affected_assets.includes(symbol) || e.affected_currencies.includes(symbol)
  );

  res.json({
    price,
    related_events: relatedEvents,
  });
});

// Force refresh market data
marketRouter.post('/refresh', async (req, res) => {
  try {
    const updated = await MarketDataService.updateMarketPrices();
    res.json({ success: true, count: updated.length, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
