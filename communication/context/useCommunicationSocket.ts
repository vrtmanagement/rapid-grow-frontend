import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { ChatConversationSummary, ChatMessage, ChatNotification, ChatPinnedMessage, ChatUser } from '../types';
import {
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
  setUsers,
  setConversations,
  setTypingUserIds,
  setMessages,
  setPinnedMessage,
  setNotifications,
}: UseCommunicationSocketArgs) {
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

    const appendIncomingMessage = (mapped: ChatMessage, conversationKey: string) => {
      const messageId = String(mapped.id || '');
      if (!messageId || !conversationKey) return;
      if (seenSocketMessageIdsRef.current[messageId]) return;

      seenSocketMessageIdsRef.current[messageId] = true;
      lastMessageIdByConversationKeyRef.current[conversationKey] = messageId;

      const isIncoming = mapped.senderId !== currentUserRef.current?.id;
      const isCurrentConversationOpen = selectedConversationKeyRef.current === conversationKey;
      const shouldNotify =
        isIncoming &&
        !isCurrentConversationOpen &&
        notificationPreferences.communicationMessages &&
        notificationPreferences.toastPreviews;

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

        scheduleNotificationAutoDismiss(nextNotification.id);
      }

      // If the message is for the current conversation, append it.
      if (selectedConversationKeyRef.current === conversationKey) {
        setMessages((prev) => upsertChatMessage(prev, mapped));
      }

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
        void markConversationSeen(conversationKey);
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

      // Update sidebar preview ordering even when the chat isn't currently open.
      setConversations((prev) => {
        const preview = messagePreviewFromMessage(updated).slice(0, 120);
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
      mergePollIntoMessages(conversationKey, poll);
    };

    const handlePollClosed = (payload: any) => {
      const conversationKey = String(payload?.conversationKey || '');
      const poll = toChatPoll(payload?.poll);
      if (!conversationKey || !poll) return;
      mergePollIntoMessages(conversationKey, poll);
    };

    const handlePollDeleted = (payload: any) => {
      const pollId = String(payload?.pollId || '');
      if (!pollId) return;
      setMessages((prev) =>
        prev.map((message) =>
          message.poll?.id === pollId
            ? {
                ...message,
                deleted: true,
                content: 'Poll deleted',
                poll: null,
              }
            : message
        )
      );
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
        prev.map((c) =>
          c.conversationKey === conversationKey
            ? { ...c, lastMessagePreview: 'Message deleted', unreadCount: 0 }
            : c
        )
      );

      const updated = mapApiHistoryMessage({
        ...msg,
        conversationKey,
        fileUrl: '',
        attachment: null,
      });

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
      const unreadCount =
        typeof payload?.unreadCount === 'number' && Number.isFinite(payload.unreadCount)
          ? Math.max(0, payload.unreadCount)
          : 0;
      setConversations((prev) =>
        prev.map((c) => (c.conversationKey === conversationKey ? { ...c, unreadCount } : c)),
      );
    };

    const handleConnect = () => {
      const conversationKey = selectedConversationKeyRef.current;
      if (!conversationKey) return;
      socket.emit('comm:join', { conversationKey });
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
    socket.on('poll_created', handlePollCreated);
    socket.on('poll_voted', handlePollVoted);
    socket.on('poll_closed', handlePollClosed);
    socket.on('poll_deleted', handlePollDeleted);

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
      socket.off('poll_created', handlePollCreated);
      socket.off('poll_voted', handlePollVoted);
      socket.off('poll_closed', handlePollClosed);
      socket.off('poll_deleted', handlePollDeleted);
    };

  }, [
    mergePollIntoMessages,
    notificationPreferences.communicationMessages,
    notificationPreferences.toastPreviews,
    markConversationSeen,
    scheduleNotificationAutoDismiss,
    socket,
  ]);
}
