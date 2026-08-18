import React from 'react';
import { API_BASE, getAuthHeaders } from '../config/api';
import {
  ensureDownloadFileName,
  type SpacesTask,
  type TaskPriority,
  type TaskStatus,
} from './spacesViewHelpers';
import { getUserTimeZone } from '../utils/timezone';

export const pageEase = [0.22, 1, 0.36, 1] as const;

export const sectionReveal = {
  hidden: { opacity: 0, y: 6 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, delay: Math.min(index, 3) * 0.02, ease: pageEase },
  }),
};

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

export function getPriorityStyles(priority: TaskPriority) {
  if (priority === 'high') {
    return 'border-red-400/30 bg-gradient-to-r from-red-500/20 to-rose-500/10 text-red-100';
  }
  if (priority === 'low') {
    return 'border-white/10 bg-white/5 text-slate-300';
  }
  return 'border-amber-400/20 bg-amber-500/10 text-amber-100';
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
