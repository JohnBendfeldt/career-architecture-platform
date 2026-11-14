const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Validates that a string is a well-formed HTTPS URL.
 */
export function isSafeHttpsUrl(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates image sources: permits same-origin root-relative paths (e.g. "/john-bendfeldt.jpg")
 * and HTTPS URLs, while rejecting protocol-relative ("//..."), javascript:, data:, or http: URLs.
 */
export function isSafeImageUrl(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !/[\s<>"'`\\]/.test(trimmed)) {
    return true;
  }
  return isSafeHttpsUrl(trimmed);
}

/**
 * Normalizes user-entered outbound URLs to strict HTTPS, returning fallback if invalid or unsafe.
 */
export function sanitizeExternalUrl(value?: string | null, fallback = ''): string {
  if (!value || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '#') return fallback;

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed.replace(/^http:\/\//i, 'https://')
    : /^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)
      ? `https://${trimmed}`
      : trimmed;

  return isSafeHttpsUrl(candidate) ? candidate : fallback;
}

/**
 * Recursively strips prototype-pollution keys (__proto__, constructor, prototype) from parsed JSON.
 */
export function stripUnsafeKeys<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => stripUnsafeKeys(item)) as unknown as T;
  }
  if (input && typeof input === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      if (!UNSAFE_OBJECT_KEYS.has(key)) {
        clean[key] = stripUnsafeKeys(val);
      }
    }
    return clean as T;
  }
  return input;
}

/**
 * Safely parses a JSON object from storage, returning null on invalid JSON, primitives, or arrays.
 */
export function safeParseStorageObject<T extends object>(raw: string | null): T | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return stripUnsafeKeys(parsed as T);
  } catch {
    return null;
  }
}

/**
 * Safely parses a JSON array from storage, filtering out nullish items and stripping unsafe keys.
 */
export function safeParseStorageArray<T>(
  raw: string | null,
  itemGuard?: (item: unknown) => item is T
): T[] | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const sanitized = stripUnsafeKeys(parsed);
    return itemGuard ? sanitized.filter(itemGuard) : (sanitized as T[]);
  } catch {
    return null;
  }
}
