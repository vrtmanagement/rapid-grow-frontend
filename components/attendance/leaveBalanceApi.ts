import { API_BASE, getAuthHeaders } from '../../config/api';
import { ensureSocketConnected } from '../../communication/context/communicationContextHelpers';
import { getSocket } from '../../realtime/socket';
import {
  LeaveAdminActivityItem,
  LeaveBalanceOverviewResponse,
  LeavePolicyConfig,
} from './attendanceUtils';

export interface LeaveOverviewQuery {
  employeeEmpId?: string;
  period?: 'month' | 'year';
  month?: string;
  year?: number | string;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function fetchLeaveBalanceOverview(
  query: LeaveOverviewQuery = {},
): Promise<LeaveBalanceOverviewResponse> {
  try {
    const socket = getSocket();
    await ensureSocketConnected(socket, 4000);

    const data = await new Promise<LeaveBalanceOverviewResponse>((resolve, reject) => {
      socket.timeout(5000).emit(
        'leave:overview:fetch',
        {
          employeeEmpId: query.employeeEmpId,
          period: query.period,
          month: query.month,
          year: query.year,
        },
        (error: Error | null, response?: { ok?: boolean; data?: LeaveBalanceOverviewResponse; error?: string }) => {
          if (error) {
            reject(error);
            return;
          }
          if (!response?.ok || !response.data) {
            reject(new Error(response?.error || 'Failed to fetch leave balance overview'));
            return;
          }
          resolve(response.data);
        },
      );
    });

    return data;
  } catch {
    const response = await fetch(
      `${API_BASE}/leaves/balance/overview${buildQuery({
        employeeEmpId: query.employeeEmpId,
        period: query.period,
        month: query.month,
        year: query.year,
      })}`,
      { headers: getAuthHeaders() },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.message || 'Failed to fetch leave balance overview');
    }

    return response.json();
  }
}

export async function fetchLeavePolicies(): Promise<LeavePolicyConfig[]> {
  const response = await fetch(`${API_BASE}/leaves/admin/policies`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || 'Failed to fetch leave policies');
  }

  return response.json();
}

export async function saveLeavePolicy(payload: Record<string, unknown>): Promise<LeavePolicyConfig> {
  const response = await fetch(`${API_BASE}/leaves/admin/policies`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || 'Failed to save leave policy');
  }

  return response.json();
}

export async function createLeaveAdjustment(payload: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/leaves/admin/adjustments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || 'Failed to create leave adjustment');
  }

  return response.json();
}

export async function fetchLeaveActivity(limit = 10): Promise<LeaveAdminActivityItem[]> {
  const response = await fetch(`${API_BASE}/leaves/admin/activity${buildQuery({ limit })}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || 'Failed to fetch leave activity');
  }

  return response.json();
}

export async function downloadLeaveReport(query: LeaveOverviewQuery = {}) {
  const response = await fetch(
    `${API_BASE}/leaves/export${buildQuery({
      employeeEmpId: query.employeeEmpId,
      period: query.period,
      month: query.month,
      year: query.year,
    })}`,
    {
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || 'Failed to export leave report');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  return {
    blob,
    filename: filenameMatch?.[1] || `leave-report-${Date.now()}.csv`,
  };
}
