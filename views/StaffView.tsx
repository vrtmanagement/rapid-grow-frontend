import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, ChevronDown, Clock3, Pencil, Trash2 } from 'lucide-react';
import Toast from '../components/ui/Toast';
import AccessDenied from '../components/AccessDenied';
import { StaffTableSkeleton } from '../components/ui/Skeleton';
import { usePermissions } from '../context/usePermissions';
import { API_BASE, getAuthHeaders } from '../config/api';
import {
  fetchDailyReviewReminderSettings,
  getDefaultDailyReviewReminderSettings,
  saveDailyReviewReminderSettings,
  type DailyReviewReminderSettings,
} from '../services/dailyReviewReminderSettings';
import { getDisplayAvatarUrl, PROFILE_AVATAR_UPDATED_EVENT, resolveAvatarUrl } from '../utils/avatar';
import EmployeeSkillsPanel from '../components/employees/EmployeeSkillsPanel';

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
    ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
    : 'border border-slate-200 bg-slate-100 text-slate-600';
}

const REMINDER_HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, '0'),
);
const REMINDER_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0'),
);
const REMINDER_MERIDIEM_OPTIONS = ['AM', 'PM'] as const;

function parseReminderTimeValue(timeValue?: string) {
  const [hourRaw = '21', minuteRaw = '40'] = String(timeValue || '21:40').split(':');
  const hour24 = Math.min(23, Math.max(0, Number(hourRaw) || 0));
  const minute = Math.min(59, Math.max(0, Number(minuteRaw) || 0));
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return {
    hour: String(hour12).padStart(2, '0'),
    minute: String(minute).padStart(2, '0'),
    meridiem,
  } as { hour: string; minute: string; meridiem: 'AM' | 'PM' };
}

function buildReminderTimeValue(hour: string, minute: string, meridiem: 'AM' | 'PM') {
  const hourNumber = Math.min(12, Math.max(1, Number(hour) || 12));
  const minuteNumber = Math.min(59, Math.max(0, Number(minute) || 0));
  let hour24 = hourNumber % 12;
  if (meridiem === 'PM') {
    hour24 += 12;
  }

  return `${String(hour24).padStart(2, '0')}:${String(minuteNumber).padStart(2, '0')}`;
}

function formatReminderTimeLabel(timeValue?: string) {
  const parsed = parseReminderTimeValue(timeValue);
  return `${parsed.hour}:${parsed.minute} ${parsed.meridiem}`;
}

const StaffView: React.FC = () => {
  const { hasPermission } = usePermissions();
  const backendInfo = useMemo(() => getBackendInfo(), []);
  const backendRole = backendInfo.role;
  const backendEmpId = backendInfo.empId;

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<EmployeeRow>>({});
  const [deleting, setDeleting] = useState<EmployeeRow | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [reminderSettings, setReminderSettings] = useState<DailyReviewReminderSettings>(
    getDefaultDailyReviewReminderSettings(),
  );
  const [reminderDraft, setReminderDraft] = useState<{ enabled: boolean; time: string }>({
    enabled: getDefaultDailyReviewReminderSettings().enabled,
    time: getDefaultDailyReviewReminderSettings().time,
  });
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const timePickerRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN';
  const isTeamLead = backendRole === 'TEAM_LEAD';
  const reminderDirty =
    reminderDraft.enabled !== reminderSettings.enabled || reminderDraft.time !== reminderSettings.time;
  const reminderTimeSelection = useMemo(
    () => parseReminderTimeValue(reminderDraft.time),
    [reminderDraft.time],
  );

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
      const list: EmployeeRow[] = Array.isArray(data) ? data : [];
      setRows(list);
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
    if (!isAdmin) return;

    let active = true;

    async function loadReminderSettings() {
      setReminderLoading(true);
      setReminderError(null);
      try {
        const settings = await fetchDailyReviewReminderSettings();
        if (!active) return;
        setReminderSettings(settings);
        setReminderDraft({
          enabled: settings.enabled,
          time: settings.time,
        });
      } catch (e: any) {
        if (!active) return;
        setReminderError(e?.message || 'Failed to load daily reminder settings');
      } finally {
        if (active) {
          setReminderLoading(false);
        }
      }
    }

    loadReminderSettings();

    return () => {
      active = false;
    };
  }, [isAdmin]);

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

      setRows((prev) => prev.map((r) => (r._id === data._id ? data : r)));
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
      setRows((prev) => prev.filter((r) => r._id !== deleting._id));
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
      const settings = await saveDailyReviewReminderSettings({
        enabled: reminderDraft.enabled,
        time: reminderDraft.time,
      });
      setReminderSettings(settings);
      setReminderDraft({
        enabled: settings.enabled,
        time: settings.time,
      });
      setToast({ type: 'success', message: 'Daily reminder settings updated successfully.' });
    } catch (e: any) {
      setReminderError(e?.message || 'Failed to update daily reminder settings');
      setToast({ type: 'error', message: e?.message || 'Daily reminder settings could not be updated.' });
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

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in duration-700">
      {toast && <Toast type={toast.type} message={toast.message} />}

      <div className="rounded-[28px] border border-slate-200/80 bg-white/90 px-7 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="h-1.5 w-8 rounded-full bg-brand-red" />
              <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Staff Directory
              </span>
            </div>
            <h2 className="text-[38px] font-semibold leading-none tracking-[-0.03em] text-slate-900">
              Staff
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-500">
              View all Admins, Team Leads, and Employees in one clean directory.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <div className="mb-2 flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                    <BellRing size={18} />
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
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                    reminderDraft.enabled
                      ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                      : 'border border-slate-200 bg-slate-100 text-slate-600'
                  }`}
                >
                  {reminderDraft.enabled ? 'Active' : 'Paused'}
                </span>
                <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {reminderSettings.timezone}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="grid gap-5 lg:items-start lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div className="self-start rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.95),rgba(255,247,237,0.85))] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    <Clock3 size={18} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-slate-900">Current schedule</p>
                    <p className="mt-1.5 text-[14px] leading-6 text-slate-600">
                      {reminderSettings.enabled
                        ? `The daily reminder is set for ${reminderSettings.scheduleLabel} (${reminderSettings.time}) in ${reminderSettings.timezone}.`
                        : 'The daily reminder is currently paused for all staff members.'}
                    </p>
                    <p className="mt-2.5 text-[13px] leading-5 text-slate-500">
                      This setting controls the daily reminder email and the reminder notification timing together.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5">
                    <div>
                      <p className="text-[14px] font-semibold text-slate-900">Reminder status</p>
                      <p className="mt-0.5 text-[13px] text-slate-500">
                        Turn the daily reminder on or off for everyone.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={reminderDraft.enabled}
                      onClick={() =>
                        setReminderDraft((prev) => ({ ...prev, enabled: !prev.enabled }))
                      }
                      className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition ${
                        reminderDraft.enabled ? 'bg-brand-red' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition ${
                          reminderDraft.enabled ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                      Reminder time
                    </label>
                    <div className="relative" ref={timePickerRef}>
                      <button
                        type="button"
                        onClick={() => setTimePickerOpen((prev) => !prev)}
                        className={`flex w-full items-center justify-between rounded-2xl border bg-white px-4 py-3 text-left transition ${
                          timePickerOpen
                            ? 'border-brand-red shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
                            <Clock3 size={16} />
                          </div>
                          <div>
                            <p className="text-[17px] font-semibold tracking-[-0.02em] text-slate-900">
                              {formatReminderTimeLabel(reminderDraft.time)}
                            </p>
                            <p className="text-[12px] uppercase tracking-[0.12em] text-slate-400">
                              Custom time picker
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          size={18}
                          className={`text-slate-400 transition ${timePickerOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {timePickerOpen && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                          <div className="grid grid-cols-[1fr_1fr_88px] gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Hour
                              </p>
                              <div className="mt-1.5 max-h-44 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-2">
                                {REMINDER_HOUR_OPTIONS.map((hour) => {
                                  const selected = reminderTimeSelection.hour === hour;
                                  return (
                                    <button
                                      key={hour}
                                      type="button"
                                      onClick={() => handleReminderTimePartChange('hour', hour)}
                                      className={`flex w-full items-center justify-center rounded-xl px-3 py-2 text-[13px] font-semibold transition ${
                                        selected
                                          ? 'bg-brand-red text-white shadow-sm'
                                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                      }`}
                                    >
                                      {hour}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Minute
                              </p>
                              <div className="mt-1.5 max-h-44 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-2">
                                {REMINDER_MINUTE_OPTIONS.map((minute) => {
                                  const selected = reminderTimeSelection.minute === minute;
                                  return (
                                    <button
                                      key={minute}
                                      type="button"
                                      onClick={() => handleReminderTimePartChange('minute', minute)}
                                      className={`flex w-full items-center justify-center rounded-xl px-3 py-2 text-[13px] font-semibold transition ${
                                        selected
                                          ? 'bg-brand-red text-white shadow-sm'
                                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                      }`}
                                    >
                                      {minute}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Period
                              </p>
                              <div className="mt-1.5 space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-2">
                                {REMINDER_MERIDIEM_OPTIONS.map((meridiem) => {
                                  const selected = reminderTimeSelection.meridiem === meridiem;
                                  return (
                                    <button
                                      key={meridiem}
                                      type="button"
                                      onClick={() => handleReminderTimePartChange('meridiem', meridiem)}
                                      className={`flex w-full items-center justify-center rounded-xl px-3 py-2 text-[13px] font-semibold transition ${
                                        selected
                                          ? 'bg-brand-red text-white shadow-sm'
                                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                      }`}
                                    >
                                      {meridiem}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Selected time
                              </p>
                              <p className="mt-0.5 text-[14px] font-semibold text-slate-900">
                                {formatReminderTimeLabel(reminderDraft.time)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTimePickerOpen(false)}
                              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-[12px] leading-5 text-slate-500">
                      Time is stored in {reminderSettings.timezone} and applied to both email and notification reminders.
                    </p>
                  </div>

                  {reminderError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                      {reminderError}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <span className="text-[12px] text-slate-500">
                      {reminderLoading
                        ? 'Loading current settings...'
                        : reminderDirty
                          ? 'You have unsaved reminder changes.'
                          : 'Reminder settings are up to date.'}
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveReminderSettings}
                      disabled={reminderLoading || reminderSaving || !reminderDirty}
                      className="rounded-full bg-brand-red px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {reminderSaving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
                Team members
              </h3>
              <p className="mt-1 text-[14px] text-slate-500">
                Review employee details, roles, departments, and current status.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
              {loading ? 'Loading' : `${rows.length} members`}
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-white">
              <tr className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <th className="min-w-[240px] px-6 py-4">Name</th>
                <th className="min-w-[120px] px-4 py-4">Emp ID</th>
                <th className="min-w-[140px] px-4 py-4">Role</th>
                <th className="min-w-[160px] px-4 py-4">Designation</th>
                <th className="min-w-[160px] px-4 py-4">Department</th>
                <th className="min-w-[220px] px-4 py-4">Email</th>
                <th className="min-w-[140px] px-4 py-4">Phone</th>
                <th className="min-w-[120px] px-4 py-4">Status</th>
                <th className="w-[130px] px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <StaffTableSkeleton rows={6} />
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-[15px] text-slate-500" colSpan={9}>
                    No staff found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const editable = canEditRow(row);
                  const avatarSrc = getDisplayAvatarUrl(row.avatar, row.empName);

                  return (
                    <tr
                      key={row._id}
                      className="border-b border-slate-100 transition hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-sm">
                            <img
                              src={avatarSrc}
                              alt={row.empName}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-semibold text-slate-900">
                              {row.empName}
                            </div>
                            <div className="mt-0.5 text-[12px] text-slate-500">
                              {row.designation || 'Team member'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[13px] font-medium text-slate-700">
                        {row.empId}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${getRoleBadgeClass(
                            row.role,
                          )}`}
                        >
                          {formatRoleLabel(row.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[13px] text-slate-700">
                        {row.designation || '--'}
                      </td>
                      <td className="px-4 py-4 text-[13px] text-slate-700">
                        {row.department || '--'}
                      </td>
                      <td className="px-4 py-4 text-[13px] text-slate-700">
                        {row.email || '--'}
                      </td>
                      <td className="px-4 py-4 text-[13px] text-slate-700">
                        {row.phone || '--'}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${getStatusBadgeClass(
                            row.status,
                          )}`}
                        >
                          {row.status || '--'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editable ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(row)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            {canDeleteRow(row) && (
                              <button
                                type="button"
                                onClick={() => setDeleting(row)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm transition hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">View only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="mb-6">
              <h3 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
                Edit staff
              </h3>
              <p className="mt-1 text-[14px] text-slate-500">
                Update employee information while keeping the existing access rules intact.
              </p>
            </div>

            <div className="space-y-4">
              {!(backendEmpId && editing.empId === backendEmpId && !isAdmin && !isTeamLead) && (
                <>
                  <div>
                    <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                      Name
                    </label>
                    <input
                      value={editDraft.empName || ''}
                      onChange={(e) =>
                        setEditDraft((prev) => ({ ...prev, empName: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                        Designation
                      </label>
                      <input
                        value={editDraft.designation || ''}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, designation: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                        Department
                      </label>
                      <input
                        value={editDraft.department || ''}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, department: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                        Email
                      </label>
                      <input
                        value={editDraft.email || ''}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                        Phone
                      </label>
                      <input
                        value={editDraft.phone || ''}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                        Status
                      </label>
                      <select
                        value={editDraft.status || 'active'}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, status: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    {isAdmin && (
                      <div>
                        <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                          Role
                        </label>
                        <select
                          value={editDraft.role || 'EMPLOYEE'}
                          onChange={(e) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              role: e.target.value as BackendRole,
                            }))
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
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                  New password
                </label>
                <input
                  type="password"
                  value={(editDraft as any).password || ''}
                  onChange={(e) =>
                    setEditDraft((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder={
                    backendEmpId && editing.empId === backendEmpId && !isAdmin && !isTeamLead
                      ? 'Enter your new password'
                      : 'Leave blank to keep existing password'
                  }
                />
              </div>

              {editing.empId && <EmployeeSkillsPanel empId={editing.empId} />}
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
            <h3 className="mb-2 text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
              Delete staff
            </h3>
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
