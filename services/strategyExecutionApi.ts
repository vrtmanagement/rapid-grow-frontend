import { apiFetchJson, apiGetJson } from '../config/api';
import { invalidateApiCache } from './apiCache';

export type StrategyEventStatus = 'pending' | 'in_progress' | 'completed';

export type StrategyWhoRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE';

export interface StrategyWhoAssignee {
  empId: string;
  name: string;
  role: StrategyWhoRole;
}

export interface StrategyCalendarEvent {
  month: number;
  phase: number;
  title: string;
  purpose: string;
  outcome: string;
  who: string;
  whoAssignees?: StrategyWhoAssignee[];
  status: StrategyEventStatus;
  notes: string;
  completedAt?: string | null;
}

export interface StrategyEmployeeOption {
  empId: string;
  name: string;
  role: StrategyWhoRole;
}

export interface StrategyItem {
  id: string;
  text: string;
}

export interface StrategyPillar {
  id: string;
  name: string;
  metrics: StrategyItem[];
  initiatives: StrategyItem[];
  projects: StrategyItem[];
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface StrategyExecutionPlan {
  _id?: string;
  year: number;
  events: StrategyCalendarEvent[];
  pillars: StrategyPillar[];
  glossary: GlossaryEntry[];
  onePagePlan: string;
  updatedAt?: string;
}

export interface StrategyExecutionResponse {
  plan: StrategyExecutionPlan;
  canManage: boolean;
}

export interface StrategyExecutionYearsResponse {
  years: number[];
  canManage: boolean;
}

const BASE = '/strategy-execution';

function yearQuery(year: number) {
  return `?year=${encodeURIComponent(String(year))}`;
}

export async function apiGetStrategyYears() {
  return apiGetJson<StrategyExecutionYearsResponse>(`${BASE}/years`);
}

export async function apiGetStrategyExecution(year: number) {
  return apiGetJson<StrategyExecutionResponse>(`${BASE}${yearQuery(year)}`);
}

export async function apiUpdateStrategyExecution(
  year: number,
  payload: Partial<Pick<StrategyExecutionPlan, 'events' | 'pillars' | 'onePagePlan'>>
) {
  const result = await apiFetchJson<StrategyExecutionResponse>(`${BASE}${yearQuery(year)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  invalidateApiCache('/strategy-execution');
  return result;
}

export async function apiUpdateStrategyMonth(
  year: number,
  month: number,
  payload: {
    status?: StrategyEventStatus;
    notes?: string;
    purpose?: string;
    outcome?: string;
    whoAssignees?: StrategyWhoAssignee[];
  }
) {
  const result = await apiFetchJson<StrategyExecutionResponse>(
    `${BASE}/events/${month}${yearQuery(year)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
  invalidateApiCache('/strategy-execution');
  return result;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const PHASE_LABELS: Record<number, string> = {
  1: 'Review & Learn (Jan–Apr)',
  2: 'Plan, Experiment & People (May–Aug)',
  3: 'Approve, Budget & Communicate (Sep–Dec)',
};

export function progressPercent(events: StrategyCalendarEvent[]) {
  if (!events.length) return 0;
  const completed = events.filter((e) => e.status === 'completed').length;
  return Math.round((completed / events.length) * 100);
}
