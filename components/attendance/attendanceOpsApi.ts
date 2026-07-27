import { API_BASE, getAuthHeaders } from '../../config/api';

function buildQuery(params: Record<string, string | number | undefined | null> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export interface OrgAttendanceEmployeeRow {
  empId: string;
  empName: string;
  role: string;
  designation: string;
  department: string;
  coveredDays?: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  holidayDays: number;
  weekendDays: number;
  sundayDays?: number;
  lateDays: number;
  workingDays: number;
  presenceRate: number;
  dayStatuses: Record<string, string>;
}

export interface OrgAttendanceReport {
  month: string;
  timezone: string;
  department: string | null;
  asOfDateKey?: string;
  coveredDays?: number;
  isMonthToDate?: boolean;
  isFutureMonth?: boolean;
  dateKeys: string[];
  totals: {
    employees: number;
    coveredDays?: number;
    workingDays?: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    holidayDays: number;
    sundayDays?: number;
    lateDays: number;
    presenceRate: number;
  };
  departments: Array<{
    department: string;
    employees: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    lateDays: number;
  }>;
  employees: OrgAttendanceEmployeeRow[];
  holidays: Array<{ dateKey: string; name: string; isOptional: boolean }>;
}

export interface CompanyHoliday {
  id: string;
  dateKey: string;
  name: string;
  isOptional: boolean;
  createdByEmpId?: string;
  createdAt?: string | null;
}

export interface AttendanceOpsSettings {
  key: string;
  officeStartHour: number;
  officeStartMinute: number;
  officeStartTime: string;
  officeStartLabel: string;
  timezone: string;
  whatsappReminderEnabled: boolean;
  reminderGraceMinutes: number;
  reminderMessage: string;
  skipWeekends: boolean;
  whatsappConfigured: boolean;
  updatedAt?: string | null;
  updatedByEmpId?: string;
}

export interface AttendanceRegularization {
  id: string;
  empId: string;
  empName?: string;
  department?: string;
  designation?: string;
  dateKey: string;
  reason: string;
  requestType: string;
  proposedLoginTime?: string | null;
  proposedLogoutTime?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  decidedByEmpId?: string;
  decidedAt?: string | null;
  decisionNote?: string;
  createdAt?: string | null;
}

async function parseError(response: Response, fallback: string) {
  const error = await response.json().catch(() => ({}));
  throw new Error((error as { message?: string })?.message || fallback);
}

export async function fetchOrgAttendanceReport(query: {
  month: string;
  department?: string;
}): Promise<OrgAttendanceReport> {
  const response = await fetch(
    `${API_BASE}/attendance/report${buildQuery(query)}`,
    { headers: getAuthHeaders() },
  );
  if (!response.ok) await parseError(response, 'Failed to load attendance report');
  return response.json();
}

export async function downloadOrgAttendanceReport(query: {
  month: string;
  department?: string;
}) {
  const response = await fetch(
    `${API_BASE}/attendance/export${buildQuery(query)}`,
    { headers: getAuthHeaders() },
  );
  if (!response.ok) await parseError(response, 'Failed to export attendance report');
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  return {
    blob,
    filename: filenameMatch?.[1] || `attendance-report-${query.month}.csv`,
  };
}

export async function fetchHolidays(year?: number): Promise<CompanyHoliday[]> {
  const response = await fetch(
    `${API_BASE}/attendance/holidays${buildQuery({ year })}`,
    { headers: getAuthHeaders() },
  );
  if (!response.ok) await parseError(response, 'Failed to load holidays');
  return response.json();
}

export async function createHoliday(payload: {
  dateKey: string;
  name: string;
  isOptional?: boolean;
}): Promise<CompanyHoliday> {
  const response = await fetch(`${API_BASE}/attendance/holidays`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Failed to create holiday');
  return response.json();
}

export async function deleteHoliday(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/attendance/holidays/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to delete holiday');
}

export async function fetchAttendanceOpsSettings(): Promise<AttendanceOpsSettings> {
  const response = await fetch(`${API_BASE}/attendance/ops-settings`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to load attendance settings');
  return response.json();
}

export async function updateAttendanceOpsSettings(
  payload: Partial<{
    officeStartTime: string;
    whatsappReminderEnabled: boolean;
    reminderGraceMinutes: number;
    reminderMessage: string;
    skipWeekends: boolean;
    timezone: string;
  }>,
): Promise<AttendanceOpsSettings> {
  const response = await fetch(`${API_BASE}/attendance/ops-settings`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Failed to update attendance settings');
  return response.json();
}

export async function runLoginReminderNow() {
  const response = await fetch(`${API_BASE}/attendance/ops-settings/run-login-reminder`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to run login reminders');
  return response.json();
}

export async function fetchRegularizations(query: {
  scope?: 'me' | 'team';
  status?: string;
} = {}): Promise<AttendanceRegularization[]> {
  const response = await fetch(
    `${API_BASE}/attendance/regularizations${buildQuery(query)}`,
    { headers: getAuthHeaders() },
  );
  if (!response.ok) await parseError(response, 'Failed to load regularizations');
  return response.json();
}

export async function createRegularization(payload: {
  dateKey: string;
  reason: string;
  requestType?: string;
  proposedLoginTime?: string;
  proposedLogoutTime?: string;
}): Promise<AttendanceRegularization> {
  const response = await fetch(`${API_BASE}/attendance/regularizations`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Failed to create regularization');
  return response.json();
}

export async function decideRegularization(
  id: string,
  payload: { status: 'APPROVED' | 'REJECTED'; decisionNote?: string },
): Promise<AttendanceRegularization> {
  const response = await fetch(`${API_BASE}/attendance/regularizations/${id}`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response, 'Failed to update regularization');
  return response.json();
}

export async function deleteRegularization(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/attendance/regularizations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to delete regularization');
}

export async function clearRegularizations(status?: string): Promise<{ deletedCount: number }> {
  const response = await fetch(
    `${API_BASE}/attendance/regularizations${buildQuery({ status })}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    },
  );
  if (!response.ok) await parseError(response, 'Failed to clear regularizations');
  return response.json();
}

export async function deleteLateLoginRecord(recordId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/attendance/late-login/records/${recordId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) await parseError(response, 'Failed to delete late login record');
}

export async function clearLateLoginRecords(dateKey?: string): Promise<{
  deletedAttempts: number;
  deletedApprovals: number;
}> {
  const response = await fetch(
    `${API_BASE}/attendance/late-login/records${buildQuery({ dateKey })}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    },
  );
  if (!response.ok) await parseError(response, 'Failed to clear late login records');
  return response.json();
}
