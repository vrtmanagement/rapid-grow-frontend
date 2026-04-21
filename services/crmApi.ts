import { API_BASE, getAuthHeaders, getStoredAuthSession } from '../config/api';

export async function crmRequest(path: string, options: RequestInit = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'CRM request failed');
  }
  return response;
}

export async function crmJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await crmRequest(path, options);
  return response.json();
}

export async function crmUploadFile(path: string, formData: FormData) {
  const session = getStoredAuthSession();
  const token = typeof session?.token === 'string' ? session.token : '';
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'CRM upload failed');
  }
  return response.json();
}
