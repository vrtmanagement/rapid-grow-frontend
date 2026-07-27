import React, { useEffect, useState } from 'react';
import { LopPolicyConfig } from './attendanceUtils';
import { AttendanceEmployeeOption } from './attendanceViewUtils';

interface Props {
  canManage?: boolean;
  policy: LopPolicyConfig | null;
  employeeOptions: AttendanceEmployeeOption[];
  saving?: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  embedded?: boolean;
}

const LeaveLopPolicySection: React.FC<Props> = ({
  canManage = false,
  policy,
  employeeOptions,
  saving = false,
  onSave,
  embedded = false,
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

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-slate-400';
  const toggleRowClass =
    'flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3';

  const body = (
    <div className="space-y-5">
      {!embedded ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">LOP rules</h3>
            <p className="mt-1 text-sm text-slate-500">
              Advance notice, multipliers, and late-application deductions.
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save LOP rules'}
            </button>
          ) : null}
        </div>
      ) : canManage ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save LOP rules'}
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={toggleRowClass}>
          <span className="text-sm font-medium text-slate-700">Enable LOP</span>
          <input
            type="checkbox"
            checked={enabled}
            disabled={!canManage}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-red focus:ring-brand-red/20"
          />
        </label>
        <label className={toggleRowClass}>
          <span className="text-sm font-medium text-slate-700">Late apply = LOP</span>
          <input
            type="checkbox"
            checked={lateApplicationCountsAsLop}
            disabled={!canManage}
            onChange={(e) => setLateApplicationCountsAsLop(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-red focus:ring-brand-red/20"
          />
        </label>
        <label className={toggleRowClass}>
          <span className="text-sm font-medium text-slate-700">Unapproved = LOP</span>
          <input
            type="checkbox"
            checked={unapprovedLeaveCountsAsLop}
            disabled={!canManage}
            onChange={(e) => setUnapprovedLeaveCountsAsLop(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-red focus:ring-brand-red/20"
          />
        </label>
        <label className={toggleRowClass}>
          <span className="text-sm font-medium text-slate-700">Double deduction</span>
          <input
            type="checkbox"
            checked={doubleDeductionEnabled}
            disabled={!canManage}
            onChange={(e) => setDoubleDeductionEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-red focus:ring-brand-red/20"
          />
        </label>

        <label className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Advance notice
          </span>
          <select
            value={minAdvanceNoticeHours}
            disabled={!canManage}
            onChange={(e) => setMinAdvanceNoticeHours(e.target.value)}
            className={fieldClass}
          >
            {noticePresets.map((hours) => (
              <option key={hours} value={hours}>
                {hours} hours
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Multiplier
          </span>
          <select
            value={deductionMultiplier}
            disabled={!canManage}
            onChange={(e) => setDeductionMultiplier(e.target.value)}
            className={fieldClass}
          >
            {multiplierPresets.map((value) => (
              <option key={value} value={value}>
                {value}x
              </option>
            ))}
          </select>
        </label>
      </div>

      {canManage && employeeOptions.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm font-semibold text-slate-800">Employee exceptions</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <select
              value={exceptionEmpId}
              onChange={(e) => setExceptionEmpId(e.target.value)}
              className={fieldClass}
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
              placeholder="Reason"
              className={fieldClass}
            />
            <button
              type="button"
              onClick={handleAddException}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Add
            </button>
          </div>
          {employeeExceptions.length ? (
            <ul className="mt-3 space-y-2">
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
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (embedded) return body;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">{body}</section>
  );
};

export default LeaveLopPolicySection;
