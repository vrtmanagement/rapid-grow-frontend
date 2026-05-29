export type ChatConversationType = 'dm' | 'channel';
export type ChatMessageType = 'text' | 'image' | 'file' | 'attachment';
export type ChatRoleGroup = 'admin' | 'team_lead' | 'employees';

export type ChatTickState = 'sent' | 'delivered' | 'seen';

export type ChatUser = {
  id: string;
  empId: string;
  name: string;
  role: string;
  roleGroup: ChatRoleGroup;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  avatar?: string;
  online: boolean;
  lastSeenAt: string | null;
};

export type ChatConversationSummary = {
  conversationKey: string;
  type: ChatConversationType;
  title: string;
  avatar?: string;

  // dm
  otherUser?: ChatUser | null;

  // channel
  channelKey?: string | null;
  onlineCount?: number;
  memberIds?: string[];

  // ordering
  lastMessagePreview?: string;
  lastMessageAt?: string | null;

  // unread indicator
  unreadCount?: number;
};

export type ChatAttachment = {
  fileId: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type ChatReplyRef = {
  id: string;
  senderId: string;
  senderName?: string;
  type: ChatMessageType;
  content: string;
  deleted?: boolean;
  fileUrl?: string;
  attachment: ChatAttachment | null;
};

export type ChatForwardedMeta = {
  forwardedFromMessageId: string | null;
  forwardedFromUserId: string | null;
  forwardedFromSenderName: string;
  originalCreatedAt: string | null;
  forwardedAt: string | null;
};

export type ChatPinnedMessage = {
  message: ChatMessage;
  pinnedBy: string | null;
  pinnedAt: string | null;
};

export type ChatMessage = {
  id: string;
  conversationKey: string;
  type: ChatMessageType;
  senderId: string;
  content: string;
  fileUrl?: string;
  attachment: ChatAttachment | null;
  createdAt: string;

  deleted?: boolean;
  editedAt?: string | null;

  tick?: { state: ChatTickState; deliveredAt?: string; seenAt?: string } | null;
  replyTo?: ChatReplyRef | null;
  forwarded?: ChatForwardedMeta | null;
};

export type ChatNotification = {
  id: string;
  conversationKey: string;
  senderName: string;
  messagePreview: string;
  avatar?: string;
  createdAt: number;
};

