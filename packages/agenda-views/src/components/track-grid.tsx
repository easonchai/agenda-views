"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  EventNow,
  GridModel,
  PlacedSession,
  Session,
  SessionStatus,
  Stage,
} from "../lib/agenda.js";
import { useAgenda, useClassNames, useLabels } from "../lib/agenda-context.js";
import {
  buildGrid,
  formatRange,
  formatTime,
  fromMinutes,
  sessionStatus,
  speakerSummary,
} from "../lib/agenda.js";
import {
  ClockIcon,
  LiveBadge,
  PinIcon,
  SpeakerStack,
  cx,
  sessionAccent,
} from "./primitives.js";

/**
 * Desktop multi-track time grid.
 *
 * Rows are absolute-positioned by `offset * pxPerMinute` rather than laid out
 * in a CSS grid: sessions here start on 15/30/60-minute boundaries that do NOT
 * align to a single row unit, and a naive row grid collapses that structure.
 */

/**
 * px per minute. 2.3 is the smallest scale at which the shortest real session
 * (30 min → 69px) still fits a time row plus a two-line title, which is the
 * minimum needed to identify a talk without opening it. Overridable per
 * instance for denser or sparser programmes.
 */
export const DEFAULT_PX_PER_MINUTE = 2.3;
const HEADER_HEIGHT = 56;
/** hour ticks this close to the now-line are dropped so the labels can't collide */
const TICK_SUPPRESS_MINUTES = 18;

export type BlockDensity = {
  titleLines: string;
  speakers: boolean;
  location: boolean;
};

/** How much a block can show, purely as a function of its height. */
export function defaultDensity(minutes: number): BlockDensity {
  if (minutes < 30) return { titleLines: "clamp-1", speakers: false, location: false };
  if (minutes < 45) return { titleLines: "clamp-2", speakers: false, location: false };
  if (minutes < 60) return { titleLines: "clamp-2", speakers: true, location: false };
  if (minutes < 90) return { titleLines: "clamp-3", speakers: true, location: true };
  return { titleLines: "clamp-3", speakers: true, location: true };
}

export type TrackGridProps = {
  sessions: Session[];
  stages: Stage[];
  now: EventNow | null;
  dayId: string;
  selectedId: string | null;
  onSelect: (session: Session) => void;
  /** 12-hour clock. Default true. */
  hour12?: boolean;
  /** DOM id placed on the now-line, so an external control can scroll to it */
  nowAnchorId?: string;
  pxPerMinute?: number;
  density?: (minutes: number) => BlockDensity;
};

export function TrackGrid({
  sessions,
  stages,
  now,
  dayId,
  selectedId,
  onSelect,
  hour12 = true,
  nowAnchorId,
  pxPerMinute = DEFAULT_PX_PER_MINUTE,
  density = defaultDensity,
}: TrackGridProps) {
  const index = useAgenda();
  const labels = useLabels();
  const classNames = useClassNames();
  const blockIdPrefix = useId();
  const grid = buildGrid(sessions, stages);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // the block currently under the pointer or keyboard focus, used to project
  // its span back onto the time gutter
  const [active, setActive] = useState<PlacedSession | null>(null);
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
      top: Math.max(0, nowOffset * pxPerMinute - 120),
      behavior: "smooth",
    });
  }, [nowOffset, dayId, pxPerMinute]);

  if (!sessions.length) return null;

  const bodyHeight = grid.totalMinutes * pxPerMinute;

  return (
    <div
      ref={scrollerRef}
      className="print-full relative max-h-[calc(100dvh-var(--agenda-sticky-top,4rem)-2rem)] overflow-auto rounded-2xl border border-line bg-surface-raised shadow-(--shadow-card)"
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
              // `sticky` already creates the containing block for the accent rule
              "sticky top-0 z-20 flex flex-col justify-center border-b border-line px-3.5",
              "bg-linear-to-b from-[var(--accent-tint)] to-surface-raised",
              accentFor(stage.accent),
              classNames.laneHeader,
            )}
            style={{ height: HEADER_HEIGHT }}
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5 bg-[var(--accent)]"
            />
            <span className="flex items-center gap-2 text-sm font-semibold text-text">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-[var(--accent)] ring-3 ring-[var(--accent)]/20"
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
          {[...grid.hours, ...grid.halfHours]
            .filter(
              (minute) =>
                (nowMinutes === null ||
                  Math.abs(minute - nowMinutes) > TICK_SUPPRESS_MINUTES) &&
                // the active block writes its own start/end here instead
                (!active || !isEdgeOf(active, minute, grid.startMinutes)),
            )
            .map((minute) => (
              <div
                key={minute}
                className="absolute right-0 left-0 -translate-y-1/2 pr-2 text-right"
                style={{ top: (minute - grid.startMinutes) * pxPerMinute }}
              >
                <span
                  className={cx(
                    "font-mono tabular-nums",
                    minute % 60 === 0
                      ? "text-[11px] text-text-muted"
                      : "text-[10px] text-text-subtle/70",
                  )}
                >
                  {formatTime(fromMinutes(minute), hour12)}
                </span>
              </div>
            ))}

          {/* the hovered/focused block's exact span, written into the gutter */}
          {active && (
            <div
              className="absolute right-0 left-0 animate-fade-in"
              style={{
                top: active.offset * pxPerMinute,
                height: active.duration * pxPerMinute,
              }}
            >
              <span
                aria-hidden
                className="absolute top-0 bottom-0 right-1 w-0.5 rounded-full bg-[var(--color-brand)]"
              />
              <span className="absolute top-0 right-3 -translate-y-1/2 rounded bg-[var(--color-brand)] px-1 py-px font-mono text-[10px] leading-tight font-bold text-white tabular-nums">
                {formatTime(active.session.start, hour12)}
              </span>
              <span className="absolute right-3 bottom-0 translate-y-1/2 rounded bg-[var(--color-brand)] px-1 py-px font-mono text-[10px] leading-tight font-bold text-white tabular-nums">
                {formatTime(active.session.end, hour12)}
              </span>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------ stage lanes */}
        {grid.lanes.map((lane) => (
          <div
            key={lane.stage.id}
            className={cx(
              "relative border-r border-line last:border-r-0",
              lane.items.length === 0 && "lane-empty",
            )}
            style={{ height: bodyHeight }}
          >
            <TimeRules grid={grid} pxPerMinute={pxPerMinute} />
            {lane.items.map((item) => (
              <GridBlock
                key={item.session.id}
                item={item}
                selected={item.session.id === selectedId}
                status={sessionStatus(index, item.session, now)}
                onSelect={onSelect}
                onActivate={setActive}
                hour12={hour12}
                pxPerMinute={pxPerMinute}
                density={density}
                idPrefix={blockIdPrefix}
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
              top: HEADER_HEIGHT + item.offset * pxPerMinute,
              height: item.duration * pxPerMinute,
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(item.session)}
              className="lane-empty pointer-events-auto flex size-full items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface-sunken/80 text-sm font-semibold tracking-wide text-text-muted transition hover:border-[var(--color-brand)] hover:text-text"
            >
              <span className="tracking-wide uppercase">{item.session.title}</span>
              <span className="font-mono text-xs tabular-nums">
                {formatRange(item.session.start, item.session.end, hour12)}
              </span>
            </button>
          </div>
        ))}

        {/* ------------------------------------------ active block guide lines */}
        {active && (
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 left-[var(--agenda-gutter)] z-10 animate-fade-in"
            style={{
              top: HEADER_HEIGHT + active.offset * pxPerMinute,
              height: active.duration * pxPerMinute,
            }}
          >
            <span className="absolute top-0 right-0 left-0 border-t border-dashed border-[var(--color-brand)]/60" />
            <span className="absolute right-0 bottom-0 left-0 border-t border-dashed border-[var(--color-brand)]/60" />
          </div>
        )}

        {/* -------------------------------------------------------- now line */}
        {nowOffset !== null && (
          <div
            aria-hidden
            id={nowAnchorId}
            className="pointer-events-none absolute right-0 left-0 z-30 scroll-mt-40"
            style={{ top: HEADER_HEIGHT + nowOffset * pxPerMinute }}
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

/** True when `minute` is the start or end edge of the active block. */
function isEdgeOf(active: PlacedSession, minute: number, gridStart: number) {
  const top = gridStart + active.offset;
  return minute === top || minute === top + active.duration;
}

/**
 * Two rule weights. Solid on the hour, dotted on the half — most sessions in a
 * conference programme start on :30, and without a rule there the eye has
 * nothing to measure a block's top edge against.
 */
function TimeRules({
  grid,
  pxPerMinute,
}: {
  grid: GridModel;
  pxPerMinute: number;
}) {
  return (
    <>
      {grid.hours.map((minute) => (
        <div
          key={minute}
          aria-hidden
          className="absolute right-0 left-0 border-t border-line/70"
          style={{ top: (minute - grid.startMinutes) * pxPerMinute }}
        />
      ))}
      {grid.halfHours.map((minute) => (
        <div
          key={minute}
          aria-hidden
          className="absolute right-0 left-0 border-t border-dotted border-line/50"
          style={{ top: (minute - grid.startMinutes) * pxPerMinute }}
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
  onActivate,
  hour12,
  pxPerMinute,
  density,
  idPrefix,
}: {
  item: PlacedSession;
  selected: boolean;
  status: SessionStatus;
  onSelect: (session: Session) => void;
  onActivate: (item: PlacedSession | null) => void;
  /** 12-hour clock. Default true. */
  hour12?: boolean;
  pxPerMinute: number;
  density: (minutes: number) => BlockDensity;
  idPrefix: string;
}) {
  const { stageById } = useAgenda();
  const classNames = useClassNames();
  const { session, offset, duration, column, columns } = item;
  const fit = density(duration);
  const width = 100 / columns;
  const speakers = speakerSummary(session, 2);

  return (
    <button
      type="button"
      id={`${idPrefix}${session.id}`}
      onClick={() => onSelect(session)}
      onPointerEnter={() => onActivate(item)}
      onPointerLeave={() => onActivate(null)}
      onFocus={() => onActivate(item)}
      onBlur={() => onActivate(null)}
      aria-pressed={selected}
      className={cx(
        // buttons vertically centre their content by default, which floats the
        // text in the middle of tall blocks — force top alignment
        "group absolute flex flex-col items-stretch justify-start overflow-hidden",
        "rounded-xl border border-l-3 px-2.5 py-2 text-left",
        "border-line/80 border-l-[var(--accent)] accent-wash shadow-(--shadow-card)",
        "transition duration-150 hover:z-20 hover:-translate-y-px",
        "hover:border-line-strong hover:shadow-(--shadow-lift) focus-visible:z-20",
        selected && "z-20 ring-2 ring-[var(--color-brand)] ring-offset-1 ring-offset-surface-raised",
        status === "past" && "opacity-55 saturate-50",
        sessionAccent(stageById, session),
        classNames.gridBlock,
      )}
      style={{
        top: offset * pxPerMinute,
        height: Math.max(duration * pxPerMinute - 4, 26),
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
