import { Server, Socket } from "socket.io";
import { addToBoard, removeFromBoard } from "./presence.ts";
import { verifyToken } from "../middleware/auth.middleware.ts";

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

export const registerSocketHandlers = (io: Server) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        // const payload = verifyToken(token);
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
    socket.on("board:join", ({ boardId }: { boardId: string }) => {
      socket.join(boardId);
      socket.data.boardId = boardId;
      
      const count = addToBoard(boardId, socket.data.user.id, socket.id);

      io.to(boardId).emit("presence:update", {
        count,
        joined: socket.data.user,
      });
    });

    socket.on("disconnect", () => {
      const { boardId, user } = socket.data;
      if (boardId && user) {
        const count = removeFromBoard(boardId, user.id, socket.id);
        io.to(boardId).emit("presence:update", { count, left: user });
      }
    });
  });
};
