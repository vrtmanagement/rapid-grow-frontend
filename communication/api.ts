import { API_BASE } from '../config/api';

export type ChatRoleGroup = 'admin' | 'team_lead' | 'employees';

function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
}

function authHeadersJson(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function authHeadersMultipart(): Record<string, string> {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiListUsers() {
  const res = await fetch(`${API_BASE}/communication/users`, { headers: authHeadersJson() });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to load users');
  return res.json() as Promise<{ users: any[] }>;
}

export async function apiListConversations() {
  const res = await fetch(`${API_BASE}/communication/conversations`, { headers: authHeadersJson() });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to load conversations');
  return res.json() as Promise<{ conversations: any[] }>;
}

export async function apiHistory(conversationKey: string, limit = 50) {
  const qs = new URLSearchParams({ conversationKey, limit: String(limit) });
  const res = await fetch(`${API_BASE}/communication/history?${qs.toString()}`, { headers: authHeadersJson() });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to load history');
  return res.json() as Promise<{ conversationKey: string; messages: any[] }>;
}

export async function apiUploadFile(file: File) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/communication/upload`, {
    method: 'POST',
    headers: authHeadersMultipart(),
    body: form,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Upload failed');
  return res.json() as Promise<{
    fileId: string;
    fileName: string;
    mimeType: string;
    size: number;
    fileUrl: string;
    type: 'image' | 'file';
    urlPath: string;
  }>;
}

export async function apiCreateTeam(name: string, memberIds: string[]) {
  const res = await fetch(`${API_BASE}/communication/teams`, {
    method: 'POST',
    headers: authHeadersJson(),
    body: JSON.stringify({ name, memberIds }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to create team');
  return res.json() as Promise<{ team: { conversationKey: string; title: string; memberCount: number } }>;
}

export async function apiUpdateTeam(conversationKey: string, payload: { name?: string; memberIds?: string[] }) {
  const res = await fetch(`${API_BASE}/communication/teams/${encodeURIComponent(conversationKey)}`, {
    method: 'PATCH',
    headers: authHeadersJson(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to update team');
  return res.json() as Promise<{ team: { conversationKey: string; title: string; memberCount: number } }>;
}

export async function apiDeleteTeam(conversationKey: string) {
  const res = await fetch(`${API_BASE}/communication/teams/${encodeURIComponent(conversationKey)}`, {
    method: 'DELETE',
    headers: authHeadersJson(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to delete team');
  return res.json() as Promise<{ ok: boolean }>;
}

