import { API_BASE, apiFetchJson, apiGetJson, getStoredAuthSession } from '../config/api';
import { fetchTabEndpoint } from '../services/tabSessionCache';

const COMMUNICATION_TAB = 'communication';

export type ChatRoleGroup = 'admin' | 'team_lead' | 'employees';

function getAuthToken(): string | null {
  const session = getStoredAuthSession();
  return typeof session?.token === 'string' ? session.token : null;
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function authHeadersJson(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...authHeaders(),
  };
}

function authHeadersMultipart(): Record<string, string> {
  return authHeaders();
}

function getDownloadFilename(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) return fallback;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const basicMatch = contentDisposition.match(/filename="([^"]+)"|filename=([^;]+)/i);
  const rawName = basicMatch?.[1] || basicMatch?.[2];
  return rawName ? rawName.trim() : fallback;
}

export async function apiListUsers(options?: { force?: boolean }) {
  return fetchTabEndpoint<{ users: any[] }>(COMMUNICATION_TAB, '/communication/users', options);
}

export async function apiListConversations(options?: { force?: boolean }) {
  return fetchTabEndpoint<{ conversations: any[] }>(
    COMMUNICATION_TAB,
    '/communication/conversations',
    options,
  );
}

export async function apiHistory(conversationKey: string, limit = 50) {
  const qs = new URLSearchParams({ conversationKey, limit: String(limit) });
  return apiGetJson<{ conversationKey: string; pinnedMessage?: any; messages: any[] }>(
    `/communication/history?${qs.toString()}`,
  );
}

export async function apiPinMessage(conversationKey: string, messageId: string) {
  const res = await fetch(`${API_BASE}/communication/messages/pin`, {
    method: 'POST',
    headers: authHeadersJson(),
    body: JSON.stringify({ conversationKey, messageId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to pin message');
  }
  return res.json() as Promise<{
    ok: boolean;
    conversationKey: string;
    pinned: boolean;
    pinnedMessage: any;
  }>;
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

export async function apiDownloadCommunicationFile(fileId: string, fallbackFileName = 'attachment') {
  const trimmedFileId = String(fileId || '').trim();
  if (!trimmedFileId) throw new Error('Attachment file id is missing');

  const res = await fetch(`${API_BASE}/communication/files/${encodeURIComponent(trimmedFileId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Download failed');

  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const downloadName = getDownloadFilename(res.headers.get('content-disposition'), fallbackFileName);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = downloadName || fallbackFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function apiCreateTeam(name: string, memberIds: string[], avatar?: string | null) {
  const res = await fetch(`${API_BASE}/communication/teams`, {
    method: 'POST',
    headers: authHeadersJson(),
    body: JSON.stringify({ name, memberIds, avatar }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to create team');
  return res.json() as Promise<{ team: { conversationKey: string; title: string; avatar?: string; memberCount: number } }>;
}

export async function apiUpdateTeam(conversationKey: string, payload: { name?: string; memberIds?: string[]; avatar?: string | null }) {
  const res = await fetch(`${API_BASE}/communication/teams/${encodeURIComponent(conversationKey)}`, {
    method: 'PATCH',
    headers: authHeadersJson(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to update team');
  return res.json() as Promise<{ team: { conversationKey: string; title: string; avatar?: string; memberCount: number } }>;
}

export async function apiDeleteTeam(conversationKey: string) {
  const res = await fetch(`${API_BASE}/communication/teams/${encodeURIComponent(conversationKey)}`, {
    method: 'DELETE',
    headers: authHeadersJson(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to delete team');
  return res.json() as Promise<{ ok: boolean }>;
}

export async function apiUnreadCount(userId: string) {
  const res = await fetch(`${API_BASE}/communication/messages/unread-count/${encodeURIComponent(userId)}`, {
    headers: authHeadersJson(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to load unread count');
  return res.json() as Promise<{ unreadCount: number }>;
}

export async function apiMarkAsRead({
  senderId,
  conversationKey,
}: {
  senderId?: string;
  conversationKey?: string;
}) {
  const res = await fetch(`${API_BASE}/communication/messages/mark-as-read`, {
    method: 'PUT',
    headers: authHeadersJson(),
    body: JSON.stringify({ senderId, conversationKey }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to mark messages read');
  return res.json() as Promise<{ updated: number; unreadCount: number }>;
}

export async function apiClearChat(conversationKey: string) {
  const res = await fetch(`${API_BASE}/communication/messages/clear-chat`, {
    method: 'POST',
    headers: authHeadersJson(),
    body: JSON.stringify({ conversationKey }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to clear chat');
  }
  return res.json() as Promise<{ ok: boolean; clearedCount: number }>;
}

export async function apiForwardMessages(payload: {
  messageIds: string[];
  recipientIds: string[];
  note?: string;
}) {
  const res = await fetch(`${API_BASE}/communication/messages/forward`, {
    method: 'POST',
    headers: authHeadersJson(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to forward messages');
  }
  return res.json() as Promise<{
    ok: boolean;
    forwardedCount: number;
    recipientCount: number;
    results: Array<{
      conversationKey: string;
      messages: any[];
    }>;
  }>;
}

export async function apiCreatePoll(payload: {
  conversationKey: string;
  question: string;
  options: string[];
  allowsMultipleAnswers: boolean;
  anonymous: boolean;
  expiresAt?: string | null;
}) {
  return apiFetchJson('/communication/polls/create', {
    method: 'POST',
    headers: authHeadersJson(),
    body: JSON.stringify(payload),
  });
}

export async function apiVotePoll(payload: { pollId: string; optionIds: string[] }) {
  return apiFetchJson('/communication/polls/vote', {
    method: 'POST',
    headers: authHeadersJson(),
    body: JSON.stringify(payload),
  });
}

export async function apiPollResults(pollId: string) {
  return apiGetJson(`/communication/polls/results/${encodeURIComponent(pollId)}`);
}

export async function apiClosePoll(pollId: string) {
  return apiFetchJson(`/communication/polls/close/${encodeURIComponent(pollId)}`, {
    method: 'POST',
    headers: authHeadersJson(),
  });
}

export async function apiDeletePoll(pollId: string) {
  return apiFetchJson(`/communication/polls/delete/${encodeURIComponent(pollId)}`, {
    method: 'DELETE',
    headers: authHeadersJson(),
  });
}

export async function apiExportPollResults(pollId: string, fallbackFileName = 'poll-results.xlsx') {
  const res = await fetch(`${API_BASE}/communication/polls/export/${encodeURIComponent(pollId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to export poll results');

  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const downloadName = getDownloadFilename(res.headers.get('content-disposition'), fallbackFileName);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = downloadName || fallbackFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function apiPollAnalytics(conversationKey?: string) {
  const qs = new URLSearchParams();
  if (conversationKey) qs.set('conversationKey', conversationKey);
  return apiGetJson(`/communication/polls/analytics${qs.toString() ? `?${qs.toString()}` : ''}`);
}

