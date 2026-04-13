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

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="text-[13px] text-slate-500 flex items-center gap-2 bg-gradient-to-r from-white to-red-50 border border-red-100 rounded-full px-4 py-2 w-fit shadow-sm">
        <Link to="/spaces" className="hover:text-brand-red">
          Task Hub
        </Link>
        <span>/</span>
        <span className="text-slate-700">Task Details</span>
      </div>

      <div className="bg-gradient-to-br from-white via-red-50/20 to-sky-50/30 border border-red-100 rounded-3xl shadow-[0_30px_80px_rgba(15,23,42,0.14)] p-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-red-500">Task Hub</p>
            <h2 className="text-2xl text-slate-900">Task Details</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/spaces')}
            className="px-4 py-2 rounded-full border border-red-200 text-[13px] text-slate-700 bg-white hover:bg-red-50"
          >
            Back
          </button>
        </div>

        {loading ? <p className="text-slate-500 text-sm">Loading...</p> : null}
        {error ? <p className="text-red-600 text-sm">{error}</p> : null}

        {!loading && !error && task ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Title</p>
              <p className="text-xl text-slate-900">{task.title}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description || '-'}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl border border-red-100 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Project</p>
                <p className="text-slate-700">{projectLabel}</p>
              </div>
              <div className="rounded-2xl border border-red-100 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Assignee</p>
                <p className="text-slate-700">{task.assigneeName || task.assigneeId || 'Unassigned'}</p>
              </div>
              <div className="rounded-2xl border border-red-100 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Due Date</p>
                <p className="text-slate-700">{task.dueDate || '-'}</p>
              </div>
              <div className="rounded-2xl border border-red-100 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Priority</p>
                <p className="text-slate-700 capitalize">{task.priority || '-'}</p>
              </div>
              <div className="rounded-2xl border border-red-100 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Status</p>
                <p className="text-slate-700">{normalizeStatusLabel(task.status)}</p>
              </div>
              <div className="rounded-2xl border border-red-100 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Created By</p>
                <p className="text-slate-700">{task.createdByName || task.createdByEmpId || '-'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-red-100 bg-white px-4 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Document</p>
              {task.documentUrl ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-semibold text-brand-red hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {downloading
                    ? 'Downloading...'
                    : `Download ${task.documentName || 'Document'}`}
                </button>
              ) : (
                <p className="text-sm text-slate-500">No document attached.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SpacesTaskDetailView;

