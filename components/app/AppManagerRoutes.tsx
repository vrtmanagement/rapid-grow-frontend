import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AccessDenied from '../AccessDenied';
import SpacesTaskDetailView from '../../views/SpacesTaskDetailView';
import type { PlanningState } from '../../types';

const Vision = lazy(() => import('../../views/Vision'));
const ReflectionView = lazy(() => import('../../views/ReflectionView'));
const DashboardView = lazy(() => import('../../views/DashboardView'));
const WorkspacesView = lazy(() => import('../../views/WorkspacesView'));
const ProfileView = lazy(() => import('../../views/ProfileView'));
const SpacesView = lazy(() => import('../../views/SpacesView'));
const AttendanceView = lazy(() => import('../../views/AttendanceView'));
const StaffView = lazy(() => import('../../views/StaffView'));
const DriveView = lazy(() => import('../../drive/views/DriveView'));
const ContentView = lazy(() => import('../../views/ContentView'));
const ContentCreateView = lazy(() => import('../../views/ContentCreateView'));
const CRMPage = lazy(() => import('../../views/CRMPage'));
const CRMLeadDetailPage = lazy(() => import('../../views/CRMLeadDetailPage'));
const StrategyExecutionView = lazy(() => import('../../views/StrategyExecutionView'));
const ExpenseTravelView = lazy(() => import('../../views/ExpenseTravelView'));
const AiAgentView = lazy(() => import('../../views/AiAgentView'));
const TaskAnalyticsView = lazy(() => import('../../views/TaskAnalyticsView'));
const StrengthsDashboardView = lazy(() => import('../../views/StrengthsDashboardView'));
const SuperAdminView = lazy(() => import('../../views/SuperAdminView'));
const BillingAiUsageView = lazy(() => import('../../views/BillingAiUsageView'));
const CommunicationView = lazy(() => import('../../communication/views/CommunicationView'));

function RouteFallback() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-red" aria-label="Loading" />
    </div>
  );
}

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

export type AppManagerRoutesProps = {
  hasPower: (power: string) => boolean;
  hasVisionAccess: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  planningViewsLoading: boolean;
};

const AppManagerRoutes: React.FC<AppManagerRoutesProps> = ({
  hasPower,
  hasVisionAccess,
  isAdmin,
  isSuperAdmin,
  state,
  updateState,
  planningViewsLoading,
}) => (
  <Suspense fallback={<RouteFallback />}>
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
      {hasPower('ANALYSIS_VIEW') && (
        <Route path="/analysis" element={<Navigate to="/profile?tab=analysis" replace />} />
      )}
      {isAdmin && hasPower('PROFILE_VIEW') && (
        <Route path="/permissions" element={<Navigate to="/profile?tab=permissions" replace />} />
      )}
      {hasPower('STAFF_VIEW') && <Route path="/staff" element={<StaffView mode="manager" state={state} />} />}
      {hasPower('STAFF_VIEW') && <Route path="/staff/org-chart" element={<StaffView mode="manager" state={state} />} />}
      {hasPower('STRATEGY_EXECUTION_VIEW') && (
        <Route path="/strategy-execution" element={<StrategyExecutionView />} />
      )}
      {hasPower('CRM_VIEW') && <Route path="/crm" element={<CRMPage />} />}
      {hasPower('CRM_VIEW') && <Route path="/crm/lead/:leadId" element={<CRMLeadDetailPage />} />}
      {hasPower('EXPENSE_VIEW') && <Route path="/expense-travel" element={<ExpenseTravelView mode="manager" />} />}
      {isSuperAdmin && <Route path="/super-admin" element={<SuperAdminView />} />}
      {isAdmin && (
        <Route path="/settings/audit-logs" element={<Navigate to="/profile?tab=audit-log" replace />} />
      )}
      {isAdmin && hasPower('PROFILE_VIEW') && (
        <Route path="/settings/privacy" element={<Navigate to="/profile?tab=privacy" replace />} />
      )}
      <Route path="*" element={<AccessDenied />} />
    </Routes>
  </Suspense>
);

export default AppManagerRoutes;
