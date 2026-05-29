import React from 'react';
import { Pin } from 'lucide-react';
import { ChatMessage, ChatPinnedMessage } from '../types';
import { messagePreviewFromMessage } from '../context/communicationContextHelpers';

function pinnedPreview(message: ChatMessage) {
  if (message.deleted) return 'Message deleted';
  return messagePreviewFromMessage(message);
}

export function PinnedMessageBar({
  pinned,
  resolveUserName,
  onJump,
}: {
  pinned: ChatPinnedMessage;
  resolveUserName: (userId: string) => string;
  onJump: () => void;
}) {
  const senderName = resolveUserName(pinned.message.senderId);

  return (
    <button
      type="button"
      onClick={onJump}
      className="flex w-full items-center gap-3 rounded-lg border border-[#d7e5fb] bg-[#eef4ff] px-3.5 py-2 text-left transition hover:bg-[#e6f0ff]"
    >
      <Pin size={16} className="shrink-0 rotate-45 text-rose-600" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-rose-600">Pinned message</div>
        <div className="truncate text-sm text-slate-700">
          <span className="font-medium text-slate-800">{senderName}:</span> {pinnedPreview(pinned.message)}
        </div>
      </div>
    </button>
  );
}
