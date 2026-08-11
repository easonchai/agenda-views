# API reference

Every export of `agenda-views`, with real signatures.

- [Components](#components)
- [Hooks](#hooks)
- [Customisation](#customisation)
- [Headless](#headless)
- [Types](#types)
- [CSS variables](#css-variables)
- [Recipes](#recipes)

---

## Components

### `<AgendaShell>`

The whole thing: masthead, controls, both views, and the detail sheet. Owns the provider, so you only pass data.

```tsx
import { AgendaShell } from "agenda-views";
import "agenda-views/styles.css";

<AgendaShell agenda={agenda} />;
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `agenda` | `Agenda` | — | **required** |
| `state` | `AgendaState` | — | controlled mode; pair with `onStateChange` |
| `onStateChange` | `(next: AgendaState) => void` | — | |
| `defaultState` | `Partial<AgendaState>` | — | uncontrolled starting point; invalid ids dropped |
| `labels` | `Partial<AgendaLabels>` | English | merged over defaults |
| `classNames` | `AgendaClassNames` | — | appended to built-in classes |
| `hour12` | `boolean` | `true` | 12- or 24-hour clock |
| `pxPerMinute` | `number` | `2.3` | vertical scale of the grid |
| `gridBreakpoint` | `string` | `"(min-width: 1024px)"` | below this the list replaces the grid |
| `showThemeToggle` | `boolean` | `false` | theme is usually the host app's job |
| `mainId` | `string` | — | id for `<main>`, e.g. a skip-link target |
| `className` | `string` | — | on the root element |

### `<AgendaProvider>`

Binds an agenda, labels and class overrides to a subtree. Use it when composing your own layout from the parts below.

```tsx
<AgendaProvider agenda={agenda} labels={labels} classNames={classNames}>
  {children}
</AgendaProvider>
```

| Prop | Type | Notes |
| --- | --- | --- |
| `agenda` | `Agenda` | **required** |
| `labels` | `Partial<AgendaLabels>` | |
| `classNames` | `AgendaClassNames` | |

### `<TrackGrid>` — `TrackGridProps`

Desktop multi-track grid. Columns are stages, rows are time, blocks are sized by duration.

| Prop | Type | Default |
| --- | --- | --- |
| `sessions` | `Session[]` | — |
| `stages` | `Stage[]` | — |
| `now` | `EventNow \| null` | — |
| `dayId` | `string` | — |
| `selectedId` | `string \| null` | — |
| `onSelect` | `(session: Session) => void` | — |
| `hour12` | `boolean` | `true` |
| `nowAnchorId` | `string` | — |
| `pxPerMinute` | `number` | `2.3` |
| `density` | `(minutes: number) => BlockDensity` | `defaultDensity` |

Returns `null` when `sessions` is empty, so you can render it unconditionally.

### `<AgendaList>` — `AgendaListProps`

Mobile-first chronological column with sticky time rails.

| Prop | Type | Default |
| --- | --- | --- |
| `sessions` | `Session[]` | — |
| `now` | `EventNow \| null` | — |
| `dayId` | `string` | — |
| `onSelect` | `(session: Session) => void` | — |
| `hour12` | `boolean` | `true` |
| `nowAnchorId` | `string` | — |

### `<SessionSheet>` — `SessionSheetProps`

Bottom sheet under `sm`, centred dialog above. A real modal: focus trapped, Escape closes, focus restored, background scroll locked.

| Prop | Type | Default |
| --- | --- | --- |
| `session` | `Session \| null` | — (`null` renders nothing) |
| `now` | `EventNow \| null` | — |
| `onClose` | `() => void` | — |
| `hour12` | `boolean` | `true` |

### Controls

All controlled — they hold no state of their own.

| Component | Props |
| --- | --- |
| `<DayTabs>` | `days: Day[]`, `value: string`, `onChange: (id) => void`, `counts?: Record<string, number>`, `idPrefix?: string` |
| `<StageFilter>` | `stages: Stage[]`, `value: string[]`, `onChange: (ids) => void` |
| `<SearchField>` | `value: string`, `onChange: (q) => void`, `resultCount?: number` |
| `<ViewToggle>` | `value: "grid" \| "list"`, `onChange` |
| `<ThemeToggle>` | `theme: "light" \| "dark"`, `onChange` |

`DayTabs` is a real WAI-ARIA tablist — arrow keys, Home/End, roving tabindex. `idPrefix` defaults to a `useId()`, so two agendas on one page never collide. `counts` is only used for the screen-reader announcement.

`StageFilter` uses `aria-pressed` toggle buttons rather than tabs, because stages are multi-select. An empty array means "all stages".

### Badges and avatars

| Component | Props |
| --- | --- |
| `<StageBadge>` | `session: Session`, `size?: "sm" \| "md"` |
| `<FormatBadge>` | `format: string` |
| `<LiveBadge>` | — |
| `<SpeakerAvatar>` | `speaker: Speaker`, `size?: number` |
| `<SpeakerStack>` | `speakers: Speaker[]`, `max?: number`, `size?: number` |
| `<GridLegend>` | `hour12: boolean` |

---

## Hooks

| Hook | Returns | Notes |
| --- | --- | --- |
| `useAgenda()` | `AgendaIndex` | the indexed agenda; throws outside a provider |
| `useLabels()` | `AgendaLabels` | resolved strings; falls back to defaults |
| `useClassNames()` | `AgendaClassNames` | consumer class overrides |
| `useEventNow(index)` | `EventNow \| null` | event-local now, ticking on minute boundaries |
| `useMediaQuery(query)` | `boolean` | SSR-safe; `false` on the server |
| `useTheme()` | `[Theme, (t: Theme) => void]` | reads/writes `.dark` on `<html>` |
| `useScrollLock(active)` | `void` | locks background scroll without layout shift |
| `useSessionAccent()` | `(session) => string` | accent class for a session |

`useEventNow` shares **one timer across every consumer** — N components cost one interval, not N.

### `useAgendaUrlState(index)` — `agenda-views/next`

```tsx
const [state, setState] = useAgendaUrlState(index);
```

Reads `?day=&stage=&q=&view=&session=` on mount and writes back with `replaceState`, so Back leaves the page rather than stepping through every filter change.

Needs a `<Suspense>` boundary — `useSearchParams` opts the subtree out of prerendering. Exactly one agenda per page should own the URL.

---

## Customisation

### Labels

Every user-visible string. Partial overrides merge over the English defaults.

```tsx
labels={{
  allStages: "Semua pentas",
  now: "Sekarang",
  inParallel: (n) => `${n} serentak`,
  sessionsCount: (shown, total) => `${shown}/${total} sesi`,
}}
```

Full key list: `searchPlaceholder`, `searchLabel`, `clearSearch`, `allStages`, `stageFilterLabel`, `dayTabsLabel`, `layoutLabel`, `gridView`, `listView`, `now`, `live`, `inParallel(count)`, `sessionsCount(shown, total)`, `filtered`, `emptyTitle(query)`, `clearFilters`, `closeSession`, `speaker`, `speakers`, `addToGoogleCalendar`, `downloadIcs`, `copyLink`, `copiedLink`, `timezoneNote(tz, offset)`, `venueWide`, `searchResults(count, query)`.

The pluralising entries are functions, not templates, so languages that don't pluralise like English aren't forced into English grammar.

### Class slots

Appended to the built-in classes, never replacing them.

`root`, `masthead`, `title`, `controls`, `main`, `grid`, `gridBlock`, `laneHeader`, `timeGutter`, `list`, `listRail`, `listCard`, `sheet`, `sheetOverlay`

### Density

How much a block shows is a function of its height. Override to change the thresholds:

```tsx
density={(minutes) => ({
  titleLines: minutes < 45 ? "clamp-1" : "clamp-3",
  speakers: minutes >= 45,
  location: minutes >= 90,
})}
```

---

## Headless

`agenda-views/headless` — no React, no DOM. Safe on a server.

| Function | Signature |
| --- | --- |
| `createAgendaIndex` | `(agenda) => AgendaIndex` |
| `buildGrid` | `(sessions, stages) => GridModel` |
| `filterSessions` | `(index, sessions, filters) => Session[]` |
| `sortChronologically` | `(index, sessions) => Session[]` |
| `groupByStart` | `(index, sessions) => TimeGroup[]` |
| `sessionStatus` | `(index, session, now) => "past" \| "live" \| "upcoming" \| "unknown"` |
| `eventNow` | `(index, date?) => EventNow \| null` |
| `defaultDayId` | `(index, date?) => string` |
| `googleCalendarUrl` | `(index, session) => string` |
| `buildIcs` | `(index, sessions, stamp?) => string` |
| `downloadIcs` | `(filename, contents) => void` |
| `toUtcStamp` | `(isoDate, hhmm, utcOffsetMinutes) => string` |
| `toMinutes` / `fromMinutes` | `"HH:MM" ⇄ number` |
| `formatTime` / `formatRange` / `formatDuration` | display helpers |
| `durationMinutes` / `speakerSummary` / `initials` | small helpers |

State helpers: `defaultAgendaState`, `resolveAgendaState`, `agendaStateToParams`, `agendaStateFromParams`.

### `buildGrid`

```ts
const grid = buildGrid(sessions, stages);
grid.startMinutes;  // grid top, snapped and padded
grid.hours;         // hour ticks
grid.halfHours;     // half-hour ticks
grid.lanes;         // [{ stage, items: PlacedSession[] }]
grid.fullWidth;     // plenary rows (lunch, keynote) spanning all lanes
```

Each `PlacedSession` is `{ session, offset, duration, column, columns }`. Position a block with `top = offset * pxPerMinute`, `height = duration * pxPerMinute`, and width `100 / columns` percent offset by `column`.

Sessions that overlap **within one stage** are split into sub-columns by interval-graph colouring; non-overlapping neighbours reuse the full width.

---

## Types

`Agenda`, `AgendaIndex`, `Day`, `Stage`, `Session`, `Speaker`, `SessionStatus`, `EventNow`, `Filters`, `GridModel`, `PlacedSession`, `StageLane`, `TimeGroup`, `AccentId`, `AgendaState`, `AgendaStatePatch`, `AgendaLabels`, `AgendaClassNames`, `BlockDensity`, `Theme`, plus every component's `*Props`.

```ts
type Agenda = {
  timezone: string;          // IANA, for display
  utcOffsetMinutes: number;  // fixed offset of that zone
  days: Day[];
  stages: Stage[];
  sessions: Session[];
};
```

Times are **wall-clock plus a fixed offset**, not instants — that's what programmes publish, and it means the printed times never shift under a visitor in another timezone while `live` status still resolves correctly.

---

## CSS variables

Override any of these in your own CSS.

**Surfaces and text** — `--surface`, `--surface-raised`, `--surface-sunken`, `--line`, `--line-strong`, `--text`, `--text-muted`, `--text-subtle`

**Brand** — `--color-brand`, `--color-live`

**Stage accents** — `--accent-{amber|emerald|violet|sky}` plus `-tint` and `-text` for each

**Geometry** — `--agenda-px-per-minute`, `--agenda-gutter`, `--agenda-lane-min`, `--agenda-header-h`

**Type** — `--agenda-font-sans`, `--agenda-font-mono`

**Shadows** — `--shadow-card`, `--shadow-lift`, `--shadow-sheet`

Dark mode applies under a `.dark` class on any ancestor.

> Text tokens were tuned against the *darkest end* of the card gradient, not against white. If you re-palette, re-check contrast there — `--text-subtle` measured 2.33:1 before that fix.

---

## Recipes

### Custom layout from the parts

```tsx
import {
  AgendaProvider, TrackGrid, SessionSheet, DayTabs,
  useAgenda, useEventNow, filterSessions,
} from "agenda-views";

function MyAgenda({ agenda }) {
  return (
    <AgendaProvider agenda={agenda}>
      <Inner />
    </AgendaProvider>
  );
}

function Inner() {
  const index = useAgenda();
  const now = useEventNow(index);
  const [dayId, setDayId] = useState(index.days[0].id);
  const [selected, setSelected] = useState(null);

  const visible = filterSessions(index, index.sessions, {
    dayId, stageIds: [], formats: [], query: "",
  });

  return (
    <>
      <DayTabs days={index.days} value={dayId} onChange={setDayId} />
      <TrackGrid
        sessions={visible} stages={index.stages} now={now}
        dayId={dayId} selectedId={selected?.id ?? null}
        onSelect={setSelected} pxPerMinute={3}
      />
      <SessionSheet session={selected} now={now} onClose={() => setSelected(null)} />
    </>
  );
}
```

### Headless — your own markup

```ts
import { buildGrid, createAgendaIndex } from "agenda-views/headless";

const index = createAgendaIndex(agenda);
const grid = buildGrid(agenda.sessions, agenda.stages);

for (const lane of grid.lanes) {
  for (const { session, offset, duration, column, columns } of lane.items) {
    render(session, {
      top: offset * 2.3,
      height: duration * 2.3,
      left: `${(column * 100) / columns}%`,
      width: `${100 / columns}%`,
    });
  }
}
```

### Any router

```ts
import { agendaStateFromParams, agendaStateToParams } from "agenda-views/headless";

const state = agendaStateFromParams(index, new URLSearchParams(location.search));
history.replaceState(null, "", `?${agendaStateToParams(index, state)}`);
```

### Calendar export

```ts
import { buildIcs, downloadIcs, googleCalendarUrl } from "agenda-views/headless";

<a href={googleCalendarUrl(index, session)} target="_blank" rel="noopener noreferrer">Add</a>;
downloadIcs("my-day.ics", buildIcs(index, savedSessions));
```

`.ics` output is RFC 5545 compliant — CRLF endings, escaped separators, 75-octet line folding.
