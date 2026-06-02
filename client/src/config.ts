/** Socket.io / API の接続先（本番は同一オリジン） */
export function getServerUrl(): string {
  const envUrl = import.meta.env.VITE_SERVER_URL;
  if (envUrl) return envUrl;
  if (import.meta.env.PROD && typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3001";
}

/** WebRTC ICE サーバー（本番では TURN 推奨） */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: import.meta.env.VITE_TURN_USERNAME || undefined,
      credential: import.meta.env.VITE_TURN_CREDENTIAL || undefined,
    });
  }

  return servers;
}
