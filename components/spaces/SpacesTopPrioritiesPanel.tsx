import React from 'react';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';
import {
  formatTopPriorityDateLabel,
  formatTopPriorityLabel,
  getTopPriorityCardClasses,
  getTopPriorityPillClasses,
  isCompletedPriorityStatus,
} from '../../utils/spaces/topPriority';

type SpacesTopPrioritiesPanelProps = Pick<
  SpacesViewController,
  'topPriorityTasks' | 'navigate' | 'canChangeStatus' | 'patchTask'
>;

const SpacesTopPrioritiesPanel: React.FC<SpacesTopPrioritiesPanelProps> = ({
  topPriorityTasks,
  navigate,
  canChangeStatus,
  patchTask,
}) => {
  const completedTopPriorities = topPriorityTasks.filter((task) => isCompletedPriorityStatus(task.status)).length;

  return (
    <div className="order-1 flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Top Priorities</h4>
        </div>
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
          {completedTopPriorities}/{topPriorityTasks.length}
        </span>
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {topPriorityTasks.length > 0 ? (
          topPriorityTasks.map((task, index) => (
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
              <input
                type="checkbox"
                checked={isCompletedPriorityStatus(task.status)}
                disabled={!canChangeStatus(task)}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => patchTask(task.taskId, { status: event.target.checked ? 'done' : 'todo' })}
                className={`mt-0.5 h-3 w-3 ${isCompletedPriorityStatus(task.status) ? 'accent-emerald-600' : ''} ${canChangeStatus(task) ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              />
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
