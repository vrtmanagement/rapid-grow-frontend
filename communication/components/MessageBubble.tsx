import React, { useEffect, useRef, useState } from 'react';
import { Download, Eye, ExternalLink, FileText, Loader2, MoreVertical, PencilLine, Trash2 } from 'lucide-react';
import { ChatMessage, ChatUser } from '../types';
import { MessageActionModal } from './MessageActionModal';
import { API_BASE } from '../../config/api';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function MessageBubble({
  message,
  isOwn,
  sender,
  showSenderName,
  onEdit,
  onDelete,
}: {
  message: ChatMessage;
  isOwn: boolean;
  sender: ChatUser | null;
  showSenderName?: boolean;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom' | 'inside'>('top');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editValue, setEditValue] = useState(message.content || '');
  const [mounted, setMounted] = useState(false);
  const [actionLoading, setActionLoading] = useState<null | 'open' | 'download'>(null);
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

  const bubbleBase = isOwn
    ? 'bg-brand-red text-white border-brand-red/20 shadow-[0_8px_24px_rgba(236,72,71,0.15)]'
    : 'bg-white text-slate-900 border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.06)]';

  const timeTone = isOwn ? 'text-white/80' : 'text-slate-500';
  const directFileUrl = message.fileUrl || message.attachment?.url || '#';
  const downloadUrl = message.attachment?.fileId
    ? `${API_BASE}/communication/files/${encodeURIComponent(message.attachment.fileId)}`
    : directFileUrl;
  const openUrl = message.attachment?.fileId
    ? `${API_BASE}/communication/files/${encodeURIComponent(message.attachment.fileId)}?download=0`
    : directFileUrl;

  const triggerOpen = () => {
    setActionLoading('open');
    window.open(openUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => setActionLoading(null), 1200);
  };

  const triggerDownload = () => {
    setActionLoading('download');
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = message.attachment?.fileName || 'file';
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
          {isOwn ? (
            <div className="absolute right-2 top-2 z-30" ref={menuRef}>
              <button
                type="button"
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
                  menuOpen
                    ? 'opacity-100 border-white/30 text-white bg-black/20'
                    : 'opacity-0 group-hover:opacity-100 border-white/30 text-white/90 bg-black/10 hover:bg-black/20'
                }`}
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Message actions"
              >
                <MoreVertical size={14} />
              </button>
              {menuOpen ? (
                <div
                  className={`absolute right-0 z-[90] w-[104px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl transition-all duration-100 ${
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
                      setEditOpen(true);
                    }}
                    disabled={!!message.deleted || message.type !== 'text'}
                    className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <PencilLine size={13} />
                    Edit
                  </button>
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
                </div>
              ) : null}
            </div>
          ) : null}

          <div ref={bubbleRef} className={`relative max-w-[78vw] rounded-3xl border ${bubbleBase} px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 ${isOwn ? 'pr-12' : ''}`}>

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
              {(message.type === 'image' || message.attachment?.mimeType.startsWith('image/')) ? (
                <div className="group/image relative inline-block">
                  <img
                    src={message.fileUrl || message.attachment?.url || ''}
                    alt={message.attachment?.fileName || 'Image'}
                    className="max-h-72 w-auto rounded-xl bg-white border border-slate-200 object-contain cursor-pointer"
                    onClick={triggerDownload}
                    title="Click to download image"
                  />
                  <button
                    type="button"
                    onClick={triggerDownload}
                    title="Download image"
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm opacity-0 transition-opacity group-hover/image:opacity-100"
                  >
                    {actionLoading === 'download' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  </button>
                </div>
              ) : null}

              {(message.type === 'image' || message.attachment?.mimeType.startsWith('image/')) ? null : (
                <div className={`rounded-xl border px-3 py-2 ${isOwn ? 'border-white/20 bg-white/10' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center gap-2">
                    <FileText size={16} className={isOwn ? 'text-white/90' : 'text-slate-600'} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                      {message.attachment?.fileName || 'Attachment'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                        isOwn ? 'bg-white/20 text-white hover:bg-white/25' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                      onClick={triggerOpen}
                      disabled={actionLoading === 'open'}
                    >
                      {actionLoading === 'open' ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                      Open
                    </button>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                        isOwn ? 'bg-white/20 text-white hover:bg-white/25' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                      onClick={triggerDownload}
                      disabled={actionLoading === 'download'}
                    >
                      {actionLoading === 'download' ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Download
                    </button>
                  </div>
                </div>
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
            className="rounded-xl border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </MessageActionModal>
    </>
  );
}

