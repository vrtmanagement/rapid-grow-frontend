import { API_BASE, apiFetchJson, apiGetJson } from '../config/api';

export type ContentType = 'general' | 'linkedin' | 'youtube' | 'website' | 'newsletter';
export type ContentDraftMode = 'calendar' | 'follow-ee' | 'follow-ega' | 'auto-add' | 'blog';

export interface ContentAsset {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  fileUrl: string;
  type: 'image' | 'file';
}

export interface ContentItem {
  contentId: string;
  title: string;
  description: string;
  type: ContentType;
  contentDate: string;
  channelKey?: string;
  coverImage?: ContentAsset | null;
  attachments: ContentAsset[];
  comments?: ContentComment[];
  createdBy?: {
    empId?: string;
    name?: string;
    role?: string;
  };
  updatedBy?: {
    empId?: string;
    name?: string;
    role?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ContentComment {
  id: string;
  parentCommentId?: string;
  text: string;
  fromEmpId?: string;
  fromName?: string;
  fromRole?: string;
  createdAt: string;
  editedAt?: string;
}

export interface ContentChannel {
  channelKey: string;
  title: string;
  subtitle: string;
  type: ContentType;
  createdBy?: {
    empId?: string;
    name?: string;
    role?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ContentDraftPayload {
  title: string;
  description: string;
  type: ContentType;
  contentDate: string;
  attachments: ContentAsset[];
}

export interface ContentDraftRecord extends ContentDraftPayload {
  mode: ContentDraftMode;
  updatedAt?: string;
}

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

export async function apiListContent() {
  return apiGetJson<{ items: ContentItem[] }>('/content');
}

export async function apiGetContent(contentId: string) {
  return apiGetJson<{ item: ContentItem }>(`/content/${encodeURIComponent(contentId)}`);
}

export async function apiUploadContentFile(file: File) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/content/upload`, {
    method: 'POST',
    headers: authHeadersMultipart(),
    body: form,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Upload failed');
  return res.json() as Promise<ContentAsset>;
}

export async function apiCreateContent(payload: {
  title: string;
  description: string;
  type: ContentType;
  contentDate: string;
  channelKey?: string;
  coverImage?: ContentAsset | null;
  attachments: ContentAsset[];
}) {
  return apiFetchJson<{ item: ContentItem }>('/content', {
    method: 'POST',
    headers: authHeadersJson(),
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateContent(
  contentId: string,
  payload: Partial<Pick<ContentItem, 'title' | 'description' | 'type' | 'contentDate' | 'channelKey' | 'attachments'>>
) {
  return apiFetchJson<{ item: ContentItem }>(`/content/${encodeURIComponent(contentId)}`, {
    method: 'PATCH',
    headers: authHeadersJson(),
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteContent(contentId: string) {
  return apiFetchJson<{ ok: boolean; contentId: string }>(`/content/${encodeURIComponent(contentId)}`, {
    method: 'DELETE',
    headers: authHeadersJson(),
  });
}

export async function apiAddContentComment(contentId: string, text: string, parentCommentId?: string) {
  const res = await fetch(`${API_BASE}/content/${encodeURIComponent(contentId)}/comments`, {
    method: 'POST',
    headers: authHeadersJson(),
    body: JSON.stringify({ text, ...(parentCommentId ? { parentCommentId } : {}) }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to add comment');
  return res.json() as Promise<{ comments: ContentComment[] }>;
}

export async function apiUpdateContentComment(contentId: string, commentId: string, text: string) {
  const res = await fetch(`${API_BASE}/content/${encodeURIComponent(contentId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'PATCH',
    headers: authHeadersJson(),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to update comment');
  return res.json() as Promise<{ comments: ContentComment[] }>;
}

export async function apiDeleteContentComment(contentId: string, commentId: string) {
  const res = await fetch(`${API_BASE}/content/${encodeURIComponent(contentId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers: authHeadersJson(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to delete comment');
  return res.json() as Promise<{ comments: ContentComment[] }>;
}

export async function apiListChannels() {
  return apiGetJson<{ channels: ContentChannel[] }>('/content/channels');
}

export async function apiCreateChannel(payload: { title: string; subtitle?: string; type?: ContentType; channelKey?: string }) {
  const res = await fetch(`${API_BASE}/content/channels`, {
    method: 'POST',
    headers: authHeadersJson(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to create channel');
  return res.json() as Promise<{ channel: ContentChannel }>;
}

export async function apiGetContentDraft(mode: ContentDraftMode) {
  return apiGetJson<{ draft: ContentDraftRecord | null }>(`/content/drafts/${encodeURIComponent(mode)}`);
}

export async function apiUpsertContentDraft(mode: ContentDraftMode, payload: ContentDraftPayload) {
  const res = await fetch(`${API_BASE}/content/drafts/${encodeURIComponent(mode)}`, {
    method: 'PUT',
    headers: authHeadersJson(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to save content draft');
  return res.json() as Promise<{ draft: ContentDraftRecord }>;
}

export async function apiDeleteContentDraft(mode: ContentDraftMode) {
  const res = await fetch(`${API_BASE}/content/drafts/${encodeURIComponent(mode)}`, {
    method: 'DELETE',
    headers: authHeadersJson(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to delete content draft');
  return res.json() as Promise<{ ok: boolean }>;
}
