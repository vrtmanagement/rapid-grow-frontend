import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  Target,
  Clock,
  LayoutDashboard,
  NotebookPen,
  Briefcase,
  Mail,
  Users,
  ListTodo,
  FileText,
  Contact,
  Building2,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { PlanningState } from '../../types';
import Vision from '../../views/Vision';
import ReflectionView from '../../views/ReflectionView';
import DashboardView from '../../views/DashboardView';
import WorkspacesView from '../../views/WorkspacesView';
import ProfileView from '../../views/ProfileView';
import SpacesView from '../../views/SpacesView';
import AttendanceView from '../../views/AttendanceView';
import StaffView from '../../views/StaffView';
import CommunicationView from '../../communication/views/CommunicationView';
import { GlobalCommunicationNotifications } from '../../communication/components/GlobalCommunicationNotifications';
import ContentView from '../../views/ContentView';
import ContentCreateView from '../../views/ContentCreateView';
import SpacesTaskDetailView from '../../views/SpacesTaskDetailView';
import CRMPage from '../../views/CRMPage';
import CRMLeadDetailPage from '../../views/CRMLeadDetailPage';
import ExpenseTravelView from '../../views/ExpenseTravelView';
import AiAgentView from '../../views/AiAgentView';
import TaskAnalyticsView from '../../views/TaskAnalyticsView';
import StrengthsDashboardView from '../../views/StrengthsDashboardView';
import SuperAdminView from '../../views/SuperAdminView';
import BillingAiUsageView from '../../views/BillingAiUsageView';
import PlanLimitsBanner from '../plan/PlanLimitsBanner';
import { useI18n } from '../../context/I18nContext';
import AccessDenied from '../AccessDenied';
import { SidebarLink, SidebarToggleButton } from './SidebarPrimitives';
import { NotificationBellMenu, ThemeToggleButton, UserAccountMenu } from './AppTopbarControls';
import type { AppShellNotification } from './authenticatedShellTypes';

const RedirectToBillingAiTab: React.FC<{ panel: 'billing' | 'ai-usage'; aiPanel?: 'usage' | 'settings' }> = ({
  panel,
  aiPanel = 'usage',
}) => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('panel', panel);
  if (panel === 'ai-usage') params.set('aiPanel', aiPanel);
  const search = params.toString();
  return <Navigate to={`/billing-ai${search ? `?${search}` : ''}`} replace />;
};

export interface AppManagerPortalLayoutProps {
  globalToastsElement: React.ReactNode;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hasPower: (power: string) => boolean;
  state: PlanningState;
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
  openNotification: (notification: AppShellNotification) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void | null>;
  clearNotificationsFromPopup: () => void;
  handleLogout: () => void;
}

const AppManagerPortalLayout: React.FC<AppManagerPortalLayoutProps> = ({
  globalToastsElement,
  isSidebarOpen,
  setIsSidebarOpen,
  hasPower,
  state,
  updateState,
  planningViewsLoading,
  taskCount,
  communicationUnreadCount,
  isSuperAdmin,
  isAdmin,
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
  const { t } = useI18n();
  const location = useLocation();
  const hasVisionAccess =
    hasPower('YEARLY_VIEW') ||
    hasPower('QUARTERLY_VIEW') ||
    hasPower('MONTHLY_VIEW') ||
    hasPower('WEEKLY_VIEW') ||
    hasPower('DAILY_VIEW');
  const browserHash = typeof window !== 'undefined' ? window.location.hash || '' : '';
  const routePathSource = browserHash.startsWith('#') ? browserHash.slice(1) : location.pathname;
  const routePath = (routePathSource || location.pathname || '/').split('?')[0] || '/';
  const isAttendanceRoute = routePath.startsWith('/attendance');
  const isExpenseRoute = routePath.startsWith('/expense-travel');
  const isCommunicationRoute = routePath === '/communication';
  const isReflectionRoute = routePath === '/reflection' || routePath === '/review';
  const isBillingAiRoute = routePath === '/billing-ai' || routePath.startsWith('/billing-ai/');
  const isSharedSubnavRoute =
    routePath === '/' ||
    isCommunicationRoute ||
    isReflectionRoute ||
    isBillingAiRoute ||
    routePath === '/staff' ||
    routePath.startsWith('/staff/') ||
    routePath.startsWith('/expense-travel') ||
    routePath.startsWith('/spaces') ||
    routePath.startsWith('/workspaces') ||
    ['/yearly', '/quarterly', '/monthly', '/weekly', '/daily'].includes(routePath);
  const isFlushSharedSubnavRoute =
    routePath === '/' ||
    isCommunicationRoute ||
    isReflectionRoute ||
    isBillingAiRoute ||
    routePath === '/staff' ||
    routePath.startsWith('/staff/') ||
    routePath.startsWith('/expense-travel') ||
    routePath.startsWith('/spaces') ||
    routePath.startsWith('/workspaces') ||
    ['/yearly', '/quarterly', '/monthly', '/weekly', '/daily'].includes(routePath);

  return (
    <>
      {globalToastsElement}
      <GlobalCommunicationNotifications />
      <div className="app-shell flex h-screen overflow-hidden bg-[#f1f5f9] dark:bg-slate-950">
        <aside
          className={`app-sidebar ${isSidebarOpen ? 'w-48 max-sm:w-[72px]' : 'w-[72px]'} relative z-50 flex h-full min-h-0 shrink-0 flex-col bg-white/90 text-white backdrop-blur-xl transition-all duration-500 dark:bg-slate-950/95`}
        >
          <div className="app-sidebar-border absolute top-0 right-0 h-full w-px bg-slate-200 dark:bg-slate-800"></div>

          <div className="app-sidebar-header px-3.5 py-4 border-b border-white/5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-10 h-10 overflow-hidden rounded shadow-lg shrink-0 bg-white">
                <img src="/favicon.svg" alt="Rapid Grow OS" className="h-full w-full object-contain" />
              </div>
              {isSidebarOpen && (
                <span className="hidden text-[15px] font-medium text-brand-red truncate sm:inline">{state.uiConfig.sidebarLogoName}</span>
              )}
            </div>
            <SidebarToggleButton isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
          </div>
          <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto overflow-x-hidden px-2.5 py-3.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0">
            {hasPower('DASHBOARD_VIEW') && (
              <SidebarLink
                to="/"
                icon={<LayoutDashboard size={20} />}
                label={isSuperAdmin ? 'Dashboard' : state.uiConfig.dashboardTitle}
                collapsed={!isSidebarOpen}
              />
            )}
            {!isSuperAdmin && (
              <>
                {hasPower('WORKSPACES_VIEW') && (
                  <SidebarLink
                    to="/workspaces"
                    icon={<Briefcase size={20} />}
                    label={state.uiConfig.operationsTitle}
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
                <div className="app-sidebar-divider h-px bg-white/5 mx-2.5 my-3.5"></div>
                {hasVisionAccess && (
                  <SidebarLink to="/yearly" icon={<Target size={20} />} label="Vision" collapsed={!isSidebarOpen} />
                )}
                {hasPower('REFLECTION_VIEW') && (
                  <SidebarLink
                    to="/reflection"
                    icon={<NotebookPen size={20} />}
                    label={state.uiConfig.reflectionTitle}
                    collapsed={!isSidebarOpen}
                  />
                )}
                <div className="app-sidebar-divider h-px bg-white/5 mx-2.5 my-3.5"></div>
              </>
            )}
            {hasPower('COMMUNICATION_VIEW') && (
              <SidebarLink
                to="/communication"
                icon={<Mail size={20} />}
                label="Communication"
                badgeCount={communicationUnreadCount}
                collapsed={!isSidebarOpen}
              />
            )}
            {hasPower('CONTENT_VIEW') && (
              <SidebarLink to="/content" icon={<FileText size={20} />} label="Content" collapsed={!isSidebarOpen} />
            )}
            {hasPower('STAFF_VIEW') && (
              <SidebarLink to="/staff" icon={<Users size={20} />} label="Staff" collapsed={!isSidebarOpen} />
            )}
            {hasPower('STAFF_VIEW') && (
              <SidebarLink to="/strengths" icon={<Sparkles size={20} />} label="Strengths & skill gaps" collapsed={!isSidebarOpen} />
            )}
            {hasPower('CRM_VIEW') && (
              <SidebarLink to="/crm" icon={<Contact size={20} />} label={t('crm')} collapsed={!isSidebarOpen} />
            )}
            {isSuperAdmin && (
              <SidebarLink to="/super-admin" icon={<Building2 size={20} />} label={t('superAdmin')} collapsed={!isSidebarOpen} />
            )}
            {isAdmin && (
              <SidebarLink
                to="/billing-ai"
                icon={<CreditCard size={20} />}
                label="Billing & AI usage"
                collapsed={!isSidebarOpen}
              />
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
          <div
            className={`app-content no-scrollbar flex-1 bg-white dark:bg-slate-950/40 ${
              isCommunicationRoute
                ? 'overflow-hidden p-0'
                : isAttendanceRoute || isExpenseRoute || isFlushSharedSubnavRoute
                ? 'overflow-y-auto px-4 pb-4 pt-0 sm:px-8 sm:pb-8 sm:pt-0 lg:px-16 lg:pb-16 lg:pt-0'
                : 'overflow-y-auto p-4 sm:p-8 lg:p-16'
            }`}
          >
            {isAdmin && !isAttendanceRoute && !isSharedSubnavRoute && (
              <div className="mb-4 max-w-5xl">
                <PlanLimitsBanner />
              </div>
            )}
            <Routes>
              {hasPower('DASHBOARD_VIEW') && (
                <Route path="/" element={<DashboardView state={state} loading={planningViewsLoading} />} />
              )}
              {hasPower('DASHBOARD_VIEW') && (
                <Route path="/analytics/tasks" element={<TaskAnalyticsView />} />
              )}
              {hasPower('PROFILE_VIEW') && (
                <Route path="/settings/security" element={<Navigate to="/profile?tab=security" replace />} />
              )}
              <Route path="/strengths" element={<StrengthsDashboardView />} />
              <Route path="/strengths/gaps" element={<StrengthsDashboardView />} />
              {isAdmin && <Route path="/billing-ai" element={<BillingAiUsageView />} />}
              {isAdmin && (
                <Route path="/settings/billing" element={<RedirectToBillingAiTab panel="billing" />} />
              )}
              {isAdmin && (
                <Route path="/ai/usage" element={<RedirectToBillingAiTab panel="ai-usage" />} />
              )}
              {isAdmin && (
                <Route path="/ai/settings" element={<RedirectToBillingAiTab panel="ai-usage" aiPanel="settings" />} />
              )}
              {hasPower('STAFF_VIEW') && (
                <Route path="/org-chart" element={<Navigate to="/staff/org-chart" replace />} />
              )}
              {hasPower('SPACES_VIEW') && (
                <Route path="/spaces" element={<SpacesView mode="manager" state={state} updateState={updateState} />} />
              )}
              {hasPower('SPACES_VIEW') && <Route path="/spaces/ai-agent" element={<AiAgentView />} />}
              {hasPower('SPACES_VIEW') && <Route path="/spaces/task/:taskId" element={<SpacesTaskDetailView mode="manager" />} />}
              {hasPower('ATTENDANCE_VIEW') && <Route path="/attendance" element={<AttendanceView mode="manager" />} />}
              {hasPower('ATTENDANCE_VIEW') && <Route path="/attendance/history" element={<AttendanceView mode="manager" />} />}
              {hasPower('ATTENDANCE_VIEW') && <Route path="/attendance/team" element={<AttendanceView mode="manager" />} />}
              {hasPower('EMPLOYEE_CREATE') && (
                <Route
                  path="/employees/add"
                  element={<Navigate to={hasPower('STAFF_VIEW') ? '/staff' : '/'} replace />}
                />
              )}
              {hasPower('EMPLOYEE_INVITE') && (
                <Route
                  path="/employees/invite"
                  element={<Navigate to={hasPower('STAFF_VIEW') ? '/staff' : '/'} replace />}
                />
              )}
              {hasPower('PROFILE_VIEW') && (
                <Route path="/profile" element={<ProfileView state={state} updateState={updateState} />} />
              )}
              {hasPower('WORKSPACES_VIEW') && (
                <Route
                  path="/workspaces/*"
                  element={<WorkspacesView state={state} updateState={updateState} loading={planningViewsLoading} />}
                />
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
              {hasPower('COMMUNICATION_VIEW') && <Route path="/communication" element={<CommunicationView />} />}
              {hasPower('CONTENT_VIEW') && <Route path="/content" element={<ContentView />} />}
              {hasPower('CONTENT_VIEW') && <Route path="/content/day/:dayKey" element={<ContentView />} />}
              {hasPower('CONTENT_VIEW') && <Route path="/content/day/:dayKey/type/:typeKey" element={<ContentView />} />}
              {hasPower('CONTENT_VIEW') && (
                <Route path="/content/day/:dayKey/type/:typeKey/item/:itemKey" element={<ContentView />} />
              )}
              {hasPower('CONTENT_VIEW') && <Route path="/content/new" element={<ContentCreateView />} />}
              {hasPower('ANALYSIS_VIEW') && (
                <Route path="/analysis" element={<Navigate to="/profile?tab=analysis" replace />} />
              )}
              {isAdmin && hasPower('PROFILE_VIEW') && (
                <Route path="/permissions" element={<Navigate to="/profile?tab=permissions" replace />} />
              )}
              {hasPower('STAFF_VIEW') && <Route path="/staff" element={<StaffView mode="manager" state={state} />} />}
              {hasPower('STAFF_VIEW') && <Route path="/staff/org-chart" element={<StaffView mode="manager" state={state} />} />}
              {hasPower('CRM_VIEW') && <Route path="/crm" element={<CRMPage />} />}
              {hasPower('CRM_VIEW') && <Route path="/crm/lead/:leadId" element={<CRMLeadDetailPage />} />}
              {hasPower('EXPENSE_VIEW') && <Route path="/expense-travel" element={<ExpenseTravelView mode="manager" />} />}
              {isSuperAdmin && <Route path="/super-admin" element={<SuperAdminView />} />}
              {isAdmin && (
                <Route path="/settings/audit-logs" element={<Navigate to="/profile?tab=audit-log" replace />} />
              )}
              {isAdmin && hasPower('PROFILE_VIEW') && <Route path="/settings/privacy" element={<Navigate to="/profile?tab=privacy" replace />} />}
              <Route path="*" element={<AccessDenied />} />
            </Routes>
          </div>
        </main>
      </div>
    </>
  );
};

export default AppManagerPortalLayout;
