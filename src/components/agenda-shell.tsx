"use client";

import type { ReadonlyURLSearchParams } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Agenda, AgendaIndex, Session } from "@/lib/agenda";
import {
  defaultDayId,
  filterSessions,
  sortChronologically,
} from "@/lib/agenda";
import { AgendaProvider, useAgenda } from "@/lib/agenda-context";
import { useEventNow, useMediaQuery, useTheme } from "@/lib/hooks";
import { AgendaList } from "./agenda-list";
import { DayTabs, SearchField, StageFilter, ThemeToggle, ViewToggle } from "./controls";
import { SessionSheet } from "./session-sheet";
import { GridLegend, TrackGrid } from "./track-grid";

type ViewMode = "grid" | "list";

type InitialState = {
  dayId: string;
  stageIds: string[];
  query: string;
  view: ViewMode;
  selectedId: string | null;
};

function readInitialState(
  index: AgendaIndex,
  params: URLSearchParams | ReadonlyURLSearchParams,
): InitialState {
  const deepLinked =
    index.sessions.find((s) => s.id === params.get("session")) ?? null;
  const urlDay = params.get("day");
  const urlView = params.get("view");

  return {
    // a ?session= link wins over ?day= — it implies its own day
    dayId:
      deepLinked?.day ??
      (urlDay && index.dayById.has(urlDay) ? urlDay : defaultDayId(index)),
    stageIds: (params.get("stage")?.split(",") ?? []).filter((id) =>
      index.stages.some((s) => s.id === id),
    ),
    query: params.get("q") ?? "",
    view: urlView === "list" ? "list" : "grid",
    selectedId: deepLinked?.id ?? null,
  };
}

/**
 * Public entry: owns the provider so a consumer only passes data. The inner
 * component is where all the state lives, and it reads its agenda from context
 * exactly like any other consumer would.
 */
export function AgendaShell({
  agenda,
  syncUrl = true,
  showThemeToggle = true,
  mainId,
}: {
  agenda: Agenda;
  /**
   * Read and write `?day=&stage=&q=&view=&session=`. Exactly one agenda on a
   * page may own the URL — a second instance with this on would clobber the
   * first's params on every render. This is the seam that becomes a separate
   * `useAgendaUrlState()` adapter when this is extracted.
   */
  syncUrl?: boolean;
  /** theme is an app-level concern; off for embedded instances */
  showThemeToggle?: boolean;
  /** id for the `<main>`, e.g. as a skip-link target owned by the host page */
  mainId?: string;
}) {
  return (
    <AgendaProvider agenda={agenda}>
      <AgendaShellInner
        syncUrl={syncUrl}
        showThemeToggle={showThemeToggle}
        mainId={mainId}
      />
    </AgendaProvider>
  );
}

function AgendaShellInner({
  syncUrl,
  showThemeToggle,
  mainId,
}: {
  syncUrl: boolean;
  showThemeToggle: boolean;
  mainId?: string;
}) {
  const index = useAgenda();
  const { days, stages, sessions } = index;
  const isWide = useMediaQuery("(min-width: 1024px)");
  const now = useEventNow(index);
  // unique per instance, so two agendas on one page do not fight over the id
  const nowAnchorId = useId();
  // every id this instance renders is namespaced by this
  const uid = useId();

  /* ------------------------------------------------------------ url state */

  // `useSearchParams` opts this subtree out of prerendering, so these lazy
  // initializers run exactly once, on the client, with the real URL in hand —
  // no setState-in-effect, no hydration mismatch from Date/localStorage.
  const searchParams = useSearchParams();
  const [initial] = useState(() =>
    readInitialState(index, syncUrl ? searchParams : new URLSearchParams()),
  );

  const [dayId, setDayId] = useState(initial.dayId);
  const [stageIds, setStageIds] = useState<string[]>(initial.stageIds);
  const [query, setQuery] = useState(initial.query);
  const [preferredView, setPreferredView] = useState<ViewMode>(initial.view);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [theme, setTheme] = useTheme();

  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // write back without pushing history entries — the back button should leave
  // the page, not step through every filter change
  useEffect(() => {
    if (!syncUrl) return;
    const params = new URLSearchParams();
    if (dayId !== days[0].id) params.set("day", dayId);
    if (stageIds.length) params.set("stage", stageIds.join(","));
    if (query) params.set("q", query);
    if (preferredView !== "grid") params.set("view", preferredView);
    if (selectedId) params.set("session", selectedId);
    const search = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`,
    );
  }, [syncUrl, days, dayId, stageIds, query, preferredView, selectedId]);

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
    <div ref={rootRef} className="min-h-dvh bg-surface">
      {/* --------------------------------------------------- masthead (scrolls) */}
      <header className="print-hide masthead-bloom border-b border-line/60">
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
              <span>
                {visible.length === counts[dayId]
                  ? `${counts[dayId]} sessions`
                  : `${visible.length} of ${counts[dayId]} sessions`}
              </span>
              {stageIds.length > 0 && (
                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                  filtered
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
            {now?.dayId === dayId && <JumpToNowButton anchorId={nowAnchorId} />}
          </div>
          <div className="min-w-0 sm:ml-auto">
            <StageFilter stages={stages} value={stageIds} onChange={setStageIds} />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- body */}
      <main id={mainId} className="mx-auto max-w-[1400px] px-5 py-5 sm:px-8 sm:py-6">
        <div
          role="tabpanel"
          id={`${uid}panel-${dayId}`}
          aria-labelledby={`${uid}tab-${dayId}`}
          tabIndex={-1}
        >
          {visible.length === 0 ? (
            <EmptyState
              query={query}
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
function JumpToNowButton({ anchorId }: { anchorId: string }) {
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
      Now
    </button>
  );
}

function EmptyState({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <div className="lane-empty rounded-2xl border border-dashed border-line-strong px-6 py-20 text-center">
      <p className="text-sm font-medium text-text">
        {query ? `No sessions match “${query}”.` : "No sessions match these filters."}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 h-11 rounded-xl border border-line bg-surface-raised px-5 text-sm font-semibold text-text shadow-(--shadow-card) transition hover:border-line-strong hover:bg-surface-sunken"
      >
        Clear filters
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

