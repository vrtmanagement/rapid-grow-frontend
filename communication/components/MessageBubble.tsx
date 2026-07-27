import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, Eye, Forward, Loader2 } from 'lucide-react';
import { ChatMessage, ChatUser } from '../types';
import { getDisplayAvatarUrl } from '../../utils/avatar';
import { MessageSelectionCheckbox } from './forward/MessageSelectionCheckbox';
import { PollMessage } from './PollMessage';
import { usePollStore } from '../stores/usePollStore';
import { BundledAttachments } from './BundledAttachments';
import { apiDownloadCommunicationFile } from '../api';
import {
  copyMessageText,
  formatAttachmentSize,
  formatTime,
  getAttachmentKind,
  getCopyableMessageText,
  renderLinkedText,
} from './messageBubble/messageBubbleHelpers';
import { MessageBubbleActionsMenu } from './messageBubble/MessageBubbleActionsMenu';
import { MessageBubbleContextMenu } from './messageBubble/MessageBubbleContextMenu';
import { MessageAttachmentContent } from './messageBubble/MessageAttachmentContent';
import { MessageImagePreview } from './messageBubble/MessageImagePreview';
import { MessageDeleteModal } from './messageBubble/MessageDeleteModal';

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
              <MessageBubbleActionsMenu
                menuRef={menuRef}
                isOwn={isOwn}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
                menuPlacement={menuPlacement}
                message={message}
                canCopyMessage={canCopyMessage}
                canManagePollActions={canManagePollActions}
                isPinned={isPinned}
                isImageAttachment={isImageAttachment}
                canOpenAttachment={canOpenAttachment}
                onReply={onReply}
                onSelect={onSelect}
                onForward={onForward}
                onPin={onPin}
                onEdit={onEdit}
                onClosePoll={onClosePoll}
                handleCopyMessage={handleCopyMessage}
                triggerOpen={triggerOpen}
                setDeleteOpen={setDeleteOpen}
              />
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
                <MessageAttachmentContent
                  message={message}
                  isOwn={isOwn}
                  senderName={sender?.name}
                  showSenderName={showSenderName}
                  isImageAttachment={isImageAttachment}
                  isVideoAttachment={isVideoAttachment}
                  isAudioAttachment={isAudioAttachment}
                  attachmentName={attachmentName}
                  attachmentMeta={attachmentMeta}
                  attachmentSize={attachmentSize}
                  directFileUrl={directFileUrl}
                  canOpenAttachment={canOpenAttachment}
                  hasDownloadTarget={hasDownloadTarget}
                  actionLoading={actionLoading}
                  setImagePreviewOpen={setImagePreviewOpen}
                  triggerDownload={triggerDownload}
                  triggerOpen={triggerOpen}
                />
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

      <MessageDeleteModal
        open={deleteOpen}
        message={message}
        deletingMessage={deletingMessage}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
      />

      {isImageAttachment && canOpenAttachment && imagePreviewOpen ? (
        <MessageImagePreview
          attachmentName={attachmentName}
          directFileUrl={directFileUrl}
          onClose={() => setImagePreviewOpen(false)}
        />
      ) : null}

      {contextMenu ? (
        <MessageBubbleContextMenu
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
          message={message}
          isOwn={isOwn}
          canCopyMessage={canCopyMessage}
          canManagePollActions={canManagePollActions}
          onReply={onReply}
          onSelect={onSelect}
          onForward={onForward}
          onEdit={onEdit}
          onClosePoll={onClosePoll}
          handleCopyMessage={handleCopyMessage}
          setDeleteOpen={setDeleteOpen}
        />
      ) : null}
    </>
  );
}
