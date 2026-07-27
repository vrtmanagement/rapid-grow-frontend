import React from 'react';
import { CheckCheck, MoreVertical, Pencil, Plus, Trash2, UsersRound } from 'lucide-react';
import { ProjectTeamHierarchy, ProjectStatus } from '../../types';
import ProgressBar from './ProgressBar';
import TeamHierarchy from './TeamHierarchy';
import { getProjectStatusLabel, ProjectTaskMetrics } from './projectCharterUtils';
import {
  ProjectLinkedTask,
  getTaskKey,
  getTaskStatusClasses,
  getTaskStatusLabel,
} from './projectDetailsTypes';

interface ProjectDetailsDeliveryPanelProps {
  team?: ProjectTeamHierarchy;
  canCreateTask: boolean;
  onAddTask: () => void;
  isTaskDataLoading: boolean;
  taskMetrics: ProjectTaskMetrics;
  projectManagerName: string;
  leadPodsCount: number;
  projectStatus: ProjectStatus;
  assignedProjectTasks: ProjectLinkedTask[];
  assigneeNameById: Map<string, string>;
  taskActionError: string | null;
  editingTask: ProjectLinkedTask | null;
  deleteTaskTarget: ProjectLinkedTask | null;
  activeTaskMenuId: string | null;
  setActiveTaskMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  taskPendingId: string | null;
  canEditAssignedTask: (task: ProjectLinkedTask) => boolean;
  canDeleteAssignedTask: (task: ProjectLinkedTask) => boolean;
  canToggleAssignedTask: (task: ProjectLinkedTask) => boolean;
  onToggleDone: (task: ProjectLinkedTask, done: boolean) => void;
  onOpenEdit: (task: ProjectLinkedTask) => void;
  onRequestDelete: (task: ProjectLinkedTask) => void;
  setTaskActionError: (error: string | null) => void;
}

export const ProjectDetailsDeliveryPanel: React.FC<ProjectDetailsDeliveryPanelProps> = ({
  team,
  canCreateTask,
  onAddTask,
  isTaskDataLoading,
  taskMetrics,
  projectManagerName,
  leadPodsCount,
  projectStatus,
  assignedProjectTasks,
  assigneeNameById,
  taskActionError,
  editingTask,
  deleteTaskTarget,
  activeTaskMenuId,
  setActiveTaskMenuId,
  taskPendingId,
  canEditAssignedTask,
  canDeleteAssignedTask,
  canToggleAssignedTask,
  onToggleDone,
  onOpenEdit,
  onRequestDelete,
  setTaskActionError,
}) => {
  return (
    <div className="grid gap-6 2xl:grid-cols-[1.28fr_0.72fr]">
      <div className="space-y-6">
        <TeamHierarchy team={team} />

        <section className="rounded-[1.85rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-brand-red">
                <CheckCheck size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Progress Snapshot</h2>
                <p className="text-sm text-slate-500">Completion performance and delivery health for this project.</p>
              </div>
            </div>
            {canCreateTask ? (
              <button
                type="button"
                onClick={onAddTask}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-gradient-to-r from-slate-950 via-[#111c44] to-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(29,78,216,0.22)]"
              >
                <Plus size={16} />
                Add Task
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">Completion</p>
                {isTaskDataLoading ? (
                  <div className="h-7 w-16 animate-pulse rounded-full bg-slate-200" />
                ) : (
                  <p className="text-lg font-semibold text-slate-950">{taskMetrics.progress}%</p>
                )}
              </div>
              {isTaskDataLoading ? (
                <>
                  <div className="mt-4 h-2.5 animate-pulse rounded-full bg-slate-200" />
                  <div className="mt-3 h-4 w-40 animate-pulse rounded-full bg-slate-200" />
                </>
              ) : (
                <>
                  <ProgressBar value={taskMetrics.progress} className="mt-4" />
                  <p className="mt-3 text-xs text-slate-500">
                    {taskMetrics.completed} of {taskMetrics.total} tasks completed
                  </p>
                </>
              )}
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm text-slate-500">Completed tasks</p>
              {isTaskDataLoading ? (
                <div className="mt-2 h-10 w-16 animate-pulse rounded-full bg-slate-200" />
              ) : (
                <p className="mt-2 text-[2rem] font-semibold leading-none text-slate-950">{taskMetrics.completed}</p>
              )}
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm text-slate-500">Blocked tasks</p>
              {isTaskDataLoading ? (
                <div className="mt-2 h-10 w-16 animate-pulse rounded-full bg-slate-200" />
              ) : (
                <p className="mt-2 text-[2rem] font-semibold leading-none text-slate-950">{taskMetrics.blocked}</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-[1.85rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-brand-red">
              <UsersRound size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Delivery Pulse</h2>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm text-slate-500">Project manager</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{projectManagerName || 'Unassigned'}</p>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm text-slate-500">Lead pods</p>
              <p className="mt-2 text-[2rem] font-semibold leading-none text-slate-950">{leadPodsCount || 0}</p>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm text-slate-500">Project status</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{getProjectStatusLabel(projectStatus)}</p>
            </div>
          </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">Assigned Tasks</p>
                {isTaskDataLoading ? (
                  <div className="h-4 w-10 animate-pulse rounded-full bg-slate-200" />
                ) : (
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{assignedProjectTasks.length}</p>
                )}
              </div>
              {taskActionError && !editingTask && !deleteTaskTarget ? (
                <p className="mb-3 text-sm text-rose-600">{taskActionError}</p>
              ) : null}

              {isTaskDataLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`assigned-task-skeleton-${index}`} className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-4 w-4 animate-pulse rounded border border-slate-200 bg-white" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
                              <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-slate-200" />
                            </div>
                            <div className="h-8 w-16 animate-pulse rounded-full bg-slate-200" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : assignedProjectTasks.length > 0 ? (
                <div className="space-y-3">
                  {assignedProjectTasks.map((task) => {
                  const taskKey = getTaskKey(task);
                  const canEditTask = canEditAssignedTask(task);
                  const canDeleteTask = canDeleteAssignedTask(task);
                  const canToggleTask = canToggleAssignedTask(task);
                  const isDone = task.status === 'done';
                  const isTaskPending = taskPendingId === taskKey;

                  return (
                    <div
                      key={taskKey}
                      className={`group relative rounded-[1.2rem] border px-4 py-3 transition-colors ${isDone ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50/80'}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={(event) =>
                            void onToggleDone(task, event.target.checked)
                          }
                          disabled={!canToggleTask || isTaskPending}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-red focus:ring-brand-red/30 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${isDone ? 'text-slate-500 line-through' : 'text-slate-950'}`}>
                                {task.title}
                              </p>
                              <p className={`mt-1 text-xs ${isDone ? 'text-slate-400' : 'text-slate-500'}`}>
                                {assigneeNameById.get(task.assigneeId || '') || task.assigneeName || task.assigneeId}
                              </p>
                            </div>

                            <div className="relative flex shrink-0 items-start gap-2">
                              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getTaskStatusClasses(task.status)}`}>
                                {getTaskStatusLabel(task.status)}
                              </span>

                              {(canEditTask || canDeleteTask) ? (
                                <div
                                  className="relative"
                                  onMouseDown={(event) => event.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setTaskActionError(null);
                                      setActiveTaskMenuId((current) => (current === taskKey ? null : taskKey));
                                    }}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 ${activeTaskMenuId === taskKey ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100'}`}
                                  >
                                    <MoreVertical size={15} />
                                  </button>

                                  {activeTaskMenuId === taskKey ? (
                                    <div className="absolute right-0 top-10 z-10 flex min-w-[132px] flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                      {canEditTask ? (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            onOpenEdit(task);
                                          }}
                                          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                                        >
                                          <Pencil size={14} />
                                          Edit
                                        </button>
                                      ) : null}
                                      {canDeleteTask ? (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            setTaskActionError(null);
                                            setActiveTaskMenuId(null);
                                            onRequestDelete(task);
                                          }}
                                          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                                        >
                                          <Trash2 size={14} />
                                          Delete
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
                No assigned tasks for this project yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProjectDetailsDeliveryPanel;
