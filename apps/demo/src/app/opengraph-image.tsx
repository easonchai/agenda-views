import { ImageResponse } from "next/og";
import agendaData from "@/data/agenda.json";
import type { Agenda } from "agenda-views/headless";
import {
  eventName,
  formatDateRange,
  venueLocality,
  venueName,
} from "@/lib/site";

const agenda = agendaData as Agenda;

export const alt = `${eventName} — full programme`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Built at build time from the same agenda JSON the page renders, so the card
 * can never drift from the actual programme — session and stage counts update
 * themselves when the data changes.
 */
export default function OpengraphImage() {
  // hex rather than oklch: the OG renderer (satori) has no oklch support
  const accents = ["#e8a33d", "#3fae86", "#7c6cf0", "#4f9ad6"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0d0d14",
          backgroundImage:
            "radial-gradient(900px 500px at 8% -12%, rgba(124,108,240,0.30), transparent 62%)," +
            "radial-gradient(760px 460px at 96% 8%, rgba(63,174,134,0.22), transparent 60%)",
          padding: "64px 72px",
          fontFamily: "sans-serif",
          color: "#f4f4f7",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#a9a9bb",
            }}
          >
            {agenda.days.length} days
            <span style={{ color: "#55556a" }}>·</span>
            {agenda.stages.length} stages
            <span style={{ color: "#55556a" }}>·</span>
            {agenda.sessions.length} sessions
          </div>

          <div
            style={{
              fontSize: 82,
              fontWeight: 800,
              letterSpacing: -2.5,
              lineHeight: 1.03,
              marginTop: 22,
              maxWidth: 940,
              display: "flex",
            }}
          >
            {eventName}
          </div>

          <div
            style={{
              fontSize: 36,
              color: "#c6c6d4",
              marginTop: 18,
              display: "flex",
            }}
          >
            Full programme · {formatDateRange(agenda)}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {agenda.stages.map((stage, i) => (
              <div
                key={stage.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 22px",
                  borderRadius: 999,
                  border: `2px solid ${accents[i % accents.length]}55`,
                  background: `${accents[i % accents.length]}1f`,
                  fontSize: 26,
                  color: "#e9e9f2",
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: accents[i % accents.length],
                  }}
                />
                {stage.name}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "2px solid #26263a",
              paddingTop: 24,
              fontSize: 26,
              color: "#9c9cb0",
            }}
          >
            <div style={{ display: "flex" }}>
              {venueName}, {venueLocality}
            </div>
            <div style={{ display: "flex", color: "#cfcfe0" }}>
              aimto-agenda.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
