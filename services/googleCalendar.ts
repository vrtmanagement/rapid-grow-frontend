export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  htmlLink?: string;
  status?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
}

type TokenResponse = { access_token?: string; expires_in?: number; error?: string };
interface GoogleIdentity {
  accounts: { oauth2: {
    initTokenClient: (config: {
      client_id: string; scope: string;
      callback: (response: TokenResponse) => void;
      error_callback: () => void;
    }) => { requestAccessToken: () => void };
  } };
}
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
      clearTimeout(timeout); script.remove(); loadingIdentity = undefined;
      reject(new Error('Google sign-in could not load. Please try again.'));
    };
    script.onload = () => { clearTimeout(timeout); identity()?.accounts?.oauth2 ? resolve() : fail(); };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loadingIdentity;
}

// Call synchronously from a click after the SDK loads so the popup is not blocked.
export function requestGoogleCalendarToken(clientId: string): Promise<{ value: string; expiresAt: number }> {
  return new Promise((resolve, reject) => {
    const google = identity();
    if (!google) { reject(new Error('Google sign-in is still loading. Please try again.')); return; }
    google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
      callback: response => {
        if (response.error || !response.access_token) {
          reject(new Error('Calendar access was not granted. You can try connecting again.'));
        } else {
          resolve({ value: response.access_token, expiresAt: Date.now() + Number(response.expires_in || 3600) * 1000 });
        }
      },
      error_callback: () => reject(new Error('Google sign-in was closed or blocked. Please try again.')),
    }).requestAccessToken();
  });
}

export async function fetchGoogleCalendarEvents(token: string, start: Date, end: Date, signal: AbortSignal) {
  const events: GoogleCalendarEvent[] = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '2500' });
    if (pageToken) query.set('pageToken', pageToken);
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${query}`, {
      headers: { Authorization: `Bearer ${token}` }, signal,
    });
    if (!response.ok) throw new Error(response.status === 401
      ? 'Your Google session expired. Disconnect and connect again.'
      : 'Unable to load Google events. Check Calendar access and try Refresh.');
    const data = await response.json();
    events.push(...(data.items || []).filter((event: GoogleCalendarEvent) => event.status !== 'cancelled'));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return events;
}
