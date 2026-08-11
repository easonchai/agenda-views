import raw from "@/data/agenda.json";

/* ------------------------------------------------------------------ types */

export type AccentId = "amber" | "emerald" | "violet" | "sky";

export type Day = {
  id: string;
  /** ISO date, event-local (Asia/Kuala_Lumpur) */
  date: string;
  label: string;
  short: string;
  weekday: string;
};

export type Stage = {
  id: string;
  name: string;
  short: string;
  venue: string;
  accent: AccentId;
};

export type Speaker = {
  name: string;
  org: string;
  avatar: string | null;
};

export type Session = {
  id: string;
  day: string;
  /** "HH:MM", event-local */
  start: string;
  end: string;
  /** null when the session spans every stage (plenary / break) */
  stageId: string | null;
  allStages: boolean;
  /** PANEL, KEYNOTE, WORKSHOP … parsed off the title prefix */
  format: string | null;
  title: string;
  description: string | null;
  location: string | null;
  speakers: Speaker[];
};

export type Agenda = {
  days: Day[];
  stages: Stage[];
  sessions: Session[];
};

export const agenda = raw as Agenda;
export const { days, stages, sessions } = agenda;

/** Shared anchor id so one "Jump to now" control works in either view. */
export const NOW_ANCHOR_ID = "agenda-now";

/** Event timezone. All "HH:MM" values in the data are wall-clock in this zone. */
export const EVENT_TIMEZONE = "Asia/Kuala_Lumpur";
export const EVENT_UTC_OFFSET_MINUTES = 8 * 60;

export const stageById = new Map(stages.map((s) => [s.id, s]));
export const dayById = new Map(days.map((d) => [d.id, d]));

export const formats = [
  ...new Set(sessions.map((s) => s.format).filter(Boolean) as string[]),
].sort();

/* ------------------------------------------------------------------- time */

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 14:30 -> "2:30 PM" (locale-stable, no Intl round-trip needed) */
export function formatTime(hhmm: string, hour12 = true): string {
  if (!hour12) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatRange(start: string, end: string, hour12 = true): string {
  return `${formatTime(start, hour12)} – ${formatTime(end, hour12)}`;
}

export function durationMinutes(s: Pick<Session, "start" | "end">): number {
  return toMinutes(s.end) - toMinutes(s.start);
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m} min`;
}

/**
 * "Now" expressed as (dayId, minutes-since-midnight) in *event* time, derived
 * from the visitor's real clock. Returns null when today is not an event day.
 */
export function eventNow(now = new Date()): { dayId: string; minutes: number } | null {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const eventDate = new Date(utcMs + EVENT_UTC_OFFSET_MINUTES * 60_000);
  const iso = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(
    eventDate.getDate(),
  ).padStart(2, "0")}`;
  const day = days.find((d) => d.date === iso);
  if (!day) return null;
  return { dayId: day.id, minutes: eventDate.getHours() * 60 + eventDate.getMinutes() };
}

/** The day to open on: today if the event is running, else the first day. */
export function defaultDayId(now = new Date()): string {
  const live = eventNow(now);
  if (live) return live.dayId;
  const today = now.toISOString().slice(0, 10);
  const upcoming = days.find((d) => d.date >= today);
  return (upcoming ?? days[0]).id;
}

/* ---------------------------------------------------------------- queries */

export type Filters = {
  dayId: string;
  stageIds: string[];
  formats: string[];
  query: string;
};

function matchesQuery(session: Session, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    session.title.toLowerCase().includes(needle) ||
    (session.format?.toLowerCase().includes(needle) ?? false) ||
    (session.description?.toLowerCase().includes(needle) ?? false) ||
    (session.location?.toLowerCase().includes(needle) ?? false) ||
    session.speakers.some(
      (p) =>
        p.name.toLowerCase().includes(needle) || p.org.toLowerCase().includes(needle),
    ) ||
    (session.stageId
      ? (stageById.get(session.stageId)?.name.toLowerCase().includes(needle) ?? false)
      : false)
  );
}

export function filterSessions(all: Session[], f: Filters): Session[] {
  return all.filter((s) => {
    if (s.day !== f.dayId) return false;
    // all-stage rows (lunch, plenary) survive stage filtering — they belong to every track
    if (f.stageIds.length && !s.allStages && !f.stageIds.includes(s.stageId ?? "")) return false;
    if (f.formats.length && !f.formats.includes(s.format ?? "")) return false;
    return matchesQuery(s, f.query);
  });
}

/** Chronological, then by stage order, so the mobile list is stable. */
export function sortChronologically(list: Session[]): Session[] {
  const stageOrder = new Map(stages.map((s, i) => [s.id, i]));
  return [...list].sort((a, b) => {
    const byStart = toMinutes(a.start) - toMinutes(b.start);
    if (byStart) return byStart;
    if (a.allStages !== b.allStages) return a.allStages ? -1 : 1;
    const byStage =
      (stageOrder.get(a.stageId ?? "") ?? 99) - (stageOrder.get(b.stageId ?? "") ?? 99);
    if (byStage) return byStage;
    return toMinutes(a.end) - toMinutes(b.end);
  });
}

/** Group a sorted list into buckets that share a start time (mobile rails). */
export type TimeGroup = { start: string; sessions: Session[] };

export function groupByStart(list: Session[]): TimeGroup[] {
  const groups: TimeGroup[] = [];
  for (const s of sortChronologically(list)) {
    const last = groups[groups.length - 1];
    if (last && last.start === s.start) last.sessions.push(s);
    else groups.push({ start: s.start, sessions: [s] });
  }
  return groups;
}

/* ----------------------------------------------------------- grid layout */

export type PlacedSession = {
  session: Session;
  /** minutes from the grid's start — multiply by px-per-minute for `top` */
  offset: number;
  duration: number;
  /** sub-column index within the stage lane, for overlapping sessions */
  column: number;
  columns: number;
};

export type StageLane = {
  stage: Stage;
  items: PlacedSession[];
};

export type GridModel = {
  startMinutes: number;
  endMinutes: number;
  totalMinutes: number;
  /** hour ticks rendered in the time gutter */
  hours: number[];
  lanes: StageLane[];
  /** plenary rows (LUNCH etc.) drawn as full-width bands */
  fullWidth: PlacedSession[];
};

/**
 * Interval-graph packing: within a lane, sessions that overlap in time are
 * split into side-by-side sub-columns. Non-overlapping neighbours reuse
 * column 0, so the common case stays full width.
 */
function packLane(list: Session[], gridStart: number): PlacedSession[] {
  const sorted = [...list].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(b.end) - toMinutes(a.end),
  );

  const placed: PlacedSession[] = sorted.map((session) => ({
    session,
    offset: toMinutes(session.start) - gridStart,
    duration: durationMinutes(session),
    column: 0,
    columns: 1,
  }));

  // assign columns cluster by cluster
  let cluster: PlacedSession[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const width = Math.max(...cluster.map((p) => p.column)) + 1;
    for (const p of cluster) p.columns = width;
    cluster = [];
  };

  for (const p of placed) {
    const start = toMinutes(p.session.start);
    const end = toMinutes(p.session.end);
    if (start >= clusterEnd) {
      flush();
      clusterEnd = end;
      p.column = 0;
      cluster.push(p);
      continue;
    }
    const taken = new Set(
      cluster
        .filter((c) => toMinutes(c.session.end) > start)
        .map((c) => c.column),
    );
    let col = 0;
    while (taken.has(col)) col += 1;
    p.column = col;
    cluster.push(p);
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();

  return placed;
}

const GRID_SNAP = 30;
/** breathing room so the first/last hour label is not clipped by an edge */
const GRID_PAD = 15;

export function buildGrid(list: Session[], visibleStages: Stage[]): GridModel {
  const relevant = list.length ? list : [];
  const rawStart = relevant.length
    ? Math.min(...relevant.map((s) => toMinutes(s.start)))
    : 9 * 60;
  const rawEnd = relevant.length ? Math.max(...relevant.map((s) => toMinutes(s.end))) : 18 * 60;

  const startMinutes = Math.floor(rawStart / GRID_SNAP) * GRID_SNAP - GRID_PAD;
  const endMinutes = Math.ceil(rawEnd / GRID_SNAP) * GRID_SNAP + GRID_PAD;

  const hours: number[] = [];
  for (let m = Math.ceil(startMinutes / 60) * 60; m <= endMinutes; m += 60) hours.push(m);

  const lanes: StageLane[] = visibleStages.map((stage) => ({
    stage,
    items: packLane(
      relevant.filter((s) => !s.allStages && s.stageId === stage.id),
      startMinutes,
    ),
  }));

  const fullWidth = relevant
    .filter((s) => s.allStages)
    .map((session) => ({
      session,
      offset: toMinutes(session.start) - startMinutes,
      duration: durationMinutes(session),
      column: 0,
      columns: 1,
    }));

  return {
    startMinutes,
    endMinutes,
    totalMinutes: endMinutes - startMinutes,
    hours,
    lanes,
    fullWidth,
  };
}

/* ------------------------------------------------------------------- misc */

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function speakerSummary(session: Session, max = 2): string {
  if (!session.speakers.length) return "";
  const names = session.speakers.map((s) => s.name);
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max}`;
}

export function sessionStatus(
  session: Session,
  now: { dayId: string; minutes: number } | null,
): "past" | "live" | "upcoming" | "unknown" {
  if (!now) return "unknown";
  if (session.day !== now.dayId) {
    const day = dayById.get(session.day);
    const nowDay = dayById.get(now.dayId);
    if (!day || !nowDay) return "unknown";
    return day.date < nowDay.date ? "past" : "upcoming";
  }
  const start = toMinutes(session.start);
  const end = toMinutes(session.end);
  if (now.minutes >= end) return "past";
  if (now.minutes >= start) return "live";
  return "upcoming";
}
