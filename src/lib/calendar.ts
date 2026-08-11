import type { AgendaIndex, Session } from "./agenda";
import { durationMinutes, formatRange, toMinutes } from "./agenda";

/**
 * Export a session to an external calendar.
 *
 * The agenda stores wall-clock times plus a fixed UTC offset, so everything
 * here converts to absolute UTC instants first. That way a visitor in London
 * adding a Kuala Lumpur session gets the correct local time in their own
 * calendar, rather than 10:30 in whatever zone their device happens to be in.
 */

/** "2026-08-11" + "10:30" + 480 -> "20260811T023000Z" */
export function toUtcStamp(
  isoDate: string,
  hhmm: string,
  utcOffsetMinutes: number,
): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const local = Date.UTC(y, m - 1, d, 0, 0, 0) + toMinutes(hhmm) * 60_000;
  const utc = new Date(local - utcOffsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}` +
    `T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}00Z`
  );
}

function sessionStamps(index: AgendaIndex, session: Session) {
  const day = index.dayById.get(session.day);
  const date = day?.date ?? new Date().toISOString().slice(0, 10);
  const { utcOffsetMinutes } = index.agenda;
  return {
    start: toUtcStamp(date, session.start, utcOffsetMinutes),
    end: toUtcStamp(date, session.end, utcOffsetMinutes),
  };
}

/** Human-readable body shared by both export formats. */
function sessionDetails(index: AgendaIndex, session: Session): string {
  const stage = session.stageId ? index.stageById.get(session.stageId) : null;
  const parts: string[] = [];

  if (session.speakers.length) {
    parts.push(
      session.speakers
        .map((s) => (s.org ? `${s.name} (${s.org})` : s.name))
        .join(", "),
    );
  }
  if (stage) parts.push(`Stage: ${stage.name}`);
  if (session.format) parts.push(`Format: ${session.format}`);
  if (session.description) parts.push("", session.description);

  return parts.join("\n");
}

function sessionLocation(index: AgendaIndex, session: Session): string {
  const stage = session.stageId ? index.stageById.get(session.stageId) : null;
  return session.location ?? stage?.venue ?? "";
}

/**
 * Google Calendar's event-template URL. Documented-by-convention rather than
 * officially, but stable for years and the only way to prefill without OAuth.
 */
export function googleCalendarUrl(index: AgendaIndex, session: Session): string {
  const { start, end } = sessionStamps(index, session);
  const title = session.format
    ? `${session.title} [${session.format}]`
    : session.title;

  // `dates` are absolute UTC instants (trailing Z), so `ctz` is deliberately
  // omitted — passing both makes Google re-interpret the stamps as local and
  // shifts the event by the offset.
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details: sessionDetails(index, session),
    location: sessionLocation(index, session),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/* --------------------------------------------------------------------- ics */

/** RFC 5545 §3.3.11: escape backslash, semicolon, comma and newline. */
function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 §3.1: fold lines longer than 75 octets with a leading space. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) chunks.push(` ${rest}`);
  return chunks.join("\r\n");
}

export function buildIcs(
  index: AgendaIndex,
  sessions: Session[],
  stamp = new Date(),
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dtstamp =
    `${stamp.getUTCFullYear()}${pad(stamp.getUTCMonth() + 1)}${pad(stamp.getUTCDate())}` +
    `T${pad(stamp.getUTCHours())}${pad(stamp.getUTCMinutes())}${pad(stamp.getUTCSeconds())}Z`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//agenda-views//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const session of sessions) {
    const { start, end } = sessionStamps(index, session);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${session.id}@agenda-views`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      foldLine(`SUMMARY:${escapeIcs(session.title)}`),
      foldLine(`DESCRIPTION:${escapeIcs(sessionDetails(index, session))}`),
      foldLine(`LOCATION:${escapeIcs(sessionLocation(index, session))}`),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Triggers a client-side download of an .ics file. */
export function downloadIcs(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // revoke on the next tick; Safari needs the URL alive through the click
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Slug used for the downloaded filename. */
export function icsFilename(session: Session): string {
  const slug = session.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${slug || "session"}.ics`;
}

/** Used for the button's accessible name. */
export function calendarAriaLabel(session: Session, hour12: boolean): string {
  return `Add ${session.title}, ${formatRange(session.start, session.end, hour12)}, ${formatDurationShort(
    durationMinutes(session),
  )}, to Google Calendar`;
}

function formatDurationShort(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} hour ${m} minutes`;
  if (h) return `${h} hour${h > 1 ? "s" : ""}`;
  return `${m} minutes`;
}
