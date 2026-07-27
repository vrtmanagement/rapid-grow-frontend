import React from 'react';
import AppProviders from './AppProviders';
import AppEmployeePortalLayout from '../layout/AppEmployeePortalLayout';
import AppManagerPortalLayout from '../layout/AppManagerPortalLayout';
import type { PlanningState } from '../../types';
import type { AppShellNotification } from '../layout/authenticatedShellTypes';

export type AuthenticatedAppShellProps = {
  state: PlanningState;
  globalToastsElement: React.ReactNode;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hasPower: (power: string) => boolean;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  planningViewsLoading: boolean;
  taskCount: number;
  communicationUnreadCount: number;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  notificationMenuOpen: boolean;
  setNotificationMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userMenuOpen: boolean;
  setUserMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  unreadNotificationCount: number;
  notificationsLoading: boolean;
  notifications: AppShellNotification[];
  openNotification: (notification: AppShellNotification) => void;
  markNotificationRead: (id: string) => Promise<void> | void;
  clearNotificationsFromPopup: () => void;
  handleLogout: () => void;
};

const AuthenticatedAppShell: React.FC<AuthenticatedAppShellProps> = (props) => {
  const { state } = props;

  if (state.currentUser.role === 'Employee') {
    return (
      <AppProviders role={state.currentUser.role}>
        <AppEmployeePortalLayout
          globalToastsElement={props.globalToastsElement}
          isSidebarOpen={props.isSidebarOpen}
          setIsSidebarOpen={props.setIsSidebarOpen}
          hasPower={props.hasPower}
          state={props.state}
          updateState={props.updateState}
          planningViewsLoading={props.planningViewsLoading}
          taskCount={props.taskCount}
          communicationUnreadCount={props.communicationUnreadCount}
          notificationMenuOpen={props.notificationMenuOpen}
          setNotificationMenuOpen={props.setNotificationMenuOpen}
          userMenuOpen={props.userMenuOpen}
          setUserMenuOpen={props.setUserMenuOpen}
          unreadNotificationCount={props.unreadNotificationCount}
          notificationsLoading={props.notificationsLoading}
          notifications={props.notifications}
          openNotification={props.openNotification}
          markNotificationRead={props.markNotificationRead}
          clearNotificationsFromPopup={props.clearNotificationsFromPopup}
          handleLogout={props.handleLogout}
        />
      </AppProviders>
    );
  }

  return (
    <AppProviders role={state.currentUser.role}>
      <AppManagerPortalLayout
        globalToastsElement={props.globalToastsElement}
        isSidebarOpen={props.isSidebarOpen}
        setIsSidebarOpen={props.setIsSidebarOpen}
        hasPower={props.hasPower}
        state={props.state}
        updateState={props.updateState}
        planningViewsLoading={props.planningViewsLoading}
        taskCount={props.taskCount}
        communicationUnreadCount={props.communicationUnreadCount}
        isSuperAdmin={props.isSuperAdmin}
        isAdmin={props.isAdmin}
        notificationMenuOpen={props.notificationMenuOpen}
        setNotificationMenuOpen={props.setNotificationMenuOpen}
        userMenuOpen={props.userMenuOpen}
        setUserMenuOpen={props.setUserMenuOpen}
        unreadNotificationCount={props.unreadNotificationCount}
        notificationsLoading={props.notificationsLoading}
        notifications={props.notifications}
        openNotification={props.openNotification}
        markNotificationRead={props.markNotificationRead}
        clearNotificationsFromPopup={props.clearNotificationsFromPopup}
        handleLogout={props.handleLogout}
      />
    </AppProviders>
  );
};

export default AuthenticatedAppShell;
