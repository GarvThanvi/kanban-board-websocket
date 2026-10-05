import http from "http";
import { Server } from "socket.io";
import app from "./app.ts";
import { registerSocketHandlers } from "./socket/index.ts";

const PORT = process.env.PORT!;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

app.set("io", io);

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
