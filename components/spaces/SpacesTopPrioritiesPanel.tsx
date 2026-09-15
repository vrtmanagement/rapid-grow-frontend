import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';
import type { SpacesTask, TaskStatus } from '../../types/spaces';
import {
  formatTopPriorityDateLabel,
  formatTopPriorityLabel,
  getTopPriorityCardClasses,
  getTopPriorityPillClasses,
  isCompletedPriorityStatus,
} from '../../utils/spaces/topPriority';
import { openSpacesTaskDetail, prefetchSpacesTaskDetailView } from '../../utils/spaces/taskNavigation';
import { PERSONAL_STATUS_OPTIONS, STATUS_META, StatusIcon } from './personalTaskViewIcons';
import './spacesPersonalViews.css';

type SpacesTopPrioritiesPanelProps = Pick<
  SpacesViewController,
  | 'topPriorityTasks'
  | 'navigate'
  | 'canChangeStatus'
  | 'patchTask'
  | 'mode'
  | 'taskPage'
  | 'taskFilterMode'
  | 'taskStatusFilter'
  | 'taskSearch'
>;

const SpacesTopPrioritiesPanel: React.FC<SpacesTopPrioritiesPanelProps> = ({
  topPriorityTasks,
  navigate,
  canChangeStatus,
  patchTask,
  mode,
  taskPage,
  taskFilterMode,
  taskStatusFilter,
  taskSearch,
}) => {
  const [pendingCompletedTasks, setPendingCompletedTasks] = useState<
    Record<string, { task: SpacesTask; index: number }>
  >({});
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const removalTimeoutsRef = useRef<Record<string, number>>({});
  const statusMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      Object.values(removalTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
      removalTimeoutsRef.current = {};
    };
  }, []);

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

  const renderedTopPriorityTasks = useMemo(() => {
    const next = [...topPriorityTasks];
    const visibleIds = new Set(topPriorityTasks.map((task) => task.taskId));

    Object.values(pendingCompletedTasks).forEach(({ task, index }) => {
      if (visibleIds.has(task.taskId)) return;
      const insertAt = Math.min(Math.max(index, 0), next.length);
      next.splice(insertAt, 0, task);
    });

    return next;
  }, [pendingCompletedTasks, topPriorityTasks]);

  const completedTopPriorities = renderedTopPriorityTasks.filter((task) => isCompletedPriorityStatus(task.status)).length;

  const clearRemovalTimeout = (taskId: string) => {
    const existingTimeout = removalTimeoutsRef.current[taskId];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
      delete removalTimeoutsRef.current[taskId];
    }
  };

  const handleStatusSelect = async (task: SpacesTask, status: TaskStatus, index: number) => {
    if (!canChangeStatus(task) || task.status === status) return;
    setStatusMenuId(null);
    clearRemovalTimeout(task.taskId);

    const completed = isCompletedPriorityStatus(status);
    if (completed) {
      const targetStatus = mode === 'employee' && status === 'done' ? 'review' : status;
      setPendingCompletedTasks((prev) => ({
        ...prev,
        [task.taskId]: {
          task: { ...task, status: targetStatus },
          index,
        },
      }));
    } else {
      setPendingCompletedTasks((prev) => {
        if (!prev[task.taskId]) return prev;
        const next = { ...prev };
        delete next[task.taskId];
        return next;
      });
    }

    const updated = await patchTask(task.taskId, { status });

    if (!updated) {
      setPendingCompletedTasks((prev) => {
        if (!prev[task.taskId]) return prev;
        const next = { ...prev };
        delete next[task.taskId];
        return next;
      });
      return;
    }

    if (completed) {
      removalTimeoutsRef.current[task.taskId] = window.setTimeout(() => {
        setPendingCompletedTasks((prev) => {
          if (!prev[task.taskId]) return prev;
          const next = { ...prev };
          delete next[task.taskId];
          return next;
        });
        delete removalTimeoutsRef.current[task.taskId];
      }, 1000);
    }
  };

  return (
    <div className="mt-5 flex min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold tracking-tight text-slate-900">Top Priorities</h4>
          <p className="mt-0.5 text-[12px] text-slate-500">Your highest-impact work right now</p>
        </div>
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
          {completedTopPriorities}/{renderedTopPriorityTasks.length}
        </span>
      </div>
      <div className="mt-4 grid max-h-[340px] min-h-0 grid-cols-1 gap-3 overflow-visible pr-1 sm:grid-cols-2 xl:grid-cols-3">
        {renderedTopPriorityTasks.length > 0 ? (
          renderedTopPriorityTasks.map((task, index) => {
            const menuOpen = statusMenuId === task.taskId;
            const canEditStatus = canChangeStatus(task) && !pendingCompletedTasks[task.taskId];
            return (
              <div
                key={task.taskId}
                role="button"
                tabIndex={0}
                onMouseEnter={() => prefetchSpacesTaskDetailView()}
                onClick={() =>
                  openSpacesTaskDetail(navigate, task, {
                    page: taskPage,
                    filterMode: taskFilterMode,
                    statusFilter: taskStatusFilter,
                    search: taskSearch,
                  })
                }
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  openSpacesTaskDetail(navigate, task, {
                    page: taskPage,
                    filterMode: taskFilterMode,
                    statusFilter: taskStatusFilter,
                    search: taskSearch,
                  });
                }}
                className={`relative flex min-w-0 cursor-pointer items-start gap-3 rounded-xl px-4 py-3.5 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${
                  menuOpen ? 'z-40' : 'z-0'
                } ${getTopPriorityCardClasses(task, index)}`}
              >
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
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent transition ${
                      canEditStatus
                        ? 'hover:border-slate-200 hover:bg-white hover:shadow-sm'
                        : 'cursor-not-allowed opacity-60'
                    }`}
                  >
                    <StatusIcon status={task.status} size={16} />
                  </button>
                  {menuOpen && (
                    <div role="menu" className="personal-status-popover" onClick={(event) => event.stopPropagation()}>
                      <span className="personal-status-popover-tail" aria-hidden />
                      {PERSONAL_STATUS_OPTIONS.map((option) => (
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
                            void handleStatusSelect(task, option.status, index);
                          }}
                        >
                          <StatusIcon status={option.status} size={14} />
                          {option.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[13px] font-semibold leading-5 ${
                      isCompletedPriorityStatus(task.status)
                        ? 'text-emerald-700 line-through decoration-2'
                        : 'text-slate-800'
                    }`}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {task.title || 'Untitled task'}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${getTopPriorityPillClasses('priority', task.priority)}`}>
                      {formatTopPriorityLabel(task.priority || 'medium')}
                    </span>
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${getTopPriorityPillClasses('status', task.status)}`}>
                      {formatTopPriorityLabel(task.status || 'todo')}
                    </span>
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${getTopPriorityPillClasses('date', task.dueDate)}`}>
                      {formatTopPriorityDateLabel(task.dueDate)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full flex min-h-[88px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-[13px] text-slate-500">
            No active priorities available.
          </div>
        )}
      </div>
    </div>
  );
};

export default SpacesTopPrioritiesPanel;
