import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCommunication } from '../context/useCommunication';
import { AvatarPreviewEntity, AvatarPreviewModal } from '../components/AvatarPreviewModal';
import { ChatSidebar } from '../components/ChatSidebar';
import { ChatMessages } from '../components/ChatMessages';
import { ChatComposer } from '../components/ChatComposer';
import { ChatHeaderMenu } from '../components/ChatHeaderMenu';
import { FileUp, Mail } from 'lucide-react';
import { ChatMessage, ChatUser } from '../types';
import { getDisplayAvatarUrl } from '../../utils/avatar';
import Toast from '../../components/ui/Toast';
import { ForwardActionBar } from '../components/forward/ForwardActionBar';
import { ForwardModal } from '../components/forward/ForwardModal';
import { ForwardRecipientOption } from '../components/forward/types';
import { PinnedMessageBar } from '../components/PinnedMessageBar';

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

function getFilesFromDataTransfer(data: DataTransfer | null) {
  if (!data) return [];
  if (data.files?.length) {
    return Array.from(data.files).filter((file) => file.size > 0 || file.name.trim().length > 0);
  }
  const dropped: File[] = [];
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file) dropped.push(file);
  }
  return dropped;
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
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [forwardSelectionMode, setForwardSelectionMode] = useState(false);
  const [forwardModalMessageIds, setForwardModalMessageIds] = useState<string[]>([]);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [previewEntity, setPreviewEntity] = useState<AvatarPreviewEntity | null>(null);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [incomingComposerFiles, setIncomingComposerFiles] = useState<File[] | null>(null);
  const [isChatDragOver, setIsChatDragOver] = useState(false);
  const chatDragDepthRef = useRef(0);
  const canDropFilesOnChat = canCompose && !messagesLoading && !editingMessage && !forwardModalOpen;

  useEffect(() => {
    setReplyToMessage(null);
    setEditingMessage(null);
    setSelectedMessageIds([]);
    setForwardSelectionMode(false);
    setForwardModalMessageIds([]);
    setIncomingComposerFiles(null);
    setIsChatDragOver(false);
    chatDragDepthRef.current = 0;
  }, [selectedConversationKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const resolveUserName = (userId: string) => usersById.get(userId)?.name || 'User';

  const selectedMessages = useMemo(
    () => messages.filter((message) => selectedMessageIds.includes(message.id)),
    [messages, selectedMessageIds]
  );

  const forwardModalMessages = useMemo(
    () => messages.filter((message) => forwardModalMessageIds.includes(message.id)),
    [messages, forwardModalMessageIds]
  );

  const forwardRecipients = useMemo<ForwardRecipientOption[]>(() => {
    const recentConversationOptions: ForwardRecipientOption[] = conversations.map((conversation) => {
      if (conversation.type === 'dm' && conversation.otherUser) {
        return {
          id: `recent-${conversation.conversationKey}`,
          recipientId: `conversation:${conversation.conversationKey}`,
          title: conversation.otherUser.name,
          subtitle: conversation.lastMessagePreview || conversation.otherUser.designation || 'Direct message',
          avatar: conversation.otherUser.avatar || conversation.avatar,
          kind: 'conversation',
          section: 'recent',
          department: conversation.otherUser.department,
        };
      }

      return {
        id: `recent-${conversation.conversationKey}`,
        recipientId: `conversation:${conversation.conversationKey}`,
        title: conversation.title,
        subtitle: conversation.lastMessagePreview || 'Team channel',
        avatar: conversation.avatar,
        kind: 'conversation',
        section: 'recent',
      };
    });

    const channelOptions: ForwardRecipientOption[] = conversations
      .filter((conversation) => conversation.type === 'channel')
      .map((conversation) => ({
        id: `channel-${conversation.conversationKey}`,
        recipientId: `conversation:${conversation.conversationKey}`,
        title: conversation.title,
        subtitle: `${conversation.memberIds?.length || 0} members`,
        avatar: conversation.avatar,
        kind: 'conversation',
        section: 'channels',
      }));

    const employeeOptions: ForwardRecipientOption[] = users
      .filter((user) => user.id !== currentUser?.id)
      .map((user) => ({
        id: `user-${user.id}`,
        recipientId: `user:${user.id}`,
        title: user.name,
        subtitle: [user.designation, user.department].filter(Boolean).join(' • ') || user.role,
        avatar: user.avatar,
        kind: 'user',
        section: 'employees',
        department: user.department,
      }));

    const uniqueByRecipientId = new Map<string, ForwardRecipientOption>();
    [...recentConversationOptions, ...channelOptions, ...employeeOptions].forEach((option) => {
      if (!uniqueByRecipientId.has(option.recipientId)) {
        uniqueByRecipientId.set(option.recipientId, option);
      }
    });
    return Array.from(uniqueByRecipientId.values());
  }, [conversations, currentUser?.id, users]);

  const canDeleteSelected = selectedMessages.some((message) => message.senderId === currentUser?.id);

  const toggleSelectedMessage = (messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((currentId) => currentId !== messageId) : [...prev, messageId]
    );
  };

  const enterForwardSelection = (messageIds: string[]) => {
    const nextIds = Array.from(new Set(messageIds));
    setForwardSelectionMode(true);
    setSelectedMessageIds(nextIds);
  };

  const openForwardForMessages = (messageIds: string[]) => {
    const nextIds = Array.from(new Set(messageIds));
    setForwardModalMessageIds(nextIds);
    setForwardModalOpen(true);
  };

  return (
    <div className="communication-workspace h-full min-h-0 w-full overflow-hidden bg-[#eef2f7]">
      <div className="flex h-full min-h-0">
        {currentUser ? (
          <ChatSidebar
            currentUserId={currentUser.id}
            currentUserRole={currentUser.role}
            users={users}
            conversations={conversations}
            loading={communicationLoading}
            selectedConversationKey={selectedConversationKey}
            selectedConversationType={selectedConversation?.type || null}
            typingUserIds={ctx.typingUserIds}
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

        <div className="flex-1 flex min-h-0 min-w-0 flex-col">
          {ctx.error ? (
            <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {ctx.error}
            </div>
          ) : null}

          {/* Mobile pickers */}
          {communicationLoading ? (
            <CommunicationMobileSkeleton />
          ) : (
          <div className="communication-mobile-picker lg:hidden border-b border-slate-200 bg-white px-3 py-2">
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
                      active ? 'bg-[#eef4ff] border-[#d7e5fb] text-slate-900 ring-1 ring-[#d7e5fb]' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                        {c.avatar ? (
                          <img
                            src={getDisplayAvatarUrl(c.avatar, c.title)}
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
                      {unreadCount > 0 ? <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" aria-hidden /> : null}
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
                  <span className="relative h-7 w-7 shrink-0">
                    <img
                      src={getDisplayAvatarUrl(currentUser.avatar, currentUser.name)}
                      alt=""
                      className="h-7 w-7 rounded-full border border-slate-200 bg-slate-50 object-cover"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                  </span>
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
                    <span className="relative h-7 w-7 shrink-0">
                      <img
                        src={getDisplayAvatarUrl(u.avatar, u.name)}
                        alt=""
                        className="h-7 w-7 rounded-full border border-slate-200 bg-slate-50 object-cover"
                      />
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${u.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </span>
                    <span className="max-w-28 truncate">{u.name.split(' ')[0]}</span>
                    {(() => {
                      const dm = conversations.find((c) => c.type === 'dm' && c.otherUser?.id === u.id);
                      return dm && (dm.unreadCount || 0) > 0 ? (
                        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
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
          <div className="communication-header h-16 border-b border-slate-200 bg-white/95 px-5 flex items-center justify-between gap-4 shadow-sm">
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
                    className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-50 shrink-0 shadow-sm"
                  >
                    <img
                      src={
                        getDisplayAvatarUrl(liveSelectedDmUser.avatar, liveSelectedDmUser.name)
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
                    className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shadow-sm"
                  >
                    {selectedConversation?.type === 'channel' && selectedConversation.avatar ? (
                      <img src={getDisplayAvatarUrl(selectedConversation.avatar, selectedConversation.title)} alt={selectedConversation.title} className="h-full w-full object-cover" />
                    ) : (
                      <Mail size={18} className="text-slate-600" />
                    )}
                  </button>
                )}
                <div className="min-w-0">
                  <div className="text-[16px] font-bold text-slate-900 truncate">{selectedTitle}</div>
                  <div className="text-xs text-slate-500">
                    {selectedConversation?.type === 'dm' && liveSelectedDmUser ? (
                      activeDmTypingUserName ? (
                        <div className="inline-flex max-w-full items-center gap-2 truncate text-emerald-600">
                          <span className="truncate">Typing</span>
                          <TypingDots />
                        </div>
                      ) : liveSelectedDmUser.online ? (
                        <>Online</>
                      ) : (
                        <>Offline</>
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

            <div className="shrink-0 flex items-center gap-2">
              {selectedConversation?.type === 'channel' ? (
                <div className="text-xs text-slate-500 px-3">Online now: {selectedConversation.onlineCount ?? 0}</div>
              ) : null}
              {selectedConversationKey ? (
                <ChatHeaderMenu
                  onClearChat={async () => {
                    if (!selectedConversationKey) return;
                    setIsClearingChat(true);
                    try {
                      await ctx.clearChat(selectedConversationKey);
                    } finally {
                      setIsClearingChat(false);
                    }
                  }}
                  isLoading={isClearingChat}
                />
              ) : null}
            </div>
          </div>
          )}

          {canCompose && ctx.pinnedMessage ? (
            <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-2">
              <PinnedMessageBar
                pinned={ctx.pinnedMessage}
                resolveUserName={resolveUserName}
                onJump={() => {
                  document
                    .getElementById(`message-${ctx.pinnedMessage!.message.id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
            </div>
          ) : null}

          {/* Messages */}
          {!canCompose ? (
            <div className="communication-empty-shell flex-1 flex items-center justify-center bg-[#f6f8fb]">
              <div className="communication-empty-state text-center max-w-md p-10 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-2xl font-bold text-slate-900">Communication</div>
                <div className="text-slate-600 mt-2">Select a channel or a person to start chatting in real-time.</div>
              </div>
            </div>
          ) : (
            <div
              className={`relative flex min-h-0 flex-1 flex-col ${isChatDragOver ? 'bg-blue-50/40' : ''}`}
              onDragEnter={(e) => {
                if (!canDropFilesOnChat) return;
                if (!Array.from(e.dataTransfer.types).includes('Files')) return;
                e.preventDefault();
                chatDragDepthRef.current += 1;
                setIsChatDragOver(true);
              }}
              onDragLeave={(e) => {
                if (!canDropFilesOnChat) return;
                e.preventDefault();
                chatDragDepthRef.current = Math.max(0, chatDragDepthRef.current - 1);
                if (chatDragDepthRef.current === 0) setIsChatDragOver(false);
              }}
              onDragOver={(e) => {
                if (!canDropFilesOnChat) return;
                if (!Array.from(e.dataTransfer.types).includes('Files')) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(e) => {
                if (!canDropFilesOnChat) return;
                e.preventDefault();
                chatDragDepthRef.current = 0;
                setIsChatDragOver(false);
                const dropped = getFilesFromDataTransfer(e.dataTransfer);
                if (dropped.length) setIncomingComposerFiles(dropped);
              }}
            >
              {isChatDragOver ? (
                <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/90">
                  <div className="flex flex-col items-center gap-2 px-6 text-center">
                    <FileUp size={32} className="text-blue-600" />
                    <div className="text-base font-semibold text-blue-900">Drop to attach</div>
                    <div className="text-sm text-blue-700">Images, videos, audio, and documents</div>
                  </div>
                </div>
              ) : null}
              <div className="px-4 pt-4">
                <ForwardActionBar
                  visible={forwardSelectionMode}
                  selectedCount={selectedMessageIds.length}
                  canDelete={canDeleteSelected}
                  onForward={() => {
                    if (!selectedMessageIds.length) return;
                    openForwardForMessages(selectedMessageIds);
                  }}
                  onDelete={async () => {
                    try {
                      const ownMessages = selectedMessages.filter((message) => message.senderId === currentUser.id);
                      for (const message of ownMessages) {
                        await ctx.deleteMessage(message.id, message.conversationKey);
                      }
                      setSelectedMessageIds([]);
                      setForwardSelectionMode(false);
                      setToast({ type: 'success', message: ownMessages.length ? 'Selected messages deleted.' : 'Only your own messages can be deleted.' });
                    } catch (error) {
                      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to delete selected messages.' });
                    }
                  }}
                  onClear={() => {
                    setSelectedMessageIds([]);
                    setForwardSelectionMode(false);
                  }}
                />
              </div>

              <ChatMessages
                currentUserId={currentUser.id}
                messages={messages}
                messagesLoading={messagesLoading}
                typingUserNames={typingUserNames}
                selectedConversationTitle={selectedConversation?.title || ''}
                isGroupChat={selectedConversation?.type === 'channel'}
                usersById={usersById}
                pinnedMessageId={ctx.pinnedMessage?.message.id ?? null}
                selectedMessageIds={selectedMessageIds}
                selectionVisible={forwardSelectionMode && !forwardModalOpen}
                onToggleSelectMessage={toggleSelectedMessage}
                onForwardMessage={(message) => openForwardForMessages([message.id])}
                onSelectMessage={(message) => enterForwardSelection([message.id])}
                onPinMessage={(message) => void ctx.pinMessage(message.id, message.conversationKey)}
                onEditMessage={(message) => {
                  setReplyToMessage(null);
                  setEditingMessage(message);
                }}
                onDeleteMessage={(messageId, conversationKey) => ctx.deleteMessage(messageId, conversationKey)}
                onReplyMessage={(message) => setReplyToMessage(message)}
              />

              <ChatComposer
                conversationKey={selectedConversationKey!}
                disabled={messagesLoading}
                notifyTyping={() => ctx.notifyTyping(selectedConversationKey!)}
                onSendText={(content, replyId) => ctx.sendText(selectedConversationKey!, content, replyId)}
                onSendFile={(file, content, replyId) => ctx.sendFile(selectedConversationKey!, file, content, replyId)}
                replyToMessage={replyToMessage}
                onCancelReply={() => setReplyToMessage(null)}
                resolveUserName={resolveUserName}
                editingMessage={editingMessage}
                onCancelEdit={() => setEditingMessage(null)}
                onSaveEdit={async (message, content) => {
                  await ctx.editMessage(message.id, message.conversationKey, content);
                }}
                incomingFiles={incomingComposerFiles || undefined}
                onIncomingFilesConsumed={() => setIncomingComposerFiles(null)}
              />
            </div>
          )}
        </div>
      </div>

      <AvatarPreviewModal
        open={!!previewEntity}
        entity={previewEntity}
        onClose={() => setPreviewEntity(null)}
      />

      <ForwardModal
        open={forwardModalOpen}
        messages={forwardModalMessages}
        recipients={forwardRecipients}
        onClose={() => {
          setForwardModalOpen(false);
          setForwardModalMessageIds([]);
          setForwardSelectionMode(false);
        }}
        onSubmit={async (recipientIds, note) => {
          await ctx.forwardMessages(
            forwardModalMessages.map((message) => message.id),
            recipientIds,
            note
          );
          setSelectedMessageIds([]);
          setForwardModalMessageIds([]);
          setForwardSelectionMode(false);
          setToast({ type: 'success', message: 'Messages forwarded successfully.' });
        }}
      />

      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}

export default function CommunicationView() {
  return <CommunicationLayout />;
}
