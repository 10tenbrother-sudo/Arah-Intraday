import { Router, Request, Response } from 'express';
import { sseBroker } from '../realtime/sse.js';
import { AuthService } from '../auth/authService.js';
import { db } from '../db/database.js';

export const streamRouter = Router();

// GET /api/stream - Server-Sent Events real-time broadcast channel
streamRouter.get('/', async (req: Request, res: Response) => {
  const queryToken = req.query.token as string | undefined;
  let userId: string | undefined;

  if (queryToken) {
    const payload = await AuthService.verifyToken(queryToken);
    if (payload) {
      userId = payload.userId;
    }
  }

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  sseBroker.registerClient(clientId, res, userId);

  // Send current live snapshot immediately to the newly connected client
  try {
    const currentPrices = await db.getAllMarketPrices();
    if (currentPrices.length > 0) {
      res.write(`event: market_prices\ndata: ${JSON.stringify(currentPrices)}\n\n`);
    }

    const currentEvents = await db.getEconomicEvents(60);
    if (currentEvents.length > 0) {
      res.write(`event: economic_calendar\ndata: ${JSON.stringify(currentEvents)}\n\n`);
    }
  } catch (err) {
    console.warn('[SSE] Snapshot send notice:', err);
  }
});
