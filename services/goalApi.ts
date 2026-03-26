import { API_BASE, getAuthHeaders } from '../config/api';
import { Goal } from '../types';

export async function saveGoal(goal: Goal): Promise<void> {
  const res = await fetch(`${API_BASE}/goals/${encodeURIComponent(goal.id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      level: goal.level,
      text: goal.text || '',
      details: goal.details || '',
      timeline: goal.timeline || '',
      completed: !!goal.completed,
      parentId: goal.parentId || '',
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `Failed to save goal (${res.status})`);
  }
}

export async function removeGoal(goalId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/goals/${encodeURIComponent(goalId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `Failed to delete goal (${res.status})`);
  }
}
