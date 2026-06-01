import React from 'react';
import type { ExpenseClaim } from './expenseTypes';
import {
  EXPENSE_CATEGORY_LABELS,
  displayExpenseStatus,
  formatCurrency,
  formatDate,
  getEmployeeName,
  statusBadgeClass,
} from './expenseTypes';

interface ExpenseTableProps {
  items: ExpenseClaim[];
  loading?: boolean;
  onRowClick?: (claim: ExpenseClaim) => void;
  showEmployee?: boolean;
  emptyMessage?: string;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({
  items,
  loading = false,
  onRowClick,
  showEmployee = false,
  emptyMessage = 'No expense claims found.',
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Description</th>
              {showEmployee && <th className="px-4 py-3 font-medium">Employee</th>}
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((claim) => (
              <tr
                key={claim._id}
                onClick={() => onRowClick?.(claim)}
                className={`border-b border-slate-50 transition hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-800/40 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(claim.expenseDate)}</td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                  {EXPENSE_CATEGORY_LABELS[claim.category] || claim.category}
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">
                  {claim.description || claim.extractedVendor || '—'}
                  {claim.extractedVendor && claim.description !== claim.extractedVendor && (
                    <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">Auto-filled</span>
                  )}
                </td>
                {showEmployee && (
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {getEmployeeName(claim.employeeId as never)}
                  </td>
                )}
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{formatCurrency(claim.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(claim.status)}`}>
                    {displayExpenseStatus(claim.status)}
                  </span>
                  {claim.duplicateFlag && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">Duplicate flagged</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseTable;
