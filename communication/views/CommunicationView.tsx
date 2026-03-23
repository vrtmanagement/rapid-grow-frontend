import React, { useEffect, useMemo, useState } from 'react';
import { CommunicationProvider, useCommunication } from '../context/CommunicationContext';
import { ChatSidebar } from '../components/ChatSidebar';
import { ChatMessages } from '../components/ChatMessages';
import { ChatComposer } from '../components/ChatComposer';
import { Mail } from 'lucide-react';
import { ChatMessage } from '../types';

function CommunicationLayout() {
  const ctx = useCommunication();
  const { currentUser, users, conversations, usersLoading, conversationsLoading, selectedConversationKey, selectedConversation, messages, messagesLoading } = ctx;

  const convByKey = useMemo(() => {
    return new Map(conversations.map((c) => [c.conversationKey, c] as const));
  }, [conversations]);

  const usersById = useMemo(() => {
    const map = new Map<string, any>();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  const typingUserNames = useMemo(() => {
    return Object.keys(ctx.typingUserIds)
      .map((id) => usersById.get(id)?.name)
      .filter(Boolean) as string[];
  }, [ctx.typingUserIds, usersById]);

  const selectedTitle = selectedConversation?.title || 'Select a conversation';
  const canCompose = !!currentUser && !!selectedConversationKey;
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  useEffect(() => {
    setReplyToMessage(null);
  }, [selectedConversationKey]);

  const resolveUserName = (userId: string) => usersById.get(userId)?.name || 'User';

  return (
    <div className="h-[calc(100%+8rem)] w-[calc(100%+8rem)] -mx-16 -my-16 bg-white overflow-hidden">
      <div className="h-full flex">
        {currentUser ? (
          <ChatSidebar
            currentUserId={currentUser.id}
            currentUserRole={currentUser.role}
            users={users}
            conversations={conversations}
            selectedConversationKey={selectedConversationKey}
            onSelectTeam={(conversationKey) => ctx.joinByConversationKey(conversationKey)}
            onStartDmWithUser={(uid) => ctx.startDmWithUser(uid)}
            onCreateTeam={(name, memberIds) => ctx.createTeam(name, memberIds)}
            onUpdateTeam={(conversationKey, payload) => ctx.updateTeam(conversationKey, payload)}
            onDeleteTeam={(conversationKey) => ctx.deleteTeam(conversationKey)}
          />
        ) : null}

        <div className="flex-1 flex flex-col min-w-0">
          {ctx.error ? (
            <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {ctx.error}
            </div>
          ) : null}

          {/* Mobile pickers */}
          <div className="lg:hidden border-b border-slate-200 bg-white px-3 py-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Teams</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {conversations.filter((c) => c.type === 'channel').map((c) => {
                const conversationKey = c.conversationKey;
                const active = selectedConversationKey === conversationKey;
                const unreadCount = convByKey.get(conversationKey)?.unreadCount || 0;
                return (
                  <button
                    key={conversationKey}
                    type="button"
                    onClick={() => ctx.joinByConversationKey(conversationKey)}
                    className={`shrink-0 px-3 py-2 rounded-full border text-sm font-semibold transition-all ${
                      active ? 'bg-brand-red/10 border-brand-red/30 text-brand-red ring-1 ring-brand-red/20' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{c.title}</span>
                      {unreadCount > 0 ? <span className="w-2.5 h-2.5 rounded-full bg-brand-red inline-block" aria-hidden /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 mt-2">
              {currentUser ? (
                <button
                  key="self-mobile-chat"
                  type="button"
                  onClick={() => ctx.startDmWithUser(currentUser.id)}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition-all border-slate-200 hover:bg-slate-50"
                  title={`${currentUser.name} (You)`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="max-w-28 truncate">You</span>
                </button>
              ) : null}
              {users
                .filter((u) => currentUser && u.id !== currentUser.id)
                .slice(0, 12)
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => ctx.startDmWithUser(u.id)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition-all ${
                      (selectedConversationKey && selectedConversationKey.startsWith('dm:')) ? '' : ''
                    } border-slate-200 hover:bg-slate-50`}
                    title={u.name}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${u.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="max-w-28 truncate">{u.name.split(' ')[0]}</span>
                    {(() => {
                      const dm = conversations.find((c) => c.type === 'dm' && c.otherUser?.id === u.id);
                      return dm && (dm.unreadCount || 0) > 0 ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-red inline-block" aria-hidden />
                      ) : null;
                    })()}
                  </button>
                ))}
            </div>
          </div>

          {/* Header */}
          <div className="h-16 border-b border-slate-200 bg-white px-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center">
                  <Mail size={18} className="text-brand-red" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-slate-900 truncate">{selectedTitle}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {selectedConversation?.type === 'dm' && selectedConversation.otherUser ? (
                      selectedConversation.otherUser.online ? (
                        <>Online • {selectedConversation.otherUser.name}</>
                      ) : (
                        <>Offline • {selectedConversation.otherUser.name}</>
                      )
                    ) : selectedConversation?.type === 'channel' ? (
                      <>Team • {selectedConversation.title}</>
                    ) : (
                      <>Pick a chat from the left</>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-right">
              {(usersLoading || conversationsLoading) && <div className="text-xs text-slate-500">Loading...</div>}
              {!usersLoading && !conversationsLoading && selectedConversation?.type === 'channel' ? (
                <div className="text-xs text-slate-500">Online now: {selectedConversation.onlineCount ?? 0}</div>
              ) : null}
            </div>
          </div>

          {/* Messages */}
          {!canCompose ? (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center max-w-md p-10 bg-white rounded-3xl border border-slate-200">
                <div className="text-2xl font-bold text-slate-900">Communication</div>
                <div className="text-slate-600 mt-2">Select a channel or a person to start chatting in real-time.</div>
              </div>
            </div>
          ) : (
            <ChatMessages
              currentUserId={currentUser.id}
              messages={messages}
              messagesLoading={messagesLoading}
              typingUserNames={typingUserNames}
              selectedConversationTitle={selectedConversation?.title || ''}
              isGroupChat={selectedConversation?.type === 'channel'}
              usersById={usersById}
              onEditMessage={(messageId, conversationKey, newContent) => ctx.editMessage(messageId, conversationKey, newContent)}
              onDeleteMessage={(messageId, conversationKey) => ctx.deleteMessage(messageId, conversationKey)}
              onReplyMessage={(message) => setReplyToMessage(message)}
            />
          )}

          {/* Composer */}
          {canCompose ? (
            <ChatComposer
              conversationKey={selectedConversationKey!}
              disabled={messagesLoading}
              notifyTyping={() => ctx.notifyTyping(selectedConversationKey!)}
              onSendText={(content, replyId) => ctx.sendText(selectedConversationKey!, content, replyId)}
              onSendFile={(file, content, replyId) => ctx.sendFile(selectedConversationKey!, file, content, replyId)}
              replyToMessage={replyToMessage}
              onCancelReply={() => setReplyToMessage(null)}
              resolveUserName={resolveUserName}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CommunicationView() {
  return (
    <CommunicationProvider>
      <CommunicationLayout />
    </CommunicationProvider>
  );
}

