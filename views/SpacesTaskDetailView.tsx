import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  FolderKanban,
  Hash,
  MessageSquare,
  Octagon,
  RefreshCw,
  Repeat,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { API_BASE, getAuthHeaders } from '../config/api';
import { fetchWorkspaceLinkTasks } from '../services/spacesApi';
import { getDisplayAvatarUrl } from '../utils/avatar';
import {
  buildEmployeeNameLookup,
  canEditTaskForView,
  enrichTasksWithEmployeeNames,
  getLoggedInEmployee,
  isRecurringSeriesActive,
  isRecurringSeriesTask,
  normalizeTaskForUi,
  resolveAssigneeLabel,
  resolveEmployeeDisplayName,
  type SpacesTask,
  type TaskPriority,
  type TaskStatus,
} from './spacesViewHelpers';

interface Props {
  mode: 'employee' | 'manager';
}

const pageEase = [0.22, 1, 0.36, 1] as const;

const sectionReveal = {
  hidden: { opacity: 0, y: 14 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, delay: 0.06 + index * 0.05, ease: pageEase },
  }),
};

async function downloadWithFallback(url: string, fileName?: string) {
  const href = String(url || '').trim();
  if (!href) throw new Error('Document URL is missing');
  const query = new URLSearchParams({ url: href, name: fileName || 'task-document' });
  const response = await fetch(`${API_BASE}/spaces/tasks/document-download?${query.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Download request failed');
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName || 'task-document';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function normalizeStatusLabel(status?: string): string {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'todo') return 'To do';
  if (value === 'doing') return 'In progress';
  if (value === 'review') return 'In review';
  if (value === 'done') return 'Done';
  if (value === 'blocked') return 'Blocked';
  return status || 'Unknown';
}

function getStatusStyles(status: TaskStatus) {
  if (status === 'done') {
    return {
      dot: 'bg-emerald-400',
      pill: 'border-emerald-400/25 bg-emerald-500/15 text-emerald-100',
    };
  }
  if (status === 'doing') {
    return {
      dot: 'bg-sky-400',
      pill: 'border-sky-400/25 bg-sky-500/15 text-sky-100',
    };
  }
  if (status === 'review') {
    return {
      dot: 'bg-violet-400',
      pill: 'border-violet-400/25 bg-violet-500/15 text-violet-100',
    };
  }
  if (status === 'blocked') {
    return {
      dot: 'bg-rose-400',
      pill: 'border-rose-400/25 bg-rose-500/15 text-rose-100',
    };
  }
  return {
    dot: 'bg-slate-400',
    pill: 'border-white/15 bg-white/10 text-slate-200',
  };
}

function getPriorityStyles(priority: TaskPriority) {
  if (priority === 'high') {
    return 'border-red-400/30 bg-gradient-to-r from-red-500/20 to-rose-500/10 text-red-100';
  }
  if (priority === 'low') {
    return 'border-white/10 bg-white/5 text-slate-300';
  }
  return 'border-amber-400/20 bg-amber-500/10 text-amber-100';
}

function formatDueDate(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return raw;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getTaskSourceLabel(task?: SpacesTask | null) {
  if (!task) return 'Manual';
  if (task.source === 'review_matrix') return 'Review Matrix';
  if (task.source === 'ai_agent') return 'AI Agent';
  if (task.source === 'project_charter') return 'Project Charter';
  return 'Manual';
}

function MetaCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-4 shadow-[0_12px_40px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)] ${
        accent
          ? 'border-brand-red/15 bg-gradient-to-br from-red-50/80 to-white'
          : 'border-slate-200/80 bg-white/90 backdrop-blur-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            accent ? 'bg-brand-red/10 text-brand-red' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <div className="mt-1.5 text-[15px] font-semibold leading-snug text-slate-900 break-words">{value}</div>
        </div>
      </div>
    </div>
  );
}

function ContentPanel({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 py-4 sm:px-7">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">{icon}</div>
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
      </div>
      <div className="px-6 py-6 sm:px-7">{children}</div>
    </section>
  );
}

function TaskDetailSkeleton({ reducedMotion }: { reducedMotion: boolean }) {
  const pulse = reducedMotion ? {} : { opacity: [0.45, 0.9, 0.45] };
  const pulseTransition = reducedMotion ? undefined : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <div className="space-y-6">
      <motion.div
        animate={pulse}
        transition={pulseTransition}
        className="overflow-hidden rounded-[28px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-8 py-10"
      >
        <div className="h-4 w-32 rounded-full bg-white/10" />
        <div className="mt-6 h-10 w-4/5 max-w-xl rounded-2xl bg-white/10" />
        <div className="mt-4 h-4 w-56 rounded-full bg-white/10" />
      </motion.div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <motion.div
            key={`sk-${index}`}
            animate={pulse}
            transition={pulseTransition}
            className="rounded-[22px] border border-slate-200 bg-white p-4"
          >
            <div className="h-10 w-10 rounded-2xl bg-slate-100" />
            <div className="mt-4 h-3 w-16 rounded bg-slate-100" />
            <div className="mt-2 h-5 w-28 rounded bg-slate-200" />
          </motion.div>
        ))}
      </div>
      <motion.div animate={pulse} transition={pulseTransition} className="rounded-[28px] border border-slate-200 bg-white p-7">
        <div className="h-4 w-28 rounded bg-slate-100" />
        <div className="mt-5 h-24 w-full rounded-2xl bg-slate-50" />
      </motion.div>
    </div>
  );
}

const SpacesTaskDetailView: React.FC<Props> = ({ mode }) => {
  const { taskId = '' } = useParams();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const me = useMemo(() => getLoggedInEmployee(), []);
  const [task, setTask] = useState<SpacesTask | null>(null);
  const [allTasks, setAllTasks] = useState<SpacesTask[]>([]);
  const [employeeNameById, setEmployeeNameById] = useState<Map<string, string>>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [stoppingRecurrence, setStoppingRecurrence] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTask = async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const [spacesPayload, employeesRes] = await Promise.all([
        fetchWorkspaceLinkTasks(),
        fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() }),
      ]);

      let nameLookup = new Map<string, string>();
      if (employeesRes.ok) {
        const employeePayload = await employeesRes.json().catch(() => []);
        const list = Array.isArray(employeePayload) ? employeePayload : [];
        nameLookup = buildEmployeeNameLookup(
          list.map((entry: any) => ({
            empId: String(entry.empId || entry._id || '').trim(),
            empName: String(entry.empName || entry.name || '').trim(),
            _id: entry._id ? String(entry._id) : undefined,
          })),
        );
      }
      setEmployeeNameById(nameLookup);

      const tasks = Array.isArray(spacesPayload?.tasks)
        ? enrichTasksWithEmployeeNames(
            spacesPayload.tasks.map((item: SpacesTask) => normalizeTaskForUi(item)),
            nameLookup,
          )
        : [];
      const found = tasks.find((item) => item.taskId === taskId) || null;
      if (!found) throw new Error('Task not found');
      setAllTasks(tasks);
      setTask(found);
    } catch (e: any) {
      setTask(null);
      setError(e?.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTask();
  }, [taskId]);

  const showRecurringBadge = task ? isRecurringSeriesTask(task) : false;
  const showStopRepeating =
    Boolean(task?.recurrence?.enabled) &&
    isRecurringSeriesActive(allTasks, task as SpacesTask) &&
    canEditTaskForView(task as SpacesTask, me, mode);

  const status = (task?.status || 'todo') as TaskStatus;
  const priority = (task?.priority || 'medium') as TaskPriority;
  const statusStyles = getStatusStyles(status);
  const dueDateLabel = formatDueDate(task?.dueDate);
  const createdLabel = formatDateTime(task?.createdAt);
  const updatedLabel = formatDateTime(task?.updatedAt);
  const isHighPriority = priority === 'high';
  const taskSourceLabel = getTaskSourceLabel(task);
  const assigneeLabel = task
    ? resolveAssigneeLabel(task.assigneeId, task.assigneeName, employeeNameById)
    : 'Unassigned';
  const createdByLabel = task
    ? resolveEmployeeDisplayName(task.createdByEmpId, task.createdByName, employeeNameById) || '—'
    : '—';
  const assigneeAvatar = getDisplayAvatarUrl(undefined, assigneeLabel);
  const createdByAvatar = getDisplayAvatarUrl(undefined, createdByLabel);

  const handleStopRepeating = async () => {
    if (!task || !showStopRepeating || stoppingRecurrence) return;
    setStoppingRecurrence(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/spaces/tasks/${task.taskId}/recurrence/stop`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to stop repeating task');

      const sourceTaskId = String(data.sourceTaskId || '').trim();
      if (sourceTaskId) {
        setAllTasks((prev) =>
          prev.map((item) => {
            if (item.taskId !== sourceTaskId) return item;
            return normalizeTaskForUi({
              ...item,
              recurrence: { ...(item.recurrence || {}), enabled: false, nextRunAt: null },
            });
          }),
        );
        setTask((prev) => {
          if (!prev) return prev;
          if (prev.taskId === sourceTaskId) {
            return normalizeTaskForUi({
              ...prev,
              recurrence: { ...(prev.recurrence || {}), enabled: false, nextRunAt: null },
            });
          }
          return prev;
        });
      } else if (data.task) {
        const normalized = normalizeTaskForUi(data.task as SpacesTask);
        setTask(normalized);
        setAllTasks((prev) => prev.map((item) => (item.taskId === normalized.taskId ? normalized : item)));
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to stop repeating task');
    } finally {
      setStoppingRecurrence(false);
    }
  };

  const handleDownload = async () => {
    if (!task?.documentUrl) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadWithFallback(task.documentUrl, task.documentName || 'task-document');
    } catch (e: any) {
      setError(e?.message || 'Failed to download document');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-6xl pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.08),transparent_55%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.06),transparent_45%)]" />

      <motion.header
        initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: pageEase }}
        className="relative mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200/70 bg-white/80 px-4 py-3 shadow-[0_10px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/spaces')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Back to TaskHub"
          >
            <ArrowLeft size={18} />
          </button>
          <nav className="min-w-0 text-sm">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
              <Link to="/spaces" className="font-medium text-slate-600 transition hover:text-brand-red">
                TaskHub
              </Link>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="truncate font-semibold text-slate-900">Task detail</span>
            </div>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-slate-400">Workspace overview</p>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadTask()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {showStopRepeating ? (
            <button
              type="button"
              onClick={() => void handleStopRepeating()}
              disabled={stoppingRecurrence}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50 px-4 text-[12px] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
            >
              <Octagon size={14} />
              {stoppingRecurrence ? 'Stopping…' : 'Stop occurrences'}
            </button>
          ) : null}
        </div>
      </motion.header>

      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="error"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            className="relative rounded-[28px] border border-rose-200 bg-gradient-to-br from-rose-50 to-white px-8 py-16 text-center shadow-[0_20px_60px_rgba(244,63,94,0.08)]"
          >
            <p className="text-base font-semibold text-rose-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadTask()}
              className="mt-5 inline-flex h-10 items-center rounded-full bg-brand-red px-5 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              Try again
            </button>
          </motion.div>
        ) : null}

        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TaskDetailSkeleton reducedMotion={!!prefersReducedMotion} />
          </motion.div>
        ) : null}

        {!loading && !error && task ? (
          <motion.article
            key={task.taskId}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.48, ease: pageEase }}
            className="relative space-y-6"
          >
            <div
              className={`relative overflow-hidden rounded-[32px] border shadow-[0_28px_80px_rgba(15,23,42,0.28)] ${
                isHighPriority ? 'border-red-900/40' : 'border-slate-800/80'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.22),transparent_42%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              {isHighPriority ? (
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-red to-rose-600" />
              ) : null}

              <div className="relative px-6 py-8 sm:px-9 sm:py-10">
                <motion.div
                  custom={0}
                  variants={sectionReveal}
                  initial={prefersReducedMotion ? false : 'hidden'}
                  animate={prefersReducedMotion ? undefined : 'show'}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${statusStyles.pill}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${statusStyles.dot}`} />
                    {normalizeStatusLabel(task.status)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold capitalize ${getPriorityStyles(priority)}`}
                  >
                    <Sparkles size={12} />
                    {priority} priority
                  </span>
                  {showRecurringBadge ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-slate-200">
                      <Repeat size={12} className="text-red-300" />
                      Repeating
                    </span>
                  ) : null}
                  {taskSourceLabel === 'AI Agent' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/15 px-3 py-1.5 text-[12px] font-semibold text-violet-100">
                      AI generated
                    </span>
                  ) : null}
                </motion.div>

                <motion.h1
                  custom={1}
                  variants={sectionReveal}
                  initial={prefersReducedMotion ? false : 'hidden'}
                  animate={prefersReducedMotion ? undefined : 'show'}
                  className="mt-6 max-w-4xl text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.03em] text-white sm:text-[2.35rem] break-words"
                >
                  {task.title}
                </motion.h1>

                <motion.div
                  custom={2}
                  variants={sectionReveal}
                  initial={prefersReducedMotion ? false : 'hidden'}
                  animate={prefersReducedMotion ? undefined : 'show'}
                  className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-400"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] text-slate-300">
                    <Hash size={12} />
                    {task.taskId}
                  </span>
                  {dueDateLabel ? (
                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                      <CalendarDays size={14} className="text-red-300" />
                      Due {dueDateLabel}
                    </span>
                  ) : null}
                </motion.div>

                {showRecurringBadge ? (
                  <motion.p
                    custom={2}
                    variants={sectionReveal}
                    initial={prefersReducedMotion ? false : 'hidden'}
                    animate={prefersReducedMotion ? undefined : 'show'}
                    className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-400"
                  >
                    {showStopRepeating
                      ? 'This task repeats on a schedule. Use Stop occurrences to end future copies without deleting past work.'
                      : 'Repeat schedule has been stopped for this series.'}
                  </motion.p>
                ) : null}
              </div>
            </div>

            <motion.div
              custom={3}
              variants={sectionReveal}
              initial={prefersReducedMotion ? false : 'hidden'}
              animate={prefersReducedMotion ? undefined : 'show'}
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
            >
              <MetaCard
                icon={<UserRound size={18} />}
                label="Assignee"
                value={
                  <span className="inline-flex items-center gap-2.5">
                    <img src={assigneeAvatar} alt={assigneeLabel} className="h-7 w-7 rounded-full object-cover ring-2 ring-white" />
                    {assigneeLabel}
                  </span>
                }
                accent={!task.assigneeId}
              />
              <MetaCard
                icon={<CalendarDays size={18} />}
                label="Due date"
                value={dueDateLabel || <span className="font-normal text-slate-400">Not set</span>}
                accent={Boolean(dueDateLabel && isHighPriority)}
              />
              <MetaCard
                icon={<FolderKanban size={18} />}
                label="Project"
                value={task.projectId || <span className="font-normal text-slate-400">None</span>}
              />
              <MetaCard icon={<Sparkles size={18} />} label="Source" value={taskSourceLabel} />
              <MetaCard
                icon={<UserRound size={18} />}
                label="Created by"
                value={
                  <span className="inline-flex items-center gap-2.5">
                    <img src={createdByAvatar} alt={createdByLabel} className="h-7 w-7 rounded-full object-cover ring-2 ring-white" />
                    {createdByLabel}
                  </span>
                }
              />
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <motion.div
                  custom={4}
                  variants={sectionReveal}
                  initial={prefersReducedMotion ? false : 'hidden'}
                  animate={prefersReducedMotion ? undefined : 'show'}
                >
                  <ContentPanel title="Description" icon={<FileText size={15} />}>
                    <p className="max-w-3xl text-[15px] leading-[1.75] text-slate-700 whitespace-pre-wrap break-words">
                      {task.description?.trim() || (
                        <span className="text-slate-400">No description provided for this task yet.</span>
                      )}
                    </p>
                  </ContentPanel>
                </motion.div>

                {Array.isArray(task.comments) && task.comments.length > 0 ? (
                  <motion.div
                    custom={5}
                    variants={sectionReveal}
                    initial={prefersReducedMotion ? false : 'hidden'}
                    animate={prefersReducedMotion ? undefined : 'show'}
                  >
                    <ContentPanel
                      title={`Comments · ${task.comments.length}`}
                      icon={<MessageSquare size={15} />}
                    >
                      <ul className="space-y-4">
                        {task.comments.map((comment, index) => {
                          const authorName = comment.fromName || comment.fromEmpId || 'Team member';
                          const authorAvatar = getDisplayAvatarUrl(undefined, authorName);
                          return (
                            <li
                              key={comment.id || `${comment.createdAt}-${index}`}
                              className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4"
                            >
                              <div className="flex items-start gap-3">
                                <img
                                  src={authorAvatar}
                                  alt={authorName}
                                  className="h-10 w-10 rounded-2xl object-cover ring-2 ring-white"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-900">{authorName}</p>
                                    <time className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                                      {formatDateTime(comment.createdAt)}
                                    </time>
                                  </div>
                                  <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap break-words">
                                    {comment.text}
                                  </p>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </ContentPanel>
                  </motion.div>
                ) : null}
              </div>

              <div className="space-y-6">
                {task.documentUrl ? (
                  <motion.div
                    custom={6}
                    variants={sectionReveal}
                    initial={prefersReducedMotion ? false : 'hidden'}
                    animate={prefersReducedMotion ? undefined : 'show'}
                  >
                    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Attachment</p>
                          <p className="mt-1 truncate text-sm font-semibold text-white">
                            {task.documentName || 'task-document'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDownload()}
                        disabled={downloading}
                        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-slate-900 transition hover:bg-red-50 hover:text-brand-red disabled:opacity-50"
                      >
                        <Download size={16} />
                        {downloading ? 'Downloading…' : 'Download file'}
                      </button>
                    </div>
                  </motion.div>
                ) : null}

                <motion.div
                  custom={7}
                  variants={sectionReveal}
                  initial={prefersReducedMotion ? false : 'hidden'}
                  animate={prefersReducedMotion ? undefined : 'show'}
                >
                  <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
                    <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <Clock3 size={15} />
                      Activity
                    </div>
                    <div className="mt-5 space-y-4">
                      {createdLabel ? (
                        <div className="flex gap-3">
                          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-red" />
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Created</p>
                            <p className="mt-1 text-sm font-medium text-slate-800">{createdLabel}</p>
                          </div>
                        </div>
                      ) : null}
                      {updatedLabel ? (
                        <div className="flex gap-3">
                          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Last updated</p>
                            <p className="mt-1 text-sm font-medium text-slate-800">{updatedLabel}</p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.article>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default SpacesTaskDetailView;
