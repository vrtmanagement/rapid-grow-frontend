import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Minus, Plus } from 'lucide-react';
import { LeavePolicyConfig, LopPolicyConfig } from './attendanceUtils';
import { fetchLeavePolicies, saveLeavePolicy } from './leaveBalanceApi';
import { fetchLopPolicy, saveLopPolicy } from './lopPolicyApi';
import LeaveLopPolicySection from './LeaveLopPolicySection';

interface Props {
  canManage: boolean;
  onToast?: (tone: 'success' | 'info', message: string) => void;
}

const AttendanceLeavePolicySetup: React.FC<Props> = ({ canManage, onToast }) => {
  const [policies, setPolicies] = useState<LeavePolicyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monthlyPaidLeaves, setMonthlyPaidLeaves] = useState(1);
  const [lopPolicy, setLopPolicy] = useState<LopPolicyConfig | null>(null);
  const [lopSaving, setLopSaving] = useState(false);
  const [showLop, setShowLop] = useState(false);

  const companyPolicy = useMemo(
    () => policies.find((policy) => policy.scopeType === 'company') || policies[0] || null,
    [policies],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [policyRows, lop] = await Promise.all([
        fetchLeavePolicies().catch(() => [] as LeavePolicyConfig[]),
        fetchLopPolicy().catch(() => null),
      ]);
      setPolicies(Array.isArray(policyRows) ? policyRows : []);
      const company =
        (Array.isArray(policyRows) ? policyRows : []).find((row) => row.scopeType === 'company') ||
        (Array.isArray(policyRows) ? policyRows[0] : null);
      setMonthlyPaidLeaves(
        Math.max(0, Math.min(31, Number(company?.monthlyPaidLeaves ?? 1) || 1)),
      );
      setLopPolicy(lop);
    } catch (error) {
      onToast?.('info', error instanceof Error ? error.message : 'Unable to load leave policy');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const bumpPaidLeaves = (delta: number) => {
    setMonthlyPaidLeaves((prev) => Math.max(0, Math.min(31, prev + delta)));
  };

  const handleSavePaidLeaves = async () => {
    if (!canManage) return;
    setSaving(true);
    try {
      const payload = {
        name: companyPolicy?.name || 'Default Leave Policy',
        scopeType: 'company' as const,
        active: true,
        monthlyPaidLeaves,
        maxCarryForward: companyPolicy?.maxCarryForward ?? 6,
        carryForwardEnabled: companyPolicy?.carryForwardEnabled ?? true,
        carryForwardExpiryMonth: companyPolicy?.carryForwardExpiryMonth ?? 3,
        halfDayDeduction: companyPolicy?.halfDayDeduction ?? 0.5,
        autoLopWhenBalanceExhausted: companyPolicy?.autoLopWhenBalanceExhausted ?? true,
        lowBalanceThreshold: companyPolicy?.lowBalanceThreshold ?? 2,
        leaveTypes: companyPolicy?.leaveTypes || [],
        notes: companyPolicy?.notes || '',
      };
      const saved = await saveLeavePolicy(payload);
      setPolicies((prev) => {
        const others = prev.filter((row) => row.id !== saved.id && row.scopeType !== 'company');
        return [saved, ...others];
      });
      setMonthlyPaidLeaves(Math.max(0, Math.min(31, Number(saved.monthlyPaidLeaves) || 1)));
      onToast?.(
        'success',
        monthlyPaidLeaves === 1
          ? 'Saved: 1 paid leave day each month'
          : `Saved: ${monthlyPaidLeaves} paid leave days each month`,
      );
    } catch (error) {
      onToast?.('info', error instanceof Error ? error.message : 'Unable to save leave policy');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLop = async (payload: Record<string, unknown>) => {
    setLopSaving(true);
    try {
      const saved = await saveLopPolicy(payload);
      setLopPolicy(saved);
      onToast?.('success', 'LOP rules saved');
    } catch (error) {
      onToast?.('info', error instanceof Error ? error.message : 'Unable to save LOP rules');
      throw error;
    } finally {
      setLopSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 md:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Step 1 · Leave allowance
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">Monthly paid leaves</h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            First paid leave day each month shows as leave on the graph. Extra leave days count as absent.
          </p>
        </div>

        <div className="px-5 py-5 md:px-6 md:py-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!canManage || monthlyPaidLeaves <= 0 || saving}
                  onClick={() => bumpPaidLeaves(-1)}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Decrease"
                >
                  <Minus size={18} />
                </button>
                <div className="min-w-[120px] rounded-2xl bg-slate-950 px-5 py-3 text-center text-white">
                  <div className="text-3xl font-semibold tabular-nums leading-none">{monthlyPaidLeaves}</div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    {monthlyPaidLeaves === 1 ? 'day / month' : 'days / month'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!canManage || monthlyPaidLeaves >= 31 || saving}
                  onClick={() => bumpPaidLeaves(1)}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Increase"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-sky-50 px-3 py-1.5 font-medium text-sky-800">
                    Paid → -- Leave --
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
                    Extra → -- absent --
                  </span>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => void handleSavePaidLeaves()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    {saving ? 'Saving…' : 'Save leave policy'}
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setShowLop((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left md:px-6"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Optional · Loss of pay
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">LOP rules</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Advance notice, multipliers, and late-application deductions.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {showLop ? 'Hide' : 'Show'}
          </span>
        </button>
        {showLop && lopPolicy ? (
          <div className="border-t border-slate-100 px-5 py-5 md:px-6 md:py-6">
            <LeaveLopPolicySection
              canManage={canManage}
              policy={lopPolicy}
              employeeOptions={[]}
              saving={lopSaving}
              onSave={handleSaveLop}
              embedded
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AttendanceLeavePolicySetup;
