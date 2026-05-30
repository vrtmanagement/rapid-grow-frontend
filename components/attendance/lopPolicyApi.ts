import { API_BASE, getAuthHeaders } from '../../config/api';
import { LeaveLopPreview, LeaveLopSummary, LopPolicyConfig } from './attendanceUtils';

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function fetchLopPolicy(): Promise<LopPolicyConfig> {
  const response = await fetch(`${API_BASE}/leaves/admin/lop-policy`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || 'Failed to fetch LOP policy');
  }
  return response.json();
}

export async function saveLopPolicy(payload: Record<string, unknown>): Promise<LopPolicyConfig> {
  const response = await fetch(`${API_BASE}/leaves/admin/lop-policy`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || 'Failed to save LOP policy');
  }
  return response.json();
}

export async function previewLeaveLop(query: {
  startDate: string;
  endDate: string;
  type?: string;
  dayPortion?: string;
  empId?: string;
}): Promise<LeaveLopPreview> {
  const response = await fetch(
    `${API_BASE}/leaves/preview-lop${buildQuery({
      startDate: query.startDate,
      endDate: query.endDate,
      type: query.type,
      dayPortion: query.dayPortion,
      empId: query.empId,
    })}`,
    { headers: getAuthHeaders() },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || 'Failed to preview LOP');
  }
  return response.json();
}

export async function fetchMyLopSummary(year?: number): Promise<LeaveLopSummary> {
  const response = await fetch(
    `${API_BASE}/leaves/me/lop-summary${buildQuery({ year })}`,
    { headers: getAuthHeaders() },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || 'Failed to fetch LOP summary');
  }
  return response.json();
}

export async function applyLeaveLopAction(
  leaveId: string,
  action: string,
  reason?: string,
): Promise<unknown> {
  const response = await fetch(`${API_BASE}/leaves/${leaveId}/lop-action`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, reason }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || 'Failed to apply LOP action');
  }
  return response.json();
}
