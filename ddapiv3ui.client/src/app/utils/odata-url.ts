/** Small helpers for OData query URLs. */

/** Adds `$count=true` to a query URL, unless a `$count` option is already present. */
export function withCount(url: string): string {
  if (/[?&]\$count=/i.test(url)) {
    return url.replace(/([?&]\$count=)[^&]*/i, '$1true');
  }
  return url + (url.includes('?') ? '&' : '?') + '$count=true';
}

/**
 * Sets `$top` to at least the given page size, so that fetching many pages does not
 * need thousands of small requests. A larger `$top` that is already present is kept.
 */
export function withMinimumTop(url: string, minimumTop: number): string {
  const match = /([?&]\$top=)(\d+)/i.exec(url);
  if (match) {
    const current = parseInt(match[2], 10);
    return current >= minimumTop ? url : url.replace(match[0], `${match[1]}${minimumTop}`);
  }
  return url + (url.includes('?') ? '&' : '?') + `$top=${minimumTop}`;
}

/** Reads `@odata.count` from a response, or returns null when it is missing. */
export function readCount(response: unknown): number | null {
  if (response !== null && typeof response === 'object') {
    const count = (response as Record<string, unknown>)['@odata.count'];
    if (typeof count === 'number' && Number.isFinite(count)) {
      return count;
    }
  }
  return null;
}

/** Reads the `value` array from a response, or returns an empty array. */
export function readRecords(response: unknown): unknown[] {
  if (response !== null && typeof response === 'object') {
    const value = (response as Record<string, unknown>)['value'];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

/** Reads `@odata.nextLink` from a response, or returns null when there is no next page. */
export function readNextLink(response: unknown): string | null {
  if (response !== null && typeof response === 'object') {
    const next = (response as Record<string, unknown>)['@odata.nextLink'];
    if (typeof next === 'string' && next.length > 0) {
      return next;
    }
  }
  return null;
}
