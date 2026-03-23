import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('rapidgrow-admin');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
}

export function getSocket(): Socket {
  const latestToken = getToken();
  if (socket) {
    // Keep auth token in sync across tabs/sessions so DM join doesn't fail
    socket.auth = { token: latestToken };
    if (!socket.connected) socket.connect();
    return socket;
  }

  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;
  const apiBase = import.meta.env.VITE_API_URL;
  const derivedSocketUrl =
    typeof apiBase === 'string' && apiBase.length > 0
      ? apiBase.replace(/\/api\/?$/, '')
      : '';
  const url = configuredSocketUrl || derivedSocketUrl || 'http://localhost:5002';
  socket = io(url, {
    transports: ['websocket', 'polling'],
    auth: { token: latestToken },
    autoConnect: true,
    reconnection: true,
  });

  return socket;
}

