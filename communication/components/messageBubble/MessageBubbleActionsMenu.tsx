import React from 'react';
import {
  CheckSquare,
  Copy,
  CornerUpLeft,
  Download,
  ExternalLink,
  Forward,
  MoreVertical,
  PencilLine,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';
import { ChatMessage } from '../../types';
import { apiExportPollResults } from '../../api';

export type MessageBubbleActionsMenuProps = {
  menuRef: React.RefObject<HTMLDivElement | null>;
  isOwn: boolean;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  menuPlacement: 'top' | 'bottom' | 'inside';
  message: ChatMessage;
  canCopyMessage: boolean;
  canManagePollActions: boolean;
  isPinned: boolean;
  isImageAttachment: boolean;
  canOpenAttachment: boolean;
  onReply?: () => void;
  onSelect?: () => void;
  onForward?: () => void;
  onPin?: () => void;
  onEdit?: () => void;
  onClosePoll?: () => Promise<void>;
  handleCopyMessage: () => void | Promise<void>;
  triggerOpen: () => void;
  setDeleteOpen: (open: boolean) => void;
};

export function MessageBubbleActionsMenu({
  menuRef,
  isOwn,
  menuOpen,
  setMenuOpen,
  menuPlacement,
  message,
  canCopyMessage,
  canManagePollActions,
  isPinned,
  isImageAttachment,
  canOpenAttachment,
  onReply,
  onSelect,
  onForward,
  onPin,
  onEdit,
  onClosePoll,
  handleCopyMessage,
  triggerOpen,
  setDeleteOpen,
}: MessageBubbleActionsMenuProps) {
  return (
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
  );
}
