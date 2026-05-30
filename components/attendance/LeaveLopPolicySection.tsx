import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield, Users } from 'lucide-react';
import { LopPolicyConfig } from './attendanceUtils';
import { AttendanceEmployeeOption } from './attendanceViewUtils';

interface Props {
  canManage?: boolean;
  policy: LopPolicyConfig | null;
  employeeOptions: AttendanceEmployeeOption[];
  saving?: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}

const LeaveLopPolicySection: React.FC<Props> = ({
  canManage = false,
  policy,
  employeeOptions,
  saving = false,
  onSave,
}) => {
  const [enabled, setEnabled] = useState(true);
  const [minAdvanceNoticeHours, setMinAdvanceNoticeHours] = useState('48');
  const [doubleDeductionEnabled, setDoubleDeductionEnabled] = useState(false);
  const [deductionMultiplier, setDeductionMultiplier] = useState('1');
  const [lateApplicationCountsAsLop, setLateApplicationCountsAsLop] = useState(true);
  const [unapprovedLeaveCountsAsLop, setUnapprovedLeaveCountsAsLop] = useState(true);
  const [exceptionEmpId, setExceptionEmpId] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');
  const [employeeExceptions, setEmployeeExceptions] = useState<LopPolicyConfig['employeeExceptions']>([]);

  useEffect(() => {
    if (!policy) return;
    setEnabled(policy.enabled);
    setMinAdvanceNoticeHours(String(policy.minAdvanceNoticeHours));
    setDoubleDeductionEnabled(policy.doubleDeductionEnabled);
    setDeductionMultiplier(String(policy.deductionMultiplier));
    setLateApplicationCountsAsLop(policy.lateApplicationCountsAsLop);
    setUnapprovedLeaveCountsAsLop(policy.unapprovedLeaveCountsAsLop);
    setEmployeeExceptions(policy.employeeExceptions || []);
  }, [policy]);

  const noticePresets = policy?.presets?.advanceNoticeHours || [24, 48, 72, 96];
  const multiplierPresets = policy?.presets?.multipliers || [1, 1.5, 2, 3, 4];

  const handleAddException = () => {
    const empId = exceptionEmpId.trim();
    if (!empId) return;
    setEmployeeExceptions((prev) => [
      ...prev.filter((entry) => entry.empId !== empId),
      { empId, reason: exceptionReason.trim() },
    ]);
    setExceptionEmpId('');
    setExceptionReason('');
  };

  const handleSave = async () => {
    await onSave({
      enabled,
      minAdvanceNoticeHours: Number(minAdvanceNoticeHours),
      doubleDeductionEnabled,
      deductionMultiplier: Number(deductionMultiplier),
      lateApplicationCountsAsLop,
      unapprovedLeaveCountsAsLop,
      employeeExceptions,
    });
  };

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
            <Shield size={14} />
            Advanced LOP
          </div>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">LOP policy settings</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Configure advance notice, deduction multipliers, and employee exceptions.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-red/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save LOP policy'}
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
          <span className="text-sm font-semibold text-slate-700">Enable LOP system</span>
          <input
            type="checkbox"
            checked={enabled}
            disabled={!canManage}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-brand-red focus:ring-brand-red/20"
          />
        </label>

        <label className="block rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Minimum advance notice
          </span>
          <select
            value={minAdvanceNoticeHours}
            disabled={!canManage}
            onChange={(e) => setMinAdvanceNoticeHours(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800"
          >
            {noticePresets.map((hours) => (
              <option key={hours} value={hours}>
                {hours} hours
              </option>
            ))}
          </select>
        </label>

        <label className="block rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Deduction multiplier
          </span>
          <select
            value={deductionMultiplier}
            disabled={!canManage}
            onChange={(e) => setDeductionMultiplier(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800"
          >
            {multiplierPresets.map((value) => (
              <option key={value} value={value}>
                {value}x
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
          <span className="text-sm font-semibold text-slate-700">Double deduction rules</span>
          <input
            type="checkbox"
            checked={doubleDeductionEnabled}
            disabled={!canManage}
            onChange={(e) => setDoubleDeductionEnabled(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-brand-red focus:ring-brand-red/20"
          />
        </label>

        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
          <span className="text-sm font-semibold text-slate-700">Late application = LOP</span>
          <input
            type="checkbox"
            checked={lateApplicationCountsAsLop}
            disabled={!canManage}
            onChange={(e) => setLateApplicationCountsAsLop(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-brand-red focus:ring-brand-red/20"
          />
        </label>

        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
          <span className="text-sm font-semibold text-slate-700">Unapproved absence = LOP</span>
          <input
            type="checkbox"
            checked={unapprovedLeaveCountsAsLop}
            disabled={!canManage}
            onChange={(e) => setUnapprovedLeaveCountsAsLop(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-brand-red focus:ring-brand-red/20"
          />
        </label>
      </div>

      <div className="mt-6 rounded-[26px] border border-amber-100 bg-amber-50/60 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm leading-6 text-amber-900">
            When enabled, leave applied with less than the configured advance notice may be flagged as LOP. Multipliers
            apply on approval and are recorded in deduction history and audit logs.
          </p>
        </div>
      </div>

      {canManage ? (
        <div className="mt-6 max-w-xl rounded-[26px] border border-slate-200 bg-slate-50/50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Users size={16} />
            Employee exceptions
          </div>
          <div className="mt-4 grid gap-3">
            <select
              value={exceptionEmpId}
              onChange={(e) => setExceptionEmpId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800"
            >
              <option value="">Select employee</option>
              {employeeOptions.map((e) => (
                <option key={e.empId} value={e.empId}>
                  {e.empName} ({e.empId})
                </option>
              ))}
            </select>
            <input
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              placeholder="Exception reason"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={handleAddException}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Add exception
            </button>
          </div>
          <ul className="mt-4 space-y-2">
            {employeeExceptions.map((entry) => (
              <li
                key={entry.empId}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span>
                  {entry.empId}
                  {entry.reason ? ` — ${entry.reason}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEmployeeExceptions((prev) => prev.filter((e) => e.empId !== entry.empId))
                  }
                  className="text-xs font-semibold text-rose-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
};

export default LeaveLopPolicySection;
