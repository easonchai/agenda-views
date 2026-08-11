/**
 * Consumer-facing customisation: every user-visible string and every styleable
 * slot, in one place.
 *
 * The rule this follows: a consumer should never have to fork a component to
 * change a word or a colour. Strings go through `labels`, structure goes
 * through `classNames`, and everything visual is already a CSS custom
 * property in styles.css.
 */

export type AgendaLabels = {
  searchPlaceholder: string;
  searchLabel: string;
  clearSearch: string;
  allStages: string;
  stageFilterLabel: string;
  dayTabsLabel: string;
  layoutLabel: string;
  gridView: string;
  listView: string;
  now: string;
  live: string;
  inParallel: (count: number) => string;
  sessionsCount: (shown: number, total: number) => string;
  filtered: string;
  emptyTitle: (query: string) => string;
  clearFilters: string;
  closeSession: string;
  speaker: string;
  speakers: string;
  addToGoogleCalendar: string;
  downloadIcs: string;
  copyLink: string;
  copiedLink: string;
  timezoneNote: (timezone: string, offset: string) => string;
  venueWide: string;
  /** announced to screen readers as the query changes */
  searchResults: (count: number, query: string) => string;
};

export const defaultLabels: AgendaLabels = {
  searchPlaceholder: "Search sessions or speakers",
  searchLabel: "Search sessions, speakers and stages",
  clearSearch: "Clear search",
  allStages: "All stages",
  stageFilterLabel: "Filter by stage",
  dayTabsLabel: "Select event day",
  layoutLabel: "Layout",
  gridView: "Time grid",
  listView: "Agenda",
  now: "Now",
  live: "Live",
  inParallel: (count) => `${count} in parallel`,
  sessionsCount: (shown, total) =>
    shown === total ? `${total} sessions` : `${shown} of ${total} sessions`,
  filtered: "filtered",
  emptyTitle: (query) =>
    query ? `No sessions match “${query}”.` : "No sessions match these filters.",
  clearFilters: "Clear filters",
  closeSession: "Close session details",
  speaker: "Speaker",
  speakers: "Speakers",
  addToGoogleCalendar: "Add to Google Calendar",
  downloadIcs: "Apple / .ics",
  copyLink: "Copy link",
  copiedLink: "Copied",
  timezoneNote: (timezone, offset) => `${timezone} (${offset})`,
  venueWide: "Venue-wide",
  searchResults: (count, query) => `${count} sessions match ${query}`,
};

/**
 * Class hooks for the structural slots. Merged with the defaults rather than
 * replacing them, so a consumer can nudge one thing without rebuilding the
 * component's layout.
 */
export type AgendaClassNames = {
  root?: string;
  masthead?: string;
  title?: string;
  controls?: string;
  main?: string;
  grid?: string;
  gridBlock?: string;
  laneHeader?: string;
  timeGutter?: string;
  list?: string;
  listRail?: string;
  listCard?: string;
  sheet?: string;
  sheetOverlay?: string;
};

export type AgendaConfig = {
  labels: AgendaLabels;
  classNames: AgendaClassNames;
};

export function resolveLabels(overrides?: Partial<AgendaLabels>): AgendaLabels {
  return overrides ? { ...defaultLabels, ...overrides } : defaultLabels;
}
