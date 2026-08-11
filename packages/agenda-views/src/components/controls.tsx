"use client";

import { useId, useRef } from "react";
import type { Day, Stage } from "../lib/agenda.js";
import { useLabels } from "../lib/agenda-context.js";
import { CloseIcon, SearchIcon, accentClass, cx } from "./primitives.js";

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
  const labels = useLabels();
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
      aria-label={labels.dayTabsLabel}
      onKeyDown={onKeyDown}
      className="inline-flex shrink-0 rounded-2xl bg-surface-sunken p-1.5 ring-1 ring-line/60"
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
              "h-11 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition",
              active
                ? "bg-surface-raised text-text shadow-(--shadow-card) ring-1 ring-line/70"
                : "text-text-muted hover:bg-surface/60 hover:text-text",
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
  const labels = useLabels();
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((s) => s !== id) : [...value, id]);

  return (
    <div
      role="group"
      aria-label={labels.stageFilterLabel}
      /*
        `scroll-px-4` is load-bearing, not decoration. With `snap-x` + a
        `snap-start` child, the browser aligns the first chip to the scrollport
        edge and scrolls straight past `px-4`, rendering the strip flush at x=0.
        scroll-padding insets the scrollport so snapping respects the gutter.
      */
      className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:scroll-px-0 sm:px-0"
    >
      <button
        type="button"
        onClick={() => onChange([])}
        aria-pressed={value.length === 0}
        className={cx(
          "h-10 shrink-0 snap-start rounded-full border px-4 text-[13px] font-semibold transition",
          value.length === 0
            ? "border-text bg-text text-surface shadow-(--shadow-card)"
            : "border-line text-text-muted hover:border-line-strong hover:bg-surface-sunken hover:text-text",
        )}
      >
        {labels.allStages}
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
              "flex h-10 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition",
              accentClass[stage.accent],
              active
                ? "border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent-text)] shadow-(--shadow-card)"
                : "border-line text-text-muted hover:border-line-strong hover:bg-surface-sunken hover:text-text",
            )}
          >
            <span
              aria-hidden
              className={cx(
                "size-2 rounded-full bg-[var(--accent)] transition",
                active && "ring-2 ring-[var(--accent)]/30",
              )}
            />
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
  const labels = useLabels();
  const inputId = useId();
  return (
    <div className="relative w-full sm:max-w-xs">
      <label htmlFor={inputId} className="sr-only">
        {labels.searchLabel}
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-text-subtle" />
      <input
        id={inputId}
        type="search"
        inputMode="search"
        autoComplete="off"
        value={value}
        placeholder={labels.searchPlaceholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-line bg-surface-raised pr-10 pl-10 text-sm text-text shadow-(--shadow-card) transition placeholder:text-text-subtle hover:border-line-strong focus:border-[var(--color-brand)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={labels.clearSearch}
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-text-subtle transition hover:bg-surface-sunken hover:text-text"
        >
          <CloseIcon className="size-3.5" />
        </button>
      )}
      {/* announced to screen readers as the user types, without stealing focus */}
      <p aria-live="polite" className="sr-only">
        {value ? labels.searchResults(resultCount, value) : ""}
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
  const labels = useLabels();
  return (
    <div
      role="group"
      aria-label={labels.layoutLabel}
      className="hidden rounded-2xl bg-surface-sunken p-1.5 ring-1 ring-line/60 lg:inline-flex"
    >
      {(["grid", "list"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-pressed={value === mode}
          className={cx(
            "h-9 rounded-xl px-3.5 text-[13px] font-semibold capitalize transition",
            value === mode
              ? "bg-surface-raised text-text shadow-(--shadow-card) ring-1 ring-line/70"
              : "text-text-muted hover:text-text",
          )}
        >
          {mode === "grid" ? labels.gridView : labels.listView}
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
      className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface-raised text-text-muted shadow-(--shadow-card) transition hover:border-line-strong hover:text-text"
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
