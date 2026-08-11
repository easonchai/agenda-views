"use client";

import { useEffect, useRef } from "react";
import type { Session } from "@/lib/agenda";
import {
  NOW_ANCHOR_ID,
  durationMinutes,
  formatDuration,
  formatTime,
  groupByStart,
  sessionStatus,
  stageById,
} from "@/lib/agenda";
import {
  FormatBadge,
  LiveBadge,
  PinIcon,
  SpeakerStack,
  StageBadge,
  cx,
  sessionAccent,
} from "./primitives";

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
  now: { dayId: string; minutes: number } | null;
  dayId: string;
  onSelect: (session: Session) => void;
  hour12: boolean;
};

export function AgendaList({ sessions, now, dayId, onSelect, hour12 }: Props) {
  const groups = groupByStart(sessions);
  const liveRef = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef<string | null>(null);

  const nowMinutes = now && now.dayId === dayId ? now.minutes : null;
  // only the first live block gets the scroll anchor
  const liveIndex = groups.findIndex((g) =>
    g.sessions.some((s) => sessionStatus(s, now) === "live"),
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
      {groups.map((group, index) => {
        const anyLive = index === liveIndex;

        return (
          <li key={group.start} className="relative">
            {/* sticky time rail — stays pinned while its block scrolls past */}
            <div
              ref={anyLive ? liveRef : undefined}
              id={anyLive ? NOW_ANCHOR_ID : undefined}
              className="sticky top-[var(--agenda-sticky-top,0px)] z-10 -mx-4 flex items-center gap-3 scroll-mt-[calc(var(--agenda-sticky-top,0px)+1rem)] bg-surface/92 px-4 py-2 backdrop-blur-md"
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

            <ul className="space-y-2 pt-1 pb-4">
              {group.sessions.map((session) => (
                <li key={session.id}>
                  <AgendaRow
                    session={session}
                    status={sessionStatus(session, now)}
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
  status: ReturnType<typeof sessionStatus>;
  onSelect: (session: Session) => void;
  hour12: boolean;
}) {
  const stage = session.stageId ? stageById.get(session.stageId) : null;
  const minutes = durationMinutes(session);

  if (session.allStages) {
    return (
      <button
        type="button"
        onClick={() => onSelect(session)}
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface-sunken px-4 py-3 text-sm font-medium tracking-wide text-text-muted uppercase transition active:scale-[0.99]"
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
        "block w-full rounded-xl border border-line border-l-3 border-l-[var(--accent)]",
        "bg-surface-raised p-3 text-left transition active:scale-[0.99]",
        status === "past" && "opacity-60",
        sessionAccent(session),
      )}
    >
      <span className="flex flex-wrap items-center gap-1.5">
        <StageBadge session={session} size="sm" />
        {session.format && <FormatBadge format={session.format} />}
        <span className="ml-auto font-mono text-[11px] tabular-nums text-text-subtle">
          {formatTime(session.start, hour12)}–{formatTime(session.end, hour12)}
        </span>
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
        <span aria-hidden className="mx-0.5">
          ·
        </span>
        <span className="shrink-0">{formatDuration(minutes)}</span>
      </span>
    </button>
  );
}
