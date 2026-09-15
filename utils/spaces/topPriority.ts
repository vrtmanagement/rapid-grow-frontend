import type { SpacesTask } from '../../types/spaces';

export function isCompletedPriorityStatus(status?: string) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  return normalizedStatus === 'review' || normalizedStatus === 'done';
}

export function getTopPriorityCardClasses(task: SpacesTask, _index?: number) {
  if (isCompletedPriorityStatus(task.status)) {
    return 'border border-emerald-200 border-l-[3px] border-l-emerald-500 bg-emerald-50/70 hover:bg-emerald-50';
  }

  const status = String(task.status || 'todo').trim().toLowerCase();
  if (status === 'doing') {
    return 'border border-slate-200 border-l-[3px] border-l-sky-500 bg-white hover:bg-sky-50/40';
  }
  if (status === 'review') {
    return 'border border-slate-200 border-l-[3px] border-l-violet-500 bg-white hover:bg-violet-50/40';
  }
  if (status === 'blocked') {
    return 'border border-slate-200 border-l-[3px] border-l-amber-500 bg-white hover:bg-amber-50/40';
  }

  const priority = String(task.priority || 'medium').trim().toLowerCase();
  if (priority === 'high') {
    return 'border border-slate-200 border-l-[3px] border-l-amber-500 bg-white hover:bg-slate-50';
  }
  return 'border border-slate-200 border-l-[3px] border-l-slate-300 bg-white hover:bg-slate-50';
}

export function getTopPriorityPillClasses(type: 'priority' | 'status' | 'date', value?: string) {
  if (type === 'priority') {
    const normalizedPriority = String(value || 'medium').trim().toLowerCase();
    if (normalizedPriority === 'high') return 'bg-amber-50 text-amber-800';
    if (normalizedPriority === 'low') return 'bg-sky-50 text-sky-700';
    return 'bg-orange-50 text-orange-700';
  }

  if (type === 'status') {
    const normalizedStatus = String(value || 'todo').trim().toLowerCase();
    if (normalizedStatus === 'doing') return 'bg-sky-50 text-sky-700';
    if (normalizedStatus === 'done' || normalizedStatus === 'review') return 'bg-emerald-50 text-emerald-700';
    if (normalizedStatus === 'blocked') return 'bg-amber-50 text-amber-800';
    return 'bg-slate-100 text-slate-600';
  }

  return 'bg-slate-50 text-slate-500';
}

export function formatTopPriorityLabel(value: string) {
  const normalizedValue = String(value || '').trim().toLowerCase();
  if (normalizedValue === 'review') return 'Submitted';
  if (normalizedValue === 'todo') return 'Todo';
  if (normalizedValue === 'doing') return 'In progress';
  return String(value || '').trim().replace(/^./, (char: string) => char.toUpperCase());
}

export function formatTopPriorityDateLabel(value?: string) {
  return value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '-';
}
