import React, { useLayoutEffect, useRef } from 'react';
import { ChatMessage, ChatUser } from '../types';
import { MessageBubble } from './MessageBubble';

function ChatMessagesSkeleton() {
  const rows = [
    { align: 'start', width: 'w-56' },
    { align: 'end', width: 'w-40' },
    { align: 'start', width: 'w-64' },
    { align: 'end', width: 'w-48' },
  ];

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div
          key={`chat-message-skeleton-${index}`}
          className={`flex ${row.align === 'end' ? 'justify-end' : 'justify-start'} animate-pulse`}
        >
          <div className="max-w-[75%] space-y-2">
            <div className={`h-4 rounded-full bg-slate-200 ${row.width}`} />
            <div className="h-16 rounded-3xl bg-white border border-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TypingBubble({ label }: { label?: string | null }) {
  return (
    <div className="flex justify-start my-2">
      <div className="relative max-w-[78vw] rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        {label ? (
          <div className="mb-1 text-[11px] font-semibold text-slate-600">{label}</div>
        ) : null}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
              style={{
                animationDelay: `${dot * 0.15}s`,
                animationDuration: '0.9s',
              }}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-[2px] -left-[11px] h-[14px] w-[18px]">
          <svg
            viewBox="0 0 18 14"
            className="h-full w-full"
            aria-hidden="true"
            style={{ transform: 'scaleX(-1)' }}
          >
            <path
              d="M1 1C7 1 9.5 3.4 10.6 6.8C11.6 9.8 13.9 12 17 13C12.3 13.2 8.7 12.3 5.8 10.2C3.3 8.4 1.8 5.8 1 1Z"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function getMessageDateKey(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDateDivider(iso: string) {
  const date = new Date(iso);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayKey = formatter.format(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatter.format(yesterday);
  const messageKey = formatter.format(date);

  if (messageKey === todayKey) return 'Today';
  if (messageKey === yesterdayKey) return 'Yesterday';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

type ChatRenderEntry =
  | { kind: 'single'; message: ChatMessage }
  | { kind: 'bundle'; messages: ChatMessage[]; primary: ChatMessage };

function buildChatRenderEntries(messages: ChatMessage[]): ChatRenderEntry[] {
  const entries: ChatRenderEntry[] = [];
  let index = 0;

  while (index < messages.length) {
    const current = messages[index];
    const bundleId = String(current.bundleId || '').trim();
    if (!bundleId) {
      entries.push({ kind: 'single', message: current });
      index += 1;
      continue;
    }

    const group = [current];
    let cursor = index + 1;
    while (cursor < messages.length && String(messages[cursor].bundleId || '').trim() === bundleId) {
      group.push(messages[cursor]);
      cursor += 1;
    }

    if (group.length === 1) {
      entries.push({ kind: 'single', message: current });
    } else {
      const primary =
        [...group].reverse().find((item) => /\S/.test(String(item.content || ''))) || group[group.length - 1];
      entries.push({ kind: 'bundle', messages: group, primary });
    }
    index = cursor;
  }

  return entries;
}

export function ChatMessages({
  conversationKey,
  currentUserId,
  currentUserRole,
  messages,
  messagesLoading,
  typingUserNames,
  selectedConversationTitle,
  isGroupChat,
  usersById,
  pinnedMessageId,
  selectedMessageIds,
  selectionVisible,
  onToggleSelectMessage,
  onForwardMessage,
  onSelectMessage,
  onPinMessage,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
  onVotePoll,
  onClosePoll,
  onDeletePoll,
}: {
  conversationKey: string;
  currentUserId: string;
  currentUserRole: string;
  messages: ChatMessage[];
  messagesLoading: boolean;
  typingUserNames: string[];
  selectedConversationTitle: string;
  isGroupChat: boolean;
  usersById: Map<string, ChatUser>;
  pinnedMessageId: string | null;
  selectedMessageIds: string[];
  selectionVisible: boolean;
  onToggleSelectMessage: (messageId: string) => void;
  onForwardMessage: (message: ChatMessage) => void;
  onSelectMessage: (message: ChatMessage) => void;
  onPinMessage: (message: ChatMessage) => void;
  onEditMessage: (message: ChatMessage) => void;
  onDeleteMessage: (messageId: string, conversationKey: string) => void | Promise<void>;
  onReplyMessage: (message: ChatMessage) => void;
  onVotePoll: (pollId: string, optionIds: string[]) => Promise<void>;
  onClosePoll: (pollId: string) => Promise<void>;
  onDeletePoll: (pollId: string) => Promise<void>;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (messagesLoading) return;
    endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [conversationKey, messages.length, messagesLoading]);

  return (
    <div className="communication-messages flex-1 overflow-y-auto bg-[#f6f8fb] px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        {messagesLoading ? (
          <ChatMessagesSkeleton />
        ) : messages.length === 0 ? (
          <div className="communication-empty-state rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <div className="text-lg font-semibold text-slate-900">No messages yet</div>
            <div className="text-sm text-slate-500 mt-2">Send the first message to start the conversation.</div>
          </div>
        ) : (
          <div>
            {buildChatRenderEntries(messages).map((entry, entryIndex, entries) => {
              const m = entry.kind === 'bundle' ? entry.primary : entry.message;
              const isOwn = m.senderId === currentUserId;
              const sender = usersById.get(m.senderId) || null;
              const previousEntry = entryIndex > 0 ? entries[entryIndex - 1] : null;
              const nextEntry = entryIndex < entries.length - 1 ? entries[entryIndex + 1] : null;
              const previousMessage = previousEntry
                ? previousEntry.kind === 'bundle'
                  ? previousEntry.primary
                  : previousEntry.message
                : null;
              const nextMessage = nextEntry
                ? nextEntry.kind === 'bundle'
                  ? nextEntry.primary
                  : nextEntry.message
                : null;
              const showDateDivider =
                !previousMessage || getMessageDateKey(previousMessage.createdAt) !== getMessageDateKey(m.createdAt);
              const previousSameSender =
                !!previousMessage &&
                previousMessage.senderId === m.senderId &&
                getMessageDateKey(previousMessage.createdAt) === getMessageDateKey(m.createdAt);
              const nextSameSender =
                !!nextMessage &&
                nextMessage.senderId === m.senderId &&
                getMessageDateKey(nextMessage.createdAt) === getMessageDateKey(m.createdAt);
              const groupPosition = previousSameSender
                ? nextSameSender
                  ? 'middle'
                  : 'last'
                : nextSameSender
                  ? 'first'
                  : 'single';
              const entryKey =
                entry.kind === 'bundle' ? `bundle-${entry.primary.bundleId}-${entry.primary.id}` : m.id;
              return (
                <React.Fragment key={entryKey}>
                  {showDateDivider ? (
                    <div className="sticky top-2 z-[5] my-5 flex justify-center">
                      <span className="communication-date-divider inline-flex min-w-[8rem] items-center justify-center rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
                        {formatDateDivider(m.createdAt)}
                      </span>
                    </div>
                  ) : null}
                  <div id={`message-${m.id}`} className="scroll-mt-24">
                  <MessageBubble
                    message={m}
                    isOwn={isOwn}
                    sender={sender}
                    showSenderName={isGroupChat}
                    selected={selectedMessageIds.includes(m.id)}
                    selectionVisible={selectionVisible}
                    onToggleSelect={() => onToggleSelectMessage(m.id)}
                    groupPosition={groupPosition}
                    bundledMessages={entry.kind === 'bundle' ? entry.messages : undefined}
                    onForward={() => onForwardMessage(m)}
                    onSelect={() => onSelectMessage(m)}
                    onPin={() => onPinMessage(m)}
                    isPinned={pinnedMessageId === m.id}
                    onEdit={() => onEditMessage(m)}
                    onDelete={() => onDeleteMessage(m.id, m.conversationKey)}
                    onReply={() => onReplyMessage(m)}
                    onVotePoll={(optionIds) => (m.poll ? onVotePoll(m.poll.id, optionIds) : Promise.resolve())}
                    onClosePoll={() => (m.poll ? onClosePoll(m.poll.id) : Promise.resolve())}
                    onDeletePoll={() => (m.poll ? onDeletePoll(m.poll.id) : Promise.resolve())}
                    currentUserRole={currentUserRole}
                    resolveUserName={(userId) => usersById.get(userId)?.name || 'User'}
                  />
                  </div>
                </React.Fragment>
              );
            })}
            {typingUserNames.length > 0 ? (
              <TypingBubble label={isGroupChat ? typingUserNames.join(', ') : null} />
            ) : null}
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}

