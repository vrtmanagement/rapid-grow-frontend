import { useMemo, useState } from 'react';
import { useDebounce } from '../useDebounce';
import type { TaskFilterMode, TaskStatus } from '../../types/spaces';
import { peekSpacesTaskFocus } from '../../utils/spaces/taskNavigation';

/**
 * Owns the raw Spaces task filter/search/pagination state. Split out from
 * useSpacesFilters so it can be read before the data bootstrap hook (which
 * needs these values to build its list query) without a circular dependency.
 * Extracted from useSpacesViewController without changing behavior.
 */
export const useSpacesFilterState = () => {
  const initialTaskFocus = useMemo(() => peekSpacesTaskFocus(), []);
  const [taskFilterMode, setTaskFilterMode] = useState<TaskFilterMode>(
    () => initialTaskFocus?.filterMode || 'me',
  );
  const [taskAssigneeFilterId, setTaskAssigneeFilterId] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | ''>(
    () => initialTaskFocus?.statusFilter ?? '',
  );
  const [taskSearch, setTaskSearch] = useState(() => initialTaskFocus?.search || '');
  const debouncedTaskSearch = useDebounce(taskSearch.trim(), 250);
  const [taskPage, setTaskPage] = useState(() =>
    Number(initialTaskFocus?.page) > 0 ? Number(initialTaskFocus.page) : 1,
  );
  const [focusedTaskId, setFocusedTaskId] = useState(() => String(initialTaskFocus?.taskId || ''));

  return {
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
  };
};
