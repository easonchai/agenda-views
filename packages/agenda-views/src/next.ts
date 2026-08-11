"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { AgendaIndex } from "./lib/agenda.js";
import type { AgendaState } from "./lib/state.js";
import { agendaStateFromParams, agendaStateToParams } from "./lib/state.js";

/**
 * Drives `<AgendaShell>` from the URL in a Next.js App Router app.
 *
 * Kept out of the main entry on purpose: the core package has no framework
 * dependency, and only this module imports `next/navigation`.
 *
 * Two things worth knowing:
 * - `useSearchParams` opts the subtree out of prerendering, so wrap the
 *   consuming component in `<Suspense>`. The lazy initialiser then runs once,
 *   on the client, with the real URL — no setState-in-effect.
 * - Writes use `replaceState`, so Back leaves the page instead of stepping
 *   through every filter change. Exactly one agenda per page may own the URL.
 */
export function useAgendaUrlState(
  index: AgendaIndex,
): [AgendaState, (next: AgendaState) => void] {
  const searchParams = useSearchParams();
  const [state, setState] = useState(() =>
    agendaStateFromParams(index, searchParams),
  );

  useEffect(() => {
    const search = agendaStateToParams(index, state).toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`,
    );
  }, [index, state]);

  const set = useCallback((next: AgendaState) => setState(next), []);
  return [state, set];
}

export type { AgendaState };
