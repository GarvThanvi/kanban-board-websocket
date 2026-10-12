import type { Socket, Server } from "socket.io";
import { z } from "zod";
import {
  getBoardCount,
  getBoardUsers,
  removeFromBoard,
  type SocketUser,
} from "./presence.ts";
import { verifyTokenSocket } from "../middleware/auth.middleware.ts";

const makeGuestName = () => {
  const animals = [
    "Panda",
    "Falcon",
    "Otter",
    "Fox",
    "Lynx",
    "Giraffe",
    "Zebra",
    "Tiger",
    "Rat",
  ];
  const n = animals[Math.floor(Math.random() * animals.length)];
  return `Anonymous ${n}`;
};

type ActionType = "editing" | "creating" | "moving";
type EphemeralAction = { type: ActionType; targetId: string };

const joinSchema = z.object({
  boardId: z.string().min(1),
  publicToken: z.string().optional(),
});
const leaveSchema = z.object({
  boardId: z.string().min(1),
});
const creatingSchema = z.object({
  boardId: z.string().min(1),
  columnId: z.string().min(1),
});
const editingSchema = z.object({
  boardId: z.string().min(1),
  cardId: z.string().min(1),
});
const movingSchema = z.object({
  boardId: z.string().min(1),
  cardId: z.string().min(1),
});
const stopSchema = z.object({ boardId: z.string().min(1) });

const setAction = (
  socket: Socket,
  boardId: string,
  type: ActionType,
  targetId: string
) => {
  clearAction(socket, boardId);
  socket.data.activeAction = { type, targetId } as EphemeralAction;
  socket.to(boardId).emit(`user:${type}`, { user: socket.data.user, targetId });
};

const clearAction = (socket: Socket, boardId: string) => {
  const action = socket.data.activeAction as EphemeralAction | undefined;
  if (!action) return;
  socket.to(boardId).emit(`user:${action.type}:stop`, {
    user: socket.data.user,
    targetId: action.targetId,
  });
  socket.data.activeAction = null;
};

const canWrite = (socket: Socket) =>
  !socket.data.readOnly ||
  socket.data.role === "OWNER" ||
  socket.data.role === "EDITOR";

export const evictReadOnlyFromBoard = (io: Server, boardId: string) => {
  io.sockets.sockets.forEach((s) => {
    if (s.data?.readOnly && s.rooms.has(boardId)) {
      s.emit("board:revoked", { boardId });
      const user = s.data.user as SocketUser | undefined;
      s.leave(boardId);
      if (user) removeFromBoard(boardId, user.id, s.id);
    }
  });
  io.to(boardId).emit("presence:update", {
    count: getBoardCount(boardId),
    users: getBoardUsers(boardId),
  });
};

export const registerSocketHandles = (io: Server) => {
  io.use((socket, next) => {
    socket.data.readOnly = false;
    socket.data.role = null;

    const token =
      socket.handshake.auth?.token || socket.handshake.headers?.token;

    if (token) {
      try {
        const payload = verifyTokenSocket(token);
        socket.data.user = {
          id: payload.userId,
          name: payload.name,
          isGuest: false,
        };
      } catch (error) {
        socket.data.user = {
          id: socket.id,
          name: makeGuestName(),
          isGuest: true,
        };
      }
    } else {
      socket.data.user = {
        id: socket.id,
        name: makeGuestName(),
        isGuest: true,
      };
    }
    next();
  });

  io.on("connection", (socket: Socket) => {});
};
