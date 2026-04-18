import React, { useEffect, useRef, useState } from 'react';
import { CornerUpLeft, Download, Eye, FileText, Loader2, MoreVertical, PencilLine, Trash2 } from 'lucide-react';
import { ChatMessage, ChatUser } from '../types';
import { MessageActionModal } from './MessageActionModal';
import { API_BASE } from '../../config/api';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function formatAttachmentSize(size?: number) {
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

function getAttachmentBadge(fileName: string, mimeType: string, isImageAttachment: boolean) {
  if (isImageAttachment) return 'IMG';

  const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
  if (extension) return extension.slice(0, 4).toUpperCase();

  const subtype = mimeType.split('/')[1];
  return subtype ? subtype.slice(0, 4).toUpperCase() : 'FILE';
}

export function MessageBubble({
  message,
  isOwn,
  sender,
  showSenderName,
  onEdit,
  onDelete,
  onReply,
  resolveUserName,
}: {
  message: ChatMessage;
  isOwn: boolean;
  sender: ChatUser | null;
  showSenderName?: boolean;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onReply?: () => void;
  resolveUserName?: (userId: string) => string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom' | 'inside'>('top');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editValue, setEditValue] = useState(message.content || '');
  const [mounted, setMounted] = useState(false);
  const [actionLoading, setActionLoading] = useState<null | 'download'>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setEditValue(message.content || '');
  }, [message.content]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const calculateMenuPlacement = () => {
      const bubble = bubbleRef.current;
      if (!bubble) return;
      const rect = bubble.getBoundingClientRect();
      const menuHeight = 72;
      const spacing = 6;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceAbove >= menuHeight + spacing) {
        setMenuPlacement('top');
      } else if (spaceBelow >= menuHeight + spacing) {
        setMenuPlacement('bottom');
      } else {
        setMenuPlacement('inside');
      }
    };
    calculateMenuPlacement();

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleViewportChange = () => calculateMenuPlacement();
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [menuOpen]);

  const bubbleBase = message.deleted
    ? 'bg-red-300/30 text-slate-700 border-red-300 shadow-none'
    : isOwn
    ? 'bg-brand-red text-white border-brand-red/20 shadow-[0_8px_24px_rgba(236,72,71,0.15)]'
    : 'bg-white text-slate-900 border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.06)]';
  const tailFillColor = message.deleted
    ? 'rgba(252, 165, 165, 0.3)'
    : isOwn
    ? '#ec4847'
    : '#ffffff';
  const tailStrokeColor = message.deleted
    ? '#fca5a5'
    : isOwn
    ? '#ec4847'
    : '#e2e8f0';
  const bubbleShapeClass = isOwn ? 'rounded-[30px] rounded-br-[12px]' : 'rounded-[30px] rounded-bl-[12px]';

  const timeTone = isOwn ? 'text-white/80' : 'text-slate-500';
  const directFileUrl = message.fileUrl || message.attachment?.url || '#';
  const downloadUrl = message.attachment?.fileId
    ? `${API_BASE}/communication/files/${encodeURIComponent(message.attachment.fileId)}`
    : directFileUrl;
  const attachmentName = message.attachment?.fileName || 'Attachment';
  const attachmentMimeType = message.attachment?.mimeType || '';
  const isImageAttachment = message.type === 'image' || attachmentMimeType.startsWith('image/');
  const attachmentSize = formatAttachmentSize(message.attachment?.size);
  const attachmentBadge = getAttachmentBadge(attachmentName, attachmentMimeType, isImageAttachment);
  const hasDownloadTarget = downloadUrl !== '#';

  const triggerDownload = () => {
    if (!hasDownloadTarget) return;
    setActionLoading('download');
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = attachmentName || 'file';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => setActionLoading(null), 1200);
  };

  return (
    <>
      <div
        className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} my-2 transition-all duration-200 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <div className="relative">
          <div className="absolute right-2 top-2 z-30" ref={menuRef}>
            <button
              type="button"
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
                menuOpen
                  ? 'opacity-100 border-white/30 text-white bg-black/20'
                  : 'opacity-0 group-hover:opacity-100 border-white/30 text-white/90 bg-black/10 hover:bg-black/20'
              } ${!isOwn ? 'border-slate-200 text-slate-600 bg-white/80 hover:bg-white' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Message actions"
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen ? (
              <div
                className={`absolute right-0 z-[90] w-[112px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl transition-all duration-100 ${
                  menuPlacement === 'top'
                    ? 'bottom-full mb-1.5 origin-bottom-right'
                    : menuPlacement === 'bottom'
                      ? 'top-full mt-1.5 origin-top-right'
                      : 'top-8 origin-top-right'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onReply?.();
                  }}
                  disabled={!!message.deleted}
                  className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CornerUpLeft size={13} />
                  Reply
                </button>
                {isOwn ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditOpen(true);
                    }}
                    disabled={!!message.deleted || message.type !== 'text'}
                    className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <PencilLine size={13} />
                    Edit
                  </button>
                ) : null}
                {isOwn ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteOpen(true);
                    }}
                    disabled={!!message.deleted}
                    className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div ref={bubbleRef} className={`relative max-w-[78vw] border ${bubbleBase} ${bubbleShapeClass} px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 ${isOwn ? 'pr-12' : ''}`}>
          {!message.deleted && message.replyTo ? (
            <div className={`mb-2 rounded-xl border px-3 py-2 ${isOwn ? 'border-white/30 bg-white/15' : 'border-slate-200 bg-slate-100/70'}`}>
              <div className={`text-[10px] font-semibold ${isOwn ? 'text-white/90' : 'text-slate-600'}`}>
                Replying to {resolveUserName?.(message.replyTo.senderId) || 'User'}
              </div>
              <div className={`mt-1 text-[12px] ${isOwn ? 'text-white/80' : 'text-slate-600'} line-clamp-2`}>
                {message.replyTo.deleted
                  ? 'Message deleted'
                  : message.replyTo.type === 'text'
                    ? (message.replyTo.content || 'Text message')
                    : message.replyTo.attachment?.fileName || 'Attachment'}
              </div>
            </div>
          ) : null}

          {message.deleted && (
            <>
              {showSenderName && !isOwn && sender?.name ? (
                <div className={`mb-1 text-[11px] font-semibold ${isOwn ? 'text-white/85' : 'text-slate-600'}`}>{sender.name}</div>
              ) : null}
              <div className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                Message deleted
              </div>
            </>
          )}

          {!message.deleted && message.type === 'text' && (
            <>
              {showSenderName && !isOwn && sender?.name ? (
                <div className={`mb-1 text-[11px] font-semibold ${isOwn ? 'text-white/85' : 'text-slate-600'}`}>{sender.name}</div>
              ) : null}
              <div className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                {message.content}
              </div>
            </>
          )}

          {!message.deleted && (message.type === 'image' || message.type === 'file' || message.type === 'attachment') && (message.attachment || message.fileUrl) ? (
            <div className="space-y-2">
              {showSenderName && !isOwn && sender?.name ? (
                <div className={`text-[11px] font-semibold ${isOwn ? 'text-white/85' : 'text-slate-600'}`}>{sender.name}</div>
              ) : null}
              {isImageAttachment ? (
                <div
                  className={`w-full max-w-[240px] overflow-hidden rounded-[22px] border ${
                    isOwn ? 'border-white/20 bg-white/10' : 'border-slate-200 bg-white'
                  } shadow-[0_14px_34px_rgba(15,23,42,0.12)]`}
                >
                  <div className="group/image relative">
                    <img
                      src={message.fileUrl || message.attachment?.url || ''}
                      alt={attachmentName}
                      className="h-36 w-full bg-slate-100 object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover/image:opacity-100" />
                    <button
                      type="button"
                      onClick={triggerDownload}
                      title={`Download ${attachmentName}`}
                      aria-label={`Download ${attachmentName}`}
                      disabled={!hasDownloadTarget || actionLoading === 'download'}
                      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/95 text-slate-700 shadow-lg opacity-0 transition-all duration-200 group-hover/image:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionLoading === 'download' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    </button>
                  </div>
                  <div className={`flex items-center gap-3 px-3 py-2.5 ${isOwn ? 'text-white' : 'text-slate-900'}`}>
                    <div className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold tracking-[0.18em] ${
                      isOwn ? 'bg-white/15 text-white/90' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {attachmentBadge}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold">{attachmentName}</div>
                      <div className={`text-[11px] ${isOwn ? 'text-white/75' : 'text-slate-500'}`}>
                        {['Image', attachmentSize].filter(Boolean).join(' | ')}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {isImageAttachment ? null : (
                <button
                  type="button"
                  onClick={triggerDownload}
                  disabled={!hasDownloadTarget || actionLoading === 'download'}
                  title={`Download ${attachmentName}`}
                  className={`group/file w-full rounded-[22px] border px-3 py-3 text-left transition-all duration-200 ${
                    isOwn
                      ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                      : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-white'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      isOwn ? 'bg-white/15 text-white/90' : 'bg-white text-slate-600 shadow-sm'
                    }`}>
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">{attachmentName}</div>
                      <div className={`text-[11px] ${isOwn ? 'text-white/75' : 'text-slate-500'}`}>
                        {[attachmentBadge, attachmentSize].filter(Boolean).join(' | ')}
                      </div>
                    </div>
                    <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                      isOwn
                        ? 'bg-white/15 text-white group-hover/file:bg-white/20'
                        : 'bg-white text-slate-700 shadow-sm group-hover/file:shadow'
                    }`}>
                      {actionLoading === 'download' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    </div>
                  </div>
                </button>
              )}

              {message.content ? (
                <div className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                  {message.content}
                </div>
              ) : null}
            </div>
          ) : null}

            <div className={`mt-2 flex items-center justify-end gap-2 text-[11px] ${timeTone}`}>
              {!message.deleted && message.editedAt ? (
                <span className="text-[10px] opacity-80">edited</span>
              ) : null}
              <span>{formatTime(message.createdAt)}</span>
              {isOwn && message.tick ? (
                <span
                  className={
                    message.tick.state === 'seen'
                      ? 'inline-flex items-center text-sky-600'
                      : message.tick.state === 'delivered'
                        ? 'text-slate-400 font-black'
                        : 'text-slate-400 font-black'
                  }
                  title={`Status: ${message.tick.state}`}
                >
                  {message.tick.state === 'seen' ? <Eye size={12} /> : message.tick.state === 'delivered' ? '✓✓' : '✓'}
                </span>
              ) : null}
            </div>
            <div className={`pointer-events-none absolute bottom-0 h-[22px] w-[30px] ${isOwn ? '-right-[10px]' : '-left-[10px]'}`}>
              <svg
                viewBox="0 0 30 22"
                className="h-full w-full"
                aria-hidden="true"
                style={isOwn ? undefined : { transform: 'scaleX(-1)' }}
              >
                <path
                  d="M2 2C11 2 16 5 19 9C22 13 25 18 29 20C22 20.4 16.4 18.8 11.8 15.4C7.6 12.2 4.4 8 2 2Z"
                  fill={tailFillColor}
                  stroke={tailStrokeColor}
                  strokeWidth="1"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <MessageActionModal
        open={editOpen}
        title="Edit message"
        description="Update your message below."
        onClose={() => setEditOpen(false)}
      >
        <div className="space-y-4">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
            placeholder="Write your message..."
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const trimmed = editValue.trim();
                if (!trimmed) return;
                onEdit?.(trimmed);
                setEditOpen(false);
              }}
              disabled={!editValue.trim().length}
              className="rounded-xl border border-brand-red/30 bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </MessageActionModal>

      <MessageActionModal
        open={deleteOpen}
        title="Delete message"
        description="Are you sure you want to delete this message?"
        onClose={() => setDeleteOpen(false)}
      >
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteOpen(false)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete?.();
              setDeleteOpen(false);
            }}
            className="rounded-xl border border-red-300 bg-red-300 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-400"
          >
            Delete
          </button>
        </div>
      </MessageActionModal>
    </>
  );
}

