import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { LeaveRequest } from './attendanceUtils';
import { Skeleton, SkeletonBlock } from '../ui/Skeleton';
import LeaveCalendarView from './LeaveCalendarView';
import PendingApprovalsPanel from './PendingApprovalsPanel';
import LeaveDetailModal from './LeaveDetailModal';
import LeaveApplyForLeaveForm from './LeaveApplyForLeaveForm';
import LeaveAdminLeaveOperationsSection from './LeaveAdminLeaveOperationsSection';
import LeaveHistoryRecordsSection from './LeaveHistoryRecordsSection';
import {
  REASON_SUGGESTIONS,
  LEAVE_TYPE_OPTIONS,
  ActivePopup,
  calculateLeaveDays,
  formatApprovalDate,
  getEmployeeIdFromLabel,
  getEmployeeNameFromLabel,
  getEmployeeRecordLabel,
  leaveDetailStatusThemes,
  leaveMatchesMonth,
  shiftMonthValue,
  formatDecisionRole,
  getMonthInputValue,
  normalizeDate,
} from './leaveManagementPanelUtils';
import type { FilterDropdownOption } from './FilterDropdown';

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
  canApplyLeave: boolean;
  approverLeaves: LeaveRequest[];
  isAdmin: boolean;
  isApproverPortal: boolean;
  viewerRole: 'employee' | 'team_lead' | 'admin';
  currentEmployeeId?: string;
  employeeDirectory?: string[];
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
  canApplyLeave,
  approverLeaves,
  isAdmin,
  isApproverPortal,
  viewerRole,
  currentEmployeeId,
  employeeDirectory = [],
  loading = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [historyEmployeeFilter, setHistoryEmployeeFilter] = useState('');
  const [historyMonthFilter, setHistoryMonthFilter] = useState('');
  const [historyStatusPickerOpen, setHistoryStatusPickerOpen] = useState(false);
  const [historyEmployeePickerOpen, setHistoryEmployeePickerOpen] = useState(false);
  const [historyMonthPickerOpen, setHistoryMonthPickerOpen] = useState(false);
  const [adminEmployeeFilter, setAdminEmployeeFilter] = useState('');
  const [adminMonthFilter, setAdminMonthFilter] = useState('');
  const [adminDirectoryEmployees, setAdminDirectoryEmployees] = useState<string[]>([]);
  const [adminEmployeePickerOpen, setAdminEmployeePickerOpen] = useState(false);
  const [adminMonthPickerOpen, setAdminMonthPickerOpen] = useState(false);
  const [activePopup, setActivePopup] = useState<ActivePopup>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'info'; message: string } | null>(null);
  const [selectedDetailLeave, setSelectedDetailLeave] = useState<LeaveRequest | null>(null);
  const startFieldRef = useRef<HTMLDivElement | null>(null);
  const endFieldRef = useRef<HTMLDivElement | null>(null);
  const reasonFieldRef = useRef<HTMLDivElement | null>(null);
  const typeFieldRef = useRef<HTMLDivElement | null>(null);
  const historyStatusPickerRef = useRef<HTMLDivElement | null>(null);
  const historyEmployeePickerRef = useRef<HTMLDivElement | null>(null);
  const historyMonthPickerRef = useRef<HTMLDivElement | null>(null);
  const adminEmployeePickerRef = useRef<HTMLDivElement | null>(null);
  const adminMonthPickerRef = useRef<HTMLDivElement | null>(null);

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
  const { total: calculatedDays, invalid: hasInvalidRange } = useMemo(
    () => calculateLeaveDays(leaveStart, leaveEnd, true, { type: leaveType }),
    [leaveEnd, leaveStart, leaveType],
  );

  const filteredSuggestions = useMemo(() => {
    const query = leaveReason.trim().toLowerCase();
    if (!query) return REASON_SUGGESTIONS;
    return REASON_SUGGESTIONS.filter((suggestion) => suggestion.toLowerCase().includes(query));
  }, [leaveReason]);
  const selectedLeaveTypeOption = useMemo(
    () => LEAVE_TYPE_OPTIONS.find((option) => option.value === leaveType) || LEAVE_TYPE_OPTIONS[0],
    [leaveType],
  );
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

  const filteredLeaves = useMemo(() => {
    const selectedEmployeeId = getEmployeeIdFromLabel(historyEmployeeFilter);
    const selectedEmployeeLabel = historyEmployeeFilter.trim().toLowerCase();

    return baseLeaves.filter((leave) => {
      if (statusFilter !== 'ALL' && leave.status !== statusFilter) return false;
      if (historyMonthFilter && !leaveMatchesMonth(leave, historyMonthFilter)) return false;
      if (!selectedEmployeeId && !selectedEmployeeLabel) return true;

      const leaveEmpId = String(leave.empId || '').trim();
      if (selectedEmployeeId) {
        return leaveEmpId === selectedEmployeeId;
      }

      return getEmployeeRecordLabel(leave).toLowerCase() === selectedEmployeeLabel;
    });
  }, [baseLeaves, historyEmployeeFilter, historyMonthFilter, statusFilter]);

  const adminOverviewLeaves = useMemo(() => {
    const selectedEmployeeId = getEmployeeIdFromLabel(adminEmployeeFilter);
    const selectedEmployeeLabel = adminEmployeeFilter.trim().toLowerCase();

    return baseLeaves.filter((leave) => {
      if (viewerRole !== 'admin') return true;
      if (adminMonthFilter && !leaveMatchesMonth(leave, adminMonthFilter)) return false;
      if (!selectedEmployeeId && !selectedEmployeeLabel) return true;

      const leaveEmpId = String(leave.empId || '').trim();
      if (selectedEmployeeId) {
        return leaveEmpId === selectedEmployeeId;
      }

      return getEmployeeRecordLabel(leave).toLowerCase() === selectedEmployeeLabel;
    });
  }, [adminEmployeeFilter, adminMonthFilter, baseLeaves, viewerRole]);

  const leaveStats = useMemo(
    () => ({
      total: adminOverviewLeaves.length,
      approved: adminOverviewLeaves.filter((leave) => leave.status === 'APPROVED').length,
      pending: adminOverviewLeaves.filter((leave) => leave.status === 'PENDING').length,
      rejected: adminOverviewLeaves.filter((leave) => leave.status === 'REJECTED').length,
    }),
    [adminOverviewLeaves],
  );

  const adminEmployeeOptions = useMemo(() => {
    const uniqueEmployees = new Map<string, string>();

    employeeDirectory.forEach((employeeLabel) => {
      if (employeeLabel) {
        uniqueEmployees.set(employeeLabel.toLowerCase(), employeeLabel);
      }
    });

    adminDirectoryEmployees.forEach((employeeLabel) => {
      if (employeeLabel) {
        uniqueEmployees.set(employeeLabel.toLowerCase(), employeeLabel);
      }
    });

    baseLeaves.forEach((leave) => {
      const label = getEmployeeRecordLabel(leave);
      if (label) {
        uniqueEmployees.set(label.toLowerCase(), label);
      }
    });

    return Array.from(uniqueEmployees.values()).sort((a, b) => a.localeCompare(b));
  }, [adminDirectoryEmployees, baseLeaves, employeeDirectory]);

  const adminMonthOptions = useMemo(() => {
    const uniqueMonths = new Set<string>();

    baseLeaves.forEach((leave) => {
      const startDate = normalizeDate(leave.startDate);
      const endDate = normalizeDate(leave.endDate);
      if (!startDate || !endDate) return;

      const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

      while (cursor <= lastMonth) {
        uniqueMonths.add(getMonthInputValue(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      }
    });

    for (let offset = 0; offset < 12; offset += 1) {
      uniqueMonths.add(shiftMonthValue(getMonthInputValue(new Date()), -offset));
    }

    const months = Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a));
    if (adminMonthFilter && !months.includes(adminMonthFilter)) {
      months.unshift(adminMonthFilter);
    }
    return months;
  }, [adminMonthFilter, baseLeaves]);

  const historyEmployeeOptions = useMemo(() => {
    const uniqueEmployees = new Map<string, string>();

    adminEmployeeOptions.forEach((employeeLabel) => {
      uniqueEmployees.set(employeeLabel.toLowerCase(), employeeLabel);
    });

    baseLeaves.forEach((leave) => {
      const label = getEmployeeRecordLabel(leave);
      if (label) {
        uniqueEmployees.set(label.toLowerCase(), label);
      }
    });

    return Array.from(uniqueEmployees.values())
      .filter((label) => !(viewerRole === 'team_lead' && /^Emp ID:/i.test(label.trim())))
      .sort((a, b) => a.localeCompare(b));
  }, [adminEmployeeOptions, baseLeaves, viewerRole]);

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

  const formatHistoryEmployeeOptionLabel = (label: string) => {
    if (viewerRole !== 'team_lead') return label;
    const name = getEmployeeNameFromLabel(label);
    if (!name) return label;

    const optionEmpId = getEmployeeIdFromLabel(label);
    const isCurrentUser =
      (optionEmpId && optionEmpId === currentEmployeeId) ||
      (!!currentEmployeeName && name.toLowerCase() === currentEmployeeName.toLowerCase());

    return isCurrentUser ? `${name} (you)` : name;
  };

  const historyMonthOptions = useMemo(() => {
    const uniqueMonths = new Set<string>();

    baseLeaves.forEach((leave) => {
      const startDate = normalizeDate(leave.startDate);
      const endDate = normalizeDate(leave.endDate);
      if (!startDate || !endDate) return;

      const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

      while (cursor <= lastMonth) {
        uniqueMonths.add(getMonthInputValue(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      }
    });

    for (let offset = 0; offset < 12; offset += 1) {
      uniqueMonths.add(shiftMonthValue(getMonthInputValue(new Date()), -offset));
    }

    return Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a));
  }, [baseLeaves]);

  const historyStatusOptions: FilterDropdownOption[] = [
    { value: 'ALL', label: 'All statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];
  const showHistoryEmployeeFilter = viewerRole !== 'employee';
  const getDecisionLabel = (leave: LeaveRequest) => {
    if (viewerRole !== 'employee' || leave.status === 'PENDING') return '';
    const roleLabel = formatDecisionRole(leave.decidedByRole);
    if (!roleLabel) return '';
    return `${leave.status === 'APPROVED' ? 'Approved' : 'Rejected'} by ${roleLabel}`;
  };
  const historyStatusLabel = historyStatusOptions.find((option) => option.value === statusFilter)?.label || 'All statuses';
  const historyEmployeeLabel = historyEmployeeFilter
    ? formatHistoryEmployeeOptionLabel(historyEmployeeFilter)
    : 'All employees';
  const historyMonthLabel = historyMonthFilter
    ? new Date(`${historyMonthFilter}-01T00:00:00`).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'All months';

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

  useEffect(() => {
    if (viewerRole === 'employee' && historyEmployeeFilter) {
      setHistoryEmployeeFilter('');
      setHistoryEmployeePickerOpen(false);
    }
  }, [historyEmployeeFilter, viewerRole]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (viewerRole !== 'admin' || employeeDirectory.length > 0) return undefined;

    let mounted = true;

    const loadAdminDirectoryEmployees = async () => {
      try {
        const res = await fetch(`${API_BASE}/employees`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!mounted) return;

        const employees = (Array.isArray(data) ? data : [])
          .filter((employee: any) => String(employee?.status || '').toLowerCase() !== 'inactive')
          .filter((employee: any) => ['EMPLOYEE', 'TEAM_LEAD'].includes(String(employee?.role || '').toUpperCase()))
          .map((employee: any) => {
            const empId = String(employee?.empId || '').trim();
            const empName = String(employee?.empName || employee?.name || '').trim();
            if (empName && empId) return `${empName} (${empId})`;
            return empName || empId;
          })
          .filter(Boolean);

        setAdminDirectoryEmployees(employees);
      } catch (error) {
        console.error('Failed to load employees for leave filter', error);
      }
    };

    loadAdminDirectoryEmployees();

    return () => {
      mounted = false;
    };
  }, [employeeDirectory.length, viewerRole]);

  useEffect(() => {
    if (
      !adminEmployeePickerOpen &&
      !adminMonthPickerOpen &&
      !historyStatusPickerOpen &&
      !historyEmployeePickerOpen &&
      !historyMonthPickerOpen
    ) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (adminEmployeePickerRef.current && !adminEmployeePickerRef.current.contains(target)) {
        setAdminEmployeePickerOpen(false);
      }

      if (adminMonthPickerRef.current && !adminMonthPickerRef.current.contains(target)) {
        setAdminMonthPickerOpen(false);
      }

      if (historyStatusPickerRef.current && !historyStatusPickerRef.current.contains(target)) {
        setHistoryStatusPickerOpen(false);
      }

      if (historyEmployeePickerRef.current && !historyEmployeePickerRef.current.contains(target)) {
        setHistoryEmployeePickerOpen(false);
      }

      if (historyMonthPickerRef.current && !historyMonthPickerRef.current.contains(target)) {
        setHistoryMonthPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAdminEmployeePickerOpen(false);
        setAdminMonthPickerOpen(false);
        setHistoryStatusPickerOpen(false);
        setHistoryEmployeePickerOpen(false);
        setHistoryMonthPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [
    adminEmployeePickerOpen,
    adminMonthPickerOpen,
    historyStatusPickerOpen,
    historyEmployeePickerOpen,
    historyMonthPickerOpen,
  ]);

  useEffect(() => {
    if (!activePopup) return undefined;

    const getActiveRef = () => {
      if (activePopup === 'start') return startFieldRef.current;
      if (activePopup === 'end') return endFieldRef.current;
      if (activePopup === 'reason') return reasonFieldRef.current;
      if (activePopup === 'type') return typeFieldRef.current;
      return null;
    };

    const handlePointerDown = (event: MouseEvent) => {
      const container = getActiveRef();
      if (container && !container.contains(event.target as Node)) {
        setActivePopup(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePopup(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activePopup]);

  const handleSubmitLeave = async () => {
    if (hasInvalidRange) {
      setToast({ tone: 'info', message: 'Please choose a valid leave date range.' });
      return;
    }

    const success = await onApply();
    if (success) {
      setActivePopup(null);
      setToast({ tone: 'success', message: 'Leave request submitted' });
    }
  };

  const handleEditLeave = (leave: LeaveRequest) => {
    onChangeStart(leave.startDate.slice(0, 10));
    onChangeEnd(leave.endDate.slice(0, 10));
    onChangeReason(leave.reason || '');
    onChangeType(leave.type || 'GENERAL');
    setActivePopup(null);
    setToast({ tone: 'info', message: 'Pending leave loaded into the form for quick editing.' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteLeave = async (leave: LeaveRequest) => {
    const success = await onDeleteLeave(leave);
    setToast({
      tone: success ? 'success' : 'info',
      message: success ? 'Leave request deleted' : 'Unable to delete leave request',
    });
  };

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

      {viewerRole === 'team_lead' ? (
        <PendingApprovalsPanel
          pendingLeaves={pendingLeaves}
          onLeaveAction={onLeaveAction}
          formatApprovalDate={formatApprovalDate}
          calculateLeaveDays={calculateLeaveDays}
          sectionClassName="w-full max-w-[720px] rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
          gridClassName="mt-5 grid gap-4"
        />
      ) : null}

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
                activePopup={activePopup}
                setActivePopup={setActivePopup}
                startFieldRef={startFieldRef}
                endFieldRef={endFieldRef}
                reasonFieldRef={reasonFieldRef}
                typeFieldRef={typeFieldRef}
                hasInvalidRange={hasInvalidRange}
                calculatedDays={calculatedDays}
                filteredSuggestions={filteredSuggestions}
                selectedLeaveTypeOption={selectedLeaveTypeOption}
                onSubmitLeave={handleSubmitLeave}
              />
            )
          ) : (
            <LeaveAdminLeaveOperationsSection
              viewerRole={viewerRole}
              adminEmployeeFilter={adminEmployeeFilter}
              setAdminEmployeeFilter={setAdminEmployeeFilter}
              adminMonthFilter={adminMonthFilter}
              setAdminMonthFilter={setAdminMonthFilter}
              adminEmployeePickerOpen={adminEmployeePickerOpen}
              setAdminEmployeePickerOpen={setAdminEmployeePickerOpen}
              adminMonthPickerOpen={adminMonthPickerOpen}
              setAdminMonthPickerOpen={setAdminMonthPickerOpen}
              adminEmployeePickerRef={adminEmployeePickerRef}
              adminMonthPickerRef={adminMonthPickerRef}
              adminEmployeeOptions={adminEmployeeOptions}
              adminMonthOptions={adminMonthOptions}
              leaveStats={leaveStats}
            />
          )}
        </div>

          {viewerRole === 'admin' ? (
            <PendingApprovalsPanel
              pendingLeaves={pendingLeaves}
              onLeaveAction={onLeaveAction}
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
              onVisibleMonthChange={viewerRole === 'employee' ? setHistoryMonthFilter : undefined}
            />
          </div>
        ) : null}
      </div>

      <LeaveHistoryRecordsSection
        showHistoryEmployeeFilter={showHistoryEmployeeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        historyStatusLabel={historyStatusLabel}
        historyStatusOptions={historyStatusOptions}
        historyStatusPickerOpen={historyStatusPickerOpen}
        setHistoryStatusPickerOpen={setHistoryStatusPickerOpen}
        setHistoryEmployeePickerOpen={setHistoryEmployeePickerOpen}
        setHistoryMonthPickerOpen={setHistoryMonthPickerOpen}
        historyStatusPickerRef={historyStatusPickerRef}
        historyEmployeeFilter={historyEmployeeFilter}
        setHistoryEmployeeFilter={setHistoryEmployeeFilter}
        historyEmployeeLabel={historyEmployeeLabel}
        historyEmployeeOptions={historyEmployeeOptions}
        formatHistoryEmployeeOptionLabel={formatHistoryEmployeeOptionLabel}
        historyEmployeePickerOpen={historyEmployeePickerOpen}
        historyEmployeePickerRef={historyEmployeePickerRef}
        historyMonthFilter={historyMonthFilter}
        setHistoryMonthFilter={setHistoryMonthFilter}
        historyMonthLabel={historyMonthLabel}
        historyMonthOptions={historyMonthOptions}
        historyMonthPickerOpen={historyMonthPickerOpen}
        historyMonthPickerRef={historyMonthPickerRef}
        leaveLoading={leaveLoading}
        filteredLeaves={filteredLeaves}
        isApproverPortal={isApproverPortal}
        viewerRole={viewerRole}
        getDecisionLabel={getDecisionLabel}
        onViewDetails={setSelectedDetailLeave}
        onEditLeave={handleEditLeave}
        onDeleteLeave={handleDeleteLeave}
      />

      {viewerRole === 'employee' ? (
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
