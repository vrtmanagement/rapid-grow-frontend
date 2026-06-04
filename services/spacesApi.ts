import { apiGetJson } from '../config/api';
import type { SpacesColumn, SpacesTask } from '../views/spacesViewHelpers';

export const SPACES_TASKS_PAGE_SIZE = 15;
export const COMMAND_MATRIX_TASK_LIMIT = 25;
export const SPACES_PLANNER_FETCH_LIMIT = 250;

export interface SpacesTaskStats {
  total: number;
  completed: number;
  open: number;
  highPriority: number;
  completionPercent: number;
}

export interface SpacesListResponse {
  columns?: SpacesColumn[];
  tasks?: SpacesTask[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  stats?: SpacesTaskStats;
}

export interface SpacesCommandMatrixResponse {
  columns?: SpacesColumn[];
  tasks?: SpacesTask[];
  totalActive?: number;
  limit?: number;
  hasMore?: boolean;
}

export interface SpacesStatsResponse {
  columns?: SpacesColumn[];
  stats?: SpacesTaskStats;
  total?: number;
}

export type SpacesListQuery = {
  page?: number;
  limit?: number;
  filter?: 'me' | 'assigned' | 'all';
  status?: string;
  search?: string;
  assigneeId?: string;
  mode?: 'manager' | 'employee';
  scope?: 'list' | 'planner' | 'command-matrix';
  sync?: '0' | '1';
};

function buildSpacesQueryString(query: SpacesListQuery = {}): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export async function fetchSpacesList(
  query: SpacesListQuery = {},
  options?: { force?: boolean },
): Promise<SpacesListResponse> {
  return apiGetJson<SpacesListResponse>(`/spaces${buildSpacesQueryString(query)}`, {}, options);
}

export async function fetchSpacesStats(options?: { force?: boolean }): Promise<SpacesStatsResponse> {
  return apiGetJson<SpacesStatsResponse>('/spaces?statsOnly=1&sync=0', {}, options);
}

export async function fetchCommandMatrixTasks(
  limit = COMMAND_MATRIX_TASK_LIMIT,
  options?: { force?: boolean },
): Promise<SpacesCommandMatrixResponse> {
  return apiGetJson<SpacesCommandMatrixResponse>(
    `/spaces?scope=command-matrix&limit=${limit}&sync=0`,
    {},
    options,
  );
}
