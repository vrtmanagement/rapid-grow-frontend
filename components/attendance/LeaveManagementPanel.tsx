import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, Info, Sparkles, Wand2 } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { LeaveRequest } from './attendanceUtils';
import { AttendanceLeaveOverviewSkeleton, Skeleton, SkeletonBlock } from '../ui/Skeleton';
import LeaveCalendarView from './LeaveCalendarView';
import LeaveHistoryCard from './LeaveHistoryCard';

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

const REASON_SUGGESTIONS = [
  'Medical leave due to fever',
  'Family function',
  'Personal work',
  'Emergency leave',
  'Travel planned in advance',
];

const LEAVE_TYPE_OPTIONS = [
  {
    value: 'GENERAL',
    label: 'General',
    description: 'Personal work, appointments, or planned time away.',
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
  },
  {
    value: 'SICK',
    label: 'Sick',
    description: 'Health recovery, rest, or medical observation.',
    tone: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  {
    value: 'VACATION',
    label: 'Vacation',
    description: 'Planned holiday or recharge time booked in advance.',
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  {
    value: 'EMERGENCY',
    label: 'Emergency',
    description: 'Urgent personal or family situations that need attention.',
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
  },
] as const;

type ActivePopup = 'start' | 'end' | 'reason' | 'type' | null;

function normalizeDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateLeaveDays(start?: string, end?: string, excludeWeekends = true) {
  const startDate = normalizeDate(start);
  const endDate = normalizeDate(end);

  if (!startDate || !endDate) return { total: 0, invalid: false };
  if (endDate < startDate) return { total: 0, invalid: true };

  const cursor = new Date(startDate);
  let total = 0;

  while (cursor <= endDate) {
    const day = cursor.getDay();
    if (!excludeWeekends || day !== 0) {
      total += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { total, invalid: false };
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value?: string) {
  const parsed = normalizeDate(value);
  if (!parsed) return 'Select date';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getCalendarDays(visibleMonth: Date) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const leading = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const items: Array<{ key: string; label: string; date: Date | null }> = [];

  for (let index = 0; index < leading; index += 1) {
    items.push({ key: `blank-${index}`, label: '', date: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    items.push({ key: toIsoDate(date), label: String(day), date });
  }

  while (items.length % 7 !== 0) {
    items.push({ key: `tail-${items.length}`, label: '', date: null });
  }

  return items;
}

const calendarWeekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function leaveMatchesMonth(leave: LeaveRequest, monthValue: string) {
  if (!monthValue) return true;

  const [yearText, monthText] = monthValue.split('-');
  const year = Number(yearText);
  const month = Number(monthText) - 1;

  if (Number.isNaN(year) || Number.isNaN(month)) return true;

  const rangeStart = new Date(year, month, 1);
  const rangeEnd = new Date(year, month + 1, 0);
  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(23, 59, 59, 999);

  const leaveStart = new Date(leave.startDate);
  const leaveEnd = new Date(leave.endDate);

  return leaveStart <= rangeEnd && leaveEnd >= rangeStart;
}

function getEmployeeRecordLabel(leave: LeaveRequest) {
  const trimmedName = leave.empName?.trim();
  const trimmedEmpId = leave.empId?.trim();

  if (trimmedName && trimmedEmpId) return `${trimmedName} (${trimmedEmpId})`;
  if (trimmedName) return trimmedName;
  if (trimmedEmpId) return `Emp ID: ${trimmedEmpId}`;
  return '';
}

function getEmployeeIdFromLabel(value: string) {
  const match = value.match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : '';
}

function getEmployeeNameFromLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(.*)\s+\(([^)]+)\)\s*$/);
  if (match) return match[1].trim();
  if (/^Emp ID:/i.test(trimmed)) return '';
  return trimmed;
}

function formatApprovalDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function shiftMonthValue(monthValue: string, offset: number) {
  const [yearText, monthText] = monthValue.split('-');
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const shifted = new Date(year, month + offset, 1);
  return getMonthInputValue(shifted);
}

function formatDecisionRole(role?: string | null) {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'SUPER_ADMIN') return 'Admin';
  if (normalized === 'TEAM_LEAD') return 'Team Lead';
  return '';
}

const leaveDetailStatusThemes: Record<LeaveRequest['status'], { shell: string; panel: string; badge: string }> = {
  APPROVED: {
    shell: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-white',
    panel: 'border-emerald-100/80 bg-white',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  },
  PENDING: {
    shell: 'border-amber-200/80 bg-gradient-to-br from-amber-50/75 via-white to-white',
    panel: 'border-amber-100/80 bg-white',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  },
  REJECTED: {
    shell: 'border-rose-200/80 bg-gradient-to-br from-rose-50/75 via-white to-white',
    panel: 'border-rose-100/80 bg-white',
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  },
};

interface DatePickerPopupProps {
  value?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

interface FilterDropdownOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  value: string;
  selectedLabel: string;
  options: FilterDropdownOption[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  maxHeightClass?: string;
}

const DatePickerPopup: React.FC<DatePickerPopupProps> = ({ value, onSelect, onClose }) => {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = normalizeDate(value);
    return selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const selectedDate = normalizeDate(value);
  const monthLabel = visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  return (
    <div className="absolute left-0 top-[calc(100%+12px)] z-30 w-full min-w-[290px] rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.14)] animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Choose date</p>
          <h4 className="mt-1 text-sm font-semibold text-slate-900">{monthLabel}</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {calendarWeekLabels.map((label) => (
          <div key={label} className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </div>
        ))}

        {calendarDays.map((item) => {
          if (!item.date) {
            return <div key={item.key} className="h-10 rounded-xl bg-transparent" />;
          }

          const dayKey = toIsoDate(item.date);
          const isSelected = !!selectedDate && toIsoDate(selectedDate) === dayKey;
          const isToday = toIsoDate(today) === dayKey;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onSelect(dayKey);
                onClose();
              }}
              className={`relative h-10 rounded-xl border text-sm font-semibold transition ${
                isSelected
                  ? 'border-brand-red bg-brand-red text-white shadow-md'
                  : isToday
                    ? 'border-brand-red/20 bg-brand-red/5 text-brand-red'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            onSelect(toIsoDate(today));
            onClose();
          }}
          className="rounded-xl border border-brand-red/15 bg-brand-red/5 px-3 py-2 text-xs font-semibold text-brand-red transition hover:bg-brand-red/10"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  value,
  selectedLabel,
  options,
  open,
  onToggle,
  onSelect,
  containerRef,
  maxHeightClass = 'max-h-72',
}) => (
  <div className="relative" ref={containerRef}>
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition hover:border-slate-300 focus:border-brand-red/35 focus:ring-4 focus:ring-brand-red/10"
    >
      <span className="truncate pr-4">{selectedLabel}</span>
      <ChevronDown
        size={18}
        className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>

    {open ? (
      <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className={`${maxHeightClass} overflow-y-auto py-2`}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value || option.label}
                type="button"
                onClick={() => onSelect(option.value)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'bg-rose-50 text-slate-900'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="font-medium">{option.label}</span>
                {isSelected ? <span className="text-xs font-semibold text-brand-red">Selected</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    ) : null}
  </div>
);

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
    () => calculateLeaveDays(leaveStart, leaveEnd, true),
    [leaveEnd, leaveStart],
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

      {viewerRole === 'team_lead' && pendingLeaves.length > 0 ? (
        <section className="w-full max-w-[720px] rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-semibold text-slate-900">Approvals waiting on you</h3>
          <p className="mt-1 text-sm text-slate-500">Take quick action on pending leave requests that need your decision.</p>
          <div className="mt-5 grid gap-4">
            {pendingLeaves.map((leave) => (
              <div key={leave._id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Employee</p>
                    <p className="mt-1 text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-900">{leave.empName || leave.empId}</p>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                    pending
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">From</span>
                    <span className="text-sm font-semibold tracking-[-0.01em] text-slate-800">{formatApprovalDate(leave.startDate)}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">To</span>
                    <span className="text-sm font-semibold tracking-[-0.01em] text-slate-800">{formatApprovalDate(leave.endDate)}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/5 px-3 py-1.5 text-sm font-semibold text-brand-red">
                    <CalendarDays size={14} />
                    {calculateLeaveDays(leave.startDate.slice(0, 10), leave.endDate.slice(0, 10), false).total} {calculateLeaveDays(leave.startDate.slice(0, 10), leave.endDate.slice(0, 10), false).total === 1 ? 'day' : 'days'}
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reason</p>
                  <p className="mt-2 text-[15px] font-medium leading-7 tracking-[-0.01em] text-slate-800">{leave.reason || leave.type}</p>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => onLeaveAction(leave._id, 'APPROVE')}
                    className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onLeaveAction(leave._id, 'REJECT')}
                    className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
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
              <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red">
                      <Sparkles size={14} />
                      Leave request
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-slate-900">Apply for leave</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                      Submit leave in a structured way with smart suggestions, auto day calculation, and a backend-ready workflow.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Duration</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {hasInvalidRange ? 'Invalid range' : `${calculatedDays} ${calculatedDays === 1 ? 'day' : 'days'}`}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="relative" ref={startFieldRef}>
                    <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">From date</span>
                    <button
                      type="button"
                      onClick={() => setActivePopup((prev) => (prev === 'start' ? null : 'start'))}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm outline-none transition ${
                        activePopup === 'start'
                          ? 'border-brand-red/35 bg-white ring-4 ring-brand-red/10'
                          : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{formatDisplayDate(leaveStart)}</p>
                        <p className="mt-1 text-xs text-slate-400">Choose the first day of leave</p>
                      </div>
                      <CalendarDays size={18} className={activePopup === 'start' ? 'text-brand-red' : 'text-slate-400'} />
                    </button>
                    {activePopup === 'start' ? (
                      <DatePickerPopup
                        value={leaveStart}
                        onSelect={(value) => {
                          onChangeStart(value);
                          if (leaveEnd && leaveEnd < value) {
                            onChangeEnd(value);
                          }
                        }}
                        onClose={() => setActivePopup(null)}
                      />
                    ) : null}
                  </div>

                  <div className="relative" ref={endFieldRef}>
                    <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">To date</span>
                    <button
                      type="button"
                      onClick={() => setActivePopup((prev) => (prev === 'end' ? null : 'end'))}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm outline-none transition ${
                        activePopup === 'end'
                          ? 'border-brand-red/35 bg-white ring-4 ring-brand-red/10'
                          : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{formatDisplayDate(leaveEnd)}</p>
                        <p className="mt-1 text-xs text-slate-400">Choose the last day of leave</p>
                      </div>
                      <CalendarDays size={18} className={activePopup === 'end' ? 'text-brand-red' : 'text-slate-400'} />
                    </button>
                    {activePopup === 'end' ? (
                      <DatePickerPopup
                        value={leaveEnd || leaveStart}
                        onSelect={(value) => {
                          onChangeEnd(value);
                          if (!leaveStart || leaveStart > value) {
                            onChangeStart(value);
                          }
                        }}
                        onClose={() => setActivePopup(null)}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Total Days: <span className="text-brand-red">{calculatedDays}</span>
                  </p>
                  <p className="text-xs text-slate-500">Only Sundays are excluded from the leave duration.</p>
                  {hasInvalidRange ? (
                    <p className="text-xs font-semibold text-rose-600">The end date cannot be earlier than the start date.</p>
                  ) : null}
                </div>

                <div className="relative mt-4" ref={reasonFieldRef}>
                  <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">Reason</span>
                  <button
                    type="button"
                    onClick={() => setActivePopup((prev) => (prev === 'reason' ? null : 'reason'))}
                    className={`w-full rounded-[24px] border px-4 py-3 text-left outline-none transition ${
                      activePopup === 'reason'
                        ? 'border-brand-red/35 bg-white ring-4 ring-brand-red/10'
                        : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-sm ${leaveReason ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
                          {leaveReason || 'Add the reason for your leave request'}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">Open a focused writing panel with smart suggestions</p>
                      </div>
                      <Wand2 size={18} className={activePopup === 'reason' ? 'text-brand-red' : 'text-slate-400'} />
                    </div>
                  </button>

                  {activePopup === 'reason' ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-30 rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.14)] animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reason details</p>
                          <h4 className="mt-1 text-sm font-semibold text-slate-900">Write a clear approver note</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActivePopup(null)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Close
                        </button>
                      </div>

                      <textarea
                        value={leaveReason}
                        onChange={(e) => onChangeReason(e.target.value)}
                        rows={5}
                        autoFocus
                        className="mt-4 w-full rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-red/35 focus:bg-white focus:ring-4 focus:ring-brand-red/10"
                        placeholder="Add the reason for your leave request"
                      />

                      <div className="mt-4">
                        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          <Wand2 size={13} />
                          Smart suggestions
                        </div>
                        <div className="grid gap-2">
                          {filteredSuggestions.slice(0, 4).map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => onChangeReason(suggestion)}
                              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-left text-sm text-slate-600 transition hover:border-brand-red/20 hover:bg-white hover:text-slate-900"
                            >
                              <span>{suggestion}</span>
                              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Use</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <div className="relative" ref={typeFieldRef}>
                    <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">Leave type</span>
                    <button
                      type="button"
                      onClick={() => setActivePopup((prev) => (prev === 'type' ? null : 'type'))}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left outline-none transition ${
                        activePopup === 'type'
                          ? 'border-brand-red/35 bg-white ring-4 ring-brand-red/10'
                          : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{selectedLeaveTypeOption.label}</p>
                        <p className="mt-1 text-xs text-slate-400">{selectedLeaveTypeOption.description}</p>
                      </div>
                      <ChevronDown size={18} className={activePopup === 'type' ? 'text-brand-red' : 'text-slate-400'} />
                    </button>

                    {activePopup === 'type' ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-30 rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.14)] animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-2 px-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Leave type</p>
                          <h4 className="mt-1 text-sm font-semibold text-slate-900">Choose the best category</h4>
                        </div>
                        <div className="grid gap-2">
                          {LEAVE_TYPE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                onChangeType(option.value);
                                setActivePopup(null);
                              }}
                              className={`rounded-2xl border px-4 py-3 text-left transition ${
                                leaveType === option.value
                                  ? 'border-brand-red/25 bg-brand-red/5 shadow-sm'
                                  : `${option.tone} hover:shadow-sm`
                              }`}
                            >
                              <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                              <p className="mt-1 text-xs text-slate-500">{option.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitLeave}
                    className="inline-flex items-center justify-center rounded-2xl bg-brand-red px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    Submit leave request
                  </button>
                </div>
              </section>
            )
          ) : (
            <section className="rounded-[32px] border border-slate-200 bg-white px-6 py-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-1.5 w-8 rounded-full bg-brand-red" />
                    <span className="text-[15px] text-slate-500">Approval Workspace</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-950">Leave operations</h3>
                  <p className="mt-2 max-w-2xl text-[15px] leading-8 text-slate-600">
                    Review leave activity and monitor pending approvals without changing the current dashboard flow.
                  </p>
                </div>

                {viewerRole === 'admin' ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:min-w-[520px]">
                    <label className="block">
                      <span className="mb-2 block text-[13px] font-semibold text-slate-600">Select employee</span>
                      <div className="relative" ref={adminEmployeePickerRef}>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminEmployeePickerOpen((prev) => !prev);
                            setAdminMonthPickerOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3.5 text-left text-[15px] font-semibold text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.06)] outline-none transition-all hover:border-slate-300 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)] focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10"
                        >
                          <span className="pr-4">{adminEmployeeFilter || 'All employees'}</span>
                          <ChevronDown
                            size={18}
                            className={`shrink-0 text-slate-400 transition-transform ${adminEmployeePickerOpen ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {adminEmployeePickerOpen ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                            <div className="max-h-64 overflow-y-auto py-2">
                              {['All employees', ...adminEmployeeOptions].map((employee) => {
                                const value = employee === 'All employees' ? '' : employee;
                                const isSelected = adminEmployeeFilter === value;

                                return (
                                  <button
                                    key={employee}
                                    type="button"
                                    onClick={() => {
                                      setAdminEmployeeFilter(value);
                                      setAdminEmployeePickerOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                                      isSelected
                                        ? 'bg-rose-50 text-slate-900'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className="pr-4 font-medium leading-6">{employee}</span>
                                    {isSelected ? <span className="text-xs font-semibold text-brand-red">Selected</span> : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[13px] font-semibold text-slate-600">Select month</span>
                      <div className="relative" ref={adminMonthPickerRef}>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminMonthPickerOpen((prev) => !prev);
                            setAdminEmployeePickerOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3.5 text-left text-[15px] font-semibold text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.06)] outline-none transition-all hover:border-slate-300 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)] focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/10"
                        >
                          <span className="truncate pr-4">
                            {adminMonthFilter
                              ? new Date(`${adminMonthFilter}-01T00:00:00`).toLocaleDateString('en-US', {
                                  month: 'long',
                                  year: 'numeric',
                                })
                              : 'All months'}
                          </span>
                          <ChevronDown
                            size={18}
                            className={`shrink-0 text-slate-400 transition-transform ${adminMonthPickerOpen ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {adminMonthPickerOpen ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                            <div className="max-h-64 overflow-y-auto py-2">
                              {[
                                { value: '', label: 'All months' },
                                ...adminMonthOptions.map((monthValue) => ({
                                  value: monthValue,
                                  label: new Date(`${monthValue}-01T00:00:00`).toLocaleDateString('en-US', {
                                    month: 'long',
                                    year: 'numeric',
                                  }),
                                })),
                              ].map((month) => {
                                const isSelected = month.value === adminMonthFilter;

                                return (
                                  <button
                                    key={month.value || 'all-months'}
                                    type="button"
                                    onClick={() => {
                                      setAdminMonthFilter(month.value);
                                      setAdminMonthPickerOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                                      isSelected
                                        ? 'bg-rose-50 text-slate-900'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className="font-medium">{month.label}</span>
                                    {isSelected ? <span className="text-xs font-semibold text-brand-red">Selected</span> : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </label>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 border-t border-slate-200/80 pt-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[22px] border border-slate-200 bg-white/85 px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{leaveStats.total}</p>
                  </div>
                  <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 px-5 py-4 shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">Approved</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-emerald-700">{leaveStats.approved}</p>
                  </div>
                  <div className="rounded-[22px] border border-amber-100 bg-amber-50/80 px-5 py-4 shadow-[0_10px_24px_rgba(245,158,11,0.08)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-600">Pending</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-amber-700">{leaveStats.pending}</p>
                  </div>
                  <div className="rounded-[22px] border border-rose-100 bg-rose-50/80 px-5 py-4 shadow-[0_10px_24px_rgba(244,63,94,0.08)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-600">Rejected</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-rose-700">{leaveStats.rejected}</p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

          {viewerRole === 'admin' && pendingLeaves.length > 0 ? (
            <section className="order-1 w-full max-w-[720px] rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-lg font-semibold text-slate-900">Approvals waiting on you</h3>
            <p className="mt-1 text-sm text-slate-500">Take quick action on pending leave requests that need your decision.</p>
            <div className="mt-5 grid gap-4">
              {pendingLeaves.map((leave) => (
                <div key={leave._id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-slate-900">{leave.empName || leave.empId}</p>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                      pending
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">From</span>
                      <span className="text-sm font-semibold text-slate-700">{formatApprovalDate(leave.startDate)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">To</span>
                      <span className="text-sm font-semibold text-slate-700">{formatApprovalDate(leave.endDate)}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/5 px-3 py-1.5 text-sm font-semibold text-brand-red">
                      <CalendarDays size={14} />
                      {calculateLeaveDays(leave.startDate.slice(0, 10), leave.endDate.slice(0, 10), false).total} {calculateLeaveDays(leave.startDate.slice(0, 10), leave.endDate.slice(0, 10), false).total === 1 ? 'day' : 'days'}
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Reason</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-700">{leave.reason || leave.type}</p>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => onLeaveAction(leave._id, 'APPROVE')}
                      className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onLeaveAction(leave._id, 'REJECT')}
                      className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
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

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red">
              <Sparkles size={14} />
              Leave history
            </div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">Leave history records</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Filter, review, and inspect leave records in a professional card-based layout built for SaaS dashboards.
            </p>
          </div>

          <div className={`w-full ${
            showHistoryEmployeeFilter ? 'md:max-w-4xl' : 'md:ml-auto md:max-w-[420px]'
          }`}>
            <div className={`grid grid-cols-1 gap-3 rounded-[26px] border border-slate-200 bg-slate-50/70 p-3 ${
              showHistoryEmployeeFilter
                ? 'md:grid-cols-[170px_minmax(0,1fr)_220px]'
                : 'md:grid-cols-[170px_220px]'
            }`}>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Status</span>
                <FilterDropdown
                  value={statusFilter}
                  selectedLabel={historyStatusLabel}
                  options={historyStatusOptions}
                  open={historyStatusPickerOpen}
                  onToggle={() => {
                    setHistoryStatusPickerOpen((prev) => !prev);
                    setHistoryEmployeePickerOpen(false);
                    setHistoryMonthPickerOpen(false);
                  }}
                  onSelect={(value) => {
                    setStatusFilter(value as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED');
                    setHistoryStatusPickerOpen(false);
                  }}
                  containerRef={historyStatusPickerRef}
                />
              </label>

              {showHistoryEmployeeFilter ? (
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Select employee</span>
                  <FilterDropdown
                    value={historyEmployeeFilter}
                    selectedLabel={historyEmployeeLabel}
                    options={[
                      { value: '', label: 'All employees' },
                      ...historyEmployeeOptions.map((employee) => ({ value: employee, label: formatHistoryEmployeeOptionLabel(employee) })),
                    ]}
                    open={historyEmployeePickerOpen}
                    onToggle={() => {
                      setHistoryEmployeePickerOpen((prev) => !prev);
                      setHistoryStatusPickerOpen(false);
                      setHistoryMonthPickerOpen(false);
                    }}
                    onSelect={(value) => {
                      setHistoryEmployeeFilter(value);
                      setHistoryEmployeePickerOpen(false);
                    }}
                    containerRef={historyEmployeePickerRef}
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Select month</span>
                <FilterDropdown
                  value={historyMonthFilter}
                  selectedLabel={historyMonthLabel}
                  options={[
                    { value: '', label: 'All months' },
                    ...historyMonthOptions.map((monthValue) => ({
                      value: monthValue,
                      label: new Date(`${monthValue}-01T00:00:00`).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      }),
                    })),
                  ]}
                  open={historyMonthPickerOpen}
                  onToggle={() => {
                    setHistoryMonthPickerOpen((prev) => !prev);
                    setHistoryStatusPickerOpen(false);
                    setHistoryEmployeePickerOpen(false);
                  }}
                  onSelect={(value) => {
                    setHistoryMonthFilter(value);
                    setHistoryMonthPickerOpen(false);
                  }}
                  containerRef={historyMonthPickerRef}
                  maxHeightClass="max-h-52"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {leaveLoading ? (
            <AttendanceLeaveOverviewSkeleton count={4} />
          ) : filteredLeaves.length === 0 ? (
            <div className="xl:col-span-2 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <p className="text-base font-semibold text-slate-900">No leave records found</p>
              <p className="mt-2 text-sm text-slate-500">Try adjusting the filters or submit a new leave request.</p>
            </div>
          ) : (
            filteredLeaves.map((leave) => (
              <LeaveHistoryCard
                key={leave._id}
                leave={leave}
                showEmployee={isApproverPortal}
                employeeLabel={getEmployeeRecordLabel(leave)}
                totalDays={calculateLeaveDays(leave.startDate.slice(0, 10), leave.endDate.slice(0, 10), true).total}
                canManagePending={viewerRole !== 'admin'}
                decisionLabel={getDecisionLabel(leave)}
                onViewDetails={setSelectedDetailLeave}
                onEdit={handleEditLeave}
                onDelete={handleDeleteLeave}
              />
            ))
          )}
        </div>
      </section>

      {viewerRole === 'employee' && pendingLeaves.length > 0 ? (
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-semibold text-slate-900">Approvals waiting on you</h3>
          <p className="mt-1 text-sm text-slate-500">Take quick action on pending leave requests that need your decision.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {pendingLeaves.map((leave) => (
              <div key={leave._id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Employee</p>
                    <p className="mt-1 text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-900">{leave.empName || leave.empId}</p>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                    pending
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">From</span>
                    <span className="text-sm font-semibold tracking-[-0.01em] text-slate-800">{formatApprovalDate(leave.startDate)}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">To</span>
                    <span className="text-sm font-semibold tracking-[-0.01em] text-slate-800">{formatApprovalDate(leave.endDate)}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/5 px-3 py-1.5 text-sm font-semibold text-brand-red">
                    <CalendarDays size={14} />
                    {calculateLeaveDays(leave.startDate.slice(0, 10), leave.endDate.slice(0, 10), false).total} {calculateLeaveDays(leave.startDate.slice(0, 10), leave.endDate.slice(0, 10), false).total === 1 ? 'day' : 'days'}
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reason</p>
                  <p className="mt-2 text-[15px] font-medium leading-7 tracking-[-0.01em] text-slate-800">{leave.reason || leave.type}</p>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => onLeaveAction(leave._id, 'APPROVE')}
                    className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onLeaveAction(leave._id, 'REJECT')}
                    className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {selectedDetailLeave ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-[30px] border p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] ${leaveDetailStatusThemes[selectedDetailLeave.status].shell}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Leave details</p>
                <h3 className="mt-2 text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-950">{selectedDetailLeave.type}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailLeave(null)}
                className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className={`rounded-2xl border p-4 ${leaveDetailStatusThemes[selectedDetailLeave.status].panel}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Date range</p>
                <p className="mt-3 whitespace-nowrap text-[1.18rem] font-semibold tracking-[-0.025em] text-slate-950">
                  {new Date(selectedDetailLeave.startDate).toLocaleDateString()} {'->'} {new Date(selectedDetailLeave.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className={`rounded-2xl border p-4 ${leaveDetailStatusThemes[selectedDetailLeave.status].panel}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</p>
                <div className="mt-3">
                  <span className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${leaveDetailStatusThemes[selectedDetailLeave.status].badge}`}>
                    {selectedDetailLeave.status}
                  </span>
                </div>
              </div>
            </div>

            {isApproverPortal && getEmployeeRecordLabel(selectedDetailLeave) ? (
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Employee</p>
                <p className="mt-1 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-900 shadow-sm">
                  {getEmployeeRecordLabel(selectedDetailLeave)}
                </p>
              </div>
            ) : null}

            {viewerRole === 'employee' && selectedDetailLeave.status !== 'PENDING' && formatDecisionRole(selectedDetailLeave.decidedByRole) ? (
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Handled by</p>
                <p className="mt-1 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-900 shadow-sm">
                  {formatDecisionRole(selectedDetailLeave.decidedByRole)}
                </p>
              </div>
            ) : null}

            <div className={`mt-5 rounded-2xl border p-4 ${leaveDetailStatusThemes[selectedDetailLeave.status].panel}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Reason</p>
              <p className="mt-2 text-[17px] font-medium leading-8 tracking-[-0.015em] text-slate-950">
                {selectedDetailLeave.reason || 'No reason added'}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LeaveManagementPanel;
