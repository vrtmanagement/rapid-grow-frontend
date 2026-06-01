import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Clock3, Mail, Plus, Send, X } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../../config/api';
import {
  WEEKDAY_OPTIONS,
  WeeklyPerformanceEmailSettings,
  fetchWeeklyPerformanceEmailSettings,
  getDefaultWeeklyPerformanceEmailSettings,
  saveWeeklyPerformanceEmailSettings,
  sendWeeklyPerformanceEmailsNow,
} from '../../services/weeklyPerformanceEmailSettings';

interface EmployeeOption {
  empId: string;
  empName: string;
  email?: string;
  status?: string;
}

const REMINDER_HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, '0'),
);
const REMINDER_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0'),
);
const REMINDER_MERIDIEM_OPTIONS = ['AM', 'PM'] as const;

function parseReminderTimeValue(timeValue?: string) {
  const [hourRaw = '09', minuteRaw = '00'] = String(timeValue || '09:00').split(':');
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

interface WeeklyPerformanceEmailControlsProps {
  onToast?: (type: 'success' | 'error', message: string) => void;
}

const WeeklyPerformanceEmailControls: React.FC<WeeklyPerformanceEmailControlsProps> = ({ onToast }) => {
  const defaults = getDefaultWeeklyPerformanceEmailSettings();
  const [settings, setSettings] = useState<WeeklyPerformanceEmailSettings>(defaults);
  const [draft, setDraft] = useState({
    enabled: defaults.enabled,
    time: defaults.time,
    dayOfWeek: defaults.dayOfWeek,
  });
  const [manualSendEmpIds, setManualSendEmpIds] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [employeePickerId, setEmployeePickerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const timePickerRef = useRef<HTMLDivElement | null>(null);

  const dirty =
    draft.enabled !== settings.enabled ||
    draft.time !== settings.time ||
    draft.dayOfWeek !== settings.dayOfWeek;

  const timeSelection = useMemo(() => parseReminderTimeValue(draft.time), [draft.time]);
  const scheduleLabel = formatReminderTimeLabel(settings.time);
  const draftScheduleLabel = formatReminderTimeLabel(draft.time);
  const selectedDayLabel =
    WEEKDAY_OPTIONS.find((option) => option.value === draft.dayOfWeek)?.label || 'Monday';

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const loaded = await fetchWeeklyPerformanceEmailSettings();
      setSettings(loaded);
      setDraft({
        enabled: loaded.enabled,
        time: loaded.time,
        dayOfWeek: loaded.dayOfWeek,
      });
      setManualSendEmpIds([]);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    let ignore = false;

    fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() })
      .then((res) => res.json().catch(() => []))
      .then((data) => {
        if (ignore) return;
        const rows = Array.isArray(data) ? data : [];
        const options = rows
          .filter((row: EmployeeOption) => String(row?.status || 'active').toLowerCase() === 'active')
          .map((row: EmployeeOption) => ({
            empId: String(row.empId || '').trim(),
            empName: String(row.empName || row.empId || '').trim(),
            email: String(row.email || '').trim(),
            status: row.status,
          }))
          .filter((row: EmployeeOption) => row.empId)
          .sort((a: EmployeeOption, b: EmployeeOption) => a.empName.localeCompare(b.empName));
        setEmployeeOptions(options);
      })
      .catch(() => {
        if (!ignore) setEmployeeOptions([]);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const selectedEmployees = useMemo(
    () =>
      manualSendEmpIds
        .map((empId) => {
          const match = employeeOptions.find((row) => row.empId === empId);
          return match || { empId, empName: empId, email: '' };
        })
        .filter((row) => row.empId),
    [manualSendEmpIds, employeeOptions],
  );

  const availableEmployeeOptions = useMemo(
    () => employeeOptions.filter((row) => !manualSendEmpIds.includes(row.empId)),
    [employeeOptions, manualSendEmpIds],
  );

  const addSelectedEmployee = () => {
    const empId = String(employeePickerId || '').trim();
    if (!empId || manualSendEmpIds.includes(empId)) return;
    setManualSendEmpIds((prev) => [...prev, empId]);
    setEmployeePickerId('');
  };

  const removeSelectedEmployee = (empId: string) => {
    setManualSendEmpIds((prev) => prev.filter((id) => id !== empId));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!timePickerRef.current?.contains(event.target as Node)) {
        setTimePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTimePartChange = (
    part: 'hour' | 'minute' | 'meridiem',
    value: string,
  ) => {
    const current = parseReminderTimeValue(draft.time);
    const next = { ...current, [part]: value };
    setDraft((prev) => ({
      ...prev,
      time: buildReminderTimeValue(next.hour, next.minute, next.meridiem),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await saveWeeklyPerformanceEmailSettings({
        enabled: draft.enabled,
        time: draft.time,
        dayOfWeek: draft.dayOfWeek,
      });
      setSettings(updated);
      setDraft({
        enabled: updated.enabled,
        time: updated.time,
        dayOfWeek: updated.dayOfWeek,
      });
      onToast?.('success', 'Weekly performance email schedule saved.');
    } catch (saveError: unknown) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save settings';
      setError(message);
      onToast?.('error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    setSending(true);
    setError(null);
    try {
      const result = await sendWeeklyPerformanceEmailsNow({
        empIds: manualSendEmpIds.length ? manualSendEmpIds : undefined,
      });
      onToast?.(
        'success',
        result.message ||
          (result.queued
            ? 'Reports are sending in the background.'
            : `Sent ${result.sent} email(s).`),
      );
      window.setTimeout(() => {
        void loadSettings();
      }, 4000);
    } catch (sendError: unknown) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to send emails';
      setError(message);
      onToast?.('error', message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-5 px-6 py-5 xl:grid-cols-[1.25fr_minmax(360px,0.95fr)]">
      <div className="self-start rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_rgba(255,255,255,0)_48%),linear-gradient(180deg,rgba(240,253,244,1)_0%,rgba(255,255,255,1)_100%)] px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-emerald-700 shadow-sm">
            <Mail size={20} />
          </div>
          <div>
            <h4 className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900">
              Weekly performance emails
            </h4>
            <p className="mt-3 text-[14px] leading-7 text-slate-600">
              {settings.enabled
                ? `Every ${settings.scheduleLabel}, all employees on the execution matrix receive their weekly performance email with PDF automatically.`
                : 'Turn automation on, choose the exact day and time, then save.'}
            </p>
            <p className="mt-4 text-[14px] leading-7 text-slate-500">
              Scheduled automation always includes everyone on the execution matrix. Use manual send below to email specific people only.
            </p>
            {settings.lastSentWeekId ? (
              <p className="mt-3 text-[13px] font-medium text-emerald-700">
                Last automated send: week starting {settings.lastSentWeekId}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="rounded-[20px] border border-slate-200 bg-slate-50/40 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
                Automation status
              </h4>
              <p className="mt-1 text-[14px] text-slate-500">
                When on, emails go out once per week at the exact day and time you set ({settings.timezone || 'Asia/Kolkata'}).
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.enabled}
              onClick={() => setDraft((prev) => ({ ...prev, enabled: !prev.enabled }))}
              disabled={loading || saving || sending}
              className={`relative h-9 w-[62px] rounded-full transition ${
                draft.enabled ? 'bg-emerald-500' : 'bg-slate-300'
              } disabled:cursor-not-allowed disabled:opacity-60`}
              aria-label="Toggle weekly performance emails"
            >
              <span
                className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition ${
                  draft.enabled ? 'left-[30px]' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/40 px-4 py-4">
          <label className="mb-2 block text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
            Manual send only (optional)
          </label>
          <p className="mb-3 text-[13px] leading-6 text-slate-500">
            Automation emails everyone. Add people here only if you want to send now to specific employees instead of the whole team.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={employeePickerId}
              onChange={(event) => setEmployeePickerId(event.target.value)}
              disabled={loading || saving || sending || !availableEmployeeOptions.length}
              className="h-11 min-w-0 flex-1 rounded-[16px] border border-slate-200 bg-white px-4 text-[14px] text-slate-700 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:opacity-60"
            >
              <option value="">
                {availableEmployeeOptions.length ? 'Select employee to add' : 'All employees already added'}
              </option>
              {availableEmployeeOptions.map((employee) => (
                <option key={employee.empId} value={employee.empId}>
                  {employee.empName} ({employee.empId})
                  {!employee.email ? ' — no email' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addSelectedEmployee}
              disabled={loading || saving || sending || !employeePickerId}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 text-[13px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} />
              Add employee
            </button>
          </div>
          {selectedEmployees.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedEmployees.map((employee) => (
                <span
                  key={employee.empId}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700"
                >
                  {employee.empName}
                  <button
                    type="button"
                    onClick={() => removeSelectedEmployee(employee.empId)}
                    className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={`Remove ${employee.empName}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[12px] font-medium text-slate-500">
              Send now: everyone on execution matrix
            </p>
          )}
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
            Send day
          </label>
          <select
            value={draft.dayOfWeek}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, dayOfWeek: Number(event.target.value) }))
            }
            disabled={loading || saving || sending}
            className="h-11 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[14px] text-slate-700 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:opacity-60"
          >
            {WEEKDAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <label className="mb-3 block text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
            Send time
          </label>
          <div className="relative" ref={timePickerRef}>
            <button
              type="button"
              onClick={() => setTimePickerOpen((prev) => !prev)}
              disabled={loading || saving || sending}
              className={`flex w-full items-center justify-between rounded-[20px] border bg-white px-5 py-3.5 text-left transition ${
                timePickerOpen
                  ? 'border-slate-900 shadow-[0_0_0_3px_rgba(244,63,94,0.10)]'
                  : 'border-slate-200 hover:border-slate-300'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-slate-50 text-slate-700">
                  <Clock3 size={20} />
                </div>
                <div>
                  <div className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
                    {draftScheduleLabel}
                  </div>
                  <div className="mt-1 text-[12px] uppercase tracking-[0.16em] text-slate-400">
                    {selectedDayLabel} · {settings.timezone || 'Asia/Kolkata'}
                  </div>
                </div>
              </div>
              <ChevronDown
                size={20}
                className={`shrink-0 text-slate-400 transition ${timePickerOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {timePickerOpen ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                <div className="grid grid-cols-[1fr_1fr_110px] gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Hour</p>
                    <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-[20px] border border-slate-200 bg-slate-50/80 p-3">
                      {REMINDER_HOUR_OPTIONS.map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => handleTimePartChange('hour', hour)}
                          className={`flex w-full items-center justify-center rounded-2xl px-3 py-3 text-[14px] font-semibold transition ${
                            timeSelection.hour === hour
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-white'
                          }`}
                        >
                          {hour}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Minute</p>
                    <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-[20px] border border-slate-200 bg-slate-50/80 p-3">
                      {REMINDER_MINUTE_OPTIONS.map((minute) => (
                        <button
                          key={minute}
                          type="button"
                          onClick={() => handleTimePartChange('minute', minute)}
                          className={`flex w-full items-center justify-center rounded-2xl px-3 py-3 text-[14px] font-semibold transition ${
                            timeSelection.minute === minute
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-white'
                          }`}
                        >
                          {minute}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Period</p>
                    <div className="mt-2 space-y-2 rounded-[20px] border border-slate-200 bg-slate-50/80 p-3">
                      {REMINDER_MERIDIEM_OPTIONS.map((meridiem) => (
                        <button
                          key={meridiem}
                          type="button"
                          onClick={() => handleTimePartChange('meridiem', meridiem)}
                          className={`flex w-full items-center justify-center rounded-2xl px-3 py-4 text-[14px] font-semibold transition ${
                            timeSelection.meridiem === meridiem
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-white'
                          }`}
                        >
                          {meridiem}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-7 text-slate-500">
          Active schedule: {settings.enabled ? settings.scheduleLabel : 'Paused'} · Saved time {scheduleLabel}
          {' · '}
          Automation: all execution-matrix employees
        </p>

        {loading ? (
          <p className="mt-4 text-[13px] text-slate-500">Loading schedule settings…</p>
        ) : null}

        {error ? (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadSettings()}
              className="shrink-0 rounded-full border border-red-200 bg-white px-4 py-2 text-[12px] font-semibold text-red-700 hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleSendNow}
            disabled={loading || saving || sending}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-[14px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={16} />
            {sending
              ? 'Queuing send...'
              : selectedEmployees.length === 1
                ? `Send to ${selectedEmployees[0].empName}`
                : selectedEmployees.length > 1
                  ? `Send to ${selectedEmployees.length} employees`
                  : 'Send reports now'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || sending || !dirty}
            className="inline-flex items-center justify-center rounded-full bg-[#f87171] px-6 py-3 text-[15px] font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPerformanceEmailControls;
