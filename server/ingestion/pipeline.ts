/**
 * Master Ingestion & Normalization Pipeline
 * Architecture Flow:
 * SOURCE → INGEST → VALIDATE → PARSE → NORMALIZE → CLASSIFY → DEDUPLICATE → MATCH EVENT → MAP ASSETS/CURRENCIES → DATABASE → AI ANALYSIS
 */

import { NewsItem, MarketEvent } from '../types.js';
import { db } from '../db/database.js';
import { analyzeAssetRelationships } from '../relationships/assetMapper.js';
import { DeduplicationEngine } from '../deduplication/engine.js';
import { sseBroker } from '../realtime/sse.js';
import { analyzeMarketEventWithGemini } from '../intelligence/gemini.js';

export async function processNewsThroughPipeline(rawNews: NewsItem): Promise<{
  newsItem: NewsItem;
  event: MarketEvent;
  isDuplicate: boolean;
}> {
  // 1. VALIDATE & RECOVER
  let titleStr = (rawNews.title || '').trim();
  let contentStr = (rawNews.content || '').trim();

  // If title is missing or too short (< 5 chars), attempt recovery from content
  if (!titleStr || titleStr.length < 5) {
    if (contentStr.length >= 5) {
      const firstLine = contentStr.split('\n').map(l => l.trim()).find(l => l.length >= 5);
      titleStr = firstLine ? firstLine.substring(0, 160).trim() : contentStr.substring(0, 120).trim();
      rawNews.title = titleStr;
    }
  }

  if (!titleStr || titleStr.length < 5) {
    throw new Error('Pipeline Validation Failed: News title is too short or empty');
  }
  if (!contentStr || contentStr.length < 10) {
    rawNews.content = titleStr;
  }

  // 2. PARSE & NORMALIZE
  const cleanTitle = rawNews.title.replace(/\s+/g, ' ').trim();
  const cleanContent = rawNews.content.replace(/\s+/g, ' ').trim();
  const normalizedLanguage = (rawNews.language || 'en').toLowerCase().substring(0, 2);

  // 3. CLASSIFY & MAP ASSETS / CURRENCIES
  const mapping = analyzeAssetRelationships(cleanTitle, cleanContent);

  rawNews.title = cleanTitle;
  rawNews.content = cleanContent;
  rawNews.language = normalizedLanguage;
  rawNews.affected_assets = mapping.affected_assets;
  rawNews.affected_currencies = mapping.affected_currencies;
  rawNews.category = mapping.primary_category;
  rawNews.status = 'NORMALIZED';

  // 4. DEDUPLICATE & MATCH EVENT
  const existingEvents = await db.getAllEvents(40);
  const dedup = DeduplicationEngine.evaluateDuplicate(rawNews, existingEvents);

  let targetEvent: MarketEvent;
  let isDuplicate = false;

  if (dedup.isDuplicate && dedup.matchedEvent) {
    // MATCHED TO EXISTING EVENT (e.g. Cross-language or multi-source headline)
    isDuplicate = true;
    targetEvent = dedup.matchedEvent;
    rawNews.event_id = targetEvent.id;
    rawNews.status = 'EVENT_LINKED';

    await db.insertNewsItem(rawNews);
    DeduplicationEngine.linkNewsToEvent(rawNews, targetEvent, dedup.matchReason, dedup.similarityScore);
    console.log(`[Pipeline] DEDUPLICATED: "${rawNews.title}" -> Event [${targetEvent.id}] (${dedup.matchReason})`);
  } else {
    // CREATE CANONICAL EVENT
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    targetEvent = {
      id: eventId,
      title: cleanTitle,
      summary: cleanContent.length > 250 ? cleanContent.substring(0, 250) + '...' : cleanContent,
      primary_category: mapping.primary_category,
      impact_level: mapping.impact_level,
      first_detected_at: rawNews.published_at || new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      source_count: 1,
      source_names: [rawNews.source_name],
      affected_assets: mapping.affected_assets,
      affected_currencies: mapping.affected_currencies,
      key_facts: mapping.key_facts,
      is_duplicate_resolved: false,
      pair_impacts: mapping.pair_impacts,
    };

    rawNews.event_id = eventId;
    rawNews.status = 'EVENT_LINKED';

    await db.insertEvent(targetEvent);
    await db.insertNewsItem(rawNews);

    DeduplicationEngine.linkNewsToEvent(rawNews, targetEvent, 'Canonical initial source for event', 1.0);
    console.log(`[Pipeline] NEW EVENT CREATED: [${eventId}] "${targetEvent.title}"`);
  }

  // 5. TRIGGER AI ANALYSIS FOR HIGH / CRITICAL EVENTS (ASYNC)
  if (targetEvent.impact_level === 'CRITICAL' || targetEvent.impact_level === 'HIGH' || targetEvent.source_count > 1) {
    analyzeMarketEventWithGemini(targetEvent).catch(err => {
      console.warn(`[Pipeline AI] Gemini analysis warning for event ${targetEvent.id}:`, err.message);
    });
  }

  // 6. REAL-TIME BROADCAST VIA SSE
  sseBroker.broadcast('news_ingested', { news: rawNews, eventId: targetEvent.id });
  sseBroker.broadcast('event_updated', targetEvent);

  return { newsItem: rawNews, event: targetEvent, isDuplicate };
}
