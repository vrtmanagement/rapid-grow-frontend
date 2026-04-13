import React from 'react';
import { useCommunication } from '../context/useCommunication';
import { NotificationStack } from './NotificationStack';

export function GlobalCommunicationNotifications() {
  const ctx = useCommunication();

  return (
    <NotificationStack
      notifications={ctx.notifications}
      onClose={ctx.dismissNotification}
      onOpen={(notificationId) => {
        void ctx.openNotificationConversation(notificationId);
      }}
    />
  );
}
