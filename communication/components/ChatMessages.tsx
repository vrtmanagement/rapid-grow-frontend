import React, { useEffect, useRef } from 'react';
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

export function ChatMessages({
  currentUserId,
  messages,
  messagesLoading,
  typingUserNames,
  selectedConversationTitle,
  isGroupChat,
  usersById,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
}: {
  currentUserId: string;
  messages: ChatMessage[];
  messagesLoading: boolean;
  typingUserNames: string[];
  selectedConversationTitle: string;
  isGroupChat: boolean;
  usersById: Map<string, ChatUser>;
  onEditMessage: (messageId: string, conversationKey: string, newContent: string) => void;
  onDeleteMessage: (messageId: string, conversationKey: string) => void;
  onReplyMessage: (message: ChatMessage) => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6">
      <div className="w-full">
        <div className="mb-4">
          {typingUserNames.length > 0 ? (
            <div className="text-sm text-slate-600">
              {typingUserNames.join(', ')} typing...
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              Chatting in <span className="font-semibold text-slate-700">{selectedConversationTitle}</span>
            </div>
          )}
        </div>

        {messagesLoading ? (
          <ChatMessagesSkeleton />
        ) : messages.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <div className="text-lg font-semibold text-slate-900">No messages yet</div>
            <div className="text-sm text-slate-500 mt-2">Send the first message to start the conversation.</div>
          </div>
        ) : (
          <div>
            {messages.map((m) => {
              const isOwn = m.senderId === currentUserId;
              const sender = usersById.get(m.senderId) || null;
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isOwn={isOwn}
                  sender={sender}
                  showSenderName={isGroupChat}
                  onEdit={(newContent) => onEditMessage(m.id, m.conversationKey, newContent)}
                  onDelete={() => onDeleteMessage(m.id, m.conversationKey)}
                  onReply={() => onReplyMessage(m)}
                  resolveUserName={(userId) => usersById.get(userId)?.name || 'User'}
                />
              );
            })}
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}

