import React from 'react';
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  Eye,
  Flag,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import type { TaskPriority, TaskStatus } from '../../types/spaces';

export const PERSONAL_TASK_VIEW_KEY = 'spaces.personalTaskView';

export const STATUS_META: Record<
  TaskStatus,
  {
    name: string;
    color: string;
    icon: LucideIcon;
    iconClass: string;
    boardHeader: string;
    boardColumn: string;
    boardAccent: string;
    boardAdd: string;
  }
> = {
  todo: {
    name: 'To do',
    color: 'bg-slate-100 text-slate-600',
    icon: Circle,
    iconClass: 'text-slate-500',
    boardHeader: 'bg-[#eceff3] text-[#5b6573]',
    boardColumn: 'bg-[#f4f5f7]',
    boardAccent: '#87909e',
    boardAdd: 'text-[#87909e] hover:bg-white/80',
  },
  doing: {
    name: 'In progress',
    color: 'bg-blue-50 text-blue-700',
    icon: Loader2,
    iconClass: 'text-blue-600',
    boardHeader: 'bg-[#2ea8ff] text-white',
    boardColumn: 'bg-[#eef7ff]',
    boardAccent: '#2ea8ff',
    boardAdd: 'text-[#2ea8ff] hover:bg-white/80',
  },
  review: {
    name: 'In review',
    color: 'bg-violet-50 text-violet-700',
    icon: Eye,
    iconClass: 'text-violet-600',
    boardHeader: 'bg-[#8b5cf6] text-white',
    boardColumn: 'bg-[#f5f0ff]',
    boardAccent: '#8b5cf6',
    boardAdd: 'text-[#8b5cf6] hover:bg-white/80',
  },
  blocked: {
    name: 'Blocked',
    color: 'bg-rose-50 text-rose-700',
    icon: Ban,
    iconClass: 'text-rose-600',
    boardHeader: 'bg-[#f04343] text-white',
    boardColumn: 'bg-[#fff1f1]',
    boardAccent: '#f04343',
    boardAdd: 'text-[#f04343] hover:bg-white/80',
  },
  done: {
    name: 'Complete',
    color: 'bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    boardHeader: 'bg-[#2ecd6f] text-white',
    boardColumn: 'bg-[#eefbf3]',
    boardAccent: '#2ecd6f',
    boardAdd: 'text-[#2ecd6f] hover:bg-white/80',
  },
};

export const PERSONAL_STATUS_OPTIONS = (Object.keys(STATUS_META) as TaskStatus[])
  .filter((status) => status !== 'blocked')
  .map((status) => ({ status, name: STATUS_META[status].name }));

const PRIORITY_META: Record<TaskPriority, { icon: LucideIcon; className: string }> = {
  high: { icon: Flag, className: 'text-rose-600' },
  medium: { icon: Flag, className: 'text-amber-500' },
  low: { icon: Flag, className: 'text-slate-400' },
};

export function StatusIcon({
  status,
  size = 14,
  className,
}: {
  status: TaskStatus;
  size?: number;
  className?: string;
}) {
  const meta = STATUS_META[status] || STATUS_META.todo;
  const Icon = meta.icon;
  return <Icon size={size} className={`shrink-0 ${className || meta.iconClass}`} aria-hidden />;
}

export function TaskTypeIcon({ size = 14, className }: { size?: number; className?: string }) {
  return <ClipboardList size={size} className={`shrink-0 ${className || 'text-slate-500'}`} aria-hidden />;
}

export function PriorityIcon({
  priority,
  size = 12,
  className,
}: {
  priority: TaskPriority;
  size?: number;
  className?: string;
}) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
  const Icon = meta.icon;
  return <Icon size={size} className={`shrink-0 ${meta.className} ${className || ''}`} aria-hidden />;
}

export function DueDateIcon({ size = 12, className }: { size?: number; className?: string }) {
  return <CalendarDays size={size} className={`shrink-0 ${className || ''}`} aria-hidden />;
}

export function initialsFromName(name?: string) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'ME';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}
