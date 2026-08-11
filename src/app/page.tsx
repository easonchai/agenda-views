import { Suspense } from "react";
import { AgendaShell } from "@/components/agenda-shell";

export default function Home() {
  return (
    <Suspense fallback={<AgendaSkeleton />}>
      <AgendaShell />
    </Suspense>
  );
}

/** Shown during prerender; the real shell reads the URL and renders on client. */
function AgendaSkeleton() {
  return (
    <div className="min-h-dvh bg-surface">
      <div className="border-b border-line px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-[1400px] space-y-3">
          <div className="h-7 w-56 rounded-md bg-surface-sunken" />
          <div className="h-11 w-64 rounded-xl bg-surface-sunken" />
          <div className="h-9 w-full max-w-xl rounded-full bg-surface-sunken" />
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
        <div className="h-[60vh] rounded-2xl border border-line bg-surface-sunken" />
      </div>
      <span className="sr-only">Loading the event programme…</span>
    </div>
  );
}
