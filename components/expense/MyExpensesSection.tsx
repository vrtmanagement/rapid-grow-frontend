import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Download,
  FileImage,
  FileText,
  Filter,
  Search,
} from 'lucide-react';
import type { ClaimsSummaryStats, ExpenseClaim, ExpenseStatus } from './expenseTypes';
import {
  EXPENSE_CATEGORY_LABELS,
  displayExpenseStatus,
  formatCurrency,
  formatIsoDate,
  getEmployeeName,
  statusBadgeClass,
} from './expenseTypes';
import { deleteExpenseClaim, submitExpenseClaim } from './expenseApi';
import ExpenseRowActionMenu from './ExpenseRowActionMenu';
type StatusFilter = 'ALL' | 'DRAFT' | 'SUBMITTED' | 'APPROVED';
type ExpenseSortField = 'date' | 'category' | 'amount';
type SortDirection = 'asc' | 'desc';

interface MyExpensesSectionProps {
  items: ExpenseClaim[];
  summary: ClaimsSummaryStats | null;
  loading?: boolean;
  showEmployee?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  canManageOthers?: boolean;
  onEdit?: (claim: ExpenseClaim) => void;
  onUpdated?: () => void;
}

const summaryCards = (summary: ClaimsSummaryStats | null) => [
  { label: 'Total This Month', value: summary?.totalThisMonth || 0, count: summary?.totalThisMonthCount || 0 },
  { label: 'Pending Approval', value: summary?.pendingApproval || 0, count: summary?.pendingApprovalCount || 0 },
  { label: 'Reimbursed', value: summary?.reimbursed || 0, count: summary?.reimbursedCount || 0 },
  { label: 'Rejected', value: summary?.rejected || 0, count: summary?.rejectedCount || 0 },
];

const tabs: Array<{ id: StatusFilter; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'APPROVED', label: 'Approved' },
];

function claimStatusBadgeClass(status: ExpenseStatus) {
  if (status === 'DRAFT') return 'bg-slate-200 text-slate-700';
  return statusBadgeClass(status);
}

function isPdfReceipt(url: string) {
  const lower = url.toLowerCase();
  return lower.includes('.pdf') || lower.includes('/raw/upload') || lower.includes('format=pdf');
}

const MyExpensesSection: React.FC<MyExpensesSectionProps> = ({
  items,
  summary,
  loading = false,
  showEmployee = false,
  currentUserId = '',
  isAdmin = false,
  canManageOthers = false,
  onEdit,
  onUpdated,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortField, setSortField] = useState<ExpenseSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((claim) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        claim.status === statusFilter ||
        (statusFilter === 'APPROVED' && (claim.status === 'APPROVED' || claim.status === 'PAID'));
      if (!matchesStatus) return false;
      if (!term) return true;
      const haystack = [
        claim.description,
        claim.extractedVendor,
        EXPENSE_CATEGORY_LABELS[claim.category],
        getEmployeeName(claim.employeeId as never),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [items, search, statusFilter]);

  const handleSort = (field: ExpenseSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems;
    const sorted = [...filteredItems];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime();
      } else if (sortField === 'category') {
        const labelA = EXPENSE_CATEGORY_LABELS[a.category] || a.category;
        const labelB = EXPENSE_CATEGORY_LABELS[b.category] || b.category;
        cmp = labelA.localeCompare(labelB, undefined, { sensitivity: 'base' });
      } else {
        cmp = (Number(a.amount) || 0) - (Number(b.amount) || 0);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredItems, sortField, sortDirection]);

  const closeActionMenu = () => {
    setOpenMenuId(null);
  };

  const handleMenuToggle = (claimId: string) => {
    setOpenMenuId((prev) => (prev === claimId ? null : claimId));
  };

  const handleSubmit = async (claim: ExpenseClaim) => {
    closeActionMenu();
    setActionLoadingId(claim._id);
    try {
      await submitExpenseClaim(claim._id);
      onUpdated?.();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (claim: ExpenseClaim) => {
    closeActionMenu();
    if (!window.confirm('Delete this expense claim?')) return;
    setActionLoadingId(claim._id);
    try {
      await deleteExpenseClaim(claim._id);
      onUpdated?.();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl bg-slate-50/80 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards(summary).map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <p className="text-sm text-slate-500">{card.label}</p>
              <span className="rounded-full bg-[#EEF1F4] px-3 py-1 text-xs font-medium text-[#5E6C84]">
                {card.count} items
              </span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="inline-flex shrink-0 items-center rounded-full bg-slate-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-300"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50">
              <Filter size={18} />
            </button>
            <button type="button" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50">
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : !filteredItems.length ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">You have not created any expense claims yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-sm font-semibold text-slate-700">
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('date')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Date
                      <ArrowUpDown size={14} className="text-slate-400" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('category')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Category
                      <ArrowUpDown size={14} className="text-slate-400" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Description</th>
                  {showEmployee && <th className="px-4 py-3">Employee</th>}
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('amount')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Amount
                      <ArrowUpDown size={14} className="text-slate-400" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((claim) => {
                  const isPdf = claim.receiptUrl ? isPdfReceipt(claim.receiptUrl) : false;
                  const isBusy = actionLoadingId === claim._id;

                  return (
                    <tr key={claim._id} className="border-b border-slate-50 hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-slate-600">{formatIsoDate(claim.expenseDate)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {EXPENSE_CATEGORY_LABELS[claim.category] || claim.category}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">
                        {claim.description || claim.extractedVendor || '—'}
                      </td>
                      {showEmployee && (
                        <td className="px-4 py-3 text-slate-600">{getEmployeeName(claim.employeeId as never)}</td>
                      )}
                      <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(claim.amount)}</td>
                      <td className="px-4 py-3">
                        {claim.receiptUrl ? (
                          <a
                            href={claim.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View receipt"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            {isPdf ? <FileText size={18} /> : <FileImage size={18} />}
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${claimStatusBadgeClass(claim.status)}`}
                        >
                          {displayExpenseStatus(claim.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ExpenseRowActionMenu
                          claim={claim}
                          currentUserId={currentUserId}
                          isAdmin={isAdmin}
                          canManageOthers={canManageOthers}
                          isOpen={openMenuId === claim._id}
                          isBusy={isBusy}
                          onToggle={() => handleMenuToggle(claim._id)}
                          onClose={closeActionMenu}
                          onEdit={onEdit}
                          onSubmit={handleSubmit}
                          onDelete={handleDelete}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyExpensesSection;
