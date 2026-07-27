import React from 'react';
import { Send, Trash2 } from 'lucide-react';
import AttendanceLeavePolicySetup from './AttendanceLeavePolicySetup';
import { AttendanceOpsSettings, CompanyHoliday } from './attendanceOpsApi';

export interface OpsSettingsDraft {
  officeStartTime: string;
  whatsappReminderEnabled: boolean;
  reminderGraceMinutes: number;
  reminderMessage: string;
  skipWeekends: boolean;
}

interface Props {
  canManageOps: boolean;
  onToast: (tone: 'success' | 'info', message: string) => void;
  holidays: CompanyHoliday[];
  holidayName: string;
  holidayDate: string;
  holidaySaving: boolean;
  setHolidayName: (value: string) => void;
  setHolidayDate: (value: string) => void;
  onAddHoliday: () => void;
  onDeleteHoliday: (id: string) => void;
  opsSettings: AttendanceOpsSettings | null;
  opsDraft: OpsSettingsDraft;
  setOpsDraft: React.Dispatch<React.SetStateAction<OpsSettingsDraft>>;
  opsSaving: boolean;
  reminderRunning: boolean;
  onSaveOps: () => void;
  onRunReminder: () => void;
}

const AttendanceReportsSetupSection: React.FC<Props> = ({
  canManageOps,
  onToast,
  holidays,
  holidayName,
  holidayDate,
  holidaySaving,
  setHolidayName,
  setHolidayDate,
  onAddHoliday,
  onDeleteHoliday,
  opsSettings,
  opsDraft,
  setOpsDraft,
  opsSaving,
  reminderRunning,
  onSaveOps,
  onRunReminder,
}) => {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-5 py-5 md:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Attendance setup
        </p>
        <h3 className="mt-1 text-2xl font-semibold text-slate-950">One place for leave, holidays & reminders</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Set monthly paid leave, add company holidays, then configure WhatsApp reminders. LOP rules stay optional under leave.
        </p>
      </div>

      <AttendanceLeavePolicySetup canManage={canManageOps} onToast={onToast} />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 md:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Step 2 · Holidays
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">Company holidays</h3>
          <p className="mt-1 text-sm text-slate-500">Holiday days are never marked absent on the presence graph.</p>
        </div>
        <div className="space-y-4 px-5 py-5 md:px-6 md:py-6">
          {canManageOps ? (
            <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
              <input
                type="date"
                value={holidayDate}
                onChange={(event) => setHolidayDate(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
              />
              <input
                type="text"
                value={holidayName}
                onChange={(event) => setHolidayName(event.target.value)}
                placeholder="Holiday name"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
              />
              <button
                type="button"
                onClick={onAddHoliday}
                disabled={holidaySaving}
                className="rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
              >
                {holidaySaving ? 'Adding…' : 'Add holiday'}
              </button>
            </div>
          ) : null}
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="flex items-center justify-between gap-3 bg-white px-4 py-3">
                <div>
                  <div className="font-medium text-slate-900">{holiday.name}</div>
                  <div className="text-xs text-slate-500">{holiday.dateKey}</div>
                </div>
                {canManageOps ? (
                  <button
                    type="button"
                    onClick={() => onDeleteHoliday(holiday.id)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label="Remove holiday"
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
            ))}
            {!holidays.length ? (
              <div className="bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No holidays added yet.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Step 3 · Reminders
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">WhatsApp login reminder</h3>
              <p className="mt-1 text-sm text-slate-500">
                After office start, remind people who have not logged in. Leave and Sundays are skipped.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                opsSettings?.whatsappConfigured
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              API {opsSettings?.whatsappConfigured ? 'configured' : 'not configured'}
            </span>
          </div>
        </div>
        <div className="space-y-4 px-5 py-5 md:px-6 md:py-6">
          {canManageOps ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Office start
                  </span>
                  <input
                    type="time"
                    value={opsDraft.officeStartTime}
                    onChange={(event) =>
                      setOpsDraft((prev) => ({ ...prev, officeStartTime: event.target.value }))
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Grace (minutes)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={opsDraft.reminderGraceMinutes}
                    onChange={(event) =>
                      setOpsDraft((prev) => ({
                        ...prev,
                        reminderGraceMinutes: Number(event.target.value || 0),
                      }))
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Message
                </span>
                <textarea
                  value={opsDraft.reminderMessage}
                  onChange={(event) =>
                    setOpsDraft((prev) => ({ ...prev, reminderMessage: event.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
                />
              </label>
              <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opsDraft.whatsappReminderEnabled}
                    onChange={(event) =>
                      setOpsDraft((prev) => ({
                        ...prev,
                        whatsappReminderEnabled: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-brand-red"
                  />
                  Enable reminders
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opsDraft.skipWeekends}
                    onChange={(event) =>
                      setOpsDraft((prev) => ({ ...prev, skipWeekends: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-brand-red"
                  />
                  Skip Sundays
                </label>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={onSaveOps}
                  disabled={opsSaving}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {opsSaving ? 'Saving…' : 'Save reminder settings'}
                </button>
                <button
                  type="button"
                  onClick={onRunReminder}
                  disabled={reminderRunning}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Send size={14} />
                  {reminderRunning ? 'Sending…' : 'Send now'}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              Only admins can edit reminder settings.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AttendanceReportsSetupSection;
