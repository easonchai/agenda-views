# agenda-views

A multi-track conference agenda for React: a **desktop time grid** and a **mobile-first chronological list**, over one data model.

Built because every event site gets this wrong the same way — the desktop grid is squeezed onto a phone, the only timestamp scrolls away, and people show up at the wrong session.

```bash
npm i agenda-views
```

```tsx
import { AgendaShell } from "agenda-views";
import "agenda-views/styles.css";

<AgendaShell agenda={agenda} />;
```

**[Live demo](https://aimto-agenda.vercel.app)** · [Two agendas on one page](https://aimto-agenda.vercel.app/multi)

## Entry points

| Import | Contains | Needs |
| --- | --- | --- |
| `agenda-views` | The styled components | React |
| `agenda-views/headless` | Layout engine, filtering, time maths, calendar export. No React rendering, no DOM. | nothing |
| `agenda-views/next` | `useAgendaUrlState()` — drives the shell from the URL | Next.js |
| `agenda-views/styles.css` | Tokens, theme, component utilities | Tailwind v4 |

## Tailwind v4 setup

Tailwind only generates utilities it can *see*, and this package's classes live outside your source tree:

```css
@import "tailwindcss";
@source "../../node_modules/agenda-views/dist";   /* relative to THIS file */
@import "agenda-views/styles.css";
```

Getting that path wrong is the most likely setup failure — the component renders completely unstyled. It resolves relative to the CSS file, not the project root.

Not using Tailwind? Everything visual is a plain CSS custom property, so `styles.css` works on its own; you just lose the utility classes the markup references.

---

## Customisation

Four escape hatches, in increasing order of commitment. You should never need to fork a component.

### 1. Design tokens — colour, type, density

Every visual value is a CSS custom property. Override them anywhere in your own CSS:

```css
:root {
  --agenda-font-sans: "Inter", sans-serif;
  --color-brand: oklch(0.58 0.19 285);
  --color-live: oklch(0.62 0.21 25);

  --surface: #fff;
  --surface-raised: #fff;
  --line: #e5e5ea;
  --text: #111;
  --text-muted: #555;

  /* geometry */
  --agenda-gutter: 76px;
  --agenda-lane-min: 220px;
}

.dark {
  --surface: #0d0d14;
  --text: #f4f4f7;
}
```

Stage colours come from the data (`stage.accent`) and resolve to `--accent-{amber|emerald|violet|sky}` triples of line / tint / text. Override those triples to re-palette the whole grid.

Dark mode keys off a `.dark` class on any ancestor — it does not assume a particular theme library.

### 2. Labels — every user-visible string

Nothing is hardcoded in English. Pass a partial; it merges over the defaults:

```tsx
<AgendaShell
  agenda={agenda}
  labels={{
    allStages: "Semua pentas",
    searchPlaceholder: "Cari sesi atau penceramah",
    now: "Sekarang",
    inParallel: (n) => `${n} serentak`,
    sessionsCount: (shown, total) => `${shown}/${total} sesi`,
  }}
/>
```

Pluralising and formatting labels are functions, so languages that don't pluralise like English aren't forced through a template.

### 3. Class slots — structural styling

Append classes to specific slots without rebuilding the layout:

```tsx
<AgendaShell
  agenda={agenda}
  classNames={{
    root: "my-agenda",
    masthead: "bg-zinc-950",
    gridBlock: "rounded-none border-l-4",
    listCard: "shadow-none",
    sheet: "max-w-2xl",
  }}
/>
```

Slots: `root`, `masthead`, `title`, `controls`, `main`, `grid`, `gridBlock`, `laneHeader`, `timeGutter`, `list`, `listRail`, `listCard`, `sheet`, `sheetOverlay`.

### 4. Compose the pieces yourself

`AgendaShell` is a convenience wrapper. Every part is exported, so you can assemble your own layout and keep only what you want:

```tsx
import {
  AgendaProvider, TrackGrid, AgendaList, SessionSheet,
  DayTabs, StageFilter, SearchField, useAgenda,
} from "agenda-views";

<AgendaProvider agenda={agenda} labels={labels}>
  <MyOwnHeader />
  <TrackGrid sessions={visible} stages={stages} pxPerMinute={3} … />
</AgendaProvider>;
```

Or drop the markup entirely and use `agenda-views/headless` for the maths (see below).

---

## State: controlled or uncontrolled

Uncontrolled, with an optional starting point:

```tsx
<AgendaShell agenda={agenda} defaultState={{ view: "list" }} />
```

Controlled — drive it from a router, storage, or anything else:

```tsx
const [state, setState] = useState(() => defaultAgendaState(index));
<AgendaShell agenda={agenda} state={state} onStateChange={setState} />;
```

On Next.js App Router, wire it to the URL (`?day=&stage=&q=&view=&session=`). `useSearchParams` opts the subtree out of prerendering, so it needs a `<Suspense>` boundary:

```tsx
"use client";
import { AgendaShell, createAgendaIndex } from "agenda-views";
import { useAgendaUrlState } from "agenda-views/next";

function Agenda({ agenda }) {
  const index = useMemo(() => createAgendaIndex(agenda), [agenda]);
  const [state, setState] = useAgendaUrlState(index);
  return <AgendaShell agenda={agenda} state={state} onStateChange={setState} />;
}
```

Untrusted state is sanitised rather than trusted: unknown day and stage ids are dropped instead of rendering an empty agenda — the failure people actually hit when sharing a link from last year's programme.

The URL codec is exported (`agendaStateToParams` / `agendaStateFromParams`), so any router can drive the component without the Next adapter.

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `agenda` | `Agenda` | — | required |
| `state` / `onStateChange` | `AgendaState` | — | controlled mode |
| `defaultState` | `Partial<AgendaState>` | — | uncontrolled mode |
| `labels` | `Partial<AgendaLabels>` | English | every visible string |
| `classNames` | `AgendaClassNames` | — | structural class slots |
| `hour12` | `boolean` | `true` | 12- or 24-hour clock |
| `pxPerMinute` | `number` | `2.3` | vertical scale of the grid |
| `gridBreakpoint` | `string` | `(min-width: 1024px)` | below this, the list replaces the grid |
| `showThemeToggle` | `boolean` | `false` | theme is usually the host app's job |
| `mainId` | `string` | — | skip-link target owned by the host page |
| `className` | `string` | — | on the root element |

## Data shape

```ts
type Session = {
  id: string;
  day: string;              // matches a Day.id
  start: string;            // "HH:MM" wall clock, in the event's timezone
  end: string;
  stageId: string | null;   // null = plenary, spans every stage
  allStages: boolean;
  format: string | null;    // PANEL, KEYNOTE, WORKSHOP …
  title: string;
  description: string | null;
  location: string | null;
  speakers: { name: string; org: string; avatar: string | null }[];
};
```

Times are **wall-clock plus a fixed `utcOffsetMinutes`**, not instants. That is what event programmes actually publish, and it means a visitor in another timezone sees the right session marked live without the printed times shifting under them.

## Headless

The layout engine is the durable half, and it has no React in it:

```ts
import { buildGrid, createAgendaIndex, groupByStart } from "agenda-views/headless";

const grid = buildGrid(sessions, stages);
// grid.lanes[].items[] -> { offset, duration, column, columns }
```

`buildGrid` places sessions by `offset × pxPerMinute` rather than in CSS grid rows, because real programmes start at 10:30 and end at 11:00 *or* 11:30 — they do not share a row unit. Sessions that overlap **within one stage** are split into sub-columns by interval-graph colouring.

Also exported: `filterSessions`, `sortChronologically`, `groupByStart`, `sessionStatus`, `eventNow`, `googleCalendarUrl`, `buildIcs`, and the time helpers.

## Accessibility

Day switcher is a real WAI-ARIA tablist with arrow-key navigation. Stage filters are `aria-pressed` toggle buttons, not tabs, because they are multi-select. The grid conveys time through geometry, so it is mirrored by a visually-hidden ordered list in reading order. The detail sheet is a genuine modal — focus trapped, Escape closes, focus restored. All text meets WCAG AA in both themes, measured against the darkest end of the card gradient.

## Validation

```bash
pnpm validate   # typecheck + tests + build + publint + attw
```

56 unit tests cover the layout engine, timezone conversion, ICS escaping, the URL codec and label merging. `publint --strict` and `@arethetypeswrong/cli` pass green across node10, node16 (CJS and ESM) and bundler resolution.

Built with plain `tsc`, no bundler — verified that this preserves per-file `"use client"` while leaving the pure modules server-safe, which is the thing bundlers most commonly break for RSC consumers.

## License

MIT
