export type UserStatus = "available" | "busy" | "away";

export interface UserState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  status: UserStatus;
  isBot?: boolean;
}
