# Google Calendar in My Tasks

The Calendar view appears beside List, Board and Table only under **Me** on `/spaces`. Task due dates and Google primary-calendar events share a month grid. Click a day to see its agenda, **create Google events**, or **Add to Google** from a Spaces task. Unscheduled tasks appear below the grid.

## Enable the connection (local)

### 1. Google Cloud — enable API

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create a project.
3. Go to **APIs & Services → Library**.
4. Search for **Google Calendar API** → **Enable**.

### 2. OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen** (or **Google Auth Platform → Audience**).
2. Choose **External** (or Internal for Workspace-only) → create/configure the app.
3. App name can be `Rapid Grow` (or your product name). Add a support email.
4. Scopes: you do not need to pre-add scopes for this popup token flow; the app requests `https://www.googleapis.com/auth/calendar.events` at connect time (read **and** create events on calendars you own).
5. If **Publishing status** is **Testing**, under **Test users** add every Google account that will click **Connect Google Calendar**.
6. Save.

### 3. Create OAuth Web client

1. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Name: e.g. `Rapid Grow Spaces Calendar`.
4. **Authorized JavaScript origins** (no path, no trailing slash):
   - `http://localhost:3000`
   - Production origin if needed, e.g. `https://rapid-grow-frontend.vercel.app`
5. Leave **Authorized redirect URIs** empty for this flow (GIS token popup does not use a redirect URI).
6. Create → copy the **Client ID** (`….apps.googleusercontent.com`).

### 4. Frontend env

In `rapid-grow-performance-hub/.env.local`:

```env
VITE_GOOGLE_CALENDAR_CLIENT_ID=your-id.apps.googleusercontent.com
```

This is a **public** client ID. Do **not** put a client secret in any `VITE_` variable.

Restart Vite after changing the value (`Ctrl+C`, then `npm run dev`).

For production, set the same variable in the frontend host (e.g. Vercel env) and redeploy.

### 5. Connect in the app

1. Open `http://localhost:3000/spaces`.
2. Open **Me**.
3. Switch to the **Calendar** view.
4. Click **Connect Google Calendar**, pick your Google account, and allow **calendar event** access (includes create).
5. If you connected earlier with read-only access, click **Disconnect Google Calendar**, then **Connect** again so Google re-prompts for write permission.

## Behavior after connect

- Shows Spaces task due dates + Google **primary** calendar events on one month grid.
- Click a day for that day’s agenda.
- **Create Google event** opens a Google-style form: title, start/end date & time (or all day), location, meeting/video link, optional Google Meet, guests, description, and notification → creates an event on the primary calendar.
- **Add to Google** on a Spaces task for that day → creates an all-day Google event from the task title.
- Scope: `calendar.events` (read + create events). Editing/deleting Google events from Rapid Grow is not supported yet.
- Events use the browser’s local timezone; all-day events use calendar dates (Google exclusive end date).
- Access tokens stay in component memory and are cleared on Disconnect, leaving Calendar, or reload. Reconnect when prompted after expiry.
- End customers do **not** set up Google Cloud; only your team configures the client ID and origins. For production, **Publish** the OAuth app (write scopes may require Google verification before broad customer use). Testing + Test users is enough for your team.
- To revoke Google’s grant entirely, remove the app under your Google account’s third-party connections.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Connect button disabled / setup message | `VITE_GOOGLE_CALENDAR_CLIENT_ID` missing or empty; restart Vite after setting it |
| Popup blocked / closed | Allow popups for `localhost:3000`; try Connect again |
| Access blocked / not a tester | Add the Google account under Test users while the app is in Testing |
| Permission denied when creating events | Disconnect, connect again, and approve write access |
| Session expired | Disconnect, then Connect again |
| `origin_mismatch` / blocked client | Add exact origin `http://localhost:3000` under Authorized JavaScript origins |

References: [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Calendar events.insert](https://developers.google.com/calendar/api/v3/reference/events/insert).
