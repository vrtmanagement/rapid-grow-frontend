import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Shield } from 'lucide-react';
import type { CategoryLimit, PerDiemRate, PolicyDashboard } from './expenseTypes';
import { formatCurrency, formatIsoDate } from './expenseTypes';
import { updateExpensePolicy } from './expenseApi';

interface PolicyLimitsSectionProps {
  data: PolicyDashboard | null;
  loading?: boolean;
  canEdit?: boolean;
  onUpdated?: () => void;
}

const formatLimit = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return formatCurrency(value);
};

const parseLimitInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) && num >= 0 ? num : null;
};

const PolicyLimitsSection: React.FC<PolicyLimitsSectionProps> = ({
  data,
  loading = false,
  canEdit = false,
  onUpdated,
}) => {
  const [editingLimits, setEditingLimits] = useState(false);
  const [editingPerDiem, setEditingPerDiem] = useState(false);
  const [draftLimits, setDraftLimits] = useState<CategoryLimit[]>([]);
  const [draftPerDiem, setDraftPerDiem] = useState<PerDiemRate[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.policy) return;
    setDraftLimits(data.policy.categoryLimits);
    setDraftPerDiem(data.policy.perDiemRates);
  }, [data?.policy]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-violet-50" />
        <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  const { policy, violations } = data;

  const handleSaveLimits = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateExpensePolicy({ categoryLimits: draftLimits });
      setEditingLimits(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category limits');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePerDiem = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateExpensePolicy({ perDiemRates: draftPerDiem });
      setEditingPerDiem(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save per diem rates');
    } finally {
      setSaving(false);
    }
  };

  const updateLimitField = (
    index: number,
    field: 'dailyLimit' | 'perTripLimit' | 'monthlyLimit',
    value: string,
  ) => {
    setDraftLimits((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: parseLimitInput(value) } : row)),
    );
  };

  const limitInputValue = (value: number | null | undefined) =>
    value === null || value === undefined ? '' : String(value);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <Shield size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Company Expense Policy</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Edit category limits inline to control maximum allowable spend. Changes apply to new submissions and are
              checked against existing claims during approval.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">Global Category Limits</h3>
            <p className="mt-1 text-sm text-slate-500">Maximum allowable spend per category</p>
          </div>
          {canEdit && !editingLimits && (
            <button
              type="button"
              onClick={() => {
                setDraftLimits(policy.categoryLimits);
                setEditingLimits(true);
              }}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
          )}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Daily Limit</th>
                <th className="px-3 py-2 font-medium">Per Trip/Event</th>
                <th className="px-3 py-2 font-medium">Monthly Limit</th>
              </tr>
            </thead>
            <tbody>
              {(editingLimits ? draftLimits : policy.categoryLimits).map((row, index) => (
                <tr key={row.category} className="border-b border-slate-50">
                  <td className="px-3 py-3 font-semibold text-slate-900">{row.category}</td>
                  {editingLimits ? (
                    <>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          value={limitInputValue(row.dailyLimit)}
                          onChange={(e) => updateLimitField(index, 'dailyLimit', e.target.value)}
                          placeholder="—"
                          className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          value={limitInputValue(row.perTripLimit)}
                          onChange={(e) => updateLimitField(index, 'perTripLimit', e.target.value)}
                          placeholder="—"
                          className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          value={limitInputValue(row.monthlyLimit)}
                          onChange={(e) => updateLimitField(index, 'monthlyLimit', e.target.value)}
                          placeholder="—"
                          className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3 text-slate-700">{formatLimit(row.dailyLimit)}</td>
                      <td className="px-3 py-3 text-slate-700">{formatLimit(row.perTripLimit)}</td>
                      <td className="px-3 py-3 text-slate-700">{formatLimit(row.monthlyLimit)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editingLimits && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setDraftLimits(policy.categoryLimits);
                setEditingLimits(false);
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveLimits}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Per Diem Rates</h3>
          <p className="mt-1 text-sm text-slate-500">Daily allowance based on city tier</p>
          <div className="mt-4 space-y-3">
            {(editingPerDiem ? draftPerDiem : policy.perDiemRates).map((rate, index) => (
              <div
                key={rate.tier}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="text-slate-700">{rate.label}</span>
                {editingPerDiem ? (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={rate.amount}
                      onChange={(e) =>
                        setDraftPerDiem((prev) =>
                          prev.map((row, i) =>
                            i === index ? { ...row, amount: Number(e.target.value) || 0 } : row,
                          ),
                        )
                      }
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm font-semibold outline-none focus:border-slate-300"
                    />
                    <span className="font-normal text-slate-500">/ day</span>
                  </div>
                ) : (
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(rate.amount)} <span className="font-normal text-slate-500">/ day</span>
                  </span>
                )}
              </div>
            ))}
          </div>
          {canEdit && (
            <div className="mt-4 space-y-2">
              {!editingPerDiem ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraftPerDiem(policy.perDiemRates);
                    setEditingPerDiem(true);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit Per Diem Rates
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setDraftPerDiem(policy.perDiemRates);
                      setEditingPerDiem(false);
                    }}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSavePerDiem}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    Save
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-red-600">
            <AlertCircle size={18} />
            <h3 className="font-semibold">Recent Violations</h3>
          </div>
          <div className="space-y-3">
            {violations.length ? (
              violations.map((violation) => (
                <div
                  key={violation.claimId}
                  className="flex items-start justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{violation.employeeName}</p>
                    <p className="text-xs text-slate-500">
                      {violation.category} · {formatIsoDate(violation.expenseDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{formatCurrency(violation.amount)}</p>
                    <p className="text-xs text-red-500">Limit: {formatCurrency(violation.limit)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No recent policy violations.
              </p>
            )}
          </div>
          {violations.length > 0 && (
            <button type="button" className="mt-4 w-full text-sm font-medium text-violet-600 hover:text-violet-700">
              View All Violations
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PolicyLimitsSection;
