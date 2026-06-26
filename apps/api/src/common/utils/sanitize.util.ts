import xss from 'xss';

/**
 * Sanitize a string for safe HTML output.
 * Strips all tags and encodes entities.
 */
export function sanitizeHtml(input: string): string {
  return xss(input, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  });
}

/**
 * Sanitize chat message content.
 * Allows some formatting but blocks XSS.
 */
export function sanitizeChatMessage(input: string): string {
  return xss(input.slice(0, 500), {
    whiteList: { b: [], i: [], em: [], strong: [] },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object'],
  });
}

/**
 * Strips to alphanumeric + underscore/hyphen for usernames.
 */
export function sanitizeUsername(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .replace(/[^a-zA-Z0-9_-]/g, '')    // strip non-alphanum
    .replace(/^[-_]+|[-_]+$/g, '')     // trim leading/trailing separators
    .slice(0, 32)
    || 'player';
}

/**
 * Pagination helper â€” returns safe page/limit values.
 */
export function parsePagination(
  page: unknown,
  limit: unknown,
  maxLimit = 100,
): { page: number; limit: number; skip: number } {
  const p = Math.max(1, parseInt(String(page ?? 1), 10) || 1);
  const l = Math.min(maxLimit, Math.max(1, parseInt(String(limit ?? 20), 10) || 20));
  return { page: p, limit: l, skip: (p - 1) * l };
}

/**
 * Build a paginated response envelope.
 */
export function paginateResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Validate WPM for anti-cheat. Returns null if value is suspicious.
 */
export function validateWpm(
  wpm: number,
  durationMs: number,
  charCount: number,
): boolean {
  if (wpm < 0 || wpm > 300)              return false; // physically impossible
  if (durationMs < 3000)                 return false; // must take at least 3 seconds
  if (!Number.isFinite(wpm))             return false;
  // Sanity: wpm * (duration/60000) * 5 should roughly equal char count
  const expectedChars = wpm * (durationMs / 60_000) * 5;
  const ratio = charCount / expectedChars;
  return ratio >= 0.5 && ratio <= 2.0;
}


