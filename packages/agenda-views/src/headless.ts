/**
 * agenda-views/headless — the layout engine and data model, with no React
 * rendering and no DOM. Bring your own markup.
 *
 * Everything is a pure function over an `AgendaIndex`, so it is trivially
 * testable and safe to run on a server.
 */
export type {
  AccentId,
  Agenda,
  AgendaIndex,
  Day,
  EventNow,
  Filters,
  GridModel,
  PlacedSession,
  Session,
  SessionStatus,
  Speaker,
  Stage,
  StageLane,
  TimeGroup,
} from "./lib/agenda.js";

export {
  buildGrid,
  createAgendaIndex,
  defaultDayId,
  durationMinutes,
  eventNow,
  filterSessions,
  formatDuration,
  formatRange,
  formatTime,
  fromMinutes,
  groupByStart,
  initials,
  sessionStatus,
  sortChronologically,
  speakerSummary,
  toMinutes,
} from "./lib/agenda.js";

export {
  buildIcs,
  downloadIcs,
  googleCalendarUrl,
  icsFilename,
  toUtcStamp,
} from "./lib/calendar.js";

export {
  agendaStateFromParams,
  agendaStateToParams,
  defaultAgendaState,
  resolveAgendaState,
} from "./lib/state.js";
export type { AgendaState, AgendaStatePatch } from "./lib/state.js";
