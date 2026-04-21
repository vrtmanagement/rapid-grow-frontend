import React, { useEffect, useMemo, useState } from 'react';
import { Filter, FolderKanban, Plus, Search } from 'lucide-react';
import { WorkspaceProject } from '../../types';
import ProjectCard from './ProjectCard';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { getSocket } from '../../realtime/socket';

interface LinkedSpaceTask {
  taskId?: string;
  projectTaskId?: string;
  projectId?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

function normalizeLinkedTaskStatus(status?: string): 'todo' | 'doing' | 'review' | 'done' | 'blocked' {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (['todo', 'to_do', 'pending', 'open'].includes(normalized)) return 'todo';
  if (['doing', 'in_progress', 'progress', 'ongoing'].includes(normalized)) return 'doing';
  if (['review', 'submitted', 'submit', 'for_review'].includes(normalized)) return 'review';
  if (['done', 'completed', 'complete', 'closed'].includes(normalized)) return 'done';
  if (['blocked', 'on_hold', 'hold'].includes(normalized)) return 'blocked';
  return 'todo';
}

interface ProjectListProps {
  projects: WorkspaceProject[];
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  loading?: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  onCreate: () => void;
  onDelete: (projectId: string) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onPriorityFilterChange: (value: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  searchTerm,
  statusFilter,
  priorityFilter,
  loading = false,
  canCreate = false,
  canDelete = false,
  onCreate,
  onDelete,
  onSearchChange,
  onStatusFilterChange,
  onPriorityFilterChange,
}) => {
  const [liveTasksByProject, setLiveTasksByProject] = useState<Record<string, WorkspaceProject['tasks']>>({});
  const [taskHubLoading, setTaskHubLoading] = useState(true);
  const [taskHubFailed, setTaskHubFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadLinkedTasks = async () => {
      try {
        setTaskHubLoading(true);
        const response = await fetch(`${API_BASE}/spaces`, { headers: getAuthHeaders() });
        if (!response.ok) {
          throw new Error('Failed to load linked project tasks');
        }

        const data = await response.json().catch(() => ({}));
        const groupedTasks = (Array.isArray(data?.tasks) ? data.tasks : []).reduce(
          (acc: Record<string, WorkspaceProject['tasks']>, task: LinkedSpaceTask) => {
            const projectId = String(task?.projectId || '').trim();
            const taskId = String(task?.projectTaskId || task?.taskId || '').trim();
            if (!projectId || !taskId) return acc;

            if (!acc[projectId]) {
              acc[projectId] = [];
            }

            acc[projectId].push({
              id: taskId,
              projectId,
              title: String(task.title || '').trim() || 'Untitled Task',
              description: String(task.description || '').trim(),
              status: normalizeLinkedTaskStatus(task.status),
              priority: task.priority === 'high' || task.priority === 'low' ? task.priority : 'medium',
              assigneeId: String(task.assigneeId || '').trim() || undefined,
              dueDate: String(task.dueDate || '').trim() || undefined,
              createdAt: String(task.createdAt || '') || new Date().toISOString(),
              updatedAt: String(task.updatedAt || task.createdAt || '') || new Date().toISOString(),
            });

            return acc;
          },
          {},
        );

        Object.values(groupedTasks).forEach((tasks) => {
          tasks.sort((left, right) => {
            const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
            const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
            return rightTime - leftTime;
          });
        });

        if (!cancelled) {
          setLiveTasksByProject(groupedTasks);
          setTaskHubFailed(false);
        }
      } catch {
        if (!cancelled) {
          setTaskHubFailed(true);
        }
      } finally {
        if (!cancelled) {
          setTaskHubLoading(false);
        }
      }
    };

    void loadLinkedTasks();

    const socket = getSocket();
    const onSpacesChanged = (payload: any) => {
      const action = String(payload?.action || '').trim();
      if (!['task_created', 'task_updated', 'task_deleted'].includes(action)) {
        return;
      }

      void loadLinkedTasks();
    };

    socket.on('spaces:changed', onSpacesChanged);
    return () => {
      cancelled = true;
      socket.off('spaces:changed', onSpacesChanged);
    };
  }, []);

  const isListLoading = loading || (!taskHubFailed && taskHubLoading);
  const projectCards = useMemo(
    () =>
      projects.map((project) => ({
        project,
        liveTasks: taskHubFailed ? undefined : liveTasksByProject[project.id] || [],
      })),
    [liveTasksByProject, projects, taskHubFailed],
  );

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative xl:max-w-md xl:flex-1">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by project name, manager, or description"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-brand-red focus:bg-white focus:ring-2 focus:ring-brand-red/10"
            />
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              <Filter size={16} />
              <select
                value={statusFilter}
                onChange={(event) => onStatusFilterChange(event.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none"
              >
                <option value="all">All statuses</option>
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              <Filter size={16} />
              <select
                value={priorityFilter}
                onChange={(event) => onPriorityFilterChange(event.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none"
              >
                <option value="all">All priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-red">Project Charter Module</p>

          {canCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              <Plus size={18} />
              Create Project
            </button>
          ) : null}
        </div>
      </section>

      {isListLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`project-charter-skeleton-${index}`} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm animate-pulse">
              <div className="mb-6 flex items-center justify-between">
                <div className="h-14 w-14 rounded-[1.35rem] bg-slate-200" />
                <div className="h-8 w-24 rounded-full bg-slate-100" />
              </div>
              <div className="space-y-3">
                <div className="h-6 w-2/3 rounded-full bg-slate-200" />
                <div className="h-4 w-full rounded-full bg-slate-100" />
                <div className="h-4 w-5/6 rounded-full bg-slate-100" />
                <div className="h-3 rounded-full bg-slate-200" />
              </div>
              <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
                <div className="space-y-3">
                  <div className="h-4 w-full rounded-full bg-slate-100" />
                  <div className="h-4 w-full rounded-full bg-slate-100" />
                  <div className="h-4 w-5/6 rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white px-8 py-16 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-slate-100 text-slate-400">
            <FolderKanban size={28} />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">No projects found</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Try adjusting your search or filters to widen the results.'
              : 'Start by creating your first charter to activate project visibility, hierarchy, and delivery tracking.'}
          </p>
          {canCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-slate-950"
            >
              <Plus size={16} />
              Create Project
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projectCards.map(({ project, liveTasks }) => (
            <ProjectCard
              key={project.id}
              project={project}
              to={`/workspaces/${project.id}`}
              canDelete={canDelete}
              onDelete={onDelete}
              liveTasks={liveTasks}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;
