import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../config/api';
import { cachedFetchJson, invalidateApiCacheForMutation } from './apiCache';

function buildCrmUrl(path: string) {
  return `${API_BASE}${path}`;
}

function mergeHeaders(options: RequestInit = {}) {
  return {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };
}

export async function crmRequest(path: string, options: RequestInit = {}) {
  const url = buildCrmUrl(path);
  const method = String(options.method || 'GET').toUpperCase();

  if (method === 'GET' || !options.method) {
    const payload = await cachedFetchJson(url, { ...options, headers: mergeHeaders(options) });
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch(url, { ...options, headers: mergeHeaders(options) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'CRM request failed');
  }
  invalidateApiCacheForMutation(url, options);
  return response;
}

export async function crmJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = buildCrmUrl(path);
  const method = String(options.method || 'GET').toUpperCase();

  if (method === 'GET' || !options.method) {
    return cachedFetchJson<T>(url, { ...options, headers: mergeHeaders(options) });
  }

  const response = await fetch(url, { ...options, headers: mergeHeaders(options) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'CRM request failed');
  }
  invalidateApiCacheForMutation(url, options);
  return response.json();
}

export async function crmUploadFile(path: string, formData: FormData) {
  const session = getStoredAuthSession();
  const token = typeof session?.token === 'string' ? session.token : '';
  const url = buildCrmUrl(path);
  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'CRM upload failed');
  }
  invalidateApiCacheForMutation(url, { method: 'POST' });
  return response.json();
}
