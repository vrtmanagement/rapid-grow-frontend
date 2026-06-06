import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClearChat, apiClosePoll, apiCreatePoll, apiCreateTeam, apiDeletePoll, apiDeleteTeam, apiForwardMessages, apiHistory, apiListConversations, apiListUsers, apiMarkAsRead, apiPinMessage, apiUpdateTeam, apiUploadFile, apiVotePoll } from '../api';
import { API_BASE, getAuthHeaders } from '../../config/api';
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
  ensureSocketConnected,
  messagePreviewFromMessage,
  isDocumentVisible,
  mapApiHistoryMessage,
  mapApiPinnedMessage,
  mapListUsersApiRowToChatUser,
  mapListConversationsApiRowToSummary,
  toChatPoll,
} from './communicationContextHelpers';

type EmployeeAvatarDirectory = {
  byId: Map<string, string>;
  byEmpId: Map<string, string>;
  byName: Map<string, string>;
};

function createEmptyAvatarDirectory(): EmployeeAvatarDirectory {
  return {
    byId: new Map<string, string>(),
    byEmpId: new Map<string, string>(),
    byName: new Map<string, string>(),
  };
}

function addAvatarToDirectory(
  directory: EmployeeAvatarDirectory,
  input: { id?: unknown; _id?: unknown; empId?: unknown; name?: unknown; empName?: unknown; avatar?: unknown },
) {
  const avatar = resolveAvatarUrl(typeof input.avatar === 'string' ? input.avatar : '');
  if (!avatar) return;
  const id = String(input.id || input._id || '').trim();
  const empId = String(input.empId || '').trim();
  const name = String(input.name || input.empName || '').trim().toLowerCase();
  if (id) directory.byId.set(id, avatar);
  if (empId) directory.byEmpId.set(empId, avatar);
  if (name) directory.byName.set(name, avatar);
}

function loadStoredAvatarDirectory(): EmployeeAvatarDirectory {
  const directory = createEmptyAvatarDirectory();
  try {
    const auth = getStoredAuth();
    if (auth?.employee) {
      addAvatarToDirectory(directory, {
        _id: auth.employee._id,
        empId: auth.employee.empId,
        empName: auth.employee.empName || auth.employee.name,
        avatar: auth.employee.avatar,
      });
    }
  } catch {
    // Ignore malformed auth storage.
  }

  try {
    const raw = localStorage.getItem('rapidgrow-os-v1');
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.currentUser) {
      addAvatarToDirectory(directory, parsed.currentUser);
    }
    if (Array.isArray(parsed?.team)) {
      parsed.team.forEach((member: any) => addAvatarToDirectory(directory, member));
    }
  } catch {
    // Ignore stale app state storage.
  }

  return directory;
}

function mergeAvatarDirectories(...directories: EmployeeAvatarDirectory[]): EmployeeAvatarDirectory {
  const merged = createEmptyAvatarDirectory();
  directories.forEach((directory) => {
    directory.byId.forEach((avatar, key) => merged.byId.set(key, avatar));
    directory.byEmpId.forEach((avatar, key) => merged.byEmpId.set(key, avatar));
    directory.byName.forEach((avatar, key) => merged.byName.set(key, avatar));
  });
  return merged;
}

async function loadEmployeeAvatarDirectory(): Promise<EmployeeAvatarDirectory> {
  const byId = new Map<string, string>();
  const byEmpId = new Map<string, string>();
  const byName = new Map<string, string>();
  const apiDirectory = { byId, byEmpId, byName };
  try {
    const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
    if (!res.ok) return mergeAvatarDirectories(loadStoredAvatarDirectory(), apiDirectory);
    const employees = await res.json().catch(() => []);
    if (!Array.isArray(employees)) return mergeAvatarDirectories(loadStoredAvatarDirectory(), apiDirectory);
    employees.forEach((employee: any) => {
      addAvatarToDirectory(apiDirectory, employee);
    });
  } catch {
    // Communication can still render fallbacks if the broader directory is unavailable.
  }
  return mergeAvatarDirectories(loadStoredAvatarDirectory(), apiDirectory);
}

function avatarFromDirectory(directory: EmployeeAvatarDirectory, id?: string, empId?: string, name?: string) {
  const normalizedId = String(id || '').trim();
  const normalizedEmpId = String(empId || '').trim();
  const normalizedName = String(name || '').trim().toLowerCase();
  return (
    (normalizedId ? directory.byId.get(normalizedId) : '') ||
    (normalizedEmpId ? directory.byEmpId.get(normalizedEmpId) : '') ||
    (normalizedName ? directory.byName.get(normalizedName) : '') ||
    ''
  );
}

export function CommunicationProvider({ children }: { children: React.ReactNode }) {
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

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setError(null);
    try {
      const [data, avatarDirectory] = await Promise.all([
        apiListUsers(),
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
      setUsersLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    setError(null);
    try {
      const [data, avatarDirectory] = await Promise.all([
        apiListConversations(),
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
      setError(e?.message || 'Failed to load messages');
      setMessages([]);
      setPinnedMessage(null);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Global data bootstrap
  useEffect(() => {
    loadUsers();
    loadConversations();
  }, [loadUsers, loadConversations]);

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
        setMessages((prev) => {
          if (prev.some((m) => m.id === mapped.id)) {
            return prev.map((m) => (m.id === mapped.id ? mapped : m));
          }
          return [...prev, mapped];
        });
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

    socket.on('presence:update', handlePresence);
    socket.on('comm:typing', handleTyping);
    socket.on('comm:message:created', handleMessageCreated);
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
      socket.off('presence:update', handlePresence);
      socket.off('comm:typing', handleTyping);
      socket.off('comm:message:created', handleMessageCreated);
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
    const result = await apiVotePoll({ pollId, optionIds });
    if (result?.conversationKey && result?.poll) {
      const mapped = toChatPoll(result.poll);
      if (mapped) {
        mergePollIntoMessages(result.conversationKey, mapped);
      }
    }
  }, [mergePollIntoMessages]);

  const closePoll = useCallback(async (pollId: string) => {
    const result = await apiClosePoll(pollId);
    if (result?.conversationKey && result?.poll) {
      const mapped = toChatPoll(result.poll);
      if (mapped) {
        mergePollIntoMessages(result.conversationKey, mapped);
      }
    }
  }, [mergePollIntoMessages]);

  const deletePoll = useCallback(async (pollId: string) => {
    const result = await apiDeletePoll(pollId);
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
      socket.emit(
        'comm:message:delete',
        { messageId, conversationKey },
        () => {}
      );
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

