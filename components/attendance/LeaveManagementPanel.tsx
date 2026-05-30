import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { getSocket } from '../../realtime/socket';
import {
  LeaveAdminActivityItem,
  LeaveBalanceOverviewResponse,
  LeaveLopEvaluation,
  LeaveLopSummary,
  LeavePolicyConfig,
  LeaveRequest,
  LopPolicyConfig,
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
import LeaveAdminPolicySection from './LeaveAdminPolicySection';
import LeaveLopPolicySection from './LeaveLopPolicySection';
import LeaveEmployeeLopSection from './LeaveEmployeeLopSection';
import {
  createLeaveAdjustment as createLeaveAdjustmentApi,
  downloadLeaveReport,
  fetchLeaveActivity,
  fetchLeaveBalanceOverview,
  fetchLeavePolicies,
  saveLeavePolicy,
} from './leaveBalanceApi';
import {
  applyLeaveLopAction,
  fetchLopPolicy,
  fetchMyLopSummary,
  previewLeaveLop,
  saveLopPolicy,
} from './lopPolicyApi';
import { LOP_HISTORY_FILTER_OPTIONS, LopHistoryFilter, matchesLopHistoryFilter } from './lopUtils';
import FilterDropdown from './FilterDropdown';
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
import type { AttendanceEmployeeOption } from './attendanceViewUtils';

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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [lopHistoryFilter, setLopHistoryFilter] = useState<LopHistoryFilter>('ALL');
  const [lopHistoryFilterOpen, setLopHistoryFilterOpen] = useState(false);
  const lopHistoryFilterRef = useRef<HTMLDivElement | null>(null);
  const [lopPolicy, setLopPolicy] = useState<LopPolicyConfig | null>(null);
  const [lopPolicySaving, setLopPolicySaving] = useState(false);
  const [lopSummary, setLopSummary] = useState<LeaveLopSummary | null>(null);
  const [lopSummaryLoading, setLopSummaryLoading] = useState(false);
  const [lopPreviewLoading, setLopPreviewLoading] = useState(false);
  const [lopEvaluation, setLopEvaluation] = useState<LeaveLopEvaluation | null>(null);
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
  const currentMonthValue = useMemo(() => getMonthInputValue(new Date()), []);
  const [overviewPeriod, setOverviewPeriod] = useState<'month' | 'year'>('month');
  const [overviewMonth, setOverviewMonth] = useState(currentMonthValue);
  const [overviewYear, setOverviewYear] = useState(new Date().getFullYear());
  const [overviewEmployeeEmpId, setOverviewEmployeeEmpId] = useState(currentEmployeeId || '');
  const [overviewData, setOverviewData] = useState<LeaveBalanceOverviewResponse | null>(currentOverview);
  const [overviewLoading, setOverviewLoading] = useState(currentOverviewLoading);
  const [policyItems, setPolicyItems] = useState<LeavePolicyConfig[]>([]);
  const [activityItems, setActivityItems] = useState<LeaveAdminActivityItem[]>([]);
  const [policySaving, setPolicySaving] = useState(false);
  const [adjustmentSaving, setAdjustmentSaving] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const latestOverviewRequestRef = useRef(0);
  const overviewCacheRef = useRef(new Map<string, LeaveBalanceOverviewResponse>());
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
      if (!matchesLopHistoryFilter(leave, lopHistoryFilter)) return false;
      if (historyMonthFilter && !leaveMatchesMonth(leave, historyMonthFilter)) return false;
      if (!selectedEmployeeId && !selectedEmployeeLabel) return true;

      const leaveEmpId = String(leave.empId || '').trim();
      if (selectedEmployeeId) {
        return leaveEmpId === selectedEmployeeId;
      }

      return getEmployeeRecordLabel(leave).toLowerCase() === selectedEmployeeLabel;
    });
  }, [baseLeaves, historyEmployeeFilter, historyMonthFilter, lopHistoryFilter, statusFilter]);

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
      lop: adminOverviewLeaves.filter((leave) =>
        matchesLopHistoryFilter(leave, 'LOP_LEAVES'),
      ).length,
    }),
    [adminOverviewLeaves],
  );

  const lopHistoryFilterLabel =
    LOP_HISTORY_FILTER_OPTIONS.find((option) => option.value === lopHistoryFilter)?.label ||
    'All leaves';

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
    if (viewerRole === 'employee') {
      setOverviewEmployeeEmpId(currentEmployeeId || '');
      return;
    }

    setOverviewEmployeeEmpId((current) => {
      if (current && employeeOptions.some((employee) => employee.empId === current)) {
        return current;
      }
      return employeeOptions[0]?.empId || currentEmployeeId || '';
    });
  }, [currentEmployeeId, employeeOptions, viewerRole]);

  useEffect(() => {
    if (!currentOverview) return;
    if (viewerRole === 'employee' || (currentEmployeeId && overviewEmployeeEmpId === currentEmployeeId)) {
      setOverviewData(currentOverview);
    }
  }, [currentEmployeeId, currentOverview, overviewEmployeeEmpId, viewerRole]);

  useEffect(() => {
    setOverviewLoading(currentOverviewLoading);
  }, [currentOverviewLoading]);

  const loadOverview = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const requestId = latestOverviewRequestRef.current + 1;
    latestOverviewRequestRef.current = requestId;

    const targetEmployeeEmpId =
      viewerRole === 'employee'
        ? currentEmployeeId
        : overviewEmployeeEmpId || currentEmployeeId || employeeOptions[0]?.empId;
    const overviewCacheKey = [
      targetEmployeeEmpId || '',
      overviewPeriod,
      overviewMonth.slice(5, 7),
      overviewYear,
    ].join(':');
    const cachedOverview = overviewCacheRef.current.get(overviewCacheKey);

    if (!silent) {
      if (cachedOverview) {
        setOverviewData(cachedOverview);
        setOverviewLoading(false);
      } else {
        setOverviewLoading(true);
      }
    }

    try {
      const data = await fetchLeaveBalanceOverview({
        employeeEmpId: targetEmployeeEmpId,
        period: overviewPeriod,
        month: overviewMonth.slice(5, 7),
        year: overviewYear,
      });
      overviewCacheRef.current.set(overviewCacheKey, data);
      if (latestOverviewRequestRef.current === requestId) {
        setOverviewData(data);
      }
    } catch (error) {
      console.error('Failed to load leave overview section', error);
      if (!silent && latestOverviewRequestRef.current === requestId) {
        setOverviewData(null);
      }
    } finally {
      if (latestOverviewRequestRef.current === requestId) {
        setOverviewLoading(false);
      }
    }
  }, [currentEmployeeId, employeeOptions, overviewEmployeeEmpId, overviewMonth, overviewPeriod, overviewYear, viewerRole]);

  const loadAdminMeta = useCallback(async () => {
    if (!isApproverPortal) {
      setPolicyItems([]);
      setActivityItems([]);
      return;
    }

    try {
      const [policies, activity, lopPolicyData] = await Promise.all([
        fetchLeavePolicies(),
        fetchLeaveActivity(8),
        fetchLopPolicy().catch(() => null),
      ]);
      setPolicyItems(policies);
      setActivityItems(activity);
      if (lopPolicyData) setLopPolicy(lopPolicyData);
    } catch (error) {
      console.error('Failed to load leave admin metadata', error);
      setPolicyItems([]);
      setActivityItems([]);
    }
  }, [isApproverPortal]);

  const loadLopSummary = useCallback(async () => {
    if (viewerRole !== 'employee') {
      setLopSummary(null);
      return;
    }
    setLopSummaryLoading(true);
    try {
      const summary = await fetchMyLopSummary(new Date().getFullYear());
      setLopSummary(summary);
    } catch (error) {
      console.error('Failed to load LOP summary', error);
      setLopSummary(null);
    } finally {
      setLopSummaryLoading(false);
    }
  }, [viewerRole]);

  useEffect(() => {
    if (!canApplyLeave || !leaveStart || !leaveEnd || hasInvalidRange) {
      setLopEvaluation(null);
      return undefined;
    }

    let mounted = true;
    const timer = window.setTimeout(async () => {
      setLopPreviewLoading(true);
      try {
        const preview = await previewLeaveLop({
          startDate: leaveStart,
          endDate: leaveEnd,
          type: leaveType,
        });
        if (mounted) setLopEvaluation(preview.evaluation);
      } catch {
        if (mounted) setLopEvaluation(null);
      } finally {
        if (mounted) setLopPreviewLoading(false);
      }
    }, 350);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [canApplyLeave, hasInvalidRange, leaveEnd, leaveStart, leaveType]);

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
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadAdminMeta();
  }, [loadAdminMeta]);

  useEffect(() => {
    void loadLopSummary();
  }, [loadLopSummary, myLeaves.length]);

  useEffect(() => {
    if (!baseLeaves.length && !currentOverview && viewerRole !== 'employee') return;
    void loadOverview({ silent: true });
  }, [approverLeaves, baseLeaves.length, currentOverview, loadOverview, myLeaves, pendingLeaves, viewerRole]);

  useEffect(() => {
    const socket = getSocket();
    const handleLeaveLiveRefresh = () => {
      void loadOverview({ silent: true });
      if (isApproverPortal) {
        void loadAdminMeta();
      }
    };

    socket.on('leave:created', handleLeaveLiveRefresh);
    socket.on('leave:updated', handleLeaveLiveRefresh);
    socket.on('leave:balance_changed', handleLeaveLiveRefresh);
    socket.on('leave:policy_changed', handleLeaveLiveRefresh);

    return () => {
      socket.off('leave:created', handleLeaveLiveRefresh);
      socket.off('leave:updated', handleLeaveLiveRefresh);
      socket.off('leave:balance_changed', handleLeaveLiveRefresh);
      socket.off('leave:policy_changed', handleLeaveLiveRefresh);
    };
  }, [isApproverPortal, loadAdminMeta, loadOverview]);

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

  const handleSaveLopPolicy = async (payload: Record<string, unknown>) => {
    setLopPolicySaving(true);
    try {
      const saved = await saveLopPolicy(payload);
      setLopPolicy(saved);
      setToast({ tone: 'success', message: 'LOP policy saved' });
    } catch (error) {
      setToast({
        tone: 'info',
        message: error instanceof Error ? error.message : 'Failed to save LOP policy',
      });
    } finally {
      setLopPolicySaving(false);
    }
  };

  const handleLeaveLopAction = async (leaveId: string, action: string, reason?: string) => {
    if (onLeaveLopAction) {
      await onLeaveLopAction(leaveId, action, reason);
      setToast({ tone: 'success', message: 'LOP action applied' });
      return;
    }
    await applyLeaveLopAction(leaveId, action, reason);
    setToast({ tone: 'success', message: 'LOP action applied' });
  };

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
    onChangeType(leave.type || 'CASUAL');
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

  const handleSavePolicy = async (payload: Record<string, unknown>) => {
    setPolicySaving(true);
    try {
      await saveLeavePolicy(payload);
      await loadAdminMeta();
      await loadOverview({ silent: true });
      setToast({ tone: 'success', message: 'Leave policy saved successfully' });
    } catch (error) {
      console.error('Failed to save leave policy', error);
      setToast({ tone: 'info', message: error instanceof Error ? error.message : 'Unable to save leave policy' });
    } finally {
      setPolicySaving(false);
    }
  };

  const handleCreateAdjustment = async (payload: Record<string, unknown>) => {
    setAdjustmentSaving(true);
    try {
      await createLeaveAdjustmentApi(payload);
      await Promise.all([
        loadOverview({ silent: true }),
        loadAdminMeta(),
      ]);
      setToast({ tone: 'success', message: 'Leave balance adjusted successfully' });
    } catch (error) {
      console.error('Failed to adjust leave balance', error);
      setToast({ tone: 'info', message: error instanceof Error ? error.message : 'Unable to adjust leave balance' });
    } finally {
      setAdjustmentSaving(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const report = await downloadLeaveReport({
        employeeEmpId:
          viewerRole === 'employee'
            ? currentEmployeeId
            : overviewEmployeeEmpId || currentEmployeeId || employeeOptions[0]?.empId,
        period: overviewPeriod,
        month: overviewMonth.slice(5, 7),
        year: overviewYear,
      });
      const url = window.URL.createObjectURL(report.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = report.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setToast({ tone: 'success', message: 'Leave report exported' });
    } catch (error) {
      console.error('Failed to export leave report', error);
      setToast({ tone: 'info', message: error instanceof Error ? error.message : 'Unable to export leave report' });
    } finally {
      setExportLoading(false);
    }
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

      {showWorkspaceSection && viewerRole === 'team_lead' ? (
        <PendingApprovalsPanel
          pendingLeaves={pendingLeaves}
          onLeaveAction={onLeaveAction}
          onLeaveLopAction={handleLeaveLopAction}
          showLopActions={isApproverPortal}
          formatApprovalDate={formatApprovalDate}
          calculateLeaveDays={calculateLeaveDays}
          sectionClassName="w-full max-w-[720px] rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
          gridClassName="mt-5 grid gap-4"
        />
      ) : null}

      {showInsightsSection ? (
        <LeaveBalanceOverviewSection
          overview={overviewData}
          loading={overviewLoading}
          viewerRole={viewerRole}
          employeeOptions={employeeOptions}
          selectedEmployeeEmpId={overviewEmployeeEmpId}
          selectedPeriod={overviewPeriod}
          selectedMonth={overviewMonth.slice(5, 7)}
          selectedYear={overviewYear}
          exportLoading={exportLoading}
          onEmployeeChange={setOverviewEmployeeEmpId}
          onPeriodChange={setOverviewPeriod}
          onMonthChange={(value) => setOverviewMonth(`${overviewYear}-${value}`)}
          onYearChange={(value) => {
            setOverviewYear(value);
            setOverviewMonth(`${value}-${overviewMonth.slice(5, 7) || '01'}`);
          }}
          onExport={() => {
            void handleExport();
          }}
          onRefresh={() => {
            void loadOverview();
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
                  activePopup={activePopup}
                  setActivePopup={setActivePopup}
                  startFieldRef={startFieldRef}
                  endFieldRef={endFieldRef}
                  reasonFieldRef={reasonFieldRef}
                  typeFieldRef={typeFieldRef}
                  hasInvalidRange={hasInvalidRange}
                  calculatedDays={calculatedDays}
                  selectedLeaveTypeOption={selectedLeaveTypeOption}
                  onSubmitLeave={handleSubmitLeave}
                  lopPreviewLoading={lopPreviewLoading}
                  lopEvaluation={lopEvaluation}
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
                onLeaveLopAction={handleLeaveLopAction}
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
                onVisibleMonthChange={viewerRole === 'employee' ? setHistoryMonthFilter : undefined}
              />
            </div>
          ) : null}
        </div>

        {viewerRole === 'employee' ? (
          <LeaveEmployeeLopSection summary={lopSummary} loading={lopSummaryLoading} />
        ) : null}

        {isApproverPortal ? (
          <div className="rounded-[26px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              LOP filters
            </span>
            <FilterDropdown
              value={lopHistoryFilter}
              selectedLabel={lopHistoryFilterLabel}
              options={LOP_HISTORY_FILTER_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              open={lopHistoryFilterOpen}
              onToggle={() => setLopHistoryFilterOpen((prev) => !prev)}
              onSelect={(value) => {
                setLopHistoryFilter(value as LopHistoryFilter);
                setLopHistoryFilterOpen(false);
              }}
              containerRef={lopHistoryFilterRef}
            />
          </div>
        ) : null}

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
      </>
      ) : null}

      {showPolicySection ? (
        <>
          <LeaveLopPolicySection
            canManage={canManagePolicy}
            policy={lopPolicy}
            employeeOptions={employeeOptions}
            saving={lopPolicySaving}
            onSave={handleSaveLopPolicy}
          />
          <LeaveAdminPolicySection
            viewerRole={viewerRole}
            canManagePolicy={canManagePolicy}
            policies={policyItems}
            activity={activityItems}
            employeeOptions={employeeOptions}
            savingPolicy={policySaving}
            savingAdjustment={adjustmentSaving}
            exportLoading={exportLoading}
            onSavePolicy={handleSavePolicy}
            onCreateAdjustment={handleCreateAdjustment}
            onExport={handleExport}
          />
        </>
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
