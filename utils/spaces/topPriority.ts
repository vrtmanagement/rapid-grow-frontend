import type { SpacesTask } from '../../types/spaces';

export function isCompletedPriorityStatus(status?: string) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  return normalizedStatus === 'review' || normalizedStatus === 'done';
}

export function getTopPriorityCardClasses(task: SpacesTask, index: number) {
  if (isCompletedPriorityStatus(task.status)) {
    return 'border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100/70';
  }
  if (index % 2 === 0) {
    return 'border border-slate-200 border-l-[3px] border-l-brand-red bg-white hover:bg-[#f7faff]';
  }
  return 'border border-slate-300 border-l-[3px] border-l-slate-400 bg-white hover:bg-[#f7faff]';
}

export function getTopPriorityPillClasses(type: 'priority' | 'status' | 'date', value?: string) {
  if (type === 'priority') {
    const normalizedPriority = String(value || 'medium').trim().toLowerCase();
    if (normalizedPriority === 'high') return 'bg-red-50 text-brand-red';
    if (normalizedPriority === 'low') return 'bg-sky-50 text-sky-700';
    return 'bg-amber-50 text-amber-700';
  }

  if (type === 'status') {
    const normalizedStatus = String(value || 'todo').trim().toLowerCase();
    if (normalizedStatus === 'doing') return 'bg-indigo-50 text-indigo-600';
    if (normalizedStatus === 'done' || normalizedStatus === 'review') return 'bg-emerald-50 text-emerald-700';
    if (normalizedStatus === 'blocked') return 'bg-rose-50 text-rose-600';
    return 'bg-slate-100 text-slate-500';
  }

  return 'bg-slate-50 text-slate-400';
}

export function formatTopPriorityLabel(value: string) {
  return String(value || '').trim().replace(/^./, (char: string) => char.toUpperCase());
}

export function formatTopPriorityDateLabel(value?: string) {
  return value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '-';
}
