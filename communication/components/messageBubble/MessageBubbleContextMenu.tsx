import React from 'react';
import {
  CheckSquare,
  Copy,
  CornerUpLeft,
  Download,
  Forward,
  PencilLine,
  PinOff,
  Trash2,
} from 'lucide-react';
import { ChatMessage } from '../../types';
import { apiExportPollResults } from '../../api';

export type MessageBubbleContextMenuProps = {
  contextMenu: { x: number; y: number };
  setContextMenu: (value: { x: number; y: number } | null) => void;
  message: ChatMessage;
  isOwn: boolean;
  canCopyMessage: boolean;
  canManagePollActions: boolean;
  onReply?: () => void;
  onSelect?: () => void;
  onForward?: () => void;
  onEdit?: () => void;
  onClosePoll?: () => Promise<void>;
  handleCopyMessage: () => void | Promise<void>;
  setDeleteOpen: (open: boolean) => void;
};

export function MessageBubbleContextMenu({
  contextMenu,
  setContextMenu,
  message,
  isOwn,
  canCopyMessage,
  canManagePollActions,
  onReply,
  onSelect,
  onForward,
  onEdit,
  onClosePoll,
  handleCopyMessage,
  setDeleteOpen,
}: MessageBubbleContextMenuProps) {
  return (
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
  );
}
