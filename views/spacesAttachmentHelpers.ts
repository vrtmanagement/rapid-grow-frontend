import { API_BASE, getAuthHeaders } from '../config/api';
import type { SpacesTask } from '../types/spaces';

export function getDownloadableUrl(url: string): string {
  return String(url || '').trim();
}

const MIME_EXTENSION_MAP: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/zip': '.zip',
};

function inferExtensionFromUrl(url: string): string {
  const match = String(url || '').trim().match(/\.([a-z0-9]{2,8})(?:$|[?#])/i);
  return match ? `.${match[1].toLowerCase()}` : '';
}

function inferFileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(String(url || '').trim());
    const segment = decodeURIComponent(parsed.pathname.split('/').pop() || '').trim();
    if (segment && segment.includes('.')) return segment;
  } catch {
    // ignore invalid URLs
  }
  return '';
}

function hasFileExtension(name: string): boolean {
  return /\.[a-z0-9]{2,8}$/i.test(String(name || '').trim());
}

function isGenericAttachmentName(name: string): boolean {
  const normalized = String(name || '').trim().toLowerCase();
  return !normalized || normalized === 'attachment' || normalized === 'file' || normalized === 'task-document';
}

export function ensureDownloadFileName(name?: string, options: { mimeType?: string; url?: string } = {}): string {
  let fileName = String(name || '').trim();
  const { mimeType = '', url = '' } = options;
  if (isGenericAttachmentName(fileName)) {
    fileName = inferFileNameFromUrl(url) || 'task-document';
  }
  if (!hasFileExtension(fileName)) {
    const normalizedMime = String(mimeType || '').trim().toLowerCase().split(';')[0];
    const extension = MIME_EXTENSION_MAP[normalizedMime] || inferExtensionFromUrl(url);
    if (extension) fileName = `${fileName}${extension}`;
  }
  return fileName.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 180) || 'task-document';
}

export function getTaskAttachments(task?: Pick<SpacesTask, 'documents' | 'documentUrl' | 'documentName' | 'documentMimeType'>) {
  const documents = Array.isArray(task?.documents) ? task.documents : [];
  const normalized = documents
    .map((item) => ({
      url: String(item?.url || '').trim(),
      name: ensureDownloadFileName(item?.name, {
        mimeType: item?.mimeType,
        url: item?.url,
      }),
      mimeType: String(item?.mimeType || '').trim(),
    }))
    .filter((item) => item.url);

  if (normalized.length) return normalized;

  const fallbackUrl = String(task?.documentUrl || '').trim();
  if (!fallbackUrl) return [];

  return [
    {
      url: fallbackUrl,
      name: ensureDownloadFileName(task?.documentName, {
        mimeType: task?.documentMimeType,
        url: fallbackUrl,
      }),
      mimeType: String(task?.documentMimeType || '').trim(),
    },
  ];
}

export async function forceDownloadDocument(url: string, fileName?: string) {
  const href = getDownloadableUrl(url);
  if (!href) throw new Error('Document URL is missing');
  const resolvedName = ensureDownloadFileName(fileName, { url: href });
  const query = new URLSearchParams({ url: href, name: resolvedName });
  const response = await fetch(`${API_BASE}/spaces/tasks/document-download?${query.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to download document');
  const blob = await response.blob();
  const finalName = ensureDownloadFileName(resolvedName, {
    mimeType: blob.type,
    url: href,
  });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = finalName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}
