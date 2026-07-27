import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import { SPACES_TASKS_PAGE_SIZE } from '../../services/spacesApi';
import type { EmployeeOption, SpacesMode, SpacesTask, TaskFilterMode, TaskStatus } from '../../types/spaces';
import {
  buildTopPriorityTasksForAssignee,
  findScrollableContainer,
  isTaskAssignedToViewer,
  shouldHideAdminTaskFromViewer,
} from '../../views/spacesViewHelpers';
import {
  consumeSpacesTaskFocus,
  peekSpacesTaskFocus,
  spacesTaskRowElementId,
} from '../../utils/spaces/taskNavigation';

type LoggedInEmployee = { id: string; name: string; avatar: string; role?: string };

export interface UseSpacesFiltersParams {
  mode: SpacesMode;
  me: LoggedInEmployee;
  employeeById: Map<string, EmployeeOption>;
  assignableEmployees: EmployeeOption[];
  canUseAssigneeFilter: boolean;
  tasks: SpacesTask[];
  plannerTasks: SpacesTask[];
  taskListTotalPages: number;
  spacesLoading: boolean;
  taskHubRootRef: { current: HTMLDivElement | null };
  initialTaskFocus: ReturnType<typeof peekSpacesTaskFocus>;
  taskFilterMode: TaskFilterMode;
  setTaskFilterMode: (mode: TaskFilterMode) => void;
  taskAssigneeFilterId: string;
  setTaskAssigneeFilterId: Dispatch<SetStateAction<string>>;
  taskStatusFilter: TaskStatus | '';
  setTaskStatusFilter: (status: TaskStatus | '') => void;
  taskSearch: string;
  setTaskSearch: (search: string) => void;
  debouncedTaskSearch: string;
  taskPage: number;
  setTaskPage: Dispatch<SetStateAction<number>>;
  focusedTaskId: string;
  setFocusedTaskId: (id: string) => void;
}

/**
 * Owns the task views derived from filter/search state (visible/sorted/
 * top-priority lists), plus the focus + scroll effects that keep the task
 * list positioned correctly. Extracted from useSpacesViewController without
 * changing behavior.
 */
export const useSpacesFilters = ({
  mode,
  me,
  employeeById,
  assignableEmployees,
  canUseAssigneeFilter,
  tasks,
  plannerTasks,
  taskListTotalPages,
  spacesLoading,
  taskHubRootRef,
  initialTaskFocus,
  taskFilterMode,
  setTaskFilterMode,
  taskAssigneeFilterId,
  setTaskAssigneeFilterId,
  taskStatusFilter,
  setTaskStatusFilter,
  taskSearch,
  setTaskSearch,
  debouncedTaskSearch,
  taskPage,
  setTaskPage,
  focusedTaskId,
  setFocusedTaskId,
}: UseSpacesFiltersParams) => {
  const skipFilterPageResetRef = useRef(false);

  const teamMemberIds = useMemo(
    () => new Set(assignableEmployees.map((emp) => emp.empId)),
    [assignableEmployees],
  );

  const visibleTasks = useMemo(
    () => plannerTasks.filter((t) => !shouldHideAdminTaskFromViewer(t, me, employeeById, teamMemberIds)),
    [plannerTasks, me, employeeById, teamMemberIds],
  );

  const visibleListTasks = useMemo(
    () =>
      taskFilterMode === 'all'
        ? tasks
        : tasks.filter((t) => !shouldHideAdminTaskFromViewer(t, me, employeeById, teamMemberIds)),
    [tasks, me, employeeById, teamMemberIds, taskFilterMode],
  );

  const taskBelongsToMe = (task: SpacesTask) => isTaskAssignedToViewer(task, me.id);
  const taskAssigneeFilterOptions = useMemo(
    () =>
      assignableEmployees.map((employee) => ({
        value: employee.empId,
        label: employee.empId === me.id ? `${employee.empName} (You)` : employee.empName || 'Unknown User',
      })),
    [assignableEmployees, me.id],
  );

  useEffect(() => {
    if (!canUseAssigneeFilter || !me.id) return;
    setTaskAssigneeFilterId((current) => (current ? current : me.id));
  }, [canUseAssigneeFilter, me.id]);

  const filteredTasks = visibleListTasks;
  const sortedTasks = useMemo(() => {
    const statusRank = (status?: string) => {
      const value = String(status || 'todo').trim().toLowerCase();
      if (value === 'todo') return 0;
      if (value === 'doing') return 1;
      if (value === 'review') return 2;
      if (value === 'blocked') return 3;
      if (value === 'done') return 4;
      return 5;
    };
    // Keep incomplete/review tasks above done tasks even after local status patches.
    return [...filteredTasks].sort((left, right) => {
      const statusDiff = statusRank(left.status) - statusRank(right.status);
      if (statusDiff !== 0) return statusDiff;
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    });
  }, [filteredTasks]);

  const monthGoalSourceTasks = useMemo(() => {
    let list = visibleTasks;
    if (mode === 'employee' && me.id) {
      list = list.filter((task) => isTaskAssignedToViewer(task, me.id));
    } else if (canUseAssigneeFilter && taskAssigneeFilterId) {
      list = list.filter((task) => String(task.assigneeId || '').trim() === taskAssigneeFilterId);
    }
    return list;
  }, [visibleTasks, mode, me.id, canUseAssigneeFilter, taskAssigneeFilterId]);

  const topPriorityTasks = useMemo(() => {
    const assigneeTarget =
      canUseAssigneeFilter && taskAssigneeFilterId ? taskAssigneeFilterId : me.id;
    if (!assigneeTarget) return [];

    const mergedTasksById = new Map<string, SpacesTask>();
    for (const task of visibleTasks) {
      if (!task?.taskId) continue;
      mergedTasksById.set(task.taskId, task);
    }
    for (const task of visibleListTasks) {
      if (!task?.taskId) continue;
      mergedTasksById.set(task.taskId, task);
    }
    const mergedTasks = Array.from(mergedTasksById.values());

    const pool = mergedTasks.filter((task) => {
      if (canUseAssigneeFilter && taskAssigneeFilterId) {
        return String(task.assigneeId || '').trim() === taskAssigneeFilterId;
      }
      return taskBelongsToMe(task);
    });

    return buildTopPriorityTasksForAssignee(pool, assigneeTarget);
  }, [visibleTasks, visibleListTasks, me.id, taskBelongsToMe, canUseAssigneeFilter, taskAssigneeFilterId]);

  const TASKS_PER_PAGE = SPACES_TASKS_PAGE_SIZE;
  const totalTaskPages = taskListTotalPages;
  const paginatedTasks = sortedTasks;
  const visibleTaskPages = useMemo(() => {
    const radius = 2;
    const start = Math.max(1, taskPage - radius);
    const end = Math.min(totalTaskPages, taskPage + radius);
    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) pages.push(page);
    return pages;
  }, [taskPage, totalTaskPages]);

  const filterPageResetReadyRef = useRef(false);
  useEffect(() => {
    if (!filterPageResetReadyRef.current) {
      filterPageResetReadyRef.current = true;
      if (skipFilterPageResetRef.current || initialTaskFocus?.taskId) {
        skipFilterPageResetRef.current = false;
        return;
      }
      return;
    }
    if (skipFilterPageResetRef.current) {
      skipFilterPageResetRef.current = false;
      return;
    }
    setTaskPage(1);
  }, [taskFilterMode, taskStatusFilter, debouncedTaskSearch, taskAssigneeFilterId, mode]);

  useEffect(() => {
    setTaskPage((prev) => Math.min(prev, totalTaskPages));
  }, [totalTaskPages]);

  useEffect(() => {
    // Restore focus target when returning from task detail (filters/page seeded from session).
    const focus = consumeSpacesTaskFocus();
    if (!focus?.taskId) return;
    skipFilterPageResetRef.current = true;
    setFocusedTaskId(focus.taskId);
    if (Number(focus.page) > 0) {
      setTaskPage(Number(focus.page));
    }
    if (focus.filterMode) {
      setTaskFilterMode(focus.filterMode);
    }
    if (focus.statusFilter !== undefined) {
      setTaskStatusFilter(focus.statusFilter);
    }
    if (focus.search !== undefined) {
      setTaskSearch(focus.search);
    }
  }, []);

  useEffect(() => {
    if (!focusedTaskId || spacesLoading) return;
    const row = document.getElementById(spacesTaskRowElementId(focusedTaskId));
    if (!row) {
      const missTimer = window.setTimeout(() => setFocusedTaskId(''), 3000);
      return () => window.clearTimeout(missTimer);
    }

    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const clearFocusTimer = window.setTimeout(() => setFocusedTaskId(''), 2200);
    return () => window.clearTimeout(clearFocusTimer);
  }, [focusedTaskId, spacesLoading, paginatedTasks, taskPage, taskFilterMode, taskStatusFilter, debouncedTaskSearch]);

  useEffect(() => {
    // Only reset on portal mode changes — never after returning to a focused task row.
    if (peekSpacesTaskFocus()?.taskId || focusedTaskId) return;
    const runScrollReset = () => {
      const scrollContainer = findScrollableContainer(taskHubRootRef.current);
      if (scrollContainer === window) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
      }
    };

    runScrollReset();
    const rafId = window.requestAnimationFrame(runScrollReset);
    return () => window.cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return {
    teamMemberIds,
    visibleTasks,
    visibleListTasks,
    taskBelongsToMe,
    taskAssigneeFilterOptions,
    sortedTasks,
    monthGoalSourceTasks,
    topPriorityTasks,
    TASKS_PER_PAGE,
    totalTaskPages,
    paginatedTasks,
    visibleTaskPages,
  };
};
