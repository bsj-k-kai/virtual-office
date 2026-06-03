import { useCallback, useEffect, useRef, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import type { Socket } from "socket.io-client";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const REFRESH_MS = 5 * 60 * 1000;
const TOKEN_KEY = "vo_calendar_access_token";
const TOKEN_EXP_KEY = "vo_calendar_token_exp";

function saveAccessToken(accessToken: string, expiresInSec?: number) {
  const ttl = (expiresInSec ?? 3600) * 1000 - 60_000;
  sessionStorage.setItem(TOKEN_KEY, accessToken);
  sessionStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + ttl));
}

export function clearCalendarAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXP_KEY);
}

function getStoredAccessToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const exp = Number(sessionStorage.getItem(TOKEN_EXP_KEY) || 0);
  if (!token || Date.now() > exp) {
    clearCalendarAccessToken();
    return null;
  }
  return token;
}

export function useCalendarSync(
  socketRef: React.RefObject<Socket | null>,
  enabled: boolean,
  isBot?: boolean
) {
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarLinked, setCalendarLinked] = useState(false);
  const pendingRef = useRef(false);
  const linkedRef = useRef(false);

  const emitCalendarSync = useCallback((accessToken: string) => {
    socketRef.current?.emit("calendar-sync", { accessToken });
  }, [socketRef]);

  const syncWithStoredToken = useCallback(() => {
    const token = getStoredAccessToken();
    if (!token || !socketRef.current) return false;
    emitCalendarSync(token);
    return true;
  }, [emitCalendarSync, socketRef]);

  const googleLogin = useGoogleLogin({
    scope: CALENDAR_SCOPE,
    onSuccess: (response) => {
      pendingRef.current = false;
      setCalendarError(null);
      saveAccessToken(response.access_token, response.expires_in);
      emitCalendarSync(response.access_token);
    },
    onError: () => {
      pendingRef.current = false;
      setCalendarError(
        "カレンダーへのアクセスが拒否されました。ポップアップを許可してから再度お試しください。"
      );
    },
  });

  /** ユーザーのクリック時のみ Google 認証ポップアップを開く */
  const syncCalendar = useCallback(() => {
    if (!enabled || isBot || pendingRef.current) return;

    if (syncWithStoredToken()) return;

    pendingRef.current = true;
    setCalendarError(null);
    googleLogin({ prompt: "consent" });
  }, [enabled, isBot, googleLogin, syncWithStoredToken]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !enabled || isBot) return;

    const onOk = () => {
      pendingRef.current = false;
      linkedRef.current = true;
      setCalendarLinked(true);
      setCalendarError(null);
    };
    const onError = ({ message }: { message: string }) => {
      pendingRef.current = false;
      setCalendarError(message);
    };

    socket.on("calendar-sync-ok", onOk);
    socket.on("calendar-sync-error", onError);

    return () => {
      socket.off("calendar-sync-ok", onOk);
      socket.off("calendar-sync-error", onError);
    };
  }, [socketRef, enabled, isBot]);

  useEffect(() => {
    if (!enabled || isBot) return;
    syncWithStoredToken();
    const id = window.setInterval(() => syncWithStoredToken(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [enabled, isBot, syncWithStoredToken]);

  return { calendarError, calendarLinked, syncCalendar };
}
