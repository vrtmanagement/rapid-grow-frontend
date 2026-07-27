import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import {
  apiClearChat,
  apiClosePoll,
  apiCreatePoll,
  apiCreateTeam,
  apiDeletePoll,
  apiDeleteTeam,
  apiForwardMessages,
  apiMarkAsRead,
  apiPinMessage,
  apiUpdateTeam,
  apiUploadFile,
  apiVotePoll,
} from '../api';
import { API_BASE } from '../../config/api';
import { ChatConversationSummary, ChatMessage, ChatNotification, ChatPinnedMessage } from '../types';
import {
  ensureSocketConnected,
  mapApiPinnedMessage,
  resolveAvatarUrl,
  toChatPoll,
} from './communicationContextHelpers';

type CurrentUser = { id: string; name: string; role: string; empId?: string; avatar?: string } | null;

type UseCommunicationActionsArgs = {
  socket: any;
  conversations: ChatConversationSummary[];
  notifications: ChatNotification[];
  locationPathname: string;
  navigate: (path: string) => void;
  selectedConversationKeyRef: MutableRefObject<string | null>;
  currentUserRef: MutableRefObject<CurrentUser>;
  typingStopTimer: MutableRefObject<number | null>;
  loadMessages: (conversationKey: string) => Promise<void>;
  loadConversations: (options?: { force?: boolean }) => Promise<void>;
  markConversationSeen: (conversationKey: string, options?: { immediate?: boolean }) => Promise<void>;
  mergePollIntoMessages: (conversationKey: string, poll: any) => void;
  dismissNotification: (notificationId: string) => void;
  setError: Dispatch<SetStateAction<string | null>>;
  setTypingUserIds: Dispatch<SetStateAction<Record<string, true>>>;
  setSelectedConversationKey: Dispatch<SetStateAction<string | null>>;
  setConversations: Dispatch<SetStateAction<ChatConversationSummary[]>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPinnedMessage: Dispatch<SetStateAction<ChatPinnedMessage | null>>;
};

export function useCommunicationActions({
  socket,
  conversations,
  notifications,
  locationPathname,
  navigate,
  selectedConversationKeyRef,
  currentUserRef,
  typingStopTimer,
  loadMessages,
  loadConversations,
  markConversationSeen,
  mergePollIntoMessages,
  dismissNotification,
  setError,
  setTypingUserIds,
  setSelectedConversationKey,
  setConversations,
  setMessages,
  setPinnedMessage,
}: UseCommunicationActionsArgs) {
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
                await markConversationSeen(conversationKey, { immediate: true });

                try {
                  await apiMarkAsRead({ conversationKey });
                } catch (err) {
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
    [conversations, loadMessages, markConversationSeen, socket]
  );

  const openNotificationConversation = useCallback(
    async (notificationId: string) => {
      const target = notifications.find((item) => item.id === notificationId);
      if (!target) return;
      dismissNotification(notificationId);
      if (typeof window !== 'undefined' && !locationPathname.startsWith('/communication')) {
        navigate('/communication');
      }
      await joinByConversationKey(target.conversationKey);
    },
    [dismissNotification, joinByConversationKey, locationPathname, navigate, notifications]
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
              await markConversationSeen(conversationKey, { immediate: true });
              try {
                await apiMarkAsRead({ conversationKey });
              } catch (err) {
                console.warn('apiMarkAsRead failed', err);
              }
              resolve();
            } catch (e: any) {
              reject(e);
            }
          }
        );
      });
    },
    [conversations, loadMessages, markConversationSeen, socket]
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
                await markConversationSeen(conversationKey, { immediate: true });
                try {
                  await apiMarkAsRead({ conversationKey });
                } catch (err) {
                  console.warn('apiMarkAsRead failed', err);
                }
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
    [conversations, joinByConversationKey, loadMessages, markConversationSeen, socket]
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
      if (!/\S/.test(content)) return;
      if (!conversationKey) return;

      const senderId = currentUserRef.current?.id;
      if (!senderId) return;

      const clientMessageId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? (crypto as any).randomUUID()
          : `cmi_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const pendingMessage: ChatMessage = {
        id: `pending_${clientMessageId}`,
        conversationKey,
        type: 'text',
        senderId,
        content,
        attachment: null,
        bundleId: null,
        clientMessageId,
        pending: true,
        createdAt: new Date().toISOString(),
        tick: { state: 'sent' },
        replyTo: null,
      };

      if (selectedConversationKeyRef.current === conversationKey) {
        setMessages((prev) => [...prev, pendingMessage]);
      }

      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error('Message send timeout')), 8000);
          socket.emit(
            'comm:message:send',
            {
              conversationKey,
              type: 'text',
              content,
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
      } catch (error) {
        setMessages((prev) => prev.filter((message) => message.id !== pendingMessage.id));
        throw error;
      }
    },
    [socket]
  );

  const sendFile = useCallback(
    async (
      conversationKey: string,
      file: File,
      content?: string,
      replyToMessageId?: string | null,
      bundleId?: string | null,
    ) => {
      if (!file) return;
      if (!conversationKey) return;

      const senderId = currentUserRef.current?.id;
      if (!senderId) return;

      const clientMessageId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? (crypto as any).randomUUID()
          : `cmi_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const isImage = String(file.type || '').startsWith('image/');
      const isVideo = String(file.type || '').startsWith('video/');
      const localPreviewUrl = isImage || isVideo ? URL.createObjectURL(file) : null;

      const pendingMessage: ChatMessage = {
        id: `pending_${clientMessageId}`,
        conversationKey,
        type: isImage ? 'image' : 'file',
        senderId,
        content: content?.toString() || '',
        fileUrl: localPreviewUrl || '',
        attachment: {
          fileId: '',
          url: localPreviewUrl || '',
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size || 0,
        },
        bundleId: bundleId || null,
        clientMessageId,
        pending: true,
        localPreviewUrl,
        createdAt: new Date().toISOString(),
        tick: { state: 'sent' },
        replyTo: null,
      };

      if (selectedConversationKeyRef.current === conversationKey) {
        setMessages((prev) => [...prev, pendingMessage]);
      }

      try {
        const upload = await apiUploadFile(file);
        const fileUrl = upload.fileUrl || `${API_BASE}${upload.urlPath}`;

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
              bundleId: bundleId || undefined,
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
      } catch (error) {
        setMessages((prev) => {
          const next = prev.filter((message) => message.id !== pendingMessage.id);
          if (localPreviewUrl) {
            try {
              URL.revokeObjectURL(localPreviewUrl);
            } catch {
              // ignore
            }
          }
          return next;
        });
        throw error;
      }
    },
    [socket]
  );

  const createPoll = useCallback(
    async (
      conversationKey: string,
      payload: {
        question: string;
        options: string[];
        allowsMultipleAnswers: boolean;
        anonymous: boolean;
        expiresAt?: string | null;
      }
    ) => {
      if (!conversationKey) return;
      await apiCreatePoll({
        conversationKey,
        question: payload.question,
        options: payload.options,
        allowsMultipleAnswers: payload.allowsMultipleAnswers,
        anonymous: payload.anonymous,
        expiresAt: payload.expiresAt || null,
      });
    },
    []
  );

  const votePoll = useCallback(async (pollId: string, optionIds: string[]) => {
    const result: any = await apiVotePoll({ pollId, optionIds });
    if (result?.conversationKey && result?.poll) {
      const mapped = toChatPoll(result.poll);
      if (mapped) {
        mergePollIntoMessages(result.conversationKey, mapped);
      }
    }
  }, [mergePollIntoMessages]);

  const closePoll = useCallback(async (pollId: string) => {
    const result: any = await apiClosePoll(pollId);
    if (result?.conversationKey && result?.poll) {
      const mapped = toChatPoll(result.poll);
      if (mapped) {
        mergePollIntoMessages(result.conversationKey, mapped);
      }
    }
  }, [mergePollIntoMessages]);

  const deletePoll = useCallback(async (pollId: string) => {
    const result: any = await apiDeletePoll(pollId);
    const deletedPollId = String(result?.pollId || pollId);
    setMessages((prev) =>
      prev.map((message) =>
        message.poll?.id === deletedPollId
          ? {
              ...message,
              deleted: true,
              content: 'Poll deleted',
              poll: null,
            }
          : message
      )
    );
  }, []);

  const editMessage = useCallback(
    async (messageId: string, conversationKey: string, newContent: string) => {
      if (!/\S/.test(newContent)) return;
      if (!messageId || !conversationKey) return;
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Message edit timeout')), 8000);
        socket.emit(
          'comm:message:edit',
          { messageId, conversationKey, content: newContent },
          (ack: any) => {
            window.clearTimeout(timeout);
            if (!ack?.ok) {
              reject(new Error(String(ack?.error || 'Failed to edit message')));
              return;
            }
            resolve();
          }
        );
      });
    },
    [socket]
  );

  const deleteMessage = useCallback(
    async (messageId: string, conversationKey: string) => {
      if (!messageId || !conversationKey) return;

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Message delete timeout')), 8000);
        socket.emit(
          'comm:message:delete',
          { messageId, conversationKey },
          (ack: any) => {
            window.clearTimeout(timeout);
            if (ack && ack.ok === false) {
              reject(new Error(String(ack?.error || 'Failed to delete message')));
              return;
            }
            resolve();
          }
        );
      });
    },
    [socket]
  );

  const pinMessage = useCallback(
    async (messageId: string, conversationKey: string) => {
      if (!messageId || !conversationKey) return;
      const result = await apiPinMessage(conversationKey, messageId);
      if (selectedConversationKeyRef.current === conversationKey) {
        setPinnedMessage(mapApiPinnedMessage(result.pinnedMessage));
      }
    },
    []
  );

  const forwardMessages = useCallback(
    async (messageIds: string[], recipientIds: string[], note?: string) => {
      const sanitizedMessageIds = Array.from(new Set(messageIds.map((messageId) => String(messageId || '').trim()).filter(Boolean)));
      const sanitizedRecipientIds = Array.from(new Set(recipientIds.map((recipientId) => String(recipientId || '').trim()).filter(Boolean)));
      if (!sanitizedMessageIds.length || !sanitizedRecipientIds.length) return;
      await apiForwardMessages({
        messageIds: sanitizedMessageIds,
        recipientIds: sanitizedRecipientIds,
        note: note?.trim() || undefined,
      });
      await loadConversations();
    },
    [loadConversations]
  );

  const clearChat = useCallback(
    async (conversationKey: string) => {
      if (!conversationKey) return;
      try {
        setMessages([]);
        setPinnedMessage(null);
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

  return {
    joinByConversationKey,
    openNotificationConversation,
    selectChannel,
    startDmWithUser,
    createTeam,
    updateTeam,
    deleteTeam,
    sendText,
    sendFile,
    createPoll,
    votePoll,
    closePoll,
    deletePoll,
    editMessage,
    deleteMessage,
    pinMessage,
    forwardMessages,
    clearChat,
    notifyTyping,
  };
}
