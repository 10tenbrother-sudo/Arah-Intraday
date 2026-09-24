/**
 * Text helpers shared by the ingestion pipeline.
 */

/**
 * Truncate to at most `max` UTF-16 units without splitting a surrogate pair.
 *
 * A plain `slice(0, max)` can cut an astral character (emoji, some scripts) in
 * half and leave a lone high surrogate. That string is still valid in memory,
 * but JSON serialisation rejects it, so anything truncated this way must not be
 * persisted. The result may be shorter than `max` by one unit.
 */
export function truncateText(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.charCodeAt(max - 1);
  // 0xD800-0xDBFF is a high surrogate; dropping it keeps the pair intact.
  const end = cut >= 0xd800 && cut <= 0xdbff ? max - 1 : max;
  return value.slice(0, end);
}
