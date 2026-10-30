import { create } from 'zustand';
import type { ChatNotification } from '../types';

type ChatAlertStoreState = {
  notifications: ChatNotification[];
  /** Conversation the user is currently looking at (Communication tab only). */
  viewingConversationKey: string | null;
  isCommunicationRoute: boolean;
  seenMessageIds: Record<string, true>;
  setViewingState: (state: {
    viewingConversationKey: string | null;
    isCommunicationRoute: boolean;
  }) => void;
  pushIncomingAlert: (notification: ChatNotification, messageId: string) => boolean;
  dismissNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  hasSeenMessage: (messageId: string) => boolean;
  markMessageSeen: (messageId: string) => void;
};

export const useChatAlertStore = create<ChatAlertStoreState>((set, get) => ({
  notifications: [],
  viewingConversationKey: null,
  isCommunicationRoute: false,
  seenMessageIds: {},

  setViewingState: ({ viewingConversationKey, isCommunicationRoute }) =>
    set({
      viewingConversationKey: viewingConversationKey || null,
      isCommunicationRoute: !!isCommunicationRoute,
    }),

  hasSeenMessage: (messageId) => !!get().seenMessageIds[String(messageId || '')],

  markMessageSeen: (messageId) => {
    const id = String(messageId || '');
    if (!id) return;
    set((state) => ({
      seenMessageIds: { ...state.seenMessageIds, [id]: true },
    }));
  },

  pushIncomingAlert: (notification, messageId) => {
    const id = String(messageId || '');
    if (!id) return false;
    if (get().seenMessageIds[id]) return false;

    set((state) => {
      const withoutDup = state.notifications.filter((item) => item.id !== notification.id);
      return {
        seenMessageIds: { ...state.seenMessageIds, [id]: true },
        notifications: [...withoutDup, notification].slice(-5),
      };
    });
    return true;
  },

  dismissNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter((item) => item.id !== notificationId),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
