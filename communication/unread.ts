import { ChatConversationSummary } from './types';

export type UnreadCountOptions = {
  currentUserId?: string;
  /** Active directory users — DMs with other users not in this set are excluded from the badge. */
  visibleUserIds?: ReadonlySet<string>;
};

function normalizeUnreadCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

/**
 * Counts conversations that should surface an unread indicator in the sidebar badge.
 * Matches the Communication sidebar: team channels plus DMs for visible users (and self-chat).
 */
export function getUnreadDirectMessageSourceCount(
  conversations: ChatConversationSummary[],
  options?: UnreadCountOptions,
): number {
  const currentUserId = options?.currentUserId ? String(options.currentUserId) : '';
  const visibleUserIds = options?.visibleUserIds;
  const visibleDmByUserId = new Map<string, ChatConversationSummary>();
  const unreadChannelKeys = new Set<string>();

  conversations.forEach((conversation) => {
    const unreadCount = normalizeUnreadCount(conversation.unreadCount);
    if (unreadCount <= 0) return;

    if (conversation.type === 'channel') {
      unreadChannelKeys.add(conversation.conversationKey);
      return;
    }

    if (conversation.type !== 'dm') return;

    const otherUserId = conversation.otherUser?.id ? String(conversation.otherUser.id) : '';
    if (!otherUserId) return;

    if (visibleUserIds && currentUserId) {
      const isSelf = otherUserId === currentUserId;
      if (!isSelf && !visibleUserIds.has(otherUserId)) return;
    }

    const existing = visibleDmByUserId.get(otherUserId);
    if (!existing || unreadCount > normalizeUnreadCount(existing.unreadCount)) {
      visibleDmByUserId.set(otherUserId, conversation);
    }
  });

  const unreadDmCount = Array.from(visibleDmByUserId.values()).filter(
    (conversation) => normalizeUnreadCount(conversation.unreadCount) > 0,
  ).length;

  return unreadDmCount + unreadChannelKeys.size;
}

export function getTotalUnreadMessageCount(conversations: ChatConversationSummary[]): number {
  return conversations.reduce((total, conversation) => {
    return total + normalizeUnreadCount(conversation.unreadCount);
  }, 0);
}

export function hasUnreadDirectMessagesFromUser(
  conversations: ChatConversationSummary[],
  userId: string,
): boolean {
  return conversations.some((conversation) => {
    return (
      conversation.type === 'dm' &&
      conversation.otherUser?.id === userId &&
      normalizeUnreadCount(conversation.unreadCount) > 0
    );
  });
}
