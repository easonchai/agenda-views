"use client";

import { useEffect, useRef } from "react";
import type { GridModel, PlacedSession, Session, Stage } from "@/lib/agenda";
import {
  NOW_ANCHOR_ID,
  buildGrid,
  formatRange,
  formatTime,
  fromMinutes,
  sessionStatus,
  speakerSummary,
} from "@/lib/agenda";
import {
  ClockIcon,
  LiveBadge,
  PinIcon,
  SpeakerStack,
  cx,
  sessionAccent,
} from "./primitives";

/**
 * Desktop multi-track time grid.
 *
 * Rows are absolute-positioned by `offset * pxPerMinute` rather than laid out
 * in a CSS grid: sessions here start on 15/30/60-minute boundaries that do NOT
 * align to a single row unit, and a naive row grid collapses that structure.
 */

/**
 * px per minute. 2.1 is the smallest scale at which the shortest real session
 * (30 min → 63px) still fits a time row plus a two-line title, which is the
 * minimum needed to identify a talk without opening it.
 */
const PX_PER_MINUTE = 2.3;
const HEADER_HEIGHT = 56;
/** hour ticks this close to the now-line are dropped so the labels can't collide */
const TICK_SUPPRESS_MINUTES = 18;

/** How much a block can show, purely as a function of its height. */
function density(minutes: number) {
  if (minutes < 30) return { titleLines: "clamp-1", speakers: false, location: false };
  if (minutes < 45) return { titleLines: "clamp-2", speakers: false, location: false };
  if (minutes < 60) return { titleLines: "clamp-2", speakers: true, location: false };
  if (minutes < 90) return { titleLines: "clamp-3", speakers: true, location: true };
  return { titleLines: "clamp-3", speakers: true, location: true };
}

type Props = {
  sessions: Session[];
  stages: Stage[];
  now: { dayId: string; minutes: number } | null;
  dayId: string;
  selectedId: string | null;
  onSelect: (session: Session) => void;
  hour12: boolean;
};

export function TrackGrid({
  sessions,
  stages,
  now,
  dayId,
  selectedId,
  onSelect,
  hour12,
}: Props) {
  const grid = buildGrid(sessions, stages);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const nowMinutes = now && now.dayId === dayId ? now.minutes : null;
  const nowOffset =
    nowMinutes !== null &&
    nowMinutes >= grid.startMinutes &&
    nowMinutes <= grid.endMinutes
      ? nowMinutes - grid.startMinutes
      : null;

  // scroll the "now" line into view once, on the day that is actually running
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (nowOffset === null || scrolledFor.current === dayId) return;
    scrolledFor.current = dayId;
    scrollerRef.current?.scrollTo({
      top: Math.max(0, nowOffset * PX_PER_MINUTE - 120),
      behavior: "smooth",
    });
  }, [nowOffset, dayId]);

  if (!sessions.length) return null;

  const bodyHeight = grid.totalMinutes * PX_PER_MINUTE;

  return (
    <div
      ref={scrollerRef}
      className="print-full relative max-h-[calc(100dvh-var(--agenda-sticky-top,4rem)-2rem)] overflow-auto rounded-2xl border border-line bg-surface-raised"
    >
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: `var(--agenda-gutter) repeat(${stages.length}, minmax(var(--agenda-lane-min), 1fr))`,
        }}
      >
        {/* ---------------------------------------------------- stage header */}
        <div
          className="sticky top-0 left-0 z-30 border-r border-b border-line bg-surface-raised"
          style={{ height: HEADER_HEIGHT }}
        />
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={cx(
              "sticky top-0 z-20 flex flex-col justify-center border-b border-line bg-surface-raised px-3",
              accentFor(stage.accent),
            )}
            style={{ height: HEADER_HEIGHT }}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-text">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-[var(--accent)]"
              />
              <span className="truncate">{stage.name}</span>
            </span>
            <span className="truncate pl-4 text-xs text-text-subtle">{stage.venue}</span>
          </div>
        ))}

        {/* ----------------------------------------------------- time gutter */}
        <div
          className="sticky left-0 z-20 border-r border-line bg-surface-raised"
          style={{ height: bodyHeight }}
        >
          {grid.hours
            .filter(
              (minute) =>
                nowMinutes === null ||
                Math.abs(minute - nowMinutes) > TICK_SUPPRESS_MINUTES,
            )
            .map((minute) => (
              <div
                key={minute}
                className="absolute right-0 left-0 -translate-y-1/2 pr-2 text-right"
                style={{ top: (minute - grid.startMinutes) * PX_PER_MINUTE }}
              >
                <span className="font-mono text-[11px] tabular-nums text-text-subtle">
                  {formatTime(fromMinutes(minute), hour12)}
                </span>
              </div>
            ))}
        </div>

        {/* ------------------------------------------------------ stage lanes */}
        {grid.lanes.map((lane) => (
          <div
            key={lane.stage.id}
            className="relative border-r border-line last:border-r-0"
            style={{ height: bodyHeight }}
          >
            <HourLines grid={grid} />
            {lane.items.map((item) => (
              <GridBlock
                key={item.session.id}
                item={item}
                selected={item.session.id === selectedId}
                status={sessionStatus(item.session, now)}
                onSelect={onSelect}
                hour12={hour12}
              />
            ))}
          </div>
        ))}

        {/* --------------------------------------- plenary / all-stage bands */}
        {grid.fullWidth.map((item) => (
          <div
            key={item.session.id}
            className="pointer-events-none absolute right-0 left-[var(--agenda-gutter)] z-10 px-1.5 py-0.5"
            style={{
              top: HEADER_HEIGHT + item.offset * PX_PER_MINUTE,
              height: item.duration * PX_PER_MINUTE,
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(item.session)}
              className="pointer-events-auto flex size-full items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface-sunken text-sm font-medium text-text-muted transition hover:border-[var(--color-brand)] hover:text-text"
            >
              <span className="tracking-wide uppercase">{item.session.title}</span>
              <span className="font-mono text-xs tabular-nums">
                {formatRange(item.session.start, item.session.end, hour12)}
              </span>
            </button>
          </div>
        ))}

        {/* -------------------------------------------------------- now line */}
        {nowOffset !== null && (
          <div
            aria-hidden
            id={NOW_ANCHOR_ID}
            className="pointer-events-none absolute right-0 left-0 z-30 scroll-mt-40"
            style={{ top: HEADER_HEIGHT + nowOffset * PX_PER_MINUTE }}
          >
            <div className="relative h-px bg-[var(--color-live)]">
              {/* the badge lives in the gutter with the other times; nearby hour
                  ticks are suppressed rather than overlapped */}
              <span className="absolute -top-2 right-[calc(100%-var(--agenda-gutter)+2px)] rounded-full bg-[var(--color-live)] px-1.5 py-0.5 font-mono text-[10px] leading-none font-bold text-white tabular-nums shadow-sm">
                {formatTime(fromMinutes(nowMinutes!), hour12)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function accentFor(accent: Stage["accent"]) {
  return `accent-${accent}`;
}

function HourLines({ grid }: { grid: GridModel }) {
  return (
    <>
      {grid.hours.map((minute) => (
        <div
          key={minute}
          aria-hidden
          className="absolute right-0 left-0 border-t border-line/70"
          style={{ top: (minute - grid.startMinutes) * PX_PER_MINUTE }}
        />
      ))}
    </>
  );
}

function GridBlock({
  item,
  selected,
  status,
  onSelect,
  hour12,
}: {
  item: PlacedSession;
  selected: boolean;
  status: ReturnType<typeof sessionStatus>;
  onSelect: (session: Session) => void;
  hour12: boolean;
}) {
  const { session, offset, duration, column, columns } = item;
  const fit = density(duration);
  const width = 100 / columns;
  const speakers = speakerSummary(session, 2);

  return (
    <button
      type="button"
      id={`grid-${session.id}`}
      onClick={() => onSelect(session)}
      aria-pressed={selected}
      className={cx(
        // buttons vertically centre their content by default, which floats the
        // text in the middle of tall blocks — force top alignment
        "group absolute flex flex-col items-stretch justify-start overflow-hidden",
        "rounded-lg border border-l-3 px-2 py-1.5 text-left transition",
        "border-line border-l-[var(--accent)] bg-[var(--accent-tint)]",
        "hover:z-20 hover:shadow-lg hover:shadow-black/5 focus-visible:z-20",
        selected && "z-20 ring-2 ring-[var(--color-brand)] ring-offset-1 ring-offset-surface-raised",
        status === "past" && "opacity-55 saturate-50",
        sessionAccent(session),
      )}
      style={{
        top: offset * PX_PER_MINUTE,
        height: Math.max(duration * PX_PER_MINUTE - 4, 26),
        left: `calc(${column * width}% + 4px)`,
        width: `calc(${width}% - 8px)`,
      }}
    >
      <span className="flex items-center gap-1.5 leading-none">
        <span className="font-mono text-[10px] font-semibold tabular-nums text-[var(--accent-text)]">
          {formatRange(session.start, session.end, hour12)}
        </span>
        {status === "live" && <LiveBadge />}
      </span>

      <span
        className={cx(
          "mt-1 block text-[13px] leading-[1.28] font-semibold text-text",
          fit.titleLines,
        )}
      >
        {session.format && (
          <span className="mr-1 text-[var(--accent-text)]">[{session.format}]</span>
        )}
        {session.title}
      </span>

      {fit.speakers && speakers && (
        <span className="mt-1.5 flex items-center gap-1.5">
          <SpeakerStack speakers={session.speakers} max={3} size={20} />
          <span className="clamp-1 text-[11px] text-text-muted">{speakers}</span>
        </span>
      )}

      {fit.location && session.location && (
        <span className="mt-1 flex items-center gap-1 text-[11px] text-text-subtle">
          <PinIcon className="size-3 shrink-0" />
          <span className="clamp-1">{session.location}</span>
        </span>
      )}
    </button>
  );
}

export function GridLegend({ hour12 }: { hour12: boolean }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-text-subtle">
      <ClockIcon className="size-3.5" />
      Times shown in Malaysia time ({hour12 ? "12-hour" : "24-hour"}).
    </p>
  );
}
