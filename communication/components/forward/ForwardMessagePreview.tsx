import React from 'react';
import { FileText, Forward, PlayCircle } from 'lucide-react';
import { ChatMessage } from '../../types';

function formatTime(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function formatSize(size?: number | null) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function renderAttachment(message: ChatMessage) {
  const attachment = message.attachment;
  const fileUrl = message.fileUrl || attachment?.url || '';
  const mimeType = String(attachment?.mimeType || '');

  if (message.type === 'image' && fileUrl) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <img src={fileUrl} alt={attachment?.fileName || 'Forwarded image'} className="h-48 w-full object-cover" loading="lazy" />
      </div>
    );
  }

  if (mimeType.startsWith('video/') && fileUrl) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
        <video src={fileUrl} controls preload="metadata" className="h-48 w-full object-cover" />
      </div>
    );
  }

  if (mimeType.startsWith('audio/')) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <PlayCircle size={18} />
          </div>
          <div className="flex flex-1 items-center gap-1">
            {Array.from({ length: 22 }).map((_, index) => (
              <span
                key={index}
                className="w-1 rounded-full bg-sky-200"
                style={{ height: `${8 + ((index % 5) + 1) * 4}px` }}
              />
            ))}
          </div>
        </div>
        <audio src={fileUrl} controls preload="metadata" className="w-full" />
      </div>
    );
  }

  if (!attachment) return null;

  const extension = attachment.fileName.includes('.') ? attachment.fileName.split('.').pop()?.toUpperCase() : 'FILE';
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="truncate text-sm font-semibold text-slate-900">{attachment.fileName}</div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-slate-500">
            {extension || 'FILE'}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {[attachment.mimeType || 'Document', formatSize(attachment.size)].filter(Boolean).join(' | ')}
        </div>
      </div>
    </div>
  );
}

export function ForwardMessagePreview({
  message,
  senderName,
}: {
  message: ChatMessage;
  senderName: string;
}) {
  const originalSenderName = message.forwarded?.forwardedFromSenderName || senderName || 'Unknown sender';
  const originalTimestamp = formatTime(message.forwarded?.originalCreatedAt || message.createdAt);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-[#fbfcfe] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        <Forward size={13} />
        Forwarded
      </div>
      <div className="mb-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-800">From:</span> {originalSenderName}
        {originalTimestamp ? <span className="ml-2 text-slate-400">{originalTimestamp}</span> : null}
      </div>

      <div className="space-y-3">
        {renderAttachment(message)}
        {message.content ? (
          <div className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{message.content}</div>
        ) : null}
      </div>
    </div>
  );
}
