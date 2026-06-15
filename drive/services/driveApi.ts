import { API_BASE, getStoredAuthSession, apiFetchJson, apiGetJson } from '../../config/api';
import { parseApiResponse } from '../../services/apiClient';
import type {
  DriveEntry,
  DriveEntryType,
  DriveFile,
  DriveFolder,
  DriveFolderStorageMode,
  DriveFolderVisibility,
  DriveListResponse,
  DriveSortOption,
} from '../types';

type FolderListParams = {
  parentFolder?: string | null;
  search?: string;
  page?: number;
  limit?: number;
  sort?: DriveSortOption;
  scope?: 'children' | 'tree';
};

type FileListParams = {
  folderId?: string | null;
  search?: string;
  page?: number;
  limit?: number;
  sort?: DriveSortOption;
  fileType?: string;
};

type EntryListParams = {
  folderId: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: DriveSortOption;
  entryType?: DriveEntryType;
};

type DriveUploadOptions = {
  file: File;
  folderId?: string | null;
  onProgress?: (progress: number) => void;
};

function buildQuery(params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  return query.toString();
}

function getAuthToken(): string {
  return String(getStoredAuthSession()?.token || '');
}

function authHeaders(token = getAuthToken()): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
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

export async function apiListDriveFolders(
  params: FolderListParams = {},
): Promise<DriveListResponse<DriveFolder>> {
  const query = buildQuery({
    parentFolder: params.parentFolder || null,
    search: params.search || '',
    page: params.page || 1,
    limit: params.limit || 24,
    sort: params.sort || 'newest',
    scope: params.scope || 'children',
  });
  return apiGetJson<DriveListResponse<DriveFolder>>(`/drive/folders${query ? `?${query}` : ''}`);
}

export async function apiGetDriveFolder(folderId: string) {
  return apiGetJson<{ folder: DriveFolder }>(`/drive/folders/${encodeURIComponent(folderId)}`);
}

export async function apiCreateDriveFolder(payload: {
  name: string;
  description?: string;
  storageMode?: DriveFolderStorageMode;
  visibility?: DriveFolderVisibility;
  parentFolder?: string | null;
}) {
  return apiFetchJson<{ folder: DriveFolder }>('/drive/folders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateDriveFolder(
  folderId: string,
  payload: {
    name?: string;
    description?: string;
    storageMode?: DriveFolderStorageMode;
    visibility?: DriveFolderVisibility;
  },
) {
  return apiFetchJson<{ folder: DriveFolder }>(`/drive/folders/${encodeURIComponent(folderId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function apiListDriveEntries(
  params: EntryListParams,
): Promise<DriveListResponse<DriveEntry>> {
  const query = buildQuery({
    folderId: params.folderId,
    search: params.search || '',
    page: params.page || 1,
    limit: params.limit || 100,
    sort: params.sort || 'newest',
    entryType: params.entryType || '',
  });
  return apiGetJson<DriveListResponse<DriveEntry>>(`/drive/entries${query ? `?${query}` : ''}`);
}

export async function apiCreateDriveEntry(payload: {
  folderId: string;
  entryType: DriveEntryType;
  title: string;
  description?: string;
  linkUrl?: string;
  contentText?: string;
}) {
  return apiFetchJson<{ entry: DriveEntry }>('/drive/entries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateDriveEntry(
  entryId: string,
  payload: { title?: string; description?: string; linkUrl?: string; contentText?: string },
) {
  return apiFetchJson<{ entry: DriveEntry }>(`/drive/entries/${encodeURIComponent(entryId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function apiMoveDriveEntry(payload: {
  entryId: string;
  folderId: string;
}) {
  return apiFetchJson<{ entry: DriveEntry }>('/drive/entries/move', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteDriveEntry(entryId: string) {
  return apiFetchJson<{ success: boolean; entry: { id: string; title: string; folderId: string | null } }>(
    `/drive/entries/${encodeURIComponent(entryId)}`,
    {
      method: 'DELETE',
    },
  );
}

export async function apiMoveDriveFolder(payload: {
  folderId: string;
  parentFolder?: string | null;
}) {
  return apiFetchJson<{ folder: DriveFolder }>('/drive/folders/move', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteDriveFolder(folderId: string) {
  return apiFetchJson<{
    success: boolean;
    folderId: string;
    deletedFolderCount: number;
    deletedFileCount: number;
  }>(`/drive/folders/${encodeURIComponent(folderId)}`, {
    method: 'DELETE',
  });
}

export async function apiListDriveFiles(
  params: FileListParams = {},
): Promise<DriveListResponse<DriveFile>> {
  const query = buildQuery({
    folderId: params.folderId || null,
    search: params.search || '',
    page: params.page || 1,
    limit: params.limit || 24,
    sort: params.sort || 'newest',
    fileType: params.fileType || '',
  });
  return apiGetJson<DriveListResponse<DriveFile>>(`/drive/files${query ? `?${query}` : ''}`);
}

export async function apiListDriveFilesByFolder(
  folderId: string,
  params: Omit<FileListParams, 'folderId'> = {},
) {
  const query = buildQuery({
    search: params.search || '',
    page: params.page || 1,
    limit: params.limit || 24,
    sort: params.sort || 'newest',
    fileType: params.fileType || '',
  });
  return apiGetJson<DriveListResponse<DriveFile>>(
    `/drive/files/folder/${encodeURIComponent(folderId)}${query ? `?${query}` : ''}`,
  );
}

export async function apiRenameDriveFile(fileId: string, payload: { fileName: string }) {
  return apiFetchJson<{ file: DriveFile }>(`/drive/files/${encodeURIComponent(fileId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function apiMoveDriveFile(payload: {
  fileId: string;
  folderId?: string | null;
}) {
  return apiFetchJson<{ file: DriveFile }>('/drive/files/move', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteDriveFile(fileId: string) {
  return apiFetchJson<{ success: boolean; file: { id: string; fileName: string; folderId: string | null } }>(
    `/drive/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
    },
  );
}

export async function apiDownloadDriveFile(fileId: string, fallbackFileName: string) {
  const response = await fetch(`${API_BASE}/drive/files/download/${encodeURIComponent(fileId)}`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error((await response.json().catch(() => ({}))).message || 'Download failed');
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const downloadName = getDownloadFilename(response.headers.get('content-disposition'), fallbackFileName);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = downloadName || fallbackFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function apiForwardDriveFiles(payload: {
  fileIds: string[];
  recipientIds: string[];
  note?: string;
}) {
  return apiFetchJson<{
    ok: boolean;
    forwardedCount: number;
    recipientCount: number;
    results: Array<{
      conversationKey: string;
      messages: any[];
    }>;
  }>('/communication/messages/forward', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createDriveUploadRequest(options: DriveUploadOptions) {
  const xhr = new XMLHttpRequest();
  const form = new FormData();
  form.append('file', options.file);
  if (options.folderId) {
    form.append('folderId', options.folderId);
  }

  const promise = new Promise<DriveFile | null>((resolve, reject) => {
    xhr.open('POST', `${API_BASE}/drive/files`);
    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
      options.onProgress?.(progress);
    });

    xhr.addEventListener('load', async () => {
      try {
        const response = new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: {
            'Content-Type': xhr.getResponseHeader('Content-Type') || 'application/json',
          },
        });
        const payload = await parseApiResponse<{ file: DriveFile | null; files?: DriveFile[] }>(response);
        resolve(payload.file || payload.files?.[0] || null);
      } catch (error) {
        reject(error);
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
    xhr.send(form);
  });

  return {
    promise,
    cancel: () => xhr.abort(),
  };
}
