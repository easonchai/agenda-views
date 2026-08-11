import { Suspense } from "react";
import { AgendaShell } from "@/components/agenda-shell";
import type { Agenda } from "@/lib/agenda";
import agendaData from "@/data/agenda.json";

/**
 * Proof that the components carry no global state.
 *
 * Two agendas, different data, different timezones, on one page. If anything
 * regresses to a module singleton, a fixed DOM id, or a `<html>`-level CSS
 * variable, this route breaks first: the anchors collide, the sticky offsets
 * fight, or both shells render the same sessions.
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
    <Suspense>
      <div className="divide-y-4 divide-line">
        {/* only the first instance owns the URL */}
        <AgendaShell agenda={primary} />
        <AgendaShell agenda={secondary} syncUrl={false} showThemeToggle={false} />
      </div>
    </Suspense>
  );
}
