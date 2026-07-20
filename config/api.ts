import { cachedFetchJson, clearApiCache, invalidateApiCacheForMutation } from '../services/apiCache';

/**
 * API config - points to Gateway (http://localhost:5000/api)
 * Set VITE_API_URL in .env for different environments
 */
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_EXPIRY_LEEWAY_MS = 60_000;
const TOKEN_REFRESH_BUFFER_MS = 10 * 60 * 1000;
const TOKEN_REFRESH_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

let refreshInFlight: Promise<boolean> | null = null;

export const AUTH_STORAGE_KEY = 'rapidgrow-admin';
export const AUTH_EXPIRED_EVENT = 'rapidgrow-auth-expired';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = window.atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getTokenExpMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
}

function isTokenExpired(token: string): boolean {
  const exp = getTokenExpMs(token);
  if (!exp) return false;
  return exp <= Date.now() + TOKEN_EXPIRY_LEEWAY_MS;
}

function isTokenBeyondRefreshGrace(token: string): boolean {
  const exp = getTokenExpMs(token);
  if (!exp) return false;
  return Date.now() - exp > TOKEN_REFRESH_GRACE_MS;
}

function isTokenExpiringSoon(token: string): boolean {
  const exp = getTokenExpMs(token);
  if (!exp) return false;
  return exp <= Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

function readRawStoredSession(): { token?: string; employee?: any } | null {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function updateStoredAuthSession(token: string, employee?: any) {
  const existing = readRawStoredSession();
  try {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token,
        employee: employee ?? existing?.employee,
      }),
    );
  } catch {
    // Ignore storage failures.
  }
}

export function clearStoredSession() {
  clearApiCache();
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function dispatchAuthExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

function handleSessionExpired() {
  clearStoredSession();
  dispatchAuthExpired();
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const session = readRawStoredSession();
    const token = typeof session?.token === 'string' ? session.token : '';
    if (!token || isTokenBeyondRefreshGrace(token)) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/employees/session/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return false;

      const payload = await response.json().catch(() => ({}));
      if (typeof payload?.token !== 'string' || !payload.token) return false;

      updateStoredAuthSession(payload.token, payload.employee ?? session?.employee);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function ensureValidAuthSession(): Promise<boolean> {
  const session = readRawStoredSession();
  const token = typeof session?.token === 'string' ? session.token : '';
  if (!token) return false;

  if (isTokenBeyondRefreshGrace(token)) {
    handleSessionExpired();
    return false;
  }

  if (!isTokenExpired(token) && !isTokenExpiringSoon(token)) {
    return true;
  }

  const refreshed = await refreshAccessToken();
  if (refreshed) return true;

  if (isTokenExpired(token)) {
    handleSessionExpired();
    return false;
  }

  return true;
}

async function authenticatedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  await ensureValidAuthSession();
  const headers = { ...getAuthHeaders(), ...(init.headers || {}) };
  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetch(url, {
        ...init,
        headers: { ...getAuthHeaders(), ...(init.headers || {}) },
      });
    } else {
      handleSessionExpired();
    }
  }

  return response;
}

export function getStoredAuthSession(): { token?: string; employee?: any } | null {
  const parsed = readRawStoredSession();
  if (!parsed) return null;

  const token = typeof parsed?.token === 'string' ? parsed.token : '';
  if (token && isTokenBeyondRefreshGrace(token)) {
    handleSessionExpired();
    return null;
  }

  return parsed;
}

export function hasValidStoredSession(): boolean {
  return !!getStoredAuthSession();
}

export function getAuthHeaders(): Record<string, string> {
  const session = getStoredAuthSession();
  const token = typeof session?.token === 'string' ? session.token : '';
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export function startSessionRefreshScheduler(): () => void {
  const tick = () => {
    const session = readRawStoredSession();
    const token = typeof session?.token === 'string' ? session.token : '';
    if (!token) return;

    if (isTokenBeyondRefreshGrace(token)) {
      handleSessionExpired();
      return;
    }

    if (isTokenExpired(token) || isTokenExpiringSoon(token)) {
      void refreshAccessToken().then((refreshed) => {
        if (!refreshed && isTokenExpired(token)) {
          handleSessionExpired();
        }
      });
    }
  };

  tick();
  const intervalId = window.setInterval(tick, 60_000);
  return () => window.clearInterval(intervalId);
}

export async function apiGetJson<T>(
  path: string,
  init: RequestInit = {},
  options?: { force?: boolean },
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  return cachedFetchJson<T>(
    url,
    { ...init, headers: { ...getAuthHeaders(), ...(init.headers || {}) } },
    { ...options, fetchImpl: authenticatedFetch },
  );
}

export async function apiFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const method = String(init.method || 'GET').toUpperCase();
  if (method === 'GET' || !init.method) {
    return apiGetJson<T>(path, init);
  }

  const response = await authenticatedFetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { message?: string; error?: string })?.message ||
      (payload as { message?: string; error?: string })?.error ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  invalidateApiCacheForMutation(url, init);
  return payload as T;
}
