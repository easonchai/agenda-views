#!/usr/bin/env node
/**
 * Emits a shadcn-compatible registry from the package sources.
 *
 * Why generate rather than hand-maintain a second copy: the registry and the
 * npm package must never drift, so the components are written once and the
 * imports are rewritten on the way out.
 *
 * The rewrite is the whole trick. shadcn's CLI rewrites `@/...` specifiers to
 * the consumer's aliases and leaves BARE npm specifiers untouched, so:
 *   - pure maths      -> "agenda-views/headless"  (stays an npm dep, stays updatable)
 *   - sibling markup  -> "@/components/ui/..."    (copied, owned, editable)
 * That is what makes the copy-paste model survivable: consumers own the UI,
 * but bug fixes to the layout engine still arrive via `npm update`.
 *
 * Output: <outDir>/registry.json plus one <outDir>/<item>.json per item, each
 * with files[].content inlined — byte-identical in shape to `shadcn build`.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8"));
const outDir = resolve(process.argv[2] ?? join(pkgRoot, "../../apps/demo/public/r"));

/** Anything pure moves to the npm package; anything visual gets copied. */
const HEADLESS = "agenda-views/headless";
const IMPORT_MAP = {
  "../lib/agenda.js": HEADLESS,
  "../lib/state.js": HEADLESS,
  "../lib/calendar.js": HEADLESS,
  "./agenda.js": HEADLESS,
  "./state.js": HEADLESS,
  "./calendar.js": HEADLESS,
  "../lib/agenda-context.js": "@/lib/agenda-context",
  "../lib/hooks.js": "@/hooks/use-agenda",
  "./agenda-context.js": "@/lib/agenda-context",
  "./hooks.js": "@/hooks/use-agenda",
  "./primitives.js": "@/components/ui/agenda-primitives",
  "./controls.js": "@/components/ui/agenda-controls",
  "./track-grid.js": "@/components/ui/agenda-track-grid",
  "./agenda-list.js": "@/components/ui/agenda-list",
  "./session-sheet.js": "@/components/ui/agenda-session-sheet",
  "./agenda-shell.js": "@/components/ui/agenda-shell",
};

const FILES = [
  ["src/components/agenda-shell.tsx", "registry:ui", "agenda-shell.tsx"],
  ["src/components/track-grid.tsx", "registry:ui", "agenda-track-grid.tsx"],
  ["src/components/agenda-list.tsx", "registry:ui", "agenda-list.tsx"],
  ["src/components/session-sheet.tsx", "registry:ui", "agenda-session-sheet.tsx"],
  ["src/components/controls.tsx", "registry:ui", "agenda-controls.tsx"],
  ["src/components/primitives.tsx", "registry:ui", "agenda-primitives.tsx"],
  ["src/lib/agenda-context.tsx", "registry:lib", "agenda-context.tsx"],
  ["src/lib/hooks.ts", "registry:hook", "use-agenda.ts"],
];

function rewrite(source) {
  let out = source;
  // longest first, so "../lib/agenda-context.js" wins over "../lib/agenda.js"
  for (const from of Object.keys(IMPORT_MAP).sort((a, b) => b.length - a.length)) {
    out = out.split(`"${from}"`).join(`"${IMPORT_MAP[from]}"`);
  }
  const leftovers = [...out.matchAll(/from\s+"(\.[^"]*)"/g)].map((m) => m[1]);
  if (leftovers.length) {
    throw new Error(
      `Unmapped relative import(s) would break once copied: ${[...new Set(leftovers)].join(", ")}\n` +
        `Add them to IMPORT_MAP in scripts/build-registry.mjs.`,
    );
  }
  return out;
}

const files = FILES.map(([src, type, target]) => ({
  path: `registry/${target}`,
  content: rewrite(readFileSync(join(pkgRoot, src), "utf8")),
  type,
}));

const item = {
  $schema: "https://ui.shadcn.com/schema/registry-item.json",
  name: "agenda-views",
  type: "registry:ui",
  title: "Agenda Views",
  description:
    "Multi-track conference agenda: a desktop time grid and a mobile-first chronological list over one data model.",
  author: "easonchai <https://github.com/easonchai>",
  categories: ["calendar", "scheduling", "events"],
  // informational only — the CLI ignores it, but it tells a consumer (and us)
  // exactly which release their copied files came from
  meta: { version: pkg.version, npm: pkg.name },
  // pinned on purpose: an unversioned dep installs `latest` at copy time,
  // which silently breaks reproducibility months later
  dependencies: [`${pkg.name}@^${pkg.version}`],
  files,
  cssVars: {
    theme: {
      "--animate-agenda-live-pulse": "agenda-live-pulse 2s ease-in-out infinite",
    },
    light: {
      "agenda-surface": "oklch(1 0 0)",
      "agenda-line": "oklch(0.925 0.005 275)",
      "agenda-text": "oklch(0.138 0.014 275)",
      // tuned against the darkest end of the card wash, not against white
      "agenda-text-muted": "oklch(0.487 0.016 275)",
      "agenda-text-subtle": "oklch(0.535 0.014 275)",
      "agenda-brand": "oklch(0.58 0.19 285)",
      "agenda-live": "oklch(0.62 0.21 25)",
    },
    dark: {
      "agenda-surface": "oklch(0.138 0.014 275)",
      "agenda-line": "oklch(0.28 0.014 275)",
      "agenda-text": "oklch(0.985 0.002 275)",
      "agenda-text-muted": "oklch(0.768 0.014 275)",
      "agenda-text-subtle": "oklch(0.665 0.014 275)",
      "agenda-brand": "oklch(0.58 0.19 285)",
      "agenda-live": "oklch(0.62 0.21 25)",
    },
  },
  css: {
    "@keyframes agenda-live-pulse": {
      "0%, 100%": { opacity: "1", transform: "scale(1)" },
      "50%": { opacity: "0.45", transform: "scale(0.82)" },
    },
    "@utility agenda-scrollbar-none": {
      "scrollbar-width": "none",
      "&::-webkit-scrollbar": { display: "none" },
    },
  },
  docs:
    "Import the stylesheet once: `import \"agenda-views/styles.css\"`.\n" +
    "Render with `<AgendaShell agenda={agenda} />`. On Next.js App Router, " +
    "drive it from the URL with `useAgendaUrlState` from `agenda-views/next` " +
    "inside a <Suspense> boundary.",
};

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "agenda-views",
  homepage: "https://aimto-agenda.vercel.app",
  items: [item],
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);
writeFileSync(join(outDir, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`);

const bytes = JSON.stringify(item).length;
console.log(`registry -> ${outDir}`);
console.log(`  ${item.name}.json  (${files.length} files, ${(bytes / 1024).toFixed(1)} kB)`);
for (const f of files) console.log(`    ${f.type.padEnd(14)} ${f.path}`);
