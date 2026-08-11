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

[Live demo](https://aimto-agenda.vercel.app) · [Two agendas on one page](https://aimto-agenda.vercel.app/multi)

---

## Two ways to install

**As a package** — you get updates, you don't own the markup.

```bash
npm i agenda-views
```

**As shadcn-style source** — the components are copied into your project and you own them, while the layout engine stays an npm dependency so bug fixes still reach you.

```bash
npx shadcn@latest add https://aimto-agenda.vercel.app/r/agenda-views.json
```

The copied components import `agenda-views/headless` as a normal npm dependency. shadcn's CLI rewrites `@/…` paths but leaves bare npm specifiers alone, so you own every pixel and still `npm update` the maths.

## Entry points

| Import | Contains | Needs |
| --- | --- | --- |
| `agenda-views` | The styled components | React |
| `agenda-views/headless` | Layout engine, filtering, time maths, calendar export. No React rendering, no DOM. | nothing |
| `agenda-views/next` | `useAgendaUrlState()` — drives the shell from the URL | Next.js |
| `agenda-views/styles.css` | Tokens, theme, component utilities | Tailwind v4 |

## Tailwind v4 setup

Tailwind only generates utilities it can *see*, and the package's classes live outside your source tree:

```css
@import "tailwindcss";
@source "../../node_modules/agenda-views/dist";   /* relative to THIS file */
@import "agenda-views/styles.css";
```

Getting that path wrong is the single most likely setup failure — the component renders completely unstyled. It is relative to the CSS file, not the project root.

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

Untrusted state is sanitised, not trusted: unknown day and stage ids are dropped rather than rendering an empty agenda — the failure people actually hit when sharing a link from last year's programme.

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `agenda` | `Agenda` | — | required |
| `state` / `onStateChange` | `AgendaState` | — | controlled mode |
| `defaultState` | `Partial<AgendaState>` | — | uncontrolled mode |
| `hour12` | `boolean` | `true` | 12- or 24-hour clock |
| `pxPerMinute` | `number` | `2.3` | vertical scale of the grid |
| `gridBreakpoint` | `string` | `(min-width: 1024px)` | below this, the list replaces the grid |
| `showThemeToggle` | `boolean` | `false` | theme is usually the host app's job |
| `mainId` | `string` | — | skip-link target owned by the host page |

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

Times are **wall-clock plus a fixed `utcOffsetMinutes`**, not instants. That is what event programmes actually publish, and it means a visitor in London sees the right session marked live without the times shifting under them.

## Theming

Everything is a CSS custom property, so restyling means overriding a variable rather than fighting a selector:

```css
:root {
  --agenda-brand: oklch(0.58 0.19 285);
  --agenda-font-sans: "Inter", sans-serif;
  --agenda-px-per-minute: 2.3px;
}
.dark { --surface: #0d0d14; }
```

Dark mode keys off a `.dark` class on any ancestor.

## Headless

The layout engine is the durable half, and it has no React in it:

```ts
import { buildGrid, createAgendaIndex, groupByStart } from "agenda-views/headless";

const grid = buildGrid(sessions, stages);
// grid.lanes[].items[] -> { offset, duration, column, columns }
```

`buildGrid` places sessions by `offset × pxPerMinute` rather than in CSS grid rows, because real programmes start at 10:30 and end at 11:00 *or* 11:30 — they do not share a row unit. Sessions that overlap **within one stage** are split into sub-columns by interval-graph colouring.

## Accessibility

Day switcher is a real WAI-ARIA tablist with arrow-key navigation. Stage filters are `aria-pressed` toggle buttons, not tabs. The grid conveys time through geometry, so it is mirrored by a visually-hidden ordered list in reading order. The detail sheet is a genuine modal — focus trapped, Escape closes, focus restored. All text meets WCAG AA in both themes, measured against the darkest end of the card gradient.

## Validation

```bash
pnpm validate   # typecheck + tests + build + publint + attw
```

51 unit tests cover the layout engine, timezone conversion, ICS escaping and the URL codec. `publint` and `@arethetypeswrong/cli` pass green across node10, node16 (CJS and ESM) and bundler resolution. `"use client"` is preserved per-file — the build is plain `tsc`, no bundler, specifically so directives survive.

## License

MIT
