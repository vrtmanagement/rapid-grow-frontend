import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Check, Filter, Loader2, X } from 'lucide-react';
import type { ApprovalHistoryItem, ExpenseClaim, TravelRequest } from './expenseTypes';
import {
  EXPENSE_CATEGORY_LABELS,
  approvalHistoryBadgeClass,
  formatCurrency,
  formatIsoDate,
  getEmployeeName,
  getInitials,
  timeAgo,
} from './expenseTypes';
import { approveExpenseClaim, approveTravelRequest } from './expenseApi';

interface ApprovalQueueProps {
  expenseItems: ExpenseClaim[];
  travelItems: TravelRequest[];
  historyItems: ApprovalHistoryItem[];
  loading?: boolean;
  historyLoading?: boolean;
  onUpdated: () => void;
}

type PendingItem =
  | { kind: 'expense'; item: ExpenseClaim }
  | { kind: 'travel'; item: TravelRequest };

function isItemUrgent(entry: PendingItem) {
  return !!entry.item.urgent;
}

const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  expenseItems,
  travelItems,
  historyItems,
  loading = false,
  historyLoading = false,
  onUpdated,
}) => {
  const [actionId, setActionId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc'>('asc');

  const pendingItems = useMemo<PendingItem[]>(() => {
    const expenses = expenseItems.map((item) => ({ kind: 'expense' as const, item }));
    const travel = travelItems.map((item) => ({ kind: 'travel' as const, item }));
    return [...expenses, ...travel].sort((a, b) => {
      const urgentA = isItemUrgent(a) ? 1 : 0;
      const urgentB = isItemUrgent(b) ? 1 : 0;
      if (urgentA !== urgentB) return urgentB - urgentA;
      const dateA = new Date(a.item.createdAt).getTime();
      const dateB = new Date(b.item.createdAt).getTime();
      return dateB - dateA;
    });
  }, [expenseItems, travelItems]);

  const sortedHistoryItems = useMemo(() => {
    const sorted = [...historyItems];
    sorted.sort((a, b) => {
      const cmp = (a.employeeName || '').localeCompare(b.employeeName || '', undefined, { sensitivity: 'base' });
      return historySortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [historyItems, historySortDirection]);

  const handleHistorySort = () => {
    setHistorySortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const handleApprove = async (entry: PendingItem) => {
    setActionId(entry.item._id);
    try {
      if (entry.kind === 'expense') {
        await approveExpenseClaim(entry.item._id, 'APPROVED');
      } else {
        await approveTravelRequest(entry.item._id, 'APPROVED');
      }
      onUpdated();
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (entry: PendingItem) => {
    const reason = comments[entry.item._id] || '';
    setActionId(entry.item._id);
    try {
      if (entry.kind === 'expense') {
        await approveExpenseClaim(entry.item._id, 'REJECTED', reason);
      } else {
        await approveTravelRequest(entry.item._id, 'REJECTED', reason);
      }
      onUpdated();
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Pending Action</h2>
          <span className="text-sm font-medium text-slate-400">{pendingItems.length}</span>
        </div>

        <div className="space-y-3">
          {!pendingItems.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
              No pending approvals.
            </div>
          ) : (
            pendingItems.map((entry) => {
              const urgent = isItemUrgent(entry);
              const name = getEmployeeName(entry.item.employeeId as never);
              const amount = entry.kind === 'expense' ? entry.item.amount : entry.item.estimatedCost;
              const typeLabel = entry.kind === 'expense' ? 'Expense' : 'Travel';
              const submittedAt =
                entry.kind === 'expense'
                  ? entry.item.submittedAt || entry.item.createdAt
                  : entry.item.createdAt;
              const description =
                entry.kind === 'expense'
                  ? entry.item.description || EXPENSE_CATEGORY_LABELS[entry.item.category] || 'Expense claim'
                  : `${entry.item.fromLocation} → ${entry.item.toLocation}`;

              return (
                <div
                  key={`${entry.kind}-${entry.item._id}`}
                  className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white lg:flex-row ${
                    urgent ? 'border-l-[4px] border-l-red-500' : ''
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                      {getInitials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{name}</p>
                      <p className="text-sm text-slate-500">
                        {typeLabel} · {timeAgo(submittedAt)}
                      </p>
                      <div className="mt-2 border-l-2 border-slate-200 pl-3 text-sm text-slate-600">{description}</div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col justify-center px-5 py-4 lg:w-44 lg:px-6">
                    <p className="text-2xl font-bold tracking-tight text-slate-900">{formatCurrency(amount)}</p>
                    {urgent && (
                      <span className="mt-1.5 inline-flex w-fit rounded-md bg-red-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                        Urgent
                      </span>
                    )}
                  </div>

                  <div className="w-full shrink-0 border-t border-slate-100 bg-slate-50 p-4 lg:w-72 lg:border-l lg:border-t-0">
                    <input
                      value={comments[entry.item._id] || ''}
                      onChange={(e) => setComments((prev) => ({ ...prev, [entry.item._id]: e.target.value }))}
                      placeholder="Add a comment (optional)..."
                      className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={actionId === entry.item._id}
                        onClick={() => handleReject(entry)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        {actionId === entry.item._id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <X size={14} />
                        )}
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={actionId === entry.item._id}
                        onClick={() => handleApprove(entry)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-600 disabled:opacity-60"
                      >
                        {actionId === entry.item._id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Approval History</h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <Filter size={16} />
            Filter
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {historyLoading ? (
            <div className="h-40 animate-pulse bg-slate-50" />
          ) : !historyItems.length ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">No approval history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-sm font-semibold text-slate-700">
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        onClick={handleHistorySort}
                        className="inline-flex items-center gap-1 hover:text-slate-900"
                      >
                        Employee
                        <ArrowUpDown size={14} className="text-slate-400" />
                      </button>
                    </th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistoryItems.map((row) => (
                    <tr key={`${row.type}-${row._id}`} className="border-b border-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.employeeName}</td>
                      <td className="px-4 py-3 text-slate-600">{row.type}</td>
                      <td className="px-4 py-3 text-slate-800">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatIsoDate(row.date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${approvalHistoryBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ApprovalQueue;
