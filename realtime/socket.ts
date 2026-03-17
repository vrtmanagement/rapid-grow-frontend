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
  if (socket) return socket;

  const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002';
  socket = io(url, {
    transports: ['websocket', 'polling'],
    auth: { token: getToken() },
    autoConnect: true,
    reconnection: true,
  });

  return socket;
}

