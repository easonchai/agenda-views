import { describe, expect, it } from "vitest";
import type { Agenda, Session } from "./agenda.js";
import {
  buildGrid,
  createAgendaIndex,
  durationMinutes,
  eventNow,
  filterSessions,
  formatDuration,
  formatTime,
  groupByStart,
  sessionStatus,
  sortChronologically,
  toMinutes,
} from "./agenda.js";

/* ------------------------------------------------------------- fixtures */

function session(p: Partial<Session> & Pick<Session, "id" | "start" | "end">): Session {
  return {
    day: "d1",
    stageId: "a",
    allStages: false,
    format: null,
    title: p.id,
    description: null,
    location: null,
    speakers: [],
    ...p,
  };
}

const agenda: Agenda = {
  timezone: "Asia/Kuala_Lumpur",
  utcOffsetMinutes: 480,
  days: [
    { id: "d1", date: "2026-08-11", label: "Day 1", short: "11 Aug", weekday: "Tue" },
    { id: "d2", date: "2026-08-12", label: "Day 2", short: "12 Aug", weekday: "Wed" },
  ],
  stages: [
    { id: "a", name: "Alpha", short: "Alpha", venue: "Hall A", accent: "amber" },
    { id: "b", name: "Beta", short: "Beta", venue: "Hall B", accent: "sky" },
  ],
  sessions: [],
};

const index = createAgendaIndex(agenda);

/* ----------------------------------------------------------------- time */

describe("time helpers", () => {
  it("round-trips minutes", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("23:59")).toBe(1439);
  });

  it("formats 12-hour time without a redundant :00", () => {
    expect(formatTime("09:00")).toBe("9 AM");
    expect(formatTime("12:00")).toBe("12 PM");
    expect(formatTime("00:00")).toBe("12 AM");
    expect(formatTime("13:05")).toBe("1:05 PM");
    expect(formatTime("13:05", false)).toBe("13:05");
  });

  it("formats durations", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h 30m");
  });

  it("measures duration across a session", () => {
    expect(durationMinutes({ start: "10:30", end: "11:30" })).toBe(60);
  });
});

/* ------------------------------------------------------------ event now */

describe("eventNow", () => {
  it("maps a UTC instant onto the event's local day and minute", () => {
    // 2026-08-11T02:30Z === 10:30 in GMT+8
    const now = eventNow(index, new Date("2026-08-11T02:30:00Z"));
    expect(now).toEqual({ dayId: "d1", minutes: 10 * 60 + 30 });
  });

  it("uses the event day, not the visitor's day, across the date line", () => {
    // 23:00Z on the 11th is already 07:00 on the 12th in GMT+8
    const now = eventNow(index, new Date("2026-08-11T23:00:00Z"));
    expect(now).toEqual({ dayId: "d2", minutes: 7 * 60 });
  });

  it("returns null outside the event", () => {
    expect(eventNow(index, new Date("2026-09-01T02:30:00Z"))).toBeNull();
  });
});

/* -------------------------------------------------------------- status */

describe("sessionStatus", () => {
  const s = session({ id: "s", start: "10:00", end: "11:00" });

  it("classifies past, live and upcoming on the running day", () => {
    const at = (m: number) => ({ dayId: "d1", minutes: m });
    expect(sessionStatus(index, s, at(9 * 60))).toBe("upcoming");
    expect(sessionStatus(index, s, at(10 * 60))).toBe("live");
    expect(sessionStatus(index, s, at(10 * 60 + 59))).toBe("live");
    expect(sessionStatus(index, s, at(11 * 60))).toBe("past");
  });

  it("treats the end minute as exclusive so back-to-back sessions never both read live", () => {
    const first = session({ id: "f", start: "10:00", end: "10:30" });
    const second = session({ id: "g", start: "10:30", end: "11:00" });
    const at = { dayId: "d1", minutes: 10 * 60 + 30 };
    expect(sessionStatus(index, first, at)).toBe("past");
    expect(sessionStatus(index, second, at)).toBe("live");
  });

  it("compares by date for sessions on another day", () => {
    const other = session({ id: "o", day: "d2", start: "10:00", end: "11:00" });
    expect(sessionStatus(index, other, { dayId: "d1", minutes: 600 })).toBe("upcoming");
    expect(sessionStatus(index, s, { dayId: "d2", minutes: 600 })).toBe("past");
  });

  it("is unknown without a clock", () => {
    expect(sessionStatus(index, s, null)).toBe("unknown");
  });
});

/* ------------------------------------------------------------ filtering */

describe("filterSessions", () => {
  const list = [
    session({ id: "a1", start: "10:00", end: "11:00", stageId: "a", title: "Alpha talk" }),
    session({
      id: "b1",
      start: "10:00",
      end: "11:00",
      stageId: "b",
      title: "Beta talk",
      speakers: [{ name: "Ada Lovelace", org: "Analytical", avatar: null }],
    }),
    session({ id: "lunch", start: "12:00", end: "13:00", stageId: null, allStages: true, title: "Lunch" }),
    session({ id: "d2", day: "d2", start: "10:00", end: "11:00" }),
  ];
  const base = { dayId: "d1", stageIds: [], formats: [], query: "" };

  it("keeps only the selected day", () => {
    expect(filterSessions(index, list, base).map((s) => s.id)).toEqual(["a1", "b1", "lunch"]);
  });

  it("keeps all-stage rows through a stage filter — a break belongs to every track", () => {
    const out = filterSessions(index, list, { ...base, stageIds: ["a"] });
    expect(out.map((s) => s.id)).toEqual(["a1", "lunch"]);
  });

  it("searches titles, speakers and stage names", () => {
    expect(filterSessions(index, list, { ...base, query: "ada" }).map((s) => s.id)).toEqual(["b1"]);
    expect(filterSessions(index, list, { ...base, query: "Beta" }).map((s) => s.id)).toEqual(["b1"]);
    expect(filterSessions(index, list, { ...base, query: "zzz" })).toEqual([]);
  });
});

/* -------------------------------------------------------------- sorting */

describe("sortChronologically / groupByStart", () => {
  it("orders by start, then all-stage rows, then stage order", () => {
    const list = [
      session({ id: "b", start: "10:00", end: "11:00", stageId: "b" }),
      session({ id: "a", start: "10:00", end: "11:00", stageId: "a" }),
      session({ id: "plenary", start: "10:00", end: "11:00", stageId: null, allStages: true }),
      session({ id: "early", start: "09:00", end: "10:00" }),
    ];
    expect(sortChronologically(index, list).map((s) => s.id)).toEqual([
      "early",
      "plenary",
      "a",
      "b",
    ]);
  });

  it("buckets sessions that share a start time", () => {
    const groups = groupByStart(index, [
      session({ id: "a", start: "10:00", end: "11:00", stageId: "a" }),
      session({ id: "b", start: "10:00", end: "10:30", stageId: "b" }),
      session({ id: "c", start: "11:00", end: "12:00" }),
    ]);
    expect(groups.map((g) => [g.start, g.sessions.length])).toEqual([
      ["10:00", 2],
      ["11:00", 1],
    ]);
  });
});

/* ---------------------------------------------------------- grid layout */

describe("buildGrid", () => {
  it("spans the day with padding and emits hour and half-hour ticks", () => {
    const grid = buildGrid(
      [session({ id: "a", start: "09:00", end: "10:30" })],
      agenda.stages,
    );
    // 09:00 snapped to 09:00 minus 15min pad; 10:30 plus 15min pad
    expect(grid.startMinutes).toBe(9 * 60 - 15);
    expect(grid.endMinutes).toBe(10 * 60 + 30 + 15);
    expect(grid.hours).toEqual([9 * 60, 10 * 60]);
    expect(grid.halfHours).toEqual([9 * 60 + 30, 10 * 60 + 30]);
  });

  it("gives non-overlapping sessions the full lane width", () => {
    const grid = buildGrid(
      [
        session({ id: "a", start: "09:00", end: "10:00" }),
        session({ id: "b", start: "10:00", end: "11:00" }),
      ],
      agenda.stages,
    );
    const lane = grid.lanes[0].items;
    expect(lane.map((i) => [i.column, i.columns])).toEqual([
      [0, 1],
      [0, 1],
    ]);
  });

  it("splits overlapping sessions in one lane into side-by-side columns", () => {
    const grid = buildGrid(
      [
        session({ id: "long", start: "10:00", end: "14:00" }),
        session({ id: "x", start: "10:30", end: "11:00" }),
      ],
      agenda.stages,
    );
    const lane = grid.lanes[0].items;
    expect(lane.every((i) => i.columns === 2)).toBe(true);
    expect(new Set(lane.map((i) => i.column))).toEqual(new Set([0, 1]));
  });

  it("reuses column 0 once an overlap cluster has ended", () => {
    const grid = buildGrid(
      [
        session({ id: "a", start: "09:00", end: "10:00" }),
        session({ id: "b", start: "09:30", end: "10:00" }),
        session({ id: "later", start: "11:00", end: "12:00" }),
      ],
      agenda.stages,
    );
    const later = grid.lanes[0].items.find((i) => i.session.id === "later")!;
    expect([later.column, later.columns]).toEqual([0, 1]);
  });

  it("treats touching sessions as non-overlapping", () => {
    const grid = buildGrid(
      [
        session({ id: "a", start: "09:00", end: "10:00" }),
        session({ id: "b", start: "10:00", end: "11:00" }),
      ],
      agenda.stages,
    );
    expect(grid.lanes[0].items.every((i) => i.columns === 1)).toBe(true);
  });

  it("positions blocks relative to the grid start", () => {
    const grid = buildGrid([session({ id: "a", start: "10:00", end: "11:00" })], agenda.stages);
    const item = grid.lanes[0].items[0];
    expect(item.offset).toBe(10 * 60 - grid.startMinutes);
    expect(item.duration).toBe(60);
  });

  it("lifts all-stage rows out of the lanes into full-width bands", () => {
    const grid = buildGrid(
      [
        session({ id: "lunch", start: "12:00", end: "13:00", stageId: null, allStages: true }),
        session({ id: "a", start: "10:00", end: "11:00" }),
      ],
      agenda.stages,
    );
    expect(grid.fullWidth.map((i) => i.session.id)).toEqual(["lunch"]);
    expect(grid.lanes.flatMap((l) => l.items).map((i) => i.session.id)).toEqual(["a"]);
  });

  it("keeps a lane for a stage with no sessions", () => {
    const grid = buildGrid([session({ id: "a", start: "10:00", end: "11:00" })], agenda.stages);
    expect(grid.lanes).toHaveLength(2);
    expect(grid.lanes[1].items).toEqual([]);
  });
});
