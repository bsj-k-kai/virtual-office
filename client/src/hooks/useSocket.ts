import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { User, UserStatus } from "../types";
import { getServerUrl } from "../config";

export function useSocket(sessionToken: string | null, enabled: boolean) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !sessionToken) return;

    const socket = io(getServerUrl(), {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token: sessionToken },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setAuthError(null);
      socket.emit("join", {});
    });

    socket.on("connect_error", (err) => {
      setAuthError(err.message);
      setConnected(false);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("joined", (user: User) => {
      setMe(user);
    });

    socket.on("users", (list: User[]) => {
      setUsers(list);
    });

    socket.on("user-moved", ({ id, x, y }: { id: string; x: number; y: number }) => {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, x, y } : u)));
    });

    socket.on("user-status", ({ id, status }: { id: string; status: UserStatus }) => {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
    });

    socket.on("user-left", (id: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setMe(null);
      setUsers([]);
      setConnected(false);
    };
  }, [enabled, sessionToken]);

  const move = useCallback((x: number, y: number) => {
    if (!me) return;
    setMe((prev) => (prev ? { ...prev, x, y } : prev));
    socketRef.current?.emit("move", { x, y });
  }, [me]);

  const setStatus = useCallback((status: UserStatus) => {
    setMe((prev) => (prev ? { ...prev, status } : prev));
    socketRef.current?.emit("status", status);
  }, []);

  return { socket: socketRef, connected, me, users, move, setStatus, authError };
}
