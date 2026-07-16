import type { SpacesTask, TaskFilterMode, TaskStatus } from '../../types/spaces';

const FOCUS_KEY = 'rapidgrow:spaces-task-focus';

export type SpacesTaskReturnContext = {
  page?: number;
  filterMode?: TaskFilterMode;
  statusFilter?: TaskStatus | '';
  search?: string;
  scrollTop?: number;
};

export type SpacesTaskFocus = {
  taskId: string;
} & SpacesTaskReturnContext;

function normalizeReturnContext(context: SpacesTaskReturnContext = {}): SpacesTaskReturnContext {
  return {
    page: Number(context.page) > 0 ? Number(context.page) : undefined,
    filterMode: context.filterMode === 'all' || context.filterMode === 'assigned' || context.filterMode === 'me'
      ? context.filterMode
      : undefined,
    statusFilter:
      context.statusFilter === 'todo' ||
      context.statusFilter === 'doing' ||
      context.statusFilter === 'review' ||
      context.statusFilter === 'done' ||
      context.statusFilter === 'blocked'
        ? context.statusFilter
        : context.statusFilter === ''
          ? ''
          : undefined,
    search: typeof context.search === 'string' ? context.search : undefined,
    scrollTop: typeof context.scrollTop === 'number' ? context.scrollTop : undefined,
  };
}

export function rememberSpacesTaskFocus(focus: SpacesTaskFocus) {
  const taskId = String(focus.taskId || '').trim();
  if (!taskId || typeof window === 'undefined') return;
  try {
    const normalized = normalizeReturnContext(focus);
    sessionStorage.setItem(
      FOCUS_KEY,
      JSON.stringify({
        taskId,
        ...normalized,
      } satisfies SpacesTaskFocus),
    );
  } catch {
    // Ignore storage failures (private mode / quota).
  }
}

export function peekSpacesTaskFocus(): SpacesTaskFocus | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(FOCUS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpacesTaskFocus;
    const taskId = String(parsed?.taskId || '').trim();
    if (!taskId) return null;
    return {
      taskId,
      ...normalizeReturnContext(parsed),
    };
  } catch {
    return null;
  }
}

export function consumeSpacesTaskFocus(): SpacesTaskFocus | null {
  const focus = peekSpacesTaskFocus();
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(FOCUS_KEY);
    } catch {
      // ignore
    }
  }
  return focus;
}

export function spacesTaskRowElementId(taskId: string) {
  return `spaces-task-row-${String(taskId || '').trim()}`;
}

export function openSpacesTaskDetail(
  navigate: (to: string, options?: { state?: unknown }) => void,
  task: Pick<SpacesTask, 'taskId'> & Partial<SpacesTask>,
  options?: SpacesTaskReturnContext & { scrollContainer?: HTMLElement | Window | null },
) {
  const taskId = String(task.taskId || '').trim();
  if (!taskId) return;

  let scrollTop: number | undefined;
  const container = options?.scrollContainer;
  if (container === window) {
    scrollTop = window.scrollY;
  } else if (container && 'scrollTop' in container) {
    scrollTop = container.scrollTop;
  }

  const returnContext = normalizeReturnContext({
    page: options?.page,
    filterMode: options?.filterMode,
    statusFilter: options?.statusFilter,
    search: options?.search,
    scrollTop,
  });

  rememberSpacesTaskFocus({
    taskId,
    ...returnContext,
  });

  navigate(`/spaces/task/${encodeURIComponent(taskId)}`, {
    state: { task, spacesReturn: returnContext },
  });
}

/** Prefetch the task detail chunk so the first click feels instant. */
export function prefetchSpacesTaskDetailView() {
  void import('../../views/SpacesTaskDetailView');
}
