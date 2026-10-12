import type { Socket, Server } from "socket.io";
import { z } from "zod";
import {
  addToBoard,
  getBoardCount,
  getBoardUsers,
  removeFromBoard,
  type SocketUser,
} from "./presence.ts";
import { verifyTokenSocket } from "../middleware/auth.middleware.ts";
import {
  getBoardRole,
  type Role,
} from "../middleware/boardAccess.middleware.ts";
import prisma from "../lib/prisma.ts";

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

type ActionType =
  | "editing"
  | "creating"
  | "moving"
  | "columnCreating"
  | "columnEditing"
  | "columnMoving";
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
const columnCreatingSchema = z.object({
  boardId: z.string().min(1),
});
const columnEditingSchema = z.object({
  boardId: z.string().min(1),
  columnId: z.string().min(1),
});
const columnMovingSchema = z.object({
  boardId: z.string().min(1),
  columnId: z.string().min(1),
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

const isWritableRole = (role: Role | null) =>
  role === "OWNER" || role === "EDITOR";

export const applyRoleChangeToUserSockets = (
  io: Server,
  boardId: string,
  userId: string,
  role: Role
) => {
  io.sockets.sockets.forEach((s) => {
    const user = s.data.user as SocketUser | undefined;
    if (!user || user.id !== userId || !s.rooms.has(boardId)) return;
    s.data.role = role;
    s.data.readOnly = !isWritableRole(role);
  });
};

export const removeUserFromBoard = (
  io: Server,
  boardId: string,
  userId: string,
  message?: string
) => {
  io.sockets.sockets.forEach((s) => {
    const user = s.data.user as SocketUser | undefined;
    if (!user || user.id !== userId || !s.rooms.has(boardId)) return;
    s.emit("board:kicked", { boardId, message });
    clearAction(s, boardId);
    s.leave(boardId);
    removeFromBoard(boardId, user.id, s.id);
    if (s.data.boardId === boardId) s.data.boardId = null;
    s.data.role = null;
    s.data.readOnly = true;
  });
  io.to(boardId).emit("presence:update", {
    count: getBoardCount(boardId),
    users: getBoardUsers(boardId),
  });
};

export const evictEveryoneFromBoard = (io: Server, boardId: string) => {
  io.sockets.sockets.forEach((s) => {
    if (!s.rooms.has(boardId)) return;
    clearAction(s, boardId);
    s.leave(boardId);
    const user = s.data.user as SocketUser | undefined;
    if (user) removeFromBoard(boardId, user.id, s.id);
    if (s.data.boardId === boardId) s.data.boardId = null;
    s.data.role = null;
    s.data.readOnly = true;
  });
  io.to(boardId).emit("presence:update", {
    count: getBoardCount(boardId),
    users: getBoardUsers(boardId),
  });
};

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

export const registerSocketHandlers = (io: Server) => {
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

  io.on("connection", (socket: Socket) => {
    socket.on("board:join", async (payload) => {
      try {
        const result = joinSchema.safeParse(payload);
        if (!result.success) {
          socket.emit("board:error", {
            code: "INVALID_PAYLOAD",
            message: "board:join requires a boardId",
          });
          return;
        }

        const { boardId, publicToken } = result.data as {
          boardId: string;
          publicToken: string | undefined;
        };

        if (socket.rooms.has(boardId)) return;

        const user = socket.data.user as SocketUser;
        let granted = false;
        let readOnly = true;
        let role: Role | null = null;

        if (!user.isGuest) {
          const memberRole = await getBoardRole(boardId, user.id);
          if (memberRole) {
            granted = true;
            readOnly = false;
            role = memberRole;
          }
        }

        if (!granted && publicToken) {
          const link = await prisma.publicBoardLink.findUnique({
            where: { token: publicToken },
            select: { enabled: true, boardId: true },
          });
          if (link && link.enabled && link.boardId === boardId) {
            granted = true;
            readOnly = true;
            role = "VIEWER";
          }
        }

        if (!granted) {
          socket.emit("board:error", {
            code: "FORBIDDEN",
            message: "You do not have access to this board",
          });
          return;
        }

        socket.data.boardId = boardId;
        socket.data.role = role;
        socket.data.readOnly = readOnly;
        socket.join(boardId);
        const { count, users } = addToBoard(boardId, user, socket.id);
        io.to(boardId).emit("presence:update", { count, users, joined: user });
      } catch (error) {
        console.error("Error while joining a board room ", error);
        socket.emit("board:error", { code: "SERVER_ERROR" });
      }
    });

    socket.on("board:leave", (payload) => {
      const result = leaveSchema.safeParse(payload);
      if (!result.success) return;
      const { boardId } = result.data as { boardId: string };

      clearAction(socket, boardId);
      socket.leave(boardId);

      const user = socket.data.user as SocketUser;
      const { count, users } = removeFromBoard(boardId, user.id, socket.id);
      io.to(boardId).emit("presence:update", { count, users, left: user });
      if (socket.data.boardId === boardId) socket.data.boardId = null;
    });

    socket.on("card:creating", (payload) => {
      if (!canWrite(socket)) return;
      const parsed = creatingSchema.safeParse(payload);
      if (!parsed.success) return;
      const { boardId, columnId } = parsed.data;
      if (!socket.rooms.has(boardId)) return;
      setAction(socket, boardId, "creating", columnId);
    });

    socket.on("card:editing", (payload) => {
      if (!canWrite(socket)) return;
      const parsed = editingSchema.safeParse(payload);
      if (!parsed.success) return;
      const { boardId, cardId } = parsed.data;
      if (!socket.rooms.has(boardId)) return;
      setAction(socket, boardId, "editing", cardId);
    });

    socket.on("card:moving", (payload) => {
      if (!canWrite(socket)) return;
      const parsed = movingSchema.safeParse(payload);
      if (!parsed.success) return;
      const { boardId, cardId } = parsed.data;
      if (!socket.rooms.has(boardId)) return;
      setAction(socket, boardId, "moving", cardId);
    });

    socket.on("column:creating", (payload) => {
      if (!canWrite(socket)) return;
      const parsed = columnCreatingSchema.safeParse(payload);
      if (!parsed.success) return;
      const { boardId } = parsed.data;
      if (!socket.rooms.has(boardId)) return;
      setAction(socket, boardId, "columnCreating", boardId);
    });

    socket.on("column:editing", (payload) => {
      if (!canWrite(socket)) return;
      const parsed = columnEditingSchema.safeParse(payload);
      if (!parsed.success) return;
      const { boardId, columnId } = parsed.data;
      if (!socket.rooms.has(boardId)) return;
      setAction(socket, boardId, "columnEditing", columnId);
    });

    socket.on("column:moving", (payload) => {
      if (!canWrite(socket)) return;
      const parsed = columnMovingSchema.safeParse(payload);
      if (!parsed.success) return;
      const { boardId, columnId } = parsed.data;
      if (!socket.rooms.has(boardId)) return;
      setAction(socket, boardId, "columnMoving", columnId);
    });

    socket.on("action:stop", (payload) => {
      const parsed = stopSchema.safeParse(payload);
      if (!parsed.success) return;
      const { boardId } = parsed.data;
      if (!socket.rooms.has(boardId)) return;
      clearAction(socket, boardId);
    });

    socket.on("disconnect", () => {
      const { boardId } = socket.data;
      const user = socket.data.user as SocketUser | undefined;
      if (boardId && user) {
        clearAction(socket, boardId);
        const { count, users } = removeFromBoard(boardId, user.id, socket.id);
        io.to(boardId).emit("presence:update", { count, users, left: user });
      }
    });
  });
};
