import { useState, useEffect, useCallback } from "react";
import type { AuthUser } from "../types";
import { fetchAuthConfig, fetchMe, loginWithGoogle, logout as apiLogout } from "../api";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState("");
  const [allowedDomain, setAllowedDomain] = useState("bravesoft.co.jp");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await fetchAuthConfig();
        if (cancelled) return;
        setGoogleClientId(config.googleClientId);
        setAllowedDomain(config.allowedDomain);
        if (!config.googleClientId) {
          setError("Google ログインが設定されていません（GOOGLE_CLIENT_ID）");
          setLoading(false);
          return;
        }
        try {
          const { user: me, token: sessionToken } = await fetchMe();
          if (cancelled) return;
          setUser(me);
          setToken(sessionToken);
        } catch {
          /* not logged in */
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "認証の初期化に失敗しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credential: string) => {
    setError(null);
    const { user: authUser, token: sessionToken } = await loginWithGoogle(credential);
    setUser(authUser);
    setToken(sessionToken);
    return authUser;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setToken(null);
  }, []);

  return {
    user,
    token,
    googleClientId,
    allowedDomain,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    setError,
  };
}
