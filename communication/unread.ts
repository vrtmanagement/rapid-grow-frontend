import { ChatConversationSummary } from './types';

export function getUnreadDirectMessageSourceCount(conversations: ChatConversationSummary[]): number {
  return conversations.filter((conversation) => {
    return conversation.type === 'dm' && (conversation.unreadCount || 0) > 0;
  }).length;
}

export function hasUnreadDirectMessagesFromUser(
  conversations: ChatConversationSummary[],
  userId: string
): boolean {
  return conversations.some((conversation) => {
    return conversation.type === 'dm' && conversation.otherUser?.id === userId && (conversation.unreadCount || 0) > 0;
  });
}
