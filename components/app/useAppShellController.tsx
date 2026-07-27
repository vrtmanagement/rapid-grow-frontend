import { useState } from 'react';
import { useAppSessionState } from './useAppSessionState';
import { useAppNotificationToasts } from './useAppNotificationToasts';

export function useAppShellController() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isVisionsOpen, setIsVisionsOpen] = useState(true);

  const session = useAppSessionState();
  const notificationToasts = useAppNotificationToasts(
    session.isAuthenticated,
    session.notifications,
    session.setNotifications,
    session.communicationUnreadCount,
  );

  return {
    ...session,
    ...notificationToasts,
    isSidebarOpen,
    setIsSidebarOpen,
    userMenuOpen,
    setUserMenuOpen,
    isVisionsOpen,
    setIsVisionsOpen,
  };
}
