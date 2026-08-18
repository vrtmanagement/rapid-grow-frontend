import { API_BASE, getAuthHeaders } from '../config/api';
import {
  normalizeUserTimeZone,
  persistUserTimeZone,
  setUserTimeZone,
  type TimezoneOption,
} from '../utils/timezone';

export interface UserTimezonePayload {
  timezone: string;
}

export async function fetchUserTimezone(): Promise<string> {
  const res = await fetch(`${API_BASE}/notifications/settings/timezone`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load time zone');
  }
  const timezone = normalizeUserTimeZone((data as UserTimezonePayload)?.timezone);
  persistUserTimeZone(timezone);
  return timezone;
}

export async function saveUserTimezone(timezone: string): Promise<string> {
  const res = await fetch(`${API_BASE}/notifications/settings/timezone`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ timezone }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update time zone');
  }
  const nextTimezone = normalizeUserTimeZone((data as UserTimezonePayload)?.timezone || timezone);
  setUserTimeZone(nextTimezone);
  return nextTimezone;
}

export function describeTimezoneOption(option?: TimezoneOption | null) {
  if (!option) return '';
  return `${option.label} (${option.abbr})`;
}
