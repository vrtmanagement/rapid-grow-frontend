import React, { useEffect, useMemo, useState } from 'react';
import { useCommunication } from '../context/useCommunication';
import { AvatarPreviewEntity, AvatarPreviewModal } from '../components/AvatarPreviewModal';
import { ChatSidebar } from '../components/ChatSidebar';
import { ChatMessages } from '../components/ChatMessages';
import { ChatComposer } from '../components/ChatComposer';
import { Mail } from 'lucide-react';
import { ChatMessage, ChatUser } from '../types';

function CommunicationHeaderSkeleton() {
  return (
    <div className="h-16 border-b border-slate-200 bg-white px-5 flex items-center justify-between gap-4 animate-pulse">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200" />
        <div className="space-y-2">
          <div className="h-4 w-36 rounded-full bg-slate-200" />
          <div className="h-3 w-28 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="h-3 w-20 rounded-full bg-slate-100" />
    </div>
  );
}

function CommunicationMobileSkeleton() {
  return (
    <div className="lg:hidden border-b border-slate-200 bg-white px-3 py-2 animate-pulse">
      <div className="mb-2 h-3 w-12 rounded-full bg-slate-200" />
      <div className="flex gap-2 overflow-hidden pb-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`mobile-team-skeleton-${index}`} className="h-9 w-24 rounded-full bg-slate-100 border border-slate-200" />
        ))}
      </div>
      <div className="mt-3 flex gap-2 overflow-hidden pb-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`mobile-people-skeleton-${index}`} className="h-9 w-20 rounded-full bg-slate-100 border border-slate-200" />
        ))}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-1.5 w-1.5 rounded-full bg-emerald-500/80 animate-bounce"
          style={{
            animationDelay: `${dot * 0.15}s`,
            animationDuration: '0.9s',
          }}
        />
      ))}
    </span>
  );
}

function CommunicationLayout() {
  const ctx = useCommunication();
  const { currentUser, users, conversations, usersLoading, conversationsLoading, selectedConversationKey, selectedConversation, messages, messagesLoading } = ctx;
  const communicationLoading = usersLoading || conversationsLoading;

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
  const liveSelectedDmUser =
    selectedConversation?.type === 'dm' && selectedConversation.otherUser
      ? usersById.get(selectedConversation.otherUser.id) || selectedConversation.otherUser
      : null;
  const activeDmTypingUserName =
    selectedConversation?.type === 'dm'
      ? typingUserNames[0] || null
      : null;

  const selectedTitle = selectedConversation?.title || 'Select a conversation';
  const canCompose = !!currentUser && !!selectedConversationKey;
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [previewEntity, setPreviewEntity] = useState<AvatarPreviewEntity | null>(null);
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
            loading={communicationLoading}
            selectedConversationKey={selectedConversationKey}
            onSelectTeam={(conversationKey) => ctx.joinByConversationKey(conversationKey)}
            onStartDmWithUser={(uid) => ctx.startDmWithUser(uid)}
            onCreateTeam={(name, memberIds) => ctx.createTeam(name, memberIds)}
            onUpdateTeam={(conversationKey, payload) => ctx.updateTeam(conversationKey, payload)}
            onDeleteTeam={(conversationKey) => ctx.deleteTeam(conversationKey)}
            onPreviewUser={(user) =>
              setPreviewEntity({
                name: user.name,
                avatar: user.avatar,
                subtitle: user.online ? 'Online now' : 'Offline',
              })
            }
            onPreviewTeamAvatar={(team) =>
              setPreviewEntity({
                name: team.title,
                avatar: team.avatar,
                subtitle: 'Team',
              })
            }
          />
        ) : null}

        <div className="flex-1 flex flex-col min-w-0">
          {ctx.error ? (
            <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {ctx.error}
            </div>
          ) : null}

          {/* Mobile pickers */}
          {communicationLoading ? (
            <CommunicationMobileSkeleton />
          ) : (
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
                      <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                        {c.avatar ? (
                          <img
                            src={c.avatar}
                            alt={c.title}
                            className="h-full w-full cursor-pointer object-cover"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewEntity({ name: c.title, avatar: c.avatar, subtitle: 'Team' });
                            }}
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase text-slate-500">
                            {(c.title || 'T').slice(0, 1)}
                          </span>
                        )}
                      </span>
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
                        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-brand-red px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                          {dm.unreadCount}
                        </span>
                      ) : null;
                    })()}
                  </button>
                ))}
            </div>
          </div>
          )}

          {/* Header */}
          {communicationLoading ? (
            <CommunicationHeaderSkeleton />
          ) : (
          <div className="h-16 border-b border-slate-200 bg-white px-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                {selectedConversation?.type === 'dm' && liveSelectedDmUser ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewEntity(
                        liveSelectedDmUser
                          ? {
                              name: liveSelectedDmUser.name,
                              avatar: liveSelectedDmUser.avatar,
                              subtitle: liveSelectedDmUser.online ? 'Online now' : 'Offline',
                            }
                          : null
                      )
                    }
                    className="w-10 h-10 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0"
                  >
                    <img
                      src={
                        liveSelectedDmUser.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(liveSelectedDmUser.name.replace(/\s/g, ''))}`
                      }
                      alt={liveSelectedDmUser.name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedConversation?.type !== 'channel') return;
                      setPreviewEntity({
                        name: selectedConversation.title,
                        avatar: selectedConversation.avatar,
                        subtitle: 'Team',
                      });
                    }}
                    className="w-10 h-10 rounded-2xl border border-brand-red/20 overflow-hidden bg-brand-red/10 flex items-center justify-center"
                  >
                    {selectedConversation?.type === 'channel' && selectedConversation.avatar ? (
                      <img src={selectedConversation.avatar} alt={selectedConversation.title} className="h-full w-full object-cover" />
                    ) : (
                      <Mail size={18} className="text-brand-red" />
                    )}
                  </button>
                )}
                <div className="min-w-0">
                  <div className="text-lg font-bold text-slate-900 truncate">{selectedTitle}</div>
                  <div className="text-xs text-slate-500">
                    {selectedConversation?.type === 'dm' && liveSelectedDmUser ? (
                      activeDmTypingUserName ? (
                        <div className="inline-flex max-w-full items-center gap-2 truncate text-emerald-600">
                          <span className="truncate">{activeDmTypingUserName} is typing</span>
                          <TypingDots />
                        </div>
                      ) : liveSelectedDmUser.online ? (
                        <>
                          Online <span aria-hidden="true">&bull;</span> {liveSelectedDmUser.name}
                        </>
                      ) : (
                        <>
                          Offline <span aria-hidden="true">&bull;</span> {liveSelectedDmUser.name}
                        </>
                      )
                    ) : selectedConversation?.type === 'channel' ? (
                      <>
                        Team <span aria-hidden="true">&bull;</span> {selectedConversation.title}
                      </>
                    ) : (
                      <>Pick a chat from the left</>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-right">
              {selectedConversation?.type === 'channel' ? (
                <div className="text-xs text-slate-500">Online now: {selectedConversation.onlineCount ?? 0}</div>
              ) : null}
            </div>
          </div>
          )}

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

      <AvatarPreviewModal
        open={!!previewEntity}
        entity={previewEntity}
        onClose={() => setPreviewEntity(null)}
      />
    </div>
  );
}

export default function CommunicationView() {
  return <CommunicationLayout />;
}
