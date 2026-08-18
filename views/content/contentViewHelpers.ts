import { ContentAsset, ContentDraftRecord } from '../../services/contentApi';
import { CONTENT_VIEW_DRAFTS_KEY, MOMENT_STORAGE_KEY } from './contentViewConstants';
import type { MomentEntry } from './contentViewConstants';
import { getUserTimeZone } from '../../utils/timezone';

export function nameInitials(name: string) {
  const clean = (name || '').trim();
  if (!clean) return 'U';
  const parts = clean.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export function getLoggedInUser() {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    const parsed = raw ? JSON.parse(raw) : null;
    const employee = parsed?.employee || {};
    return {
      empId: String(employee.empId || employee._id || '').trim(),
      role: String(employee.role || '').trim().toUpperCase(),
    };
  } catch {
    return { empId: '', role: '' };
  }
}

export function isAdminRole(role: string) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function formatUsDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: getUserTimeZone(),
  });
}

/** Date + time when content was created (e.g. cards, previews); matches card time zone. */
export function formatContentCreatedStamp(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: getUserTimeZone(),
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: getUserTimeZone(),
  });
  return `${datePart} · ${timePart}`;
}

export function findScrollContainer(node: HTMLElement | null): HTMLElement | Window {
  let current = node?.parentElement || null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && current.scrollHeight > current.clientHeight;

    if (isScrollable) {
      return current;
    }

    current = current.parentElement;
  }

  return window;
}

export function autoResizeTextarea(target: HTMLTextAreaElement) {
  const container = findScrollContainer(target);
  const previousContainerScrollTop = container === window ? window.scrollY : container.scrollTop;
  const previousTextareaScrollTop = target.scrollTop;
  target.style.height = 'auto';
  target.style.height = `${target.scrollHeight}px`;
  target.scrollTop = previousTextareaScrollTop;
  if (container === window) {
    window.scrollTo({ top: previousContainerScrollTop, behavior: 'auto' });
  } else {
    container.scrollTop = previousContainerScrollTop;
  }
}

export function isImageAsset(asset: ContentAsset) {
  return String(asset.type || '').toLowerCase() === 'image' || String(asset.mimeType || '').toLowerCase().startsWith('image/');
}

export async function triggerAssetDownload(asset: ContentAsset) {
  const href = String(asset.fileUrl || '').trim();
  if (!href) return;
  try {
    const response = await fetch(href, { cache: 'no-store' });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = asset.fileName || 'attachment';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
  } catch {
    // Fallback for hosts that block blob fetch.
    const downloadHref = href.includes('?') ? `${href}&download=${Date.now()}` : `${href}?download=${Date.now()}`;
    const link = document.createElement('a');
    link.href = downloadHref;
    link.download = asset.fileName || 'attachment';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

export function readStringList(storageKey: string) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => String(entry || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function readMomentEntries() {
  try {
    const raw = localStorage.getItem(MOMENT_STORAGE_KEY);
    if (!raw) return [] as MomentEntry[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as MomentEntry[];
    return parsed
      .map((entry: any) => ({
        id: String(entry?.id || '').trim(),
        date: String(entry?.date || '').trim(),
        topic: String(entry?.topic || '').trim(),
        text: String(entry?.text || '').trim(),
        createdAt: String(entry?.createdAt || '').trim(),
      }))
      .filter((entry: MomentEntry) => entry.id && entry.date && entry.text);
  } catch {
    return [] as MomentEntry[];
  }
}

export function readContentViewDrafts() {
  try {
    const raw = localStorage.getItem(CONTENT_VIEW_DRAFTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as { newLinkValue?: string; newTagValue?: string };
  } catch {
    return {};
  }
}

export function hasServerDraftContent(draft?: ContentDraftRecord | null) {
  if (!draft) return false;
  return Boolean(
    String(draft.title || '').trim() ||
    String(draft.description || '').trim() ||
    (Array.isArray(draft.attachments) && draft.attachments.length > 0),
  );
}

export function scrollContainerToTop(container: HTMLElement | Window) {
  if (container === window) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }

  container.scrollTo({ top: 0, behavior: 'auto' });
}
