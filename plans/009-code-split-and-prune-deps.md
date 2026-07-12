# Plan 009: Code-split heavy routes/panels and remove dead dependencies

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- src/app/App.tsx src/app/components/Dashboard.tsx src/app/components/UrgencyReviewPage.tsx src/app/components/tacticalIcons.tsx src/app/components/flow-builder/FlowBuilderPanel.tsx package.json vite.config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

Users loading `/` (the production console) currently download code they never
run: (a) `FovTestPage` and `UrgencyReviewPage` are statically imported in
`App.tsx`, and both transitively pull `react-map-gl`/`mapbox-gl` — a second
map stack — into the entry graph (`UrgencyReviewPage` only for one icon);
(b) `Dashboard.tsx` statically imports `MapDrawPanel` (2,829 lines),
`FlowBuilderPanel`, and `SimulationsPanel`, which render only when their
panels open. Separately, six production dependencies have **zero** imports
anywhere in `src/` and `ui/chart.tsx` (the only recharts consumer) is itself
unimported — dead install weight and audit noise. This plan lazies the routes
and panels and prunes the dead deps. It also unblocks plan 012 (Mapbox
deletion) by breaking the `UrgencyReviewPage → TacticalMap` import.

## Current state

- `src/app/App.tsx:8-10` — the only non-lazy page imports:

```8:10:src/app/App.tsx
import { Dashboard } from "./components/Dashboard";
import FovTestPage from "./components/FovTestPage";
import UrgencyReviewPage from "./components/UrgencyReviewPage";
```

  `Dashboard` stays eager (it IS the `/` route). Every other page in the file
  already uses `lazy()` + `<Suspense fallback={<PlaygroundFallback />}>` —
  match that exact pattern (see `DesignSystemPage` at `App.tsx:31` and its
  route at `App.tsx:170-177`). Routes to convert: `/fov-test` (`App.tsx:169`)
  and `/urgency-review` (`App.tsx:201`).
- `src/app/components/UrgencyReviewPage.tsx:56` —
  `import { DroneIcon } from './TacticalMap';` — the ONLY reason this page
  pulls the 2,451-line Mapbox map module.
- `src/app/components/TacticalMap.tsx:117` — `DroneIcon` is a self-contained
  SVG component (props: `rotationDeg`, `disabled`, `color`, `size`); it uses
  `DRONE_PATH` from `@/primitives/MapIcons`.
- `src/app/components/tacticalIcons.tsx` — the designated "canonical, map-free
  source of truth for the tactical glyphs" (its own header comment, lines 1-10,
  explicitly says the Mapbox-only `DroneIcon` still lives in TacticalMap).
  This is where `DroneIcon` moves.
- `src/app/components/Dashboard.tsx` panel imports:

```32:47:src/app/components/Dashboard.tsx
import { MapDrawPanel } from './map-draw/MapDrawPanel';
// ...
import { FlowBuilderPanel, defaultFlowDraft } from './flow-builder/FlowBuilderPanel';
// ...
import { SimulationsPanel, type BuiltinKind } from './simulations/SimulationsPanel';
```

  Gotchas: `defaultFlowDraft` is a **value** import used in a `useState`
  initializer at `Dashboard.tsx:336`, and it's defined in
  `flow-builder/FlowBuilderPanel.tsx:115`. Lazy-loading the panel while
  keeping `defaultFlowDraft` eager requires moving it (Step 3).
  `type BuiltinKind` is type-only — safe with any splitting.
- Dead dependencies (verified zero `src/` imports at `805086b`): `motion`,
  `react-slick`, `@vercel/analytics`, `react-popper`, `@popperjs/core`,
  `react-responsive-masonry`. Additionally `recharts` is imported only by
  `src/app/components/ui/chart.tsx`, which no file imports.
  NOT dead (do not remove): `shiki` (used by `src/app/styleguide/registry/useShiki.ts`
  and `StyleguidePage.tsx`), `framer-motion` (21 files), `lucide-react`
  (used via `src/lib/icons/central.ts:509`), `radix-ui` meta-package
  (used by `src/app/components/ui/badge.tsx`).
- `vite.config.ts:92` — stale manualChunks rule:
  `if (id.includes('react-joyride') || id.includes('react-floater')) return 'tour';`
  — neither package is in `package.json`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| Build | `pnpm build` | exit 0 |
| Scoped lint | `npx eslint <changed files>` | exit 0 |
| Entry-chunk check | `rg -l "mapbox" dist/assets/main-*.js` | no matches |

(Repo-wide `pnpm lint` and `pnpm typecheck` are known-broken baselines — gate
on scoped lint and build only.)

## Scope

**In scope** (the only files you should modify):
- `src/app/App.tsx`
- `src/app/components/UrgencyReviewPage.tsx`
- `src/app/components/TacticalMap.tsx` (only: remove the `DroneIcon`
  definition and re-import it from `tacticalIcons`)
- `src/app/components/tacticalIcons.tsx` (add `DroneIcon`)
- `src/app/components/Dashboard.tsx` (imports + panel render sites only)
- `src/app/components/flow-builder/flowDefaults.ts` (create)
- `src/app/components/flow-builder/FlowBuilderPanel.tsx` (move
  `defaultFlowDraft` out, re-export for compatibility)
- `package.json`, `pnpm-lock.yaml` (dep removal)
- `vite.config.ts` (stale chunk rule)
- `src/app/components/ui/chart.tsx` (delete)

**Out of scope** (do NOT touch):
- Deleting `TacticalMap.tsx` / `FovTestPage.tsx` themselves — that's plan 012.
- `StyleguidePage.tsx`, the styleguide registry, any sandbox dir.
- `shiki`, `framer-motion`, `lucide-react`, `radix-ui`, `dialkit` — all used.
- Cesium code.

## Git workflow

- Branch: `advisor/009-code-split-prune-deps`
- Commit per step; style: `perf(app): lazy-load review routes`, `chore(deps): remove unused packages`, etc.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Move DroneIcon to tacticalIcons

1. Copy the full `DroneIcon` component from `TacticalMap.tsx:117` into
   `src/app/components/tacticalIcons.tsx` (it already imports `DRONE_PATH`
   from `@/primitives/MapIcons` at line 12 — reuse that import).
2. In `TacticalMap.tsx`: delete the local definition, add
   `import { DroneIcon } from './tacticalIcons';` and keep
   `export { DroneIcon };` so existing importers don't break.
3. In `UrgencyReviewPage.tsx:56`: change the import to
   `import { DroneIcon } from './tacticalIcons';`.
4. Update the header comment in `tacticalIcons.tsx` (lines 6-9) — it currently
   documents that `DroneIcon` remains in TacticalMap.

**Verify**: `pnpm build` → exit 0; `rg -n "from './TacticalMap'" src/app/components/UrgencyReviewPage.tsx` → no matches.

### Step 2: Lazy-load the two review routes

In `App.tsx`, replace the static imports at lines 9-10 with the file's
established pattern:

```tsx
const FovTestPage = lazy(() => import("./components/FovTestPage"));
const UrgencyReviewPage = lazy(() => import("./components/UrgencyReviewPage"));
```

Wrap both route elements in `<Suspense fallback={<PlaygroundFallback />}>`
exactly like the `/styleguide` route (`App.tsx:170-177`). Note `FovTestPage`
is a default export (works with plain `lazy`); `UrgencyReviewPage` is also a
default export (`import UrgencyReviewPage from` today).

**Verify**: `pnpm build` → exit 0; then
`rg -l "mapbox" dist/assets/main-*.js` → no matches (mapbox-gl no longer in
the entry chunk; it may legitimately appear in lazy chunks).

### Step 3: Extract defaultFlowDraft and lazy-load the three Dashboard panels

1. Create `src/app/components/flow-builder/flowDefaults.ts`; move the
   `defaultFlowDraft` function (currently `FlowBuilderPanel.tsx:115`) and
   whatever types it needs into it (import types from their existing source —
   check where `FlowDef` lives and import it `type`-only).
2. In `FlowBuilderPanel.tsx`: import and re-export `defaultFlowDraft` from
   `./flowDefaults` (keeps other consumers working).
3. In `Dashboard.tsx`:
   - `import { defaultFlowDraft } from './flow-builder/flowDefaults';`
   - Convert the three panel imports to `lazy()`:
     `const MapDrawPanel = lazy(() => import('./map-draw/MapDrawPanel').then(m => ({ default: m.MapDrawPanel })));`
     (same shape for `FlowBuilderPanel`, `SimulationsPanel` — they are named
     exports). Keep `type BuiltinKind` as a separate
     `import type { BuiltinKind } from './simulations/SimulationsPanel';`.
   - Wrap each panel's render site in `<Suspense fallback={null}>`. Find the
     render sites by `rg -n "<MapDrawPanel|<FlowBuilderPanel|<SimulationsPanel" src/app/components/Dashboard.tsx`.

**Verify**: `pnpm build` → exit 0, and the build output lists separate chunks
for map-draw / flow-builder / simulations. Then start `pnpm dev`, load `/`,
and confirm in the report that opening each of the three panels still works
(if you cannot run a browser, state that this manual check was skipped).

### Step 4: Remove dead dependencies and dead files

1. Re-verify each is unused before removing (the codebase may have drifted):
   `rg -n "from '(motion|react-slick|@vercel/analytics|react-popper|@popperjs|react-responsive-masonry|recharts)" src/` —
   expected: the only match is `ui/chart.tsx` (recharts).
2. Delete `src/app/components/ui/chart.tsx`.
3. `pnpm remove motion react-slick @vercel/analytics react-popper @popperjs/core react-responsive-masonry recharts`
4. In `vite.config.ts`, delete the stale line:
   `if (id.includes('react-joyride') || id.includes('react-floater')) return 'tour';`

**Verify**: `pnpm build` → exit 0; `rg -n "recharts|react-slick|react-popper" package.json` → no matches.

### Step 5: Scoped lint

**Verify**: `npx eslint src/app/App.tsx src/app/components/UrgencyReviewPage.tsx src/app/components/tacticalIcons.tsx src/app/components/flow-builder/flowDefaults.ts src/app/components/flow-builder/FlowBuilderPanel.tsx vite.config.ts` → exit 0.
(`Dashboard.tsx` and `TacticalMap.tsx` have pre-existing lint errors — for
those two, only confirm your changes add no NEW errors by comparing
`npx eslint <file>` error counts before/after your edit.)

## Test plan

If plan 008 has landed, run `pnpm test` → all pass (no test touches these
files yet, so it's a regression gate only). Manual smoke in dev: `/`,
`/fov-test`, `/urgency-review` load; the three Dashboard panels open.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` exits 0
- [ ] `rg -l "mapbox" dist/assets/main-*.js` returns no matches
- [ ] `rg -n "motion\"|react-slick|@vercel/analytics|react-popper|@popperjs/core|react-responsive-masonry|recharts" package.json` returns no matches
- [ ] `src/app/components/ui/chart.tsx` deleted
- [ ] `rg -n "react-joyride" vite.config.ts` returns no matches
- [ ] Scoped lint (Step 5) passes
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated (unless the reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Any "dead" dependency turns out to have an import site (Step 4.1 finds
  matches beyond `ui/chart.tsx`) — report it; do not remove that package.
- `defaultFlowDraft` has tangled dependencies that can't move to a standalone
  module without pulling most of `FlowBuilderPanel` with it.
- Lazy-loading a panel breaks its open animation or provider wiring in a way
  visible in the dev server.
- The entry chunk still contains mapbox after Step 2 — the import graph has an
  edge this plan didn't map; report the importer chain
  (`npx vite-bundle-visualizer` or `pnpm build:analyze` can show it).

## Maintenance notes

- After plan 012 deletes the Mapbox stack, the `/fov-test` route and its lazy
  import are deleted too — the Step 2 work on `FovTestPage` is cheap and
  disposable by design.
- Reviewer: check that `TacticalMap.tsx` still re-exports `DroneIcon` (spec
  metadata and possible external references), and that Suspense fallbacks
  don't flash visibly when panels open (fallback={null} intended).
- Deferred: `@vercel/toolbar` lists `@vercel/analytics` as an optional peer;
  removing analytics is safe but if the Vercel toolbar warns at install time,
  note it and continue.
