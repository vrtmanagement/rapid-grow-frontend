import { createContext } from 'react';
import { ChatConversationSummary, ChatMessage, ChatNotification, ChatPinnedMessage, ChatUser } from '../types';

export type CommunicationContextValue = {
  currentUser: { id: string; name: string; role: string; empId?: string; avatar?: string } | null;
  users: ChatUser[];
  conversations: ChatConversationSummary[];
  usersLoading: boolean;
  conversationsLoading: boolean;
  error: string | null;

  selectedConversationKey: string | null;
  selectedConversation: ChatConversationSummary | null;

  messages: ChatMessage[];
  messagesLoading: boolean;
  pinnedMessage: ChatPinnedMessage | null;

  typingUserIds: Record<string, true>;

  selectChannel: (channelKey: string) => Promise<void>;
  startDmWithUser: (otherUserId: string) => Promise<void>;
  joinByConversationKey: (conversationKey: string) => Promise<void>;
  createTeam: (name: string, memberIds: string[], avatar?: string | null) => Promise<void>;
  updateTeam: (conversationKey: string, payload: { name?: string; memberIds?: string[]; avatar?: string | null }) => Promise<void>;
  deleteTeam: (conversationKey: string) => Promise<void>;

  sendText: (conversationKey: string, content: string, replyToMessageId?: string | null) => Promise<void>;
  sendFile: (
    conversationKey: string,
    file: File,
    content?: string,
    replyToMessageId?: string | null,
    bundleId?: string | null,
  ) => Promise<void>;
  createPoll: (
    conversationKey: string,
    payload: {
      question: string;
      options: string[];
      allowsMultipleAnswers: boolean;
      anonymous: boolean;
      expiresAt?: string | null;
    }
  ) => Promise<void>;
  votePoll: (pollId: string, optionIds: string[]) => Promise<void>;
  closePoll: (pollId: string) => Promise<void>;
  deletePoll: (pollId: string) => Promise<void>;
  forwardMessages: (messageIds: string[], recipientIds: string[], note?: string) => Promise<void>;
  notifyTyping: (conversationKey: string) => void;

  editMessage: (messageId: string, conversationKey: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string, conversationKey: string) => Promise<void>;
  pinMessage: (messageId: string, conversationKey: string) => Promise<void>;
  clearChat: (conversationKey: string) => Promise<void>;

  notifications: ChatNotification[];
  dismissNotification: (notificationId: string) => void;
  openNotificationConversation: (notificationId: string) => Promise<void>;
};

export const CommunicationContext = createContext<CommunicationContextValue | undefined>(undefined);
