/**
 * API config - points to Gateway (http://localhost:5000/api)
 * Set VITE_API_URL in .env for different environments
 */
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
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

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === 'number' ? payload.exp : null;
  if (!exp) return false;
  return exp * 1000 <= Date.now();
}

export function clearStoredSession() {
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

export function getStoredAuthSession(): { token?: string; employee?: any } | null {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    const token = typeof parsed?.token === 'string' ? parsed.token : '';
    if (token && isTokenExpired(token)) {
      clearStoredSession();
      dispatchAuthExpired();
      return null;
    }
    return parsed;
  } catch {
    clearStoredSession();
    return null;
  }
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

