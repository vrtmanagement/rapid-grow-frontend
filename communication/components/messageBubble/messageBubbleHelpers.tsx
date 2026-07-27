import React from 'react';
import { ChatMessage } from '../../types';

export function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export function formatAttachmentSize(size?: number) {
  if (!size || Number.isNaN(size)) return null;

  if (size < 1024) return `${size} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getFileExtension(fileName: string) {
  const normalized = String(fileName || '').trim();
  if (!normalized.includes('.')) return '';
  return normalized.split('.').pop()?.toUpperCase().slice(0, 5) || '';
}

export function getAttachmentKind(fileName: string, mimeType: string) {
  const normalizedMime = String(mimeType || '').toLowerCase();
  const normalizedName = String(fileName || '').toLowerCase();
  const extension = getFileExtension(fileName);

  if (normalizedMime.startsWith('image/')) {
    return {
      category: 'image',
      label: 'Image',
      badge: extension || 'IMG',
      badgeClass: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      iconClass: 'bg-emerald-50 text-emerald-700',
    } as const;
  }

  if (normalizedMime.startsWith('video/')) {
    return {
      category: 'video',
      label: 'Video',
      badge: extension || 'VID',
      badgeClass: 'border-violet-100 bg-violet-50 text-violet-700',
      iconClass: 'bg-violet-50 text-violet-700',
    } as const;
  }

  if (normalizedMime.startsWith('audio/')) {
    return {
      category: 'audio',
      label: 'Audio',
      badge: extension || 'AUD',
      badgeClass: 'border-sky-100 bg-sky-50 text-sky-700',
      iconClass: 'bg-sky-50 text-sky-700',
    } as const;
  }

  if (normalizedMime === 'application/pdf' || normalizedName.endsWith('.pdf')) {
    return {
      category: 'document',
      label: 'PDF document',
      badge: 'PDF',
      badgeClass: 'border-rose-100 bg-rose-50 text-rose-700',
      iconClass: 'bg-rose-50 text-rose-700',
    } as const;
  }

  if (
    normalizedMime.includes('presentation') ||
    normalizedMime.includes('powerpoint') ||
    normalizedName.endsWith('.ppt') ||
    normalizedName.endsWith('.pptx')
  ) {
    return {
      category: 'document',
      label: 'Presentation',
      badge: extension || 'PPT',
      badgeClass: 'border-amber-100 bg-amber-50 text-amber-700',
      iconClass: 'bg-amber-50 text-amber-700',
    } as const;
  }

  if (
    normalizedMime.includes('spreadsheet') ||
    normalizedMime.includes('excel') ||
    normalizedName.endsWith('.xls') ||
    normalizedName.endsWith('.xlsx') ||
    normalizedName.endsWith('.csv')
  ) {
    return {
      category: 'document',
      label: 'Spreadsheet',
      badge: extension || 'XLS',
      badgeClass: 'border-lime-100 bg-lime-50 text-lime-700',
      iconClass: 'bg-lime-50 text-lime-700',
    } as const;
  }

  if (
    normalizedMime.startsWith('text/') ||
    normalizedMime.includes('json') ||
    normalizedMime.includes('xml') ||
    normalizedName.endsWith('.html') ||
    normalizedName.endsWith('.htm') ||
    normalizedName.endsWith('.css') ||
    normalizedName.endsWith('.js')
  ) {
    return {
      category: 'document',
      label: 'Document',
      badge: extension || 'TXT',
      badgeClass: 'border-cyan-100 bg-cyan-50 text-cyan-700',
      iconClass: 'bg-cyan-50 text-cyan-700',
    } as const;
  }

  if (
    normalizedMime.includes('zip') ||
    normalizedMime.includes('rar') ||
    normalizedMime.includes('7z') ||
    normalizedName.endsWith('.zip') ||
    normalizedName.endsWith('.rar') ||
    normalizedName.endsWith('.7z')
  ) {
    return {
      category: 'archive',
      label: 'Archive',
      badge: extension || 'ZIP',
      badgeClass: 'border-slate-200 bg-slate-100 text-slate-700',
      iconClass: 'bg-slate-100 text-slate-700',
    } as const;
  }

  return {
    category: 'file',
    label: 'File',
    badge: extension || 'FILE',
    badgeClass: 'border-slate-200 bg-slate-100 text-slate-700',
    iconClass: 'bg-slate-100 text-slate-700',
  } as const;
}

export function getCopyableMessageText(message: ChatMessage): string {
  if (message.deleted) return '';
  const content = String(message.content ?? '');
  if (message.type === 'text') {
    return content;
  }
  if (content.length > 0) {
    return content;
  }
  if (message.attachment?.fileName) {
    return message.attachment.fileName;
  }
  if (message.fileUrl) {
    return message.fileUrl;
  }
  return '';
}

export async function copyMessageText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy copy
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export function renderLinkedText(text: string) {
  const parts = String(text || '').split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (/^https?:\/\/[^\s]+$/i.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="communication-message-link text-blue-700 underline decoration-blue-500 underline-offset-2 hover:text-blue-800"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={`${index}-${part.slice(0, 8)}`}>{part}</React.Fragment>;
  });
}
