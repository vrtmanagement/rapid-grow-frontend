const OPEN_FROM_DESKTOP_NOTIFICATION_EVENT = 'rapidgrow:open-chat-from-desktop-notification';
const SW_PATH = '/comm-notification-sw.js';
const SW_SCOPE = '/';

export type DesktopChatNotificationPayload = {
  conversationKey: string;
  title: string;
  body: string;
  icon?: string;
  tag?: string;
};

let swRegisterPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function isDesktopNotificationSupported(): boolean {
  return typeof window !== 'undefined' && typeof Notification !== 'undefined';
}

export function getDesktopNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/** Request browser/OS notification permission (best-effort; may require a user gesture). */
export async function ensureDesktopNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** True when the user is on another browser tab or another app (page not focused). */
export function shouldShowDesktopChatNotification(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.visibilityState !== 'visible') return true;
  if (typeof document.hasFocus === 'function' && !document.hasFocus()) return true;
  return false;
}

export async function registerCommunicationNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (swRegisterPromise) return swRegisterPromise;

  swRegisterPromise = (async () => {
    try {
      const registration = await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
      return registration;
    } catch {
      return null;
    }
  })();

  return swRegisterPromise;
}

function resolveNotificationIcon(icon?: string): string {
  const raw = String(icon || '').trim();
  if (!raw) return `${window.location.origin}/favicon.svg`;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) return raw;
  if (raw.startsWith('/')) return `${window.location.origin}${raw}`;
  return `${window.location.origin}/favicon.svg`;
}

async function showViaServiceWorker(payload: DesktopChatNotificationPayload): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration =
    (await registerCommunicationNotificationServiceWorker()) ||
    (await navigator.serviceWorker.ready.catch(() => null));
  if (!registration || typeof registration.showNotification !== 'function') return false;

  const title = String(payload.title || 'New message').trim() || 'New message';
  const body = String(payload.body || '').trim() || 'You have a new message';
  const tag = payload.tag || `comm:${payload.conversationKey}`;

  try {
    await registration.showNotification(title, {
      body,
      icon: resolveNotificationIcon(payload.icon),
      badge: `${window.location.origin}/favicon.svg`,
      tag,
      renotify: true,
      data: { conversationKey: payload.conversationKey },
    } as NotificationOptions);
    return true;
  } catch {
    try {
      await registration.showNotification(title, {
        body,
        tag,
        data: { conversationKey: payload.conversationKey },
      });
      return true;
    } catch {
      return false;
    }
  }
}

function showViaPageNotification(payload: DesktopChatNotificationPayload): boolean {
  if (!isDesktopNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const title = String(payload.title || 'New message').trim() || 'New message';
  const body = String(payload.body || '').trim() || 'You have a new message';
  const tag = payload.tag || `comm:${payload.conversationKey}`;

  const attachClick = (notification: Notification) => {
    notification.onclick = () => {
      try {
        window.focus();
      } catch {
        // ignore
      }
      window.dispatchEvent(
        new CustomEvent(OPEN_FROM_DESKTOP_NOTIFICATION_EVENT, {
          detail: { conversationKey: payload.conversationKey },
        }),
      );
      notification.close();
    };
  };

  try {
    const notification = new Notification(title, {
      body,
      icon: resolveNotificationIcon(payload.icon),
      tag,
      renotify: true,
      data: { conversationKey: payload.conversationKey },
    } as NotificationOptions);
    attachClick(notification);
    return true;
  } catch {
    try {
      const notification = new Notification(title, { body, tag });
      attachClick(notification);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Show an OS/browser notification (service worker preferred when the tab is in the background).
 * Safe to call even if permission is not granted — it no-ops.
 */
export async function showDesktopChatNotification(
  payload: DesktopChatNotificationPayload,
): Promise<boolean> {
  if (!isDesktopNotificationSupported()) return false;

  const permission = await ensureDesktopNotificationPermission();
  if (permission !== 'granted') return false;

  // Prefer SW when backgrounded; always fall back to page Notification API.
  if (shouldShowDesktopChatNotification()) {
    const viaSw = await showViaServiceWorker(payload);
    if (viaSw) return true;
  }

  const viaPage = showViaPageNotification(payload);
  if (viaPage) return true;

  // Last resort: try SW even while focused (some browsers still surface it).
  return showViaServiceWorker(payload);
}

export function subscribeDesktopChatNotificationOpen(
  handler: (conversationKey: string) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onCustomEvent = (event: Event) => {
    const conversationKey = String((event as CustomEvent)?.detail?.conversationKey || '').trim();
    if (!conversationKey) return;
    handler(conversationKey);
  };

  const onSwMessage = (event: MessageEvent) => {
    const data = event?.data;
    if (!data || data.type !== 'OPEN_COMM_CONVERSATION') return;
    const conversationKey = String(data.conversationKey || '').trim();
    if (!conversationKey) return;
    handler(conversationKey);
  };

  window.addEventListener(OPEN_FROM_DESKTOP_NOTIFICATION_EVENT, onCustomEvent);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', onSwMessage);
  }

  return () => {
    window.removeEventListener(OPEN_FROM_DESKTOP_NOTIFICATION_EVENT, onCustomEvent);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
    }
  };
}
