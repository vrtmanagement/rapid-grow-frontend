import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCommunication } from '../context/useCommunication';
import { useGlobalChatAlerts } from '../hooks/useGlobalChatAlerts';
import { useChatAlertStore } from '../stores/useChatAlertStore';
import { subscribeDesktopChatNotificationOpen } from '../browserNotifications';
import { DesktopNotificationPermissionBanner } from './DesktopNotificationPermissionBanner';
import { NotificationStack } from './NotificationStack';

export function GlobalCommunicationNotifications() {
  const ctx = useCommunication();
  const location = useLocation();
  const navigate = useNavigate();
  const notifications = useChatAlertStore((state) => state.notifications);
  const dismissNotification = useChatAlertStore((state) => state.dismissNotification);
  const setViewingState = useChatAlertStore((state) => state.setViewingState);

  // Independent socket → alert pipeline (does not depend on CommunicationContext message handlers).
  useGlobalChatAlerts();

  // Keep "currently viewing chat" in sync so we don't notify for the open thread
  // while the user is actively looking at it (background tabs still notify).
  useEffect(() => {
    const syncViewingState = () => {
      const isCommunicationRoute =
        location.pathname === '/communication' || location.pathname.startsWith('/communication/');
      setViewingState({
        isCommunicationRoute,
        viewingConversationKey: isCommunicationRoute ? ctx.selectedConversationKey : null,
      });
    };

    syncViewingState();
    document.addEventListener('visibilitychange', syncViewingState);
    window.addEventListener('focus', syncViewingState);
    window.addEventListener('blur', syncViewingState);
    return () => {
      document.removeEventListener('visibilitychange', syncViewingState);
      window.removeEventListener('focus', syncViewingState);
      window.removeEventListener('blur', syncViewingState);
    };
  }, [ctx.selectedConversationKey, location.pathname, setViewingState]);

  // OS notification click → open that conversation.
  useEffect(() => {
    return subscribeDesktopChatNotificationOpen((conversationKey) => {
      useChatAlertStore.getState().clearNotifications();
      if (!location.pathname.startsWith('/communication')) {
        navigate('/communication');
      }
      void ctx.joinByConversationKey(conversationKey);
    });
  }, [ctx, location.pathname, navigate]);

  const openNotification = (notificationId: string) => {
    const target = useChatAlertStore.getState().notifications.find((item) => item.id === notificationId);
    dismissNotification(notificationId);
    if (!target) return;
    if (!location.pathname.startsWith('/communication')) {
      navigate('/communication');
    }
    void ctx.joinByConversationKey(target.conversationKey);
  };

  return (
    <>
      <DesktopNotificationPermissionBanner />
      <NotificationStack
        notifications={notifications}
        onClose={dismissNotification}
        onOpen={openNotification}
      />
    </>
  );
}
