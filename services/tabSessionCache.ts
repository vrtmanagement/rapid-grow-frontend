import { API_BASE, apiGetJson } from '../config/api';
import { peekApiCache } from './apiCache';

const hydratedTabEndpoints = new Set<string>();

function buildEndpointKey(tabKey: string, path: string): string {
  const normalizedTab = String(tabKey || '').trim().toLowerCase() || 'default';
  const normalizedPath = String(path || '').trim();
  return `${normalizedTab}|${normalizedPath}`;
}

export function normalizeTabKeyFromPath(pathname: string): string {
  const segment = String(pathname || '')
    .replace(/^#/, '')
    .replace(/^\//, '')
    .split('/')[0]
    .trim()
    .toLowerCase();
  return segment || 'home';
}

export function isTabEndpointHydrated(tabKey: string, path: string): boolean {
  return hydratedTabEndpoints.has(buildEndpointKey(tabKey, path));
}

export function markTabEndpointHydrated(tabKey: string, path: string): void {
  hydratedTabEndpoints.add(buildEndpointKey(tabKey, path));
}

export function clearTabSessionCache(match?: string | RegExp): void {
  if (!match) {
    hydratedTabEndpoints.clear();
    return;
  }

  for (const key of hydratedTabEndpoints) {
    const shouldDelete =
      typeof match === 'string'
        ? key.startsWith(`${match.toLowerCase()}|`) || key.includes(match)
        : match.test(key);
    if (shouldDelete) hydratedTabEndpoints.delete(key);
  }
}

export function readHydratedTabEndpoint<T>(tabKey: string, path: string): T | undefined {
  if (!isTabEndpointHydrated(tabKey, path)) return undefined;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  return peekApiCache<T>(url);
}

export function shouldRefetchTabEndpoint(tabKey: string, path: string, force?: boolean): boolean {
  if (force) return true;
  if (!isTabEndpointHydrated(tabKey, path)) return true;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  return peekApiCache(url) === undefined;
}

export function hasTabEndpointCache(tabKey: string, path: string): boolean {
  return readHydratedTabEndpoint(tabKey, path) !== undefined;
}

export async function fetchTabEndpoint<T>(
  tabKey: string,
  path: string,
  options?: { force?: boolean; init?: RequestInit },
): Promise<T> {
  if (!options?.force) {
    const cached = readHydratedTabEndpoint<T>(tabKey, path);
    if (cached !== undefined) return cached;
  }

  const data = await apiGetJson<T>(path, options?.init || {}, { force: options?.force });
  markTabEndpointHydrated(tabKey, path);
  return data;
}

export function invalidateTabEndpointsForApiPath(path: string): void {
  const normalized = String(path || '').toLowerCase();
  if (!normalized) return;

  for (const key of hydratedTabEndpoints) {
    const endpointPath = (key.split('|')[1] || '').toLowerCase();
    if (!endpointPath) continue;
    if (endpointPath.includes(normalized) || normalized.includes(endpointPath.split('?')[0])) {
      hydratedTabEndpoints.delete(key);
    }
  }
}
