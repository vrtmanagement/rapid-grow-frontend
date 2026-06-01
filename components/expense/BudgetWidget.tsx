import React, { useState } from 'react';
import { Pencil, Wallet } from 'lucide-react';
import type { DepartmentBudget } from './expenseTypes';
import { formatCurrency } from './expenseTypes';
import { updateBudget } from './expenseApi';

interface BudgetWidgetProps {
  budgets: DepartmentBudget[];
  canManage?: boolean;
  onUpdated?: () => void;
}

const BudgetWidget: React.FC<BudgetWidgetProps> = ({ budgets, canManage = false, onUpdated }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAmount, setDraftAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (budget: DepartmentBudget) => {
    setEditingId(budget.departmentId);
    setDraftAmount(String(budget.budgetAmount));
  };

  const saveBudget = async (budget: DepartmentBudget) => {
    setSaving(true);
    try {
      await updateBudget(budget.departmentId, {
        budgetAmount: Number(draftAmount),
        departmentName: budget.departmentName,
        month: budget.month,
      });
      setEditingId(null);
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-4 flex items-center gap-2">
        <Wallet size={18} className="text-brand-red" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Budget Usage</h3>
      </div>
      <div className="space-y-4">
        {budgets.map((budget) => {
          const utilization = budget.budgetAmount > 0
            ? Math.min(100, Math.round(((budget.utilizedAmount || 0) / budget.budgetAmount) * 100))
            : 0;
          return (
            <div key={budget._id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/50">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{budget.departmentName}</p>
                  <p className="text-xs text-slate-500">
                    {formatCurrency(budget.utilizedAmount || 0)} of {formatCurrency(budget.budgetAmount)} used
                  </p>
                </div>
                {canManage && editingId !== budget.departmentId && (
                  <button type="button" onClick={() => startEdit(budget)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800">
                    <Pencil size={14} />
                  </button>
                )}
              </div>
              {editingId === budget.departmentId ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={draftAmount}
                    onChange={(e) => setDraftAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  <button type="button" disabled={saving} onClick={() => saveBudget(budget)} className="rounded-lg bg-brand-red px-3 py-2 text-xs font-medium text-white">
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${utilization >= 90 ? 'bg-red-500' : utilization >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${utilization}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatCurrency(budget.remainingBudget || 0)} remaining · {utilization}% utilized</p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetWidget;
