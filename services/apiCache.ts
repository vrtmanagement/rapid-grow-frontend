import { clearTabSessionCache, invalidateTabEndpointsForApiPath } from './tabSessionCache';

type CacheEntry<T = unknown> = {
  data: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<unknown>>();

export const DEFAULT_API_CACHE_TTL_MS = 8 * 60 * 60 * 1000;

export function buildApiCacheKey(url: string, init?: RequestInit): string {
  const method = String(init?.method || 'GET').toUpperCase();
  return `${method}:${url}`;
}

export function peekApiCache<T>(url: string, init?: RequestInit): T | undefined {
  const key = buildApiCacheKey(url, init);
  const entry = memoryCache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return undefined;
  return entry.data as T;
}

export function writeApiCache<T>(url: string, data: T, init?: RequestInit, ttlMs = DEFAULT_API_CACHE_TTL_MS): void {
  const key = buildApiCacheKey(url, init);
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateApiCache(match?: string | RegExp): void {
  if (!match) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    const shouldDelete =
      typeof match === 'string' ? key.includes(match) : match.test(key);
    if (shouldDelete) memoryCache.delete(key);
  }
}

export function clearApiCache(): void {
  memoryCache.clear();
  inflightRequests.clear();
  clearTabSessionCache();
}

export async function cachedFetchJson<T>(
  url: string,
  init?: RequestInit,
  options?: { ttlMs?: number; force?: boolean },
): Promise<T> {
  const method = String(init?.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    throw new Error('cachedFetchJson only supports GET requests');
  }

  const ttlMs = options?.ttlMs ?? DEFAULT_API_CACHE_TTL_MS;
  const key = buildApiCacheKey(url, init);

  if (!options?.force) {
    const cached = peekApiCache<T>(url, init);
    if (cached !== undefined) return cached;
  }

  const existing = inflightRequests.get(key);
  if (existing) return existing as Promise<T>;

  const request = (async () => {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        (payload as { message?: string; error?: string })?.message ||
        (payload as { message?: string; error?: string })?.error ||
        `Request failed with status ${response.status}`;
      throw new Error(message);
    }
    writeApiCache(url, payload, init, ttlMs);
    return payload as T;
  })();

  inflightRequests.set(key, request);
  try {
    return await request;
  } finally {
    inflightRequests.delete(key);
  }
}

export function invalidateApiCacheForMutation(url: string, init?: RequestInit): void {
  const method = String(init?.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return;

  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    invalidateTabEndpointsForApiPath(path);
    if (path.includes('/crm')) {
      invalidateApiCache('/crm');
      invalidateApiCache('/audit-logs');
    }
    if (path.includes('/content')) invalidateApiCache('/content');
    if (path.includes('/spaces')) invalidateApiCache('/spaces');
    if (path.includes('/attendance')) invalidateApiCache('/attendance');
    if (path.includes('/app/bootstrap')) invalidateApiCache('/app/bootstrap');
    if (path.includes('/employees')) invalidateApiCache('/employees');
    if (path.includes('/goals')) invalidateApiCache('/goals');
    if (path.includes('/project-charters')) invalidateApiCache('/project-charters');
    if (path.includes('/expense')) invalidateApiCache('/expense');
    if (path.includes('/communication')) invalidateApiCache('/communication');
    if (path.includes('/drive')) invalidateApiCache('/drive');
    if (path.includes('/permissions')) invalidateApiCache('/permissions');
    if (path.includes('/billing')) invalidateApiCache('/billing');
    if (path.includes('/audit-logs')) invalidateApiCache('/audit-logs');
    if (path.includes('/strengths')) invalidateApiCache('/strengths');
  } catch {
    invalidateApiCache(url);
  }
}
