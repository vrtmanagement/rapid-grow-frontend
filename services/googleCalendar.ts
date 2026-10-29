export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  htmlLink?: string;
  hangoutLink?: string;
  location?: string;
  description?: string;
  status?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
  conferenceData?: {
    entryPoints?: Array<{ entryPointType?: string; uri?: string; label?: string }>;
  };
}

export type CreateGoogleCalendarEventInput = {
  summary: string;
  description?: string;
  location?: string;
  /** Meeting / video link (stored in description + location when not using Google Meet) */
  meetingLink?: string;
  /** Comma or newline separated guest emails */
  guestEmails?: string;
  addGoogleMeet?: boolean;
  allDay: boolean;
  /** Local calendar start date YYYY-MM-DD */
  dateKey: string;
  /** Local calendar end date YYYY-MM-DD (inclusive for UI; converted to exclusive for all-day) */
  endDateKey?: string;
  /** HH:mm when allDay is false */
  startTime?: string;
  /** HH:mm when allDay is false */
  endTime?: string;
  /** Minutes before start for a popup reminder; omit for Google default */
  reminderMinutes?: number | null;
};

type TokenResponse = { access_token?: string; expires_in?: number; error?: string };
interface GoogleIdentity {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback: () => void;
      }) => { requestAccessToken: (override?: { prompt?: string }) => void };
    };
  };
}

const GOOGLE_CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const identity = () => (window as Window & { google?: GoogleIdentity }).google;
let loadingIdentity: Promise<void> | undefined;

export function loadGoogleIdentity(): Promise<void> {
  if (identity()?.accounts?.oauth2) return Promise.resolve();
  if (loadingIdentity) return loadingIdentity;
  loadingIdentity = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    const timeout = window.setTimeout(() => fail(), 15000);
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      loadingIdentity = undefined;
      reject(new Error('Google sign-in could not load. Please try again.'));
    };
    script.onload = () => {
      clearTimeout(timeout);
      identity()?.accounts?.oauth2 ? resolve() : fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loadingIdentity;
}

// Call synchronously from a click after the SDK loads so the popup is not blocked.
export function requestGoogleCalendarToken(clientId: string): Promise<{ value: string; expiresAt: number }> {
  return new Promise((resolve, reject) => {
    const google = identity();
    if (!google) {
      reject(new Error('Google sign-in is still loading. Please try again.'));
      return;
    }
    google.accounts.oauth2
      .initTokenClient({
        client_id: clientId,
        scope: GOOGLE_CALENDAR_EVENTS_SCOPE,
        callback: (response) => {
          if (response.error || !response.access_token) {
            reject(new Error('Calendar access was not granted. You can try connecting again.'));
          } else {
            resolve({
              value: response.access_token,
              expiresAt: Date.now() + Number(response.expires_in || 3600) * 1000,
            });
          }
        },
        error_callback: () => reject(new Error('Google sign-in was closed or blocked. Please try again.')),
      })
      .requestAccessToken();
  });
}

export async function fetchGoogleCalendarEvents(token: string, start: Date, end: Date, signal: AbortSignal) {
  const events: GoogleCalendarEvent[] = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
    });
    if (pageToken) query.set('pageToken', pageToken);
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? 'Your Google session expired. Disconnect and connect again.'
          : 'Unable to load Google events. Check Calendar access and try Refresh.',
      );
    }
    const data = await response.json();
    events.push(...(data.items || []).filter((event: GoogleCalendarEvent) => event.status !== 'cancelled'));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return events;
}

function nextDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseGuestEmails(raw?: string): Array<{ email: string }> {
  const emails = String(raw || '')
    .split(/[\s,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  return Array.from(new Set(emails)).map((email) => ({ email }));
}

function toOffsetIso(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const offH = pad(Math.floor(abs / 60));
  const offM = pad(abs % 60);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${offH}:${offM}`;
}

function buildEventBody(input: CreateGoogleCalendarEventInput) {
  const summary = String(input.summary || '').trim();
  if (!summary) throw new Error('Event title is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateKey)) throw new Error('Invalid start date.');

  const endDateKey = String(input.endDateKey || input.dateKey).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDateKey)) throw new Error('Invalid end date.');
  if (endDateKey < input.dateKey) throw new Error('End date cannot be before start date.');

  const location = String(input.location || '').trim() || undefined;
  const meetingLink = String(input.meetingLink || '').trim();
  const notes = String(input.description || '').trim();
  const descriptionParts = [notes];
  if (meetingLink) descriptionParts.push(`Meeting link: ${meetingLink}`);
  const description = descriptionParts.filter(Boolean).join('\n\n') || undefined;
  const attendees = parseGuestEmails(input.guestEmails);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const body: Record<string, unknown> = {
    summary,
    description,
    location: location || (meetingLink || undefined),
  };

  if (attendees.length) body.attendees = attendees;

  if (typeof input.reminderMinutes === 'number' && Number.isFinite(input.reminderMinutes) && input.reminderMinutes >= 0) {
    body.reminders = {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: Math.min(input.reminderMinutes, 40320) }],
    };
  }

  if (input.addGoogleMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: `rg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  if (input.allDay) {
    body.start = { date: input.dateKey };
    body.end = { date: nextDateKey(endDateKey) };
    return body;
  }

  const startTime = String(input.startTime || '').trim();
  const endTime = String(input.endTime || '').trim();
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    throw new Error('Start and end times are required (HH:mm).');
  }

  const start = new Date(`${input.dateKey}T${startTime}:00`);
  let end = new Date(`${endDateKey}T${endTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid start or end time.');
  }
  if (end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }

  body.start = { dateTime: toOffsetIso(start), timeZone };
  body.end = { dateTime: toOffsetIso(end), timeZone };
  return body;
}

export async function createGoogleCalendarEvent(
  token: string,
  input: CreateGoogleCalendarEventInput,
): Promise<GoogleCalendarEvent> {
  const body = buildEventBody(input);
  const query = new URLSearchParams();
  if (input.addGoogleMeet) query.set('conferenceDataVersion', '1');
  if (parseGuestEmails(input.guestEmails).length) query.set('sendUpdates', 'all');

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events${query.toString() ? `?${query}` : ''}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Your Google session expired. Disconnect and connect again.');
    }
    if (response.status === 403) {
      throw new Error(
        'Google Calendar write access was denied. Disconnect, connect again, and allow calendar edit permission.',
      );
    }
    throw new Error('Unable to create the Google Calendar event. Please try again.');
  }

  return (await response.json()) as GoogleCalendarEvent;
}
