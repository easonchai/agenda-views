# agenda-views

A multi-track conference agenda for React: a **desktop time grid** and a **mobile-first chronological list**, over one data model.

| Viewport | View | Why |
| --- | --- | --- |
| ≥1024px | **Time grid** — columns = stages, rows = time, blocks sized by duration | Concurrency is the question a desktop reader is asking: "what else is on at 11:30?" A grid answers it geometrically. |
| <1024px | **Agenda** — one chronological column, sticky time rails, parallel sessions grouped | Four lanes in 390px means either horizontal scroll (hides tracks) or 60px columns (truncates every title). Neither is usable. |

Built from the [AIMTO 2026 programme](https://aimto.my/program.php) — real data, 49 sessions, 2 days, 4 stages, overlapping and non-aligned session times.

**[Live demo](https://aimto-agenda.vercel.app)** · [Two agendas on one page](https://aimto-agenda.vercel.app/multi)

![Desktop time grid](docs/desktop-grid.png)

Hovering or focusing a block writes its exact start and end into the time gutter and rules them across every lane, so "when is this, and what runs against it" is answered without opening anything:

![Time bracket on hover](docs/time-bracket.png)

| Mobile agenda | Session detail | Dark + filtered |
| --- | --- | --- |
| ![](docs/mobile-agenda.png) | ![](docs/mobile-sheet.png) | ![](docs/dark-list.png) |

## Repository layout

```
packages/agenda-views/    the library — published to npm
apps/demo/                the deployed showcase, consuming it as a workspace dep
docs/                     screenshots
```

The demo imports the package the same way a stranger would, so a broken public API breaks the demo build first.

```bash
pnpm install
pnpm dev        # demo at localhost:3000
pnpm build      # library, then demo
pnpm test       # library unit tests
pnpm validate   # typecheck + tests + build + publint + attw
```

## Using the library

Full API documentation: **[packages/agenda-views/README.md](packages/agenda-views/README.md)**

```bash
npm i agenda-views
```

```tsx
import { AgendaShell } from "agenda-views";
import "agenda-views/styles.css";

<AgendaShell agenda={agenda} />;
```

Four entry points: `agenda-views` (styled components), `agenda-views/headless` (layout engine — no React, no DOM), `agenda-views/next` (URL-state adapter), `agenda-views/styles.css`.

## What the original does badly on mobile

The source page renders the same desktop structure at every width:

1. **The time gutter never collapses.** ~100px of a 390px screen spent on repeating timestamps.
2. **Nothing sticks.** Scroll three sessions in and you no longer know the time, the day, or the active filter.
3. **Filters cost three rows** instead of one horizontally-scrolling line.
4. **Every card is fully expanded** — ~5 screens of scroll per hour of programme.
5. **No detail layer**, so nowhere for speaker bios and no way to link one session.
6. **A session's own time is not on the session.** The only timestamp is in a rail showing the *block's* range, with no rules to measure against — so two cards side by side can run 30 minutes and 3 hours and look identical. This is the failure that makes people show up at the wrong time.
7. **No sense of "now"** during the event itself.

## Design decisions

### Desktop time grid

- **Absolute positioning, not CSS grid rows.** Sessions start at 10:30 and end at 11:00 *or* 11:30 — they do not share a row unit, and a row grid flattens the real shape of the day.
- **2.3px per minute** — the smallest scale at which a 30-minute session still fits a time row plus a two-line title.
- **Progressive density by block height** — under 30 min: one title line; 30–45: two lines; 45–60: + speakers; 60+: + location. Content is a function of available height, not a fixed template that overflows.
- **Overlap packing within a lane** via interval-graph colouring; non-overlapping neighbours reuse the full width.
- **Two rule weights** — solid on the hour, dotted on the half, because most sessions start on `:30`.
- **A now-line** with the current time in the gutter, auto-scrolled into view on the running day.

### Mobile agenda

- **Time becomes a sticky rail, not an axis.** Concurrency reads as *"10:30 — 4 in parallel"*.
- **Only the controls stick**; the title and search scroll away. A full sticky header would eat ~40% of a 390px viewport.
- **Time leads every card in the highest-contrast type on it**, with duration — the single change that stops the misread above.
- **Bottom sheet for detail**, centred dialog on desktop, same component.

### Shared

- Deep-linkable state: `?day=&stage=a,b&q=&view=&session=`, written with `replaceState` so Back leaves the page.
- One shared minute-boundary clock via `useSyncExternalStore` — N components, one timer.
- Event time is wall-clock plus a fixed UTC offset, so a visitor in London sees the correct sessions marked live.
- Add to Google Calendar and `.ics` export, converting to absolute UTC instants.

### Accessibility

Real WAI-ARIA tablist with arrow keys; `aria-pressed` toggle buttons for filters (they are multi-select, so tabs would be wrong); the geometric grid mirrored by a visually-hidden ordered list in reading order; a genuine modal with focus trap and restore; `prefers-reduced-motion` respected; pinch-zoom left enabled.

All text meets WCAG AA in both themes. The tokens were tuned against the *darkest end* of the card gradient rather than against white — `--text-subtle` measured 2.33:1 there before the fix.

## Data

Replace `apps/demo/src/data/agenda.json`; the shape is exported from `agenda-views/headless`. `packages/agenda-views/scripts/transform_agenda.py` regenerates it from the scraped source in the same directory.

## Why not FullCalendar / react-big-calendar / Schedule-X

They are *editable calendar* engines: drag-resize, recurrence, event sources, view state machines. A conference programme is a static, read-only, multi-column artefact. Those libraries add 100–300kB to fight their own defaults, and none ship a good mobile agenda — you write that by hand anyway. The layout engine here is ~80 lines.

## License

MIT
