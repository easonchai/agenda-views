"use client";

import { useEffect, useSyncExternalStore } from "react";
import { eventNow } from "./agenda";

/* ------------------------------------------------------------ media query */

const mediaStores = new Map<
  string,
  { subscribe: (cb: () => void) => () => void; getSnapshot: () => boolean }
>();

function mediaStore(query: string) {
  let store = mediaStores.get(query);
  if (store) return store;

  store = {
    subscribe(onChange) {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    getSnapshot: () => window.matchMedia(query).matches,
  };
  mediaStores.set(query, store);
  return store;
}

/**
 * SSR-safe media query. The server snapshot is always `false`, so the first
 * paint matches the server HTML; React then re-renders with the real value.
 */
export function useMediaQuery(query: string): boolean {
  const store = mediaStore(query);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => false);
}

/* ----------------------------------------------------------------- mount */

const noopSubscribe = () => () => {};

/** True once hydrated on the client, false during SSR. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/* ----------------------------------------------------------------- clock */

/**
 * A single shared clock that ticks on minute boundaries. Every consumer reads
 * the same snapshot, so N components cost one timer, not N.
 */
const clock = (() => {
  const listeners = new Set<() => void>();
  let snapshot = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const tick = () => {
    snapshot = Math.floor(Date.now() / 60_000);
    listeners.forEach((l) => l());
    schedule();
  };

  const schedule = () => {
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
  };

  return {
    subscribe(listener: () => void) {
      if (!listeners.size) {
        snapshot = Math.floor(Date.now() / 60_000);
        schedule();
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size && timer) {
          clearTimeout(timer);
          timer = null;
        }
      };
    },
    getSnapshot: () => snapshot,
  };
})();

/**
 * Event-local "now", re-rendering once a minute. `null` during SSR and whenever
 * the visitor's date falls outside the event, which keeps SSR deterministic.
 */
export function useEventNow(): { dayId: string; minutes: number } | null {
  const minuteKey = useSyncExternalStore(
    clock.subscribe,
    clock.getSnapshot,
    () => 0,
  );
  return minuteKey === 0 ? null : eventNow(new Date(minuteKey * 60_000));
}

/* ----------------------------------------------------------------- theme */

export type Theme = "light" | "dark";

/**
 * The theme lives on `<html>`, applied by a blocking script before paint. That
 * makes it external state, so it is read through `useSyncExternalStore`: React
 * hydrates with the server snapshot ("light") and immediately re-reads the real
 * value, instead of tripping a hydration mismatch on the toggle's icon.
 */
const themeStore = (() => {
  const listeners = new Set<() => void>();

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: (): Theme =>
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    set(theme: Theme) {
      const root = document.documentElement;
      root.classList.toggle("dark", theme === "dark");
      root.style.colorScheme = theme;
      try {
        window.localStorage.setItem("agenda-theme", theme);
      } catch {
        // private mode — the theme still applies for this session
      }
      listeners.forEach((l) => l());
    },
  };
})();

export function useTheme(): [Theme, (next: Theme) => void] {
  const theme = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    () => "light" as Theme,
  );
  return [theme, themeStore.set];
}

/* ------------------------------------------------------------ scroll lock */

/** Locks background scroll while a modal/sheet is open, without layout shift. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [active]);
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
