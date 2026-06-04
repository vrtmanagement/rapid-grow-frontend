import { API_BASE, apiGetJson, getAuthHeaders } from '../config/api';

export async function fetchPlanUsage() {
  return apiGetJson('/plan/usage');
}

export async function fetchSuperAdminTenants() {
  return apiGetJson('/super-admin/tenants');
}

export async function fetchSuperAdminTenant(companyId: string) {
  return apiGetJson(`/super-admin/tenants/${companyId}`);
}

export async function updateTenantStatus(companyId: string, status: 'active' | 'suspended') {
  const res = await fetch(`${API_BASE}/super-admin/tenants/${companyId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update tenant');
  return res.json();
}

export async function createDataExport() {
  const res = await fetch(`${API_BASE}/data-export`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Export failed');
  return res.json();
}

export async function listDataExports() {
  return apiGetJson('/data-export');
}

export async function requestAccountClosure(reason: string, retentionDays = 30) {
  const res = await fetch(`${API_BASE}/account/closure`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason, retentionDays }),
  });
  if (!res.ok) throw new Error('Closure request failed');
  return res.json();
}

export async function getAccountClosureStatus() {
  return apiGetJson('/account/closure');
}

export async function updateProjectAdvanced(
  projectId: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/advanced`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

export async function fetchClientPortal(token: string) {
  const res = await fetch(`${API_BASE}/client-portal/${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error('Invalid client portal link');
  return res.json();
}
