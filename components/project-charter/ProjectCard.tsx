import React from 'react';
import { ArrowUpRight, BriefcaseBusiness, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WorkspaceProject } from '../../types';
import ProgressBar from './ProgressBar';
import {
  computeProjectTaskMetrics,
  countProjectMembers,
  formatProjectDateTime,
  getProjectPriorityClasses,
  getProjectPriorityLabel,
  getProjectStatusClasses,
  getProjectStatusLabel,
} from './projectCharterUtils';

interface ProjectCardProps {
  project: WorkspaceProject;
  to: string;
  canDelete?: boolean;
  onDelete?: (projectId: string) => void;
  liveTasks?: WorkspaceProject['tasks'];
  actionLabel?: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  to,
  canDelete = false,
  onDelete,
  liveTasks,
  actionLabel = 'Open charter',
}) => {
  const scopedTasks =
    liveTasks ||
    (project.tasks || []).filter((task) => !project.id || task.projectId === project.id);
  const metrics = computeProjectTaskMetrics(scopedTasks);
  const memberCount = countProjectMembers(project);
  const updatedAt =
    project.activity?.[0]?.createdAt ||
    scopedTasks?.[0]?.updatedAt ||
    `${project.dateCreated}T00:00:00.000Z`;

  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-red/30 hover:shadow-2xl"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-red via-orange-400 to-amber-300 opacity-70" />
      {canDelete && onDelete ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(project.id);
          }}
          className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 size={16} />
        </button>
      ) : null}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-slate-950 text-white shadow-lg shadow-slate-950/10 transition-colors duration-300 group-hover:bg-brand-red">
          <BriefcaseBusiness size={22} />
        </div>
        <div className="flex flex-wrap justify-end gap-2 pr-12">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getProjectStatusClasses(project.status)}`}>
            {getProjectStatusLabel(project.status)}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getProjectPriorityClasses(project.priority)}`}>
            {getProjectPriorityLabel(project.priority)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-950 transition-colors group-hover:text-brand-red">{project.name}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
            {project.description || 'Project charter ready for planning, delivery orchestration, and execution visibility.'}
          </p>
        </div>

        <ProgressBar value={metrics.progress} label="Project progress" />
      </div>

      <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
        <div className="flex items-center justify-between gap-3">
          <span>Total team members</span>
          <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
            <Users size={14} />
            {memberCount}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Project manager</span>
          <span className="truncate font-semibold text-slate-900">{project.team?.projectManager?.name || 'Unassigned'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Last updated</span>
          <span className="font-semibold text-slate-900">{formatProjectDateTime(updatedAt)}</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm font-semibold text-slate-900">
        <span>{metrics.completed} of {metrics.total} tasks complete</span>
        <span className="inline-flex items-center gap-2 text-brand-red transition-transform group-hover:translate-x-1">
          {actionLabel}
          <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
};

export default ProjectCard;
