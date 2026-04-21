export interface AttendanceEmployeeOption {
  empId: string;
  empName: string;
  role: string;
  designation?: string;
  department?: string;
}

export interface TeamAttendanceSummary {
  total: number;
  present: number;
  absent: number;
}

export interface LeaveActorProfile {
  empName: string;
  empId: string;
  designation?: string;
  department?: string;
}

export function readStoredLeaveNotificationState(storageKey: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getDefaultMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getLocalDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface AttendanceBackendContext {
  backendRole: string | null;
  backendEmpId: string;
  isBackendAdminRole: boolean;
  isBackendApproverRole: boolean;
  leaveViewerRole: 'employee' | 'team_lead' | 'admin';
}

export function parseAttendanceBackendContext(): AttendanceBackendContext {
  const rawAdmin = typeof window !== 'undefined' ? localStorage.getItem('rapidgrow-admin') : null;
  let backendRole: string | null = null;
  let backendEmpId = '';
  if (rawAdmin) {
    try {
      const parsed = JSON.parse(rawAdmin);
      backendRole = parsed?.employee?.role || null;
      backendEmpId = String(parsed?.employee?.empId || '').trim();
    } catch {
      backendRole = null;
      backendEmpId = '';
    }
  }

  const isBackendAdminRole = backendRole === 'ADMIN' || backendRole === 'SUPER_ADMIN';
  const isBackendApproverRole = isBackendAdminRole || backendRole === 'TEAM_LEAD';
  const leaveViewerRole: 'employee' | 'team_lead' | 'admin' = isBackendAdminRole
    ? 'admin'
    : backendRole === 'TEAM_LEAD'
      ? 'team_lead'
      : 'employee';

  return {
    backendRole,
    backendEmpId,
    isBackendAdminRole,
    isBackendApproverRole,
    leaveViewerRole,
  };
}

export async function getBrowserGeolocationDescription(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const desc = `Lat:${latitude.toFixed(6)}, Lng:${longitude.toFixed(6)}, ±${Math.round(accuracy || 0)}m`;
        resolve(desc);
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}
