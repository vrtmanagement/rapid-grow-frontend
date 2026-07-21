import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, CheckSquare, Copy, CornerUpLeft, Download, ExternalLink, Eye, FileText, Forward, Loader2, MoreVertical, PencilLine, Pin, PinOff, Trash2, X } from 'lucide-react';
import { ChatMessage, ChatUser } from '../types';
import { MessageActionModal } from './MessageActionModal';
import { apiDownloadCommunicationFile, apiExportPollResults } from '../api';
import { getDisplayAvatarUrl } from '../../utils/avatar';
import { MessageSelectionCheckbox } from './forward/MessageSelectionCheckbox';
import { PollMessage } from './PollMessage';
import { usePollStore } from '../stores/usePollStore';
import { BundledAttachments } from './BundledAttachments';

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

function getFileExtension(fileName: string) {
  const normalized = String(fileName || '').trim();
  if (!normalized.includes('.')) return '';
  return normalized.split('.').pop()?.toUpperCase().slice(0, 5) || '';
}

function getAttachmentKind(fileName: string, mimeType: string) {
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

function getCopyableMessageText(message: ChatMessage): string {
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

async function copyMessageText(text: string): Promise<boolean> {
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

function renderLinkedText(text: string) {
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

export function MessageBubble({
  message,
  isOwn,
  sender,
  showSenderName,
  selected = false,
  selectionVisible = false,
  onToggleSelect,
  onEdit,
  onDelete,
  onReply,
  onForward,
  onSelect,
  onPin,
  onVotePoll,
  onClosePoll,
  onDeletePoll,
  isPinned = false,
  resolveUserName,
  currentUserRole,
  groupPosition = 'single',
  bundledMessages,
  onPreviewSender,
}: {
  message: ChatMessage;
  isOwn: boolean;
  sender: ChatUser | null;
  showSenderName?: boolean;
  selected?: boolean;
  selectionVisible?: boolean;
  onToggleSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  onReply?: () => void;
  onForward?: () => void;
  onSelect?: () => void;
  onPin?: () => void;
  onVotePoll?: (optionIds: string[]) => Promise<void>;
  onClosePoll?: () => Promise<void>;
  onDeletePoll?: () => Promise<void>;
  isPinned?: boolean;
  resolveUserName?: (userId: string) => string;
  currentUserRole?: string;
  groupPosition?: 'single' | 'first' | 'middle' | 'last';
  /** When set (length > 1), render all attachments + one caption in a single bubble */
  bundledMessages?: ChatMessage[];
  onPreviewSender?: (sender: ChatUser) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom' | 'inside'>('top');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [actionLoading, setActionLoading] = useState<null | 'download'>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const deleteInFlightRef = useRef(false);
  const pendingVotePollIds = usePollStore((state) => state.pendingVotePollIds);
  const setPendingVote = usePollStore((state) => state.setPendingVote);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!imagePreviewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setImagePreviewOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [imagePreviewOpen]);

  useEffect(() => {
    if (!contextMenu) return;
    const closeContextMenu = () => setContextMenu(null);
    window.addEventListener('click', closeContextMenu);
    window.addEventListener('scroll', closeContextMenu, true);
    window.addEventListener('resize', closeContextMenu);
    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('scroll', closeContextMenu, true);
      window.removeEventListener('resize', closeContextMenu);
    };
  }, [contextMenu]);

  const bubbleBase = message.deleted
    ? 'bg-slate-100 text-slate-500 border-slate-200 shadow-none'
    : isOwn
      ? 'bg-[#f0f7ff] text-slate-900 border-[#dbeafe] shadow-none'
      : 'bg-white text-slate-900 border-slate-200 shadow-none';
  const isFirstInGroup = groupPosition === 'single' || groupPosition === 'first';
  const isLastInGroup = groupPosition === 'single' || groupPosition === 'last';
  const showAvatar = isOwn ? isLastInGroup : isFirstInGroup;
  const showTail = isOwn ? isLastInGroup : isFirstInGroup;
  const bubbleShapeClass = isOwn
    ? `rounded-2xl ${isLastInGroup ? 'rounded-br-sm' : 'rounded-r-lg'}`
    : `rounded-2xl ${isFirstInGroup ? 'rounded-tl-sm' : 'rounded-l-lg'}`;

  const timeTone = 'text-slate-500';
  const bundleItems = Array.isArray(bundledMessages) && bundledMessages.length > 1 ? bundledMessages : null;
  const bundleCaption =
    bundleItems
      ?.map((item) => String(item.content || '').trim())
      .find((text) => text.length > 0) || '';
  const directFileUrl = message.fileUrl || message.attachment?.url || '#';
  const attachmentName = message.attachment?.fileName || 'Attachment';
  const attachmentMimeType = message.attachment?.mimeType || '';
  const attachmentMeta = getAttachmentKind(attachmentName, attachmentMimeType);
  const isImageAttachment = attachmentMeta.category === 'image';
  const isVideoAttachment = attachmentMeta.category === 'video';
  const isAudioAttachment = attachmentMeta.category === 'audio';
  const attachmentSize = formatAttachmentSize(message.attachment?.size);
  const hasDownloadTarget = !!String(message.attachment?.fileId || '').trim() || directFileUrl !== '#';
  const canOpenAttachment = directFileUrl !== '#';
  const copyableText = bundleCaption || getCopyableMessageText(message);
  const canCopyMessage = !message.deleted && copyableText.length > 0;
  const canManagePollActions =
    !!message.poll &&
    (isOwn || ['ADMIN', 'SUPER_ADMIN', 'TEAM_LEAD'].includes(String(currentUserRole || '')));
  const pendingVote = message.poll ? !!pendingVotePollIds[message.poll.id] : false;

  const handleCopyMessage = async () => {
    setMenuOpen(false);
    setContextMenu(null);
    if (!canCopyMessage) return;
    await copyMessageText(copyableText);
  };

  const closeDeleteModal = () => {
    // Closing while delete is in flight keeps the request running in the background.
    setDeleteOpen(false);
  };

  const handleConfirmDelete = () => {
    if (deleteInFlightRef.current || deletingMessage) return;
    deleteInFlightRef.current = true;
    setDeletingMessage(true);

    const deletePromise =
      message.type === 'poll'
        ? Promise.resolve(onDeletePoll?.())
        : Promise.resolve(onDelete?.());

    void deletePromise
      .catch((error) => {
        console.warn('Failed to delete message', error);
      })
      .finally(() => {
        deleteInFlightRef.current = false;
        setDeletingMessage(false);
        setDeleteOpen(false);
      });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const calculateMenuPlacement = () => {
      const trigger = menuRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();

      let itemCount = 5; // Reply, Select, Forward, Copy, Pin
      if (isImageAttachment && canOpenAttachment) itemCount += 1;
      if (isOwn) itemCount += 2; // Edit, Delete
      const menuHeight = itemCount * 34 + 12;
      const spacing = 8;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      const fitsBelow = spaceBelow >= menuHeight + spacing;
      const fitsAbove = spaceAbove >= menuHeight + spacing;

      if (fitsBelow && (!fitsAbove || spaceBelow >= spaceAbove)) {
        setMenuPlacement('bottom');
      } else if (fitsAbove) {
        setMenuPlacement('top');
      } else if (fitsBelow) {
        setMenuPlacement('bottom');
      } else {
        setMenuPlacement(spaceBelow >= spaceAbove ? 'bottom' : 'top');
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
  }, [menuOpen, isOwn, isImageAttachment, canOpenAttachment]);

  const triggerDownload = async () => {
    if (!hasDownloadTarget) return;
    setActionLoading('download');
    try {
      if (message.attachment?.fileId) {
        await apiDownloadCommunicationFile(message.attachment.fileId, attachmentName || 'file');
        return;
      }

      const link = document.createElement('a');
      link.href = directFileUrl;
      link.download = attachmentName || 'file';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download communication attachment', error);
      window.alert(error instanceof Error ? error.message : 'Failed to download attachment');
    } finally {
      window.setTimeout(() => setActionLoading(null), 400);
    }
  };

  const triggerOpen = () => {
    if (!canOpenAttachment) return;
    window.open(directFileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div
        className={`group my-1.5 flex w-full ${isOwn ? 'justify-end' : 'justify-start'} transition-all duration-200 ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        } ${menuOpen ? 'relative z-[200]' : ''} ${
          selectionVisible && !message.deleted ? 'cursor-pointer' : ''
        }`}
        onClick={(event) => {
          if (!selectionVisible || message.deleted) return;
          const target = event.target as HTMLElement;
          if (target.closest('a, button, input, textarea, video, audio, [role="button"]')) return;
          onToggleSelect?.();
        }}
      >
        <div className={`flex max-w-[86%] gap-2 ${isOwn ? 'flex-row-reverse items-end' : 'flex-row items-start'}`}>
          <button
            type="button"
            disabled={!sender || !showAvatar}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (selectionVisible && !message.deleted) {
                onToggleSelect?.();
                return;
              }
              if (sender) {
                onPreviewSender?.(sender);
              }
            }}
            className={`h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm disabled:cursor-default ${showAvatar ? 'opacity-100' : 'opacity-0'} ${isOwn ? 'mb-1' : 'mt-0.5'} ${
              selectionVisible && !message.deleted ? 'cursor-pointer' : sender ? 'cursor-pointer' : ''
            }`}
            title={sender?.name || 'User'}
            aria-label={sender?.name ? `${sender.name} profile` : 'User profile'}
          >
            <img
              src={getDisplayAvatarUrl(sender?.avatar, sender?.name || 'User')}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
          <div className="relative min-w-0">
            {!message.deleted && !selectionVisible ? (
            <div
              className={`absolute top-2.5 z-30 ${isOwn ? 'right-2' : 'left-full ml-2'}`}
              ref={menuRef}
            >
              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-all ${
                  menuOpen
                    ? 'border-slate-200 bg-white text-slate-700 opacity-100 shadow-sm'
                    : 'invisible border-slate-200 bg-white text-slate-600 opacity-0 translate-y-1 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 hover:bg-white'
                }`}
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Message actions"
              >
                <MoreVertical size={14} />
              </button>
              {menuOpen ? (
                <div
                  className={`absolute z-[210] w-[144px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl transition-all duration-100 ${
                    isOwn ? 'right-0' : 'left-0'
                  } ${
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
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onSelect?.();
                    }}
                    disabled={!!message.deleted}
                    className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckSquare size={13} />
                    Select
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onForward?.();
                    }}
                    disabled={!!message.deleted || message.type === 'poll'}
                    className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Forward size={13} />
                    Forward
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleCopyMessage();
                    }}
                    disabled={!canCopyMessage}
                    className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Copy size={13} />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onPin?.();
                    }}
                    disabled={!!message.deleted}
                    className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                    {isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  {message.poll && canManagePollActions && message.poll.isActive ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        void onClosePoll?.();
                      }}
                      className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-amber-700 hover:bg-amber-50"
                    >
                      <PinOff size={13} />
                      Close poll
                    </button>
                  ) : null}
                  {message.poll && canManagePollActions ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        void apiExportPollResults(message.poll!.id);
                      }}
                      className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Download size={13} />
                      Export
                    </button>
                  ) : null}
                  {isImageAttachment && canOpenAttachment ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        triggerOpen();
                      }}
                      className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink size={13} />
                      Open in new tab
                    </button>
                  ) : null}
                  {isOwn ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit?.();
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
                      disabled={!!message.deleted || (message.type === 'poll' && !canManagePollActions)}
                      className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  ) : message.poll && canManagePollActions ? (
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
            ) : null}

            <div
              ref={bubbleRef}
              onContextMenu={(event) => {
                if (message.deleted || selectionVisible) return;
                event.preventDefault();
                setContextMenu({ x: event.clientX, y: event.clientY });
              }}
              className={`communication-message-bubble relative max-w-full border px-3.5 py-2 transition-all duration-200 ${
                selectionVisible && !message.deleted ? 'cursor-pointer' : 'hover:-translate-y-0.5'
              } ${
                selected ? 'ring-2 ring-[#c9daf8] ring-offset-2 ring-offset-[#f6f8fb]' : ''
              } ${bubbleBase} ${bubbleShapeClass} ${isOwn ? `communication-message-bubble-own${message.deleted || selectionVisible ? '' : ' pr-12'}` : 'communication-message-bubble-peer'} ${message.deleted ? 'communication-message-bubble-deleted' : ''}`}
            >
              {selectionVisible && !message.deleted ? (
                <div className={`absolute ${isOwn ? '-left-11 top-3' : '-left-11 top-3'}`}>
                  <MessageSelectionCheckbox
                    checked={selected}
                    visible={selectionVisible}
                    onChange={() => onToggleSelect?.()}
                  />
                </div>
              ) : null}
              {showTail ? (
                <span
                  className={`communication-message-tail absolute h-3 w-3 border ${
                    isOwn
                      ? 'communication-message-tail-own -right-[6px] bottom-3 rounded-br-[10px] border-y border-r border-l-0 border-[#dbeafe] bg-[#f0f7ff]'
                      : 'communication-message-tail-peer -left-[6px] top-3 rounded-bl-[10px] border-y border-l border-r-0 border-slate-200 bg-white'
                  }`}
                  aria-hidden
                />
              ) : null}
              {message.forwarded ? (
                <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Forward size={12} />
                  Forwarded
                </div>
              ) : null}
              {!message.deleted && message.replyTo ? (
                <div className="communication-message-reply mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[10px] font-semibold text-slate-600">
                    Replying to {resolveUserName?.(message.replyTo.senderId) || 'User'}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[12px] text-slate-600">
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
                    <div className="mb-1 text-[11px] font-semibold text-slate-600">{sender.name}</div>
                  ) : null}
                  <div className="whitespace-pre-wrap break-words text-[14px] leading-5">
                    Message deleted
                  </div>
                </>
              )}

              {!message.deleted && message.type === 'text' && (
                <>
                  {showSenderName && !isOwn && sender?.name ? (
                    <div className="mb-1 text-[11px] font-semibold text-slate-600">{sender.name}</div>
                  ) : null}
                  <div className="whitespace-pre-wrap break-words text-[14px] leading-5">
                    {renderLinkedText(message.content)}
                  </div>
                </>
              )}

              {!message.deleted && message.type === 'poll' && message.poll ? (
                <div className="space-y-2">
                  {showSenderName && !isOwn && sender?.name ? (
                    <div className="text-[11px] font-semibold text-slate-600">{sender.name}</div>
                  ) : null}
                  <PollMessage
                    message={message}
                    pendingVote={pendingVote}
                    onVote={async (optionIds) => {
                      if (!message.poll) return;
                      setPendingVote(message.poll.id, true);
                      try {
                        await onVotePoll?.(optionIds);
                      } finally {
                        setPendingVote(message.poll.id, false);
                      }
                    }}
                  />
                </div>
              ) : null}

              {!message.deleted && bundleItems ? (
                <div className="space-y-2">
                  {showSenderName && !isOwn && sender?.name ? (
                    <div className="text-[11px] font-semibold text-slate-600">{sender.name}</div>
                  ) : null}
                  <BundledAttachments
                    messages={bundleItems}
                    caption={bundleCaption}
                    renderLinkedText={renderLinkedText}
                  />
                </div>
              ) : null}

              {!message.deleted && !bundleItems && (message.type === 'image' || message.type === 'file' || message.type === 'attachment') && (message.attachment || message.fileUrl) ? (
                <div className="space-y-2">
                  {showSenderName && !isOwn && sender?.name ? (
                    <div className="text-[11px] font-semibold text-slate-600">{sender.name}</div>
                  ) : null}

                  {isImageAttachment ? (
                    <div className="relative w-full max-w-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_26px_rgba(15,23,42,0.10)]">
                      <div className="group/image relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (canOpenAttachment && !message.pending) {
                              setImagePreviewOpen(true);
                            }
                          }}
                          className="block w-full cursor-zoom-in"
                          aria-label={`Preview ${attachmentName}`}
                          disabled={!canOpenAttachment || !!message.pending}
                        >
                          <img
                            src={message.localPreviewUrl || directFileUrl}
                            alt={attachmentName}
                            className="h-44 w-full bg-slate-100 object-cover"
                          />
                        </button>
                        {message.pending ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow">
                              <Loader2 size={12} className="animate-spin text-brand-red" />
                              Uploading…
                            </span>
                          </div>
                        ) : null}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent opacity-0 transition-opacity duration-200 group-hover/image:opacity-100" />
                        <div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 transition-all duration-200 group-hover/image:opacity-100">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void triggerDownload();
                            }}
                            title={`Download ${attachmentName}`}
                            aria-label={`Download ${attachmentName}`}
                            disabled={!hasDownloadTarget || actionLoading === 'download'}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/95 text-slate-700 shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoading === 'download' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-3 py-2.5 text-slate-900">
                        <div className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold tracking-[0.18em] ${attachmentMeta.badgeClass}`}>
                          {attachmentMeta.badge}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold">{attachmentName}</div>
                          <div className="text-[11px] text-slate-500">
                            {[attachmentMeta.label, attachmentSize].filter(Boolean).join(' | ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {isVideoAttachment ? (
                    <div className="relative w-full max-w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_26px_rgba(15,23,42,0.10)]">
                      <video
                        src={message.localPreviewUrl || directFileUrl}
                        controls={!message.pending}
                        preload="metadata"
                        className="h-52 w-full bg-slate-950 object-cover"
                      />
                      {message.pending ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow">
                            <Loader2 size={12} className="animate-spin text-brand-red" />
                            Uploading…
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-3 px-3 py-3 text-slate-900">
                        <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${attachmentMeta.iconClass}`}>
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold">{attachmentName}</div>
                          <div className="text-[11px] text-slate-500">
                            {[attachmentMeta.label, attachmentSize].filter(Boolean).join(' | ')}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={triggerOpen}
                            disabled={!canOpenAttachment}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                            title={`Open ${attachmentName}`}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={triggerDownload}
                            disabled={!hasDownloadTarget || actionLoading === 'download'}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                            title={`Download ${attachmentName}`}
                          >
                            {actionLoading === 'download' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {isAudioAttachment ? (
                    <div className="w-full min-w-[260px] max-w-[320px] rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                      <div className="mb-3 flex items-center gap-3">
                        <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${attachmentMeta.iconClass}`}>
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-slate-900">{attachmentName}</div>
                          <div className="text-[11px] text-slate-500">
                            {[attachmentMeta.label, attachmentSize].filter(Boolean).join(' | ')}
                          </div>
                        </div>
                      </div>
                      <audio src={directFileUrl} controls className="w-full" preload="metadata" />
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={triggerOpen}
                          disabled={!canOpenAttachment}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Eye size={14} />
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={triggerDownload}
                          disabled={!hasDownloadTarget || actionLoading === 'download'}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading === 'download' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          Download
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {!isImageAttachment && !isVideoAttachment && !isAudioAttachment ? (
                    <div className="relative w-full min-w-[260px] max-w-[340px] rounded-2xl border border-slate-200 bg-white p-3 text-left text-slate-900 shadow-sm">
                      {message.pending ? (
                        <div className="absolute inset-0 z-[1] flex items-center justify-center rounded-2xl bg-white/70">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm">
                            <Loader2 size={12} className="animate-spin text-brand-red" />
                            Uploading…
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-start gap-3">
                        <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${attachmentMeta.iconClass}`}>
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-[13px] font-semibold">{attachmentName}</div>
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.16em] ${attachmentMeta.badgeClass}`}>
                              {attachmentMeta.badge}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {[attachmentMeta.label, attachmentSize].filter(Boolean).join(' | ')}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={triggerDownload}
                              disabled={!hasDownloadTarget || actionLoading === 'download'}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {actionLoading === 'download' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {message.content ? (
                    <div className="whitespace-pre-wrap break-words text-[14px] leading-5">
                      {renderLinkedText(message.content)}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className={`communication-message-time mt-1 flex items-center justify-end gap-1.5 text-[11px] leading-none ${timeTone}`}>
                {message.pending ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-brand-red">
                    <Loader2 size={12} className="animate-spin" />
                    Uploading…
                  </span>
                ) : (
                  <>
                    {!message.deleted && message.editedAt ? (
                      <span className="text-[10px] opacity-80">edited</span>
                    ) : null}
                    <span>{formatTime(message.createdAt)}</span>
                    {isOwn && message.tick ? (
                      <span
                        className={
                          message.tick.state === 'seen'
                            ? 'inline-flex items-center text-blue-600'
                            : message.tick.state === 'delivered'
                              ? 'inline-flex items-center text-slate-400'
                              : 'inline-flex items-center text-slate-400'
                        }
                        title={`Status: ${message.tick.state}`}
                      >
                        {message.tick.state === 'seen' ? <Eye size={12} /> : message.tick.state === 'delivered' ? <CheckCheck size={13} /> : <Check size={13} />}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <MessageActionModal
        open={deleteOpen}
        title={message.type === 'poll' ? 'Delete poll' : 'Delete message'}
        description={
          message.type === 'poll'
            ? 'Are you sure you want to delete this poll?'
            : 'Are you sure you want to delete this message?'
        }
        onClose={closeDeleteModal}
      >
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeDeleteModal}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {deletingMessage ? 'Close' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deletingMessage}
            className={`inline-flex min-w-[5.5rem] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              deletingMessage
                ? 'cursor-wait border-red-300 bg-red-300 text-red-900'
                : 'border-red-300 bg-red-300 text-red-900 hover:bg-red-400'
            }`}
          >
            {deletingMessage ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </MessageActionModal>

      {isImageAttachment && canOpenAttachment && imagePreviewOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/97 p-4 backdrop-blur-2xl"
          onClick={() => setImagePreviewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${attachmentName}`}
        >
          <div
            className="relative w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setImagePreviewOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white transition hover:bg-black/65"
              aria-label="Close image preview"
            >
              <X size={18} />
            </button>
            <img
              src={directFileUrl}
              alt={attachmentName}
              className="mx-auto block max-h-[90vh] max-w-full object-contain"
            />
          </div>
        </div>
      ) : null}

      {contextMenu ? (
        <div
          className="fixed z-[100] min-w-[168px] overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-[0_24px_50px_rgba(15,23,42,0.18)]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              onReply?.();
            }}
            disabled={!!message.deleted}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CornerUpLeft size={15} />
            Reply
          </button>
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              onSelect?.();
            }}
            disabled={!!message.deleted}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckSquare size={15} />
            Select
          </button>
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              onForward?.();
            }}
            disabled={!!message.deleted || message.type === 'poll'}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Forward size={15} />
            Forward
          </button>
          <button
            type="button"
            onClick={() => {
              void handleCopyMessage();
            }}
            disabled={!canCopyMessage}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Copy size={15} />
            Copy
          </button>
          {isOwn ? (
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                onEdit?.();
              }}
              disabled={!!message.deleted || message.type !== 'text'}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PencilLine size={15} />
              Edit
            </button>
          ) : null}
          {isOwn ? (
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                setDeleteOpen(true);
              }}
              disabled={!!message.deleted || (message.type === 'poll' && !canManagePollActions)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={15} />
              Delete
            </button>
          ) : message.poll && canManagePollActions ? (
            <>
              {message.poll.isActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                    void onClosePoll?.();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50"
                >
                  <PinOff size={15} />
                  Close poll
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  void apiExportPollResults(message.poll!.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <Download size={15} />
                Export
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  setDeleteOpen(true);
                }}
                disabled={!!message.deleted}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={15} />
                Delete
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
