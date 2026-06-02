import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { Socket } from "socket.io";

export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
}

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "bravesoft.co.jp").toLowerCase();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const COOKIE_NAME = "vo_token";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${ALLOWED_DOMAIN}`);
}

export async function verifyGoogleIdToken(idToken: string): Promise<AuthUser> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error("Invalid Google token");
  }

  const email = payload.email.toLowerCase();

  if (!isAllowedEmail(email)) {
    throw new Error(`@${ALLOWED_DOMAIN} の Google アカウントのみ利用できます`);
  }

  if (payload.hd && payload.hd.toLowerCase() !== ALLOWED_DOMAIN) {
    throw new Error(`@${ALLOWED_DOMAIN} の Google アカウントのみ利用できます`);
  }

  return {
    email,
    name: payload.name || email.split("@")[0],
    picture: payload.picture,
  };
}

export function signSessionToken(user: AuthUser): string {
  return jwt.sign(
    { email: user.email, name: user.name, picture: user.picture },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifySessionToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    if (!payload.email || !isAllowedEmail(payload.email)) return null;
    return {
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getTokenFromSocket(socket: Socket): string | null {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === "string" && fromAuth) return fromAuth;

  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setAuthCookie(res: Response, token: string, isProd: boolean) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

export function clearAuthCookie(res: Response, isProd: boolean) {
  res.cookie(COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "ログインが必要です" });
    return;
  }
  const user = verifySessionToken(token);
  if (!user) {
    res.status(401).json({ error: "セッションが無効です" });
    return;
  }
  (req as Request & { authUser: AuthUser }).authUser = user;
  next();
}

export function colorFromEmail(email: string): string {
  const colors = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
