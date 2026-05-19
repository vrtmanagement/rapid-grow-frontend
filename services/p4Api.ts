import { API_BASE, getAuthHeaders } from '../config/api';

export type ProjectOption = { id: string; name: string };

export async function fetchProjectOptions(): Promise<ProjectOption[]> {
  const res = await fetch(`${API_BASE}/project-charters`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load projects');
  const rows = await res.json().catch(() => []);
  return (Array.isArray(rows) ? rows : [])
    .map((row: { clientProjectId?: string; id?: string; name?: string; projectName?: string }) => ({
      id: String(row.clientProjectId || row.id || '').trim(),
      name: String(row.name || row.projectName || 'Untitled project').trim(),
    }))
    .filter((row) => row.id);
}

export async function fetchPlanUsage() {
  const res = await fetch(`${API_BASE}/plan/usage`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load plan usage');
  return res.json();
}

export async function fetchSuperAdminTenants() {
  const res = await fetch(`${API_BASE}/super-admin/tenants`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load tenants');
  return res.json();
}

export async function fetchSuperAdminTenant(companyId: string) {
  const res = await fetch(`${API_BASE}/super-admin/tenants/${companyId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load tenant');
  return res.json();
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
  const res = await fetch(`${API_BASE}/data-export`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to list exports');
  return res.json();
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
  const res = await fetch(`${API_BASE}/account/closure`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load closure status');
  return res.json();
}

export async function fetchProjectGantt(projectId: string) {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/gantt`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load Gantt data');
  return res.json();
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
