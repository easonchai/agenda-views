"use client";

import { useId, useRef } from "react";
import type { Day, Stage } from "@/lib/agenda";
import { CloseIcon, SearchIcon, accentClass, cx } from "./primitives";

/* ------------------------------------------------------------- day tabs */

/**
 * Real WAI-ARIA tabs: roving tabindex, arrow-key navigation, Home/End.
 * Tab moves *out* of the tablist rather than between tabs.
 */
export function DayTabs({
  days,
  value,
  onChange,
  counts,
  idPrefix,
}: {
  days: Day[];
  value: string;
  onChange: (id: string) => void;
  counts: Record<string, number>;
  /** namespaces tab/panel ids so two agendas can coexist on one page */
  idPrefix: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = days.findIndex((d) => d.id === value);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % days.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + days.length) % days.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = days.length - 1;
    else return;
    event.preventDefault();
    onChange(days[next].id);
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Select event day"
      onKeyDown={onKeyDown}
      className="inline-flex rounded-xl bg-surface-sunken p-1"
    >
      {days.map((day) => {
        const active = day.id === value;
        return (
          <button
            key={day.id}
            role="tab"
            id={`${idPrefix}tab-${day.id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}panel-${day.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(day.id)}
            className={cx(
              "h-11 rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition",
              active
                ? "bg-surface-raised text-text shadow-sm"
                : "text-text-muted hover:text-text",
            )}
          >
            {day.label}
            <span className="ml-1.5 font-normal text-text-subtle">{day.short}</span>
            <span className="sr-only">, {counts[day.id] ?? 0} sessions</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------- stage chips */

/**
 * Multi-select filter. Not tabs, not radios — these are toggle buttons, so
 * `aria-pressed` is the correct state, and "All stages" is the empty selection.
 */
export function StageFilter({
  stages,
  value,
  onChange,
}: {
  stages: Stage[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((s) => s !== id) : [...value, id]);

  return (
    <div
      role="group"
      aria-label="Filter by stage"
      className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      <button
        type="button"
        onClick={() => onChange([])}
        aria-pressed={value.length === 0}
        className={cx(
          "h-9 shrink-0 snap-start rounded-full border px-3.5 text-[13px] font-medium transition",
          value.length === 0
            ? "border-text bg-text text-surface"
            : "border-line text-text-muted hover:border-line-strong hover:text-text",
        )}
      >
        All stages
      </button>

      {stages.map((stage) => {
        const active = value.includes(stage.id);
        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => toggle(stage.id)}
            aria-pressed={active}
            className={cx(
              "flex h-9 shrink-0 snap-start items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition",
              accentClass[stage.accent],
              active
                ? "border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent-text)]"
                : "border-line text-text-muted hover:border-line-strong hover:text-text",
            )}
          >
            <span aria-hidden className="size-2 rounded-full bg-[var(--accent)]" />
            {stage.short}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- search */

export function SearchField({
  value,
  onChange,
  resultCount,
}: {
  value: string;
  onChange: (next: string) => void;
  resultCount: number;
}) {
  const inputId = useId();
  return (
    <div className="relative w-full sm:max-w-xs">
      <label htmlFor={inputId} className="sr-only">
        Search sessions, speakers and stages
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-subtle" />
      <input
        id={inputId}
        type="search"
        inputMode="search"
        autoComplete="off"
        value={value}
        placeholder="Search sessions or speakers"
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-line bg-surface-raised pr-9 pl-9 text-sm text-text placeholder:text-text-subtle focus:border-[var(--color-brand)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-text-subtle transition hover:bg-surface-sunken hover:text-text"
        >
          <CloseIcon className="size-3.5" />
        </button>
      )}
      {/* announced to screen readers as the user types, without stealing focus */}
      <p aria-live="polite" className="sr-only">
        {value ? `${resultCount} sessions match ${value}` : ""}
      </p>
    </div>
  );
}

/* --------------------------------------------------------- view toggle */

export function ViewToggle({
  value,
  onChange,
}: {
  value: "grid" | "list";
  onChange: (next: "grid" | "list") => void;
}) {
  return (
    <div
      role="group"
      aria-label="Layout"
      className="hidden rounded-xl bg-surface-sunken p-1 lg:inline-flex"
    >
      {(["grid", "list"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-pressed={value === mode}
          className={cx(
            "h-9 rounded-lg px-3 text-[13px] font-semibold capitalize transition",
            value === mode
              ? "bg-surface-raised text-text shadow-sm"
              : "text-text-muted hover:text-text",
          )}
        >
          {mode === "grid" ? "Time grid" : "Agenda"}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: "light" | "dark";
  onChange: (next: "light" | "dark") => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(theme === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="grid size-11 shrink-0 place-items-center rounded-xl border border-line text-text-muted transition hover:text-text"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-4">
          <path d="M10 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm7-6a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM5 10a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm10.07-5.07a1 1 0 0 1 0 1.41l-.7.71a1 1 0 1 1-1.42-1.42l.71-.7a1 1 0 0 1 1.41 0ZM7.05 12.95a1 1 0 0 1 0 1.41l-.71.71a1 1 0 0 1-1.41-1.42l.7-.7a1 1 0 0 1 1.42 0Zm8.02 2.12a1 1 0 0 1-1.41 0l-.71-.71a1 1 0 0 1 1.42-1.41l.7.7a1 1 0 0 1 0 1.42ZM4.93 4.93a1 1 0 0 1 1.41 0l.71.7A1 1 0 1 1 5.64 7.05l-.71-.71a1 1 0 0 1 0-1.41Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-4">
          <path d="M17.29 12.29A8 8 0 0 1 7.71 2.71a8.001 8.001 0 1 0 9.58 9.58Z" />
        </svg>
      )}
    </button>
  );
}
