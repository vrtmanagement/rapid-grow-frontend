# Google Calendar in My Tasks

The Calendar view appears beside List, Board and Table only under **Me** on `/spaces`. Task due dates and Google primary-calendar events share a month grid. Click a day to see its agenda. Unscheduled tasks appear below the grid.

## Enable the connection

1. In Google Cloud, enable **Google Calendar API** for your project.
2. Configure the OAuth consent screen. If the app is in Testing, add the Google accounts that will test it. Follow Google's verification requirements before public use.
3. Create an OAuth **Web application** client. Add authorized JavaScript origins for each frontend, for example `http://localhost:3000` and `https://rapid-grow-frontend.vercel.app`. Origins have no route or trailing path. This popup token flow does not use a redirect URI.
4. Set `VITE_GOOGLE_CALENDAR_CLIENT_ID=your-id.apps.googleusercontent.com` in `.env.local` for local development and in the frontend hosting environment for production. This is a public client ID; do not put a client secret in a Vite variable.
5. Restart Vite locally, or rebuild/redeploy the frontend after changing the environment variable.
6. Open **Task Hub → Me → Calendar → Connect Google Calendar**, select your account, and grant calendar event read access.

The integration requests only `calendar.events.readonly`, reads the connected account's primary calendar, expands recurring events, and loads all event pages for the visible date range. It does not create or modify Google events or tasks. Events are shown in the browser's local timezone; all-day events retain their calendar dates.

Google access tokens stay in component memory and are discarded when Calendar unmounts or Disconnect is clicked. Reconnect after leaving the view, reloading, or token expiration. Disconnect clears the local session; to revoke the Google permission itself, remove this app from your Google account's third-party connections.

Missing setup, denied consent, popup failures, expired sessions, and API errors show a message. Real account authorization must be verified after supplying the client ID.

References: [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Calendar events API](https://developers.google.com/workspace/calendar/api/v3/reference/events/list).
