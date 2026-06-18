import { API_BASE, apiGetJson, getAuthHeaders } from '../config/api';
import { fetchTabEndpoint } from './tabSessionCache';
import { Goal, PlanningState } from '../types';
import { normalizeGoalHierarchy } from '../appNormalizeGoalHierarchy';

export type GoalLevel = 'year' | 'quarter' | 'month' | 'week' | 'day';

const LEVEL_QUERY_ALIASES: Record<GoalLevel, string> = {
  year: 'year',
  quarter: 'quarter',
  month: 'month',
  week: 'week',
  day: 'day',
};

const PLANNING_TAB = 'planning';

export async function fetchGoals(level?: GoalLevel, options?: { force?: boolean }) {
  const suffix = level ? `?level=${encodeURIComponent(LEVEL_QUERY_ALIASES[level])}` : '';
  return fetchTabEndpoint<Array<Record<string, unknown>>>(PLANNING_TAB, `/goals${suffix}`, options);
}

const ALL_GOAL_LEVELS: GoalLevel[] = ['year', 'quarter', 'month', 'week', 'day'];

export async function fetchAllGoalLevels(options?: { force?: boolean }) {
  const chunks = await Promise.all(ALL_GOAL_LEVELS.map((level) => fetchGoals(level)));
  return chunks.flat();
}

export function mapGoalsToPlanningState(
  goals: Array<Record<string, unknown>>,
  prev: PlanningState,
): PlanningState {
  if (!Array.isArray(goals)) {
    return normalizeGoalHierarchy({
      ...prev,
      yearlyGoals: [],
      quarterlyGoals: [],
      monthlyGoals: [],
      weeklyGoals: [],
      dailyGoals: [],
    });
  }

  return normalizeGoalHierarchy({
    ...prev,
    yearlyGoals: goals
      .filter((g) => g.level === 'year')
      .map((g) => ({
        id: String(g.goalId || ''),
        text: String(g.text || ''),
        details: String(g.details || ''),
        completed: !!g.completed,
        level: 'year' as const,
      })),
    quarterlyGoals: goals
      .filter((g) => g.level === 'quarter')
      .map((g) => ({
        id: String(g.goalId || ''),
        text: String(g.text || ''),
        details: String(g.details || ''),
        completed: !!g.completed,
        level: 'quarter' as const,
        parentId: String(g.parentId || ''),
        timeline: String(g.timeline || ''),
      })),
    monthlyGoals: goals
      .filter((g) => g.level === 'month')
      .map((g) => ({
        id: String(g.goalId || ''),
        text: String(g.text || ''),
        completed: !!g.completed,
        level: 'month' as const,
        parentId: String(g.parentId || ''),
        details: String(g.details || ''),
      })),
    weeklyGoals: goals
      .filter((g) => g.level === 'week')
      .map((g) => ({
        id: String(g.goalId || ''),
        text: String(g.text || ''),
        completed: !!g.completed,
        level: 'week' as const,
        parentId: String(g.parentId || ''),
        details: String(g.details || ''),
        timeline: String(g.timeline || ''),
      })),
    dailyGoals: goals
      .filter((g) => g.level === 'day')
      .map((g) => ({
        id: String(g.goalId || ''),
        text: String(g.text || ''),
        completed: !!g.completed,
        level: 'day' as const,
        parentId: String(g.parentId || ''),
      })),
  });
}

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
