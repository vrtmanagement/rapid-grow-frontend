import React from 'react';
import AppPublicRouter from './components/app/AppPublicRouter';
import AuthenticatedAppShell from './components/app/AuthenticatedAppShell';
import { isInviteAcceptPath } from './components/app/appShellHelpers';
import { useAppShellController } from './components/app/useAppShellController';

const App: React.FC = () => {
  const {
    isAuthenticated,
    publicPath,
    permissions,
    permissionsLoading,
    state,
    handleLoginSuccess,
    handleLogout,
    isSidebarOpen,
    setIsSidebarOpen,
    userMenuOpen,
    setUserMenuOpen,
    hasPower,
    updateState,
    planningViewsLoading,
    taskCount,
    communicationUnreadCount,
    isSuperAdmin,
    isAdmin,
    notificationMenuOpen,
    setNotificationMenuOpen,
    unreadNotificationCount,
    notificationsLoading,
    notifications,
    openNotification,
    markNotificationRead,
    clearNotificationsFromPopup,
    globalToastsElement,
  } = useAppShellController();

  if (isAuthenticated === null || isInviteAcceptPath(publicPath) || !isAuthenticated) {
    return (
      <AppPublicRouter
        isAuthenticated={isAuthenticated}
        publicPath={publicPath}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (permissionsLoading && state.currentUser?.id && permissions.length === 0) {
    return null;
  }

  return (
    <AuthenticatedAppShell
      state={state}
      globalToastsElement={globalToastsElement}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      hasPower={hasPower}
      updateState={updateState}
      planningViewsLoading={planningViewsLoading}
      taskCount={taskCount}
      communicationUnreadCount={communicationUnreadCount}
      isSuperAdmin={isSuperAdmin}
      isAdmin={isAdmin}
      notificationMenuOpen={notificationMenuOpen}
      setNotificationMenuOpen={setNotificationMenuOpen}
      userMenuOpen={userMenuOpen}
      setUserMenuOpen={setUserMenuOpen}
      unreadNotificationCount={unreadNotificationCount}
      notificationsLoading={notificationsLoading}
      notifications={notifications}
      openNotification={openNotification}
      markNotificationRead={markNotificationRead}
      clearNotificationsFromPopup={clearNotificationsFromPopup}
      handleLogout={handleLogout}
    />
  );
};

export default App;
