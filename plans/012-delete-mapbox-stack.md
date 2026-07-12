# Plan 012: Execute cesium-parity Phase 9 — delete the legacy Mapbox stack

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- src/app/components/TacticalMap.tsx src/app/components/FovTestPage.tsx src/app/components/useEngagementLine.ts src/app/lib/mapUtils.ts src/lib/mapBackend.ts src/app/components/CesiumErrorBoundary.tsx src/app/App.tsx package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: plans/008-establish-test-baseline.md (regression net), plans/009-code-split-and-prune-deps.md (DroneIcon extraction — hard prerequisite)
- **Category**: debt
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

The Cesium cutover completed (Phase 8, `docs/cesium-parity.md:143-147`), but
Phase 9 — Mapbox removal — never ran (`docs/cesium-parity.md:149-155`, all
rows `✗`). The rollback toggle is **already dead**: `src/lib/mapBackend.ts`
exports `MAP_BACKEND`/`IS_CESIUM` that nothing imports, and `Dashboard.tsx`
mounts `LiveCesiumTacticalMap` unconditionally (line 2502). So the repo pays
for a 2,451-line `TacticalMap.tsx`, `mapbox-gl` + `react-map-gl` in the
dependency tree (~988 kB / 276 kB gzip per the parity doc), and a documented
rollback path that does not actually work — the worst of both worlds. This
plan deletes the stack. The rollback story after deletion: the last commit
before this plan lands is the rollback artifact (note the SHA in the report).

## Current state

- `src/lib/mapBackend.ts` — the dead toggle; whole-file excerpt of the exports:

```28:34:src/lib/mapBackend.ts
export const MAP_BACKEND: MapBackend =
  typeof window !== 'undefined'
    ? readBackendFromSearch(window.location.search)
    : 'cesium';

/** True when running with `?map=cesium` *or* the unsuffixed default URL. */
export const IS_CESIUM = MAP_BACKEND === 'cesium';
```

  Verified: `rg -n "MAP_BACKEND|IS_CESIUM" src/` matches only this file.
- The Mapbox import graph (verified at `805086b`):
  - `src/app/components/TacticalMap.tsx` — the legacy map (2,451 lines).
    After plan 009, its `DroneIcon` lives in `tacticalIcons.tsx` and
    `TacticalMap.tsx` re-exports it.
  - `src/app/components/FovTestPage.tsx` — Mapbox-only test page, route
    `/fov-test` (lazy after plan 009).
  - `src/app/components/useEngagementLine.ts` — Mapbox-coupled hook
    (imports `getMapInstance`/`tryMapOp` from `mapUtils`). Consumers:
    `TacticalMap.tsx` and `src/app/components/StyleguidePage.tsx` (the legacy
    styleguide's engagement-line demo section).
  - `src/app/lib/mapUtils.ts` — `MAPBOX_TOKEN`, `getMapInstance`, `tryMapOp`,
    `logMapError`. All consumers are the three files above.
  - `src/app/lib/mapGeo.ts` — **KEEP**: pure geodesy used by Cesium components,
    Dashboard, onboarding (`rg -l` shows 7 consumers).
  - `src/app/components/CesiumErrorBoundary.tsx:56` — renders an
    `href="?map=mapbox"` rollback link that no longer does anything.
  - `src/app/components/UrgencyReviewPage.tsx:56` — imports `DroneIcon` from
    `./TacticalMap` at `805086b`; plan 009 repoints it to `./tacticalIcons`.
    **Verify 009 landed before starting.**
- `package.json` deps to remove: `mapbox-gl` (line 65), `react-map-gl`
  (line 73).
- `.env.example:1-2` — `VITE_MAPBOX_TOKEN` documentation.
- Design-metadata files mentioning TacticalMap (they are documentation
  objects, not code): `src/app/components/TacticalMap.spec.ts` — delete it
  together with its component.
- `docs/cesium-parity.md:149-155` — the Phase 9 checklist to mark complete.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| Build | `pnpm build` | exit 0 |
| Tests | `pnpm test` | all pass |
| Typecheck delta | `pnpm typecheck 2>&1 \| grep -c "error TS"` | LOWER than before this plan (TacticalMap's ~120-error cluster gone) |
| Mapbox gone | `rg -rn "mapbox" src/ --ignore-case -l` | only comments/doc mentions, no imports |

## Scope

**In scope** (modify or delete ONLY these):
- Delete: `src/app/components/TacticalMap.tsx`, `src/app/components/TacticalMap.spec.ts`,
  `src/app/components/FovTestPage.tsx`, `src/app/components/useEngagementLine.ts`,
  `src/app/lib/mapUtils.ts`, `src/lib/mapBackend.ts`
- Modify: `src/app/App.tsx` (remove `/fov-test` route + import),
  `src/app/components/CesiumErrorBoundary.tsx` (remove the rollback link),
  `src/app/components/UrgencyReviewPage.tsx` (only if a TacticalMap reference
  survives 009), `src/app/components/StyleguidePage.tsx` (remove the
  engagement-line demo section — Step 3), `package.json`, `pnpm-lock.yaml`,
  `.env.example` (remove the Mapbox token block), `docs/cesium-parity.md`
  (Phase 9 checklist)
- `vite.config.ts` if any mapbox-specific chunk rule exists (none known at
  `805086b` — verify)

**Out of scope** (do NOT touch):
- `src/app/lib/mapGeo.ts` — shared geodesy, heavily used by Cesium paths.
- `src/app/components/tacticalIcons.tsx` beyond what 009 already did.
- Any Cesium component (`CesiumTacticalMap`, `LiveCesiumTacticalMap`,
  `CesiumMap`).
- Deleting other StyleguidePage sections — only the engagement-line demo that
  imports `useEngagementLine`.

## Git workflow

- Branch: `advisor/012-delete-mapbox-stack`
- Commit per step; style: `refactor(map): delete legacy Mapbox tactical map (parity Phase 9)`
- Record `git rev-parse HEAD~0` of the pre-deletion state in your report as
  the rollback artifact.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Preconditions

Confirm plan 009 landed: `rg -n "from './tacticalIcons'" src/app/components/UrgencyReviewPage.tsx`
→ 1 match. Confirm the toggle is still dead:
`rg -n "MAP_BACKEND|IS_CESIUM" src/ --glob '!lib/mapBackend.ts'` → no matches.
If either fails, STOP.

### Step 2: Remove routes and links

1. `App.tsx`: delete the `FovTestPage` lazy/static import and the `/fov-test`
   route.
2. `CesiumErrorBoundary.tsx:56`: remove the `?map=mapbox` anchor (keep the
   error boundary's retry UI; reword the copy to drop the rollback promise).

**Verify**: `pnpm build` → exit 0.

### Step 3: Remove the StyleguidePage engagement-line demo

Find the section: `rg -n "useEngagementLine" src/app/components/StyleguidePage.tsx`.
Remove the demo component(s) and any nav/manifest entry pointing at it within
that file. This is the legacy styleguide (`/styleguide-legacy`), so the bar is
"compiles and the page still renders", not design perfection.

**Verify**: `rg -n "useEngagementLine" src/` → only
`src/app/components/useEngagementLine.ts` itself remains.

### Step 4: Delete the Mapbox modules

Delete the six files listed in Scope. Then remove the deps:
`pnpm remove mapbox-gl react-map-gl`.

**Verify**: `pnpm build` → exit 0; `pnpm install` → exit 0;
`rg -n "from 'react-map-gl'|from 'mapbox-gl'|mapbox-gl/dist" src/` → no matches.

### Step 5: Docs and env cleanup

1. `.env.example`: delete the `VITE_MAPBOX_TOKEN` block (lines 1-2 at
   `805086b`).
2. `docs/cesium-parity.md`: flip the three Phase 9 rows to `✓` with a
   one-line note ("removed in plan 012, <date>; rollback = pre-deletion
   commit <SHA>").

**Verify**: `rg -n "VITE_MAPBOX_TOKEN" .env.example src/` → no matches.

### Step 6: Full gates

**Verify**: `pnpm test` → all pass. `pnpm typecheck 2>&1 | grep -c "error TS"`
→ record the number; it must be LOWER than the pre-plan count (run it before
Step 2 to capture the baseline).

## Test plan

- `pnpm test` (plan 008 suite) must pass unchanged — mapGeo/liveMapStore tests
  don't touch Mapbox.
- Manual smoke (or state skipped): `/` renders the Cesium map; `/urgency-review`
  renders (DroneIcon via tacticalIcons); `/styleguide-legacy` renders without
  the engagement-line section.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `rg -n "from 'react-map-gl'|from 'mapbox-gl'" src/` → no matches
- [ ] `rg -n "mapbox-gl|react-map-gl" package.json` → no matches
- [ ] The six deleted files are gone; `git status` shows no out-of-scope changes
- [ ] `pnpm build` exits 0; `pnpm test` exits 0
- [ ] typecheck error count strictly lower than pre-plan baseline (both numbers in report)
- [ ] `docs/cesium-parity.md` Phase 9 rows marked complete with the rollback SHA
- [ ] `plans/README.md` status row updated (unless the reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 preconditions fail (009 not landed, or the backend toggle gained a
  consumer since `805086b`).
- Any file outside the Scope list needs modification to make the build pass —
  the import graph has an unmapped edge; report the chain.
- The StyleguidePage engagement-line section is entangled with other demos
  such that removal breaks unrelated sections.
- Anyone (docs, comments, user instruction) indicates the Mapbox rollback is
  still operationally required — this plan's premise is that the toggle is
  dead code; if that's wrong, the decision goes back to the maintainer.

## Maintenance notes

- Rollback after this lands = revert the branch or check out the recorded
  pre-deletion SHA; there is no runtime toggle anymore. This is deliberate.
- The typecheck burn-down (deferred from plan 005) gets ~120 errors cheaper
  after this — a good moment to schedule it.
- `docs/cesium-parity.md` becomes a historical record once Phase 9 is checked;
  future map capability work tracks in new docs.
- Reviewer: scrutinize the StyleguidePage diff hardest — it's the only
  non-mechanical edit in the plan.
