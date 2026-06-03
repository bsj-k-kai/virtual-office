export interface ScheduleInfo {
  label: string;
  detail?: string;
  kind: "now";
}

interface GCalEvent {
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface GCalEventsResponse {
  items?: GCalEvent[];
  error?: { message?: string };
}

interface GCalCalendarEntry {
  id?: string;
  summary?: string;
  primary?: boolean;
  selected?: boolean;
}

interface GCalCalendarListResponse {
  items?: GCalCalendarEntry[];
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

/** いま進行中の予定のみ（次の予定は表示しない） */
export function pickCurrentEvent(events: GCalEvent[], now = new Date()): ScheduleInfo | null {
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

  return null;
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

async function gcalFetch<T>(accessToken: string, path: string, params?: URLSearchParams): Promise<T> {
  const url = new URL(`https://www.googleapis.com/calendar/v3/${path}`);
  if (params) {
    for (const [k, v] of params) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    const msg = data.error?.message || `Calendar API error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

/** 勤務用 primary 以外で、Google カレンダーに表示オンのカレンダー */
async function listPersonalCalendars(accessToken: string): Promise<GCalCalendarEntry[]> {
  const data = await gcalFetch<GCalCalendarListResponse>(accessToken, "users/me/calendarList", new URLSearchParams({
    minAccessRole: "reader",
  }));

  return (data.items ?? []).filter((c) => c.id && c.selected && !c.primary);
}

async function fetchEventsForDay(
  accessToken: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<GCalEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "25",
  });

  const data = await gcalFetch<GCalEventsResponse>(
    accessToken,
    `calendars/${encodeURIComponent(calendarId)}/events`,
    params
  );
  return data.items ?? [];
}

/**
 * 勤務先（primary）カレンダーを除き、いま参加中の予定だけを返す。
 */
export async function fetchTodaySchedule(accessToken: string): Promise<ScheduleInfo | null> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const calendars = await listPersonalCalendars(accessToken);
  if (calendars.length === 0) {
    return null;
  }

  const eventLists = await Promise.all(
    calendars.map((cal) => fetchEventsForDay(accessToken, cal.id!, startOfDay, endOfDay))
  );
  const allEvents = eventLists.flat();

  return pickCurrentEvent(allEvents, now);
}
