import { useCallback, useEffect, useRef, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import type { Socket } from "socket.io-client";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const REFRESH_MS = 5 * 60 * 1000;

export function useCalendarSync(
  socketRef: React.RefObject<Socket | null>,
  enabled: boolean,
  isBot?: boolean
) {
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarLinked, setCalendarLinked] = useState(false);
  const pendingRef = useRef(false);
  const interactiveRef = useRef(false);
  const linkedRef = useRef(false);

  const googleLogin = useGoogleLogin({
    scope: CALENDAR_SCOPE,
    onSuccess: (response) => {
      pendingRef.current = false;
      setCalendarError(null);
      socketRef.current?.emit("calendar-sync", { accessToken: response.access_token });
    },
    onError: () => {
      pendingRef.current = false;
      if (interactiveRef.current) {
        setCalendarError("カレンダーへのアクセスが拒否されました");
      }
    },
  });

  const syncCalendar = useCallback(
    (interactive = false) => {
      if (!enabled || isBot || pendingRef.current) return;
      interactiveRef.current = interactive;
      pendingRef.current = true;
      googleLogin({ prompt: interactive ? "consent" : "none" });
    },
    [enabled, isBot, googleLogin]
  );

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
      if (interactiveRef.current || linkedRef.current) {
        setCalendarError(message);
      }
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
    syncCalendar(false);
    const id = window.setInterval(() => syncCalendar(false), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [enabled, isBot, syncCalendar]);

  return { calendarError, calendarLinked, syncCalendar };
}
