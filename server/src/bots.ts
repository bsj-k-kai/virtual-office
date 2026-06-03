import type { UserState } from "./types.js";

const BOT_COLORS = ["#6366f1", "#ec4899", "#22c55e", "#f97316", "#06b6d4"];

/** フロアプラン（1400×900）上のホーム位置 */
const BOT_DEFS = [
  { name: "田中 太郎", x: 247, y: 108, status: "available" as const },
  { name: "鈴木 花子", x: 560, y: 400, status: "available" as const },
  { name: "佐藤 健太", x: 377, y: 108, status: "busy" as const },
  { name: "山田 美咲", x: 120, y: 540, status: "available" as const },
  { name: "伊藤 大輔", x: 1198, y: 400, status: "away" as const },
];

const MAP_MIN = 36;
const MAP_MAX_X = 1364;
const MAP_MAX_Y = 864;

interface BotRuntime {
  user: UserState;
  targetX: number;
  targetY: number;
}

const bots = new Map<string, BotRuntime>();
let tickTimer: ReturnType<typeof setInterval> | null = null;

function randomIn(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickWanderTarget(homeX: number, homeY: number) {
  return {
    x: Math.max(MAP_MIN, Math.min(MAP_MAX_X, homeX + randomIn(-100, 100))),
    y: Math.max(MAP_MIN, Math.min(MAP_MAX_Y, homeY + randomIn(-80, 80))),
  };
}

export function spawnDemoBots(): UserState[] {
  BOT_DEFS.forEach((def, i) => {
    const id = `bot-${i}`;
    const target = pickWanderTarget(def.x, def.y);
    bots.set(id, {
      user: {
        id,
        name: def.name,
        color: BOT_COLORS[i % BOT_COLORS.length],
        x: def.x,
        y: def.y,
        status: def.status,
        isBot: true,
      },
      targetX: target.x,
      targetY: target.y,
    });
  });
  return getBotUsers();
}

export function getBotUsers(): UserState[] {
  return Array.from(bots.values()).map((b) => b.user);
}

export function isBotId(id: string) {
  return id.startsWith("bot-");
}

export function startBotMovement(
  onMove: (id: string, x: number, y: number) => void
) {
  if (tickTimer) return;

  tickTimer = setInterval(() => {
    for (const [id, runtime] of bots) {
      const { user } = runtime;
      if (user.status === "away") continue;

      const dx = runtime.targetX - user.x;
      const dy = runtime.targetY - user.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 6) {
        const home = BOT_DEFS[Number(id.replace("bot-", ""))];
        const next = pickWanderTarget(home?.x ?? user.x, home?.y ?? user.y);
        runtime.targetX = next.x;
        runtime.targetY = next.y;
        continue;
      }

      const speed = user.status === "busy" ? 1.2 : 2.5;
      user.x += (dx / dist) * speed;
      user.y += (dy / dist) * speed;
      onMove(id, user.x, user.y);
    }
  }, 50);
}

export function stopBotMovement() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}
