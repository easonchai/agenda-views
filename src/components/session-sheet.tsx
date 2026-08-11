"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@/lib/agenda";
import {
  EVENT_TIMEZONE,
  dayById,
  durationMinutes,
  formatDuration,
  formatRange,
  sessionStatus,
  stageById,
} from "@/lib/agenda";
import { useScrollLock } from "@/lib/hooks";
import {
  ClockIcon,
  CloseIcon,
  FormatBadge,
  LiveBadge,
  PinIcon,
  SpeakerAvatar,
  StageBadge,
  cx,
  sessionAccent,
} from "./primitives";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

type Props = {
  session: Session | null;
  now: { dayId: string; minutes: number } | null;
  onClose: () => void;
  hour12: boolean;
};

/**
 * One component, two presentations: a bottom sheet under `sm`, a centred
 * dialog above it. Both are a real modal — focus is trapped, Escape closes,
 * background scroll is locked, and focus returns to the trigger on close.
 */
export function SessionSheet({ session, now, onClose, hour12 }: Props) {
  const open = session !== null;
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    // focus the panel itself, not the first control — screen readers then read
    // the title before the close button
    panelRef.current?.focus();
    return () => restoreRef.current?.focus?.();
  }, [open]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!session) return null;

  const stage = session.stageId ? stageById.get(session.stageId) : null;
  const day = dayById.get(session.day);
  const status = sessionStatus(session, now);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
      onKeyDown={onKeyDown}
    >
      <div
        className="absolute inset-0 bg-ink-950/45 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-sheet-title"
        tabIndex={-1}
        className={cx(
          "animate-sheet-in relative flex max-h-[88dvh] w-full flex-col overflow-hidden",
          "rounded-t-2xl border border-line bg-surface-raised shadow-2xl",
          "sm:max-w-lg sm:rounded-2xl",
          sessionAccent(session),
        )}
      >
        {/* drag affordance — visual only; the sheet closes via backdrop/Esc/button */}
        <div aria-hidden className="flex justify-center pt-2 sm:hidden">
          <span className="h-1 w-9 rounded-full bg-line-strong" />
        </div>

        <div className="flex items-start gap-3 border-b border-line px-5 pt-4 pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <StageBadge session={session} />
              {session.format && <FormatBadge format={session.format} />}
              {status === "live" && <LiveBadge />}
            </div>
            <h2
              id="session-sheet-title"
              className="mt-2 text-lg leading-snug font-bold text-balance text-text"
            >
              {session.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close session details"
            className="-mr-1 grid size-11 shrink-0 place-items-center rounded-full text-text-muted transition hover:bg-surface-sunken hover:text-text"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <dl className="grid gap-3 text-sm">
            <div className="flex gap-2.5">
              <dt className="sr-only">Time</dt>
              <ClockIcon className="mt-0.5 size-4 shrink-0 text-text-subtle" />
              <dd className="text-text">
                <span className="font-medium">
                  {day?.weekday} {day?.short}
                </span>
                {", "}
                <time dateTime={`${day?.date}T${session.start}`}>
                  {formatRange(session.start, session.end, hour12)}
                </time>
                <span className="text-text-subtle">
                  {" "}
                  · {formatDuration(durationMinutes(session))}
                </span>
                <span className="block text-xs text-text-subtle">
                  {EVENT_TIMEZONE.replace("_", " ")} (GMT+8)
                </span>
              </dd>
            </div>

            <div className="flex gap-2.5">
              <dt className="sr-only">Location</dt>
              <PinIcon className="mt-0.5 size-4 shrink-0 text-text-subtle" />
              <dd className="text-text">
                {session.location ?? stage?.venue ?? "Venue-wide"}
              </dd>
            </div>
          </dl>

          {session.description && (
            <p className="mt-4 text-sm leading-relaxed text-pretty text-text-muted">
              {session.description}
            </p>
          )}

          {session.speakers.length > 0 && (
            <section className="mt-5">
              <h3 className="text-xs font-semibold tracking-wider text-text-subtle uppercase">
                {session.speakers.length === 1 ? "Speaker" : "Speakers"}
              </h3>
              <ul className="mt-2.5 grid gap-2.5">
                {session.speakers.map((speaker) => (
                  <li key={speaker.name} className="flex items-center gap-3">
                    <SpeakerAvatar speaker={speaker} size={40} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-text">
                        {speaker.name}
                      </span>
                      {speaker.org && (
                        <span className="block truncate text-xs text-text-muted">
                          {speaker.org}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <CopyLinkButton sessionId={session.id} />
        </div>
      </div>
    </div>
  );
}

function CopyLinkButton({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const url = new URL(window.location.href);
        url.searchParams.set("session", sessionId);
        try {
          await navigator.clipboard.writeText(url.toString());
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy this link", url.toString());
        }
      }}
      className="h-11 w-full rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.99]"
    >
      {copied ? "Link copied" : "Copy link to session"}
    </button>
  );
}
