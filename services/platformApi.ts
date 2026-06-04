import { API_BASE, apiGetJson, getAuthHeaders } from '../config/api';

export async function fetchBillingStatus() {
  return apiGetJson('/billing/status');
}

export async function startBillingCheckout(plan: 'starter' | 'growth' | 'business') {
  const res = await fetch(`${API_BASE}/billing/checkout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error('Failed to start checkout');
  return res.json();
}

export async function openBillingPortal() {
  const res = await fetch(`${API_BASE}/billing/portal`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to open billing portal');
  return res.json();
}

export type AuditLogsResponse = {
  items?: Array<Record<string, unknown>>;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  entityTypeOptions?: Array<{ value: string; label: string }>;
  actionOptions?: Array<{ value: string; label: string }>;
};

export async function fetchAuditLogs(params?: {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
}) {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.entityType) q.set('entityType', params.entityType);
  if (params?.action) q.set('action', params.action);
  return apiGetJson<AuditLogsResponse>(`/audit-logs?${q.toString()}`, {}, { force: true });
}

export async function sendEmployeeInvite(body: {
  email: string;
  role: string;
  empId?: string;
  designation?: string;
  department?: string;
}) {
  const res = await fetch(`${API_BASE}/employees/invites`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to send invite');
  return data;
}
