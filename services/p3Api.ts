import { API_BASE, apiFetchJson, apiGetJson, getAuthHeaders } from '../config/api';

export type StrengthsDashboardData = {
  byEmployee?: Array<{
    empId: string;
    empName?: string;
    designation?: string;
    department?: string;
    role?: string;
    avatar?: string;
    topSkills?: Array<{ name: string; level?: number; count?: number; lastUsedAt?: string }>;
  }>;
  teamStrengths?: Array<{ name: string; avgLevel: number; people: number }>;
};

export async function fetchStrengthsDashboard(options?: { force?: boolean }) {
  const raw = await apiGetJson<StrengthsDashboardData & { success?: boolean }>(
    '/strengths/dashboard',
    {},
    options,
  );
  return {
    byEmployee: Array.isArray(raw.byEmployee) ? raw.byEmployee : [],
    teamStrengths: Array.isArray(raw.teamStrengths) ? raw.teamStrengths : [],
  };
}

export async function analyzeSkillGaps(requiredSkills: string[]) {
  const res = await fetch(`${API_BASE}/strengths/skill-gaps`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ requiredSkills }),
  });
  if (!res.ok) throw new Error('Failed to analyze skill gaps');
  return res.json();
}

export async function updateTaskDependencies(
  taskId: string,
  blockedByTaskIds: string[],
  blocksTaskIds: string[]
) {
  const res = await fetch(`${API_BASE}/spaces/tasks/${taskId}/dependencies`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ blockedByTaskIds, blocksTaskIds }),
  });
  if (!res.ok) throw new Error('Failed to update dependencies');
  return res.json();
}

export async function updateTaskRecurrence(taskId: string, recurrence: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/spaces/tasks/${taskId}/recurrence`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(recurrence),
  });
  if (!res.ok) throw new Error('Failed to update recurrence');
  return res.json();
}

export async function fetchTimeEntries(taskId: string) {
  return apiGetJson(`/spaces/tasks/${taskId}/time-entries`);
}

export async function addTimeEntry(taskId: string, hours: number, note = '') {
  const res = await fetch(`${API_BASE}/spaces/tasks/${taskId}/time-entries`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ hours, note }),
  });
  if (!res.ok) throw new Error('Failed to log time');
  return res.json();
}

export async function fetchAiUsage(days = 30) {
  return apiGetJson(`/ai/usage?days=${days}`);
}

export async function fetchAiSettings() {
  return apiGetJson('/ai/settings');
}

export async function updateAiSettings(payload: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/ai/settings`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save AI settings');
  return res.json();
}

export async function fetchOrgChart() {
  return apiGetJson('/org-chart');
}

export async function convertLeadToProject(leadId: string, payload: Record<string, string> = {}) {
  const res = await fetch(`${API_BASE}/crm/${leadId}/convert-to-project`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to convert lead');
  return res.json();
}

export async function globalSearch(query: string) {
  return apiGetJson(`/search?q=${encodeURIComponent(query)}`);
}
