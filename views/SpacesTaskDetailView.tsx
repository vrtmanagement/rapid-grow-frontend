import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
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
import { API_BASE, getAuthHeaders } from '../config/api';
import { fetchWorkspaceLinkTasks } from '../services/spacesApi';
import { getDisplayAvatarUrl } from '../utils/avatar';
import { peekSpacesTaskFocus, rememberSpacesTaskFocus } from '../utils/spaces/taskNavigation';
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
  getTaskAttachments,
  type SpacesTask,
  type TaskPriority,
  type TaskStatus,
} from './spacesViewHelpers';
import {
  downloadWithFallback,
  formatDateTime,
  formatDueDate,
  getPriorityStyles,
  getStatusStyles,
  getTaskSourceLabel,
  normalizeStatusLabel,
  renderDescriptionWithLinks,
} from './spacesTaskDetailHelpers';
import { ContentPanel, MetaItem, TaskDetailSkeleton } from './SpacesTaskDetailParts';

interface Props {
  mode: 'employee' | 'manager';
}

type TaskDetailLocationState = {
  task?: SpacesTask;
  spacesReturn?: {
    page?: number;
    filterMode?: 'all' | 'me' | 'assigned';
    statusFilter?: TaskStatus | '';
    search?: string;
  };
  /** @deprecated use spacesReturn.page */
  spacesReturnPage?: number;
};

const SpacesTaskDetailView: React.FC<Props> = ({ mode }) => {
  const { taskId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state || {}) as TaskDetailLocationState;
  const me = useMemo(() => getLoggedInEmployee(), []);
  const seededTask = useMemo(() => {
    const candidate = locationState.task;
    if (!candidate || String(candidate.taskId || '') !== taskId) return null;
    return normalizeTaskForUi(candidate);
  }, [locationState.task, taskId]);
  const [task, setTask] = useState<SpacesTask | null>(seededTask);
  const [allTasks, setAllTasks] = useState<SpacesTask[]>([]);
  const [employeeNameById, setEmployeeNameById] = useState<Map<string, string>>(() => new Map());
  const [loading, setLoading] = useState(!seededTask);
  const [downloadingFileKey, setDownloadingFileKey] = useState('');
  const [stoppingRecurrence, setStoppingRecurrence] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBackToSpaces = () => {
    const returnContext = locationState.spacesReturn;
    rememberSpacesTaskFocus({
      taskId,
      page:
        Number(returnContext?.page) > 0
          ? Number(returnContext.page)
          : Number(locationState.spacesReturnPage) > 0
            ? Number(locationState.spacesReturnPage)
            : peekSpacesTaskFocus()?.page,
      filterMode: returnContext?.filterMode || peekSpacesTaskFocus()?.filterMode,
      statusFilter:
        returnContext?.statusFilter !== undefined
          ? returnContext.statusFilter
          : peekSpacesTaskFocus()?.statusFilter,
      search:
        returnContext?.search !== undefined
          ? returnContext.search
          : peekSpacesTaskFocus()?.search,
    });
    navigate('/spaces');
  };

  const loadTask = async () => {
    if (!taskId) return;
    setError(null);

    // Never blank the page when we already have this task (seeded navigation / refresh).
    let hasVisibleTask = false;
    setTask((current) => {
      hasVisibleTask = Boolean(current && current.taskId === taskId);
      return current;
    });
    if (!hasVisibleTask) setLoading(true);

    try {
      const taskDetailRes = await fetch(`${API_BASE}/spaces/tasks/${encodeURIComponent(taskId)}`, {
        headers: getAuthHeaders(),
      });
      const taskDetailPayload = taskDetailRes.ok
        ? await taskDetailRes.json().catch(() => null)
        : null;
      if (!taskDetailPayload) throw new Error('Task not found');

      const found = normalizeTaskForUi(taskDetailPayload as SpacesTask);
      setTask(found);
      setLoading(false);

      // Enrich names + recurrence context in the background (not on the critical path).
      void (async () => {
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
          setAllTasks(tasks);
          setTask((prev) =>
            enrichTasksWithEmployeeNames([normalizeTaskForUi(prev || found)], nameLookup)[0] || found,
          );
        } catch {
          // Non-critical enrichment; keep the already-rendered task.
        }
      })();
    } catch (e: any) {
      setError(e?.message || 'Failed to load task details');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seededTask && seededTask.taskId === taskId) {
      setTask(seededTask);
      setLoading(false);
    } else if (!seededTask) {
      setTask(null);
    }
    void loadTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const taskAttachments = useMemo(() => (task ? getTaskAttachments(task) : []), [task]);

  const handleDownload = async (url: string, fileName: string) => {
    if (!url) return;
    const downloadKey = `${url}:${fileName}`;
    setDownloadingFileKey(downloadKey);
    setError(null);
    try {
      await downloadWithFallback(url, fileName || 'task-document');
    } catch (e: any) {
      setError(e?.message || 'Failed to download document');
    } finally {
      setDownloadingFileKey('');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-16 pt-5 sm:pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={goBackToSpaces}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            aria-label="Back to TaskHub"
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <nav className="min-w-0 text-[13px]">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
              <Link
                to="/spaces"
                onClick={(event) => {
                  event.preventDefault();
                  goBackToSpaces();
                }}
                className="font-medium text-slate-600 transition hover:text-brand-red"
              >
                TaskHub
              </Link>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="truncate font-medium text-slate-900">Task detail</span>
            </div>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadTask()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {showStopRepeating ? (
            <button
              type="button"
              onClick={() => void handleStopRepeating()}
              disabled={stoppingRecurrence}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 text-[13px] font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50"
            >
              <Octagon size={14} />
              {stoppingRecurrence ? 'Stopping…' : 'Stop repeating'}
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-[14px] text-rose-700">
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => void loadTask()}
            className="mt-3 inline-flex h-9 items-center rounded-full bg-brand-red px-4 text-[13px] font-semibold text-white transition hover:bg-brand-navy"
          >
            Try again
          </button>
        </div>
      ) : null}

      {loading && !task ? <TaskDetailSkeleton /> : null}

      {!error && task ? (
        <article className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold ${statusStyles.pill}`}
              >
                <span className={`h-2 w-2 rounded-full ${statusStyles.dot}`} />
                {normalizeStatusLabel(task.status)}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold capitalize ${getPriorityStyles(priority)}`}
              >
                <Sparkles size={12} />
                {priority} priority
              </span>
              {showRecurringBadge ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-700">
                  <Repeat size={12} className="text-brand-red" />
                  Repeating
                </span>
              ) : null}
              {taskSourceLabel === 'AI Agent' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-700">
                  AI generated
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 max-w-4xl text-[1.55rem] font-semibold tracking-tight text-slate-950 sm:text-[1.85rem] break-words">
              {task.title}
            </h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-slate-500">
              <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-slate-500">
                <Hash size={12} />
                {task.taskId}
              </span>
              {dueDateLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-slate-400" />
                  Due {dueDateLabel}
                </span>
              ) : null}
            </div>

            {showRecurringBadge ? (
              <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-slate-500">
                {showStopRepeating
                  ? 'This task repeats on a schedule. Stop repeating to end future copies without deleting past work.'
                  : 'Repeat schedule has been stopped for this series.'}
              </p>
            ) : null}
          </div>

          <div className="bg-slate-50/90 px-5 py-5 sm:px-7">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetaItem
                icon={<UserRound size={13} />}
                label="Assignee"
                value={
                  <span className="inline-flex items-center gap-2">
                    <img
                      src={assigneeAvatar}
                      alt={assigneeLabel}
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <span className={!task.assigneeId ? 'font-medium text-slate-400' : undefined}>
                      {assigneeLabel}
                    </span>
                  </span>
                }
              />
              <MetaItem
                icon={<CalendarDays size={13} />}
                label="Due date"
                value={dueDateLabel || <span className="font-medium text-slate-400">Not set</span>}
              />
              <MetaItem
                icon={<FolderKanban size={13} />}
                label="Project"
                value={task.projectId || <span className="font-medium text-slate-400">None</span>}
              />
              <MetaItem icon={<Sparkles size={13} />} label="Source" value={taskSourceLabel} />
              <MetaItem
                icon={<UserRound size={13} />}
                label="Created by"
                value={
                  <span className="inline-flex items-center gap-2">
                    <img
                      src={createdByAvatar}
                      alt={createdByLabel}
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    {createdByLabel}
                  </span>
                }
              />
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,0.9fr)]">
            <div className="space-y-8 px-5 py-6 sm:px-7 sm:py-7">
              <ContentPanel
                title="Description"
                hint="What this task covers"
                icon={<FileText size={15} />}
              >
                <p className="rounded-2xl bg-slate-50/80 px-4 py-4 text-[15px] leading-[1.75] text-slate-700 whitespace-pre-wrap break-words">
                  {task.description?.trim() ? (
                    renderDescriptionWithLinks(task.description.trim())
                  ) : (
                    <span className="text-slate-400">No description provided for this task yet.</span>
                  )}
                </p>
              </ContentPanel>

              {Array.isArray(task.comments) && task.comments.length > 0 ? (
                <ContentPanel
                  title={`Comments · ${task.comments.length}`}
                  hint="Discussion on this task"
                  icon={<MessageSquare size={15} />}
                >
                  <ul className="space-y-3">
                    {task.comments.map((comment, index) => {
                      const authorName = comment.fromName || comment.fromEmpId || 'Team member';
                      const authorAvatar = getDisplayAvatarUrl(undefined, authorName);
                      return (
                        <li
                          key={comment.id || `${comment.createdAt}-${index}`}
                          className="rounded-2xl bg-slate-50/80 px-4 py-3.5"
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={authorAvatar}
                              alt={authorName}
                              className="h-9 w-9 rounded-full object-cover ring-1 ring-white"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">{authorName}</p>
                                <time className="text-[11px] text-slate-400">
                                  {formatDateTime(comment.createdAt)}
                                </time>
                              </div>
                              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap break-words">
                                {comment.text}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </ContentPanel>
              ) : null}

              {taskAttachments.length ? (
                <ContentPanel
                  title={
                    taskAttachments.length === 1
                      ? 'Attachment'
                      : `Attachments · ${taskAttachments.length}`
                  }
                  hint="Files linked to this task"
                  icon={<FileText size={15} />}
                >
                  <div className="space-y-2">
                    {taskAttachments.map((file, index) => {
                      const downloadKey = `${file.url}:${file.name}`;
                      const isDownloading = downloadingFileKey === downloadKey;
                      return (
                        <div
                          key={`${file.url}-${index}`}
                          className="flex items-center gap-3 rounded-2xl bg-slate-50/80 px-3.5 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900" title={file.name}>
                              {file.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDownload(file.url, file.name)}
                            disabled={Boolean(downloadingFileKey)}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-brand-red disabled:opacity-50"
                          >
                            <Download size={14} />
                            {isDownloading ? 'Downloading…' : 'Download'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </ContentPanel>
              ) : null}
            </div>

            <aside className="bg-slate-50/70 px-5 py-6 sm:px-7 sm:py-7 lg:border-l lg:border-slate-100">
              <ContentPanel title="Activity" hint="Key timeline for this task" icon={<Clock3 size={15} />}>
                <div className="space-y-3">
                  {createdLabel ? (
                    <div className="rounded-2xl bg-white px-3.5 py-3 ring-1 ring-slate-200/70">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-brand-red" />
                        <p className="text-[12px] font-medium text-slate-500">Created</p>
                      </div>
                      <p className="mt-1.5 pl-4 text-sm font-semibold text-slate-900">{createdLabel}</p>
                    </div>
                  ) : null}
                  {updatedLabel ? (
                    <div className="rounded-2xl bg-white px-3.5 py-3 ring-1 ring-slate-200/70">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                        <p className="text-[12px] font-medium text-slate-500">Last updated</p>
                      </div>
                      <p className="mt-1.5 pl-4 text-sm font-semibold text-slate-900">{updatedLabel}</p>
                    </div>
                  ) : null}
                </div>
              </ContentPanel>
            </aside>
          </div>
        </article>
      ) : null}
    </div>
  );
};

export default SpacesTaskDetailView;
