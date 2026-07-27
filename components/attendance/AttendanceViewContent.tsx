import React from 'react';
import AttendanceHeader from './AttendanceHeader';
import LeaveManagementPanel from './LeaveManagementPanel';
import AttendanceHistoryPage from './AttendanceHistoryPage';
import TeamAttendanceSection from './TeamAttendanceSection';
import LateAttendanceSection from './LateAttendanceSection';
import EmployeeLateAttendanceSection from './EmployeeLateAttendanceSection';
import AttendanceOverviewGrid from './AttendanceOverviewGrid';
import AttendanceReportsPanel from './AttendanceReportsPanel';
import AttendanceLateHeaderActions from './AttendanceLateHeaderActions';
import type { AttendanceViewController } from '../../hooks/attendance/useAttendanceViewController';

type AttendanceViewContentProps = {
  ctrl: AttendanceViewController;
};

const AttendanceViewContent: React.FC<AttendanceViewContentProps> = ({ ctrl }) => {
  const {
    mode,
    isHistoryRoute,
    isTeamAttendanceRoute,
    activeView,
    isEmployeePortal,
    attendancePageLoading,
    lateLoginSettings,
    summary,
    lateLoginSettingsLoading,
    setLateLoginCutoffDraft,
    setLateLoginSettingsMessage,
    setLateLoginSettingsModalOpen,
    currentLateLoginCutoffLabel,
    isBackendAdminRole,
    liveSummary,
    range,
    selectedMonth,
    handleHistoryClose,
    handleTeamAttendanceClose,
    canReviewTeamAttendance,
    canManageLateLogins,
    employeePickerOpen,
    monthPickerOpen,
    employeePickerRef,
    monthPickerRef,
    setEmployeePickerOpen,
    setMonthPickerOpen,
    employeeOptions,
    selectedEmployeeEmpId,
    selectedEmployeeMonth,
    selectedEmployeeLabel,
    selectedEmployeeMonthLabel,
    selectedEmployee,
    employeeMonthOptions,
    liveEmployeeSummary,
    employeeAttendanceLoading,
    teamAttendanceSummaryLoading,
    liveTeamAttendanceSummary,
    backendEmpId,
    loadTeamAttendanceSummary,
    selectedEmployeeTodayInfo,
    selectedEmployeeMonthlyAttendance,
    setSelectedEmployeeEmpId,
    setSelectedEmployeeMonth,
    handleApproveLateLogin,
    lateLoginApprovalLoading,
    approverLeaves,
    leaveBalanceOverview,
    todayInfo,
    leaveDaysInRange,
    activeSession,
    locationInput,
    setLocationInput,
    handleLogin,
    handleStartBreak,
    handleResumeBreak,
    handleLogout,
    loginLoading,
    breakLoading,
    logoutLoading,
    handleQuickHalfDayRequest,
    handleRevertQuickHalfDayRequest,
    halfDayRequestLoading,
    todaysHalfDayRequest,
    todayHalfDayActivityRequest,
    sessionError,
    handleHistoryOpen,
    handleTeamAttendanceOpen,
    myLeaves,
    handleActiveViewChange,
    handleRejectLateLogin,
    lateLoginRejectLoading,
    lateLoginRequestLoading,
    handleRequestLateLogin,
    leaveStart,
    leaveEnd,
    leaveReason,
    leaveType,
    setLeaveStart,
    setLeaveEnd,
    setLeaveReason,
    setLeaveType,
    handleApplyLeave,
    handleDeleteLeave,
    pendingLeaves,
    leaveLoading,
    handleLeaveAction,
    handleLeaveLopAction,
    isBackendApproverRole,
    leaveViewerRole,
    leaveBalanceLoading,
    effectiveLeaveSection,
  } = ctrl;

  const lateHeaderActions = (
    <AttendanceLateHeaderActions
      activeView={activeView}
      isBackendAdminRole={isBackendAdminRole}
      currentLateLoginCutoffLabel={currentLateLoginCutoffLabel}
      lateLoginSettings={lateLoginSettings}
      summary={summary}
      lateLoginSettingsLoading={lateLoginSettingsLoading}
      setLateLoginCutoffDraft={setLateLoginCutoffDraft}
      setLateLoginSettingsMessage={setLateLoginSettingsMessage}
      setLateLoginSettingsModalOpen={setLateLoginSettingsModalOpen}
    />
  );

  return (
    <>
      <AttendanceHeader
        activeView={isHistoryRoute ? 'attendance' : activeView}
        subtitle={isEmployeePortal ? 'Your Presence Radar' : 'Team Attendance Console'}
        loading={attendancePageLoading}
        actions={lateHeaderActions}
        portalMode={mode}
      />

      {isHistoryRoute ? (
        <AttendanceHistoryPage
          summary={liveSummary}
          range={range}
          selectedMonth={selectedMonth}
          loading={attendancePageLoading}
          portalMode={mode}
          onBack={handleHistoryClose}
        />
      ) : isTeamAttendanceRoute ? (
        <div className="space-y-5">
          <section className="py-1">
            <button
              type="button"
              onClick={handleTeamAttendanceClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Back to attendance
            </button>
          </section>

          <TeamAttendanceSection
            canReviewTeamAttendance={canReviewTeamAttendance}
            canManageLateLogins={canManageLateLogins}
            employeePickerOpen={employeePickerOpen}
            monthPickerOpen={monthPickerOpen}
            employeePickerRef={employeePickerRef}
            monthPickerRef={monthPickerRef}
            setEmployeePickerOpen={setEmployeePickerOpen}
            setMonthPickerOpen={setMonthPickerOpen}
            employeeOptions={employeeOptions}
            selectedEmployeeEmpId={selectedEmployeeEmpId}
            selectedEmployeeMonth={selectedEmployeeMonth}
            selectedEmployeeLabel={selectedEmployeeLabel}
            selectedEmployeeMonthLabel={selectedEmployeeMonthLabel}
            selectedEmployee={selectedEmployee}
            employeeMonthOptions={employeeMonthOptions}
            employeeSummary={liveEmployeeSummary}
            employeeAttendanceLoading={employeeAttendanceLoading}
            teamAttendanceSummaryLoading={teamAttendanceSummaryLoading}
            teamAttendanceSummary={liveTeamAttendanceSummary}
            currentViewerEmpId={backendEmpId}
            onRefreshTeamActivity={loadTeamAttendanceSummary}
            selectedEmployeeTodayInfo={selectedEmployeeTodayInfo}
            selectedEmployeeMonthlyAttendance={selectedEmployeeMonthlyAttendance}
            setSelectedEmployeeEmpId={setSelectedEmployeeEmpId}
            setSelectedEmployeeMonth={setSelectedEmployeeMonth}
            onApproveLateLogin={handleApproveLateLogin}
            lateLoginApprovalLoading={lateLoginApprovalLoading}
            employeeLeaves={approverLeaves.filter((leave) => leave.empId === selectedEmployeeEmpId)}
            monthlyPaidLeaves={leaveBalanceOverview?.policy?.monthlyPaidLeaves ?? 1}
          />
        </div>
      ) : activeView === 'attendance' ? (
        <AttendanceOverviewGrid
          summary={liveSummary}
          range={range}
          todayMinutes={todayInfo.minutes}
          todayColor={todayInfo.color}
          leaveDaysInRange={leaveDaysInRange}
          attendancePageLoading={attendancePageLoading}
          selectedMonth={selectedMonth}
          activeSession={activeSession}
          locationInput={locationInput}
          onLocationChange={setLocationInput}
          onLogin={handleLogin}
          onStartBreak={handleStartBreak}
          onResumeBreak={handleResumeBreak}
          onLogout={handleLogout}
          loginLoading={loginLoading}
          breakLoading={breakLoading}
          logoutLoading={logoutLoading}
          onQuickHalfDayRequest={handleQuickHalfDayRequest}
          onRevertHalfDayRequest={handleRevertQuickHalfDayRequest}
          halfDayRequestLoading={halfDayRequestLoading}
          todaysHalfDayRequest={todaysHalfDayRequest}
          todayHalfDayActivityRequest={todayHalfDayActivityRequest}
          sessionError={sessionError}
          canReviewTeamAttendance={canReviewTeamAttendance}
          teamAttendanceSummaryLoading={teamAttendanceSummaryLoading}
          teamAttendanceSummary={liveTeamAttendanceSummary}
          currentViewerEmpId={backendEmpId}
          onRefreshTeamActivity={loadTeamAttendanceSummary}
          portalMode={mode}
          onOpenHistory={handleHistoryOpen}
          onOpenTeamAttendance={handleTeamAttendanceOpen}
          lateLoginPolicy={summary?.lateLoginPolicy || null}
          leaveBalanceOverview={leaveBalanceOverview}
          myLeaves={myLeaves}
          onOpenLateRequests={() => handleActiveViewChange('late')}
        />
      ) : activeView === 'late' ? (
        canReviewTeamAttendance ? (
          <LateAttendanceSection
            canManageLateLogins={canManageLateLogins}
            employeePickerOpen={employeePickerOpen}
            employeePickerRef={employeePickerRef}
            setEmployeePickerOpen={setEmployeePickerOpen}
            employeeOptions={employeeOptions}
            selectedEmployeeEmpId={selectedEmployeeEmpId}
            selectedEmployeeLabel={selectedEmployeeLabel}
            selectedEmployee={selectedEmployee}
            teamAttendanceSummaryLoading={teamAttendanceSummaryLoading}
            teamAttendanceSummary={liveTeamAttendanceSummary}
            setSelectedEmployeeEmpId={setSelectedEmployeeEmpId}
            onRefreshLateActivity={loadTeamAttendanceSummary}
            onApproveLateLogin={handleApproveLateLogin}
            onRejectLateLogin={handleRejectLateLogin}
            lateLoginApprovalLoading={lateLoginApprovalLoading}
            lateLoginRejectLoading={lateLoginRejectLoading}
          />
        ) : (
          <EmployeeLateAttendanceSection
            lateLoginPolicy={summary?.lateLoginPolicy || null}
            lateLoginRecords={summary?.lateLoginRecords || []}
            requestLoading={lateLoginRequestLoading}
            onRequestLateLogin={handleRequestLateLogin}
          />
        )
      ) : activeView === 'reports' ? (
        <AttendanceReportsPanel
          canManageOps={canManageLateLogins || isBackendAdminRole}
          canReviewTeam={canReviewTeamAttendance}
          defaultMonth={selectedMonth || undefined}
          defaultSection={!canReviewTeamAttendance ? 'requests' : 'overview'}
        />
      ) : (
        <div className="space-y-6">
          <LeaveManagementPanel
            leaveStart={leaveStart}
            leaveEnd={leaveEnd}
            leaveReason={leaveReason}
            leaveType={leaveType}
            onChangeStart={setLeaveStart}
            onChangeEnd={setLeaveEnd}
            onChangeReason={setLeaveReason}
            onChangeType={setLeaveType}
            onApply={handleApplyLeave}
            onDeleteLeave={handleDeleteLeave}
            myLeaves={myLeaves}
            pendingLeaves={pendingLeaves}
            leaveLoading={leaveLoading}
            onLeaveAction={handleLeaveAction}
            onLeaveLopAction={handleLeaveLopAction}
            canApplyLeave={!isBackendAdminRole}
            approverLeaves={approverLeaves}
            isAdmin={!!isBackendAdminRole}
            isApproverPortal={isBackendApproverRole}
            viewerRole={leaveViewerRole}
            currentEmployeeId={backendEmpId}
            employeeDirectory={employeeOptions.map((employee) => `${employee.empName} (${employee.empId})`)}
            employeeOptions={employeeOptions}
            currentOverview={leaveBalanceOverview}
            currentOverviewLoading={leaveBalanceLoading}
            activeSection={effectiveLeaveSection}
            loading={leaveLoading && myLeaves.length === 0 && pendingLeaves.length === 0 && approverLeaves.length === 0}
          />
        </div>
      )}
    </>
  );
};

export default AttendanceViewContent;
