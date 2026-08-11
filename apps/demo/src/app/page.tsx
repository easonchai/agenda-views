import { Suspense } from "react";
import { EventSchema } from "@/components/event-schema";
import { AgendaPage } from "@/components/agenda-page";
import type { Agenda } from "agenda-views/headless";
import agendaData from "@/data/agenda.json";

// the only place the app is bound to this particular event's data
const agenda = agendaData as Agenda;

export default function Home() {
  return (
    <>
      {/* server-rendered, so crawlers get the programme without running JS */}
      <EventSchema agenda={agenda} />
      <Suspense fallback={<AgendaSkeleton />}>
        <AgendaPage agenda={agenda} />
      </Suspense>
    </>
  );
}

/** Shown during prerender; the real shell reads the URL and renders on client. */
function AgendaSkeleton() {
  return (
    <div className="min-h-dvh bg-surface">
      <div className="border-b border-line px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-[1400px] space-y-3">
          <div className="h-7 w-56 rounded-md bg-surface-sunken" />
          <div className="h-11 w-64 rounded-xl bg-surface-sunken" />
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-5 py-5 sm:px-8">
        <div className="h-[60vh] rounded-2xl border border-line bg-surface-sunken" />
      </div>
      <span className="sr-only">Loading the event programme…</span>
    </div>
  );
}
