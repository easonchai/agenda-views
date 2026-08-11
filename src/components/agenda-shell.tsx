"use client";

import type { ReadonlyURLSearchParams } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NOW_ANCHOR_ID,
  agenda,
  defaultDayId,
  dayById,
  filterSessions,
  sortChronologically,
  type Session,
} from "@/lib/agenda";
import { useEventNow, useMediaQuery, useTheme } from "@/lib/hooks";
import { AgendaList } from "./agenda-list";
import { DayTabs, SearchField, StageFilter, ThemeToggle, ViewToggle } from "./controls";
import { cx } from "./primitives";
import { SessionSheet } from "./session-sheet";
import { GridLegend, TrackGrid } from "./track-grid";

const { days, stages, sessions } = agenda;

type ViewMode = "grid" | "list";

type InitialState = {
  dayId: string;
  stageIds: string[];
  query: string;
  view: ViewMode;
  selectedId: string | null;
};

function readInitialState(params: URLSearchParams | ReadonlyURLSearchParams): InitialState {
  const deepLinked = sessions.find((s) => s.id === params.get("session")) ?? null;
  const urlDay = params.get("day");
  const urlView = params.get("view");

  return {
    // a ?session= link wins over ?day= — it implies its own day
    dayId: deepLinked?.day ?? (urlDay && dayById.has(urlDay) ? urlDay : defaultDayId()),
    stageIds: (params.get("stage")?.split(",") ?? []).filter((id) =>
      stages.some((s) => s.id === id),
    ),
    query: params.get("q") ?? "",
    view: urlView === "list" ? "list" : "grid",
    selectedId: deepLinked?.id ?? null,
  };
}

export function AgendaShell() {
  const isWide = useMediaQuery("(min-width: 1024px)");
  const now = useEventNow();

  /* ------------------------------------------------------------ url state */

  // `useSearchParams` opts this subtree out of prerendering, so these lazy
  // initializers run exactly once, on the client, with the real URL in hand —
  // no setState-in-effect, no hydration mismatch from Date/localStorage.
  const searchParams = useSearchParams();
  const [initial] = useState(() => readInitialState(searchParams));

  const [dayId, setDayId] = useState(initial.dayId);
  const [stageIds, setStageIds] = useState<string[]>(initial.stageIds);
  const [query, setQuery] = useState(initial.query);
  const [preferredView, setPreferredView] = useState<ViewMode>(initial.view);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [theme, setTheme] = useTheme();

  const headerRef = useRef<HTMLDivElement>(null);

  // write back without pushing history entries — the back button should leave
  // the page, not step through every filter change
  useEffect(() => {
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
  }, [dayId, stageIds, query, preferredView, selectedId]);

  /* --------------------------------------------------- sticky offset var */

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const sync = () =>
      document.documentElement.style.setProperty(
        "--agenda-sticky-top",
        `${node.offsetHeight}px`,
      );
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* ------------------------------------------------------------- derived */

  const visible = useMemo(
    () => filterSessions(sessions, { dayId, stageIds, formats: [], query }),
    [dayId, stageIds, query],
  );

  const visibleStages = useMemo(
    () => (stageIds.length ? stages.filter((s) => stageIds.includes(s.id)) : stages),
    [stageIds],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) map[s.day] = (map[s.day] ?? 0) + 1;
    return map;
  }, []);

  // the grid only makes sense with room for lanes; below `lg` we always list
  const view: ViewMode = isWide ? preferredView : "list";
  const selected = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [selectedId],
  );

  const onSelect = useCallback((session: Session) => setSelectedId(session.id), []);
  const onClose = useCallback(() => setSelectedId(null), []);

  const day = dayById.get(dayId)!;

  return (
    <div className="min-h-dvh bg-surface">
      {/* --------------------------------------------------- masthead (scrolls) */}
      <header className="print-hide mx-auto max-w-[1400px] px-4 pt-4 pb-3 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-text sm:text-2xl">
              Event programme
            </h1>
            <p className="mt-0.5 truncate text-sm text-text-muted">
              {day.weekday} {day.short} · {visible.length} of {counts[dayId]} sessions
              {stageIds.length > 0 && " · filtered"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ViewToggle value={preferredView} onChange={setPreferredView} />
            <ThemeToggle theme={theme} onChange={setTheme} />
          </div>
        </div>

        <div className="mt-3 sm:max-w-xs">
          <SearchField value={query} onChange={setQuery} resultCount={visible.length} />
        </div>
      </header>

      {/*
        Only the controls stick. On a 390px screen a full sticky header would
        eat ~40% of the viewport; the title and search scroll away instead, and
        the sticky bar's measured height feeds the list's own sticky time rails.
      */}
      <div
        ref={headerRef}
        className="print-hide sticky top-0 z-40 border-b border-line bg-surface/88 py-2 backdrop-blur-lg"
      >
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
          <div className="flex items-center gap-2">
            <DayTabs days={days} value={dayId} onChange={setDayId} counts={counts} />
            {now?.dayId === dayId && <JumpToNowButton />}
          </div>
          <div className="min-w-0 sm:ml-auto">
            <StageFilter stages={stages} value={stageIds} onChange={setStageIds} />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- body */}
      <main id="agenda" className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
        <div
          role="tabpanel"
          id={`panel-${dayId}`}
          aria-labelledby={`tab-${dayId}`}
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
function JumpToNowButton() {
  return (
    <button
      type="button"
      onClick={() =>
        document
          .getElementById(NOW_ANCHOR_ID)
          ?.scrollIntoView({ block: "center", behavior: "smooth" })
      }
      className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-[13px] font-semibold text-text-muted transition hover:text-text"
    >
      <span aria-hidden className="size-2 rounded-full bg-[var(--color-live)]" />
      Now
    </button>
  );
}

function EmptyState({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
      <p className="text-sm font-medium text-text">
        {query ? `No sessions match “${query}”.` : "No sessions match these filters."}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-3 h-11 rounded-xl border border-line px-4 text-sm font-semibold text-text transition hover:bg-surface-sunken"
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
  return (
    <ol className="sr-only">
      {sortChronologically(list).map((s) => (
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

export { cx };
