import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from './types';

export type QRSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
let socket: QRSocket | null = null;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

export function createSocket(token: string): QRSocket {
  if (socket) destroySocket();
  socket = io(WS_URL, { auth: { token }, transports: ['websocket','polling'], reconnectionAttempts: 5, reconnectionDelay: 1500, timeout: 10_000, forceNew: true }) as QRSocket;
  return socket;
}
export const getSocket  = (): QRSocket | null => socket;
export function destroySocket() { if(!socket) return; socket.removeAllListeners(); socket.disconnect(); socket=null; }
