export type UserStatus = "available" | "busy" | "away";

export interface ScheduleInfo {
  label: string;
  detail?: string;
  kind: "now" | "next";
}

export interface User {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  status: UserStatus;
  email?: string;
  picture?: string;
  schedule?: ScheduleInfo | null;
  isBot?: boolean;
}

export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
}

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;
export const PROXIMITY_RADIUS = 120;
export const AVATAR_SIZE = 36;

export const STATUS_LABELS: Record<UserStatus, string> = {
  available: "対応可",
  busy: "取り込み中",
  away: "離席中",
};

export const AVATAR_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];
