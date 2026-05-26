export interface AttendanceEmployeeOption {
  empId: string;
  empName: string;
  role: string;
  avatar?: string;
  designation?: string;
  department?: string;
}

export interface TeamAttendanceSummary {
  total: number;
  present: number;
  absent: number;
  clockedIn?: number;
  onBreak?: number;
  members?: TeamAttendanceMemberActivity[];
  activityLog?: TeamAttendanceLogEntry[];
}

export type TeamAttendanceActivityType =
  | 'checked_in'
  | 'break_started'
  | 'work_resumed'
  | 'checked_out'
  | 'absent';

export interface TeamAttendanceMemberActivity {
  empId: string;
  empName: string;
  avatar?: string;
  role?: string;
  designation?: string;
  department?: string;
  location?: string;
  loginTime?: string | null;
  logoutTime?: string | null;
  breakStartedAt?: string | null;
  lastActivityAt?: string | null;
  lastActivityType?: TeamAttendanceActivityType;
  workingMinutes?: number;
  status: 'clocked_in' | 'on_break' | 'checked_out' | 'absent';
}

export interface TeamAttendanceLogEntry {
  id: string;
  empId: string;
  empName: string;
  avatar?: string;
  role?: string;
  designation?: string;
  department?: string;
  location?: string;
  activityAt: string;
  activityType: TeamAttendanceActivityType;
  workingMinutes?: number;
  breakDurationSeconds?: number;
  status: 'clocked_in' | 'on_break' | 'checked_out' | 'absent';
}

export function projectTeamAttendanceSummary(
  summary?: TeamAttendanceSummary | null,
  referenceTime: Date = new Date(),
  snapshotTime?: number | null,
): TeamAttendanceSummary | null {
  if (!summary || !snapshotTime) return summary || null;

  const elapsedMinutes = Math.max(0, Math.floor((referenceTime.getTime() - snapshotTime) / 60000));
  if (elapsedMinutes <= 0) return summary;

  let changed = false;
  const members = (summary.members ?? []).map((member) => {
    if (member.status !== 'clocked_in') {
      return member;
    }

    changed = true;
    return {
      ...member,
      workingMinutes: Math.max(0, member.workingMinutes || 0) + elapsedMinutes,
    };
  });

  if (!changed) {
    return summary;
  }

  const memberByEmpId = new Map(members.map((member) => [member.empId, member]));
  const activityLog = (summary.activityLog ?? []).map((entry) => {
    const member = memberByEmpId.get(entry.empId);
    const isLatestLiveEntry =
      entry.status === 'clocked_in' &&
      member?.status === 'clocked_in' &&
      member?.lastActivityAt === entry.activityAt;

    if (!isLatestLiveEntry) {
      return entry;
    }

    return {
      ...entry,
      workingMinutes: member?.workingMinutes,
    };
  });

  return {
    ...summary,
    members,
    activityLog,
  };
}

export interface LeaveActorProfile {
  empName: string;
  empId: string;
  designation?: string;
  department?: string;
}

interface ParsedAttendanceCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
}

const locationLabelCache = new Map<string, string>();

function normalizeLocationText(value: string) {
  return value.replace(/\s+/g, ' ').replace(/Â/g, '').trim();
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

export function parseAttendanceCoordinates(value?: string | null): ParsedAttendanceCoordinates | null {
  const raw = normalizeLocationText(String(value || ''));
  if (!raw) return null;

  const latMatch = raw.match(/Lat:\s*(-?\d+(?:\.\d+)?)/i);
  const lngMatch = raw.match(/Lng:\s*(-?\d+(?:\.\d+)?)/i);
  if (!latMatch || !lngMatch) return null;

  const latitude = Number(latMatch[1]);
  const longitude = Number(lngMatch[1]);
  const accuracyMatch = raw.match(/[±\+\-]?\s*(\d+(?:\.\d+)?)\s*m/i);
  const accuracyMeters = accuracyMatch ? Number(accuracyMatch[1]) : null;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    accuracyMeters: Number.isFinite(accuracyMeters) ? accuracyMeters : null,
  };
}

function buildReadableLocationLabel(payload: any, fallback: string) {
  const address = payload?.address || {};
  const featureCandidates = [
    payload?.name,
    payload?.display_name?.split(',')?.[0],
    address?.amenity,
    address?.building,
    address?.house_name,
    address?.road,
    address?.neighbourhood,
    address?.suburb,
  ];
  const localityCandidates = [
    address?.city,
    address?.town,
    address?.village,
    address?.hamlet,
    address?.municipality,
    address?.county,
    address?.state_district,
  ];
  const regionCandidates = [address?.state, address?.country];

  const parts = [...featureCandidates, ...localityCandidates, ...regionCandidates]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .filter((part, index, items) => items.findIndex((item) => item.toLowerCase() === part.toLowerCase()) === index)
    .slice(0, 4);

  return parts.length ? parts.join(', ') : fallback;
}

async function reverseGeocodeAttendanceCoordinates(coords: ParsedAttendanceCoordinates, fallback: string) {
  const cacheKey = `${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`;
  if (locationLabelCache.has(cacheKey)) {
    return locationLabelCache.get(cacheKey) || fallback;
  }

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(coords.latitude),
      lon: String(coords.longitude),
      zoom: '18',
      addressdetails: '1',
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: {
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json();
    const resolved = buildReadableLocationLabel(payload, fallback);
    locationLabelCache.set(cacheKey, resolved);
    return resolved;
  } catch {
    return fallback;
  }
}

export async function resolveAttendanceLocationLabel(value?: string | null): Promise<string> {
  const raw = normalizeLocationText(String(value || ''));
  if (!raw) return 'Not set';

  if (locationLabelCache.has(raw)) {
    return locationLabelCache.get(raw) || raw;
  }

  const coordinates = parseAttendanceCoordinates(raw);
  if (!coordinates) {
    locationLabelCache.set(raw, raw);
    return raw;
  }

  const fallback = `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`;
  const resolved = await reverseGeocodeAttendanceCoordinates(coordinates, fallback);
  locationLabelCache.set(raw, resolved);
  return resolved;
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
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const coordinateLabel = `Lat:${latitude.toFixed(6)}, Lng:${longitude.toFixed(6)}, ±${Math.round(accuracy || 0)}m`;
        const readableLocation = await resolveAttendanceLocationLabel(coordinateLabel);
        resolve(readableLocation || coordinateLabel);
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}
