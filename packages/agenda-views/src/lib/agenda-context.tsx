"use client";

import { createContext, useContext, useMemo } from "react";
import type { Agenda, AgendaIndex } from "./agenda.js";
import { createAgendaIndex } from "./agenda.js";

/**
 * Binds one agenda to a subtree. Replaces what used to be module-level
 * singletons in `agenda.ts`, so multiple agendas can render on one page and
 * the components have no idea where their data came from.
 */
const AgendaContext = createContext<AgendaIndex | null>(null);

export function AgendaProvider({
  agenda,
  children,
}: {
  agenda: Agenda;
  children: React.ReactNode;
}) {
  const index = useMemo(() => createAgendaIndex(agenda), [agenda]);
  return <AgendaContext value={index}>{children}</AgendaContext>;
}

export function useAgenda(): AgendaIndex {
  const index = useContext(AgendaContext);
  if (!index) {
    throw new Error("useAgenda must be used inside <AgendaProvider>");
  }
  return index;
}
