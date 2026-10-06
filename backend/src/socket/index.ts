import { Server, Socket } from "socket.io";
import { addToBoard, removeFromBoard } from "./presence.ts";
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
  ];
  const n = animals[Math.floor(Math.random() * animals.length)];
  return `Anonymous ${n}`;
};

type ActionType = "creating" | "editing" | "moving";

type EphermeralAction = {
  type: ActionType;
  targetId: string;
};

const setAction = (
  socket: Socket,
  boardId: string,
  type: ActionType,
  targetId: string
) => {
  clearAction(socket, boardId);
  socket.data.activeAction = { type, targetId } as EphermeralAction;
  socket.to(boardId).emit(`user:${type}`, {
    user: socket.data.user,
    targetId,
  });
};

const clearAction = (socket: Socket, boardId: string) => {
  const action = socket.data.activeAction as EphermeralAction | undefined;
  if (!action) return;

  socket.to(boardId).emit(`user:${action.type}:stop`, {
    user: socket.data.user,
    targetId: action.targetId,
  });
  socket.data.activeAction = null;
};

export const registerSocketHandlers = (io: Server) => {
  io.use((socket, next) => {
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
        console.error(
          "Error while verifying token in socket connection ",
          error
        );
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
    socket.on("board:join", ({ boardId }: { boardId: string }) => {
      socket.join(boardId);
      socket.data.boardId = boardId;

      const count = addToBoard(boardId, socket.data.user.id, socket.id);

      io.to(boardId).emit("presence:update", {
        count,
        joined: socket.data.user,
      });
    });

    socket.on("board:leave", ({ boardId }: { boardId: string }) => {
      clearAction(socket, boardId);
      socket.leave(boardId);

      const count = removeFromBoard(boardId, socket.data.user.id, socket.id);
      io.to(boardId).emit("presence:update", { count, left: socket.data.user });

      if (socket.data.boardId === boardId) {
        socket.data.boardId = null;
      }
    });

    socket.on(
      "card:creating",
      ({ boardId, columnId }: { boardId: string; columnId: string }) => {
        setAction(socket, boardId, "creating", columnId);
      }
    );

    socket.on(
      "card:editing",
      ({ boardId, cardId }: { boardId: string; cardId: string }) => {
        setAction(socket, boardId, "editing", cardId);
      }
    );

    socket.on(
      "card:moving",
      ({ boardId, cardId }: { boardId: string; cardId: string }) => {
        setAction(socket, boardId, "moving", cardId);
      }
    );

    socket.on("action:stop", ({ boardId }: { boardId: string }) => {
      clearAction(socket, boardId);
    });

    socket.on("disconnect", () => {
      const { boardId, user } = socket.data;
      if (boardId && user) {
        clearAction(socket, boardId);
        const count = removeFromBoard(boardId, user.id, socket.id);
        io.to(boardId).emit("presence:update", { count, left: user });
      }
    });
  });
};
