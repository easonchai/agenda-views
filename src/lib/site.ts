import type { Agenda } from "./agenda";

/**
 * Single source of truth for anything that needs an absolute URL: metadataBase,
 * canonical links, OG tags, sitemap and JSON-LD.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://aimto-agenda.vercel.app");

export const eventName = "AI Malaysia Takeover 2026";
export const eventShortName = "AIMTO_26";
export const venueName = "The Campus Ampang";
export const venueLocality = "Ampang, Kuala Lumpur";
export const venueCountry = "MY";

export function formatDateRange(agenda: Agenda): string {
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(
      new Date(`${iso}T00:00:00Z`),
    );
  const first = agenda.days[0];
  const last = agenda.days[agenda.days.length - 1];
  if (!first) return "";
  if (!last || first.date === last.date) {
    return fmt(first.date, { day: "numeric", month: "long", year: "numeric" });
  }
  return `${fmt(first.date, { day: "numeric" })}–${fmt(last.date, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

export function siteDescription(agenda: Agenda): string {
  return (
    `The full ${eventName} programme — ${agenda.sessions.length} sessions across ` +
    `${agenda.stages.length} stages over ${agenda.days.length} days at ${venueName}. ` +
    `Browse by day or stage, search speakers, and add sessions to your calendar.`
  );
}

/** Local wall-clock + fixed offset -> an ISO 8601 instant, for schema.org. */
export function isoInstant(
  date: string,
  hhmm: string,
  utcOffsetMinutes: number,
): string {
  const sign = utcOffsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(utcOffsetMinutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date}T${hhmm}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
