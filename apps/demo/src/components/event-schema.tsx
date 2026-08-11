import type { Agenda } from "agenda-views/headless";
import {
  eventName,
  isoInstant,
  siteDescription,
  siteUrl,
  venueCountry,
  venueLocality,
  venueName,
} from "@/lib/site";

/**
 * schema.org Event graph for the whole programme.
 *
 * This is the sanctioned way to give search engines the full session list. The
 * interactive agenda is client-rendered (the URL-state hook opts the subtree
 * out of prerendering), so a crawler that does not execute JS would otherwise
 * see only a skeleton. Emitting the data as JSON-LD is explicitly supported by
 * Google, unlike hiding a duplicate copy of the markup off-screen.
 */
export function EventSchema({ agenda }: { agenda: Agenda }) {
  const { utcOffsetMinutes } = agenda;
  const firstDay = agenda.days[0];
  const lastDay = agenda.days[agenda.days.length - 1];
  if (!firstDay || !lastDay) return null;

  const dayById = new Map(agenda.days.map((d) => [d.id, d]));
  const stageById = new Map(agenda.stages.map((s) => [s.id, s]));

  const place = {
    "@type": "Place",
    name: venueName,
    address: {
      "@type": "PostalAddress",
      addressLocality: venueLocality,
      addressCountry: venueCountry,
    },
  };

  const subEvents = agenda.sessions
    .filter((s) => !s.allStages)
    .map((session) => {
      const day = dayById.get(session.day);
      if (!day) return null;
      const stage = session.stageId ? stageById.get(session.stageId) : null;

      return {
        "@type": "Event",
        name: session.title,
        startDate: isoInstant(day.date, session.start, utcOffsetMinutes),
        endDate: isoInstant(day.date, session.end, utcOffsetMinutes),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        url: `${siteUrl}/?session=${encodeURIComponent(session.id)}`,
        // keep the payload proportionate — full abstracts would add ~30KB
        ...(session.description
          ? { description: session.description.slice(0, 300) }
          : {}),
        location: {
          "@type": "Place",
          name: session.location ?? stage?.venue ?? venueName,
          address: {
            "@type": "PostalAddress",
            addressLocality: venueLocality,
            addressCountry: venueCountry,
          },
        },
        ...(session.speakers.length
          ? {
              performer: session.speakers.map((sp) => ({
                "@type": "Person",
                name: sp.name,
                ...(sp.org ? { affiliation: sp.org } : {}),
              })),
            }
          : {}),
        ...(stage ? { superEvent: { "@type": "Event", name: stage.name } } : {}),
      };
    })
    .filter(Boolean);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: eventName,
    description: siteDescription(agenda),
    startDate: isoInstant(firstDay.date, "09:00", utcOffsetMinutes),
    endDate: isoInstant(lastDay.date, "18:00", utcOffsetMinutes),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: siteUrl,
    image: [`${siteUrl}/opengraph-image`],
    location: place,
    organizer: { "@type": "Organization", name: eventName, url: siteUrl },
    subEvent: subEvents,
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here: it is data we generate, and the
      // `<` escape prevents a stray "</script>" inside any field
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}
