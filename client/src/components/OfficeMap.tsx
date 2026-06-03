import { useEffect, useRef, useCallback, useState, useId } from "react";
import type { User, UserStatus, ScheduleInfo } from "../types";
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  PROXIMITY_RADIUS,
  AVATAR_SIZE,
  STATUS_LABELS,
} from "../types";
import { MicVolumeControl } from "./MicVolumeControl";
import { OfficeFloorPlan } from "./OfficeFloorPlan";
import { MAP_PADDING } from "./OfficeFloorPlan";

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

interface OfficeMapProps {
  me: User;
  users: User[];
  nearbyIds: string[];
  playingBotIds: string[];
  myPosRef: React.RefObject<{ x: number; y: number }>;
  micVolume: number;
  onMicVolumeChange: (value: number) => void;
  onMove: (x: number, y: number) => void;
  onStatusChange: (status: UserStatus) => void;
  calendarError?: string | null;
  calendarLinked?: boolean;
  onCalendarSync?: () => void;
}

const SPEED = 4;
const KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"]);

export function OfficeMap({
  me,
  users,
  nearbyIds,
  playingBotIds,
  myPosRef,
  micVolume,
  onMicVolumeChange,
  onMove,
  onStatusChange,
  calendarError,
  calendarLinked,
  onCalendarSync,
}: OfficeMapProps) {
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

    x = Math.max(MAP_PADDING, Math.min(MAP_WIDTH - MAP_PADDING, x));
    y = Math.max(MAP_PADDING, Math.min(MAP_HEIGHT - MAP_PADDING, y));

    if (x !== posRef.current.x || y !== posRef.current.y) {
      posRef.current = { x, y };
      setLocalPos({ x, y });
      const now = Date.now();
      if (now - lastEmitRef.current > 50) {
        lastEmitRef.current = now;
        onMove(x, y);
      }
    }

    myPosRef.current.x = posRef.current.x;
    myPosRef.current.y = posRef.current.y;

    rafRef.current = requestAnimationFrame(tick);
  }, [onMove, myPosRef]);

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
              <MemberIcon user={u} />
              <span className="member-name">
                {u.name}
                {u.id === me.id ? " (あなた)" : ""}
                {u.isBot ? " 🤖" : ""}
              </span>
              <span className={`status-badge status-${u.status}`}>{STATUS_LABELS[u.status]}</span>
            </li>
          ))}
        </ul>

        <MicVolumeControl value={micVolume} onChange={onMicVolumeChange} />

        {onCalendarSync && (
          <div className="calendar-panel">
            <h3>📅 今の予定</h3>
            {me.schedule ? (
              <p className="calendar-preview">
                <span className="calendar-kind calendar-kind-now">参加中</span>
                {me.schedule.label}
                {me.schedule.detail && (
                  <span className="calendar-detail">{me.schedule.detail}</span>
                )}
              </p>
            ) : calendarLinked ? (
              <p className="calendar-empty">今は予定に入っていません（勤務用カレンダーは除く）</p>
            ) : (
              <p className="calendar-empty">
                個人用カレンダーで、いま参加中の予定だけ吹き出しに表示します
              </p>
            )}
            {calendarError && <p className="calendar-error">{calendarError}</p>}
            <button type="button" className="calendar-sync-btn" onClick={onCalendarSync}>
              {calendarLinked ? "カレンダーを再取得" : "カレンダーを連携"}
            </button>
          </div>
        )}

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
          <OfficeFloorPlan />

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
          矢印キー / WASD で移動 · 近いほど大きく、遠いほど小さく聞こえます
        </div>
      </div>
    </div>
  );
}

function ScheduleBubbleView({ schedule, avatarR }: { schedule: ScheduleInfo; avatarR: number }) {
  const w = 148;
  const h = schedule.detail ? 42 : 30;
  const top = -(avatarR + h + 12);
  const stroke = "#6366f1";

  return (
    <g transform={`translate(0, ${top})`} pointerEvents="none">
      <rect
        x={-w / 2}
        y={-h}
        width={w}
        height={h}
        rx={10}
        fill="#ffffff"
        stroke={stroke}
        strokeWidth={2}
      />
      <text
        y={schedule.detail ? -24 : -17}
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill="#1e293b"
      >
        {schedule.label}
      </text>
      {schedule.detail && (
        <text y={-10} textAnchor="middle" fontSize="9" fill="#64748b">
          {schedule.detail}
        </text>
      )}
      <path
        d={`M -7 ${-2} L 0 8 L 7 ${-2} Z`}
        fill="#ffffff"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </g>
  );
}

function MemberIcon({ user }: { user: User }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (user.picture && !user.isBot && !imgFailed) {
    return (
      <img
        src={user.picture}
        alt=""
        className="member-avatar"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return <span className="dot" style={{ background: user.color }} />;
}

function Avatar({ user, isMe, isNearby }: { user: User; isMe?: boolean; isNearby?: boolean }) {
  const r = AVATAR_SIZE / 2;
  const clipId = useId().replace(/:/g, "");
  const [imgFailed, setImgFailed] = useState(false);
  const showPicture = Boolean(user.picture && !user.isBot && !imgFailed);
  const statusRing =
    user.status === "available" ? "#22c55e" : user.status === "busy" ? "#ef4444" : "#94a3b8";
  const stroke = isMe ? "#1e293b" : "#fff";
  const strokeWidth = isMe ? 3 : 2;

  return (
    <g transform={`translate(${user.x}, ${user.y})`}>
      {showPicture && (
        <defs>
          <clipPath id={clipId}>
            <circle r={r} />
          </clipPath>
        </defs>
      )}
      {user.schedule && <ScheduleBubbleView schedule={user.schedule} avatarR={r} />}
      {isNearby && (
        <circle r={r + 8} fill="none" stroke="#6366f1" strokeWidth="3" opacity="0.8">
          <animate attributeName="r" values={`${r + 6};${r + 12};${r + 6}`} dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      <circle r={r + 3} fill={statusRing} opacity="0.9" />
      {showPicture ? (
        <>
          <image
            href={user.picture}
            x={-r}
            y={-r}
            width={r * 2}
            height={r * 2}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
            onError={() => setImgFailed(true)}
          />
          <circle r={r} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </>
      ) : (
        <>
          <circle r={r} fill={user.color} stroke={stroke} strokeWidth={strokeWidth} />
          <text y={5} textAnchor="middle" fontSize="14" fill="#fff" fontWeight="600">
            {user.name.charAt(0).toUpperCase()}
          </text>
        </>
      )}
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
