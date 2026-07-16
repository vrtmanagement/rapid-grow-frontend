import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  Target,
  Clock,
  LayoutDashboard,
  NotebookPen,
  Mail,
  FolderOpen,
  Users,
  ListTodo,
  FileText,
  Contact,
  CalendarRange,
} from 'lucide-react';
import { PlanningState } from '../../types';
import { GlobalCommunicationNotifications } from '../../communication/components/GlobalCommunicationNotifications';
import AccessDenied from '../AccessDenied';
import { SidebarLink, SidebarToggleButton } from './SidebarPrimitives';
import { NotificationBellMenu, ThemeToggleButton, UserAccountMenu } from './AppTopbarControls';
import type { AppShellNotification } from './authenticatedShellTypes';

const Vision = lazy(() => import('../../views/Vision'));
const ReflectionView = lazy(() => import('../../views/ReflectionView'));
const EmployeeDashboardView = lazy(() => import('../../views/EmployeeDashboardView'));
const EmployeeProfileView = lazy(() => import('../../views/EmployeeProfileView'));
const EmployeeProjectDetailView = lazy(() => import('../../views/EmployeeProjectDetailView'));
const SpacesView = lazy(() => import('../../views/SpacesView'));
const AttendanceView = lazy(() => import('../../views/AttendanceView'));
const StaffView = lazy(() => import('../../views/StaffView'));
const DriveView = lazy(() => import('../../drive/views/DriveView'));
const ContentView = lazy(() => import('../../views/ContentView'));
const ContentCreateView = lazy(() => import('../../views/ContentCreateView'));
const SpacesTaskDetailView = lazy(() => import('../../views/SpacesTaskDetailView'));
const WorkspacesView = lazy(() => import('../../views/WorkspacesView'));
const CRMPage = lazy(() => import('../../views/CRMPage'));
const CRMLeadDetailPage = lazy(() => import('../../views/CRMLeadDetailPage'));
const StrategyExecutionView = lazy(() => import('../../views/StrategyExecutionView'));
const ExpenseTravelView = lazy(() => import('../../views/ExpenseTravelView'));
const CommunicationView = lazy(() => import('../../communication/views/CommunicationView'));

function RouteFallback() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-red" aria-label="Loading" />
    </div>
  );
}

export interface AppEmployeePortalLayoutProps {
  globalToastsElement: React.ReactNode;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hasPower: (power: string) => boolean;
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  planningViewsLoading: boolean;
  taskCount: number;
  communicationUnreadCount: number;
  notificationMenuOpen: boolean;
  setNotificationMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userMenuOpen: boolean;
  setUserMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  unreadNotificationCount: number;
  notificationsLoading: boolean;
  notifications: AppShellNotification[];
  openNotification: (notification: AppShellNotification) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void | null>;
  clearNotificationsFromPopup: () => void;
  handleLogout: () => void;
}

const AppEmployeePortalLayout: React.FC<AppEmployeePortalLayoutProps> = ({
  globalToastsElement,
  isSidebarOpen,
  setIsSidebarOpen,
  hasPower,
  state,
  updateState,
  planningViewsLoading,
  taskCount,
  communicationUnreadCount,
  notificationMenuOpen,
  setNotificationMenuOpen,
  userMenuOpen,
  setUserMenuOpen,
  unreadNotificationCount,
  notificationsLoading,
  notifications,
  openNotification,
  markNotificationRead,
  clearNotificationsFromPopup,
  handleLogout,
}) => {
  const location = useLocation();
  const hasVisionAccess =
    hasPower('YEARLY_VIEW') ||
    hasPower('QUARTERLY_VIEW') ||
    hasPower('MONTHLY_VIEW') ||
    hasPower('WEEKLY_VIEW') ||
    hasPower('DAILY_VIEW');
  const showPrimaryNav =
    hasPower('DASHBOARD_VIEW') || hasPower('SPACES_VIEW') || hasPower('ATTENDANCE_VIEW');
  const showVisionNav = hasVisionAccess || hasPower('STRATEGY_EXECUTION_VIEW');
  const showReflectionNav = hasPower('REFLECTION_VIEW');
  const showToolsNav =
    hasPower('COMMUNICATION_VIEW') ||
    hasPower('DRIVE_VIEW') ||
    hasPower('CONTENT_VIEW') ||
    hasPower('STAFF_VIEW') ||
    hasPower('CRM_VIEW');
  const browserHash = typeof window !== 'undefined' ? window.location.hash || '' : '';
  const routePathSource = browserHash.startsWith('#') ? browserHash.slice(1) : location.pathname;
  const routePath = (routePathSource || location.pathname || '/').split('?')[0] || '/';
  const isAttendanceRoute = routePath.startsWith('/attendance');
  const isExpenseRoute = routePath.startsWith('/expense-travel');
  const isCommunicationRoute = routePath === '/communication';
  const isReflectionRoute = routePath === '/reflection' || routePath === '/review';
  const isFlushSharedSubnavRoute =
    routePath === '/' ||
    isCommunicationRoute ||
    isReflectionRoute ||
    routePath === '/staff' ||
    routePath.startsWith('/staff/') ||
    routePath.startsWith('/expense-travel') ||
    routePath.startsWith('/spaces') ||
    routePath.startsWith('/workspaces') ||
    ['/yearly', '/quarterly', '/monthly', '/weekly', '/daily'].includes(routePath) ||
    routePath.startsWith('/strategy-execution');

  return (
    <>
      {globalToastsElement}
      <GlobalCommunicationNotifications />
      <div className="app-shell flex h-screen overflow-hidden bg-[#f1f5f9] dark:bg-slate-950">
        <aside
          className={`app-sidebar ${isSidebarOpen ? 'w-48 max-sm:w-[72px]' : 'w-[72px]'} relative z-50 flex h-full min-h-0 shrink-0 flex-col bg-white/90 text-white backdrop-blur-xl transition-all duration-500 dark:bg-slate-950/95`}
        >
          <div className="app-sidebar-border absolute top-0 right-0 h-full w-px bg-slate-200 dark:bg-slate-800" />
          <div className="app-sidebar-header px-3.5 py-4 border-b border-white/5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-10 h-10 overflow-hidden rounded shadow-lg shrink-0 bg-white">
                <img src="/favicon.svg" alt="Rapid Grow OS" className="h-full w-full object-contain" />
              </div>
              {isSidebarOpen && (
                <span className="hidden text-[15px] font-medium text-brand-red truncate sm:inline">Employee Portal</span>
              )}
            </div>
            <SidebarToggleButton isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
          </div>
          <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2.5 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0">
            {hasPower('DASHBOARD_VIEW') && (
              <SidebarLink
                to="/"
                icon={<LayoutDashboard size={20} />}
                label={state.uiConfig.dashboardTitle}
                collapsed={!isSidebarOpen}
              />
            )}
            {hasPower('SPACES_VIEW') && (
              <SidebarLink
                to="/spaces"
                icon={<ListTodo size={20} />}
                label="TaskHub"
                badgeCount={taskCount}
                collapsed={!isSidebarOpen}
              />
            )}
            {hasPower('ATTENDANCE_VIEW') && (
              <SidebarLink to="/attendance" icon={<Clock size={20} />} label="Manage Attendance" collapsed={!isSidebarOpen} />
            )}
            {showPrimaryNav && showVisionNav ? (
              <div className="app-sidebar-divider h-px bg-white/5 mx-2.5 my-1"></div>
            ) : null}
            {hasVisionAccess && (
              <SidebarLink to="/yearly" icon={<Target size={20} />} label="Vision" collapsed={!isSidebarOpen} />
            )}
            {hasPower('STRATEGY_EXECUTION_VIEW') && (
              <SidebarLink
                to="/strategy-execution"
                icon={<CalendarRange size={20} />}
                label="Strategy Calendar"
                collapsed={!isSidebarOpen}
              />
            )}
            {(showPrimaryNav || showVisionNav) && showReflectionNav ? (
              <div className="app-sidebar-divider h-px bg-white/5 mx-2.5 my-1"></div>
            ) : null}
            {hasPower('REFLECTION_VIEW') && (
              <SidebarLink
                to="/reflection"
                icon={<NotebookPen size={20} />}
                label={state.uiConfig.reflectionTitle}
                collapsed={!isSidebarOpen}
              />
            )}
            {(showPrimaryNav || showVisionNav || showReflectionNav) && showToolsNav ? (
              <div className="app-sidebar-divider h-px bg-white/5 mx-2.5 my-1"></div>
            ) : null}
            {hasPower('COMMUNICATION_VIEW') && (
              <SidebarLink
                to="/communication"
                icon={<Mail size={20} />}
                label="Communication"
                badgeCount={communicationUnreadCount}
                collapsed={!isSidebarOpen}
              />
            )}
            {hasPower('DRIVE_VIEW') && (
              <SidebarLink to="/drive" icon={<FolderOpen size={20} />} label="Drive" collapsed={!isSidebarOpen} />
            )}
            {hasPower('CONTENT_VIEW') && (
              <SidebarLink to="/content" icon={<FileText size={20} />} label="Content" collapsed={!isSidebarOpen} />
            )}
            {hasPower('STAFF_VIEW') && (
              <SidebarLink to="/staff" icon={<Users size={20} />} label="Staff" collapsed={!isSidebarOpen} />
            )}
            {hasPower('CRM_VIEW') && (
              <SidebarLink to="/crm" icon={<Contact size={20} />} label="CRM" collapsed={!isSidebarOpen} />
            )}
          </nav>
        </aside>
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="app-topbar relative z-40 flex h-16 shrink-0 items-center justify-end border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 sm:px-8">
            <div className="flex w-full items-center justify-end gap-3 sm:gap-6">
              <div className="flex items-center gap-3 shrink-0">
                <ThemeToggleButton />
                <NotificationBellMenu
                  notificationMenuOpen={notificationMenuOpen}
                  unreadNotificationCount={unreadNotificationCount}
                  notificationsLoading={notificationsLoading}
                  notifications={notifications}
                  setNotificationMenuOpen={setNotificationMenuOpen}
                  setUserMenuOpen={setUserMenuOpen}
                  openNotification={openNotification}
                  markNotificationRead={markNotificationRead}
                  clearNotificationsFromPopup={clearNotificationsFromPopup}
                />
                <UserAccountMenu
                  userMenuOpen={userMenuOpen}
                  setUserMenuOpen={setUserMenuOpen}
                  setNotificationMenuOpen={setNotificationMenuOpen}
                  userName={state.currentUser.name}
                  userRole={state.currentUser.role}
                  userAvatar={state.currentUser.avatar}
                  onLogout={handleLogout}
                />
              </div>
            </div>
          </header>
          <div className={`app-content flex-1 bg-white dark:bg-slate-950/40 ${
            isCommunicationRoute
              ? 'overflow-hidden p-0'
              : isAttendanceRoute || isExpenseRoute || isFlushSharedSubnavRoute
                ? 'overflow-y-auto px-4 pb-4 pt-0 sm:px-8 sm:pb-8 sm:pt-0 lg:px-16 lg:pb-16 lg:pt-0'
                : 'overflow-y-auto p-4 sm:p-8 lg:p-16'
          }`}>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              {hasPower('DASHBOARD_VIEW') && (
                <Route path="/" element={<EmployeeDashboardView uiConfig={state.uiConfig} />} />
              )}
              {hasPower('SPACES_VIEW') && (
                <Route path="/spaces" element={<SpacesView mode="employee" state={state} updateState={updateState} />} />
              )}
              {hasPower('SPACES_VIEW') && <Route path="/spaces/task/:taskId" element={<SpacesTaskDetailView mode="employee" />} />}
              {hasPower('ATTENDANCE_VIEW') && <Route path="/attendance" element={<AttendanceView mode="employee" />} />}
              {hasPower('ATTENDANCE_VIEW') && <Route path="/attendance/history" element={<AttendanceView mode="employee" />} />}
              {hasPower('PROFILE_VIEW') && (
                <Route path="/profile" element={<EmployeeProfileView state={state} updateState={updateState} />} />
              )}
              {hasPower('WORKSPACES_VIEW') && <Route path="/project/:projectId" element={<EmployeeProjectDetailView />} />}
              {hasPower('WORKSPACES_VIEW') && (
                <Route path="/workspaces/*" element={<WorkspacesView state={state} updateState={updateState} />} />
              )}
              {hasVisionAccess && (
                <Route path="/vision" element={<Navigate to="/yearly" replace />} />
              )}
              {hasVisionAccess && (
                <Route path="/yearly" element={<Vision state={state} updateState={updateState} loading={planningViewsLoading} />} />
              )}
              {hasVisionAccess && (
                <Route path="/quarterly" element={<Vision state={state} updateState={updateState} loading={planningViewsLoading} />} />
              )}
              {hasVisionAccess && (
                <Route path="/monthly" element={<Vision state={state} updateState={updateState} loading={planningViewsLoading} />} />
              )}
              {hasVisionAccess && (
                <Route path="/weekly" element={<Vision state={state} updateState={updateState} loading={planningViewsLoading} />} />
              )}
              {hasVisionAccess && (
                <Route path="/daily" element={<Vision state={state} updateState={updateState} loading={planningViewsLoading} />} />
              )}
              {hasPower('REFLECTION_VIEW') && (
                <Route
                  path="/reflection"
                  element={<ReflectionView state={state} updateState={updateState} loading={planningViewsLoading} />}
                />
              )}
              {hasPower('REFLECTION_VIEW') && (
                <Route path="/review" element={<ReflectionView state={state} updateState={updateState} loading={planningViewsLoading} />} />
              )}
              {hasPower('COMMUNICATION_VIEW') && (
                <Route path="/communication" element={<CommunicationView />} />
              )}
              {hasPower('DRIVE_VIEW') && <Route path="/drive" element={<DriveView />} />}
              {hasPower('CONTENT_VIEW') && <Route path="/content" element={<ContentView />} />}
              {hasPower('CONTENT_VIEW') && <Route path="/content/day/:dayKey" element={<ContentView />} />}
              {hasPower('CONTENT_VIEW') && <Route path="/content/day/:dayKey/type/:typeKey" element={<ContentView />} />}
              {hasPower('CONTENT_VIEW') && (
                <Route path="/content/day/:dayKey/type/:typeKey/item/:itemKey" element={<ContentView />} />
              )}
              {hasPower('CONTENT_VIEW') && <Route path="/content/new" element={<ContentCreateView />} />}
              {hasPower('STAFF_VIEW') && <Route path="/staff" element={<StaffView mode="employee" />} />}
              {hasPower('STAFF_VIEW') && <Route path="/staff/org-chart" element={<StaffView mode="employee" />} />}
              {hasPower('STRATEGY_EXECUTION_VIEW') && (
                <Route path="/strategy-execution" element={<StrategyExecutionView />} />
              )}
              {hasPower('CRM_VIEW') && <Route path="/crm" element={<CRMPage />} />}
              {hasPower('CRM_VIEW') && <Route path="/crm/lead/:leadId" element={<CRMLeadDetailPage />} />}
              {hasPower('EXPENSE_VIEW') && <Route path="/expense-travel" element={<ExpenseTravelView mode="employee" />} />}
              <Route path="*" element={<AccessDenied />} />
            </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </>
  );
};

export default AppEmployeePortalLayout;
