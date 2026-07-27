import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AccessDenied from '../AccessDenied';
import SpacesTaskDetailView from '../../views/SpacesTaskDetailView';
import type { PlanningState } from '../../types';

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

export type AppEmployeeRoutesProps = {
  hasPower: (power: string) => boolean;
  hasVisionAccess: boolean;
  state: PlanningState;
  updateState: (updater: (prev: PlanningState) => PlanningState) => void;
  planningViewsLoading: boolean;
};

const AppEmployeeRoutes: React.FC<AppEmployeeRoutesProps> = ({
  hasPower,
  hasVisionAccess,
  state,
  updateState,
  planningViewsLoading,
}) => (
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
);

export default AppEmployeeRoutes;
