import {
  fetchTabEndpoint,
  readHydratedTabEndpoint,
} from './tabSessionCache';

const APP_BOOTSTRAP_TAB = 'app-shell';
const APP_BOOTSTRAP_PATH = '/app/bootstrap';

export type AppBootstrapResponse = {
  permissions: { role: string; permissions: string[] };
  employee: Record<string, unknown> | null;
  taskUnreadCount: { userId: string; unreadCount: number };
  notifications: Array<Record<string, unknown>>;
  goals: Array<Record<string, unknown>> | null;
};

export type AttendanceBootstrapResponse = {
  summary: Record<string, unknown>;
  leaveBalanceOverview: Record<string, unknown> | null;
  leaves: {
    myLeaves: unknown[];
    pendingLeaves: unknown[];
    approverLeaves: unknown[];
  };
  teamSummary: Record<string, unknown> | null;
  members: unknown[] | null;
  canReviewTeamAttendance: boolean;
  isApproverRole: boolean;
};

let appBootstrapInflight: Promise<AppBootstrapResponse> | null = null;
let attendanceBootstrapInflight: Promise<AttendanceBootstrapResponse> | null = null;
let attendanceBootstrapKey = '';

export function fetchAppBootstrap(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = readHydratedTabEndpoint<AppBootstrapResponse>(APP_BOOTSTRAP_TAB, APP_BOOTSTRAP_PATH);
    if (cached) return Promise.resolve(cached);
    if (appBootstrapInflight) return appBootstrapInflight;
  }

  appBootstrapInflight = fetchTabEndpoint<AppBootstrapResponse>(APP_BOOTSTRAP_TAB, APP_BOOTSTRAP_PATH, options).finally(
    () => {
      appBootstrapInflight = null;
    },
  );

  return appBootstrapInflight;
}

export function fetchAttendanceBootstrap(
  query: { range?: string; date?: string } = {},
  options?: { force?: boolean },
) {
  const params = new URLSearchParams();
  if (query.range) params.set('range', query.range);
  if (query.date) params.set('date', query.date);
  const suffix = params.toString();
  const path = `/attendance/bootstrap${suffix ? `?${suffix}` : ''}`;
  const cacheKey = path;

  if (!options?.force) {
    const cached = readHydratedTabEndpoint<AttendanceBootstrapResponse>('attendance', path);
    if (cached) return Promise.resolve(cached);
    if (attendanceBootstrapInflight && attendanceBootstrapKey === cacheKey) {
      return attendanceBootstrapInflight;
    }
  }

  attendanceBootstrapKey = cacheKey;
  attendanceBootstrapInflight = fetchTabEndpoint<AttendanceBootstrapResponse>('attendance', path, options).finally(
    () => {
      attendanceBootstrapInflight = null;
      attendanceBootstrapKey = '';
    },
  );

  return attendanceBootstrapInflight;
}
