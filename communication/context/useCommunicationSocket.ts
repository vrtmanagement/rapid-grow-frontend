import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { ChatConversationSummary, ChatMessage, ChatNotification, ChatPinnedMessage, ChatUser } from '../types';
import {
  ensureSocketConnected,
  mapApiHistoryMessage,
  mapApiPinnedMessage,
  messagePreviewFromMessage,
  toChatPoll,
  upsertChatMessage,
} from './communicationContextHelpers';
import type { NotificationPreferences } from '../../services/notificationPreferences';

type CurrentUser = { id: string; name: string; role: string; empId?: string; avatar?: string } | null;

type UseCommunicationSocketArgs = {
  socket: any;
  selectedConversationKeyRef: MutableRefObject<string | null>;
  usersRef: MutableRefObject<ChatUser[]>;
  conversationsRef: MutableRefObject<ChatConversationSummary[]>;
  currentUserRef: MutableRefObject<CurrentUser>;
  seenSocketMessageIdsRef: MutableRefObject<Record<string, true>>;
  lastMessageIdByConversationKeyRef: MutableRefObject<Record<string, string>>;
  notificationTimersRef: MutableRefObject<Record<string, number>>;
  notificationPreferences: NotificationPreferences;
  mergePollIntoMessages: (conversationKey: string, poll: any) => void;
  markConversationSeen: (conversationKey: string, options?: { immediate?: boolean }) => Promise<void>;
  scheduleNotificationAutoDismiss: (notificationId: string, delayMs?: number) => void;
  loadMessages: (conversationKey: string) => Promise<void>;
  setUsers: Dispatch<SetStateAction<ChatUser[]>>;
  setConversations: Dispatch<SetStateAction<ChatConversationSummary[]>>;
  setTypingUserIds: Dispatch<SetStateAction<Record<string, true>>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPinnedMessage: Dispatch<SetStateAction<ChatPinnedMessage | null>>;
  setNotifications: Dispatch<SetStateAction<ChatNotification[]>>;
};

export function useCommunicationSocket({
  socket,
  selectedConversationKeyRef,
  usersRef,
  conversationsRef,
  currentUserRef,
  seenSocketMessageIdsRef,
  lastMessageIdByConversationKeyRef,
  notificationTimersRef,
  notificationPreferences,
  mergePollIntoMessages,
  markConversationSeen,
  scheduleNotificationAutoDismiss,
  loadMessages,
  setUsers,
  setConversations,
  setTypingUserIds,
  setMessages,
  setPinnedMessage,
  setNotifications,
}: UseCommunicationSocketArgs) {
  // Keep volatile callbacks in refs so the socket subscription stays mounted.
  // Rebinding listeners on every preference/callback identity change briefly
  // drops events and is a common cause of "refresh to see message".
  const mergePollIntoMessagesRef = useRef(mergePollIntoMessages);
  mergePollIntoMessagesRef.current = mergePollIntoMessages;
  const markConversationSeenRef = useRef(markConversationSeen);
  markConversationSeenRef.current = markConversationSeen;
  const scheduleNotificationAutoDismissRef = useRef(scheduleNotificationAutoDismiss);
  scheduleNotificationAutoDismissRef.current = scheduleNotificationAutoDismiss;
  const loadMessagesRef = useRef(loadMessages);
  loadMessagesRef.current = loadMessages;
  const notificationPreferencesRef = useRef(notificationPreferences);
  notificationPreferencesRef.current = notificationPreferences;

  useEffect(() => {
    if (!socket) return;

    let lastResyncAt = 0;
    const resyncOpenConversation = (options?: { force?: boolean }) => {
      const conversationKey = selectedConversationKeyRef.current;
      if (!conversationKey) return;
      const now = Date.now();
      if (!options?.force && now - lastResyncAt < 1500) {
        socket.emit('comm:join', { conversationKey });
        return;
      }
      lastResyncAt = now;
      socket.emit('comm:join', { conversationKey });
      void loadMessagesRef.current(conversationKey);
    };

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

    const appendIncomingMessage = (mapped: ChatMessage, conversationKey: string) => {
      const messageId = String(mapped.id || '');
      if (!messageId || !conversationKey) return;
      if (seenSocketMessageIdsRef.current[messageId]) {
        // Duplicate event (newMessage + comm:message:created). Still upsert into
        // the open thread in case the first event lost the UI append to a race.
        if (selectedConversationKeyRef.current === conversationKey) {
          setMessages((prev) => upsertChatMessage(prev, mapped));
        }
        return;
      }

      seenSocketMessageIdsRef.current[messageId] = true;
      lastMessageIdByConversationKeyRef.current[conversationKey] = messageId;

      const isIncoming = mapped.senderId !== currentUserRef.current?.id;
      const isCurrentConversationOpen = selectedConversationKeyRef.current === conversationKey;
      const prefs = notificationPreferencesRef.current;
      const shouldNotify =
        isIncoming &&
        !isCurrentConversationOpen &&
        prefs.communicationMessages &&
        prefs.toastPreviews;

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
          messagePreview: messagePreviewFromMessage(mapped),
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

        scheduleNotificationAutoDismissRef.current(nextNotification.id);
      }

      // Always upsert for the open conversation (read ref at apply-time too).
      setMessages((prev) => {
        if (selectedConversationKeyRef.current !== conversationKey) return prev;
        return upsertChatMessage(prev, mapped);
      });

      // Update conversation ordering + preview
      setConversations((prev) => {
        const preview = messagePreviewFromMessage(mapped).slice(0, 120);
        const at = mapped.createdAt;

        const updated = prev.map((c) => {
          if (c.conversationKey !== conversationKey) return c;

          // If this conversation isn't open and the message isn't mine, mark unread.
          const isOpen = selectedConversationKeyRef.current === conversationKey;
          const shouldIncrementUnread = !isOpen && mapped.senderId !== currentUserRef.current?.id;
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

      if (isCurrentConversationOpen && isIncoming) {
        void markConversationSeenRef.current(conversationKey);
      }
    };

    const handleMessageCreated = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || payload?.message?.conversationKey || '');
      const msg = payload?.message;
      if (!conversationKey || !msg) return;
      appendIncomingMessage(mapApiHistoryMessage(msg), conversationKey);
    };

    const handleMessagesForwarded = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || payload?.conversationId || '');
      const messages = Array.isArray(payload?.messages) ? payload.messages : [];
      if (!conversationKey || messages.length === 0) return;
      messages.forEach((message) => appendIncomingMessage(mapApiHistoryMessage(message), conversationKey));
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

      const updated = mapApiHistoryMessage(msg);

      // Only bump sidebar preview when this edit is for the latest message.
      setConversations((prev) => {
        const conversation = prev.find((c) => c.conversationKey === conversationKey);
        if (!conversation) return prev;
        const lastAt = conversation.lastMessageAt
          ? new Date(conversation.lastMessageAt).getTime()
          : 0;
        const editedAt = updated.createdAt ? new Date(updated.createdAt).getTime() : 0;
        // Treat as latest if timestamps are equal/newer within 1s, or preview matches prior content.
        const isLikelyLatest =
          !lastAt || Math.abs(lastAt - editedAt) < 1000 || lastAt <= editedAt;
        if (!isLikelyLatest) return prev;

        const preview = messagePreviewFromMessage(updated).slice(0, 120);
        return prev
          .map((c) =>
            c.conversationKey === conversationKey
              ? { ...c, lastMessagePreview: preview, lastMessageAt: updated.createdAt }
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

    const handleChatCleared = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || '');
      if (!conversationKey) return;
      if (selectedConversationKeyRef.current === conversationKey) {
        setMessages([]);
        setPinnedMessage(null);
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationKey === conversationKey
            ? { ...c, lastMessagePreview: '', lastMessageAt: null, unreadCount: 0 }
            : c
        )
      );
    };

    const handlePollCreated = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || payload?.message?.conversationKey || '');
      const msg = payload?.message;
      if (!conversationKey || !msg) return;
      appendIncomingMessage(mapApiHistoryMessage(msg), conversationKey);
    };

    const handlePollVoted = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || '');
      const poll = toChatPoll(payload?.poll);
      if (!conversationKey || !poll) return;
      mergePollIntoMessagesRef.current(conversationKey, poll);
    };

    const handlePollClosed = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || '');
      const poll = toChatPoll(payload?.poll);
      if (!conversationKey || !poll) return;
      mergePollIntoMessagesRef.current(conversationKey, poll);
    };

    const handlePollDeleted = (payload: any) => {
      const pollId = String(payload?.pollId || '');
      if (!pollId) return;
      setMessages((prev) => prev.filter((message) => message.poll?.id !== pollId));
    };

    const handleMessagePinned = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || '');
      if (!conversationKey) return;
      if (selectedConversationKeyRef.current !== conversationKey) return;

      setPinnedMessage(
        payload?.pinnedMessage
          ? mapApiPinnedMessage({
              message: payload.pinnedMessage,
              pinnedBy: payload.pinnedBy,
              pinnedAt: payload.pinnedAt,
            })
          : null
      );
    };

    const handleMessageDeleted = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || '');
      const msg = payload?.message;
      if (!conversationKey || !msg) return;

      if (selectedConversationKeyRef.current === conversationKey) {
        setPinnedMessage((prev) =>
          prev?.message.id === String(msg.id) ? null : prev
        );
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.conversationKey !== conversationKey) return c;
          const wasLatest =
            !c.lastMessageAt ||
            Math.abs(new Date(c.lastMessageAt).getTime() - new Date(String(msg.createdAt || '')).getTime()) <
              1000;
          return wasLatest
            ? { ...c, lastMessagePreview: 'Message deleted' }
            : c;
        })
      );

      setMessages((prev) =>
        selectedConversationKeyRef.current !== conversationKey
          ? prev
          : prev.map((m) =>
              m.id === String(msg.id)
                ? {
                    ...m,
                    deleted: true,
                    content: String(msg.content || 'Message deleted'),
                    attachment: null,
                    tick: null,
                    editedAt: msg.editedAt ? String(msg.editedAt) : null,
                  }
                : m
            )
      );
    };

    const handleUnreadCleared = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || '');
      if (!conversationKey) return;
      const unreadCount =
        typeof payload?.unreadCount === 'number' && Number.isFinite(payload.unreadCount)
          ? Math.max(0, payload.unreadCount)
          : 0;
      setConversations((prev) =>
        prev.map((c) => (c.conversationKey === conversationKey ? { ...c, unreadCount } : c)),
      );
    };

    const handleConnect = () => {
      resyncOpenConversation({ force: true });
    };

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      void ensureSocketConnected(socket)
        .then(() => {
          resyncOpenConversation();
        })
        .catch(() => {
          // Keep silent; next reconnect handler will resync.
        });
    };

    socket.on('connect', handleConnect);
    socket.on('presence:update', handlePresence);
    socket.on('comm:typing', handleTyping);
    socket.on('comm:message:created', handleMessageCreated);
    socket.on('newMessage', handleMessageCreated);
    socket.on('messages_forwarded', handleMessagesForwarded);
    socket.on('comm:message:delivery', handleMessageDelivery);
    socket.on('comm:message:seen', handleMessageSeen);
    socket.on('comm:message:updated', handleMessageUpdated);
    socket.on('comm:message:deleted', handleMessageDeleted);
    socket.on('comm:message:pinned', handleMessagePinned);
    socket.on('comm:unread:cleared', handleUnreadCleared);
    socket.on('comm:chat:cleared', handleChatCleared);
    socket.on('poll_created', handlePollCreated);
    socket.on('poll_voted', handlePollVoted);
    socket.on('poll_closed', handlePollClosed);
    socket.on('poll_deleted', handlePollDeleted);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // If already connected when listeners attach, rejoin the open chat.
    // Do not force a history fetch here — that races with the normal open flow.
    if (socket.connected) {
      const conversationKey = selectedConversationKeyRef.current;
      if (conversationKey) socket.emit('comm:join', { conversationKey });
    } else {
      void ensureSocketConnected(socket).catch(() => {});
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('presence:update', handlePresence);
      socket.off('comm:typing', handleTyping);
      socket.off('comm:message:created', handleMessageCreated);
      socket.off('newMessage', handleMessageCreated);
      socket.off('messages_forwarded', handleMessagesForwarded);
      socket.off('comm:message:delivery', handleMessageDelivery);
      socket.off('comm:message:seen', handleMessageSeen);
      socket.off('comm:message:updated', handleMessageUpdated);
      socket.off('comm:message:deleted', handleMessageDeleted);
      socket.off('comm:message:pinned', handleMessagePinned);
      socket.off('comm:unread:cleared', handleUnreadCleared);
      socket.off('comm:chat:cleared', handleChatCleared);
      socket.off('poll_created', handlePollCreated);
      socket.off('poll_voted', handlePollVoted);
      socket.off('poll_closed', handlePollClosed);
      socket.off('poll_deleted', handlePollDeleted);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    socket,
    selectedConversationKeyRef,
    usersRef,
    conversationsRef,
    currentUserRef,
    seenSocketMessageIdsRef,
    lastMessageIdByConversationKeyRef,
    notificationTimersRef,
    setUsers,
    setConversations,
    setTypingUserIds,
    setMessages,
    setPinnedMessage,
    setNotifications,
  ]);
}
