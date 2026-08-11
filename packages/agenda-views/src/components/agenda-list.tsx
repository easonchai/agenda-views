"use client";

import { useEffect, useRef } from "react";
import type { EventNow, Session, SessionStatus } from "../lib/agenda.js";
import { useAgenda } from "../lib/agenda-context.js";
import {
  durationMinutes,
  formatDuration,
  formatTime,
  groupByStart,
  sessionStatus,
} from "../lib/agenda.js";
import {
  FormatBadge,
  LiveBadge,
  PinIcon,
  SpeakerStack,
  StageBadge,
  cx,
  sessionAccent,
} from "./primitives.js";

/**
 * Mobile / narrow view: one chronological column.
 *
 * The desktop grid fails here because four lanes cannot fit in 390px without
 * either horizontal scrolling (which hides tracks) or 60px columns (which
 * truncate every title). Time becomes a sticky rail instead of an axis, and
 * concurrency is communicated by grouping rather than by column position.
 */

type Props = {
  sessions: Session[];
  now: EventNow | null;
  dayId: string;
  onSelect: (session: Session) => void;
  hour12: boolean;
  /** DOM id placed on the live time rail, for an external "jump to now" */
  nowAnchorId?: string;
};

export function AgendaList({
  sessions,
  now,
  dayId,
  onSelect,
  hour12,
  nowAnchorId,
}: Props) {
  const index = useAgenda();
  const groups = groupByStart(index, sessions);
  const liveRef = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef<string | null>(null);

  const nowMinutes = now && now.dayId === dayId ? now.minutes : null;
  // only the first live block gets the scroll anchor
  const liveIndex = groups.findIndex((g) =>
    g.sessions.some((s) => sessionStatus(index, s, now) === "live"),
  );

  // Jump to the current time block once, on the running day. `liveIndex` is in
  // the deps because `now` arrives a tick after mount — keying on the day alone
  // would miss the render where the anchor first exists. rAF lets the sticky
  // rails settle so the target does not land underneath them.
  useEffect(() => {
    if (liveIndex < 0 || !liveRef.current || scrolledFor.current === dayId) return;
    scrolledFor.current = dayId;
    const node = liveRef.current;
    const frame = requestAnimationFrame(() =>
      node.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [dayId, liveIndex]);

  return (
    <ol className="space-y-0">
      {groups.map((group, groupIndex) => {
        const anyLive = groupIndex === liveIndex;

        return (
          <li key={group.start} className="relative">
            {/* sticky time rail — stays pinned while its block scrolls past */}
            <div
              ref={anyLive ? liveRef : undefined}
              id={anyLive ? nowAnchorId : undefined}
              className="sticky top-[var(--agenda-sticky-top,0px)] z-10 -mx-5 flex items-center gap-3 scroll-mt-[calc(var(--agenda-sticky-top,0px)+1rem)] bg-surface/92 px-5 py-2.5 backdrop-blur-md"
            >
              <span className="font-mono text-sm font-semibold tabular-nums text-text">
                {formatTime(group.start, hour12)}
              </span>
              <span aria-hidden className="h-px flex-1 bg-line" />
              {group.sessions.length > 1 && (
                <span className="text-[11px] text-text-subtle">
                  {group.sessions.length} in parallel
                </span>
              )}
              {anyLive && nowMinutes !== null && <LiveBadge />}
            </div>

            <ul className="space-y-2.5 pt-2 pb-5">
              {group.sessions.map((session) => (
                <li key={session.id}>
                  <AgendaRow
                    session={session}
                    status={sessionStatus(index, session, now)}
                    onSelect={onSelect}
                    hour12={hour12}
                  />
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

function AgendaRow({
  session,
  status,
  onSelect,
  hour12,
}: {
  session: Session;
  status: SessionStatus;
  onSelect: (session: Session) => void;
  hour12: boolean;
}) {
  const { stageById } = useAgenda();
  const stage = session.stageId ? stageById.get(session.stageId) : null;
  const minutes = durationMinutes(session);

  if (session.allStages) {
    return (
      <button
        type="button"
        onClick={() => onSelect(session)}
        className="lane-empty flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface-sunken/80 px-4 py-3.5 text-sm font-semibold tracking-wide text-text-muted uppercase transition active:scale-[0.99]"
      >
        {session.title}
        <span className="font-mono text-xs normal-case tabular-nums">
          {formatDuration(minutes)}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      className={cx(
        // 44px minimum target; the whole row is the target, not just the title
        "block w-full rounded-2xl border border-line/80 border-l-3 border-l-[var(--accent)]",
        "accent-wash p-4 text-left shadow-(--shadow-card) transition",
        "active:scale-[0.99] sm:hover:-translate-y-px sm:hover:shadow-(--shadow-lift)",
        status === "past" && "opacity-60",
        sessionAccent(stageById, session),
      )}
    >
      {/*
        The time is the first thing on the card and the highest-contrast text
        on it. On the source site the only timestamp lived in a left rail that
        scrolled away, so people misread when a session actually ran.
      */}
      <span className="flex items-baseline gap-2">
        <span className="font-mono text-[13px] font-bold tabular-nums text-text">
          {formatTime(session.start, hour12)}–{formatTime(session.end, hour12)}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-text-subtle">
          {formatDuration(minutes)}
        </span>
      </span>

      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <StageBadge session={session} size="sm" />
        {session.format && <FormatBadge format={session.format} />}
      </span>

      <span className="mt-1.5 block text-[15px] leading-snug font-semibold text-balance text-text">
        {session.title}
      </span>

      {session.speakers.length > 0 && (
        <span className="mt-2 flex items-center gap-2">
          <SpeakerStack speakers={session.speakers} max={4} size={22} />
          <span className="clamp-1 text-xs text-text-muted">
            {session.speakers.map((s) => s.name).join(", ")}
          </span>
        </span>
      )}

      <span className="mt-2 flex items-center gap-1.5 text-xs text-text-subtle">
        <PinIcon className="size-3 shrink-0" />
        <span className="clamp-1">{session.location ?? stage?.venue}</span>
      </span>
    </button>
  );
}
