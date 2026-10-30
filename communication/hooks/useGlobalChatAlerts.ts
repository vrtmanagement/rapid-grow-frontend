import { useEffect, useRef } from 'react';
import { getSocket } from '../../realtime/socket';
import { ensureSocketConnected, getStoredAuth, messagePreviewFromMessage, mapApiHistoryMessage } from '../context/communicationContextHelpers';
import { readStoredNotificationPreferences } from '../../services/notificationPreferences';
import {
  registerCommunicationNotificationServiceWorker,
  showDesktopChatNotification,
} from '../browserNotifications';
import { useChatAlertStore } from '../stores/useChatAlertStore';
import type { ChatNotification } from '../types';

function resolveCurrentUserId(): string {
  const employee = getStoredAuth()?.employee;
  if (!employee) return '';
  return String(employee._id || employee.empId || '').trim();
}

function previewFromPayload(message: any): string {
  try {
    return messagePreviewFromMessage(mapApiHistoryMessage(message));
  } catch {
    const content = String(message?.content || '').trim();
    if (content) return content.slice(0, 120);
    if (message?.attachment?.fileName) return `Attachment: ${message.attachment.fileName}`;
    return 'New message';
  }
}

function playIncomingMessageSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    oscillator.stop(ctx.currentTime + 0.2);
    window.setTimeout(() => {
      void ctx.close();
    }, 300);
  } catch {
    // Autoplay policies may block until a user gesture; ignore.
  }
}

/**
 * WhatsApp-style alert pipeline.
 * IMPORTANT: only listens to `comm:inbox:notify` so it can never block
 * `newMessage` / `comm:message:created` handlers that power live chat UI.
 */
export function useGlobalChatAlerts() {
  const dismissTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    void registerCommunicationNotificationServiceWorker();

    const socket = getSocket();
    let cancelled = false;

    const clearTimer = (notificationId: string) => {
      const timer = dismissTimersRef.current[notificationId];
      if (!timer) return;
      window.clearTimeout(timer);
      delete dismissTimersRef.current[notificationId];
    };

    const scheduleDismiss = (notificationId: string) => {
      clearTimer(notificationId);
      dismissTimersRef.current[notificationId] = window.setTimeout(() => {
        useChatAlertStore.getState().dismissNotification(notificationId);
        delete dismissTimersRef.current[notificationId];
      }, 6000);
    };

    const handleIncoming = (payload: any) => {
      if (cancelled) return;

      try {
        const prefs = readStoredNotificationPreferences();
        if (prefs.communicationMessages === false) return;

        const conversationKey = String(
          payload?.conversationKey || payload?.message?.conversationKey || '',
        ).trim();
        const message = payload?.message;
        if (!conversationKey || !message) return;

        const messageId = String(message.id || message._id || '').trim();
        if (!messageId) return;

        const store = useChatAlertStore.getState();
        if (store.hasSeenMessage(messageId)) return;

        const currentUserId = resolveCurrentUserId();
        const senderId = String(message.senderId || '').trim();
        if (!senderId) return;
        // Ignore our own outbound echoes.
        if (currentUserId && senderId === currentUserId) {
          store.markMessageSeen(messageId);
          return;
        }

        const viewingThisChat =
          store.isCommunicationRoute &&
          !!store.viewingConversationKey &&
          store.viewingConversationKey === conversationKey;
        if (viewingThisChat) {
          store.markMessageSeen(messageId);
          return;
        }

        const senderName =
          String(payload?.sender?.name || '').trim() ||
          String(payload?.senderName || '').trim() ||
          'New message';
        const avatar = String(payload?.sender?.avatar || payload?.avatar || '').trim() || undefined;
        const messagePreview = previewFromPayload(message);

        const notification: ChatNotification = {
          id: `notif_${messageId}`,
          conversationKey,
          senderName,
          messagePreview,
          avatar,
          createdAt: Date.now(),
        };

        const pushed = store.pushIncomingAlert(notification, messageId);
        if (!pushed) return;

        scheduleDismiss(notification.id);
        playIncomingMessageSound();

        void showDesktopChatNotification({
          conversationKey,
          title: senderName,
          body: messagePreview,
          icon: avatar,
          tag: `comm:${conversationKey}`,
        });

        if (typeof document !== 'undefined') {
          const previousTitle = document.title;
          document.title = `(New) ${senderName}`;
          window.setTimeout(() => {
            if (document.title.startsWith('(New) ')) {
              document.title = previousTitle;
            }
          }, 5000);
        }
      } catch {
        // Never let alert failures break socket event dispatch / live chat.
      }
    };

    // Only the dedicated notify event — do NOT share newMessage/comm:message:created
    // with the live chat UI listeners (a throw would block them).
    socket.on('comm:inbox:notify', handleIncoming);

    void ensureSocketConnected(socket).catch(() => {});

    return () => {
      cancelled = true;
      socket.off('comm:inbox:notify', handleIncoming);
      Object.keys(dismissTimersRef.current).forEach(clearTimer);
    };
  }, []);
}
