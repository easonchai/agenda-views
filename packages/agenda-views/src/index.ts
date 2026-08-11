/**
 * agenda-views — a multi-track conference agenda: a desktop time grid and a
 * mobile-first chronological list over one data model.
 *
 * Styling ships separately so it can be themed or dropped entirely:
 *   import "agenda-views/styles.css";
 */
export { AgendaShell } from "./components/agenda-shell.js";
export type { AgendaShellProps } from "./components/agenda-shell.js";

export { TrackGrid, GridLegend, defaultDensity, DEFAULT_PX_PER_MINUTE } from "./components/track-grid.js";
export type {
  BlockDensity,
  GridLegendProps,
  TrackGridProps,
} from "./components/track-grid.js";
export { AgendaList } from "./components/agenda-list.js";
export type { AgendaListProps } from "./components/agenda-list.js";
export { SessionSheet } from "./components/session-sheet.js";
export type { SessionSheetProps } from "./components/session-sheet.js";
export { DayTabs, SearchField, StageFilter, ThemeToggle, ViewToggle } from "./components/controls.js";
export type {
  DayTabsProps,
  SearchFieldProps,
  StageFilterProps,
  ThemeToggleProps,
  ViewToggleProps,
} from "./components/controls.js";
export {
  FormatBadge,
  LiveBadge,
  SpeakerAvatar,
  SpeakerStack,
  StageBadge,
  accentClass,
  sessionAccent,
  useSessionAccent,
} from "./components/primitives.js";

export {
  AgendaProvider,
  useAgenda,
  useClassNames,
  useLabels,
} from "./lib/agenda-context.js";
export type { AgendaProviderProps } from "./lib/agenda-context.js";
export { defaultLabels, resolveLabels } from "./lib/config.js";
export type { AgendaClassNames, AgendaLabels } from "./lib/config.js";
export { useEventNow, useMediaQuery, useScrollLock, useTheme } from "./lib/hooks.js";
export type { Theme } from "./lib/hooks.js";

export {
  agendaStateFromParams,
  agendaStateToParams,
  defaultAgendaState,
  resolveAgendaState,
} from "./lib/state.js";
export type { AgendaState, AgendaStatePatch } from "./lib/state.js";

// the whole headless surface is re-exported for convenience
export * from "./headless.js";
