import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function normalizeSocketBaseUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  // Many deployments expose REST on /api but Socket.IO on /socket.io.
  return trimmed.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

function isLocalGatewayUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1):5000$/i.test(url);
}

function resolveSocketUrl(): string {
  const configuredSocketUrl = normalizeSocketBaseUrl(import.meta.env.VITE_SOCKET_URL);
  const apiBase = normalizeSocketBaseUrl(import.meta.env.VITE_API_URL);
  const candidate = configuredSocketUrl || apiBase || 'http://localhost:5002';

  // Local dev commonly uses gateway on :5000 and user-service/socket on :5002.
  if (isLocalGatewayUrl(candidate)) {
    return candidate.replace(/:5000$/i, ':5002');
  }

  return candidate;
}

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
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  const url = resolveSocketUrl();
  socket = io(url, {
    transports: ['websocket', 'polling'],
    // Read the latest token on every (re)connect so chat stays live after refresh.
    auth: (cb) => {
      cb({ token: getToken() });
    },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 400,
    reconnectionDelayMax: 4000,
    withCredentials: false,
  });

  return socket;
}

