import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, Columns3, List, Loader2, Plus, Table2 } from 'lucide-react';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';
import type { SpacesTask, TaskStatus } from '../../types/spaces';
import { fetchSpacesList } from '../../services/spacesApi';
import { isTaskAssignedToViewer, normalizeTaskForUi } from '../../views/spacesViewHelpers';
import { openSpacesTaskDetail } from '../../utils/spaces/taskNavigation';
import { getDisplayAvatarUrl } from '../../utils/avatar';
import SpacesPersonalCalendar from './SpacesPersonalCalendar';
import {
  DueDateIcon,
  PERSONAL_STATUS_OPTIONS,
  PERSONAL_TASK_VIEW_KEY,
  PriorityIcon,
  STATUS_META,
  StatusIcon,
  TaskTypeIcon,
} from './personalTaskViewIcons';
import './spacesPersonalViews.css';

export type PersonalTaskView = 'list' | 'board' | 'table' | 'calendar';

type PersonalViewsCacheEntry = { tasks: SpacesTask[] };

const personalViewsCache = new Map<string, PersonalViewsCacheEntry>();

function personalViewsCacheKey(meId: string, mode: string, statusFilter: string, search: string) {
  return `${meId}|${mode}|${statusFilter}|${search.trim().toLowerCase()}`;
}

function readPersonalViewsCache(key: string) {
  return personalViewsCache.get(key)?.tasks || null;
}

function writePersonalViewsCache(key: string, tasks: SpacesTask[]) {
  personalViewsCache.set(key, { tasks });
}

const views = [
  { id: 'list', label: 'List', icon: List, iconClass: 'text-sky-600', activeClass: 'bg-white text-sky-800 shadow-sm' },
  { id: 'board', label: 'Board', icon: Columns3, iconClass: 'text-violet-600', activeClass: 'bg-white text-violet-800 shadow-sm' },
  { id: 'table', label: 'Table', icon: Table2, iconClass: 'text-emerald-600', activeClass: 'bg-white text-emerald-800 shadow-sm' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, iconClass: 'text-amber-600', activeClass: 'bg-white text-amber-800 shadow-sm' },
] as const;

const groups = PERSONAL_STATUS_OPTIONS.map(({ status }) => ({
  status,
  ...STATUS_META[status],
}));

const LIST_STATUS_OPTIONS = PERSONAL_STATUS_OPTIONS;

function nextListStatus(status: TaskStatus): TaskStatus {
  const order = LIST_STATUS_OPTIONS.map((option) => option.status);
  const index = order.indexOf(status);
  return order[(index + 1) % order.length] || 'todo';
}

export function readStoredPersonalView(fallback: PersonalTaskView = 'table'): PersonalTaskView {
  try {
    const value = localStorage.getItem(PERSONAL_TASK_VIEW_KEY);
    if (value === 'list' || value === 'board' || value === 'table' || value === 'calendar') return value;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function storePersonalView(view: PersonalTaskView) {
  try {
    localStorage.setItem(PERSONAL_TASK_VIEW_KEY, view);
  } catch {
    /* ignore */
  }
}

export function PersonalViewSwitcher({
  value,
  onChange,
}: {
  value: PersonalTaskView;
  onChange: (view: PersonalTaskView) => void;
}) {
  return (
    <div role="group" aria-label="My task view" className="flex shrink-0 flex-wrap items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 p-1">
      {views.map(({ id, label, icon: Icon, iconClass, activeClass }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
            value === id ? activeClass : 'text-slate-700 hover:bg-white hover:text-slate-900'
          }`}
        >
          <Icon size={14} className={iconClass} strokeWidth={2.25} />
          {label}
        </button>
      ))}
    </div>
  );
}

export default function SpacesPersonalViews({
  view,
  controller: c,
}: {
  view: Exclude<PersonalTaskView, 'table'>;
  controller: SpacesViewController;
}) {
  const cacheKey = personalViewsCacheKey(c.me.id, c.mode, c.taskStatusFilter || '', c.taskSearch);
  const cachedTasks = readPersonalViewsCache(cacheKey);
  const [tasks, setTasks] = useState<SpacesTask[]>(() => cachedTasks || []);
  const [loading, setLoading] = useState(() => !cachedTasks);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<TaskStatus | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const dragMoved = useRef(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const forceReloadRef = useRef(false);
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;

  useEffect(() => {
    if (!statusMenuId) return;
    const onPointerDown = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuId(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStatusMenuId(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [statusMenuId]);

  useEffect(() => {
    let cancelled = false;
    const force = forceReloadRef.current;
    forceReloadRef.current = false;
    const cached = readPersonalViewsCache(cacheKey);

    if (cached && !force) {
      setTasks(cached);
      setLoading(false);
      setError('');
      return;
    }

    if (!cached) {
      setTasks([]);
      setLoading(true);
    } else {
      setTasks(cached);
      setLoading(false);
    }
    setError('');

    const timer = window.setTimeout(async () => {
      try {
        const result: SpacesTask[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const response = await fetchSpacesList(
            {
              page,
              limit: 250,
              filter: 'me',
              status: c.taskStatusFilter || undefined,
              search: c.taskSearch.trim() || undefined,
              mode: c.mode,
              scope: 'list',
              sync: '0',
            },
            { force: force || !cached },
          );
          if (cancelled) return;
          result.push(...(response.tasks || []).map(normalizeTaskForUi));
          totalPages = Math.max(1, Number(response.totalPages || 1));
          page++;
        } while (page <= totalPages);
        const nextTasks = Array.from(
          new Map(
            result
              .filter((task) => isTaskAssignedToViewer(task, c.me.id))
              .map((task) => [task.taskId, task]),
          ).values(),
        );
        writePersonalViewsCache(cacheKey, nextTasks);
        setTasks(nextTasks);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load your tasks.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, cached && force ? 0 : 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cacheKey, c.me.id, c.mode, c.taskStatusFilter, c.taskSearch, reloadToken]);

  useEffect(() => {
    const mine = (c.tasks || [])
      .filter((task) => isTaskAssignedToViewer(task, c.me.id))
      .map(normalizeTaskForUi);
    if (!mine.length) return;
    setTasks((prev) => {
      const next = new Map(prev.map((task) => [task.taskId, task]));
      let changed = false;
      for (const task of mine) {
        const existing = next.get(task.taskId);
        if (!existing) {
          next.set(task.taskId, task);
          changed = true;
          continue;
        }
        if (
          existing.status !== task.status ||
          existing.title !== task.title ||
          existing.priority !== task.priority ||
          existing.dueDate !== task.dueDate ||
          existing.assigneeName !== task.assigneeName
        ) {
          next.set(task.taskId, { ...existing, ...task });
          changed = true;
        }
      }
      if (!changed) return prev;
      const tasksNext = Array.from(next.values());
      writePersonalViewsCache(cacheKeyRef.current, tasksNext);
      return tasksNext;
    });
  }, [c.tasks, c.me.id]);

  const open = (task: SpacesTask) =>
    openSpacesTaskDetail(c.navigate, task, {
      page: c.taskPage,
      filterMode: 'me',
      statusFilter: c.taskStatusFilter,
      search: c.taskSearch,
    });

  const dueLabel = (task: SpacesTask) => {
    if (!task.dueDate) return '';
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? `${task.dueDate}T00:00:00` : task.dueDate);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const moveTask = async (taskId: string, status: TaskStatus) => {
    const current = tasks.find((task) => task.taskId === taskId);
    if (!current || current.status === status) return;
    setTasks((prev) => {
      const next = prev.map((task) => (task.taskId === taskId ? { ...task, status } : task));
      writePersonalViewsCache(cacheKeyRef.current, next);
      return next;
    });
    const ok = await c.patchTask(taskId, { status });
    if (!ok) {
      setTasks((prev) => {
        const next = prev.map((task) => (task.taskId === taskId ? current : task));
        writePersonalViewsCache(cacheKeyRef.current, next);
        return next;
      });
    }
  };

  const resolveAssigneeAvatar = (task: SpacesTask) => {
    const assigneeId = String(task.assigneeId || '').trim();
    const assigneeName = task.assigneeName || c.me.name || 'Me';
    const fromEmployees = (c.assignableEmployees || []).find((employee) => employee.empId === assigneeId);
    const avatar =
      (assigneeId && assigneeId === c.me.id ? c.me.avatar : undefined) ||
      fromEmployees?.avatar ||
      '';
    return {
      name: fromEmployees?.empName || assigneeName,
      src: getDisplayAvatarUrl(avatar, fromEmployees?.empName || assigneeName),
    };
  };

  const priorityClass = (priority: SpacesTask['priority']) =>
    priority === 'high'
      ? 'bg-rose-50 text-rose-700'
      : priority === 'medium'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-slate-100 text-slate-500';

  const boardDragProps = (task: SpacesTask) => ({
    draggable: true as const,
    onDragStart: (event: React.DragEvent<HTMLButtonElement>) => {
      dragMoved.current = false;
      setDraggingId(task.taskId);
      event.dataTransfer.setData('text/task-id', task.taskId);
      event.dataTransfer.effectAllowed = 'move';
    },
    onDrag: () => {
      dragMoved.current = true;
    },
    onDragEnd: () => {
      setDraggingId(null);
      setDropStatus(null);
    },
    onClick: () => {
      if (dragMoved.current) {
        dragMoved.current = false;
        return;
      }
      open(task);
    },
  });

  const columnDropProps = (status: TaskStatus) => ({
    onDragOver: (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDropStatus(status);
    },
    onDragLeave: () => {
      setDropStatus((current) => (current === status ? null : current));
    },
    onDrop: (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      const taskId = event.dataTransfer.getData('text/task-id') || draggingId;
      setDropStatus(null);
      setDraggingId(null);
      if (taskId) void moveTask(taskId, status);
    },
  });

  return (
    <div className={`spaces-personal-views ${view === 'board' ? 'space-y-2' : 'space-y-3'}`}>
      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
        <span>{loading ? 'Loading your tasks…' : `${tasks.length} matching tasks`}</span>
        <button
          className="personal-view-button"
          disabled={loading}
          onClick={() => {
            forceReloadRef.current = true;
            setReloadToken((n) => n + 1);
          }}
        >
          Refresh tasks
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          {error} Use Refresh tasks to retry.
        </p>
      )}

      {loading && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Loading your tasks…
        </p>
      )}

      {!loading && view === 'calendar' && <SpacesPersonalCalendar tasks={tasks} onOpen={open} />}

      {!loading && !error && view === 'board' && (
        <div className="spaces-personal-board">
          {groups.map((group) => {
            const items = tasks.filter((task) => task.status === group.status);
            const isDropTarget = dropStatus === group.status;
            return (
              <section
                key={group.status}
                className={`personal-board-column ${group.boardColumn} ${isDropTarget ? 'is-drop' : ''}`}
                {...columnDropProps(group.status)}
              >
                <div className="personal-board-column-header">
                  <span className={`personal-board-status-pill ${group.boardHeader}`}>
                    <StatusIcon status={group.status} size={12} className={group.status === 'todo' ? undefined : 'text-current'} />
                    {group.name}
                  </span>
                  <span className="personal-board-count">{items.length}</span>
                </div>

                <div className="personal-board-column-body">
                  {items.map((task) => {
                    const assignee = resolveAssigneeAvatar(task);
                    const due = dueLabel(task);
                    return (
                      <button
                        key={task.taskId}
                        type="button"
                        className={`personal-board-card ${draggingId === task.taskId ? 'is-dragging' : ''}`}
                        {...boardDragProps(task)}
                      >
                        <span className="personal-board-card-title">{task.title}</span>
                        <span className="personal-board-card-meta">
                          <img
                            src={assignee.src}
                            alt={assignee.name}
                            title={assignee.name}
                            className="personal-board-avatar"
                          />
                          <span className="personal-board-meta-item due">
                            <DueDateIcon size={12} className="personal-board-meta-icon" />
                            <span className="personal-board-meta-text">{due || '—'}</span>
                          </span>
                          <span className="personal-board-meta-item capitalize">
                            <PriorityIcon priority={task.priority} size={12} className="personal-board-meta-icon" />
                            <span className="personal-board-meta-text">{task.priority}</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {!items.length && <p className="personal-board-empty">No tasks</p>}
                </div>

                <button
                  type="button"
                  className={`personal-board-add ${group.boardAdd}`}
                  onClick={() => c.openTaskCreateModal?.()}
                >
                  <Plus size={14} />
                  Add Task
                </button>
              </section>
            );
          })}
        </div>
      )}

      {!loading && !error && view === 'list' && (
        <div className="space-y-4">
          {groups.map((group) => {
            const items = tasks.filter((task) => task.status === group.status);
            return (
              <section
                key={group.status}
                className={`relative min-w-0 rounded-xl border border-slate-200 bg-white ${
                  items.some((task) => statusMenuId === task.taskId) ? 'z-30' : 'z-0'
                }`}
              >
                <h3 className="flex items-center gap-2 p-3 text-xs font-semibold">
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 ${group.color}`}>
                    <StatusIcon status={group.status} size={12} />
                    {group.name}
                  </span>
                  <span className="text-slate-400">{items.length}</span>
                </h3>

                {items.length > 0 && (
                  <div className="hidden grid-cols-[minmax(0,1fr)_140px_90px_80px] gap-4 border-y border-slate-100 bg-slate-50/70 px-5 py-2 text-xs text-slate-400 md:grid">
                    <span>Name</span>
                    <span>Assignee</span>
                    <span>Due date</span>
                    <span>Priority</span>
                  </div>
                )}

                {items.map((task) => {
                  const canEditStatus = c.canChangeStatus?.(task) !== false;
                  const menuOpen = statusMenuId === task.taskId;
                  return (
                    <div
                      key={task.taskId}
                      className="grid w-full grid-cols-1 items-center gap-2 border-b border-slate-100 px-5 py-3 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_140px_90px_80px] md:gap-4"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <div className={`relative mt-0.5 shrink-0 ${menuOpen ? 'z-50' : ''}`} ref={menuOpen ? statusMenuRef : undefined}>
                          <button
                            type="button"
                            disabled={!canEditStatus}
                            title={canEditStatus ? 'Change status' : 'Status locked'}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            aria-label={`Status: ${STATUS_META[task.status]?.name || task.status}. Click to change`}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!canEditStatus) return;
                              setStatusMenuId((current) => (current === task.taskId ? null : task.taskId));
                            }}
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              if (!canEditStatus) return;
                              setStatusMenuId(null);
                              void moveTask(task.taskId, nextListStatus(task.status));
                            }}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent transition ${
                              canEditStatus
                                ? 'hover:border-slate-200 hover:bg-white hover:shadow-sm'
                                : 'cursor-not-allowed opacity-60'
                            }`}
                          >
                            <StatusIcon status={task.status} size={15} />
                          </button>
                          {menuOpen && (
                            <div role="menu" className="personal-status-popover">
                              <span className="personal-status-popover-tail" aria-hidden />
                              {LIST_STATUS_OPTIONS.map((option) => (
                                <button
                                  key={option.status}
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={task.status === option.status}
                                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition ${
                                    task.status === option.status
                                      ? 'bg-slate-100 text-slate-900'
                                      : 'text-slate-600 hover:bg-slate-50'
                                  }`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setStatusMenuId(null);
                                    if (option.status !== task.status) void moveTask(task.taskId, option.status);
                                  }}
                                >
                                  <StatusIcon status={option.status} size={14} />
                                  {option.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => open(task)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="flex min-w-0 items-start gap-2">
                            <TaskTypeIcon size={14} className="mt-0.5 shrink-0 text-slate-400" />
                            <span className="block min-w-0 break-words text-sm font-medium text-slate-800">{task.title}</span>
                          </span>
                        </button>
                      </div>
                      <button type="button" onClick={() => open(task)} className="block truncate text-left text-xs text-slate-500">
                        {task.assigneeName || c.me.name || 'Me'}
                      </button>
                      <button type="button" onClick={() => open(task)} className="block text-left text-xs text-slate-500">
                        {dueLabel(task) || 'No due date'}
                      </button>
                      <button
                        type="button"
                        onClick={() => open(task)}
                        className={`inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-[11px] capitalize ${priorityClass(task.priority)}`}
                      >
                        <PriorityIcon priority={task.priority} size={11} />
                        {task.priority}
                      </button>
                    </div>
                  );
                })}

                {!items.length && <p className="px-3 py-6 text-center text-xs text-slate-400">No tasks</p>}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
