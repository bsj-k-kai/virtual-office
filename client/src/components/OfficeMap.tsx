import { useEffect, useRef, useCallback, useState } from "react";
import type { User, UserStatus } from "../types";
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  PROXIMITY_RADIUS,
  AVATAR_SIZE,
  STATUS_LABELS,
} from "../types";

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

interface OfficeMapProps {
  me: User;
  users: User[];
  nearbyIds: string[];
  playingBotIds: string[];
  onMove: (x: number, y: number) => void;
  onStatusChange: (status: UserStatus) => void;
}

const DESKS = [
  { x: 120, y: 120, w: 100, h: 60, label: "デスク A" },
  { x: 320, y: 120, w: 100, h: 60, label: "デスク B" },
  { x: 520, y: 120, w: 100, h: 60, label: "デスク C" },
  { x: 720, y: 120, w: 100, h: 60, label: "デスク D" },
  { x: 120, y: 320, w: 100, h: 60, label: "デスク E" },
  { x: 320, y: 320, w: 100, h: 60, label: "デスク F" },
  { x: 520, y: 320, w: 100, h: 60, label: "デスク G" },
  { x: 720, y: 320, w: 100, h: 60, label: "デスク H" },
];

const MEETING_ROOM = { x: 900, y: 480, w: 240, h: 200, label: "会議室" };
const LOUNGE = { x: 80, y: 520, w: 280, h: 200, label: "ラウンジ" };

const SPEED = 4;
const KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"]);

export function OfficeMap({ me, users, nearbyIds, playingBotIds, onMove, onStatusChange }: OfficeMapProps) {
  const [localPos, setLocalPos] = useState({ x: me.x, y: me.y });
  const posRef = useRef({ x: me.x, y: me.y });
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const lastEmitRef = useRef(0);

  useEffect(() => {
    posRef.current = { x: me.x, y: me.y };
    setLocalPos({ x: me.x, y: me.y });
  }, [me.x, me.y]);

  const tick = useCallback(() => {
    let { x, y } = posRef.current;
    const keys = keysRef.current;

    if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) y -= SPEED;
    if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) y += SPEED;
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) x -= SPEED;
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) x += SPEED;

    x = Math.max(AVATAR_SIZE, Math.min(MAP_WIDTH - AVATAR_SIZE, x));
    y = Math.max(AVATAR_SIZE, Math.min(MAP_HEIGHT - AVATAR_SIZE, y));

    if (x !== posRef.current.x || y !== posRef.current.y) {
      posRef.current = { x, y };
      setLocalPos({ x, y });
      const now = Date.now();
      if (now - lastEmitRef.current > 50) {
        lastEmitRef.current = now;
        onMove(x, y);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [onMove]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (KEYS.has(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  const others = users.filter((u) => u.id !== me.id);
  const nearbyUsers = others.filter((u) => nearbyIds.includes(u.id));
  const nearbyBots = others.filter(
    (u) =>
      u.isBot &&
      u.status !== "busy" &&
      distance(localPos, u) < PROXIMITY_RADIUS
  );

  return (
    <div className="office-layout">
      <aside className="sidebar">
        <h2>メンバー ({users.length})</h2>
        <ul className="member-list">
          {users.map((u) => (
            <li key={u.id} className={u.id === me.id ? "me" : ""}>
              <span className="dot" style={{ background: u.color }} />
              <span className="member-name">
                {u.name}
                {u.id === me.id ? " (あなた)" : ""}
                {u.isBot ? " 🤖" : ""}
              </span>
              <span className={`status-badge status-${u.status}`}>{STATUS_LABELS[u.status]}</span>
            </li>
          ))}
        </ul>

        <div className="status-control">
          <h3>あなたのステータス</h3>
          {(["available", "busy", "away"] as UserStatus[]).map((s) => (
            <button
              key={s}
              className={`status-btn status-${s} ${me.status === s ? "active" : ""}`}
              onClick={() => onStatusChange(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {nearbyUsers.length > 0 && (
          <div className="nearby-panel">
            <h3>🎙 話している相手</h3>
            {nearbyUsers.map((u) => (
              <div key={u.id} className="nearby-user">{u.name}</div>
            ))}
          </div>
        )}

        {nearbyBots.length > 0 && (
          <div className="nearby-panel nearby-panel-bot">
            <h3>🎵 デモメンバーと接続中</h3>
            {nearbyBots.map((u) => (
              <div key={u.id} className="nearby-user">
                {u.name} 🤖
                {playingBotIds.includes(u.id) && <span className="music-indicator"> ♪ 再生中</span>}
              </div>
            ))}
            <p className="nearby-bot-note">近づくとテスト用の音楽が流れます（離れると停止）</p>
          </div>
        )}
      </aside>

      <div className="map-container">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="office-map"
          role="img"
          aria-label="バーチャルオフィスマップ"
        >
          <defs>
            <pattern id="floor" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#f1f5f9" />
              <rect width="40" height="40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#floor)" />
          <rect x="0" y="0" width={MAP_WIDTH} height="8" fill="#94a3b8" />
          <rect x="0" y={MAP_HEIGHT - 8} width={MAP_WIDTH} height="8" fill="#94a3b8" />
          <rect x="0" y="0" width="8" height={MAP_HEIGHT} fill="#94a3b8" />
          <rect x={MAP_WIDTH - 8} y="0" width="8" height={MAP_HEIGHT} fill="#94a3b8" />

          {DESKS.map((d) => (
            <g key={d.label}>
              <rect x={d.x} y={d.y} width={d.w} height={d.h} rx="6" fill="#cbd5e1" stroke="#94a3b8" />
              <rect x={d.x + 30} y={d.y + 10} width="40" height="30" rx="4" fill="#64748b" />
              <text x={d.x + d.w / 2} y={d.y + d.h + 16} textAnchor="middle" fontSize="11" fill="#64748b">
                {d.label}
              </text>
            </g>
          ))}

          <g>
            <rect x={MEETING_ROOM.x} y={MEETING_ROOM.y} width={MEETING_ROOM.w} height={MEETING_ROOM.h} rx="8" fill="#ddd6fe" stroke="#a78bfa" strokeWidth="2" />
            <text x={MEETING_ROOM.x + MEETING_ROOM.w / 2} y={MEETING_ROOM.y + 30} textAnchor="middle" fontSize="14" fontWeight="600" fill="#6d28d9">
              {MEETING_ROOM.label}
            </text>
          </g>

          <g>
            <rect x={LOUNGE.x} y={LOUNGE.y} width={LOUNGE.w} height={LOUNGE.h} rx="8" fill="#bbf7d0" stroke="#4ade80" strokeWidth="2" />
            <text x={LOUNGE.x + LOUNGE.w / 2} y={LOUNGE.y + 30} textAnchor="middle" fontSize="14" fontWeight="600" fill="#15803d">
              {LOUNGE.label}
            </text>
          </g>

          {/* Proximity ring for me */}
          <circle
            cx={localPos.x}
            cy={localPos.y}
            r={PROXIMITY_RADIUS}
            fill="rgba(99, 102, 241, 0.08)"
            stroke="rgba(99, 102, 241, 0.3)"
            strokeWidth="2"
            strokeDasharray="8 4"
          />

          {others.map((u) => (
            <Avatar
              key={u.id}
              user={u}
              isNearby={nearbyIds.includes(u.id) || nearbyBots.some((b) => b.id === u.id)}
            />
          ))}

          <Avatar user={{ ...me, x: localPos.x, y: localPos.y }} isMe />
        </svg>

        <div className="map-hint">
          矢印キー / WASD で移動 · 青い円の範囲内で音声が接続されます
        </div>
      </div>
    </div>
  );
}

function Avatar({ user, isMe, isNearby }: { user: User; isMe?: boolean; isNearby?: boolean }) {
  const r = AVATAR_SIZE / 2;
  const statusRing =
    user.status === "available" ? "#22c55e" : user.status === "busy" ? "#ef4444" : "#94a3b8";

  return (
    <g transform={`translate(${user.x}, ${user.y})`}>
      {isNearby && (
        <circle r={r + 8} fill="none" stroke="#6366f1" strokeWidth="3" opacity="0.8">
          <animate attributeName="r" values={`${r + 6};${r + 12};${r + 6}`} dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      <circle r={r + 3} fill={statusRing} opacity="0.9" />
      <circle r={r} fill={user.color} stroke={isMe ? "#1e293b" : "#fff"} strokeWidth={isMe ? 3 : 2} />
      <text y={5} textAnchor="middle" fontSize="14" fill="#fff" fontWeight="600">
        {user.name.charAt(0).toUpperCase()}
      </text>
      <text y={r + 18} textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="500">
        {user.name}{isMe ? " (あなた)" : ""}{user.isBot ? " 🤖" : ""}
      </text>
      {user.status === "busy" && (
        <text y={r + 32} textAnchor="middle" fontSize="10" fill="#ef4444">
          取り込み中
        </text>
      )}
    </g>
  );
}
