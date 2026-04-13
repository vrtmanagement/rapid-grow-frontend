import React from 'react';
import { ChatNotification } from '../types';
import { NotificationCard } from './NotificationCard';

export function NotificationStack({
  notifications,
  onClose,
  onOpen,
}: {
  notifications: ChatNotification[];
  onClose: (notificationId: string) => void;
  onOpen: (notificationId: string) => void;
}) {
  if (!notifications.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-3">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onClose={() => onClose(notification.id)}
          onClick={() => onOpen(notification.id)}
        />
      ))}
    </div>
  );
}
