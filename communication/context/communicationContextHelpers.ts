import { resolveAvatarUrl as resolveSharedAvatarUrl } from '../../utils/avatar';
import {
  ChatAttachment,
  ChatReplyRef,
  ChatMessage,
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
  return attachment?.fileName ? `Attachment: ${attachment.fileName}` : 'New attachment';
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
    createdAt: String(m.createdAt),
    tick: m.tick
      ? ({
          state: m.tick.state as any,
          deliveredAt: m.tick.deliveredAt ? String(m.tick.deliveredAt) : undefined,
          seenAt: m.tick.seenAt ? String(m.tick.seenAt) : undefined,
        } satisfies ChatMessage['tick'])
      : null,
    replyTo: toChatReplyRef(m.replyTo),
  };
}
