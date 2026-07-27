import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { LeaveRequest } from './attendanceUtils';
import { LOP_HISTORY_FILTER_OPTIONS, LopHistoryFilter, matchesLopHistoryFilter } from './lopUtils';
import {
  formatDecisionRole,
  getEmployeeIdFromLabel,
  getEmployeeNameFromLabel,
  getEmployeeRecordLabel,
  getMonthInputValue,
  leaveMatchesMonth,
  normalizeDate,
  shiftMonthValue,
} from './leaveManagementPanelUtils';
import type { FilterDropdownOption } from './FilterDropdown';

type ViewerRole = 'employee' | 'team_lead' | 'admin';

export function useLeaveAdminOverviewFilters({
  baseLeaves,
  viewerRole,
  employeeDirectory,
}: {
  baseLeaves: LeaveRequest[];
  viewerRole: ViewerRole;
  employeeDirectory: string[];
}) {
  const [adminEmployeeFilter, setAdminEmployeeFilter] = useState('');
  const [adminMonthFilter, setAdminMonthFilter] = useState('');
  const [adminDirectoryEmployees, setAdminDirectoryEmployees] = useState<string[]>([]);
  const [adminEmployeePickerOpen, setAdminEmployeePickerOpen] = useState(false);
  const [adminMonthPickerOpen, setAdminMonthPickerOpen] = useState(false);
  const adminEmployeePickerRef = useRef<HTMLDivElement | null>(null);
  const adminMonthPickerRef = useRef<HTMLDivElement | null>(null);

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

  return {
    adminEmployeeFilter,
    setAdminEmployeeFilter,
    adminMonthFilter,
    setAdminMonthFilter,
    adminDirectoryEmployees,
    adminEmployeePickerOpen,
    setAdminEmployeePickerOpen,
    adminMonthPickerOpen,
    setAdminMonthPickerOpen,
    adminEmployeePickerRef,
    adminMonthPickerRef,
    adminOverviewLeaves,
    leaveStats,
    adminEmployeeOptions,
    adminMonthOptions,
  };
}

export function useLeaveHistoryFilters({
  baseLeaves,
  viewerRole,
  currentEmployeeId,
  currentEmployeeName,
  adminEmployeeOptions,
}: {
  baseLeaves: LeaveRequest[];
  viewerRole: ViewerRole;
  currentEmployeeId?: string;
  currentEmployeeName: string;
  adminEmployeeOptions: string[];
}) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [lopHistoryFilter, setLopHistoryFilter] = useState<LopHistoryFilter>('ALL');
  const [lopHistoryFilterOpen, setLopHistoryFilterOpen] = useState(false);
  const lopHistoryFilterRef = useRef<HTMLDivElement | null>(null);
  const [historyEmployeeFilter, setHistoryEmployeeFilter] = useState('');
  const [historyMonthFilter, setHistoryMonthFilter] = useState('');
  const [historyStatusPickerOpen, setHistoryStatusPickerOpen] = useState(false);
  const [historyEmployeePickerOpen, setHistoryEmployeePickerOpen] = useState(false);
  const [historyMonthPickerOpen, setHistoryMonthPickerOpen] = useState(false);
  const historyStatusPickerRef = useRef<HTMLDivElement | null>(null);
  const historyEmployeePickerRef = useRef<HTMLDivElement | null>(null);
  const historyMonthPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (viewerRole === 'employee' && historyEmployeeFilter) {
      setHistoryEmployeeFilter('');
      setHistoryEmployeePickerOpen(false);
    }
  }, [historyEmployeeFilter, viewerRole]);

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

  const lopHistoryFilterLabel =
    LOP_HISTORY_FILTER_OPTIONS.find((option) => option.value === lopHistoryFilter)?.label ||
    'All leaves';

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

  const formatHistoryEmployeeOptionLabel = useCallback((label: string) => {
    if (viewerRole !== 'team_lead') return label;
    const name = getEmployeeNameFromLabel(label);
    if (!name) return label;

    const optionEmpId = getEmployeeIdFromLabel(label);
    const isCurrentUser =
      (optionEmpId && optionEmpId === currentEmployeeId) ||
      (!!currentEmployeeName && name.toLowerCase() === currentEmployeeName.toLowerCase());

    return isCurrentUser ? `${name} (you)` : name;
  }, [currentEmployeeId, currentEmployeeName, viewerRole]);

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

  const getDecisionLabel = useCallback((leave: LeaveRequest) => {
    if (viewerRole !== 'employee' || leave.status === 'PENDING') return '';
    const roleLabel = formatDecisionRole(leave.decidedByRole);
    if (!roleLabel) return '';
    return `${leave.status === 'APPROVED' ? 'Approved' : 'Rejected'} by ${roleLabel}`;
  }, [viewerRole]);

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

  return {
    statusFilter,
    setStatusFilter,
    lopHistoryFilter,
    setLopHistoryFilter,
    lopHistoryFilterOpen,
    setLopHistoryFilterOpen,
    lopHistoryFilterRef,
    lopHistoryFilterLabel,
    historyEmployeeFilter,
    setHistoryEmployeeFilter,
    historyMonthFilter,
    setHistoryMonthFilter,
    historyStatusPickerOpen,
    setHistoryStatusPickerOpen,
    historyEmployeePickerOpen,
    setHistoryEmployeePickerOpen,
    historyMonthPickerOpen,
    setHistoryMonthPickerOpen,
    historyStatusPickerRef,
    historyEmployeePickerRef,
    historyMonthPickerRef,
    filteredLeaves,
    historyEmployeeOptions,
    formatHistoryEmployeeOptionLabel,
    historyMonthOptions,
    historyStatusOptions,
    showHistoryEmployeeFilter,
    getDecisionLabel,
    historyStatusLabel,
    historyEmployeeLabel,
    historyMonthLabel,
  };
}

export function useCloseLeaveDropdownsOnOutsideClick(pickers: {
  adminEmployeePickerOpen: boolean;
  setAdminEmployeePickerOpen: (value: boolean) => void;
  adminEmployeePickerRef: RefObject<HTMLDivElement>;
  adminMonthPickerOpen: boolean;
  setAdminMonthPickerOpen: (value: boolean) => void;
  adminMonthPickerRef: RefObject<HTMLDivElement>;
  historyStatusPickerOpen: boolean;
  setHistoryStatusPickerOpen: (value: boolean) => void;
  historyStatusPickerRef: RefObject<HTMLDivElement>;
  historyEmployeePickerOpen: boolean;
  setHistoryEmployeePickerOpen: (value: boolean) => void;
  historyEmployeePickerRef: RefObject<HTMLDivElement>;
  historyMonthPickerOpen: boolean;
  setHistoryMonthPickerOpen: (value: boolean) => void;
  historyMonthPickerRef: RefObject<HTMLDivElement>;
}) {
  const {
    adminEmployeePickerOpen,
    setAdminEmployeePickerOpen,
    adminEmployeePickerRef,
    adminMonthPickerOpen,
    setAdminMonthPickerOpen,
    adminMonthPickerRef,
    historyStatusPickerOpen,
    setHistoryStatusPickerOpen,
    historyStatusPickerRef,
    historyEmployeePickerOpen,
    setHistoryEmployeePickerOpen,
    historyEmployeePickerRef,
    historyMonthPickerOpen,
    setHistoryMonthPickerOpen,
    historyMonthPickerRef,
  } = pickers;

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
}
