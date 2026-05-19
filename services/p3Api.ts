import { API_BASE, getAuthHeaders } from '../config/api';

export async function fetchStrengthsDashboard() {
  const res = await fetch(`${API_BASE}/strengths/dashboard`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load strengths');
  return res.json();
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
  const res = await fetch(`${API_BASE}/spaces/tasks/${taskId}/time-entries`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load time entries');
  return res.json();
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
  const res = await fetch(`${API_BASE}/ai/usage?days=${days}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load AI usage');
  return res.json();
}

export async function fetchAiSettings() {
  const res = await fetch(`${API_BASE}/ai/settings`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load AI settings');
  return res.json();
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
  const res = await fetch(`${API_BASE}/org-chart`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load org chart');
  return res.json();
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
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}
