import { io, type Socket } from "socket.io-client";
import { useAuth } from "../stores/auth";

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_ORIGIN || undefined, {
      auth: (cb) => cb({ token: useAuth.getState().token ?? undefined }),
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
