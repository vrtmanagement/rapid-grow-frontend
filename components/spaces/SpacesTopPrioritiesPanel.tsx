import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';
import type { SpacesTask } from '../../types/spaces';
import {
  formatTopPriorityDateLabel,
  formatTopPriorityLabel,
  getTopPriorityCardClasses,
  getTopPriorityPillClasses,
  isCompletedPriorityStatus,
} from '../../utils/spaces/topPriority';

type SpacesTopPrioritiesPanelProps = Pick<
  SpacesViewController,
  'topPriorityTasks' | 'navigate' | 'canChangeStatus' | 'patchTask' | 'mode'
>;

const SpacesTopPrioritiesPanel: React.FC<SpacesTopPrioritiesPanelProps> = ({
  topPriorityTasks,
  navigate,
  canChangeStatus,
  patchTask,
  mode,
}) => {
  const [pendingCompletedTasks, setPendingCompletedTasks] = useState<
    Record<string, { task: SpacesTask; index: number }>
  >({});
  const removalTimeoutsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      Object.values(removalTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
      removalTimeoutsRef.current = {};
    };
  }, []);

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

  const handleTaskCheckboxChange = async (task: SpacesTask, checked: boolean, index: number) => {
    if (!canChangeStatus(task)) return;

    const targetStatus = checked ? (mode === 'employee' ? 'review' : 'done') : 'todo';
    clearRemovalTimeout(task.taskId);

    if (checked) {
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

    const updated = await patchTask(task.taskId, { status: checked ? 'done' : 'todo' });

    if (!updated || !checked) {
      setPendingCompletedTasks((prev) => {
        if (!prev[task.taskId]) return prev;
        const next = { ...prev };
        delete next[task.taskId];
        return next;
      });
      return;
    }

    removalTimeoutsRef.current[task.taskId] = window.setTimeout(() => {
      setPendingCompletedTasks((prev) => {
        if (!prev[task.taskId]) return prev;
        const next = { ...prev };
        delete next[task.taskId];
        return next;
      });
      delete removalTimeoutsRef.current[task.taskId];
    }, 1000);
  };

  return (
    <div className="order-1 flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Top Priorities</h4>
        </div>
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
          {completedTopPriorities}/{renderedTopPriorityTasks.length}
        </span>
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {renderedTopPriorityTasks.length > 0 ? (
          renderedTopPriorityTasks.map((task, index) => (
            <div
              key={task.taskId}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/spaces/task/${task.taskId}`)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                navigate(`/spaces/task/${task.taskId}`);
              }}
              className={`flex cursor-pointer items-start gap-2 rounded-2xl px-3 py-2 transition-colors ${getTopPriorityCardClasses(task, index)}`}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={isCompletedPriorityStatus(task.status)}
                aria-label={isCompletedPriorityStatus(task.status) ? 'Task completed' : 'Mark task complete'}
                disabled={!canChangeStatus(task) || !!pendingCompletedTasks[task.taskId]}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleTaskCheckboxChange(task, !isCompletedPriorityStatus(task.status), index);
                }}
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  isCompletedPriorityStatus(task.status)
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-400 bg-white text-transparent hover:border-slate-500'
                } ${canChangeStatus(task) ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} focus:outline-none focus:ring-2 focus:ring-emerald-200`}
              >
                <Check size={13} strokeWidth={3} />
              </button>
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate text-[12px] font-semibold leading-[1.1rem] ${isCompletedPriorityStatus(task.status) ? 'text-emerald-700 line-through decoration-2' : 'text-slate-800'}`}
                >
                  {task.title || 'Untitled task'}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getTopPriorityPillClasses('priority', task.priority)}`}>
                    {formatTopPriorityLabel(task.priority || 'medium')}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getTopPriorityPillClasses('status', task.status)}`}>
                    {formatTopPriorityLabel(task.status || 'todo')}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getTopPriorityPillClasses('date', task.dueDate)}`}>
                    {formatTopPriorityDateLabel(task.dueDate)}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[13px] text-slate-500">
            No active priorities available.
          </div>
        )}
      </div>
    </div>
  );
};

export default SpacesTopPrioritiesPanel;
