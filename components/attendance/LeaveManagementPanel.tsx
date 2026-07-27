import React, { useMemo, useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import {
  LeaveBalanceOverviewResponse,
  LeaveRequest,
} from './attendanceUtils';
import { Skeleton, SkeletonBlock } from '../ui/Skeleton';
import { usePermissions } from '../../context/usePermissions';
import LeaveCalendarView from './LeaveCalendarView';
import PendingApprovalsPanel from './PendingApprovalsPanel';
import LeaveDetailModal from './LeaveDetailModal';
import LeaveApplyForLeaveForm from './LeaveApplyForLeaveForm';
import LeaveAdminLeaveOperationsSection from './LeaveAdminLeaveOperationsSection';
import LeaveHistoryRecordsSection from './LeaveHistoryRecordsSection';
import LeaveBalanceOverviewSection from './LeaveBalanceOverviewSection';
import LeaveEmployeeLopSection from './LeaveEmployeeLopSection';
import { LOP_HISTORY_FILTER_OPTIONS, LopHistoryFilter } from './lopUtils';
import FilterDropdown from './FilterDropdown';
import {
  calculateLeaveDays,
  formatApprovalDate,
  formatDecisionRole,
  getEmployeeIdFromLabel,
  getEmployeeNameFromLabel,
  getEmployeeRecordLabel,
  leaveDetailStatusThemes,
  normalizeDate,
} from './leaveManagementPanelUtils';
import type { AttendanceEmployeeOption } from './attendanceViewUtils';
import {
  useCloseLeaveDropdownsOnOutsideClick,
  useLeaveAdminOverviewFilters,
  useLeaveHistoryFilters,
} from './leaveManagementPanelFilterHooks';
import {
  useLeaveAdminSettings,
  useLeaveApplyForm,
  useLeaveLiveRefresh,
  useLeaveLopSummary,
  useLeaveOverviewData,
  useLeaveToast,
} from './leaveManagementPanelDataHooks';

type LeavePanelSection = 'workspace' | 'insights' | 'policy';

interface Props {
  leaveStart: string;
  leaveEnd: string;
  leaveReason: string;
  leaveType: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onChangeReason: (value: string) => void;
  onChangeType: (value: string) => void;
  onApply: () => Promise<boolean> | boolean;
  onDeleteLeave: (leave: LeaveRequest) => Promise<boolean> | boolean;
  myLeaves: LeaveRequest[];
  pendingLeaves: LeaveRequest[];
  leaveLoading: boolean;
  onLeaveAction: (id: string, action: 'APPROVE' | 'REJECT') => void;
  onLeaveLopAction?: (id: string, action: string, reason?: string) => Promise<void>;
  canApplyLeave: boolean;
  approverLeaves: LeaveRequest[];
  isAdmin: boolean;
  isApproverPortal: boolean;
  viewerRole: 'employee' | 'team_lead' | 'admin';
  currentEmployeeId?: string;
  employeeDirectory?: string[];
  employeeOptions?: AttendanceEmployeeOption[];
  currentOverview?: LeaveBalanceOverviewResponse | null;
  currentOverviewLoading?: boolean;
  activeSection?: LeavePanelSection;
  loading?: boolean;
}

const LeaveManagementPanel: React.FC<Props> = ({
  leaveStart,
  leaveEnd,
  leaveReason,
  leaveType,
  onChangeStart,
  onChangeEnd,
  onChangeReason,
  onChangeType,
  onApply,
  onDeleteLeave,
  myLeaves,
  pendingLeaves,
  leaveLoading,
  onLeaveAction,
  onLeaveLopAction,
  canApplyLeave,
  approverLeaves,
  isAdmin,
  isApproverPortal,
  viewerRole,
  currentEmployeeId,
  employeeDirectory = [],
  employeeOptions = [],
  currentOverview = null,
  currentOverviewLoading = false,
  activeSection = 'workspace',
  loading = false,
}) => {
  const { hasPermission } = usePermissions();
  const [selectedDetailLeave, setSelectedDetailLeave] = useState<LeaveRequest | null>(null);
  const canManagePolicy = hasPermission('LEAVE_POLICY_MANAGE');
  const showWorkspaceSection = activeSection === 'workspace';
  const showInsightsSection = activeSection === 'insights';
  const showPolicySection = activeSection === 'policy' && isApproverPortal;

  const baseLeaves = useMemo(() => {
    if (viewerRole === 'admin') {
      return approverLeaves;
    }

    if (viewerRole === 'team_lead') {
      const byId = new Map<string, LeaveRequest>();

      [...myLeaves, ...approverLeaves].forEach((leave) => {
        byId.set(String(leave._id), leave);
      });

      return Array.from(byId.values());
    }

    return myLeaves;
  }, [approverLeaves, myLeaves, viewerRole]);

  const calendarLeaves = useMemo(
    () =>
      baseLeaves.filter((leave) => {
        if (!['APPROVED', 'PENDING'].includes(leave.status)) {
          return false;
        }

        if (viewerRole !== 'admin' && currentEmployeeId) {
          return leave.empId === currentEmployeeId;
        }

        return true;
      }),
    [baseLeaves, currentEmployeeId, viewerRole],
  );

  const currentEmployeeName = useMemo(() => {
    const fromDirectory = employeeDirectory
      .map((label) => ({
        empId: getEmployeeIdFromLabel(label),
        name: getEmployeeNameFromLabel(label),
      }))
      .find((employee) => employee.empId === currentEmployeeId)?.name;

    if (fromDirectory) return fromDirectory;

    const fromLeaves = baseLeaves.find((leave) => String(leave.empId || '').trim() === String(currentEmployeeId || '').trim());
    return String(fromLeaves?.empName || '').trim();
  }, [baseLeaves, currentEmployeeId, employeeDirectory]);

  const upcomingLeaves = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return baseLeaves
      .filter((leave) => {
        const leaveEndDate = normalizeDate(leave.endDate);
        return !!leaveEndDate && leaveEndDate >= today;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 4);
  }, [baseLeaves]);

  const { toast, showToast } = useLeaveToast();

  const adminFilters = useLeaveAdminOverviewFilters({ baseLeaves, viewerRole, employeeDirectory });

  const historyFilters = useLeaveHistoryFilters({
    baseLeaves,
    viewerRole,
    currentEmployeeId,
    currentEmployeeName,
    adminEmployeeOptions: adminFilters.adminEmployeeOptions,
  });

  useCloseLeaveDropdownsOnOutsideClick({
    adminEmployeePickerOpen: adminFilters.adminEmployeePickerOpen,
    setAdminEmployeePickerOpen: adminFilters.setAdminEmployeePickerOpen,
    adminEmployeePickerRef: adminFilters.adminEmployeePickerRef,
    adminMonthPickerOpen: adminFilters.adminMonthPickerOpen,
    setAdminMonthPickerOpen: adminFilters.setAdminMonthPickerOpen,
    adminMonthPickerRef: adminFilters.adminMonthPickerRef,
    historyStatusPickerOpen: historyFilters.historyStatusPickerOpen,
    setHistoryStatusPickerOpen: historyFilters.setHistoryStatusPickerOpen,
    historyStatusPickerRef: historyFilters.historyStatusPickerRef,
    historyEmployeePickerOpen: historyFilters.historyEmployeePickerOpen,
    setHistoryEmployeePickerOpen: historyFilters.setHistoryEmployeePickerOpen,
    historyEmployeePickerRef: historyFilters.historyEmployeePickerRef,
    historyMonthPickerOpen: historyFilters.historyMonthPickerOpen,
    setHistoryMonthPickerOpen: historyFilters.setHistoryMonthPickerOpen,
    historyMonthPickerRef: historyFilters.historyMonthPickerRef,
  });

  const overview = useLeaveOverviewData({
    viewerRole,
    currentEmployeeId,
    employeeOptions,
    currentOverview,
    currentOverviewLoading,
    showToast,
  });

  const adminSettings = useLeaveAdminSettings({
    isApproverPortal,
    showToast,
    loadOverview: overview.loadOverview,
  });

  const applyForm = useLeaveApplyForm({
    leaveStart,
    leaveEnd,
    leaveReason,
    leaveType,
    onApply,
    onDeleteLeave,
    onChangeStart,
    onChangeEnd,
    onChangeReason,
    onChangeType,
    showToast,
  });

  const lopSummaryData = useLeaveLopSummary({
    viewerRole,
    myLeavesLength: myLeaves.length,
    canApplyLeave,
    hasInvalidRange: applyForm.hasInvalidRange,
    leaveStart,
    leaveEnd,
    leaveType,
    onLeaveLopAction,
    showToast,
  });

  useLeaveLiveRefresh({
    isApproverPortal,
    loadOverview: overview.loadOverview,
    loadAdminMeta: adminSettings.loadAdminMeta,
  });

  const getDecisionLabel = historyFilters.getDecisionLabel;

  return (
    <div className="space-y-8">
      {toast ? (
        <div className={`fixed right-6 top-6 z-50 inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_20px_40px_rgba(15,23,42,0.16)] ${
          toast.tone === 'success'
            ? 'border-emerald-200 bg-white text-emerald-700'
            : 'border-slate-200 bg-white text-slate-700'
        }`}>
          {toast.tone === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
          {toast.message}
        </div>
      ) : null}

      {showWorkspaceSection && viewerRole === 'team_lead' ? (
        <PendingApprovalsPanel
          pendingLeaves={pendingLeaves}
          onLeaveAction={onLeaveAction}
          onLeaveLopAction={lopSummaryData.handleLeaveLopAction}
          showLopActions={isApproverPortal}
          formatApprovalDate={formatApprovalDate}
          calculateLeaveDays={calculateLeaveDays}
          sectionClassName="w-full max-w-[720px] rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
          gridClassName="mt-5 grid gap-4"
        />
      ) : null}

      {showInsightsSection ? (
        <LeaveBalanceOverviewSection
          overview={overview.overviewData}
          loading={overview.overviewLoading}
          viewerRole={viewerRole}
          employeeOptions={employeeOptions}
          selectedEmployeeEmpId={overview.overviewEmployeeEmpId}
          selectedPeriod={overview.overviewPeriod}
          selectedMonth={overview.overviewMonth.slice(5, 7)}
          selectedYear={overview.overviewYear}
          exportLoading={overview.exportLoading}
          onEmployeeChange={overview.setOverviewEmployeeEmpId}
          onPeriodChange={overview.setOverviewPeriod}
          onMonthChange={(value) => overview.setOverviewMonth(`${overview.overviewYear}-${value}`)}
          onYearChange={(value) => {
            overview.setOverviewYear(value);
            overview.setOverviewMonth(`${value}-${overview.overviewMonth.slice(5, 7) || '01'}`);
          }}
          onExport={() => {
            void overview.handleExport();
          }}
          onRefresh={() => {
            void overview.loadOverview();
          }}
        />
      ) : null}

      {showWorkspaceSection ? (
        <>
          <div
            className={`grid gap-6 ${
              viewerRole === 'admin'
                ? pendingLeaves.length > 0
                  ? ''
                  : ''
                : 'xl:grid-cols-[minmax(0,1.4fr)_380px]'
            }`}
          >
            <div className={viewerRole === 'admin' && pendingLeaves.length > 0 ? 'order-2 space-y-6' : 'space-y-6'}>
              {canApplyLeave ? (
                loading ? (
                <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] animate-pulse">
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-32" />
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <SkeletonBlock className="h-12 w-full rounded-2xl" />
                      <SkeletonBlock className="h-12 w-full rounded-2xl" />
                    </div>
                    <SkeletonBlock className="h-28 w-full rounded-2xl" />
                    <SkeletonBlock className="h-12 w-full rounded-2xl" />
                  </div>
                </div>
              ) : (
                <LeaveApplyForLeaveForm
                  leaveStart={leaveStart}
                  leaveEnd={leaveEnd}
                  leaveReason={leaveReason}
                  leaveType={leaveType}
                  onChangeStart={onChangeStart}
                  onChangeEnd={onChangeEnd}
                  onChangeReason={onChangeReason}
                  onChangeType={onChangeType}
                  activePopup={applyForm.activePopup}
                  setActivePopup={applyForm.setActivePopup}
                  startFieldRef={applyForm.startFieldRef}
                  endFieldRef={applyForm.endFieldRef}
                  reasonFieldRef={applyForm.reasonFieldRef}
                  typeFieldRef={applyForm.typeFieldRef}
                  hasInvalidRange={applyForm.hasInvalidRange}
                  calculatedDays={applyForm.calculatedDays}
                  selectedLeaveTypeOption={applyForm.selectedLeaveTypeOption}
                  onSubmitLeave={applyForm.handleSubmitLeave}
                  lopPreviewLoading={lopSummaryData.lopPreviewLoading}
                  lopEvaluation={lopSummaryData.lopEvaluation}
                />
              )
            ) : (
              <LeaveAdminLeaveOperationsSection
                viewerRole={viewerRole}
                adminEmployeeFilter={adminFilters.adminEmployeeFilter}
                setAdminEmployeeFilter={adminFilters.setAdminEmployeeFilter}
                adminMonthFilter={adminFilters.adminMonthFilter}
                setAdminMonthFilter={adminFilters.setAdminMonthFilter}
                adminEmployeePickerOpen={adminFilters.adminEmployeePickerOpen}
                setAdminEmployeePickerOpen={adminFilters.setAdminEmployeePickerOpen}
                adminMonthPickerOpen={adminFilters.adminMonthPickerOpen}
                setAdminMonthPickerOpen={adminFilters.setAdminMonthPickerOpen}
                adminEmployeePickerRef={adminFilters.adminEmployeePickerRef}
                adminMonthPickerRef={adminFilters.adminMonthPickerRef}
                adminEmployeeOptions={adminFilters.adminEmployeeOptions}
                adminMonthOptions={adminFilters.adminMonthOptions}
                leaveStats={adminFilters.leaveStats}
              />
            )}
          </div>

            {viewerRole === 'admin' ? (
              <PendingApprovalsPanel
                pendingLeaves={pendingLeaves}
                onLeaveAction={onLeaveAction}
                onLeaveLopAction={lopSummaryData.handleLeaveLopAction}
                showLopActions
                formatApprovalDate={formatApprovalDate}
                calculateLeaveDays={calculateLeaveDays}
                sectionClassName="order-1 w-full max-w-[720px] rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
                gridClassName="mt-5 grid gap-4"
                showEmployeeLabelHeading={false}
                compactTitleLine={true}
              />
            ) : null}

          {viewerRole !== 'admin' ? (
            <div className="space-y-6">
              <LeaveCalendarView
                leaves={calendarLeaves}
                selectedStart={leaveStart}
                selectedEnd={leaveEnd}
                showEmployeeDetails={viewerRole !== 'employee'}
                onVisibleMonthChange={viewerRole === 'employee' ? historyFilters.setHistoryMonthFilter : undefined}
              />
            </div>
          ) : null}
        </div>

        {viewerRole === 'employee' ? (
          <LeaveEmployeeLopSection summary={lopSummaryData.lopSummary} loading={lopSummaryData.lopSummaryLoading} />
        ) : null}

        {isApproverPortal ? (
          <div className="rounded-[26px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              LOP filters
            </span>
            <FilterDropdown
              value={historyFilters.lopHistoryFilter}
              selectedLabel={historyFilters.lopHistoryFilterLabel}
              options={LOP_HISTORY_FILTER_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              open={historyFilters.lopHistoryFilterOpen}
              onToggle={() => historyFilters.setLopHistoryFilterOpen((prev) => !prev)}
              onSelect={(value) => {
                historyFilters.setLopHistoryFilter(value as LopHistoryFilter);
                historyFilters.setLopHistoryFilterOpen(false);
              }}
              containerRef={historyFilters.lopHistoryFilterRef}
            />
          </div>
        ) : null}

        <LeaveHistoryRecordsSection
          showHistoryEmployeeFilter={historyFilters.showHistoryEmployeeFilter}
          statusFilter={historyFilters.statusFilter}
          setStatusFilter={historyFilters.setStatusFilter}
          historyStatusLabel={historyFilters.historyStatusLabel}
          historyStatusOptions={historyFilters.historyStatusOptions}
          historyStatusPickerOpen={historyFilters.historyStatusPickerOpen}
          setHistoryStatusPickerOpen={historyFilters.setHistoryStatusPickerOpen}
          setHistoryEmployeePickerOpen={historyFilters.setHistoryEmployeePickerOpen}
          setHistoryMonthPickerOpen={historyFilters.setHistoryMonthPickerOpen}
          historyStatusPickerRef={historyFilters.historyStatusPickerRef}
          historyEmployeeFilter={historyFilters.historyEmployeeFilter}
          setHistoryEmployeeFilter={historyFilters.setHistoryEmployeeFilter}
          historyEmployeeLabel={historyFilters.historyEmployeeLabel}
          historyEmployeeOptions={historyFilters.historyEmployeeOptions}
          formatHistoryEmployeeOptionLabel={historyFilters.formatHistoryEmployeeOptionLabel}
          historyEmployeePickerOpen={historyFilters.historyEmployeePickerOpen}
          historyEmployeePickerRef={historyFilters.historyEmployeePickerRef}
          historyMonthFilter={historyFilters.historyMonthFilter}
          setHistoryMonthFilter={historyFilters.setHistoryMonthFilter}
          historyMonthLabel={historyFilters.historyMonthLabel}
          historyMonthOptions={historyFilters.historyMonthOptions}
          historyMonthPickerOpen={historyFilters.historyMonthPickerOpen}
          historyMonthPickerRef={historyFilters.historyMonthPickerRef}
          leaveLoading={leaveLoading}
          filteredLeaves={historyFilters.filteredLeaves}
          isApproverPortal={isApproverPortal}
          viewerRole={viewerRole}
          getDecisionLabel={getDecisionLabel}
          onViewDetails={setSelectedDetailLeave}
          onEditLeave={applyForm.handleEditLeave}
          onDeleteLeave={applyForm.handleDeleteLeave}
        />
      </>
      ) : null}

      {showPolicySection ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 md:p-6">
          <h3 className="text-lg font-semibold text-slate-900">Leave policy moved</h3>
          <p className="mt-2 text-sm text-slate-500">
            Manage monthly paid leaves and LOP rules in Attendance → Reports → Setup.
          </p>
        </div>
      ) : null}

      {showWorkspaceSection && viewerRole === 'employee' ? (
        <PendingApprovalsPanel
          pendingLeaves={pendingLeaves}
          onLeaveAction={onLeaveAction}
          formatApprovalDate={formatApprovalDate}
          calculateLeaveDays={calculateLeaveDays}
          sectionClassName="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
          gridClassName="mt-5 grid gap-4 md:grid-cols-2"
        />
      ) : null}

      <LeaveDetailModal
        selectedDetailLeave={selectedDetailLeave}
        onClose={() => setSelectedDetailLeave(null)}
        viewerRole={viewerRole}
        isApproverPortal={isApproverPortal}
        getEmployeeRecordLabel={getEmployeeRecordLabel}
        formatDecisionRole={formatDecisionRole}
        leaveDetailStatusThemes={leaveDetailStatusThemes}
      />
    </div>
  );
};

export default LeaveManagementPanel;
