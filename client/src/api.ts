import { getServerUrl } from "./config";
import type { AuthUser } from "./types";

const apiBase = () => getServerUrl();

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "リクエストに失敗しました");
  }
  return data as T;
}

export function fetchAuthConfig() {
  return apiFetch<{ googleClientId: string; allowedDomain: string }>("/api/auth/config");
}

export function fetchMe() {
  return apiFetch<{ user: AuthUser; token: string }>("/api/auth/me");
}

export function loginWithGoogle(credential: string) {
  return apiFetch<{ user: AuthUser; token: string }>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export function logout() {
  return apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}
