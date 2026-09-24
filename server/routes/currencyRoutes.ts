import { Router } from 'express';
import { db } from '../db/database.js';
import { CurrencyStrengthService } from '../ingestion/currencyStrength.js';

export const currencyRouter = Router();

// GET current currency strength table
currencyRouter.get('/', async (req, res) => {
  const list = await db.getCurrencyStrength();
  res.json({
    currency_strength: list,
    source: 'https://currency-strength.com/en/',
    timestamp: new Date().toISOString(),
  });
});

// GET currency strength chart feed (1d or 2d series from currency-strength.com)
currencyRouter.get('/chart-feed', async (req, res) => {
  try {
    const range = (req.query.range as string) === '2d' ? '2d' : '1d';
    const series = await CurrencyStrengthService.getChartFeed(range);
    res.json({
      success: true,
      range,
      series,
      source: 'https://currency-strength.com/en/',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET currency strength history
currencyRouter.get('/history', async (req, res) => {
  const currency = req.query.currency as string | undefined;
  const history = await db.getCurrencyStrengthHistory(currency);
  res.json({
    history,
    count: history.length,
    timestamp: new Date().toISOString(),
  });
});

// POST refresh currency strength from live provider
currencyRouter.post('/refresh', async (req, res) => {
  try {
    const updated = await CurrencyStrengthService.fetchLiveStrength();
    res.json({
      success: true,
      currency_strength: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
