import React from 'react';
import { Loader2 } from 'lucide-react';
import { MessageActionModal } from '../MessageActionModal';
import { ChatMessage } from '../../types';

export function MessageDeleteModal({
  open,
  message,
  deletingMessage,
  onClose,
  onConfirm,
}: {
  open: boolean;
  message: ChatMessage;
  deletingMessage: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <MessageActionModal
      open={open}
      title={message.type === 'poll' ? 'Delete poll' : 'Delete message'}
      description={
        message.type === 'poll'
          ? 'Are you sure you want to delete this poll?'
          : 'Are you sure you want to delete this message?'
      }
      onClose={onClose}
    >
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {deletingMessage ? 'Close' : 'Cancel'}
        </button>
        <button
          type="button"
          onClick={onConfirm}
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
  );
}
