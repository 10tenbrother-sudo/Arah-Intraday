import { Router } from 'express';
import { db } from '../db/database.js';
import { analyzeMarketEventWithGemini } from '../intelligence/gemini.js';
import { requireAuth, AuthenticatedRequest } from '../auth/authService.js';
import { EntitlementService } from '../auth/entitlementService.js';

export const eventRouter = Router();

// GET all canonical market events
eventRouter.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const impact = req.query.impact as string | undefined;
  const events = await db.getAllEvents(limit, offset, impact);

  res.json({
    events,
    count: events.length,
    impact_filter: impact || 'ALL',
    timestamp: new Date().toISOString(),
  });
});

// GET full single event detail (ONE EVENT -> ONE EVENT ID -> MULTIPLE SOURCES -> MULTIPLE ASSETS -> ONE ANALYSIS)
eventRouter.get('/:id', async (req, res) => {
  const eventId = req.params.id;
  const event = await db.getEventById(eventId);
  if (!event) {
    res.status(404).json({ error: `Event [${eventId}] not found.` });
    return;
  }

  // 1. Fetch all linked sources
  const sources = await db.getEventSources(eventId);
  // Sort timeline chronologically (oldest to newest)
  const timeline = sources.slice().sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());

  // 2. Fetch live relevant market prices
  const allPrices = await db.getAllMarketPrices();
  const relevantPrices = allPrices.filter(p =>
    event.affected_assets.includes(p.symbol) || event.affected_currencies.includes(p.symbol)
  );

  // 3. Fetch live relevant currency strengths
  const allStrengths = await db.getCurrencyStrength();
  const relevantStrengths = allStrengths.filter(s =>
    event.affected_currencies.includes(s.currency)
  );

  // 4. Fetch or generate consolidated AI Analysis
  let aiAnalysis = await db.getAIAnalysisForEvent(eventId);
  if (!aiAnalysis) {
    try {
      aiAnalysis = await analyzeMarketEventWithGemini(event);
    } catch (err: any) {
      console.warn(`[Event] AI analysis generation on read: ${err.message}`);
    }
  }

  res.json({
    event,
    sources,
    timeline,
    affected_markets: relevantPrices,
    affected_currencies: relevantStrengths,
    ai_analysis: aiAnalysis,
    timestamp: new Date().toISOString(),
  });
});

// POST trigger re-analysis of single event with Gemini (Requires auth, AI_DEEP_ANALYSIS permission, and usage check)
eventRouter.post('/:id/analyze', requireAuth as any, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  
  if (!EntitlementService.canAccessFeature(user, 'AI_DEEP_ANALYSIS')) {
    res.status(403).json({
      error: 'Upgrade Required: Deep event re-analysis with causal reasoning is available on PRO and INSTITUTIONAL tiers.',
      code: 'PLAN_UPGRADE_REQUIRED',
      required_permission: 'AI_DEEP_ANALYSIS',
      current_plan: user.plan || 'FREE',
    });
    return;
  }

  const usageCheck = EntitlementService.checkAndIncrementAIUsage(user.id, user);
  if (!usageCheck.allowed) {
    res.status(429).json({
      error: `Daily limit reached: Your ${user.plan || 'FREE'} plan allows ${usageCheck.limit} AI operations per day.`,
      code: 'USAGE_LIMIT_REACHED',
      limit: usageCheck.limit,
      used: usageCheck.used,
    });
    return;
  }

  const eventId = req.params.id;
  const event = await db.getEventById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found.' });
    return;
  }

  try {
    const analysis = await analyzeMarketEventWithGemini(event);
    res.json({
      success: true,
      analysis,
      usage: {
        used: usageCheck.used,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
