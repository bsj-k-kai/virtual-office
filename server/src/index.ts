import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { spawnDemoBots, startBotMovement, isBotId, getBotUsers } from "./bots.js";
import type { UserState, UserStatus } from "./types.js";
import {
  verifyGoogleIdToken,
  signSessionToken,
  verifySessionToken,
  getTokenFromRequest,
  getTokenFromSocket,
  setAuthCookie,
  clearAuthCookie,
  colorFromEmail,
  type AuthUser,
} from "./auth.js";

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
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3001",
      ];

const app = express();
app.use(express.json());

const corsOrigin = allowedOrigins.length > 0 ? allowedOrigins : true;
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    env: isProd ? "production" : "development",
    demoBots: enableDemoBots,
    users: users.size,
    auth: !!process.env.GOOGLE_CLIENT_ID,
  });
});

app.get("/api/auth/config", (_req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    allowedDomain: process.env.ALLOWED_EMAIL_DOMAIN || "bravesoft.co.jp",
  });
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body as { credential?: string };
    if (!credential) {
      res.status(400).json({ error: "認証情報がありません" });
      return;
    }
    const user = await verifyGoogleIdToken(credential);
    const token = signSessionToken(user);
    setAuthCookie(res, token, isProd);
    res.json({ user, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "認証に失敗しました";
    res.status(403).json({ error: message });
  }
});

app.get("/api/auth/me", (req, res) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "未ログイン" });
    return;
  }
  const user = verifySessionToken(token);
  if (!user) {
    res.status(401).json({ error: "セッションが無効です" });
    return;
  }
  res.json({ user, token });
});

app.post("/api/auth/logout", (req, res) => {
  clearAuthCookie(res, isProd);
  res.json({ ok: true });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
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

io.use((socket, next) => {
  const token = getTokenFromSocket(socket);
  if (!token) {
    next(new Error("ログインが必要です"));
    return;
  }
  const user = verifySessionToken(token);
  if (!user) {
    next(new Error("セッションが無効です"));
    return;
  }
  socket.data.authUser = user as AuthUser;
  next();
});

io.on("connection", (socket) => {
  const authUser = socket.data.authUser as AuthUser;

  socket.on("join", (data?: { x?: number; y?: number }) => {
    const user: UserState = {
      id: socket.id,
      name: authUser.name.slice(0, 24),
      color: colorFromEmail(authUser.email),
      email: authUser.email,
      picture: authUser.picture,
      x: data?.x ?? 400,
      y: data?.y ?? 300,
      status: "available",
    };
    users.set(socket.id, user);
    socket.join("office");
    socket.emit("joined", user);
    broadcastUsers();
  });

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
    if (req.path.startsWith("/socket.io") || req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Virtual Office server on port ${PORT} (${isProd ? "production" : "development"})`);
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn("WARN: GOOGLE_CLIENT_ID is not set — Google login disabled");
  }
  if (enableDemoBots) {
    console.log(`Demo bots: ${getBotUsers().length} members`);
  }
});
