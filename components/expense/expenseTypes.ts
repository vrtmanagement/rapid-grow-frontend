export type ExpenseCategory =
  | 'TRAVEL'
  | 'FOOD'
  | 'ACCOMMODATION'
  | 'FUEL'
  | 'OFFICE_SUPPLIES'
  | 'CLIENT_MEETING'
  | 'INTERNET'
  | 'OTHER';

export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
export type ExpenseCurrency = 'INR' | 'USD' | 'EUR';
export type TravelStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface EmployeeRef {
  _id: string;
  empName?: string;
  name?: string;
  empId?: string;
  department?: string;
}

export interface ExpenseClaim {
  _id: string;
  employeeId: EmployeeRef | string;
  travelRequestId?: string | { _id: string; purpose: string; fromLocation: string; toLocation: string; status: TravelStatus };
  category: ExpenseCategory;
  amount: number;
  currency?: ExpenseCurrency;
  billableToClient?: boolean;
  description: string;
  expenseDate: string;
  project?: string;
  receiptUrl?: string;
  status: ExpenseStatus;
  extractedVendor?: string;
  extractedAmount?: number | null;
  extractedDate?: string | null;
  extractedTax?: number | null;
  ocrProvider?: string;
  duplicateFlag?: boolean;
  duplicateOverride?: boolean;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  paidAt?: string;
  rejectionReason?: string;
  urgent?: boolean;
  createdAt: string;
  updatedAt: string;
  reimbursement?: Reimbursement;
}

export interface TravelRequest {
  _id: string;
  employeeId: EmployeeRef | string;
  purpose: string;
  fromLocation: string;
  toLocation: string;
  startDate: string;
  endDate: string;
  estimatedCost: number;
  notes?: string;
  status: TravelStatus;
  linkedClaimsCount?: number;
  linkedClaimsTotal?: number;
  linkedClaims?: ExpenseClaim[];
  urgent?: boolean;
  createdAt: string;
}

export interface DepartmentBudget {
  _id: string;
  departmentId: string;
  departmentName: string;
  month: string;
  budgetAmount: number;
  utilizedAmount: number;
  remainingBudget: number;
  utilizationPercent?: number;
}

export interface Reimbursement {
  _id: string;
  expenseClaimId: string | ExpenseClaim;
  employeeId: EmployeeRef | string;
  amount: number;
  transactionReference?: string;
  paymentDate?: string;
  paymentStatus: PaymentStatus;
  notes?: string;
  processedAt?: string;
}

export interface DashboardSummary {
  totalExpensesThisMonth: number;
  pendingReimbursements: number;
  paidReimbursements: number;
  pendingApprovals: number;
  budgetUtilization: number;
  recentClaims: ExpenseClaim[];
  recentTravelRequests: TravelRequest[];
  budgets: DepartmentBudget[];
  analytics: AnalyticsData;
}

export interface AnalyticsData {
  monthlyExpenses: Array<{ month: string; total: number; count: number }>;
  categorySpending: Array<{ category: string; total: number; count: number }>;
  departmentSpending: Array<{ departmentId: string; total: number; count: number }>;
  reimbursementTrends: Array<{ month: string; total: number; count: number }>;
  teamSpending: Array<{ _id: string; total: number; count: number }>;
}

export interface ClaimsSummaryStats {
  totalThisMonth: number;
  totalThisMonthCount: number;
  pendingApproval: number;
  pendingApprovalCount: number;
  reimbursed: number;
  reimbursedCount: number;
  rejected: number;
  rejectedCount: number;
}

export function computeClaimsSummaryFromItems(items: ExpenseClaim[]): ClaimsSummaryStats {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const isCurrentMonth = (value?: string) => {
    if (!value) return false;
    const date = new Date(value);
    return date.getMonth() === month && date.getFullYear() === year;
  };

  const sumAmount = (rows: ExpenseClaim[]) => rows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);

  const monthActive = items.filter(
    (row) =>
      isCurrentMonth(row.expenseDate) &&
      ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID'].includes(row.status),
  );
  const pending = items.filter((row) => row.status === 'SUBMITTED');
  const reimbursed = items.filter((row) => row.status === 'PAID');
  const rejected = items.filter((row) => row.status === 'REJECTED');

  return {
    totalThisMonth: sumAmount(monthActive),
    totalThisMonthCount: monthActive.length,
    pendingApproval: sumAmount(pending),
    pendingApprovalCount: pending.length,
    reimbursed: sumAmount(reimbursed),
    reimbursedCount: reimbursed.length,
    rejected: sumAmount(rejected),
    rejectedCount: rejected.length,
  };
}

export function hasClaimsSummaryData(summary: ClaimsSummaryStats | null | undefined) {
  if (!summary) return false;
  return (
    summary.totalThisMonthCount > 0 ||
    summary.pendingApprovalCount > 0 ||
    summary.reimbursedCount > 0 ||
    summary.rejectedCount > 0
  );
}

export interface ApprovalHistoryItem {
  _id: string;
  employeeName: string;
  department: string;
  type: 'Expense' | 'Travel';
  amount: number;
  date: string;
  status: 'Approved' | 'Rejected';
}

export interface ReportsAnalytics extends AnalyticsData {
  kpis: {
    totalSpendYtd: number;
    totalSpendYtdTrend: number;
    avgSpendPerEmployee: number;
    avgSpendPerEmployeeTrend: number;
    pendingReimbursements: number;
    pendingReimbursementsCount: number;
    policyViolations: number;
    policyViolationsTrend: number;
  };
  monthlySpendTrend: Array<{ month: string; travel: number; hotel: number; meals: number; total: number }>;
  budgetVsActuals: Array<{ month: string; actual: number; budget: number }>;
  topSpenders: Array<{ employeeName: string; department: string; totalSpend: number; expenseCount: number }>;
  spendByCategory: Array<{ category: string; total: number; count: number }>;
  violations: PolicyViolation[];
}

export interface CategoryLimit {
  category: string;
  dailyLimit: number | null;
  perTripLimit: number | null;
  monthlyLimit: number | null;
}

export interface PerDiemRate {
  tier: string;
  label: string;
  amount: number;
}

export interface ExpensePolicy {
  _id: string;
  key: string;
  categoryLimits: CategoryLimit[];
  perDiemRates: PerDiemRate[];
}

export interface PolicyViolation {
  claimId: string;
  employeeName: string;
  category: string;
  expenseDate: string;
  amount: number;
  limit: number;
}

export interface PolicyDashboard {
  policy: ExpensePolicy;
  violations: PolicyViolation[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matches: ExpenseClaim[];
}

export type ExpenseSection = 'claims' | 'travel' | 'reports' | 'approvals' | 'policy';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TRAVEL: 'Travel',
  FOOD: 'Food',
  ACCOMMODATION: 'Accommodation',
  FUEL: 'Fuel',
  OFFICE_SUPPLIES: 'Office Supplies',
  CLIENT_MEETING: 'Client Meeting',
  INTERNET: 'Internet',
  OTHER: 'Other',
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAID: 'Paid',
};

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatIsoDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
}

export function formatTravelDateRange(start?: string, end?: string) {
  if (!start || !end) return '—';
  return `${formatIsoDate(start)} to ${formatIsoDate(end)}`;
}

export function formatCompactCurrency(amount: number) {
  if (amount >= 1_000_000) return `₹${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₹${Math.round(amount / 1_000)}K`;
  return formatCurrency(amount);
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function timeAgo(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function displayExpenseStatus(status: ExpenseStatus) {
  if (status === 'PAID') return 'Reimbursed';
  return EXPENSE_STATUS_LABELS[status];
}

export function travelStatusLabel(status: TravelStatus) {
  switch (status) {
    case 'PENDING':
      return 'Pending Approval';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status;
  }
}

export function getEmployeeName(ref: EmployeeRef | string | undefined) {
  if (!ref || typeof ref === 'string') return '—';
  return ref.empName || ref.name || ref.empId || '—';
}

export function getClaimOwnerId(claim: ExpenseClaim) {
  const ref = claim.employeeId;
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ref._id || '';
}

export function resolveExpenseRowActions(
  claim: ExpenseClaim,
  currentUserId: string,
  options: { isAdmin: boolean; canManageOthers: boolean },
) {
  const isOwner = getClaimOwnerId(claim) === String(currentUserId);
  const isApproved = claim.status === 'APPROVED';

  const showEdit =
    (isOwner && (claim.status === 'DRAFT' || claim.status === 'REJECTED')) ||
    (options.canManageOthers && !isApproved);

  const showSubmit = isOwner && claim.status === 'DRAFT';

  const showDelete =
    (isOwner && (claim.status === 'DRAFT' || claim.status === 'REJECTED')) ||
    (options.isAdmin && claim.status !== 'PAID');

  return {
    showEdit,
    showSubmit,
    showDelete,
    hasActions: showEdit || showSubmit || showDelete,
  };
}

export function statusBadgeClass(status: ExpenseStatus | TravelStatus) {
  switch (status) {
    case 'DRAFT':
      return 'text-slate-500';
    case 'PENDING':
      return 'bg-orange-500 text-white';
    case 'SUBMITTED':
      return 'bg-blue-500 text-white';
    case 'APPROVED':
      return 'bg-emerald-500 text-white';
    case 'REJECTED':
      return 'bg-red-500 text-white';
    case 'PAID':
      return 'bg-violet-500 text-white';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function approvalHistoryBadgeClass(status: 'Approved' | 'Rejected') {
  return status === 'Approved' ? 'bg-teal-500 text-white' : 'bg-red-500 text-white';
}
