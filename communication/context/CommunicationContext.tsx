import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiHistory, apiListConversations, apiListUsers } from '../api';
import { hasTabEndpointCache } from '../../services/tabSessionCache';
import { ChatConversationSummary, ChatMessage, ChatPinnedMessage, ChatUser, ChatNotification } from '../types';
import { getUnreadDirectMessageSourceCount } from '../unread';
import { getSocket } from '../../realtime/socket';
import { CommunicationContext, CommunicationContextValue } from './CommunicationContextCore';
import { PROFILE_AVATAR_UPDATED_EVENT } from '../../utils/avatar';
import {
  normalizeNotificationPreferences,
  NOTIFICATION_PREFERENCES_STORAGE_KEY,
  NOTIFICATION_PREFERENCES_UPDATED_EVENT,
  readStoredNotificationPreferences,
  type NotificationPreferences,
} from '../../services/notificationPreferences';
import {
  getStoredAuth,
  resolveAvatarUrl,
  mapApiHistoryMessage,
  mapApiPinnedMessage,
  mapListUsersApiRowToChatUser,
  mapListConversationsApiRowToSummary,
  isDocumentVisible,
  mergeHistoryWithLiveMessages,
} from './communicationContextHelpers';
import { avatarFromDirectory, loadEmployeeAvatarDirectory } from './communicationAvatarDirectory';
import { useCommunicationSocket } from './useCommunicationSocket';
import { useCommunicationActions } from './useCommunicationActions';

export function CommunicationProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isCommunicationRoute = location.pathname === '/communication' || location.pathname.startsWith('/communication/');
  const [currentUser, setCurrentUser] = useState<CommunicationContextValue['currentUser']>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<ChatPinnedMessage | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedConversationKey, setSelectedConversationKey] = useState<string | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<Record<string, true>>({});
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    readStoredNotificationPreferences,
  );

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
  const seenSocketMessageIdsRef = useRef<Record<string, true>>({});
  const notificationTimersRef = useRef<Record<string, number>>({});
  const markSeenTimerRef = useRef<Record<string, number>>({});
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const messagesLoadGenerationRef = useRef(0);

  const mergePollIntoMessages = useCallback((conversationKey: string, poll: any) => {
    if (!poll) return;
    setMessages((prev) =>
      selectedConversationKeyRef.current !== conversationKey
        ? prev
        : prev.map((message) =>
            message.poll?.id === String(poll.id)
              ? {
                  ...message,
                  content: poll.question || message.content,
                  poll,
                }
              : message
          )
    );
  }, []);

  const markConversationSeen = useCallback(
    (conversationKey: string, options?: { immediate?: boolean }): Promise<void> => {
      const key = String(conversationKey || '').trim();
      if (!key) return Promise.resolve();

      return new Promise((resolve) => {
        const run = () => {
          socket.emit('comm:seen:open', { conversationKey: key }, (ack: any) => {
            if (ack?.ok) {
              const unreadCount =
                typeof ack?.unreadCount === 'number' && Number.isFinite(ack.unreadCount)
                  ? Math.max(0, ack.unreadCount)
                  : 0;
              setConversations((prev) =>
                prev.map((c) => (c.conversationKey === key ? { ...c, unreadCount } : c)),
              );
            }
            resolve();
          });
        };

        if (options?.immediate) {
          if (markSeenTimerRef.current[key]) {
            window.clearTimeout(markSeenTimerRef.current[key]);
            delete markSeenTimerRef.current[key];
          }
          run();
          return;
        }

        if (markSeenTimerRef.current[key]) {
          window.clearTimeout(markSeenTimerRef.current[key]);
        }
        markSeenTimerRef.current[key] = window.setTimeout(() => {
          delete markSeenTimerRef.current[key];
          run();
        }, 250);
      });
    },
    [socket],
  );

  useEffect(() => {
    const stored = getStoredAuth();
    const employee = stored?.employee;
    if (!employee) return;
    setCurrentUser({
      id: String(employee._id || employee.empId),
      empId: String(employee.empId || ''),
      name: employee.empName || employee.name || 'User',
      role: employee.role || 'EMPLOYEE',
      avatar: resolveAvatarUrl(employee.avatar),
    });
  }, []);

  useEffect(() => {
    const handleNotificationPreferencesUpdated = (event: Event) => {
      const detail = (event as CustomEvent<NotificationPreferences>).detail;
      setNotificationPreferences(normalizeNotificationPreferences(detail));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== NOTIFICATION_PREFERENCES_STORAGE_KEY) return;
      setNotificationPreferences(readStoredNotificationPreferences());
    };

    window.addEventListener(NOTIFICATION_PREFERENCES_UPDATED_EVENT, handleNotificationPreferencesUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(NOTIFICATION_PREFERENCES_UPDATED_EVENT, handleNotificationPreferencesUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (notificationPreferences.communicationMessages && notificationPreferences.toastPreviews) return;

    Object.values(notificationTimersRef.current).forEach((timer) => window.clearTimeout(timer as number));
    notificationTimersRef.current = {};
    setNotifications([]);
  }, [notificationPreferences.communicationMessages, notificationPreferences.toastPreviews]);

  const loadUsers = useCallback(async (options?: { force?: boolean }) => {
    const hasCache = !options?.force && hasTabEndpointCache('communication', '/communication/users');
    if (!hasCache) setUsersLoading(true);
    setError(null);
    try {
      const [data, avatarDirectory] = await Promise.all([
        apiListUsers(options),
        loadEmployeeAvatarDirectory(),
      ]);
      const storedEmployee = getStoredAuth()?.employee || {};
      const storedUserId = String(storedEmployee._id || storedEmployee.empId || '').trim();
      const storedEmpId = String(storedEmployee.empId || '').trim();
      const storedAvatar = resolveAvatarUrl(storedEmployee.avatar);
      const mapped: ChatUser[] = (data.users || []).map((user: any) => {
        const mappedUser = mapListUsersApiRowToChatUser(user);
        const directoryAvatar = avatarFromDirectory(avatarDirectory, mappedUser.id, mappedUser.empId, mappedUser.name);
        const sessionAvatar =
          storedAvatar &&
          ((storedUserId && mappedUser.id === storedUserId) || (storedEmpId && mappedUser.empId === storedEmpId))
            ? storedAvatar
            : '';
        const avatar = directoryAvatar || sessionAvatar || mappedUser.avatar;
        return avatar ? { ...mappedUser, avatar } : mappedUser;
      });
      setUsers(mapped);
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const fresh = mapped.find((user) => user.id === prev.id || user.empId === prev.empId);
        return fresh ? { ...prev, empId: fresh.empId, name: fresh.name, role: fresh.role, avatar: fresh.avatar } : prev;
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally {
      if (!hasCache) setUsersLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async (options?: { force?: boolean }) => {
    const hasCache = !options?.force && hasTabEndpointCache('communication', '/communication/conversations');
    if (!hasCache) setConversationsLoading(true);
    setError(null);
    try {
      const [data, avatarDirectory] = await Promise.all([
        apiListConversations(options),
        loadEmployeeAvatarDirectory(),
      ]);
      const mapped: ChatConversationSummary[] = (data.conversations || []).map((conversation: any) => {
        const mappedConversation = mapListConversationsApiRowToSummary(conversation);
        if (mappedConversation.type !== 'dm' || !mappedConversation.otherUser) {
          return mappedConversation;
        }
        const directoryAvatar = avatarFromDirectory(
          avatarDirectory,
          mappedConversation.otherUser.id,
          mappedConversation.otherUser.empId,
          mappedConversation.otherUser.name,
        );
        if (!directoryAvatar) return mappedConversation;
        return {
          ...mappedConversation,
          avatar: directoryAvatar,
          otherUser: {
            ...mappedConversation.otherUser,
            avatar: directoryAvatar,
          },
        };
      });

      setConversations(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load conversations');
    } finally {
      if (!hasCache) setConversationsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationKey: string) => {
    const generation = ++messagesLoadGenerationRef.current;
    const keepVisible =
      selectedConversationKeyRef.current === conversationKey && messagesRef.current.length > 0;
    if (!keepVisible) setMessagesLoading(true);
    setError(null);
    try {
      const data = await apiHistory(conversationKey, 200);
      if (generation !== messagesLoadGenerationRef.current) return;
      if (selectedConversationKeyRef.current !== conversationKey) return;
      const mapped: ChatMessage[] = (data.messages || [])
        .map(mapApiHistoryMessage)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages((prev) => mergeHistoryWithLiveMessages(mapped, prev, conversationKey));
      setPinnedMessage(mapApiPinnedMessage(data.pinnedMessage));
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
      if (generation !== messagesLoadGenerationRef.current) return;
      setError(e?.message || 'Failed to load messages');
      if (!keepVisible) {
        setMessages([]);
        setPinnedMessage(null);
      }
    } finally {
      if (generation === messagesLoadGenerationRef.current) {
        setMessagesLoading(false);
      }
    }
  }, []);

  const directoryLoadedRef = useRef(false);

  // Load chat directory only when the Communication tab is opened.
  useEffect(() => {
    if (!isCommunicationRoute) return;
    if (directoryLoadedRef.current) return;
    directoryLoadedRef.current = true;
    loadUsers();
    loadConversations();
  }, [isCommunicationRoute, loadUsers, loadConversations]);

  // Keep server read-state aligned while a conversation stays open on screen.
  useEffect(() => {
    if (!selectedConversationKey) return;
    void markConversationSeen(selectedConversationKey, { immediate: true });
  }, [selectedConversationKey, markConversationSeen]);

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

  const visibleUserIds = useMemo(() => new Set(users.map((user) => user.id)), [users]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('rapidgrow:communication-unread-sync', {
        detail: {
          unreadSourceCount: getUnreadDirectMessageSourceCount(conversations, {
            currentUserId: currentUser?.id,
            visibleUserIds,
          }),
        },
      })
    );
  }, [conversations, currentUser?.id, visibleUserIds]);

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

  useCommunicationSocket({
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
  });

  const {
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
  } = useCommunicationActions({
    socket,
    conversations,
    notifications,
    locationPathname: location.pathname,
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
  });

  const selectedConversation = useMemo(() => {
    if (!selectedConversationKey) return null;
    const conversation = conversations.find((c) => c.conversationKey === selectedConversationKey) || null;
    if (!conversation || conversation.type !== 'dm' || !conversation.otherUser) return conversation;
    const freshUser = users.find((user) => user.id === conversation.otherUser?.id || user.empId === conversation.otherUser?.empId);
    if (!freshUser) return conversation;
    return {
      ...conversation,
      title: freshUser.name || conversation.title,
      avatar: freshUser.avatar || conversation.avatar,
      otherUser: {
        ...conversation.otherUser,
        ...freshUser,
        avatar: freshUser.avatar || conversation.otherUser.avatar,
      },
    };
  }, [conversations, selectedConversationKey, users]);

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
    pinnedMessage,
    typingUserIds,
    selectChannel,
    startDmWithUser,
    joinByConversationKey,
    createTeam,
    updateTeam,
    deleteTeam,
    sendText,
    sendFile,
    createPoll,
    votePoll,
    closePoll,
    deletePoll,
    forwardMessages,
    notifyTyping,
    editMessage,
    deleteMessage,
    pinMessage,
    clearChat,
    notifications,
    dismissNotification,
    openNotificationConversation,
  };

  return <CommunicationContext.Provider value={value}>{children}</CommunicationContext.Provider>;
}

// Re-export public API so existing imports keep working.
export { CommunicationContext, type CommunicationContextValue } from './CommunicationContextCore';
export { useCommunication } from './useCommunication';
