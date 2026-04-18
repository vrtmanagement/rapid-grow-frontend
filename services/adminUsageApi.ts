import { API_BASE, getAuthHeaders } from '../config/api';

export interface AdminUsageCollection {
  key: string;
  label: string;
  description: string;
  collectionName: string;
  count: number;
  sizeBytes: number;
  limitBytes: number;
  usagePercent: number;
  isWarning: boolean;
}

export interface AdminUsageSnapshot {
  limitBytes: number;
  totalCount: number;
  totalSizeBytes: number;
  refreshedAt: string;
  collections: AdminUsageCollection[];
}

interface ClearCollectionResponse {
  success: boolean;
  message: string;
  key: string;
  label: string;
  collectionName: string;
  deletedCount: number;
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }
  return payload as T;
}

export async function apiFetchAdminUsage(signal?: AbortSignal): Promise<AdminUsageSnapshot> {
  const response = await fetch(`${API_BASE}/admin/usage`, {
    method: 'GET',
    headers: getAuthHeaders(),
    signal,
  });

  return parseResponse<AdminUsageSnapshot>(response, 'Failed to load memory usage');
}

export async function apiClearAdminCollection(collectionKey: string): Promise<ClearCollectionResponse> {
  const response = await fetch(`${API_BASE}/admin/clear/${encodeURIComponent(collectionKey)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return parseResponse<ClearCollectionResponse>(response, 'Failed to clear collection data');
}
