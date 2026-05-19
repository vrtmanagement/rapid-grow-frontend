import { API_BASE, getAuthHeaders } from '../config/api';

export async function fetchBillingStatus() {
  const res = await fetch(`${API_BASE}/billing/status`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load billing status');
  return res.json();
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

export async function fetchAuditLogs(params?: {
  limit?: number;
  skip?: number;
  entityType?: string;
  actorEmpId?: string;
}) {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.skip) q.set('skip', String(params.skip));
  if (params?.entityType) q.set('entityType', params.entityType);
  if (params?.actorEmpId) q.set('actorEmpId', params.actorEmpId);
  const res = await fetch(`${API_BASE}/audit-logs?${q.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load audit logs');
  return res.json();
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
