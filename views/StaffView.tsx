import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, ChevronDown, Clock3, Eye, Mail, MoreVertical, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import Toast from '../components/ui/Toast';
import AccessDenied from '../components/AccessDenied';
import { StaffTableSkeleton } from '../components/ui/Skeleton';
import { usePermissions } from '../context/usePermissions';
import { API_BASE, getAuthHeaders } from '../config/api';
import {
  DailyReviewReminderSettings,
  fetchDailyReviewReminderSettings,
  getDefaultDailyReviewReminderSettings,
  saveDailyReviewReminderSettings,
} from '../services/dailyReviewReminderSettings';
import { PlanningState } from '../types';
import { getDisplayAvatarUrl, PROFILE_AVATAR_UPDATED_EVENT, resolveAvatarUrl } from '../utils/avatar';
import AddEmployeeView from './AddEmployeeView';
import InviteEmployeeView from './InviteEmployeeView';

type BackendRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE' | string;

interface EmployeeRow {
  _id: string;
  empId: string;
  empName: string;
  avatar?: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  role?: BackendRole;
  status?: string;
  createdBy?: string;
}

interface StaffViewProps {
  mode?: 'manager' | 'employee';
  state?: PlanningState;
}

function getBackendInfo() {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return { role: 'EMPLOYEE' as BackendRole, empId: '' };
    const parsed = JSON.parse(raw);
    return {
      role: (parsed?.employee?.role || 'EMPLOYEE') as BackendRole,
      empId: parsed?.employee?.empId || '',
    };
  } catch {
    return { role: 'EMPLOYEE' as BackendRole, empId: '' };
  }
}

function formatRoleLabel(role?: BackendRole) {
  const normalized = String(role || 'EMPLOYEE').toUpperCase();
  return normalized.replace(/_/g, ' ');
}

function getRoleBadgeClass(role?: BackendRole) {
  switch (String(role || '').toUpperCase()) {
    case 'SUPER_ADMIN':
      return 'border border-brand-red/15 bg-brand-red/8 text-brand-red';
    case 'ADMIN':
      return 'border border-amber-100 bg-amber-50 text-amber-700';
    case 'TEAM_LEAD':
      return 'border border-blue-100 bg-blue-50 text-blue-700';
    default:
      return 'border border-slate-200 bg-slate-100 text-slate-700';
  }
}

function getStatusBadgeClass(status?: string) {
  return String(status || '').toLowerCase() === 'active'
    ? 'bg-emerald-500 text-white'
    : 'bg-red-500 text-white';
}

function formatTimeLabel(time: string) {
  const [rawHour, rawMinute] = String(time || '').split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return '--:--';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

const DEFAULT_REMINDER_SETTINGS = getDefaultDailyReviewReminderSettings();

const StaffView: React.FC<StaffViewProps> = ({ mode = 'manager', state }) => {
  const { hasPermission } = usePermissions();
  const backendInfo = useMemo(() => getBackendInfo(), []);
  const backendRole = backendInfo.role;
  const backendEmpId = backendInfo.empId;

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [viewingProfile, setViewingProfile] = useState<EmployeeRow | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<EmployeeRow>>({});
  const [deleting, setDeleting] = useState<EmployeeRow | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [showInviteEmployeeForm, setShowInviteEmployeeForm] = useState(false);
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [openActionMenuRowId, setOpenActionMenuRowId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [reminderSettings, setReminderSettings] = useState<DailyReviewReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [reminderEnabled, setReminderEnabled] = useState(DEFAULT_REMINDER_SETTINGS.enabled);
  const [reminderTime, setReminderTime] = useState(DEFAULT_REMINDER_SETTINGS.time);
  const [reminderLoading, setReminderLoading] = useState(mode === 'manager');
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const departmentMenuRef = useRef<HTMLDivElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const actionMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const staffTableCardRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN';
  const isTeamLead = backendRole === 'TEAM_LEAD';
  const canCreateEmployee = mode === 'manager' && hasPermission('EMPLOYEE_CREATE') && !!state;
  const canInviteEmployee = mode === 'manager' && hasPermission('EMPLOYEE_INVITE');
  const canViewProfile = isAdmin || isTeamLead;

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => String(row.department || '').trim())
            .filter((value) => value && value.toLowerCase() !== 'all departments'),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesQuery =
        !query ||
        [row.empName, row.email, row.empId, row.designation, row.department, row.phone].some((value) =>
          String(value || '').toLowerCase().includes(query),
        );

      const matchesDepartment =
        departmentFilter === 'all' || String(row.department || '').trim() === departmentFilter;
      const matchesStatus =
        statusFilter === 'all' || String(row.status || '').toLowerCase() === statusFilter;

      return matchesQuery && matchesDepartment && matchesStatus;
    });
  }, [rows, searchQuery, departmentFilter, statusFilter]);

  const canEditRow = (row: EmployeeRow) => {
    if (!hasPermission('EMPLOYEE_UPDATE')) return false;
    if (isAdmin) return true;
    if (isTeamLead) {
      if (backendEmpId && row.empId === backendEmpId) return true;
      return (row.role || '').toUpperCase() === 'EMPLOYEE';
    }
    if (backendEmpId && row.empId === backendEmpId) return true;
    return false;
  };

  const canDeleteRow = (row: EmployeeRow) => {
    if (!hasPermission('EMPLOYEE_DELETE')) return false;
    if (isAdmin) return true;
    if (isTeamLead) {
      if (backendEmpId && row.empId === backendEmpId) return true;
      return (row.role || '').toUpperCase() === 'EMPLOYEE';
    }
    if (backendEmpId && row.empId === backendEmpId) return true;
    return false;
  };

  const load = async () => {
    if (!hasPermission('STAFF_VIEW')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load staff');
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [hasPermission]);

  useEffect(() => {
    if (mode !== 'manager') return;

    let isActive = true;
    setReminderLoading(true);
    setReminderError(null);

    fetchDailyReviewReminderSettings()
      .then((settings) => {
        if (!isActive) return;
        setReminderSettings(settings);
        setReminderEnabled(settings.enabled);
        setReminderTime(settings.time);
      })
      .catch((err: any) => {
        if (!isActive) return;
        setReminderError(err?.message || 'Failed to load daily reminder settings');
      })
      .finally(() => {
        if (!isActive) return;
        setReminderLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [mode]);

  useEffect(() => {
    const handleProfileAvatarUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ avatar?: string; empId?: string; userId?: string }>).detail || {};
      const avatar = resolveAvatarUrl(detail.avatar);
      if (!avatar) return;
      const empId = String(detail.empId || '').trim();
      const userId = String(detail.userId || '').trim();
      setRows((prev) =>
        prev.map((row) =>
          (userId && row._id === userId) || (empId && row.empId === empId)
            ? { ...row, avatar }
            : row,
        ),
      );
    };

    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated as EventListener);
    return () => {
      window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!openActionMenuRowId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const clickedMenu = !!(actionMenuRef.current && target && actionMenuRef.current.contains(target));
      const clickedTrigger = !!(
        actionMenuTriggerRef.current &&
        target &&
        actionMenuTriggerRef.current.contains(target)
      );
      if (!clickedMenu && !clickedTrigger) {
        setOpenActionMenuRowId(null);
        setActionMenuPosition(null);
        actionMenuTriggerRef.current = null;
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenActionMenuRowId(null);
        setActionMenuPosition(null);
        actionMenuTriggerRef.current = null;
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openActionMenuRowId]);

  useEffect(() => {
    if (!departmentMenuOpen && !statusMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (departmentMenuOpen && departmentMenuRef.current && target && !departmentMenuRef.current.contains(target)) {
        setDepartmentMenuOpen(false);
      }
      if (statusMenuOpen && statusMenuRef.current && target && !statusMenuRef.current.contains(target)) {
        setStatusMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDepartmentMenuOpen(false);
        setStatusMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [departmentMenuOpen, statusMenuOpen]);

  if (!hasPermission('STAFF_VIEW')) {
    return <AccessDenied />;
  }

  const handleStartEdit = (row: EmployeeRow) => {
    if (!canEditRow(row)) return;
    setEditing(row);
    setEditDraft(
      backendEmpId && row.empId === backendEmpId && !isAdmin && !isTeamLead
        ? {}
        : {
            empName: row.empName,
            designation: row.designation,
            department: row.department,
            email: row.email,
            phone: row.phone,
            status: row.status,
            role: row.role,
          },
    );
  };

  const handleSave = async () => {
    if (!editing) return;
    setError(null);
    try {
      const body: any = { ...editDraft };
      if (!isAdmin) {
        delete body.role;
      }
      if (!body.password || !String(body.password).trim()) {
        delete body.password;
      }

      const res = await fetch(`${API_BASE}/employees/${editing._id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update staff');
      }

      setRows((prev) => prev.map((row) => (row._id === data._id ? data : row)));
      setToast({ type: 'success', message: 'User details updated successfully.' });
      setEditing(null);
      setEditDraft({});
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'User details could not be updated.' });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/employees/${deleting._id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete staff');
      }

      setRows((prev) => prev.filter((row) => row._id !== deleting._id));
      setToast({ type: 'success', message: 'Employee deleted successfully.' });
      setDeleting(null);
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Employee could not be deleted.' });
    }
  };

  const handleSaveReminderSettings = async () => {
    setReminderSaving(true);
    setReminderError(null);
    try {
      const updated = await saveDailyReviewReminderSettings({
        enabled: reminderEnabled,
        time: reminderTime,
      });
      setReminderSettings(updated);
      setReminderEnabled(updated.enabled);
      setReminderTime(updated.time);
      setToast({ type: 'success', message: 'Daily reminder settings updated successfully.' });
    } catch (err: any) {
      setReminderError(err?.message || 'Failed to update daily reminder settings');
    } finally {
      setReminderSaving(false);
    }
  };

  const handleActionMenuToggle = (rowId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const tableCardRect = staffTableCardRef.current?.getBoundingClientRect();
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const estimatedMenuHeight = canViewProfile ? 144 : 108;
    const estimatedMenuWidth = 148;
    const menuOffset = 8;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const shouldOpenAbove = spaceBelow < estimatedMenuHeight + menuOffset;
    const containerTop = tableCardRect?.top ?? 0;
    const containerLeft = tableCardRect?.left ?? 0;
    const top = shouldOpenAbove
      ? Math.max(12, triggerRect.top - containerTop - estimatedMenuHeight - menuOffset)
      : triggerRect.bottom - containerTop + menuOffset;
    const left = Math.max(12, triggerRect.right - containerLeft - estimatedMenuWidth);

    setOpenActionMenuRowId((current) => {
      if (current === rowId) {
        setActionMenuPosition(null);
        actionMenuTriggerRef.current = null;
        return null;
      }

      actionMenuTriggerRef.current = event.currentTarget;
      setActionMenuPosition({ top, left });
      return rowId;
    });
  };

  const activeActionRow = openActionMenuRowId
    ? rows.find((row) => row._id === openActionMenuRowId) || null
    : null;
  const reminderStatusChipLabel = reminderEnabled ? 'ACTIVE' : 'PAUSED';
  const reminderScheduleLabel = formatTimeLabel(reminderTime);

  return (
    <div className="-m-16 min-h-full space-y-5 p-8 animate-in fade-in duration-700">
      {toast && <Toast type={toast.type} message={toast.message} />}

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-slate-900">
              Employee Directory
            </h2>
            <p className="mt-2 text-[14px] text-slate-500">
              View all Admins, Team Leads, and Employees in one clean directory.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {canInviteEmployee ? (
              <button
                type="button"
                onClick={() => {
                  setShowInviteEmployeeForm((prev) => !prev);
                  setShowAddEmployeeForm(false);
                }}
                className={`inline-flex shrink-0 items-center gap-2 rounded-[6px] border px-5 py-2.5 text-[12px] font-semibold transition ${
                  showInviteEmployeeForm
                    ? 'border-brand-red bg-brand-red text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-red/40 hover:bg-brand-red/[0.04] hover:text-brand-red'
                }`}
              >
                <Mail size={14} />
                {showInviteEmployeeForm ? 'Hide Invite' : 'Invite Employee'}
              </button>
            ) : null}

            {canCreateEmployee ? (
              <button
                type="button"
                onClick={() => {
                  setShowAddEmployeeForm((prev) => !prev);
                  setShowInviteEmployeeForm(false);
                }}
                className={`inline-flex shrink-0 items-center gap-2 rounded-[6px] border px-5 py-2.5 text-[12px] font-semibold transition ${
                  showAddEmployeeForm
                    ? 'border-brand-red bg-brand-red text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-red/40 hover:bg-brand-red/[0.04] hover:text-brand-red'
                }`}
              >
                <Plus size={14} />
                {showAddEmployeeForm ? 'Hide Form' : 'Add Employee'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {canCreateEmployee && showAddEmployeeForm && state ? (
        <div className="relative rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <button
            type="button"
            onClick={() => setShowAddEmployeeForm(false)}
            className="absolute right-5 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close add employee form"
          >
            <X size={16} />
          </button>
          <AddEmployeeView
            state={state}
            embedded
            onSuccess={() => {
              load();
            }}
            onCancel={() => setShowAddEmployeeForm(false)}
          />
        </div>
      ) : null}

      {canInviteEmployee && showInviteEmployeeForm ? (
        <div className="relative rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <button
            type="button"
            onClick={() => setShowInviteEmployeeForm(false)}
            className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close invite employee form"
          >
            <X size={16} />
          </button>
          <InviteEmployeeView embedded />
        </div>
      ) : null}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 shadow-sm">
          {error}
        </div>
      )}

      <div
        ref={staffTableCardRef}
        className="relative overflow-visible rounded-xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
      >
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="text-[14px] font-medium text-slate-700">
              All Employees ({loading ? rows.length : filteredRows.length})
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-[270px] flex-1 md:w-[270px]">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search employee....."
                  className="w-full rounded-[10px] border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-[13px] text-slate-700 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                />
              </div>

              <div className="relative" ref={departmentMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setDepartmentMenuOpen((prev) => !prev);
                    setStatusMenuOpen(false);
                  }}
                  className={`flex min-w-[150px] items-center justify-between gap-3 rounded-[10px] border bg-white px-4 py-2.5 text-[13px] text-slate-700 transition ${
                    departmentMenuOpen
                      ? 'border-brand-red shadow-[0_0_0_3px_rgba(239,68,68,0.10)]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{departmentFilter === 'all' ? 'All Departments' : departmentFilter}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-500 transition ${departmentMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {departmentMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-full overflow-hidden rounded-[10px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                    <button
                      type="button"
                      onClick={() => {
                        setDepartmentFilter('all');
                        setDepartmentMenuOpen(false);
                      }}
                      className={`flex w-full items-center rounded-[8px] px-3 py-2 text-left text-[13px] transition ${
                        departmentFilter === 'all'
                          ? 'bg-brand-red text-white'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      All Departments
                    </button>
                    {departmentOptions.map((department) => (
                      <button
                        key={department}
                        type="button"
                        onClick={() => {
                          setDepartmentFilter(department);
                          setDepartmentMenuOpen(false);
                        }}
                        className={`flex w-full items-center rounded-[8px] px-3 py-2 text-left text-[13px] transition ${
                          departmentFilter === department
                            ? 'bg-brand-red text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {department}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={statusMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setStatusMenuOpen((prev) => !prev);
                    setDepartmentMenuOpen(false);
                  }}
                  className={`flex min-w-[130px] items-center justify-between gap-3 rounded-[10px] border bg-white px-4 py-2.5 text-[13px] text-slate-700 transition ${
                    statusMenuOpen
                      ? 'border-brand-red shadow-[0_0_0_3px_rgba(239,68,68,0.10)]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>
                    {statusFilter === 'all'
                      ? 'All Status'
                      : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-500 transition ${statusMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {statusMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-full overflow-hidden rounded-[10px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                    {[
                      { value: 'all', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setStatusFilter(option.value);
                          setStatusMenuOpen(false);
                        }}
                        className={`flex w-full items-center rounded-[8px] px-3 py-2 text-left text-[13px] transition ${
                          statusFilter === option.value
                            ? 'bg-brand-red text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-white">
              <tr className="border-b border-slate-100 text-[12px] font-medium text-slate-900">
                <th className="min-w-[260px] px-6 py-4">Name</th>
                <th className="min-w-[100px] px-4 py-4">Emp ID</th>
                <th className="min-w-[140px] px-4 py-4">Role</th>
                <th className="min-w-[150px] px-4 py-4">Designation</th>
                <th className="min-w-[150px] px-4 py-4">Department</th>
                <th className="min-w-[130px] px-4 py-4">Phone</th>
                <th className="min-w-[110px] px-4 py-4">Status</th>
                <th className="w-[96px] px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <StaffTableSkeleton rows={6} />
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-[15px] text-slate-500" colSpan={8}>
                    No staff found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const editable = canEditRow(row);
                  const deletable = canDeleteRow(row);
                  const canOpenActions = editable || deletable || canViewProfile;
                  const avatarSrc = getDisplayAvatarUrl(row.avatar, row.empName);

                  return (
                    <tr key={row._id} className="border-b border-slate-100 transition hover:bg-slate-50/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                            <img src={avatarSrc} alt={row.empName} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-medium text-slate-900">{row.empName}</div>
                            <div className="mt-0.5 truncate text-[12px] text-slate-500">{row.email || '--'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[13px] text-slate-700">{row.empId}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${getRoleBadgeClass(
                            row.role,
                          )}`}
                        >
                          {formatRoleLabel(row.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[13px] text-slate-700">{row.designation || '--'}</td>
                      <td className="px-4 py-4 text-[13px] text-slate-700">{row.department || '--'}</td>
                      <td className="px-4 py-4 text-[13px] text-slate-700">{row.phone || '--'}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex min-w-[60px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-medium capitalize ${getStatusBadgeClass(
                            row.status,
                          )}`}
                        >
                          {row.status || '--'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {canOpenActions ? (
                          <div className="relative inline-flex">
                            <button
                              type="button"
                              onClick={(event) => handleActionMenuToggle(row._id, event)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
                              title="Actions"
                            >
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[12px] text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {activeActionRow && actionMenuPosition ? (
          <div
            ref={actionMenuRef}
            className="absolute z-[80] min-w-[148px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
            style={{
              top: actionMenuPosition.top,
              left: actionMenuPosition.left,
            }}
          >
            {canViewProfile ? (
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuRowId(null);
                  setActionMenuPosition(null);
                  actionMenuTriggerRef.current = null;
                  setViewingProfile(activeActionRow);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-slate-700 transition hover:bg-slate-50"
              >
                <Eye size={14} />
                View Profile
              </button>
            ) : null}
            {canEditRow(activeActionRow) ? (
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuRowId(null);
                  setActionMenuPosition(null);
                  actionMenuTriggerRef.current = null;
                  handleStartEdit(activeActionRow);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil size={14} />
                Edit
              </button>
            ) : null}
            {canDeleteRow(activeActionRow) ? (
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuRowId(null);
                  setActionMenuPosition(null);
                  actionMenuTriggerRef.current = null;
                  setDeleting(activeActionRow);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-red-600 transition hover:bg-red-50"
              >
                <Trash2 size={14} />
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {mode === 'manager' ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-red-50 text-brand-red">
                <BellRing size={20} />
              </div>
              <div>
                <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
                  Daily reminder controls
                </h3>
                <p className="mt-1 text-[14px] text-slate-500">
                  Manage the shared daily reminder schedule for both email and in-app notifications.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {reminderLoading ? 'LOADING' : reminderStatusChipLabel}
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {reminderSettings.timezone || 'Asia/Kolkata'}
              </span>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 xl:grid-cols-[1.25fr_minmax(360px,0.95fr)]">
            <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.12),_transparent_45%),white] px-6 py-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm">
                  <Clock3 size={20} />
                </div>
                <div>
                  <h4 className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900">
                    Current schedule
                  </h4>
                  <p className="mt-3 text-[14px] leading-8 text-slate-600">
                    {reminderEnabled
                      ? `The daily reminder is scheduled for all staff members at ${reminderScheduleLabel}.`
                      : 'The daily reminder is currently paused for all staff members.'}
                  </p>
                  <p className="mt-3 text-[14px] leading-8 text-slate-500">
                    This setting controls the daily reminder email and the reminder notification timing together.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50/40 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
                      Reminder status
                    </h4>
                    <p className="mt-1 text-[14px] text-slate-500">
                      Turn the daily reminder on or off for everyone.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReminderEnabled((prev) => !prev)}
                    disabled={reminderLoading || reminderSaving}
                    className={`relative h-9 w-[62px] rounded-full transition ${
                      reminderEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                    aria-label="Toggle reminder status"
                  >
                    <span
                      className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition ${
                        reminderEnabled ? 'left-[30px]' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-3 block text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
                  Reminder time
                </label>
                <div className="rounded-[20px] border border-slate-200 bg-white px-5 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-slate-50 text-slate-700">
                      <Clock3 size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
                        {reminderScheduleLabel}
                      </div>
                      <div className="mt-1 text-[12px] uppercase tracking-[0.16em] text-slate-400">
                        Custom time picker
                      </div>
                    </div>

                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(event) => setReminderTime(event.target.value)}
                      disabled={reminderLoading || reminderSaving}
                      className="h-[42px] rounded-[10px] border border-slate-200 px-3 text-[14px] text-slate-700 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[13px] leading-7 text-slate-500">
                Time is stored in {reminderSettings.timezone || 'Asia/Kolkata'} and applied to both email and
                notification reminders.
              </p>

              {reminderError ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {reminderError}
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13px] text-slate-500">
                  {reminderLoading ? 'Loading reminder settings...' : 'Reminder settings are up to date.'}
                </p>

                <button
                  type="button"
                  onClick={handleSaveReminderSettings}
                  disabled={reminderLoading || reminderSaving}
                  className="inline-flex items-center justify-center rounded-full bg-[#f87171] px-6 py-3 text-[15px] font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reminderSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {viewingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">View Profile</h3>
                <p className="mt-1 text-[14px] text-slate-500">
                  Staff profile details for {viewingProfile.empName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingProfile(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-[120px_minmax(0,1fr)]">
              <div className="flex justify-center md:block">
                <div className="h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                  <img
                    src={getDisplayAvatarUrl(viewingProfile.avatar, viewingProfile.empName)}
                    alt={viewingProfile.empName}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-4">
                  <h4 className="text-[28px] font-semibold leading-tight text-slate-900">
                    {viewingProfile.empName}
                  </h4>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${getRoleBadgeClass(
                        viewingProfile.role,
                      )}`}
                    >
                      {formatRoleLabel(viewingProfile.role)}
                    </span>
                    <span
                      className={`inline-flex min-w-[68px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-medium capitalize ${getStatusBadgeClass(
                        viewingProfile.status,
                      )}`}
                    >
                      {viewingProfile.status || '--'}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ['Employee ID', viewingProfile.empId || '--'],
                    ['Designation', viewingProfile.designation || '--'],
                    ['Department', viewingProfile.department || '--'],
                    ['Phone', viewingProfile.phone || '--'],
                    ['Email', viewingProfile.email || '--'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                        {label}
                      </p>
                      <p className="mt-1.5 break-words text-[15px] font-medium text-slate-900">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="mb-6">
              <h3 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">Edit staff</h3>
              <p className="mt-1 text-[14px] text-slate-500">
                Update employee information while keeping the existing access rules intact.
              </p>
            </div>

            <div className="space-y-4">
              {!(backendEmpId && editing.empId === backendEmpId && !isAdmin && !isTeamLead) && (
                <>
                  <div>
                    <label className="mb-1 block text-[13px] font-semibold text-slate-700">Name</label>
                    <input
                      value={editDraft.empName || ''}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, empName: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">Designation</label>
                      <input
                        value={editDraft.designation || ''}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, designation: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">Department</label>
                      <input
                        value={editDraft.department || ''}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, department: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">Email</label>
                      <input
                        value={editDraft.email || ''}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">Phone</label>
                      <input
                        value={editDraft.phone || ''}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">Status</label>
                      <select
                        value={editDraft.status || 'active'}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    {isAdmin && (
                      <div>
                        <label className="mb-1 block text-[13px] font-semibold text-slate-700">Role</label>
                        <select
                          value={editDraft.role || 'EMPLOYEE'}
                          onChange={(e) =>
                            setEditDraft((prev) => ({ ...prev, role: e.target.value as BackendRole }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                        >
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="TEAM_LEAD">TEAM_LEAD</option>
                          <option value="EMPLOYEE">EMPLOYEE</option>
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">New password</label>
                <input
                  type="password"
                  value={(editDraft as any).password || ''}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder={
                    backendEmpId && editing.empId === backendEmpId && !isAdmin && !isTeamLead
                      ? 'Enter your new password'
                      : 'Leave blank to keep existing password'
                  }
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setEditDraft({});
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-brand-red px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-navy"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <h3 className="mb-2 text-[22px] font-semibold tracking-[-0.02em] text-slate-900">Delete staff</h3>
            <p className="mb-6 text-[14px] leading-6 text-slate-600">
              Are you sure you want to delete &quot;{deleting.empName}&quot; ({deleting.empId})?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-full bg-brand-red px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-navy"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffView;
