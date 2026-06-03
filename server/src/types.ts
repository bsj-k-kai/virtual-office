export type UserStatus = "available" | "busy" | "away";

export interface ScheduleInfo {
  label: string;
  detail?: string;
  kind: "now";
}

export interface UserState {
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
