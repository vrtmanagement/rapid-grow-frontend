import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiCreateTeam, apiDeleteTeam, apiHistory, apiListConversations, apiListUsers, apiMarkAsRead, apiUpdateTeam, apiUploadFile, apiClearChat } from '../api';
import { API_BASE } from '../../config/api';
import { ChatConversationSummary, ChatMessage, ChatUser, ChatAttachment, ChatReplyRef, ChatNotification } from '../types';
import { getUnreadDirectMessageSourceCount } from '../unread';
import { getSocket } from '../../realtime/socket';
import { CommunicationContext, CommunicationContextValue } from './CommunicationContextCore';
import { PROFILE_AVATAR_UPDATED_EVENT } from '../../utils/avatar';
import {
  getStoredAuth,
  resolveAvatarUrl,
  ensureSocketConnected,
  messagePreviewFromPayload,
  isDocumentVisible,
  mapApiHistoryMessage,
  mapListUsersApiRowToChatUser,
  mapListConversationsApiRowToSummary,
} from './communicationContextHelpers';

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
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);

  const socket = useMemo(() => getSocket(), []);

  // Keep refs to avoid stale closures in socket event handlers
  const selectedConversationKeyRef = useRef<string | null>(null);
  selectedConversationKeyRef.current = selectedConversationKey;
  const usersRef = useRef<ChatUser[]>([]);
  usersRef.current = users;
  const conversationsRef = useRef<ChatConversationSummary[]>([]);
  conversationsRef.current = conversations;
  const currentUserRef = useRef<CommunicationContextValue['currentUser']>(null);
  currentUserRef.current = currentUser;

  const typingStopTimer = useRef<number | null>(null);
  const lastMessageIdByConversationKeyRef = useRef<Record<string, string>>({});
  const notificationTimersRef = useRef<Record<string, number>>({});

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
      const mapped: ChatUser[] = (data.users || []).map(mapListUsersApiRowToChatUser);
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
      const mapped: ChatConversationSummary[] = (data.conversations || []).map(mapListConversationsApiRowToSummary);

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
      const mapped: ChatMessage[] = (data.messages || [])
        .map(mapApiHistoryMessage)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(mapped);
      if (mapped.length === 0) {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.conversationKey === conversationKey
              ? { ...conversation, lastMessagePreview: '', lastMessageAt: null }
              : conversation
          )
        );
      }
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

  useEffect(() => {
    const handleProfileAvatarUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ avatar?: string; empId?: string; userId?: string }>).detail || {};
      const avatar = resolveAvatarUrl(detail.avatar);
      if (!avatar) return;
      const empId = String(detail.empId || '').trim();
      const userId = String(detail.userId || '').trim();

      setUsers((prev) =>
        prev.map((user) =>
          (userId && user.id === userId) || (empId && user.empId === empId)
            ? { ...user, avatar }
            : user,
        ),
      );
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.type !== 'dm' || !conversation.otherUser) return conversation;
          const isMatch =
            (userId && conversation.otherUser.id === userId) ||
            (empId && conversation.otherUser.empId === empId);
          return isMatch
            ? { ...conversation, otherUser: { ...conversation.otherUser, avatar }, avatar }
            : conversation;
        }),
      );
    };

    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated as EventListener);
    return () => {
      window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('rapidgrow:communication-unread-sync', {
        detail: {
          unreadSourceCount: getUnreadDirectMessageSourceCount(conversations),
        },
      })
    );
  }, [conversations]);

  const dismissNotification = useCallback((notificationId: string) => {
    const timer = notificationTimersRef.current[notificationId];
    if (timer) {
      window.clearTimeout(timer);
      delete notificationTimersRef.current[notificationId];
    }
    setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
  }, []);

  const scheduleNotificationAutoDismiss = useCallback((notificationId: string, delayMs = 4500) => {
    const existingTimer = notificationTimersRef.current[notificationId];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      delete notificationTimersRef.current[notificationId];
    }
    if (!isDocumentVisible()) return;
    notificationTimersRef.current[notificationId] = window.setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
      delete notificationTimersRef.current[notificationId];
    }, delayMs);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(notificationTimersRef.current).forEach((timer) => window.clearTimeout(timer as number));
      notificationTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isDocumentVisible()) return;
      setNotifications((prev) => {
        prev.forEach((item) => scheduleNotificationAutoDismiss(item.id));
        return prev;
      });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [scheduleNotificationAutoDismiss]);

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

      const isIncoming = mapped.senderId !== currentUserRef.current?.id;
      const isCurrentConversationOpen = selectedConversationKeyRef.current === conversationKey;
      const shouldNotify = isIncoming && !isCurrentConversationOpen;

      if (shouldNotify) {
        const sender =
          usersRef.current.find((user) => user.id === mapped.senderId) ||
          conversationsRef.current.find((conversation) => conversation.conversationKey === conversationKey)?.otherUser ||
          null;
        const senderName = sender?.name || 'New message';
        const avatar =
          sender?.avatar ||
          conversationsRef.current.find((conversation) => conversation.conversationKey === conversationKey)?.avatar;
        const nextNotification: ChatNotification = {
          id: `notif_${mapped.id}`,
          conversationKey,
          senderName,
          messagePreview: messagePreviewFromPayload(mapped.type, mapped.content, mapped.attachment),
          avatar,
          createdAt: Date.now(),
        };

        setNotifications((prev) => {
          const existing = prev.filter((item) => item.id !== nextNotification.id);
          const next = [...existing, nextNotification].slice(-3);
          const nextIds = new Set(next.map((item) => item.id));
          Object.keys(notificationTimersRef.current).forEach((id) => {
            if (!nextIds.has(id)) {
              window.clearTimeout(notificationTimersRef.current[id]);
              delete notificationTimersRef.current[id];
            }
          });
          return next;
        });

        scheduleNotificationAutoDismiss(nextNotification.id);
      }

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
  }, [scheduleNotificationAutoDismiss, socket]);

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
                        avatar: resolveAvatarUrl(otherUserRaw.avatar),
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

                // Also mark as read in the backend API for aggregated unread count tracking.
                try {
                  await apiMarkAsRead({ conversationKey });
                } catch (err) {
                  // non-fatal: do not block conversation open
                  console.warn('apiMarkAsRead failed', err);
                }

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

  const openNotificationConversation = useCallback(
    async (notificationId: string) => {
      const target = notifications.find((item) => item.id === notificationId);
      if (!target) return;
      dismissNotification(notificationId);
      if (typeof window !== 'undefined' && !window.location.hash.includes('/communication')) {
        window.location.hash = '#/communication';
      }
      await joinByConversationKey(target.conversationKey);
    },
    [dismissNotification, joinByConversationKey, notifications]
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
                      avatar: resolveAvatarUrl(otherUserRaw.avatar),
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
    async (name: string, memberIds: string[], avatar?: string | null) => {
      await apiCreateTeam(name, memberIds, avatar);
      await loadConversations();
    },
    [loadConversations]
  );

  const updateTeam = useCallback(
    async (conversationKey: string, payload: { name?: string; memberIds?: string[]; avatar?: string | null }) => {
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

  const clearChat = useCallback(
    async (conversationKey: string) => {
      if (!conversationKey) return;
      try {
        setMessages([]);
        await apiClearChat(conversationKey);
        await loadConversations();
        socket.emit(
          'comm:chat:clear',
          { conversationKey },
          () => {}
        );
      } catch (e: any) {
        setError(e?.message || 'Failed to clear chat');
        throw e;
      }
    },
    [loadConversations, socket]
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
    clearChat,
    notifications,
    dismissNotification,
    openNotificationConversation,
  };

  return <CommunicationContext.Provider value={value}>{children}</CommunicationContext.Provider>;
}

