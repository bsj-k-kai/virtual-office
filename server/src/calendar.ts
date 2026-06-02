export interface ScheduleInfo {
  label: string;
  detail?: string;
  kind: "now" | "next";
}

interface GCalEvent {
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface GCalListResponse {
  items?: GCalEvent[];
  error?: { message?: string };
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatTimeJa(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  });
}

function eventBounds(event: GCalEvent): { start: Date; end: Date; allDay: boolean } | null {
  const summary = event.summary?.trim();
  if (!summary) return null;

  if (event.start?.dateTime && event.end?.dateTime) {
    return {
      start: new Date(event.start.dateTime),
      end: new Date(event.end.dateTime),
      allDay: false,
    };
  }

  if (event.start?.date && event.end?.date) {
    const start = new Date(`${event.start.date}T00:00:00+09:00`);
    const end = new Date(`${event.end.date}T00:00:00+09:00`);
    return { start, end, allDay: true };
  }

  return null;
}

export function pickScheduleBubble(events: GCalEvent[], now = new Date()): ScheduleInfo | null {
  const nowMs = now.getTime();
  const parsed = events
    .map((e) => {
      const bounds = eventBounds(e);
      if (!bounds) return null;
      return { summary: e.summary!.trim(), ...bounds };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  for (const event of parsed) {
    if (event.start.getTime() <= nowMs && nowMs < event.end.getTime()) {
      const detail = event.allDay
        ? "終日"
        : `${formatTimeJa(event.start.toISOString())}–${formatTimeJa(event.end.toISOString())}`;
      return {
        label: truncate(event.summary, 22),
        detail,
        kind: "now",
      };
    }
  }

  const next = parsed.find((e) => e.start.getTime() > nowMs);
  if (!next) return null;

  const detail = next.allDay
    ? "終日"
    : `${formatTimeJa(next.start.toISOString())} から`;
  return {
    label: truncate(next.summary, 22),
    detail: `次: ${detail}`,
    kind: "next",
  };
}

export async function verifyAccessTokenEmail(
  accessToken: string,
  expectedEmail: string
): Promise<boolean> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { email?: string };
  return data.email?.toLowerCase() === expectedEmail.toLowerCase();
}

export async function fetchTodaySchedule(accessToken: string): Promise<ScheduleInfo | null> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", startOfDay.toISOString());
  url.searchParams.set("timeMax", endOfDay.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "25");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await res.json()) as GCalListResponse;
  if (!res.ok) {
    const msg = data.error?.message || `Calendar API error (${res.status})`;
    throw new Error(msg);
  }

  return pickScheduleBubble(data.items ?? []);
}
