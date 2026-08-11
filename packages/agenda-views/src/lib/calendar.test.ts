import { describe, expect, it } from "vitest";
import type { Agenda, Session } from "./agenda.js";
import { createAgendaIndex } from "./agenda.js";
import { buildIcs, googleCalendarUrl, icsFilename, toUtcStamp } from "./calendar.js";

const base: Agenda = {
  timezone: "Asia/Kuala_Lumpur",
  utcOffsetMinutes: 480,
  days: [
    { id: "d1", date: "2026-08-11", label: "Day 1", short: "11 Aug", weekday: "Tue" },
  ],
  stages: [
    { id: "a", name: "Alpha", short: "Alpha", venue: "Hall A", accent: "amber" },
  ],
  sessions: [],
};

const session: Session = {
  id: "s1",
  day: "d1",
  start: "10:30",
  end: "11:30",
  stageId: "a",
  allStages: false,
  format: "PANEL",
  title: "Scaling; fast, cheap, good",
  description: "Line one\nLine two",
  location: "Hall A, Ground Floor",
  speakers: [{ name: "Ada Lovelace", org: "Analytical Engines", avatar: null }],
};

const index = createAgendaIndex({ ...base, sessions: [session] });

describe("toUtcStamp", () => {
  it("shifts local wall-clock back to UTC", () => {
    expect(toUtcStamp("2026-08-11", "10:30", 480)).toBe("20260811T023000Z");
  });

  it("rolls back a day when the local time is before the offset", () => {
    expect(toUtcStamp("2026-08-11", "07:30", 480)).toBe("20260810T233000Z");
  });

  it("rolls forward for negative offsets", () => {
    expect(toUtcStamp("2026-08-11", "22:00", -300)).toBe("20260812T030000Z");
  });

  it("handles half-hour offsets", () => {
    expect(toUtcStamp("2026-08-11", "10:30", 330)).toBe("20260811T050000Z");
  });

  it("agrees with the platform Date parser", () => {
    const native = new Date("2026-08-11T10:30:00+08:00")
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    expect(toUtcStamp("2026-08-11", "10:30", 480)).toBe(native);
  });
});

describe("googleCalendarUrl", () => {
  const url = new URL(googleCalendarUrl(index, session));
  const p = url.searchParams;

  it("targets the event template endpoint", () => {
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(p.get("action")).toBe("TEMPLATE");
  });

  it("sends absolute UTC instants", () => {
    expect(p.get("dates")).toBe("20260811T023000Z/20260811T033000Z");
  });

  it("omits ctz — combining it with Z stamps double-shifts the event", () => {
    expect(p.has("ctz")).toBe(false);
  });

  it("carries title, location and speakers", () => {
    expect(p.get("text")).toContain("Scaling; fast, cheap, good");
    expect(p.get("location")).toBe("Hall A, Ground Floor");
    expect(p.get("details")).toContain("Ada Lovelace (Analytical Engines)");
  });

  it("percent-encodes rather than injecting raw separators", () => {
    expect(url.href).not.toContain("Scaling; fast");
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(index, [session], new Date("2026-08-01T00:00:00Z"));

  it("emits a single well-formed VEVENT", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("DTSTART:20260811T023000Z");
    expect(ics).toContain("DTEND:20260811T033000Z");
    expect(ics).toContain("UID:s1@agenda-views");
  });

  it("uses CRLF line endings as RFC 5545 requires", () => {
    expect(ics.includes("\r\n")).toBe(true);
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it("escapes semicolons, commas and newlines in text fields", () => {
    expect(ics).toContain("SUMMARY:Scaling\\; fast\\, cheap\\, good");
    expect(ics).toContain("\\nLine two");
  });

  it("folds lines longer than 75 octets with a leading space", () => {
    const unfoldable = ics
      .split("\r\n")
      .filter((l) => !l.startsWith(" ") && l.length > 75);
    expect(unfoldable).toEqual([]);
  });

  it("emits one VEVENT per session", () => {
    const many = buildIcs(index, [session, { ...session, id: "s2" }], new Date());
    expect(many.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });
});

describe("icsFilename", () => {
  it("slugifies the title", () => {
    expect(icsFilename(session)).toBe("scaling-fast-cheap-good.ics");
  });

  it("falls back when a title has no usable characters", () => {
    expect(icsFilename({ ...session, title: "!!!" })).toBe("session.ics");
  });
});
