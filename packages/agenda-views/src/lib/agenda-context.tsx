"use client";

import { createContext, useContext, useMemo } from "react";
import type { Agenda, AgendaIndex } from "./agenda.js";
import { createAgendaIndex } from "./agenda.js";
import type { AgendaClassNames, AgendaLabels } from "./config.js";
import { defaultLabels, resolveLabels } from "./config.js";

/**
 * Binds one agenda plus its customisation to a subtree. Replaces what used to
 * be module-level singletons, so multiple agendas can render on one page and
 * the components have no idea where their data or their wording came from.
 */
type AgendaContextValue = {
  index: AgendaIndex;
  labels: AgendaLabels;
  classNames: AgendaClassNames;
};

const AgendaContext = createContext<AgendaContextValue | null>(null);

export type AgendaProviderProps = {
  agenda: Agenda;
  /** Override any user-visible string — partial, merged over the defaults. */
  labels?: Partial<AgendaLabels>;
  /** Append classes to structural slots without rebuilding the layout. */
  classNames?: AgendaClassNames;
  children: React.ReactNode;
};

export function AgendaProvider({
  agenda,
  labels,
  classNames,
  children,
}: AgendaProviderProps) {
  const value = useMemo<AgendaContextValue>(
    () => ({
      index: createAgendaIndex(agenda),
      labels: resolveLabels(labels),
      classNames: classNames ?? {},
    }),
    [agenda, labels, classNames],
  );
  return <AgendaContext value={value}>{children}</AgendaContext>;
}

function useAgendaContext(): AgendaContextValue {
  const value = useContext(AgendaContext);
  if (!value) {
    throw new Error("useAgenda must be used inside <AgendaProvider>");
  }
  return value;
}

/** The indexed agenda — lookups, ordering and the raw data. */
export function useAgenda(): AgendaIndex {
  return useAgendaContext().index;
}

/** Resolved user-visible strings. Falls back to English defaults. */
export function useLabels(): AgendaLabels {
  return useContext(AgendaContext)?.labels ?? defaultLabels;
}

/** Consumer class overrides for structural slots. */
export function useClassNames(): AgendaClassNames {
  return useContext(AgendaContext)?.classNames ?? {};
}
