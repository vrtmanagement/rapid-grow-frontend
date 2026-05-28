import React from 'react';
import { AlertTriangle, ChevronDown, RefreshCw, ShieldCheck, UserRoundCheck } from 'lucide-react';
import {
  AttendanceEmployeeOption,
  TeamAttendanceSummary,
  TeamLateLoginRecord,
} from './attendanceViewUtils';

interface LateAttendanceSectionProps {
  canManageLateLogins: boolean;
  employeePickerOpen: boolean;
  employeePickerRef: React.RefObject<HTMLDivElement | null>;
  setEmployeePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  employeeOptions: AttendanceEmployeeOption[];
  selectedEmployeeEmpId: string;
  selectedEmployeeLabel: string;
  selectedEmployee: AttendanceEmployeeOption | null;
  teamAttendanceSummaryLoading: boolean;
  teamAttendanceSummary: TeamAttendanceSummary | null;
  setSelectedEmployeeEmpId: (value: string) => void;
  onRefreshLateActivity: () => void;
  onApproveLateLogin: (empId: string, reason: string) => Promise<{ ok: boolean; message: string }>;
  onRejectLateLogin: (empId: string, reason: string) => Promise<{ ok: boolean; message: string }>;
  lateLoginApprovalLoading: boolean;
  lateLoginRejectLoading: boolean;
}

const LateAttendanceSection: React.FC<LateAttendanceSectionProps> = ({
  canManageLateLogins,
  employeePickerOpen,
  employeePickerRef,
  setEmployeePickerOpen,
  employeeOptions,
  selectedEmployeeEmpId,
  selectedEmployeeLabel,
  selectedEmployee,
  teamAttendanceSummaryLoading,
  teamAttendanceSummary,
  setSelectedEmployeeEmpId,
  onRefreshLateActivity,
  onApproveLateLogin,
  onRejectLateLogin,
  lateLoginApprovalLoading,
  lateLoginRejectLoading,
}) => {
  const [lateLoginFilter, setLateLoginFilter] = React.useState<'ALL' | 'APPROVED' | 'REJECTED'>('ALL');
  const [lateLoginModalOpen, setLateLoginModalOpen] = React.useState(false);
  const [lateLoginReason, setLateLoginReason] = React.useState('');
  const [lateLoginActionMessage, setLateLoginActionMessage] = React.useState<string | null>(null);

  const lateLoginRecords = React.useMemo(
    () => teamAttendanceSummary?.lateLoginRecords ?? [],
    [teamAttendanceSummary?.lateLoginRecords],
  );
  const teamMembers = React.useMemo(
    () => teamAttendanceSummary?.members ?? [],
    [teamAttendanceSummary?.members],
  );
  const selectedEmployeeTeamState = React.useMemo(
    () => teamMembers.find((member) => member.empId === selectedEmployeeEmpId) || null,
    [selectedEmployeeEmpId, teamMembers],
  );
  const selectedEmployeeLateLogin = selectedEmployeeTeamState?.lateLogin || null;

  const filteredLateLoginRecords = React.useMemo(() => {
    if (lateLoginFilter === 'ALL') {
      return lateLoginRecords;
    }

    return lateLoginRecords.filter((record) => record.status === lateLoginFilter);
  }, [lateLoginFilter, lateLoginRecords]);

  const stats = React.useMemo(() => {
    const approved = lateLoginRecords.filter((record) => record.status === 'APPROVED').length;
    const rejected = lateLoginRecords.filter((record) => record.status === 'REJECTED').length;
    const active = lateLoginRecords.filter((record) => record.status === 'APPROVED' && !record.loginTime).length;

    return {
      total: lateLoginRecords.length,
      approved,
      rejected,
      active,
    };
  }, [lateLoginRecords]);

  React.useEffect(() => {
    setLateLoginActionMessage(null);
    setLateLoginReason('');
    setLateLoginModalOpen(false);
  }, [selectedEmployeeEmpId]);

  const formatLateLoginDateTime = React.useCallback((value?: string | null) => {
    if (!value) return 'Awaiting login';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Awaiting login';
    return parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  }, []);

  const handleConfirmLateLoginApproval = React.useCallback(async () => {
    if (!selectedEmployeeEmpId) return;

    const result = await onApproveLateLogin(selectedEmployeeEmpId, lateLoginReason);
    setLateLoginActionMessage(result.message);

    if (result.ok) {
      setLateLoginModalOpen(false);
      setLateLoginReason('');
    }
  }, [lateLoginReason, onApproveLateLogin, selectedEmployeeEmpId]);

  const handleRejectLateLoginRecord = React.useCallback(async (empId: string) => {
    const result = await onRejectLateLogin(empId, '');
    setLateLoginActionMessage(result.message);
  }, [onRejectLateLogin]);

  const renderLateLoginRow = React.useCallback((record: TeamLateLoginRecord) => {
    const badgeClassName = record.status === 'APPROVED'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100'
      : record.status === 'REQUESTED'
        ? 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100'
        : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100';
    const secondaryBadgeClassName = record.status === 'APPROVED'
      ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100'
      : record.status === 'REQUESTED'
        ? 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100'
      : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200';

    return (
      <div key={record.id} className="grid gap-4 px-6 py-4 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.9fr)] md:px-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[15px] font-semibold text-slate-900">{record.empName}</p>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${badgeClassName}`}>
              {record.status === 'APPROVED'
                ? 'Approved Late Login'
                : record.status === 'REQUESTED'
                  ? 'Approval Requested'
                  : 'Late Login'}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-slate-500">
            {[record.empId, record.designation || record.role, record.department].filter(Boolean).join(' • ')}
          </p>
          {record.approvalReason ? (
            <p className="mt-2 text-[12px] leading-5 text-slate-500">{record.approvalReason}</p>
          ) : null}
        </div>

        <div className="space-y-2 text-[12px] text-slate-500">
          <div>
            <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Login time</p>
            <p className="mt-1 text-[13px] font-medium text-slate-800">{formatLateLoginDateTime(record.loginTime || null)}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">
              {record.status === 'APPROVED' ? 'Approved at' : 'Attempted at'}
            </p>
            <p className="mt-1 text-[13px] font-medium text-slate-800">
              {formatLateLoginDateTime(record.approvalTimestamp || record.attemptedAt)}
            </p>
          </div>
        </div>

        <div className="space-y-2 md:text-right">
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold ${secondaryBadgeClassName}`}>
            {record.status === 'APPROVED'
              ? (record.loginTime ? 'Login completed' : 'Approval active')
              : record.status === 'REQUESTED'
                ? 'Awaiting decision'
              : 'Access blocked'}
          </span>
          {record.status === 'APPROVED' ? (
            <p className="text-[12px] text-slate-500">
              {record.approvedByName
                ? `${record.approvedByName}${record.approvedByRole ? ` • ${record.approvedByRole}` : ''}`
                : 'Approved by manager'}
            </p>
          ) : (
            <p className="text-[12px] text-slate-500">
              {record.status === 'REQUESTED' ? 'Employee requested manager approval' : 'Requires TL/Admin approval'}
            </p>
          )}
        </div>
      </div>
    );
  }, [formatLateLoginDateTime]);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Late records</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Approved</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Rejected</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.rejected}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <UserRoundCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Approval active</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.active}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-[30px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-navy p-6 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-brand-red" />
              <span className="text-[15px] text-slate-300">Late Login Desk</span>
            </div>
            <h3 className="text-2xl font-semibold text-white">Approval control</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Approve one-day late login access for a selected employee and keep the record audit-ready.
            </p>

            <label className="mt-6 block">
              <span className="mb-2 block text-[13px] font-semibold text-slate-200">Select employee</span>
              <div className="relative" ref={employeePickerRef}>
                <button
                  type="button"
                  onClick={() => setEmployeePickerOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/12 bg-white/12 px-4 py-3 text-left text-[15px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition-all hover:bg-white/16 focus:border-white/25 focus:bg-white/16 focus:ring-2 focus:ring-white/10"
                >
                  <span className="truncate pr-4">{selectedEmployeeLabel}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-300 transition-transform ${employeePickerOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {employeePickerOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                    <div className="max-h-64 overflow-y-auto py-2">
                      {employeeOptions.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">No employees found</div>
                      ) : (
                        employeeOptions.map((employee) => {
                          const isSelected = employee.empId === selectedEmployeeEmpId;
                          return (
                            <button
                              key={employee.empId}
                              type="button"
                              onClick={() => {
                                setSelectedEmployeeEmpId(employee.empId);
                                setEmployeePickerOpen(false);
                              }}
                              className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                                isSelected
                                  ? 'bg-rose-50 text-slate-900'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate pr-4">{employee.empName} ({employee.empId})</span>
                              {isSelected && <span className="text-xs font-semibold text-brand-red">Selected</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </label>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Late status</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {selectedEmployeeLateLogin?.isLateLogin ? (
                  <span className="rounded-full bg-amber-400/12 px-3 py-1 text-[11px] font-semibold text-amber-100">
                    Late Login
                  </span>
                ) : null}
                {selectedEmployeeLateLogin?.hasApproval ? (
                  <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-[11px] font-semibold text-emerald-100">
                    Approved Late Login
                  </span>
                ) : null}
                {selectedEmployeeLateLogin?.latestOutcome === 'REQUESTED' ? (
                  <span className="rounded-full bg-sky-500/12 px-3 py-1 text-[11px] font-semibold text-sky-100">
                    Approval Requested
                  </span>
                ) : null}
                {!selectedEmployeeLateLogin?.hasApproval && selectedEmployeeLateLogin?.latestRejectedAt ? (
                  <span className="rounded-full bg-rose-500/12 px-3 py-1 text-[11px] font-semibold text-rose-100">
                    Rejected late login
                  </span>
                ) : null}
                {!selectedEmployeeLateLogin?.hasApproval && !selectedEmployeeLateLogin?.latestRejectedAt ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                    No approval used
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p>
                  Approval status: {selectedEmployeeLateLogin?.hasApproval
                    ? 'Active for today'
                    : selectedEmployeeLateLogin?.latestOutcome === 'REQUESTED'
                      ? 'Awaiting manager review'
                      : 'Not approved'}
                </p>
                {selectedEmployeeLateLogin?.approval?.approvedAt ? (
                  <p>Approved at: {formatLateLoginDateTime(selectedEmployeeLateLogin.approval.approvedAt)}</p>
                ) : null}
                {selectedEmployeeLateLogin?.latestRejectedAt ? (
                  <p>Last rejected attempt: {formatLateLoginDateTime(selectedEmployeeLateLogin.latestRejectedAt)}</p>
                ) : null}
                {selectedEmployeeLateLogin?.approval?.reason ? (
                  <p className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-slate-200">
                    {selectedEmployeeLateLogin.approval.reason}
                  </p>
                ) : null}
              </div>

              {lateLoginActionMessage ? (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-200">
                  {lateLoginActionMessage}
                </p>
              ) : null}

              {canManageLateLogins && !selectedEmployeeLateLogin?.hasApproval ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLateLoginModalOpen(true)}
                    disabled={lateLoginApprovalLoading || !selectedEmployeeEmpId}
                    className={`inline-flex min-w-0 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                      lateLoginApprovalLoading || !selectedEmployeeEmpId
                        ? 'cursor-not-allowed bg-white/10 text-slate-400'
                        : 'bg-white text-slate-950 hover:bg-slate-100'
                    }`}
                  >
                    {selectedEmployeeLateLogin?.hasApproval ? 'Late login already approved' : 'Allow Late Login'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedEmployeeEmpId) return;
                      void handleRejectLateLoginRecord(selectedEmployeeEmpId);
                    }}
                    disabled={
                      lateLoginRejectLoading
                      || !selectedEmployeeEmpId
                      || !!selectedEmployeeLateLogin?.hasApproval
                      || selectedEmployeeLateLogin?.latestOutcome !== 'REQUESTED'
                    }
                    className={`inline-flex min-w-0 items-center justify-center whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                      lateLoginRejectLoading
                      || !selectedEmployeeEmpId
                      || !!selectedEmployeeLateLogin?.hasApproval
                      || selectedEmployeeLateLogin?.latestOutcome !== 'REQUESTED'
                        ? 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'
                        : 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    {lateLoginRejectLoading ? 'Rejecting...' : 'Reject Request'}
                  </button>
                </div>
              ) : canManageLateLogins ? null : (
                <p className="mt-4 text-sm text-slate-400">
                  You do not have permission to approve late login access.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-1.5 w-8 rounded-full bg-brand-red" />
                  <span className="text-[15px] text-slate-500">Late login audit</span>
                </div>
                <h3 className="text-2xl font-semibold text-slate-950">Today late login records</h3>
                <p className="mt-2 text-[15px] text-slate-500">
                  View approved and rejected late login activity for the current day in one place.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                  {[
                    { value: 'ALL', label: 'All late logins' },
                    { value: 'APPROVED', label: 'Approved late logins' },
                    { value: 'REJECTED', label: 'Rejected late logins' },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setLateLoginFilter(filter.value as 'ALL' | 'APPROVED' | 'REJECTED')}
                      className={`rounded-full px-3 py-2 text-[11px] font-semibold transition-colors md:text-[12px] ${
                        lateLoginFilter === filter.value
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onRefreshLateActivity}
                  disabled={teamAttendanceSummaryLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={14} className={teamAttendanceSummaryLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {teamAttendanceSummaryLoading ? (
              <div className="max-h-[28.5rem] divide-y divide-slate-100 overflow-y-auto px-6 py-3 md:px-8">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`late-history-skeleton-${index}`} className="grid gap-4 py-4 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
                    <div>
                      <div className="h-4 w-48 rounded bg-slate-100" />
                      <div className="mt-3 h-3 w-32 rounded bg-slate-100" />
                    </div>
                    <div>
                      <div className="h-3 w-24 rounded bg-slate-100" />
                      <div className="mt-3 h-4 w-28 rounded bg-slate-100" />
                    </div>
                    <div>
                      <div className="ml-auto h-6 w-28 rounded-full bg-slate-100" />
                      <div className="ml-auto mt-3 h-3 w-24 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredLateLoginRecords.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400 md:px-8">
                No late login records match the current filter.
              </div>
            ) : (
              <div className="max-h-[28.5rem] divide-y divide-slate-100 overflow-y-auto">
                {filteredLateLoginRecords.map((record) => renderLateLoginRow(record))}
              </div>
            )}
          </div>
        </div>
      </div>

      {lateLoginModalOpen && selectedEmployee ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Late login approval
                </p>
                <h4 className="mt-2 text-xl font-semibold text-slate-950">
                  Allow late login for {selectedEmployee.empName}
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  This approval applies to today only and allows the employee to log in after 1:05 PM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLateLoginModalOpen(false);
                  setLateLoginReason('');
                }}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">
                {selectedEmployee.empName} ({selectedEmployee.empId})
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {[selectedEmployee.designation || selectedEmployee.role, selectedEmployee.department].filter(Boolean).join(' • ')}
              </p>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-[13px] font-semibold text-slate-700">
                Approval note (optional)
              </span>
              <textarea
                value={lateLoginReason}
                onChange={(event) => setLateLoginReason(event.target.value)}
                rows={4}
                placeholder="Add context for this late login approval."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/10"
              />
            </label>

            {lateLoginActionMessage ? (
              <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {lateLoginActionMessage}
              </p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setLateLoginModalOpen(false);
                  setLateLoginReason('');
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleConfirmLateLoginApproval();
                }}
                disabled={lateLoginApprovalLoading}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  lateLoginApprovalLoading
                    ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {lateLoginApprovalLoading ? 'Approving...' : 'Allow Late Login'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default LateAttendanceSection;
