import { createContext } from 'react';
import { ChatConversationSummary, ChatMessage, ChatUser } from '../types';

export type CommunicationContextValue = {
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

export const CommunicationContext = createContext<CommunicationContextValue | undefined>(undefined);
