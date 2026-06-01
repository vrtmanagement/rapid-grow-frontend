import { API_BASE, getAuthHeaders } from '../../config/api';
import type {
  AnalyticsData,
  ApprovalHistoryItem,
  CategoryLimit,
  ClaimsSummaryStats,
  DashboardSummary,
  DepartmentBudget,
  DuplicateCheckResult,
  ExpenseClaim,
  ExpensePolicy,
  PaginatedResponse,
  PerDiemRate,
  PolicyDashboard,
  Reimbursement,
  ReportsAnalytics,
  TravelRequest,
} from './expenseTypes';

async function expenseJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || 'Request failed') as Error & { duplicates?: unknown };
    if (payload?.duplicates) error.duplicates = payload.duplicates;
    throw error;
  }
  return payload as T;
}

export async function fetchExpenseDashboard() {
  return expenseJson<DashboardSummary>('/expense/dashboard');
}

export async function fetchExpenses(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return expenseJson<PaginatedResponse<ExpenseClaim>>(`/expense${suffix}`);
}

export async function fetchExpenseById(id: string) {
  return expenseJson<ExpenseClaim>(`/expense/${id}`);
}

export async function createExpenseClaim(body: Record<string, unknown>) {
  return expenseJson<ExpenseClaim>('/expense', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateExpenseClaim(id: string, body: Record<string, unknown>) {
  return expenseJson<ExpenseClaim>(`/expense/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteExpenseClaim(id: string) {
  return expenseJson<{ success: boolean }>(`/expense/${id}`, { method: 'DELETE' });
}

export async function uploadExpenseReceipt(id: string, file: File) {
  const formData = new FormData();
  formData.append('receipt', file);
  return expenseJson<ExpenseClaim>(`/expense/${id}/receipt`, { method: 'POST', body: formData });
}

export async function checkExpenseDuplicate(id: string) {
  return expenseJson<DuplicateCheckResult>(`/expense/${id}/duplicate-check`);
}

export async function submitExpenseClaim(id: string, duplicateOverride = false) {
  return expenseJson<ExpenseClaim>(`/expense/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ duplicateOverride }),
  });
}

export async function fetchTravelRequests(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return expenseJson<PaginatedResponse<TravelRequest>>(`/travel${suffix}`);
}

export async function fetchTravelById(id: string) {
  return expenseJson<TravelRequest & { linkedClaims: ExpenseClaim[] }>(`/travel/${id}`);
}

export async function createTravelRequest(body: Record<string, unknown>) {
  return expenseJson<TravelRequest>('/travel', { method: 'POST', body: JSON.stringify(body) });
}

export async function fetchApprovals(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return expenseJson<{ expenses: PaginatedResponse<ExpenseClaim>; travel: PaginatedResponse<TravelRequest> }>(
    `/approvals${suffix}`,
  );
}

export async function approveExpenseClaim(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason = '') {
  return expenseJson<ExpenseClaim>(`/approvals/expense/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, rejectionReason }),
  });
}

export async function approveTravelRequest(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason = '') {
  return expenseJson<TravelRequest>(`/approvals/travel/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, rejectionReason }),
  });
}

export async function fetchBudgets(month?: string) {
  const suffix = month ? `?month=${encodeURIComponent(month)}` : '';
  return expenseJson<{ month: string; items: DepartmentBudget[] }>(`/budget${suffix}`);
}

export async function updateBudget(departmentId: string, body: Record<string, unknown>) {
  return expenseJson<DepartmentBudget>(`/budget/${departmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function fetchExpenseAnalytics() {
  return expenseJson<AnalyticsData>('/expense/analytics');
}

export async function fetchClaimsSummary() {
  return expenseJson<ClaimsSummaryStats>('/expense/summary');
}

export async function fetchReportsAnalytics() {
  return expenseJson<ReportsAnalytics>('/expense/reports');
}

export async function fetchPolicyDashboard() {
  return expenseJson<PolicyDashboard>('/expense/policy');
}

export async function updateExpensePolicy(body: {
  categoryLimits?: CategoryLimit[];
  perDiemRates?: PerDiemRate[];
}) {
  return expenseJson<ExpensePolicy>('/expense/policy', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function fetchApprovalHistory(limit = 20) {
  return expenseJson<{ items: ApprovalHistoryItem[] }>(`/approvals/history?limit=${limit}`);
}

export async function fetchReimbursements(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return expenseJson<PaginatedResponse<Reimbursement>>(`/reimbursement${suffix}`);
}

export async function updateReimbursement(claimId: string, body: Record<string, unknown>) {
  return expenseJson<Reimbursement>(`/reimbursement/${claimId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function markReimbursementPaid(claimId: string, body: Record<string, unknown>) {
  return expenseJson<{ claim: ExpenseClaim; reimbursement: Reimbursement }>(`/reimbursement/${claimId}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
