import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiCreateTeam, apiDeleteTeam, apiHistory, apiListConversations, apiListUsers, apiUpdateTeam, apiUploadFile } from '../api';
import { ChatConversationSummary, ChatMessage, ChatUser, ChatAttachment, ChatReplyRef } from '../types';
import { getSocket } from '../../realtime/socket';

type CommunicationContextValue = {
  currentUser: { id: string; name: string; role: string } | null;
  users: ChatUser[];
  conversations: ChatConversationSummary[];
  usersLoading: boolean;
  conversationsLoading: boolean;
  error: string | null;

  selectedConversationKey: string | null;
  selectedConversation: ChatConversationSummary | null;

  messages: ChatMessage[];
  messagesLoading: boolean;

  typingUserIds: Record<string, true>;

  selectChannel: (channelKey: string) => Promise<void>;
  startDmWithUser: (otherUserId: string) => Promise<void>;
  joinByConversationKey: (conversationKey: string) => Promise<void>;
  createTeam: (name: string, memberIds: string[]) => Promise<void>;
  updateTeam: (conversationKey: string, payload: { name?: string; memberIds?: string[] }) => Promise<void>;
  deleteTeam: (conversationKey: string) => Promise<void>;

  sendText: (conversationKey: string, content: string, replyToMessageId?: string | null) => Promise<void>;
  sendFile: (conversationKey: string, file: File, content?: string, replyToMessageId?: string | null) => Promise<void>;
  notifyTyping: (conversationKey: string) => void;

  editMessage: (messageId: string, conversationKey: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string, conversationKey: string) => Promise<void>;
};

const CommunicationContext = createContext<CommunicationContextValue | undefined>(undefined);

function getStoredAuth() {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ensureSocketConnected(socket: any, timeoutMs = 5000): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      reject(new Error('Socket connection timeout'));
    }, timeoutMs);

    const onConnect = () => {
      window.clearTimeout(timeout);
      socket.off('connect_error', onConnectError);
      resolve();
    };
    const onConnectError = (err?: any) => {
      const reason = err?.message || err?.description || 'Socket connection failed';
      window.clearTimeout(timeout);
      socket.off('connect', onConnect);
      reject(new Error(reason));
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onConnectError);
    socket.connect();
  });
}

export function CommunicationProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CommunicationContextValue['currentUser']>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedConversationKey, setSelectedConversationKey] = useState<string | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<Record<string, true>>({});
  const [error, setError] = useState<string | null>(null);

  const socket = useMemo(() => getSocket(), []);

  // Keep refs to avoid stale closures in socket event handlers
  const selectedConversationKeyRef = useRef<string | null>(null);
  selectedConversationKeyRef.current = selectedConversationKey;

  const typingStopTimer = useRef<number | null>(null);
  const lastMessageIdByConversationKeyRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const stored = getStoredAuth();
    const employee = stored?.employee;
    if (!employee) return;
    setCurrentUser({
      id: String(employee._id || employee.empId),
      name: employee.empName || employee.name || 'User',
      role: employee.role || 'EMPLOYEE',
    });
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setError(null);
    try {
      const data = await apiListUsers();
      const mapped: ChatUser[] = (data.users || []).map((u: any) => ({
        id: String(u.id),
        empId: String(u.empId || ''),
        name: String(u.name || u.empId || 'User'),
        role: String(u.role || ''),
        roleGroup: (u.roleGroup as any) || 'employees',
        email: u.email,
        phone: u.phone,
        designation: u.designation,
        department: u.department,
        avatar: u.avatar,
        online: !!u.online,
        lastSeenAt: u.lastSeenAt ? String(u.lastSeenAt) : null,
      }));
      setUsers(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    setError(null);
    try {
      const data = await apiListConversations();
      const mapped: ChatConversationSummary[] = (data.conversations || []).map((c: any) => ({
        conversationKey: String(c.conversationKey),
        type: c.type as any,
        title: String(c.title || ''),
        otherUser: c.type === 'dm' && c.otherUser ? ({
          id: String(c.otherUser.id),
          empId: String(c.otherUser.empId || ''),
          name: String(c.otherUser.name || 'User'),
          role: String(c.otherUser.role || ''),
          roleGroup: (c.otherUser.roleGroup as any) || 'employees',
          online: false,
          lastSeenAt: null,
        }) : null,
        channelKey: c.type === 'channel' ? c.channelKey : null,
        memberIds: c.type === 'channel' && Array.isArray(c.memberIds) ? c.memberIds.map((id: any) => String(id)) : undefined,
        onlineCount: typeof c.onlineCount === 'number' ? c.onlineCount : undefined,
        unreadCount: typeof c.unreadCount === 'number' ? c.unreadCount : 0,
        lastMessagePreview: c.lastMessagePreview ? String(c.lastMessagePreview) : undefined,
        lastMessageAt: c.lastMessageAt ? String(c.lastMessageAt) : null,
      }));

      setConversations(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load conversations');
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationKey: string) => {
    setMessagesLoading(true);
    setError(null);
    try {
      const data = await apiHistory(conversationKey, 200);
      const toAttachment = (attachment: any): ChatAttachment | null =>
        attachment
          ? ({
              fileId: String(attachment.fileId || ''),
              url: String(attachment.url || ''),
              fileName: String(attachment.fileName || ''),
              mimeType: String(attachment.mimeType || ''),
              size: Number(attachment.size || 0),
            } satisfies ChatAttachment)
          : null;
      const toReply = (reply: any): ChatReplyRef | null =>
        reply
          ? ({
              id: String(reply.id || ''),
              senderId: String(reply.senderId || ''),
              type: reply.type as any,
              content: String(reply.content || ''),
              deleted: !!reply.deleted,
              fileUrl: String(reply.fileUrl || reply.attachment?.url || ''),
              attachment: toAttachment(reply.attachment),
            } satisfies ChatReplyRef)
          : null;
      const mapMessage = (m: any): ChatMessage => ({
        id: String(m.id),
        conversationKey: String(m.conversationKey),
        type: m.type as any,
        senderId: String(m.senderId),
        content: String(m.content || ''),
        fileUrl: String(m.fileUrl || m.attachment?.url || ''),
        deleted: !!m.deleted,
        editedAt: m.editedAt ? String(m.editedAt) : null,
        attachment: toAttachment(m.attachment),
        createdAt: String(m.createdAt),
        tick: m.tick
          ? ({
              state: m.tick.state as any,
              deliveredAt: m.tick.deliveredAt ? String(m.tick.deliveredAt) : undefined,
              seenAt: m.tick.seenAt ? String(m.tick.seenAt) : undefined,
            } satisfies ChatMessage['tick'])
          : null,
        replyTo: toReply(m.replyTo),
      });
      const mapped: ChatMessage[] = (data.messages || [])
        .map(mapMessage)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load messages');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Global data bootstrap
  useEffect(() => {
    loadUsers();
    loadConversations();
  }, [loadUsers, loadConversations]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handlePresence = (payload: any) => {
      const userId = String(payload?.userId);
      const online = !!payload?.online;
      const lastSeenAt = payload?.lastSeenAt ? String(payload.lastSeenAt) : null;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, online, lastSeenAt } : u))
      );
      // Also update DM summaries otherUser.online if present
      setConversations((prev) =>
        prev.map((c) => {
          if (c.type !== 'dm' || !c.otherUser) return c;
          if (c.otherUser.id !== userId) return c;
          return {
            ...c,
            otherUser: {
              ...c.otherUser,
              online,
              lastSeenAt,
            },
          };
        })
      );
    };

    const handleTyping = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || '');
      const isTyping = !!payload?.isTyping;
      const fromUserId = String(payload?.fromUserId || '');

      if (!conversationKey || !fromUserId) return;
      const currentKey = selectedConversationKeyRef.current;
      if (currentKey !== conversationKey) return;

      if (isTyping) {
        setTypingUserIds((prev) => ({ ...prev, [fromUserId]: true }));
      } else {
        setTypingUserIds((prev) => {
          const next = { ...prev };
          delete next[fromUserId];
          return next;
        });
      }
    };

    const handleMessageCreated = (payload: any) => {
      const conversationKey = String(payload?.conversationKey);
      const msg = payload?.message;
      if (!conversationKey || !msg) return;

      if (lastMessageIdByConversationKeyRef.current[conversationKey] === String(msg.id)) {
        return;
      }
      lastMessageIdByConversationKeyRef.current[conversationKey] = String(msg.id);

      const mapped: ChatMessage = {
        id: String(msg.id),
        conversationKey: String(msg.conversationKey),
        type: msg.type as any,
        senderId: String(msg.senderId),
        content: String(msg.content || ''),
        fileUrl: String(msg.fileUrl || msg.attachment?.url || ''),
        deleted: !!msg.deleted,
        editedAt: msg.editedAt ? String(msg.editedAt) : null,
        attachment: msg.attachment
          ? ({
              fileId: String(msg.attachment.fileId || ''),
              url: String(msg.attachment.url || ''),
              fileName: String(msg.attachment.fileName || ''),
              mimeType: String(msg.attachment.mimeType || ''),
              size: Number(msg.attachment.size || 0),
            } satisfies ChatAttachment)
          : null,
        createdAt: String(msg.createdAt),
        tick: msg.tick
          ? ({
              state: msg.tick.state as any,
              deliveredAt: msg.tick.deliveredAt ? String(msg.tick.deliveredAt) : undefined,
              seenAt: msg.tick.seenAt ? String(msg.tick.seenAt) : undefined,
            } as any)
          : null,
        replyTo: msg.replyTo
          ? ({
              id: String(msg.replyTo.id || ''),
              senderId: String(msg.replyTo.senderId || ''),
              type: msg.replyTo.type as any,
              content: String(msg.replyTo.content || ''),
              deleted: !!msg.replyTo.deleted,
              fileUrl: String(msg.replyTo.fileUrl || msg.replyTo.attachment?.url || ''),
              attachment: msg.replyTo.attachment
                ? {
                    fileId: String(msg.replyTo.attachment.fileId || ''),
                    url: String(msg.replyTo.attachment.url || ''),
                    fileName: String(msg.replyTo.attachment.fileName || ''),
                    mimeType: String(msg.replyTo.attachment.mimeType || ''),
                    size: Number(msg.replyTo.attachment.size || 0),
                  }
                : null,
            } as ChatReplyRef)
          : null,
      };

      // If the message is for the current conversation, append it.
      if (selectedConversationKeyRef.current === conversationKey) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === mapped.id)) {
            return prev.map((m) => (m.id === mapped.id ? mapped : m));
          }
          return [...prev, mapped];
        });
      }

      // Update conversation ordering + preview
      setConversations((prev) => {
        const preview =
          mapped.type === 'text'
            ? mapped.content.slice(0, 120)
            : mapped.type === 'image'
              ? 'Image'
              : `Attachment: ${mapped.attachment?.fileName || 'file'}`;
        const at = mapped.createdAt;

        const updated = prev.map((c) => {
          if (c.conversationKey !== conversationKey) return c;

          // If this conversation isn't open and the message isn't mine, mark unread.
          const isOpen = selectedConversationKeyRef.current === conversationKey;
          const shouldIncrementUnread = !isOpen && mapped.senderId !== currentUser?.id;
          const unreadCount = shouldIncrementUnread ? (c.unreadCount || 0) + 1 : c.unreadCount || 0;

          return {
            ...c,
            lastMessagePreview: preview,
            lastMessageAt: at,
            unreadCount,
          };
        });

        // If conversation isn't in our list yet (rare), ignore for now.
        return updated.slice().sort((a, b) => {
          const atA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const atB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return atB - atA;
        });
      });
    };

    const handleMessageDelivery = (payload: any) => {
      const messageId = String(payload?.messageId || '');
      const tickState = payload?.tick?.state;
      if (!messageId || !tickState) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                tick: {
                  state: tickState,
                } as any,
              }
            : m
        )
      );
    };

    const handleMessageSeen = (payload: any) => {
      const messageId = String(payload?.messageId || '');
      const tickState = payload?.tick?.state;
      if (!messageId || !tickState) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                tick: {
                  state: tickState,
                  seenAt: payload?.tick?.seenAt ? String(payload.tick.seenAt) : undefined,
                } as any,
              }
            : m
        )
      );
    };

    const handleMessageUpdated = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || '');
      const msg = payload?.message;
      if (!conversationKey || !msg) return;

      const updated: ChatMessage = {
        id: String(msg.id),
        conversationKey: String(msg.conversationKey),
        type: msg.type as any,
        senderId: String(msg.senderId),
        content: String(msg.content || ''),
        fileUrl: String(msg.fileUrl || msg.attachment?.url || ''),
        deleted: !!msg.deleted,
        editedAt: msg.editedAt ? String(msg.editedAt) : null,
        attachment: msg.attachment
          ? ({
              fileId: String(msg.attachment.fileId || ''),
              url: String(msg.attachment.url || ''),
              fileName: String(msg.attachment.fileName || ''),
              mimeType: String(msg.attachment.mimeType || ''),
              size: Number(msg.attachment.size || 0),
            } satisfies ChatAttachment)
          : null,
        createdAt: String(msg.createdAt),
        tick: msg.tick || null,
        replyTo: msg.replyTo
          ? ({
              id: String(msg.replyTo.id || ''),
              senderId: String(msg.replyTo.senderId || ''),
              type: msg.replyTo.type as any,
              content: String(msg.replyTo.content || ''),
              deleted: !!msg.replyTo.deleted,
              fileUrl: String(msg.replyTo.fileUrl || msg.replyTo.attachment?.url || ''),
              attachment: msg.replyTo.attachment
                ? {
                    fileId: String(msg.replyTo.attachment.fileId || ''),
                    url: String(msg.replyTo.attachment.url || ''),
                    fileName: String(msg.replyTo.attachment.fileName || ''),
                    mimeType: String(msg.replyTo.attachment.mimeType || ''),
                    size: Number(msg.replyTo.attachment.size || 0),
                  }
                : null,
            } as ChatReplyRef)
          : null,
      };

      // Update sidebar preview ordering even when the chat isn't currently open.
      setConversations((prev) => {
        const preview = updated.type === 'text' ? updated.content.slice(0, 120) : 'Message updated';
        const at = updated.createdAt;
        return prev
          .map((c) =>
            c.conversationKey === conversationKey
              ? { ...c, lastMessagePreview: preview, lastMessageAt: at }
              : c
          )
          .slice()
          .sort((a, b) => {
            const atA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const atB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return atB - atA;
          });
      });

      setMessages((prev) =>
        selectedConversationKeyRef.current !== conversationKey
          ? prev
          : prev.map((m) =>
              m.id === updated.id
                ? {
                    ...updated,
                    // Editing shouldn't wipe DM tick state; backend doesn't send tick on update.
                    tick: updated.tick ?? m.tick ?? null,
                  }
                : m
            )
      );
    };

    const handleMessageDeleted = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || '');
      const msg = payload?.message;
      if (!conversationKey || !msg) return;

      setConversations((prev) =>
        prev.map((c) =>
          c.conversationKey === conversationKey
            ? { ...c, lastMessagePreview: 'Message deleted' }
            : c
        )
      );

      const updated: ChatMessage = {
        id: String(msg.id),
        conversationKey,
        type: (msg.type as any) || 'text',
        senderId: String(msg.senderId || ''),
        content: String(msg.content || 'Message deleted'),
        fileUrl: '',
        deleted: !!msg.deleted,
        attachment: null,
        createdAt: String(msg.createdAt || new Date().toISOString()),
        editedAt: msg.editedAt ? String(msg.editedAt) : null,
        tick: null,
        replyTo: msg.replyTo
          ? ({
              id: String(msg.replyTo.id || ''),
              senderId: String(msg.replyTo.senderId || ''),
              type: msg.replyTo.type as any,
              content: String(msg.replyTo.content || ''),
              deleted: !!msg.replyTo.deleted,
              fileUrl: String(msg.replyTo.fileUrl || msg.replyTo.attachment?.url || ''),
              attachment: msg.replyTo.attachment
                ? {
                    fileId: String(msg.replyTo.attachment.fileId || ''),
                    url: String(msg.replyTo.attachment.url || ''),
                    fileName: String(msg.replyTo.attachment.fileName || ''),
                    mimeType: String(msg.replyTo.attachment.mimeType || ''),
                    size: Number(msg.replyTo.attachment.size || 0),
                  }
                : null,
            } as ChatReplyRef)
          : null,
      };

      setMessages((prev) =>
        selectedConversationKeyRef.current !== conversationKey
          ? prev
          : prev.map((m) =>
              m.id === String(msg.id)
                ? {
                    ...m,
                    deleted: !!msg.deleted,
                    content: String(msg.content || 'Message deleted'),
                    attachment: null,
                    editedAt: msg.editedAt ? String(msg.editedAt) : null,
                  }
                : m
            )
      );
    };

    const handleUnreadCleared = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || '');
      if (!conversationKey) return;
      setConversations((prev) => prev.map((c) => (c.conversationKey === conversationKey ? { ...c, unreadCount: 0 } : c)));
    };

    socket.on('presence:update', handlePresence);
    socket.on('comm:typing', handleTyping);
    socket.on('comm:message:created', handleMessageCreated);
    socket.on('comm:message:delivery', handleMessageDelivery);
    socket.on('comm:message:seen', handleMessageSeen);
    socket.on('comm:message:updated', handleMessageUpdated);
    socket.on('comm:message:deleted', handleMessageDeleted);
    socket.on('comm:unread:cleared', handleUnreadCleared);

    return () => {
      socket.off('presence:update', handlePresence);
      socket.off('comm:typing', handleTyping);
      socket.off('comm:message:created', handleMessageCreated);
      socket.off('comm:message:delivery', handleMessageDelivery);
      socket.off('comm:message:seen', handleMessageSeen);
      socket.off('comm:message:updated', handleMessageUpdated);
      socket.off('comm:message:deleted', handleMessageDeleted);
      socket.off('comm:unread:cleared', handleUnreadCleared);
    };
  }, [socket]);

  const joinByConversationKey = useCallback(
    async (conversationKey: string) => {
      setError(null);
      setTypingUserIds({});
      setSelectedConversationKey(conversationKey);
      // Join + then load history for deterministic state
      return new Promise<void>((resolve, reject) => {
        ensureSocketConnected(socket)
          .then(() => {
            socket.emit('comm:join', { conversationKey }, async (ack: any) => {
              if (!ack?.ok) {
                const err = new Error(ack?.error || 'Failed to join conversation');
                setError(err.message);
                reject(err);
                return;
              }

              // Ensure we have minimal summary for header even if REST conversations list lags behind.
              const ackConversation = ack?.conversation;
              if (ackConversation?.type && !conversations.some((c) => c.conversationKey === conversationKey)) {
                if (ackConversation.type === 'channel') {
                  setConversations((prev) => [
                    ...prev,
                    {
                      conversationKey,
                      type: 'channel',
                      title: ackConversation.title || 'Channel',
                      channelKey: ackConversation.channelKey || null,
                      onlineCount: undefined,
                      unreadCount: 0,
                      lastMessagePreview: '',
                      lastMessageAt: null,
                    },
                  ]);
                }
                if (ackConversation.type === 'dm') {
                  const otherUserRaw = ackConversation.otherUser;
                  const otherUserNormalized: any = otherUserRaw
                    ? {
                        id: String(otherUserRaw.id),
                        empId: String(otherUserRaw.empId || ''),
                        name: String(otherUserRaw.name || 'User'),
                        role: String(otherUserRaw.role || ''),
                        roleGroup: (otherUserRaw.roleGroup as any) || 'employees',
                        online: false,
                        lastSeenAt: null,
                      }
                    : null;
                  setConversations((prev) => [
                    ...prev,
                    {
                      conversationKey,
                      type: 'dm',
                      title: ackConversation.title || 'Direct Message',
                      otherUser: otherUserNormalized,
                      unreadCount: 0,
                      lastMessagePreview: '',
                      lastMessageAt: null,
                    },
                  ]);
                }
              }
              try {
                setMessages([]);
                await loadMessages(conversationKey);
                // Mark messages as seen (updates unread baseline + DM seen ticks)
                setConversations((prev) => prev.map((c) => (c.conversationKey === conversationKey ? { ...c, unreadCount: 0 } : c)));
                socket.emit('comm:seen:open', { conversationKey });
                resolve();
              } catch (e: any) {
                setError(e?.message || 'Failed to open conversation');
                reject(e);
              }
            });
          })
          .catch((e: any) => {
            setError(e?.message || 'Socket is not connected');
            reject(e);
          });
      });
    },
    [conversations, loadMessages, socket]
  );

  const selectChannel = useCallback(
    async (channelKey: string) => {
      const conversationKey = `channel:${channelKey}`;
      setTypingUserIds({});
      setSelectedConversationKey(conversationKey);
      return new Promise<void>((resolve, reject) => {
        socket.emit(
          'comm:join',
          { type: 'channel', channelKey },
          async (ack: any) => {
            if (!ack?.ok) {
              reject(new Error(ack?.error || 'Failed to join channel'));
              return;
            }
            if (!conversations.some((c) => c.conversationKey === conversationKey)) {
              setConversations((prev) => [
                ...prev,
                {
                  conversationKey,
                  type: 'channel',
                  title: ack?.conversation?.title || 'Channel',
                  channelKey: ack?.conversation?.channelKey || channelKey,
                  unreadCount: 0,
                  lastMessagePreview: '',
                  lastMessageAt: null,
                },
              ]);
            }
            try {
              setMessages([]);
              await loadMessages(conversationKey);
              setConversations((prev) =>
                prev.map((c) => (c.conversationKey === conversationKey ? { ...c, unreadCount: 0 } : c))
              );
              socket.emit('comm:seen:open', { conversationKey });
              resolve();
            } catch (e: any) {
              reject(e);
            }
          }
        );
      });
    },
    [conversations, loadMessages, socket]
  );

  const startDmWithUser = useCallback(
    async (otherUserId: string) => {
      setError(null);
      setTypingUserIds({});
      // Prefer existing DM thread to avoid unnecessary "create/join" failures.
      const existingDm = conversations.find((c) => c.type === 'dm' && c.otherUser?.id === otherUserId);
      if (existingDm?.conversationKey) {
        await joinByConversationKey(existingDm.conversationKey);
        return;
      }

      return new Promise<void>((resolve, reject) => {
        ensureSocketConnected(socket)
          .then(() => {
            socket.emit('comm:join', { type: 'dm', otherUserId }, async (ack: any) => {
              if (!ack?.ok) {
                const err = new Error(ack?.error || 'Failed to start chat');
                setError(err.message);
                reject(err);
                return;
              }
              const conversationKey = String(ack?.conversation?.conversationKey || '');
              if (!conversationKey) {
                const err = new Error('Missing conversationKey');
                setError(err.message);
                reject(err);
                return;
              }
              setSelectedConversationKey(conversationKey);

              if (!conversations.some((c) => c.conversationKey === conversationKey)) {
                const otherUserRaw = ack?.conversation?.otherUser;
                const otherUserNormalized: any = otherUserRaw
                  ? {
                      id: String(otherUserRaw.id),
                      empId: String(otherUserRaw.empId || ''),
                      name: String(otherUserRaw.name || 'User'),
                      role: String(otherUserRaw.role || ''),
                      roleGroup: (otherUserRaw.roleGroup as any) || 'employees',
                      online: false,
                      lastSeenAt: null,
                    }
                  : null;
                setConversations((prev) => [
                  ...prev,
                  {
                    conversationKey,
                    type: 'dm',
                    title: ack?.conversation?.title || 'Direct Message',
                    otherUser: otherUserNormalized,
                    unreadCount: 0,
                    lastMessagePreview: '',
                    lastMessageAt: null,
                  },
                ]);
              }
              try {
                setMessages([]);
                await loadMessages(conversationKey);
                setConversations((prev) =>
                  prev.map((c) => (c.conversationKey === conversationKey ? { ...c, unreadCount: 0 } : c))
                );
                socket.emit('comm:seen:open', { conversationKey });
                resolve();
              } catch (e: any) {
                setError(e?.message || 'Failed to open chat');
                reject(e);
              }
            });
          })
          .catch((e: any) => {
            setError(e?.message || 'Socket is not connected');
            reject(e);
          });
      });
    },
    [conversations, joinByConversationKey, loadMessages, socket]
  );

  const createTeam = useCallback(
    async (name: string, memberIds: string[]) => {
      await apiCreateTeam(name, memberIds);
      await loadConversations();
    },
    [loadConversations]
  );

  const updateTeam = useCallback(
    async (conversationKey: string, payload: { name?: string; memberIds?: string[] }) => {
      await apiUpdateTeam(conversationKey, payload);
      await loadConversations();
    },
    [loadConversations]
  );

  const deleteTeam = useCallback(
    async (conversationKey: string) => {
      await apiDeleteTeam(conversationKey);
      if (selectedConversationKeyRef.current === conversationKey) {
        setSelectedConversationKey(null);
        setMessages([]);
      }
      await loadConversations();
    },
    [loadConversations]
  );

  const sendText = useCallback(
    async (conversationKey: string, content: string, replyToMessageId?: string | null) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      if (!conversationKey) return;

      const clientMessageId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? (crypto as any).randomUUID()
          : `cmi_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Message send timeout')), 8000);
        socket.emit(
          'comm:message:send',
          {
            conversationKey,
            type: 'text',
            content: trimmed,
            clientMessageId,
            replyToMessageId: replyToMessageId || undefined,
          },
          (ack: any) => {
            window.clearTimeout(timeout);
            if (!ack?.ok) {
              reject(new Error(String(ack?.error || 'Failed to send message')));
              return;
            }
            resolve();
          }
        );
      });
    },
    [socket]
  );

  const sendFile = useCallback(
    async (conversationKey: string, file: File, content?: string, replyToMessageId?: string | null) => {
      if (!file) return;
      if (!conversationKey) return;

      const upload = await apiUploadFile(file);
      const fileUrl = upload.fileUrl || `${API_BASE}${upload.urlPath}`;

      const clientMessageId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? (crypto as any).randomUUID()
          : `cmi_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Attachment send timeout')), 8000);
        socket.emit(
          'comm:message:send',
          {
            conversationKey,
            type: upload.type,
            content: content?.toString() || '',
            fileUrl,
            clientMessageId,
            attachment: {
              fileId: upload.fileId,
              url: fileUrl,
              fileName: upload.fileName,
              mimeType: upload.mimeType,
              size: upload.size,
            },
            replyToMessageId: replyToMessageId || undefined,
          },
          (ack: any) => {
            window.clearTimeout(timeout);
            if (!ack?.ok) {
              reject(new Error(String(ack?.error || 'Failed to send attachment')));
              return;
            }
            resolve();
          }
        );
      });
    },
    [socket]
  );

  const editMessage = useCallback(
    async (messageId: string, conversationKey: string, newContent: string) => {
      const trimmed = newContent.trim();
      if (!trimmed) return;
      if (!messageId || !conversationKey) return;
      socket.emit(
        'comm:message:edit',
        { messageId, conversationKey, content: trimmed },
        () => {}
      );
    },
    [socket]
  );

  const deleteMessage = useCallback(
    async (messageId: string, conversationKey: string) => {
      if (!messageId || !conversationKey) return;
      socket.emit(
        'comm:message:delete',
        { messageId, conversationKey },
        () => {}
      );
    },
    [socket]
  );

  const notifyTyping = useCallback(
    (conversationKey: string) => {
      if (!conversationKey) return;
      socket.emit('comm:typing', { conversationKey, isTyping: true });

      if (typingStopTimer.current) window.clearTimeout(typingStopTimer.current);
      typingStopTimer.current = window.setTimeout(() => {
        socket.emit('comm:typing', { conversationKey, isTyping: false });
      }, 1500);
    },
    [socket]
  );

  const selectedConversation = useMemo(() => {
    if (!selectedConversationKey) return null;
    return conversations.find((c) => c.conversationKey === selectedConversationKey) || null;
  }, [conversations, selectedConversationKey]);

  const value: CommunicationContextValue = {
    currentUser,
    users,
    conversations,
    usersLoading,
    conversationsLoading,
    error,
    selectedConversationKey,
    selectedConversation,
    messages,
    messagesLoading,
    typingUserIds,
    selectChannel,
    startDmWithUser,
    joinByConversationKey,
    createTeam,
    updateTeam,
    deleteTeam,
    sendText,
    sendFile,
    notifyTyping,
    editMessage,
    deleteMessage,
  };

  return <CommunicationContext.Provider value={value}>{children}</CommunicationContext.Provider>;
}

export function useCommunication() {
  const ctx = useContext(CommunicationContext);
  if (!ctx) throw new Error('useCommunication must be used within CommunicationProvider');
  return ctx;
}

