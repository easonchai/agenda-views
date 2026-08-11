"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Agenda, Session } from "../lib/agenda.js";
import { filterSessions, sortChronologically } from "../lib/agenda.js";
import type { AgendaState, AgendaStatePatch } from "../lib/state.js";
import { resolveAgendaState } from "../lib/state.js";
import { AgendaProvider, useAgenda, useClassNames, useLabels } from "../lib/agenda-context.js";
import type { AgendaClassNames, AgendaLabels } from "../lib/config.js";
import { useEventNow, useMediaQuery, useTheme } from "../lib/hooks.js";
import { AgendaList } from "./agenda-list.js";
import { DayTabs, SearchField, StageFilter, ThemeToggle, ViewToggle } from "./controls.js";
import { cx } from "./primitives.js";
import { SessionSheet } from "./session-sheet.js";
import { GridLegend, TrackGrid } from "./track-grid.js";

type ViewMode = AgendaState["view"];

/**
 * Public entry: owns the provider so a consumer only passes data. The inner
 * component is where all the state lives, and it reads its agenda from context
 * exactly like any other consumer would.
 */
export type AgendaShellProps = {
  agenda: Agenda;
  /** Controlled state. Pair with `onStateChange`. */
  state?: AgendaState;
  /** Uncontrolled starting state. Invalid ids are dropped, not rendered blank. */
  defaultState?: AgendaStatePatch;
  onStateChange?: (next: AgendaState) => void;
  /** 12-hour clock. Default true. */
  hour12?: boolean;
  /** Vertical scale of the time grid, in px per minute. Default 2.3. */
  pxPerMinute?: number;
  /** Below this the grid is replaced by the chronological list. */
  gridBreakpoint?: string;
  /** Theme is usually the host app's job; off by default for embedded use. */
  showThemeToggle?: boolean;
  /** id for the `<main>`, e.g. a skip-link target owned by the host page. */
  mainId?: string;
  className?: string;
  /** Override any user-visible string. Partial — merged over the defaults. */
  labels?: Partial<AgendaLabels>;
  /** Append classes to structural slots without rebuilding the layout. */
  classNames?: AgendaClassNames;
};

export function AgendaShell({
  agenda,
  labels,
  classNames,
  ...props
}: AgendaShellProps) {
  return (
    <AgendaProvider agenda={agenda} labels={labels} classNames={classNames}>
      <AgendaShellInner {...props} />
    </AgendaProvider>
  );
}

function AgendaShellInner({
  state: controlledState,
  defaultState,
  onStateChange,
  hour12 = true,
  pxPerMinute,
  gridBreakpoint = "(min-width: 1024px)",
  showThemeToggle = false,
  mainId,
  className,
}: Omit<AgendaShellProps, "agenda" | "labels" | "classNames">) {
  const index = useAgenda();
  const labels = useLabels();
  const slots = useClassNames();
  const { days, stages, sessions } = index;
  const isWide = useMediaQuery(gridBreakpoint);
  const now = useEventNow(index);
  // unique per instance, so two agendas on one page do not fight over the id
  const nowAnchorId = useId();
  // every id this instance renders is namespaced by this
  const uid = useId();

  /* ------------------------------------------------------------- state */

  // Controlled when `state` is supplied, uncontrolled otherwise — the standard
  // React pattern, so a host can drive this from a router, storage, or nothing
  // at all. `resolveAgendaState` runs once so a stale link cannot render blank.
  const [uncontrolled, setUncontrolled] = useState(() =>
    resolveAgendaState(index, defaultState),
  );
  const state = controlledState ?? uncontrolled;

  const update = useCallback(
    (patch: AgendaStatePatch) => {
      const next = { ...state, ...patch };
      if (controlledState === undefined) setUncontrolled(next);
      onStateChange?.(next);
    },
    [controlledState, onStateChange, state],
  );

  const { dayId, stageIds, query, view: preferredView, selectedId } = state;
  const setDayId = useCallback((id: string) => update({ dayId: id }), [update]);
  const setStageIds = useCallback(
    (ids: string[]) => update({ stageIds: ids }),
    [update],
  );
  const setQuery = useCallback((q: string) => update({ query: q }), [update]);
  const setPreferredView = useCallback(
    (v: ViewMode) => update({ view: v }),
    [update],
  );
  const setSelectedId = useCallback(
    (id: string | null) => update({ selectedId: id }),
    [update],
  );

  const [theme, setTheme] = useTheme();

  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  /* --------------------------------------------------- sticky offset var */

  useEffect(() => {
    const node = headerRef.current;
    const root = rootRef.current;
    if (!node || !root) return;
    // set on this instance's root, not <html>: custom properties inherit, so
    // descendants still read it and a second agenda cannot clobber the first
    const sync = () =>
      root.style.setProperty("--agenda-sticky-top", `${node.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* ------------------------------------------------------------- derived */

  const visible = useMemo(
    () => filterSessions(index, sessions, { dayId, stageIds, formats: [], query }),
    [index, sessions, dayId, stageIds, query],
  );

  const visibleStages = useMemo(
    () => (stageIds.length ? stages.filter((s) => stageIds.includes(s.id)) : stages),
    [stages, stageIds],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) map[s.day] = (map[s.day] ?? 0) + 1;
    return map;
  }, [sessions]);

  // the grid only makes sense with room for lanes; below `lg` we always list
  const view: ViewMode = isWide ? preferredView : "list";
  const selected = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [sessions, selectedId],
  );

  const onSelect = useCallback((session: Session) => setSelectedId(session.id), []);
  const onClose = useCallback(() => setSelectedId(null), []);

  const day = index.dayById.get(dayId)!;

  return (
    <div ref={rootRef} className={cx("min-h-dvh bg-surface", slots.root, className)}>
      {/* --------------------------------------------------- masthead (scrolls) */}
      <header className={cx("print-hide masthead-bloom border-b border-line/60", slots.masthead)}>
        <div className="mx-auto max-w-[1400px] px-5 pt-6 pb-4 sm:px-8 sm:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-text-subtle uppercase">
              {index.agenda.days.length} days · {stages.length} stages ·{" "}
              {sessions.length} sessions
            </p>
            <h1 className="mt-1.5 text-2xl leading-[1.05] font-bold tracking-[-0.02em] text-balance text-text sm:text-4xl">
              Event programme
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-muted">
              <span className="font-medium text-text">
                {day.weekday} {day.short}
              </span>
              <span aria-hidden className="text-text-subtle">
                ·
              </span>
              <span>{labels.sessionsCount(visible.length, counts[dayId])}</span>
              {stageIds.length > 0 && (
                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                  {labels.filtered}
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ViewToggle value={preferredView} onChange={setPreferredView} />
            {showThemeToggle && <ThemeToggle theme={theme} onChange={setTheme} />}
          </div>
        </div>

        <div className="mt-5 sm:max-w-xs">
          <SearchField value={query} onChange={setQuery} resultCount={visible.length} />
        </div>
        </div>
      </header>

      {/*
        Only the controls stick. On a 390px screen a full sticky header would
        eat ~40% of the viewport; the title and search scroll away instead, and
        the sticky bar's measured height feeds the list's own sticky time rails.
      */}
      <div
        ref={headerRef}
        className="print-hide sticky top-0 z-40 border-b border-line bg-surface/85 py-3 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-5 sm:flex-row sm:items-center sm:gap-4 sm:px-8">
          <div className="flex items-center gap-2">
            <DayTabs
              days={days}
              value={dayId}
              onChange={setDayId}
              counts={counts}
              idPrefix={uid}
            />
            {now?.dayId === dayId && (
              <JumpToNowButton anchorId={nowAnchorId} label={labels.now} />
            )}
          </div>
          <div className="min-w-0 sm:ml-auto">
            <StageFilter stages={stages} value={stageIds} onChange={setStageIds} />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- body */}
      <main id={mainId} className={cx("mx-auto max-w-[1400px] px-5 py-5 sm:px-8 sm:py-6", slots.main)}>
        <div
          role="tabpanel"
          id={`${uid}panel-${dayId}`}
          aria-labelledby={`${uid}tab-${dayId}`}
          tabIndex={-1}
        >
          {visible.length === 0 ? (
            <EmptyState
              query={query}
              labels={labels}
              onReset={() => {
                setQuery("");
                setStageIds([]);
              }}
            />
          ) : view === "grid" ? (
            <>
              <TrackGrid
                sessions={visible}
                stages={visibleStages}
                now={now}
                dayId={dayId}
                selectedId={selectedId}
                onSelect={onSelect}
                hour12
                nowAnchorId={nowAnchorId}
              />
              <div className="mt-2">
                <GridLegend hour12 />
              </div>
              {/* the grid is a visual arrangement; this is the linear reading order */}
              <ScreenReaderAgenda sessions={visible} />
            </>
          ) : (
            // a single column of full-width rows is unreadable at 1400px —
            // cap the measure even though the same component serves mobile
            <div className="mx-auto max-w-3xl">
              <AgendaList
                sessions={visible}
                now={now}
                dayId={dayId}
                onSelect={onSelect}
                hour12
                nowAnchorId={nowAnchorId}
              />
            </div>
          )}
        </div>
      </main>

      <SessionSheet session={selected} now={now} onClose={onClose} hour12 />
    </div>
  );
}

/** Scrolls whichever view is mounted to its shared "now" anchor. */
function JumpToNowButton({ anchorId, label }: { anchorId: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() =>
        document
          .getElementById(anchorId)
          ?.scrollIntoView({ block: "center", behavior: "smooth" })
      }
      className="flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-3.5 text-[13px] font-semibold text-text-muted shadow-(--shadow-card) transition hover:border-line-strong hover:text-text"
    >
      <span
        aria-hidden
        className="size-2 rounded-full bg-[var(--color-live)] ring-3 ring-[var(--color-live)]/20"
      />
      {label}
    </button>
  );
}

function EmptyState({
  query,
  labels,
  onReset,
}: {
  query: string;
  labels: AgendaLabels;
  onReset: () => void;
}) {
  return (
    <div className="lane-empty rounded-2xl border border-dashed border-line-strong px-6 py-20 text-center">
      <p className="text-sm font-medium text-text">
        {labels.emptyTitle(query)}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 h-11 rounded-xl border border-line bg-surface-raised px-5 text-sm font-semibold text-text shadow-(--shadow-card) transition hover:border-line-strong hover:bg-surface-sunken"
      >
        {labels.clearFilters}
      </button>
    </div>
  );
}

/**
 * The absolutely-positioned grid conveys time through geometry, which a screen
 * reader cannot follow. This mirrors the same sessions as a flat, ordered list.
 */
function ScreenReaderAgenda({ sessions: list }: { sessions: Session[] }) {
  const index = useAgenda();
  return (
    <ol className="sr-only">
      {sortChronologically(index, list).map((s) => (
        <li key={s.id}>
          {s.start} to {s.end}
          {s.stageId ? `, ${s.stageId.replace(/-/g, " ")} stage` : ", all stages"}:{" "}
          {s.title}
          {s.speakers.length > 0 &&
            `. With ${s.speakers.map((p) => p.name).join(", ")}`}
        </li>
      ))}
    </ol>
  );
}

