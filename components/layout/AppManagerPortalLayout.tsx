import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  Target,
  Clock,
  LayoutDashboard,
  BrainCircuit,
  Briefcase,
  Mail,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Database,
  UserPlus,
  FileText,
  HardDrive,
  UsersRound,
  Bot,
  Building2,
  Shield,
  GanttChart,
  CreditCard,
  ScrollText,
  UserPlus2,
  BarChart3,
  Activity,
  UserRoundCog,
  Network,
  KeyRound,
} from 'lucide-react';
import { PlanningState } from '../../types';
import Vision from '../../views/Vision';
import ReflectionView from '../../views/ReflectionView';
import DashboardView from '../../views/DashboardView';
import WorkspacesView from '../../views/WorkspacesView';
import ProfileView from '../../views/ProfileView';
import AddEmployeeView from '../../views/AddEmployeeView';
import SpacesView from '../../views/SpacesView';
import FeedbackView from '../../views/FeedbackView';
import AttendanceView from '../../views/AttendanceView';
import StaffView from '../../views/StaffView';
import MemoryUsageView from '../../views/MemoryUsageView';
import CommunicationView from '../../communication/views/CommunicationView';
import { GlobalCommunicationNotifications } from '../../communication/components/GlobalCommunicationNotifications';
import VisionHeaderTabs from '../../components/planning/VisionHeaderTabs';
import { isVisionRoute } from '../../components/planning/visionNavigation';
import ContentView from '../../views/ContentView';
import ContentCreateView from '../../views/ContentCreateView';
import SpacesTaskDetailView from '../../views/SpacesTaskDetailView';
import PermissionsView from '../../views/PermissionsView';
import AnalysisView from '../../views/AnalysisView';
import CRMPage from '../../views/CRMPage';
import CRMLeadDetailPage from '../../views/CRMLeadDetailPage';
import AiAgentView from '../../views/AiAgentView';
import TaskAnalyticsView from '../../views/TaskAnalyticsView';
import WorkloadHeatmapView from '../../views/WorkloadHeatmapView';
import SecuritySettingsView from '../../views/SecuritySettingsView';
import StrengthsDashboardView from '../../views/StrengthsDashboardView';
import SkillGapAnalysisView from '../../views/SkillGapAnalysisView';
import AiUsageDashboardView from '../../views/AiUsageDashboardView';
import AiSettingsView from '../../views/AiSettingsView';
import OrgChartView from '../../views/OrgChartView';
import SuperAdminView from '../../views/SuperAdminView';
import DataPrivacyView from '../../views/DataPrivacyView';
import GanttTimelineView from '../../views/GanttTimelineView';
import BillingSettingsView from '../../views/BillingSettingsView';
import AuditLogsView from '../../views/AuditLogsView';
import InviteEmployeeView from '../../views/InviteEmployeeView';
import PlanLimitsBanner from '../plan/PlanLimitsBanner';
import GlobalSearchModal from '../../components/search/GlobalSearchModal';
import { useI18n } from '../../context/I18nContext';
import AccessDenied from '../AccessDenied';
import { SidebarLink, SidebarToggleButton } from './SidebarPrimitives';
import { NotificationBellMenu, UserAccountMenu } from './AppTopbarControls';
import type { AppShellNotification } from './authenticatedShellTypes';

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
  handleLogout,
}) => {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const { t } = useI18n();
  const location = useLocation();
  const hasVisionAccess =
    hasPower('YEARLY_VIEW') ||
    hasPower('QUARTERLY_VIEW') ||
    hasPower('MONTHLY_VIEW') ||
    hasPower('WEEKLY_VIEW') ||
    hasPower('DAILY_VIEW');
  const showVisionHeaderTabs = hasVisionAccess && isVisionRoute(location.pathname);
  const isAddEmployeeRoute = location.pathname === '/employees/add';

  return (
    <>
      {globalToastsElement}
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <GlobalCommunicationNotifications />
      <div className="h-screen flex overflow-hidden bg-[#f1f5f9]">
        <aside
          className={`${isSidebarOpen ? 'w-48 max-sm:w-[72px]' : 'w-[72px]'} h-full min-h-0 bg-white/90 text-white backdrop-blur-xl transition-all duration-500 flex flex-col z-50 relative shrink-0`}
        >
          <div className="absolute top-0 right-0 h-full w-px bg-slate-200"></div>

          <div className="px-3.5 py-4 border-b border-white/5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-10 h-10 bg-brand-red flex items-center justify-center rounded shadow-lg shrink-0">
                <span className="text-white text-lg">RG</span>
              </div>
              {isSidebarOpen && (
                <span className="hidden text-[15px] font-medium text-brand-red truncate sm:inline">{state.uiConfig.sidebarLogoName}</span>
              )}
            </div>
            <SidebarToggleButton isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
          </div>
          <nav className="flex-1 min-h-0 py-3.5 space-y-1 overflow-y-auto overflow-x-hidden px-2.5">
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
                    icon={<Database size={20} />}
                    label="TaskHub"
                    badgeCount={taskCount}
                    collapsed={!isSidebarOpen}
                  />
                )}
                {hasPower('SPACES_VIEW') && (
                  <SidebarLink
                    to="/ai-agent"
                    icon={<Bot size={20} />}
                    label="AI Agent"
                    collapsed={!isSidebarOpen}
                  />
                )}
                {hasPower('DASHBOARD_VIEW') && (
                  <SidebarLink
                    to="/analytics/tasks"
                    icon={<BarChart3 size={20} />}
                    label="Task analytics"
                    collapsed={!isSidebarOpen}
                  />
                )}
                {(isAdmin || isSuperAdmin) && (
                  <SidebarLink
                    to="/analytics/workload"
                    icon={<Activity size={20} />}
                    label="Workload"
                    collapsed={!isSidebarOpen}
                  />
                )}
                {hasPower('ATTENDANCE_VIEW') && (
                  <SidebarLink to="/attendance" icon={<Clock size={20} />} label="Manage Attendance" collapsed={!isSidebarOpen} />
                )}
                <div className="h-px bg-white/5 mx-2.5 my-3.5"></div>
                {hasVisionAccess && (
                  <SidebarLink to="/yearly" icon={<Target size={20} />} label="Vision" collapsed={!isSidebarOpen} />
                )}
                {hasPower('REFLECTION_VIEW') && (
                  <SidebarLink
                    to="/reflection"
                    icon={<BrainCircuit size={20} />}
                    label={state.uiConfig.reflectionTitle}
                    collapsed={!isSidebarOpen}
                  />
                )}
                <div className="h-px bg-white/5 mx-2.5 my-3.5"></div>
              </>
            )}
            {hasPower('EMPLOYEE_CREATE') && (
              <SidebarLink
                to="/employees/add"
                icon={<UserPlus size={20} />}
                label={isSuperAdmin ? 'Add Branch' : 'Add Employee'}
                collapsed={!isSidebarOpen}
              />
            )}
            {hasPower('EMPLOYEE_INVITE') && (
              <SidebarLink
                to="/employees/invite"
                icon={<UserPlus2 size={20} />}
                label="Invite by email"
                collapsed={!isSidebarOpen}
              />
            )}
            {isAdmin && (
              <SidebarLink to="/permissions" icon={<ShieldAlert size={20} />} label="Permissions" collapsed={!isSidebarOpen} />
            )}
            {hasPower('COMMUNICATION_VIEW') && (
              <SidebarLink
                to="/communication"
                icon={<Mail size={20} />}
                label={communicationUnreadCount > 0 ? `Communication (${communicationUnreadCount})` : 'Communication'}
                collapsed={!isSidebarOpen}
              />
            )}
            {hasPower('CONTENT_VIEW') && (
              <SidebarLink to="/content" icon={<FileText size={20} />} label="Content" collapsed={!isSidebarOpen} />
            )}
            {isAdmin && (
              <SidebarLink to="/memory-usage" icon={<HardDrive size={20} />} label="Memory Usage" collapsed={!isSidebarOpen} />
            )}
            {isAdmin && hasPower('ANALYSIS_VIEW') && (
              <SidebarLink to="/analysis" icon={<Settings size={20} />} label="Analysis" collapsed={!isSidebarOpen} />
            )}
            {isAdmin && hasPower('FEEDBACK_VIEW') && (
              <SidebarLink to="/feedback" icon={<Mail size={20} />} label="Feedback" collapsed={!isSidebarOpen} />
            )}
            {hasPower('STAFF_VIEW') && (
              <SidebarLink to="/staff" icon={<ShieldCheck size={20} />} label="Staff" collapsed={!isSidebarOpen} />
            )}
            {hasPower('STAFF_VIEW') && (
              <SidebarLink to="/strengths" icon={<BrainCircuit size={20} />} label="Strengths" collapsed={!isSidebarOpen} />
            )}
            {hasPower('STAFF_VIEW') && (
              <SidebarLink to="/strengths/gaps" icon={<UserRoundCog size={20} />} label="Skill gaps" collapsed={!isSidebarOpen} />
            )}
            {hasPower('STAFF_VIEW') && (
              <SidebarLink to="/org-chart" icon={<Network size={20} />} label="Org chart" collapsed={!isSidebarOpen} />
            )}
            {hasPower('CRM_VIEW') && (
              <SidebarLink to="/crm" icon={<UsersRound size={20} />} label={t('crm')} collapsed={!isSidebarOpen} />
            )}
            {isSuperAdmin && (
              <SidebarLink to="/super-admin" icon={<Building2 size={20} />} label={t('superAdmin')} collapsed={!isSidebarOpen} />
            )}
            {isAdmin && (
              <SidebarLink to="/settings/billing" icon={<CreditCard size={20} />} label="Billing" collapsed={!isSidebarOpen} />
            )}
            {isAdmin && (
              <SidebarLink to="/settings/audit-logs" icon={<ScrollText size={20} />} label="Audit log" collapsed={!isSidebarOpen} />
            )}
            {isAdmin && (
              <SidebarLink to="/ai/usage" icon={<Bot size={20} />} label="AI usage" collapsed={!isSidebarOpen} />
            )}
            {isAdmin && (
              <SidebarLink to="/ai/settings" icon={<Settings size={20} />} label="AI settings" collapsed={!isSidebarOpen} />
            )}
            {isAdmin && (
              <SidebarLink to="/settings/security" icon={<KeyRound size={20} />} label="Security" collapsed={!isSidebarOpen} />
            )}
            {isAdmin && (
              <SidebarLink to="/settings/privacy" icon={<Shield size={20} />} label={t('dataPrivacy')} collapsed={!isSidebarOpen} />
            )}
            {(isAdmin || isSuperAdmin) && (
              <SidebarLink to="/projects/gantt" icon={<GanttChart size={20} />} label={t('gantt')} collapsed={!isSidebarOpen} />
            )}
          </nav>
        </aside>

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header
            className={`bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-8 shrink-0 z-40 relative ${
              showVisionHeaderTabs ? 'min-h-[92px] py-4' : 'h-20 flex items-center justify-end'
            }`}
          >
            <div className={`flex w-full items-center gap-3 sm:gap-6 ${showVisionHeaderTabs ? 'justify-between' : 'justify-end'}`}>
              {showVisionHeaderTabs ? (
                <div className="min-w-0 flex-1">
                  <VisionHeaderTabs />
                </div>
              ) : null}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Search
                </button>
                <NotificationBellMenu
                  notificationMenuOpen={notificationMenuOpen}
                  unreadNotificationCount={unreadNotificationCount}
                  notificationsLoading={notificationsLoading}
                  notifications={notifications}
                  setNotificationMenuOpen={setNotificationMenuOpen}
                  setUserMenuOpen={setUserMenuOpen}
                  openNotification={openNotification}
                  markNotificationRead={markNotificationRead}
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
            className={`flex-1 bg-slate-100/30 no-scrollbar ${
              isAddEmployeeRoute
                ? 'h-full overflow-y-auto px-0 py-5 lg:py-6'
                : showVisionHeaderTabs
                  ? 'overflow-y-auto px-4 pb-8 pt-2 sm:px-8 lg:px-12 lg:pb-12'
                  : 'overflow-y-auto p-4 sm:p-8 lg:p-16'
            }`}
          >
            {isAdmin && (
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
              {(isAdmin || isSuperAdmin) && (
                <Route path="/analytics/workload" element={<WorkloadHeatmapView />} />
              )}
              <Route path="/settings/security" element={<SecuritySettingsView />} />
              <Route path="/strengths" element={<StrengthsDashboardView />} />
              <Route path="/strengths/gaps" element={<SkillGapAnalysisView />} />
              <Route path="/ai/usage" element={<AiUsageDashboardView />} />
              <Route path="/ai/settings" element={<AiSettingsView />} />
              <Route path="/org-chart" element={<OrgChartView />} />
              {hasPower('SPACES_VIEW') && (
                <Route path="/spaces" element={<SpacesView mode="manager" state={state} updateState={updateState} />} />
              )}
              {hasPower('SPACES_VIEW') && <Route path="/ai-agent" element={<AiAgentView />} />}
              {hasPower('SPACES_VIEW') && <Route path="/spaces/task/:taskId" element={<SpacesTaskDetailView mode="manager" />} />}
              {hasPower('ATTENDANCE_VIEW') && <Route path="/attendance" element={<AttendanceView mode="manager" />} />}
              {hasPower('EMPLOYEE_CREATE') && <Route path="/employees/add" element={<AddEmployeeView state={state} />} />}
              {hasPower('EMPLOYEE_INVITE') && <Route path="/employees/invite" element={<InviteEmployeeView />} />}
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
              {isAdmin && <Route path="/memory-usage" element={<MemoryUsageView />} />}
              {isAdmin && hasPower('ANALYSIS_VIEW') && <Route path="/analysis" element={<AnalysisView />} />}
              {isAdmin && hasPower('FEEDBACK_VIEW') && <Route path="/feedback" element={<FeedbackView />} />}
              {isAdmin && <Route path="/permissions" element={<PermissionsView canEdit={true} />} />}
              {hasPower('STAFF_VIEW') && <Route path="/staff" element={<StaffView />} />}
              {hasPower('CRM_VIEW') && <Route path="/crm" element={<CRMPage />} />}
              {hasPower('CRM_VIEW') && <Route path="/crm/lead/:leadId" element={<CRMLeadDetailPage />} />}
              {isSuperAdmin && <Route path="/super-admin" element={<SuperAdminView />} />}
              {isAdmin && <Route path="/settings/billing" element={<BillingSettingsView />} />}
              {isAdmin && <Route path="/settings/audit-logs" element={<AuditLogsView />} />}
              {isAdmin && <Route path="/settings/privacy" element={<DataPrivacyView />} />}
              {(isAdmin || isSuperAdmin) && (
                <Route path="/projects/gantt" element={<GanttTimelineView />} />
              )}
              <Route path="*" element={<AccessDenied />} />
            </Routes>
          </div>
        </main>
      </div>
    </>
  );
};

export default AppManagerPortalLayout;
