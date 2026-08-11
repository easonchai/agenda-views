"use client";

import { AgendaShell, createAgendaIndex } from "agenda-views";
import type { Agenda } from "agenda-views/headless";
import { useAgendaUrlState } from "agenda-views/next";
import { useMemo } from "react";

/**
 * The demo's thin binding layer: it owns the URL, the package owns the agenda.
 * This is exactly the integration a consumer writes, which is the point —
 * if the published API is awkward, it shows up here first.
 */
export function AgendaPage({ agenda }: { agenda: Agenda }) {
  const index = useMemo(() => createAgendaIndex(agenda), [agenda]);
  const [state, setState] = useAgendaUrlState(index);

  return (
    <AgendaShell
      agenda={agenda}
      state={state}
      onStateChange={setState}
      showThemeToggle
      mainId="agenda"
    />
  );
}
