import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { spawnDemoBots, startBotMovement, isBotId, getBotUsers } from "./bots.js";
import type { UserState, UserStatus } from "./types.js";

export type { UserState, UserStatus } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === "production";
const enableDemoBots =
  process.env.ENABLE_DEMO_BOTS === "true" ||
  (!isProd && process.env.ENABLE_DEMO_BOTS !== "false");

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : isProd
    ? []
    : ["http://localhost:5173", "http://localhost:3001"];

const app = express();

if (!isProd || allowedOrigins.length > 0) {
  app.use(
    cors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
    })
  );
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    env: isProd ? "production" : "development",
    demoBots: enableDemoBots,
    users: users.size,
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 60000,
});

const users = new Map<string, UserState>();

function allUsers(): UserState[] {
  return [...Array.from(users.values()), ...(enableDemoBots ? getBotUsers() : [])];
}

function broadcastUsers() {
  io.emit("users", allUsers());
}

io.on("connection", (socket) => {
  socket.on(
    "join",
    (data: { name: string; color: string; x?: number; y?: number }) => {
      const user: UserState = {
        id: socket.id,
        name: data.name.slice(0, 24) || "Guest",
        color: data.color,
        x: data.x ?? 400,
        y: data.y ?? 300,
        status: "available",
      };
      users.set(socket.id, user);
      socket.join("office");
      socket.emit("joined", user);
      broadcastUsers();
    }
  );

  socket.on("move", (pos: { x: number; y: number }) => {
    const user = users.get(socket.id);
    if (!user) return;
    user.x = Math.max(40, Math.min(1160, pos.x));
    user.y = Math.max(40, Math.min(760, pos.y));
    users.set(socket.id, user);
    socket.to("office").emit("user-moved", { id: socket.id, x: user.x, y: user.y });
  });

  socket.on("status", (status: UserStatus) => {
    const user = users.get(socket.id);
    if (!user) return;
    user.status = status;
    users.set(socket.id, user);
    io.emit("user-status", { id: socket.id, status });
  });

  socket.on("signal", (payload: { to: string; signal: unknown }) => {
    if (isBotId(payload.to)) return;
    io.to(payload.to).emit("signal", { from: socket.id, signal: payload.signal });
  });

  socket.on("disconnect", () => {
    users.delete(socket.id);
    io.emit("user-left", socket.id);
    broadcastUsers();
  });
});

if (enableDemoBots) {
  spawnDemoBots();
  startBotMovement((id, x, y) => {
    io.emit("user-moved", { id, x, y });
  });
}

if (isProd) {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/socket.io")) return next();
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Virtual Office server on port ${PORT} (${isProd ? "production" : "development"})`);
  if (enableDemoBots) {
    console.log(`Demo bots: ${getBotUsers().length} members`);
  }
});
