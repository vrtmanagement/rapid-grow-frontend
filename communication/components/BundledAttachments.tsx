import React, { useState } from 'react';
import { Download, Eye, FileText, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';
import { apiDownloadCommunicationFile } from '../api';

function formatAttachmentSize(size?: number) {
  if (!size || Number.isNaN(size)) return null;
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = size / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getFileExtension(fileName: string) {
  const normalized = String(fileName || '').trim();
  if (!normalized.includes('.')) return '';
  return normalized.split('.').pop()?.toUpperCase().slice(0, 5) || '';
}

function getAttachmentKind(fileName: string, mimeType: string) {
  const mime = String(mimeType || '').toLowerCase();
  const name = String(fileName || '').toLowerCase();
  const extension = getFileExtension(fileName);

  if (mime.startsWith('image/')) {
    return { category: 'image' as const, label: 'Image', badge: extension || 'IMG', badgeClass: 'border-emerald-100 bg-emerald-50 text-emerald-700', iconClass: 'bg-emerald-50 text-emerald-700' };
  }
  if (mime.startsWith('video/')) {
    return { category: 'video' as const, label: 'Video', badge: extension || 'VID', badgeClass: 'border-violet-100 bg-violet-50 text-violet-700', iconClass: 'bg-violet-50 text-violet-700' };
  }
  if (mime.startsWith('audio/')) {
    return { category: 'audio' as const, label: 'Audio', badge: extension || 'AUD', badgeClass: 'border-sky-100 bg-sky-50 text-sky-700', iconClass: 'bg-sky-50 text-sky-700' };
  }
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return { category: 'file' as const, label: 'PDF', badge: 'PDF', badgeClass: 'border-rose-100 bg-rose-50 text-rose-700', iconClass: 'bg-rose-50 text-rose-700' };
  }
  return { category: 'file' as const, label: extension || 'File', badge: extension || 'FILE', badgeClass: 'border-slate-200 bg-slate-50 text-slate-700', iconClass: 'bg-slate-100 text-slate-700' };
}

function BundledAttachmentItem({ message }: { message: ChatMessage }) {
  const [loading, setLoading] = useState(false);
  const fileUrl = message.localPreviewUrl || message.fileUrl || message.attachment?.url || '#';
  const fileName = message.attachment?.fileName || 'Attachment';
  const mimeType = message.attachment?.mimeType || '';
  const meta = getAttachmentKind(fileName, mimeType);
  const sizeLabel = formatAttachmentSize(message.attachment?.size);
  const canOpen = !message.pending && fileUrl !== '#';
  const hasDownload = !message.pending && (!!String(message.attachment?.fileId || '').trim() || canOpen);
  const isPending = !!message.pending;

  const download = async () => {
    if (!hasDownload) return;
    setLoading(true);
    try {
      if (message.attachment?.fileId) {
        await apiDownloadCommunicationFile(message.attachment.fileId, fileName);
      } else if (canOpen) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.click();
      }
    } finally {
      setLoading(false);
    }
  };

  if (meta.category === 'image') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
        <a href={canOpen ? fileUrl : undefined} target="_blank" rel="noreferrer" className={canOpen ? 'block' : 'pointer-events-none block'}>
          <img src={fileUrl} alt={fileName} className="h-36 w-full bg-slate-100 object-cover" loading="lazy" />
        </a>
        {isPending ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow">
              <Loader2 size={12} className="animate-spin text-brand-red" />
              Uploading…
            </span>
          </div>
        ) : null}
        <div className="flex items-center gap-2 px-2.5 py-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-slate-900">{fileName}</div>
            <div className="text-[10px] text-slate-500">{[meta.label, sizeLabel].filter(Boolean).join(' · ')}</div>
          </div>
          <button
            type="button"
            onClick={() => void download()}
            disabled={!hasDownload || loading}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50"
            aria-label={`Download ${fileName}`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
        </div>
      </div>
    );
  }

  if (meta.category === 'video') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
        <video src={fileUrl} controls={!isPending} preload="metadata" className="h-40 w-full bg-slate-950 object-cover" />
        {isPending ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow">
              <Loader2 size={12} className="animate-spin text-brand-red" />
              Uploading…
            </span>
          </div>
        ) : null}
        <div className="flex items-center gap-2 px-2.5 py-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-slate-900">{fileName}</div>
            <div className="text-[10px] text-slate-500">{[meta.label, sizeLabel].filter(Boolean).join(' · ')}</div>
          </div>
          <button
            type="button"
            onClick={() => void download()}
            disabled={!hasDownload || loading}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50"
            aria-label={`Download ${fileName}`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5">
      <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconClass}`}>
        {isPending ? <Loader2 size={16} className="animate-spin text-brand-red" /> : <FileText size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold text-slate-900">{fileName}</div>
        <div className="mt-0.5 text-[10px] text-slate-500">
          {isPending ? 'Uploading…' : [meta.label, sizeLabel].filter(Boolean).join(' · ')}
        </div>
        {!isPending ? (
          <div className="mt-2 flex items-center gap-1.5">
            {canOpen ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye size={12} />
                Open
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => void download()}
              disabled={!hasDownload || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Download
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function BundledAttachments({
  messages,
  caption,
  renderLinkedText,
}: {
  messages: ChatMessage[];
  caption?: string;
  renderLinkedText: (text: string) => React.ReactNode;
}) {
  const mediaMessages = messages.filter(
    (message) =>
      !message.deleted &&
      (message.type === 'image' || message.type === 'file' || message.type === 'attachment') &&
      (message.attachment || message.fileUrl),
  );

  if (mediaMessages.length === 0 && !caption) return null;

  return (
    <div className="space-y-2">
      {mediaMessages.length > 0 ? (
        <div className={`grid gap-2 ${mediaMessages.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          {mediaMessages.map((message) => (
            <BundledAttachmentItem key={message.id} message={message} />
          ))}
        </div>
      ) : null}
      {caption ? (
        <div className="whitespace-pre-wrap break-words text-[14px] leading-5">{renderLinkedText(caption)}</div>
      ) : null}
    </div>
  );
}
