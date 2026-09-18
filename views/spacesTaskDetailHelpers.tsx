import React from 'react';
import { API_BASE, getAuthHeaders } from '../config/api';
import {
  ensureDownloadFileName,
  type SpacesTask,
  type TaskPriority,
  type TaskStatus,
} from './spacesViewHelpers';
import { getUserTimeZone } from '../utils/timezone';

export async function downloadWithFallback(url: string, fileName?: string) {
  const href = String(url || '').trim();
  if (!href) throw new Error('Document URL is missing');
  const resolvedName = ensureDownloadFileName(fileName, { url: href });
  const query = new URLSearchParams({ url: href, name: resolvedName });
  const response = await fetch(`${API_BASE}/spaces/tasks/document-download?${query.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Download request failed');
  const blob = await response.blob();
  const finalName = ensureDownloadFileName(resolvedName, { mimeType: blob.type, url: href });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = finalName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export function normalizeStatusLabel(status?: string): string {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'todo') return 'To do';
  if (value === 'doing') return 'In progress';
  if (value === 'review') return 'In review';
  if (value === 'done') return 'Done';
  if (value === 'blocked') return 'Blocked';
  return status || 'Unknown';
}

export function getStatusStyles(status: TaskStatus) {
  if (status === 'done') {
    return {
      dot: 'bg-emerald-500',
      pill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }
  if (status === 'doing') {
    return {
      dot: 'bg-sky-500',
      pill: 'border-sky-200 bg-sky-50 text-sky-700',
    };
  }
  if (status === 'review') {
    return {
      dot: 'bg-amber-500',
      pill: 'border-amber-200 bg-amber-50 text-amber-800',
    };
  }
  if (status === 'blocked') {
    return {
      dot: 'bg-rose-500',
      pill: 'border-rose-200 bg-rose-50 text-rose-700',
    };
  }
  return {
    dot: 'bg-slate-400',
    pill: 'border-slate-200 bg-slate-50 text-slate-700',
  };
}

export function getPriorityStyles(priority: TaskPriority) {
  if (priority === 'high') {
    return 'border-red-200 bg-red-50 text-brand-red';
  }
  if (priority === 'low') {
    return 'border-slate-200 bg-white text-slate-600';
  }
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

export function formatDueDate(value?: string) {
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

export function formatDateTime(value?: string) {
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
    timeZone: getUserTimeZone(),
  });
}

export function renderDescriptionWithLinks(description: string) {
  const parts = description.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi);
  return parts.map((part, index) => {
    if (!/^(https?:\/\/|www\.)/i.test(part)) {
      return <React.Fragment key={`description-text-${index}`}>{part}</React.Fragment>;
    }
    const trailingMatch = part.match(/[),.;!?]+$/);
    const trailing = trailingMatch?.[0] || '';
    const urlText = trailing ? part.slice(0, -trailing.length) : part;
    const href = /^https?:\/\//i.test(urlText) ? urlText : `https://${urlText}`;
    return (
      <React.Fragment key={`description-link-${index}`}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 underline decoration-blue-400 underline-offset-2 transition hover:text-blue-800"
        >
          {urlText}
        </a>
        {trailing}
      </React.Fragment>
    );
  });
}

export function getTaskSourceLabel(task?: SpacesTask | null) {
  if (!task) return 'Manual';
  if (task.source === 'review_matrix') return 'Review Matrix';
  if (task.source === 'ai_agent') return 'AI Agent';
  if (task.source === 'project_charter') return 'Project Charter';
  return 'Manual';
}
