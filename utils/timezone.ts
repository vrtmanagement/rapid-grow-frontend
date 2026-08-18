export const DEFAULT_USER_TIMEZONE = 'Asia/Kolkata';
export const USER_TIMEZONE_UPDATED_EVENT = 'rapidgrow:user-timezone-updated';
const USER_TIMEZONE_STORAGE_PREFIX = 'rapidgrow-user-timezone';

export interface TimezoneOption {
  value: string;
  label: string;
  abbr: string;
}

export interface TimezoneGroup {
  label: string;
  options: TimezoneOption[];
}

export const TIMEZONE_GROUPS: TimezoneGroup[] = [
  {
    label: 'United States',
    options: [
      { value: 'America/New_York', label: 'Eastern Time', abbr: 'ET / EST / EDT' },
      { value: 'America/Chicago', label: 'Central Time', abbr: 'CT / CST / CDT' },
      { value: 'America/Denver', label: 'Mountain Time', abbr: 'MT / MST / MDT' },
      { value: 'America/Los_Angeles', label: 'Pacific Time', abbr: 'PT / PST / PDT' },
      { value: 'America/Phoenix', label: 'Arizona', abbr: 'MST' },
      { value: 'America/Anchorage', label: 'Alaska Time', abbr: 'AKT' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time', abbr: 'HST' },
    ],
  },
  {
    label: 'Canada & Americas',
    options: [
      { value: 'America/Toronto', label: 'Toronto', abbr: 'ET' },
      { value: 'America/Mexico_City', label: 'Mexico City', abbr: 'CST' },
      { value: 'America/Sao_Paulo', label: 'Sao Paulo', abbr: 'BRT' },
    ],
  },
  {
    label: 'India & Gulf',
    options: [
      { value: 'Asia/Kolkata', label: 'India Standard Time', abbr: 'IST' },
      { value: 'Asia/Colombo', label: 'Sri Lanka', abbr: 'IST' },
      { value: 'Asia/Karachi', label: 'Pakistan', abbr: 'PKT' },
      { value: 'Asia/Dhaka', label: 'Bangladesh', abbr: 'BST' },
      { value: 'Asia/Kathmandu', label: 'Nepal', abbr: 'NPT' },
      { value: 'Asia/Dubai', label: 'Gulf Standard Time', abbr: 'GST' },
      { value: 'Asia/Qatar', label: 'Qatar', abbr: 'AST' },
      { value: 'Asia/Riyadh', label: 'Saudi Arabia', abbr: 'AST' },
      { value: 'Asia/Kuwait', label: 'Kuwait', abbr: 'AST' },
      { value: 'Asia/Bahrain', label: 'Bahrain', abbr: 'AST' },
      { value: 'Asia/Muscat', label: 'Oman', abbr: 'GST' },
    ],
  },
  {
    label: 'Europe',
    options: [
      { value: 'UTC', label: 'Coordinated Universal Time', abbr: 'UTC' },
      { value: 'Europe/London', label: 'London', abbr: 'GMT / BST' },
      { value: 'Europe/Dublin', label: 'Dublin', abbr: 'IST / GMT' },
      { value: 'Europe/Paris', label: 'Paris', abbr: 'CET / CEST' },
      { value: 'Europe/Berlin', label: 'Berlin', abbr: 'CET / CEST' },
      { value: 'Europe/Amsterdam', label: 'Amsterdam', abbr: 'CET / CEST' },
      { value: 'Europe/Madrid', label: 'Madrid', abbr: 'CET / CEST' },
      { value: 'Europe/Rome', label: 'Rome', abbr: 'CET / CEST' },
      { value: 'Europe/Moscow', label: 'Moscow', abbr: 'MSK' },
    ],
  },
  {
    label: 'Africa',
    options: [
      { value: 'Africa/Cairo', label: 'Cairo', abbr: 'EET' },
      { value: 'Africa/Johannesburg', label: 'Johannesburg', abbr: 'SAST' },
      { value: 'Africa/Lagos', label: 'Lagos', abbr: 'WAT' },
      { value: 'Africa/Nairobi', label: 'Nairobi', abbr: 'EAT' },
    ],
  },
  {
    label: 'Asia Pacific',
    options: [
      { value: 'Asia/Singapore', label: 'Singapore', abbr: 'SGT' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong', abbr: 'HKT' },
      { value: 'Asia/Shanghai', label: 'China Standard Time', abbr: 'CST' },
      { value: 'Asia/Tokyo', label: 'Japan Standard Time', abbr: 'JST' },
      { value: 'Asia/Seoul', label: 'Korea Standard Time', abbr: 'KST' },
      { value: 'Asia/Bangkok', label: 'Bangkok', abbr: 'ICT' },
      { value: 'Asia/Jakarta', label: 'Jakarta', abbr: 'WIB' },
      { value: 'Asia/Manila', label: 'Manila', abbr: 'PHT' },
      { value: 'Australia/Sydney', label: 'Sydney', abbr: 'AEST' },
      { value: 'Australia/Melbourne', label: 'Melbourne', abbr: 'AEST' },
      { value: 'Australia/Perth', label: 'Perth', abbr: 'AWST' },
      { value: 'Pacific/Auckland', label: 'Auckland', abbr: 'NZST' },
    ],
  },
];

export const TIMEZONE_OPTIONS: TimezoneOption[] = TIMEZONE_GROUPS.flatMap((group) => group.options);

const ALLOWED_TIMEZONES = new Set(TIMEZONE_OPTIONS.map((option) => option.value));

let currentUserTimeZone = DEFAULT_USER_TIMEZONE;
const listeners = new Set<(timeZone: string) => void>();

function getSessionEmployee(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('rapidgrow-admin');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.employee && typeof parsed.employee === 'object' ? parsed.employee : null;
  } catch {
    return null;
  }
}

function getTimezoneOwnerKey(): string {
  const employee = getSessionEmployee();
  const empId = String(employee?.empId || '').trim();
  const userId = String(employee?._id || employee?.id || '').trim();
  return empId || userId || 'anonymous';
}

function storageKeyForOwner(ownerKey = getTimezoneOwnerKey()) {
  return `${USER_TIMEZONE_STORAGE_PREFIX}:${ownerKey}`;
}

export function isValidUserTimeZone(value?: string | null): boolean {
  const timezone = String(value || '').trim();
  if (!timezone) return false;
  if (ALLOWED_TIMEZONES.has(timezone)) return true;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeUserTimeZone(value?: string | null, fallback = DEFAULT_USER_TIMEZONE): string {
  const timezone = String(value || '').trim();
  return isValidUserTimeZone(timezone) ? timezone : fallback;
}

export function getTimezoneOption(value?: string | null): TimezoneOption | undefined {
  const timezone = normalizeUserTimeZone(value);
  return TIMEZONE_OPTIONS.find((option) => option.value === timezone);
}

export function getUserTimeZone(): string {
  return currentUserTimeZone || DEFAULT_USER_TIMEZONE;
}

export function readStoredUserTimeZone(): string {
  if (typeof window === 'undefined') return DEFAULT_USER_TIMEZONE;
  const employee = getSessionEmployee();
  const fromSession = normalizeUserTimeZone(String(employee?.timezone || ''), '');
  if (fromSession) return fromSession;
  try {
    const stored = window.localStorage.getItem(storageKeyForOwner());
    return normalizeUserTimeZone(stored);
  } catch {
    return DEFAULT_USER_TIMEZONE;
  }
}

export function persistUserTimeZone(timeZone: string) {
  const normalized = normalizeUserTimeZone(timeZone);
  currentUserTimeZone = normalized;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKeyForOwner(), normalized);
  } catch {
    // Ignore storage failures so the in-memory timezone still applies.
  }
  try {
    const raw = window.localStorage.getItem('rapidgrow-admin');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.employee = {
      ...(parsed.employee || {}),
      timezone: normalized,
    };
    window.localStorage.setItem('rapidgrow-admin', JSON.stringify(parsed));
  } catch {
    // Ignore session persistence failures.
  }
}

export function setUserTimeZone(timeZone: string, options?: { broadcast?: boolean }) {
  const normalized = normalizeUserTimeZone(timeZone);
  persistUserTimeZone(normalized);
  listeners.forEach((listener) => listener(normalized));
  if (options?.broadcast === false || typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(USER_TIMEZONE_UPDATED_EVENT, {
      detail: { timezone: normalized },
    }),
  );
}

export function subscribeUserTimeZone(listener: (timeZone: string) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function formatInUserTimeZone(
  value?: string | Date | null,
  options?: Intl.DateTimeFormatOptions,
  fallback = '-',
) {
  if (!value) return fallback;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleString('en-US', {
    hour12: true,
    ...options,
    timeZone: getUserTimeZone(),
  });
}

export function formatDateInUserTimeZone(value?: string | Date | null, options?: Intl.DateTimeFormatOptions) {
  return formatInUserTimeZone(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  });
}

export function formatTimeInUserTimeZone(value?: string | Date | null) {
  return formatInUserTimeZone(
    value,
    {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    },
    '--',
  );
}

export function formatDateTimeInUserTimeZone(value?: string | Date | null) {
  return formatInUserTimeZone(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

currentUserTimeZone = typeof window === 'undefined' ? DEFAULT_USER_TIMEZONE : readStoredUserTimeZone();
