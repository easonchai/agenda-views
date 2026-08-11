import type { AgendaIndex } from "./agenda.js";
import { defaultDayId } from "./agenda.js";

/** Everything the shell needs to render a view. Serialisable on purpose. */
export type AgendaState = {
  dayId: string;
  stageIds: string[];
  query: string;
  view: "grid" | "list";
  selectedId: string | null;
};

export type AgendaStatePatch = Partial<AgendaState>;

export function defaultAgendaState(index: AgendaIndex): AgendaState {
  return {
    dayId: defaultDayId(index),
    stageIds: [],
    query: "",
    view: "grid",
    selectedId: null,
  };
}

/**
 * Coerce untrusted input (a URL, localStorage, a saved preset) into valid
 * state. Unknown day and stage ids are dropped rather than rendered as an
 * empty agenda, which is the failure mode people actually hit when they share
 * a link from a previous year's programme.
 */
export function resolveAgendaState(
  index: AgendaIndex,
  patch: AgendaStatePatch | undefined,
): AgendaState {
  const base = defaultAgendaState(index);
  if (!patch) return base;

  const deepLinked = patch.selectedId
    ? (index.sessions.find((s) => s.id === patch.selectedId) ?? null)
    : null;

  return {
    // a selected session wins over an explicit day — it implies its own day
    dayId:
      deepLinked?.day ??
      (patch.dayId && index.dayById.has(patch.dayId) ? patch.dayId : base.dayId),
    stageIds: (patch.stageIds ?? []).filter((id) => index.stageById.has(id)),
    query: patch.query ?? "",
    view: patch.view === "list" ? "list" : "grid",
    selectedId: deepLinked?.id ?? null,
  };
}

/* ------------------------------------------------------------ url codec */

/**
 * The URL shape is part of the public contract — `?day=&stage=a,b&q=&view=&session=`
 * — so it lives here rather than inside a framework adapter. Any router can
 * drive the component by round-tripping through these two functions.
 */
export function agendaStateToParams(
  index: AgendaIndex,
  state: AgendaState,
): URLSearchParams {
  const params = new URLSearchParams();
  // omit anything at its default so a pristine view has a clean URL
  if (state.dayId !== index.days[0]?.id) params.set("day", state.dayId);
  if (state.stageIds.length) params.set("stage", state.stageIds.join(","));
  if (state.query) params.set("q", state.query);
  if (state.view !== "grid") params.set("view", state.view);
  if (state.selectedId) params.set("session", state.selectedId);
  return params;
}

export function agendaStateFromParams(
  index: AgendaIndex,
  params: URLSearchParams | { get(key: string): string | null },
): AgendaState {
  return resolveAgendaState(index, {
    dayId: params.get("day") ?? undefined,
    stageIds: params.get("stage")?.split(",").filter(Boolean) ?? [],
    query: params.get("q") ?? "",
    view: params.get("view") === "list" ? "list" : "grid",
    selectedId: params.get("session"),
  });
}
