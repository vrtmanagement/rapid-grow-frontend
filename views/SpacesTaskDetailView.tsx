import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { API_BASE, getAuthHeaders } from '../config/api';

interface SpacesTaskDetail {
  taskId: string;
  title: string;
  description?: string;
  projectId?: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  documentUrl?: string;
  documentName?: string;
  createdByEmpId?: string;
  createdByName?: string;
}

interface Props {
  mode: 'employee' | 'manager';
}

function getDownloadableUrl(url: string): string {
  return String(url || '').trim();
}

async function downloadWithFallback(url: string, fileName?: string) {
  const href = getDownloadableUrl(url);
  if (!href) {
    throw new Error('Document URL is missing');
  }
  const query = new URLSearchParams({
    url: href,
    name: fileName || 'task-document',
  });
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
  const value = String(status || '')
    .trim()
    .toLowerCase();
  if (value === 'todo') return 'To Do';
  if (value === 'doing') return 'Doing';
  if (value === 'review') return 'Submitted';
  if (value === 'done') return 'Done';
  if (value === 'blocked') return 'Blocked';
  return status || '-';
}

const SpacesTaskDetailView: React.FC<Props> = () => {
  const { taskId = '' } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<SpacesTaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTask = async () => {
      if (!taskId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/spaces`, { headers: getAuthHeaders() });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load task details');
        }
        const data = await res.json().catch(() => ({}));
        const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
        const found = tasks.find((x: any) => String(x?.taskId || '') === taskId) || null;
        if (!found) {
          throw new Error('Task not found');
        }
        setTask(found);
      } catch (e: any) {
        setError(e?.message || 'Failed to load task details');
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [taskId]);

  const projectLabel = useMemo(() => {
    if (!task?.projectId) return 'No project';
    return task.projectId;
  }, [task?.projectId]);

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

  const dash = (value?: string | null) => {
    const s = String(value ?? '').trim();
    return s ? s : <span className="text-slate-400">-</span>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in duration-500">
      <div className="text-[13px] text-slate-500 flex items-center gap-2">
        <Link to="/spaces" className="hover:text-brand-red">
          Task Hub
        </Link>
        <span>/</span>
        <span className="text-slate-700">Task Details</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Task Details</h2>
        <button
          type="button"
          onClick={() => navigate('/spaces')}
          className="px-3 py-1.5 rounded-lg border border-brand-red/20 bg-rose-50 text-brand-red text-sm font-semibold hover:bg-rose-100"
        >
          Back
        </button>
      </div>

      {loading ? <p className="text-slate-500 text-sm">Loading...</p> : null}
      {error ? <p className="text-red-600 text-sm">{error}</p> : null}

      {!loading && !error && task ? (
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Title</p>
              <p className="font-bold text-slate-900 break-words">{task.title}</p>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Description</p>
              <div className="text-slate-900 whitespace-pre-wrap break-words">
                {task.description?.trim() ? task.description : <span className="text-slate-400">-</span>}
              </div>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Document</p>
              <div className="text-slate-900 break-words">
                {task.documentUrl ? (
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="text-blue-700 hover:underline text-left disabled:opacity-60 disabled:cursor-not-allowed disabled:no-underline"
                  >
                    {downloading ? 'Downloading...' : `Download ${task.documentName || 'document'}`}
                  </button>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Project</p>
              <p className="text-slate-900 break-words">{projectLabel}</p>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Assignee</p>
              <p className="text-slate-900 break-words">
                {task.assigneeName || task.assigneeId || 'Unassigned'}
              </p>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Due Date</p>
              <p className="text-slate-900 break-words">{dash(task.dueDate)}</p>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Priority</p>
              <p className="text-slate-900 capitalize break-words">{dash(task.priority)}</p>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Status</p>
              <div>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {normalizeStatusLabel(task.status)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3 text-sm items-start">
              <p className="text-slate-500">Created By</p>
              <p className="text-slate-900 break-words">{dash(task.createdByName || task.createdByEmpId)}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default SpacesTaskDetailView;
