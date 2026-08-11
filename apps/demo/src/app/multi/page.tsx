import type { Metadata } from "next";
import { AgendaShell } from "agenda-views";
import type { Agenda } from "agenda-views/headless";
import agendaData from "@/data/agenda.json";

// a QA fixture that renders the same programme twice — keep it out of the index
export const metadata: Metadata = {
  title: "Two-agenda isolation fixture",
  robots: { index: false, follow: false },
};

/**
 * Proof that the package carries no global state.
 *
 * Two agendas, different data, different timezones, on one page. If anything
 * regresses to a module singleton, a fixed DOM id, or a `<html>`-level CSS
 * variable, this route breaks first. Neither instance owns the URL here, so
 * both are uncontrolled — which is also the simplest possible integration.
 */
const primary = agendaData as Agenda;

const secondary: Agenda = {
  ...primary,
  timezone: "Europe/Lisbon",
  utcOffsetMinutes: 60,
  stages: primary.stages.slice(0, 2),
  sessions: primary.sessions.filter(
    (s) => s.allStages || ["war-room", "sandbox"].includes(s.stageId ?? ""),
  ),
};

export default function MultiAgendaPage() {
  return (
    <div className="divide-y-4 divide-line">
      <AgendaShell agenda={primary} />
      <AgendaShell agenda={secondary} defaultState={{ view: "list" }} />
    </div>
  );
}
