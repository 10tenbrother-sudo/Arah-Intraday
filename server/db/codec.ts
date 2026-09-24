// JSON codec for columns that were JSON arrays/objects in the old file store.
//
// SQLite has no array or JSON column type, so those fields live as TEXT. Every
// read and write of such a column must pass through here; a raw value reaching
// the API layer would surface as a string where the frontend expects an array.
// The `?? fallback` on parse keeps a malformed row from crashing a whole request.

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function toJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

// Required for non-nullable JSON columns: an omitted value must still persist as
// a valid empty array/object rather than SQL NULL.
export function toJsonRequired(value: unknown, empty: 'array' | 'object'): string {
  if (value === undefined || value === null) return empty === 'array' ? '[]' : '{}';
  return JSON.stringify(value);
}
