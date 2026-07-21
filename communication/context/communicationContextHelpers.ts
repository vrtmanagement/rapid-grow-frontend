import { resolveAvatarUrl as resolveSharedAvatarUrl } from '../../utils/avatar';
import {
  ChatAttachment,
  ChatForwardedMeta,
  ChatPoll,
  ChatPollOption,
  ChatReplyRef,
  ChatMessage,
  ChatPinnedMessage,
  ChatUser,
  ChatConversationSummary,
} from '../types';

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function resolveAvatarUrl(rawAvatar?: string | null): string | undefined {
  return resolveSharedAvatarUrl(rawAvatar);
}

export function resolveConversationAvatar(rawAvatar?: string | null): string | undefined {
  return resolveAvatarUrl(rawAvatar);
}

export function ensureSocketConnected(socket: any, timeoutMs = 5000): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      reject(new Error('Socket connection timeout'));
    }, timeoutMs);

    const onConnect = () => {
      window.clearTimeout(timeout);
      socket.off('connect_error', onConnectError);
      resolve();
    };
    const onConnectError = (err?: any) => {
      const reason = err?.message || err?.description || 'Socket connection failed';
      window.clearTimeout(timeout);
      socket.off('connect', onConnect);
      reject(new Error(reason));
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onConnectError);
    socket.connect();
  });
}

export function messagePreviewFromPayload(type: string, content: string, attachment?: ChatAttachment | null): string {
  if (type === 'text') return content.trim() || 'New message';
  if (type === 'image') return 'Image';
  if (type === 'poll') return `Poll: ${content.trim() || 'Untitled poll'}`;
  return attachment?.fileName ? `Attachment: ${attachment.fileName}` : 'New attachment';
}

export function messagePreviewFromMessage(message: Pick<ChatMessage, 'type' | 'content' | 'attachment' | 'forwarded'>): string {
  const base = messagePreviewFromPayload(message.type, message.content, message.attachment);
  return message.forwarded ? `Forwarded: ${base}` : base;
}

export function isDocumentVisible(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'visible';
}

export function toChatAttachment(attachment: any): ChatAttachment | null {
  return attachment
    ? ({
        fileId: String(attachment.fileId || ''),
        url: String(attachment.url || ''),
        fileName: String(attachment.fileName || ''),
        mimeType: String(attachment.mimeType || ''),
        size: Number(attachment.size || 0),
      } satisfies ChatAttachment)
    : null;
}

export function toChatReplyRef(reply: any): ChatReplyRef | null {
  return reply
    ? ({
        id: String(reply.id || ''),
        senderId: String(reply.senderId || ''),
        type: reply.type as any,
        content: String(reply.content || ''),
        deleted: !!reply.deleted,
        fileUrl: String(reply.fileUrl || reply.attachment?.url || ''),
        attachment: toChatAttachment(reply.attachment),
      } satisfies ChatReplyRef)
    : null;
}

export function toChatForwardedMeta(forwarded: any): ChatForwardedMeta | null {
  return forwarded
    ? ({
        forwardedFromMessageId: forwarded.forwardedFromMessageId ? String(forwarded.forwardedFromMessageId) : null,
        forwardedFromUserId: forwarded.forwardedFromUserId ? String(forwarded.forwardedFromUserId) : null,
        forwardedFromSenderName: String(forwarded.forwardedFromSenderName || 'Unknown sender'),
        originalCreatedAt: forwarded.originalCreatedAt ? String(forwarded.originalCreatedAt) : null,
        forwardedAt: forwarded.forwardedAt ? String(forwarded.forwardedAt) : null,
      } satisfies ChatForwardedMeta)
    : null;
}

export function toChatPollOption(option: any): ChatPollOption {
  return {
    id: String(option.id || ''),
    text: String(option.text || ''),
    order: Number(option.order || 0),
    voteCount: Number(option.voteCount || 0),
    percentage: Number(option.percentage || 0),
    selectedByMe: !!option.selectedByMe,
    voters: Array.isArray(option.voters)
      ? option.voters.map((voter: any) => ({
          id: String(voter.id || ''),
          empId: String(voter.empId || ''),
          name: String(voter.name || 'User'),
          avatar: resolveAvatarUrl(voter.avatar),
          role: typeof voter.role === 'string' ? voter.role : undefined,
        }))
      : [],
  };
}

export function toChatPoll(poll: any): ChatPoll | null {
  return poll
    ? ({
        id: String(poll.id || ''),
        question: String(poll.question || ''),
        allowsMultipleAnswers: !!poll.allowsMultipleAnswers,
        anonymous: !!poll.anonymous,
        expiresAt: poll.expiresAt ? String(poll.expiresAt) : null,
        createdAt: String(poll.createdAt || ''),
        createdBy: String(poll.createdBy || ''),
        closedAt: poll.closedAt ? String(poll.closedAt) : null,
        closedBy: poll.closedBy ? String(poll.closedBy) : null,
        totalVotes: Number(poll.totalVotes || 0),
        totalVoters: Number(poll.totalVoters || 0),
        status: (poll.status as ChatPoll['status']) || 'active',
        isActive: !!poll.isActive,
        myVoteOptionIds: Array.isArray(poll.myVoteOptionIds) ? poll.myVoteOptionIds.map((id: any) => String(id)) : [],
        options: Array.isArray(poll.options) ? poll.options.map(toChatPollOption) : [],
      } satisfies ChatPoll)
    : null;
}

export function mapListUsersApiRowToChatUser(u: any): ChatUser {
  return {
    id: String(u.id),
    empId: String(u.empId || ''),
    name: String(u.name || u.empId || 'User'),
    role: String(u.role || ''),
    roleGroup: (u.roleGroup as any) || 'employees',
    email: u.email,
    phone: u.phone,
    designation: u.designation,
    department: u.department,
    avatar: resolveAvatarUrl(u.avatar),
    online: !!u.online,
    lastSeenAt: u.lastSeenAt ? String(u.lastSeenAt) : null,
  };
}

export function mapListConversationsApiRowToSummary(c: any): ChatConversationSummary {
  return {
    conversationKey: String(c.conversationKey),
    type: c.type as any,
    title: String(c.title || ''),
    avatar: resolveConversationAvatar(c.avatar),
    otherUser:
      c.type === 'dm' && c.otherUser
        ? {
            id: String(c.otherUser.id),
            empId: String(c.otherUser.empId || ''),
            name: String(c.otherUser.name || 'User'),
            role: String(c.otherUser.role || ''),
            roleGroup: (c.otherUser.roleGroup as any) || 'employees',
            avatar: resolveAvatarUrl(c.otherUser.avatar),
            online: false,
            lastSeenAt: null,
          }
        : null,
    channelKey: c.type === 'channel' ? c.channelKey : null,
    memberIds: c.type === 'channel' && Array.isArray(c.memberIds) ? c.memberIds.map((id: any) => String(id)) : undefined,
    onlineCount: typeof c.onlineCount === 'number' ? c.onlineCount : undefined,
    unreadCount: typeof c.unreadCount === 'number' ? c.unreadCount : 0,
    lastMessagePreview: c.lastMessagePreview ? String(c.lastMessagePreview) : undefined,
    lastMessageAt: c.lastMessageAt ? String(c.lastMessageAt) : null,
  };
}

export function mapApiPinnedMessage(payload: any): ChatPinnedMessage | null {
  if (!payload?.message) return null;
  return {
    message: mapApiHistoryMessage(payload.message),
    pinnedBy: payload.pinnedBy ? String(payload.pinnedBy) : null,
    pinnedAt: payload.pinnedAt ? String(payload.pinnedAt) : null,
  };
}

export function mapApiHistoryMessage(m: any): ChatMessage {
  return {
    id: String(m.id),
    conversationKey: String(m.conversationKey),
    type: m.type as any,
    senderId: String(m.senderId),
    content: String(m.content || ''),
    fileUrl: String(m.fileUrl || m.attachment?.url || ''),
    deleted: !!m.deleted,
    editedAt: m.editedAt ? String(m.editedAt) : null,
    attachment: toChatAttachment(m.attachment),
    bundleId: m.bundleId ? String(m.bundleId) : null,
    clientMessageId: m.clientMessageId ? String(m.clientMessageId) : null,
    pending: false,
    localPreviewUrl: null,
    createdAt: String(m.createdAt),
    tick: m.tick
      ? ({
          state: m.tick.state as any,
          deliveredAt: m.tick.deliveredAt ? String(m.tick.deliveredAt) : undefined,
          seenAt: m.tick.seenAt ? String(m.tick.seenAt) : undefined,
        } satisfies ChatMessage['tick'])
      : null,
    replyTo: toChatReplyRef(m.replyTo),
    forwarded: toChatForwardedMeta(m.forwarded),
    poll: toChatPoll(m.poll),
  };
}
