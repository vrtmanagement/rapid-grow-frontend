import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Plus, X } from 'lucide-react';
import Toast from '../components/ui/Toast';
import AccessDenied from '../components/AccessDenied';
import { usePermissions } from '../context/usePermissions';
import { API_BASE, apiGetJson, getAuthHeaders } from '../config/api';
import { invalidateApiCache, peekApiCache } from '../services/apiCache';
import {
  DailyReviewReminderSettings,
  fetchDailyReviewReminderSettings,
  saveDailyReviewReminderSettings,
} from '../services/dailyReviewReminderSettings';
import { PROFILE_AVATAR_UPDATED_EVENT, resolveAvatarUrl } from '../utils/avatar';
import { AvatarPreviewEntity, AvatarPreviewModal } from '../communication/components/AvatarPreviewModal';
import AddEmployeeView from './AddEmployeeView';
import InviteEmployeeView from './InviteEmployeeView';
import PageSectionSubnav from '../components/layout/PageSectionSubnav';
import OrgChartView from './OrgChartView';
import StaffDirectoryTable from '../components/staff/StaffDirectoryTable';
import StaffReminderPanel from '../components/staff/StaffReminderPanel';
import StaffEditDeleteModals from '../components/staff/StaffEditDeleteModals';
import {
  DEFAULT_REMINDER_SETTINGS,
  type EmployeeRow,
  type StaffPanel,
  type StaffViewProps,
  buildReminderTimeValue,
  formatReminderTimeLabel,
  getBackendInfo,
  parseReminderTimeValue,
} from '../components/staff/staffViewHelpers';

const StaffView: React.FC<StaffViewProps> = ({ mode = 'manager', state }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeStaffPanel: StaffPanel = location.pathname.includes('/staff/org-chart') ? 'org-chart' : 'directory';
  const { hasPermission } = usePermissions();
  const backendInfo = useMemo(() => getBackendInfo(), []);
  const backendRole = backendInfo.role;
  const backendEmpId = backendInfo.empId;
  const backendUserId = backendInfo.userId;
  const isAdmin = backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN';
  const isTeamLead = backendRole === 'TEAM_LEAD';
  const canShowReminderControls = mode === 'manager' && (isAdmin || isTeamLead);

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [previewEntity, setPreviewEntity] = useState<AvatarPreviewEntity | null>(null);
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
  const [reminderSettings, setReminderSettings] = useState<DailyReviewReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [reminderDraft, setReminderDraft] = useState<{ enabled: boolean; time: string }>({
    enabled: DEFAULT_REMINDER_SETTINGS.enabled,
    time: DEFAULT_REMINDER_SETTINGS.time,
  });
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [checkInControlsTab, setCheckInControlsTab] = useState<'daily' | 'weekly'>('daily');
  const departmentMenuRef = useRef<HTMLDivElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const staffTableCardRef = useRef<HTMLDivElement | null>(null);
  const timePickerRef = useRef<HTMLDivElement | null>(null);

  const canCreateEmployee = mode === 'manager' && hasPermission('EMPLOYEE_CREATE') && !!state;
  const canInviteEmployee = mode === 'manager' && hasPermission('EMPLOYEE_INVITE');
  const reminderDirty =
    reminderDraft.enabled !== reminderSettings.enabled || reminderDraft.time !== reminderSettings.time;
  const reminderTimeSelection = useMemo(
    () => parseReminderTimeValue(reminderDraft.time),
    [reminderDraft.time],
  );
  const isCurrentUserRow = (row: EmployeeRow) =>
    Boolean((backendEmpId && row.empId === backendEmpId) || (backendUserId && row._id === backendUserId));

  const openStaffPreview = (row: EmployeeRow) => {
    const statusLabel = row.status
      ? row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase()
      : undefined;
    setPreviewEntity({
      name: row.empName,
      avatar: row.avatar,
      subtitle: row.designation || statusLabel,
    });
  };

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => String(row.department || '').trim())
            .filter((value) => value && value.toLowerCase() !== 'all departments'),
        ),
      ).sort((left: string, right: string) => left.localeCompare(right)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rows
      .filter((row) => {
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
      })
      .sort((left, right) => {
        const leftIsCurrentUser = isCurrentUserRow(left);
        const rightIsCurrentUser = isCurrentUserRow(right);

        if (leftIsCurrentUser === rightIsCurrentUser) return 0;
        return leftIsCurrentUser ? -1 : 1;
      });
  }, [rows, searchQuery, departmentFilter, statusFilter, backendEmpId, backendUserId]);

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
    const hasCache = !!peekApiCache(`${API_BASE}/employees`);
    if (!hasCache) setLoading(true);
    setError(null);
    try {
      const data = await apiGetJson<unknown[]>('/employees');
      setRows(Array.isArray(data) ? (data as EmployeeRow[]) : []);
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
    if (!canShowReminderControls) {
      setReminderLoading(false);
      return;
    }

    let isActive = true;
    setReminderLoading(true);
    setReminderError(null);

    fetchDailyReviewReminderSettings()
      .then((settings) => {
        if (!isActive) return;
        setReminderSettings(settings);
        setReminderDraft({
          enabled: settings.enabled,
          time: settings.time,
        });
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
  }, [canShowReminderControls]);

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
    if (!timePickerOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (timePickerRef.current && target && !timePickerRef.current.contains(target)) {
        setTimePickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTimePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [timePickerOpen]);

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

      invalidateApiCache('/employees');
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

      invalidateApiCache('/employees');
      setRows((prev) => prev.filter((row) => row._id !== deleting._id));
      setToast({ type: 'success', message: 'Employee deleted successfully.' });
      setDeleting(null);
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Employee could not be deleted.' });
    }
  };

  const handleSaveReminderSettings = async () => {
    if (!isAdmin || !reminderDirty) return;
    setReminderSaving(true);
    setReminderError(null);
    try {
      const updated = await saveDailyReviewReminderSettings({
        enabled: reminderDraft.enabled,
        time: reminderDraft.time,
      });
      setReminderSettings(updated);
      setReminderDraft({
        enabled: updated.enabled,
        time: updated.time,
      });
      setToast({ type: 'success', message: 'Daily reminder settings updated successfully.' });
    } catch (err: any) {
      setReminderError(err?.message || 'Failed to update daily reminder settings');
    } finally {
      setReminderSaving(false);
    }
  };

  const handleReminderTimePartChange = (
    part: 'hour' | 'minute' | 'meridiem',
    value: string,
  ) => {
    const nextSelection = {
      ...reminderTimeSelection,
      [part]: value,
    } as { hour: string; minute: string; meridiem: 'AM' | 'PM' };

    setReminderDraft((prev) => ({
      ...prev,
      time: buildReminderTimeValue(nextSelection.hour, nextSelection.minute, nextSelection.meridiem),
    }));
  };

  const reminderStatusChipLabel = reminderDraft.enabled ? 'ACTIVE' : 'PAUSED';
  const reminderScheduleLabel = formatReminderTimeLabel(reminderSettings.time);
  const reminderDraftScheduleLabel = formatReminderTimeLabel(reminderDraft.time);

  const staffSubnavTabClass = (panel: StaffPanel) =>
    `border-b-2 px-1 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors sm:text-[12px] ${
      activeStaffPanel === panel
        ? 'border-brand-red text-slate-900'
        : 'border-transparent text-slate-500 hover:text-slate-900'
    }`;

  const handleStaffPanelChange = (panel: StaffPanel) => {
    navigate(panel === 'org-chart' ? '/staff/org-chart' : '/staff');
  };

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-700">
      <PageSectionSubnav
        outerClassName="px-0 sm:px-0 lg:px-0"
        innerClassName="px-6 sm:px-8 lg:px-10"
        leading={
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-1.5 w-8 shrink-0 rounded-full bg-brand-red" />
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red">
              Staff
            </span>
            <div className="truncate text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
              {activeStaffPanel === 'org-chart' ? 'Org chart' : 'Employee Directory'}
            </div>
          </div>
        }
        center={
          <>
            <button type="button" onClick={() => handleStaffPanelChange('directory')} className={staffSubnavTabClass('directory')}>
              Directory
            </button>
            <button type="button" onClick={() => handleStaffPanelChange('org-chart')} className={staffSubnavTabClass('org-chart')}>
              Org chart
            </button>
          </>
        }
      />

      {activeStaffPanel === 'directory' && (canInviteEmployee || canCreateEmployee) ? (
        <div className="-mt-4 mb-6 flex flex-wrap items-center justify-end gap-3 px-6 sm:px-8 lg:px-10">
          {canInviteEmployee ? (
            <button
              type="button"
              onClick={() => {
                setShowInviteEmployeeForm((prev) => !prev);
                setShowAddEmployeeForm(false);
              }}
              className={`inline-flex shrink-0 items-center gap-2 rounded-[8px] border px-4 py-2 text-[12px] font-semibold shadow-sm transition-all ${
                showInviteEmployeeForm
                  ? 'border-brand-red bg-brand-red text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-brand-red/35 hover:bg-red-50/80 hover:text-brand-red hover:shadow-md'
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
              className={`inline-flex shrink-0 items-center gap-2 rounded-[8px] border px-4 py-2 text-[12px] font-semibold shadow-sm transition-all ${
                showAddEmployeeForm
                  ? 'border-brand-red bg-brand-red text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-brand-red/35 hover:bg-red-50/80 hover:text-brand-red hover:shadow-md'
              }`}
            >
              <Plus size={14} />
              {showAddEmployeeForm ? 'Hide Form' : 'Add Employee'}
            </button>
          ) : null}
        </div>
      ) : null}

      {activeStaffPanel === 'org-chart' ? (
        <OrgChartView embedded />
      ) : null}

      {activeStaffPanel === 'directory' ? (
      <>
      {toast && <Toast type={toast.type} message={toast.message} />}

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

      <StaffDirectoryTable
        ctx={{
          staffTableCardRef,
          loading,
          rows,
          filteredRows,
          searchQuery,
          setSearchQuery,
          departmentMenuRef,
          departmentMenuOpen,
          setDepartmentMenuOpen,
          setStatusMenuOpen,
          departmentFilter,
          setDepartmentFilter,
          departmentOptions,
          statusMenuRef,
          statusMenuOpen,
          statusFilter,
          setStatusFilter,
          canEditRow,
          canDeleteRow,
          openStaffPreview,
          isCurrentUserRow,
          openActionMenuRowId,
          setOpenActionMenuRowId,
          handleStartEdit,
          setDeleting,
        }}
      />

      <StaffReminderPanel
        ctx={{
          canShowReminderControls,
          checkInControlsTab,
          setCheckInControlsTab,
          reminderLoading,
          reminderDraft,
          setReminderDraft,
          reminderStatusChipLabel,
          reminderSettings,
          reminderScheduleLabel,
          reminderDraftScheduleLabel,
          timePickerOpen,
          setTimePickerOpen,
          timePickerRef,
          reminderTimeSelection,
          handleReminderTimePartChange,
          reminderError,
          reminderDirty,
          reminderSaving,
          handleSaveReminderSettings,
          setToast,
        }}
      />

      <AvatarPreviewModal
        open={!!previewEntity}
        entity={previewEntity}
        onClose={() => setPreviewEntity(null)}
      />

      <StaffEditDeleteModals
        ctx={{
          editing,
          setEditing,
          editDraft,
          setEditDraft,
          backendEmpId,
          isAdmin,
          isTeamLead,
          handleSave,
          deleting,
          setDeleting,
          handleDelete,
        }}
      />
      </>
      ) : null}
    </div>
  );
};

export default StaffView;
