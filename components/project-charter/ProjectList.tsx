import React, { useMemo } from 'react';
import { BarChart3, Filter, FolderKanban, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WorkspaceProject } from '../../types';
import ProjectCard from './ProjectCard';
import ProgressBar from './ProgressBar';

interface ProjectListProps {
  projects: WorkspaceProject[];
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  loading?: boolean;
  liveTasksByProject?: Record<string, WorkspaceProject['tasks']>;
  generalTasks?: WorkspaceProject['tasks'];
  taskHubLoading?: boolean;
  taskHubFailed?: boolean;
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
  liveTasksByProject = {},
  generalTasks = [],
  taskHubLoading = false,
  taskHubFailed = false,
  canCreate = false,
  canDelete = false,
  onCreate,
  onDelete,
  onSearchChange,
  onStatusFilterChange,
  onPriorityFilterChange,
}) => {
  const hasCachedTaskCards = projects.length > 0 || generalTasks.length > 0;
  const isListLoading = loading || (!taskHubFailed && taskHubLoading && !hasCachedTaskCards);
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
      ) : projects.length === 0 && generalTasks.length === 0 ? (
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
          <GeneralTasksCard tasks={generalTasks} />
          {projectCards.map(({ project, liveTasks }) => (
            <ProjectCard
              key={project.id}
              project={project}
              to={`/workspaces/${encodeURIComponent(project.id)}`}
              canDelete={canDelete}
              onDelete={onDelete}
              liveTasks={liveTasks}
              actionLabel="Open charter"
            />
          ))}
        </div>
      )}
    </div>
  );
};

function GeneralTasksCard({ tasks }: { tasks: WorkspaceProject['tasks'] }) {
  const total = tasks.length;
  const completed = tasks.filter((task) => ['done', 'review'].includes(String(task.status || '').toLowerCase())).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const updatedAt = tasks[0]?.updatedAt || tasks[0]?.createdAt || new Date().toISOString();

  return (
    <ProjectCardShell to="/workspaces/general-tasks">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-800 via-brand-red to-amber-300 opacity-70" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-brand-red text-white shadow-lg shadow-brand-red/10">
          <BarChart3 size={22} />
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          General tasks
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-950 transition-colors group-hover:text-brand-red">General tasks</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
            TaskHub work that is not linked to a project charter. Open details and analytics for this general task pool.
          </p>
        </div>
        <ProgressBar value={progress} label="General task progress" />
      </div>
      <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
        <div className="flex items-center justify-between gap-3">
          <span>Total tasks</span>
          <span className="font-semibold text-slate-900">{total}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Completed</span>
          <span className="font-semibold text-slate-900">{completed}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Last updated</span>
          <span className="font-semibold text-slate-900">{new Date(updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between text-sm font-semibold text-slate-900">
        <span>{completed} of {total} tasks complete</span>
        <span className="inline-flex items-center gap-2 text-brand-red transition-transform group-hover:translate-x-1">
          Open details
        </span>
      </div>
    </ProjectCardShell>
  );
}

function ProjectCardShell({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-red/30 hover:shadow-2xl"
    >
      {children}
    </Link>
  );
}

export default ProjectList;
