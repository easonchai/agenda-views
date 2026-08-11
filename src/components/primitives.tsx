"use client";

import type { AccentId, Session, Speaker, Stage } from "@/lib/agenda";
import { initials } from "@/lib/agenda";
import { useAgenda } from "@/lib/agenda-context";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const accentClass: Record<AccentId, string> = {
  amber: "accent-amber",
  emerald: "accent-emerald",
  violet: "accent-violet",
  sky: "accent-sky",
};

/** Pure form, for callers that already hold the lookup. */
export function sessionAccent(
  stageById: Map<string, Stage>,
  session: Session,
): string {
  if (!session.stageId) return "accent-neutral";
  const stage = stageById.get(session.stageId);
  return stage ? accentClass[stage.accent] : "accent-neutral";
}

/** Hook form, for components rendering inside an `<AgendaProvider>`. */
export function useSessionAccent(): (session: Session) => string {
  const { stageById } = useAgenda();
  return (session: Session) => sessionAccent(stageById, session);
}

/* --------------------------------------------------------------- badges */

export function StageBadge({
  session,
  size = "md",
}: {
  session: Session;
  size?: "sm" | "md";
}) {
  const { stageById } = useAgenda();
  const stage = session.stageId ? stageById.get(session.stageId) : null;
  const label = stage?.name ?? "All stages";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide uppercase",
        "bg-[var(--accent-tint)] text-[var(--accent-text)]",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]",
      )}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
      />
      {label}
    </span>
  );
}

export function FormatBadge({ format }: { format: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-text-muted uppercase">
      {format}
    </span>
  );
}

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-live)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
      <span aria-hidden className="size-1.5 rounded-full bg-white animate-live-pulse" />
      Live
    </span>
  );
}

/* -------------------------------------------------------------- speakers */

export function SpeakerAvatar({
  speaker,
  size = 24,
}: {
  speaker: Speaker;
  size?: number;
}) {
  if (!speaker.avatar) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-tint)] font-semibold text-[var(--accent-text)] ring-2 ring-surface-raised"
      >
        {initials(speaker.name)}
      </span>
    );
  }
  return (
    // plain <img>: these are remote, already-sized CDN avatars that were passing
    // `unoptimized` anyway, and this keeps the component framework-agnostic
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={speaker.avatar}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover ring-2 ring-surface-raised"
    />
  );
}

/** Overlapping avatar stack + "+N" overflow chip. */
export function SpeakerStack({
  speakers,
  max = 3,
  size = 24,
}: {
  speakers: Speaker[];
  max?: number;
  size?: number;
}) {
  if (!speakers.length) return null;
  const shown = speakers.slice(0, max);
  const rest = speakers.length - shown.length;
  return (
    <span className="flex shrink-0 items-center -space-x-1.5" aria-hidden>
      {shown.map((s) => (
        <SpeakerAvatar key={s.name} speaker={s} size={size} />
      ))}
      {rest > 0 && (
        <span
          style={{ width: size, height: size, fontSize: size * 0.36 }}
          className="inline-flex items-center justify-center rounded-full bg-surface-sunken font-semibold text-text-muted ring-2 ring-surface-raised"
        >
          +{rest}
        </span>
      )}
    </span>
  );
}

/* ----------------------------------------------------------------- icons */

export function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
    </svg>
  );
}

export function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
      className={className}
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
      className={className}
    >
      <circle cx="7.25" cy="7.25" r="4.75" />
      <path d="m11 11 3 3" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
      className={className}
    >
      <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
      className={className}
    >
      <path d="m6 3.5 5 4.5-5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
