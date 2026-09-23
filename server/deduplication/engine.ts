/**
 * Multi-Factor Semantic & Entity Event Deduplication Engine
 * Combines cross-language semantic tokenization, numeric fact comparison,
 * entity extraction, currency/asset overlap, and timestamp proximity window.
 */

import { MarketEvent, NewsItem, EventSource } from '../types.js';
import { db } from '../db/database.js';

interface DeduplicationResult {
  isDuplicate: boolean;
  matchedEvent: MarketEvent | null;
  similarityScore: number;
  matchReason: string;
}

// Multilingual token mapping (Indonesian / Malay / German / etc. -> canonical English financial concepts)
const TRANSLATION_MAP: Record<string, string> = {
  // Indonesian / Malay
  'inflasi': 'inflation',
  'ihk': 'cpi',
  'indeks': 'index',
  'harga': 'price',
  'konsumen': 'consumer',
  'as': 'us',
  'amerika': 'us',
  'serikat': 'states',
  'naik': 'rises',
  'melonjak': 'rises',
  'turun': 'falls',
  'merosot': 'falls',
  'suku': 'rate',
  'bunga': 'rate',
  'pemangkasan': 'cut',
  'kenaikan': 'hike',
  'tenaga': 'labor',
  'kerja': 'employment',
  'pengangguran': 'unemployment',
  'emas': 'gold',
  'minyak': 'oil',
  'mentah': 'crude',
  'dolar': 'dollar',
  'jepang': 'japan',
  'eropa': 'europe',
  'bank': 'bank',
  'sentral': 'central',
  'kebijakan': 'policy',
  'moneter': 'monetary',
  'terhadap': 'against',
  'menguat': 'strengthens',
  'melemah': 'weakens',
  'perang': 'war',
  'timur': 'east',
  'tengah': 'middle',
  'rudal': 'missile',
  'sanksi': 'sanctions',
};

// Wire alert / agency prefix keywords that should be stripped and never treated as speakers
export const WIRE_ALERT_REGEX = /^(JUST\s*IN|BREAKING(\s*NEWS)?|ALERT|FLASH|UPDATE|EXCLUSIVE|REPORT|WATCH|DEVELOPING|URGENT|LIVE|LATEST|NOW|BULLETIN|NEWSFLASH|DISPATCH|SCOOP|HEADLINE|RECAP|MARKET\s*ALERT|CRYPTO\s*ALERT|FOREX\s*ALERT|WAR\s*ALERT|RED\s*ALERT|FED\s*ALERT|NEWS|HOT)\b\s*[:\-–|]\s*/i;

export const NON_SPEAKER_KEYWORDS = new Set([
  'just in', 'breaking', 'breaking news', 'alert', 'flash', 'update', 'exclusive',
  'report', 'watch', 'developing', 'urgent', 'live', 'latest', 'now', 'bulletin',
  'newsflash', 'dispatch', 'scoop', 'headline', 'recap', 'note', 'details',
  'summary', 'analysis', 'rumor', 'sources', 'confirmed', 'correction', 'opinion',
  'market', 'forex', 'crypto', 'stocks', 'bonds', 'commodities', 'oil', 'gold',
  'bitcoin', 'dollar', 'yen', 'euro', 'pound', 'wall street', 'economy', 'inflation',
  'cpi', 'nfp', 'gdp', 'today', 'daily', 'weekly', 'morning', 'evening', 'asia',
  'europe', 'us', 'usa', 'china', 'fed alert', 'market alert', 'now', 'breaking news'
]);

// Common generic words that should not artificially inflate semantic Jaccard similarity
export const COMMON_STOPWORDS = new Set([
  'just', 'in', 'breaking', 'news', 'alert', 'flash', 'update', 'exclusive',
  'report', 'watch', 'developing', 'urgent', 'live', 'latest', 'now', 'bulletin',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'per', 'via', 'says', 'said'
]);

/**
 * Strips leading emojis, wire tags, flags, and broadcast alerts from headline text
 */
export function stripWireAlertPrefix(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();
  let prev = '';
  // Repeat while leading badges, emojis, or wire tags exist
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(/^[\p{Extended_Pictographic}\p{Emoji}\uFE0F\u200D\s·\-|•#@\[\]]+/gu, '').trim();
    cleaned = cleaned.replace(WIRE_ALERT_REGEX, '').trim();
  }
  return cleaned;
}

/**
 * Extracts a legitimate speaker/official entity from a headline, explicitly rejecting wire tags
 */
export function extractSpeaker(title: string): string | null {
  const stripped = stripWireAlertPrefix(title);
  // Match prefix up to the first colon
  const colonIdx = stripped.indexOf(':');
  if (colonIdx < 3 || colonIdx > 40) return null;

  const candidate = stripped.substring(0, colonIdx).trim();
  const lowerCand = candidate.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Explicitly reject known wire tags or pure single keywords
  if (NON_SPEAKER_KEYWORDS.has(lowerCand)) return null;
  for (const nonSpk of NON_SPEAKER_KEYWORDS) {
    if (lowerCand === nonSpk || lowerCand.startsWith(nonSpk + ' ') || lowerCand.endsWith(' ' + nonSpk)) {
      return null;
    }
  }

  // Must have clear indicative speaker/official traits:
  // e.g. "'s", specific titles/roles, recognized officials or institutions
  const isInstitutionOrTitle = /\b(fed|ecb|boe|boj|rba|snb|pboc|boc|opec|treasury|white house|sec|cftc|imf|president|governor|chair|secretary|minister|premier|chancellor|official|spokesperson|senator|lawmaker|analyst|economist|ceo|founder|strategist)\b/i.test(candidate);
  const hasPossessive = /'s\b/i.test(candidate);
  const isKnownFigure = /\b(powell|lagarde|ueda|bailey|bullock|macklem|jordan|schlegel|knot|schnabel|nagel|villeroy|lane|panetta|trump|biden|yellen|bessent|greer|musk|saylor|vance|waller|bowman|goolsbee|williams|kashkari|bostic|barkin|kugler|jefferson|barr|collins|daly|cook)\b/i.test(candidate);

  if (isInstitutionOrTitle || hasPossessive || isKnownFigure) {
    return candidate;
  }
  return null;
}

export class DeduplicationEngine {
  /**
   * Normalizes text into canonical concept tokens for cross-language comparison
   */
  public static normalizeSemanticTokens(text: string): { tokens: Set<string>; numbers: Set<string> } {
    const stripped = stripWireAlertPrefix(text);
    const cleaned = stripped
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const rawWords = cleaned.split(' ');
    const tokens = new Set<string>();

    for (const word of rawWords) {
      if (!word || word.length < 2) continue;
      if (COMMON_STOPWORDS.has(word)) continue;
      const canonical = TRANSLATION_MAP[word] || word;
      tokens.add(canonical);
    }

    // Extract all numbers and percentages (e.g. 3.1, 3,1 -> 3.1)
    const numbers = new Set<string>();
    const numMatches = text.match(/\b\d+([.,]\d+)?\b/g);
    if (numMatches) {
      for (const m of numMatches) {
        // Standardize 3,1 to 3.1
        const std = m.replace(',', '.');
        // Filter out small single-digit noise unless followed by %
        numbers.add(std);
      }
    }

    return { tokens, numbers };
  }

  /**
   * Computes Jaccard similarity between two token sets
   */
  public static computeJaccard(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Evaluates if incoming news matches any active event within the deduplication window
   */
  public static evaluateDuplicate(
    incoming: NewsItem,
    candidateEvents: MarketEvent[]
  ): DeduplicationResult {
    const incomingTokens = this.normalizeSemanticTokens(`${incoming.title} ${incoming.content}`);
    const incomingTime = new Date(incoming.published_at).getTime();
    // 36 hours deduplication window
    const WINDOW_MS = 36 * 60 * 60 * 1000;

    let highestScore = 0;
    let bestEvent: MarketEvent | null = null;
    let bestReason = '';

    for (const event of candidateEvents) {
      const eventTime = new Date(event.first_detected_at).getTime();
      const timeDiff = Math.abs(incomingTime - eventTime);
      if (timeDiff > WINDOW_MS) {
        continue;
      }

      const eventTokens = this.normalizeSemanticTokens(`${event.title} ${event.summary}`);

      // 1. Check numeric fact match (e.g., "3.1%" in both English and Indonesian)
      let sharedNumbers = 0;
      for (const num of incomingTokens.numbers) {
        if (eventTokens.numbers.has(num)) {
          sharedNumbers++;
        }
      }

      // 2. Check semantic token overlap
      const tokenSimilarity = this.computeJaccard(incomingTokens.tokens, eventTokens.tokens);

      // 3. Check affected asset / currency overlap
      const incomingCurrs = new Set(incoming.affected_currencies);
      const incomingAssets = new Set(incoming.affected_assets);
      let currOverlap = 0;
      for (const c of event.affected_currencies) {
        if (incomingCurrs.has(c)) currOverlap++;
      }
      let assetOverlap = 0;
      for (const a of event.affected_assets) {
        if (incomingAssets.has(a)) assetOverlap++;
      }

      // Composite scoring formula
      let score = tokenSimilarity * 0.55;
      if (sharedNumbers > 0) score += 0.25;
      if (currOverlap > 0) score += 0.1;
      if (assetOverlap > 0) score += 0.1;

      // Special high-confidence triggers:
      // (a) Both mention US CPI / Inflation + same percentage (e.g. 3.1)
      const hasInflationA = incomingTokens.tokens.has('inflation') || incomingTokens.tokens.has('cpi');
      const hasInflationB = eventTokens.tokens.has('inflation') || eventTokens.tokens.has('cpi');
      if (hasInflationA && hasInflationB && sharedNumbers > 0) {
        score = Math.max(score, 0.88);
      }

      // (b) Both mention Fed rate cut / hike + basis points or rate
      const hasFedA = incomingTokens.tokens.has('fed') || incomingTokens.tokens.has('rate');
      const hasFedB = eventTokens.tokens.has('fed') || eventTokens.tokens.has('rate');
      if (hasFedA && hasFedB && sharedNumbers > 0) {
        score = Math.max(score, 0.85);
      }

      // (c) Both mention NFP / Jobs + number
      const hasJobsA = incomingTokens.tokens.has('nfp') || incomingTokens.tokens.has('labor') || incomingTokens.tokens.has('employment');
      const hasJobsB = eventTokens.tokens.has('nfp') || eventTokens.tokens.has('labor') || eventTokens.tokens.has('employment');
      if (hasJobsA && hasJobsB && sharedNumbers > 0) {
        score = Math.max(score, 0.86);
      }

      // (d) Identical or near identical headline/title check (with wire prefixes stripped)
      const cleanTitleA = stripWireAlertPrefix(incoming.title).toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanTitleB = stripWireAlertPrefix(event.title).toLowerCase().replace(/[^a-z0-9]/g, '');
      let isExactOrNearTitle = false;
      if (cleanTitleA && cleanTitleB) {
        if (cleanTitleA === cleanTitleB) {
          score = Math.max(score, 0.98);
          isExactOrNearTitle = true;
        } else {
          const minLen = Math.min(cleanTitleA.length, cleanTitleB.length);
          const maxLen = Math.max(cleanTitleA.length, cleanTitleB.length);
          const lenRatio = maxLen > 0 ? minLen / maxLen : 0;
          if (minLen >= 25 && lenRatio >= 0.80 && (cleanTitleA.includes(cleanTitleB) || cleanTitleB.includes(cleanTitleA))) {
            score = Math.max(score, 0.95);
            isExactOrNearTitle = true;
          }
        }
      }

      // (e) Financial wire rapid speaker/soundbite session (e.g. "Fed's Goolsbee:", "USTR Greer:", "US Treasury Secretary Bessent:")
      // Must be a validated speaker (NEVER wire tags like "JUST IN:", "BREAKING:", "ALERT:")
      const spkA = extractSpeaker(incoming.title);
      const spkB = extractSpeaker(event.title);
      let isSpeakerMatched = false;
      if (spkA && spkB) {
        const cleanSpkA = spkA.toLowerCase().replace(/[^a-z]/g, '');
        const cleanSpkB = spkB.toLowerCase().replace(/[^a-z]/g, '');
        if (cleanSpkA.length >= 4 && (cleanSpkA === cleanSpkB || cleanSpkA.includes(cleanSpkB) || cleanSpkB.includes(cleanSpkA))) {
          // Within 4 hours, and require minimal contextual coherence (not unrelated topics)
          const hasCoherence = tokenSimilarity > 0.05 || currOverlap > 0 || assetOverlap > 0;
          if (timeDiff < 4 * 60 * 60 * 1000 && hasCoherence) {
            score = Math.max(score, 0.88);
            isSpeakerMatched = true;
          }
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestEvent = event;
        if (isExactOrNearTitle) {
          bestReason = 'Exact or near-identical headline deduplication';
        } else if (isSpeakerMatched && spkA) {
          bestReason = `Ongoing speech/statement soundbite clustering (${spkA})`;
        } else if (hasInflationA && hasInflationB && sharedNumbers > 0) {
          bestReason = `Cross-language inflation print match (identical numeric data: ${Array.from(incomingTokens.numbers).join(', ')})`;
        } else if (hasFedA && hasFedB && sharedNumbers > 0) {
          bestReason = 'Central bank policy action entity & target rate convergence';
        } else if (sharedNumbers > 0) {
          bestReason = `Multi-factor semantic similarity (${(score * 100).toFixed(0)}%) with identical numeric facts`;
        } else {
          bestReason = `High semantic context similarity (${(score * 100).toFixed(0)}%) within active time window`;
        }
      }
    }

    const DUPLICATE_THRESHOLD = 0.60;
    if (highestScore >= DUPLICATE_THRESHOLD && bestEvent) {
      return {
        isDuplicate: true,
        matchedEvent: bestEvent,
        similarityScore: highestScore,
        matchReason: bestReason,
      };
    }

    return {
      isDuplicate: false,
      matchedEvent: null,
      similarityScore: highestScore,
      matchReason: 'Novel distinct market event',
    };
  }

  /**
   * Attaches an incoming news item to an existing event as an additional source,
   * maintaining ONE SOURCE OF TRUTH.
   */
  public static linkNewsToEvent(news: NewsItem, event: MarketEvent, matchReason: string, score: number): void {
    news.event_id = event.id;
    news.status = 'EVENT_LINKED';
    db.updateNewsItem(news.id, { event_id: event.id, status: 'EVENT_LINKED' });

    const sourceRecord: EventSource = {
      id: `es_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      event_id: event.id,
      news_id: news.id,
      source_name: news.source_name,
      source_url: news.source_url,
      language: news.language,
      original_title: news.title,
      original_content: news.content,
      published_at: news.published_at,
      matched_reason: matchReason,
      similarity_score: score,
      created_at: new Date().toISOString(),
    };
    db.addEventSource(sourceRecord);

    // Update parent event source count and source names
    const existingNames = new Set(event.source_names);
    existingNames.add(news.source_name);

    // Merge any new affected assets or currencies
    const mergedAssets = new Set([...event.affected_assets, ...news.affected_assets]);
    const mergedCurrs = new Set([...event.affected_currencies, ...news.affected_currencies]);

    db.updateEvent(event.id, {
      source_count: event.source_count + 1,
      source_names: Array.from(existingNames),
      affected_assets: Array.from(mergedAssets),
      affected_currencies: Array.from(mergedCurrs),
      is_duplicate_resolved: true,
      last_updated_at: new Date().toISOString(),
    });
  }
}
