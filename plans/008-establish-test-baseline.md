# Plan 008: Establish a Vitest + CI verification baseline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- package.json src/app/lib/mapGeo.ts src/app/components/liveMapStore.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/005-fix-typescript-baseline.md (for the CI typecheck gate)
- **Category**: tests
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

The repo has **no test framework, no `test` script, and no CI** — there is no
one-command way to know the codebase works. Every change to a WebGL-heavy,
simulation-driven UI is verified by manual smoke-testing. The highest-churn
modules (`CesiumTacticalMap.tsx` — 35 touches in the last 100 commits,
`Dashboard.tsx` — 34, `CesiumMap.tsx` — 27) have zero regression net. This plan
installs Vitest, writes the first characterization tests against pure logic,
and adds a CI workflow so `typecheck` + scoped lint + tests run on every push.
Later risky plans (esp. 012, Mapbox deletion) depend on this net existing.

## Current state

- No vitest/jest/playwright/@testing-library anywhere in `package.json` or the
  lockfile. `.github/workflows/` does not exist.
- **Naming trap**: the repo already contains 40 `*.spec.ts` files (e.g.
  `src/app/components/DevicesPanel.spec.ts`) that export `ComponentSpec`
  design-metadata objects — they are NOT tests and must not be picked up by
  the runner. Use the `*.test.ts` suffix and an explicit `include` so Vitest
  never touches `*.spec.ts`.
- First test targets (pure logic, no DOM, no Cesium):
  - `src/app/lib/mapGeo.ts` — geodesy helpers, e.g.:

```11:22:src/app/lib/mapGeo.ts
/** Haversine great-circle distance in metres. */
export function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  ...
  return EARTH_RADIUS_M * c;
}
```

  Also exports `bearingDegrees`, `destination`, `fovPolygon`, and constants
  (`EARTH_RADIUS_M`, `FOV_RADIUS_M`).
  - `src/app/components/liveMapStore.ts` — a `useSyncExternalStore`-compatible
    store factory with `subscribe`/`getSnapshot`/`setFriendlyDrones`/
    `setHoveredSensorId`/`setHoveredTargetId`; setters no-op-dedupe on
    identical ids (lines 50–58). Note: the file imports
    `type FriendlyDrone` from `./Dashboard` — a **type-only** import, so the
    test won't drag Dashboard's runtime in.
- `package.json` scripts today: `build`, `dev`, `lint`, `design:check`, etc. —
  no `test`. After plan 005 there will also be `typecheck`.
- Install requires `CENTRAL_LICENSE_KEY` for the private
  `@central-icons-react/*` packages (see `.env.example:13-18`). CI must
  provide it as a secret.
- Known-broken repo-wide gates you must NOT block CI on: `pnpm lint` fails
  with 382 pre-existing errors at `805086b`. CI lints only changed files is
  out of scope — simply omit the repo-wide lint from CI for now and note it.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| Tests | `pnpm test` | all pass |
| Typecheck | `pnpm typecheck` (exists after plan 005) | error count unchanged from 005's baseline |
| Build | `pnpm build` | exit 0 |

## Scope

**In scope** (the only files you should modify/create):
- `package.json` (add `vitest` devDep + `test` script)
- `pnpm-lock.yaml` (via install)
- `vitest.config.ts` (create)
- `src/app/lib/mapGeo.test.ts` (create)
- `src/app/components/liveMapStore.test.ts` (create)
- `.github/workflows/ci.yml` (create)

**Out of scope** (do NOT touch):
- Any existing source file — characterization tests describe behavior as-is;
  if a test reveals a bug, assert the current behavior and flag it in NOTES.
- jsdom / @testing-library / component rendering tests — pure node
  environment only in this plan.
- The 40 `*.spec.ts` ComponentSpec files.

## Git workflow

- Branch: `advisor/008-test-baseline`
- Commit style: `feat(testing): add Vitest baseline + CI workflow`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Install Vitest and wire the script

`pnpm add -D vitest`, then add to `package.json` scripts:
`"test": "vitest run"`.

Create `vitest.config.ts` at the repo root:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@/shared': path.resolve(__dirname, './src/app'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // The repo's *.spec.ts files are ComponentSpec design metadata, not tests.
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
```

**Verify**: `pnpm test` → exits 0 with "no test files found" being acceptable
only until Step 2 (vitest exits 1 on empty by default — pass
`--passWithNoTests` for this intermediate check only).

### Step 2: Characterization tests for mapGeo

Create `src/app/lib/mapGeo.test.ts` covering at minimum:
- `haversineDistanceM`: zero distance for identical points; a known pair
  (e.g. 1° of latitude ≈ 111,195 m within ±100 m); symmetry (d(a,b) === d(b,a)).
- `bearingDegrees`: due north from (0,0)→(1,0) is 0; due east (0,0)→(0,1) is 90;
  result always in [0, 360).
- `destination`: round-trip — destination 1,000 m at bearing 45° from a point,
  then `haversineDistanceM` back ≈ 1,000 m (±1 m); returns `[lon, lat]` order.
- `fovPolygon`: `fovDeg >= 360` produces a ring **without** the center vertex;
  `fovDeg < 360` includes the center point as first and last ring vertex
  (read the implementation at `src/app/lib/mapGeo.ts:45-83` and assert what
  it actually does).

**Verify**: `pnpm test` → all mapGeo tests pass.

### Step 3: Characterization tests for liveMapStore

Create `src/app/components/liveMapStore.test.ts` covering:
- `getSnapshot` returns the initial snapshot.
- `setFriendlyDrones` replaces the array and notifies subscribers exactly once.
- `setHoveredSensorId` with the **same** id does not notify (dedupe path,
  lines 50–53); with a new id notifies and updates the snapshot.
- `subscribe` returns an unsubscribe function that stops notifications.

Note: the store is created via a `useRef`-based hook — export/import whatever
the module exposes; if only the hook is exported and the factory
(`createLiveMapStore`) is module-private, test through the exported surface or
export the factory (a named-export addition to `liveMapStore.ts` is permitted
as the sole source change, confined to adding `export` before the existing
function).

**Verify**: `pnpm test` → all tests pass (mapGeo + liveMapStore).

### Step 4: CI workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
        env:
          CENTRAL_LICENSE_KEY: ${{ secrets.CENTRAL_LICENSE_KEY }}
      - run: pnpm typecheck || true   # advisory until the error burn-down lands; see plans/README.md
      - run: pnpm test
      - run: pnpm build
```

The `|| true` on typecheck is deliberate: plan 005 reduces but does not zero
the error count. Flip it to blocking when the burn-down completes.

**Verify**: `pnpm install --frozen-lockfile && pnpm test && pnpm build`
locally → all exit 0 (you cannot run the Actions workflow itself; validate
the YAML with `npx yaml-lint .github/workflows/ci.yml` or equivalent parse).

## Test plan

The plan *is* the test plan: ≥12 new assertions across two test files, all
passing via `pnpm test`. Model structure on standard Vitest `describe`/`it`
blocks (no existing test to pattern-match — you are creating the pattern;
keep it plain).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm test` exits 0 with ≥ 2 test files and ≥ 12 passing tests
- [ ] `pnpm test` does NOT execute any `*.spec.ts` file (check the reporter output)
- [ ] `pnpm build` exits 0
- [ ] `.github/workflows/ci.yml` exists and parses as YAML
- [ ] Only in-scope files modified/created (`git status`)
- [ ] `plans/README.md` status row updated (unless the reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Vitest cannot resolve the `@/` aliases even with the config above.
- A mapGeo function's actual behavior contradicts its doc comment (e.g.
  `fovPolygon` ring order) in a way that looks like a real bug — assert
  current behavior, but flag it prominently in NOTES.
- `liveMapStore.ts` requires more than the single `export` keyword addition to
  be testable.
- Installing vitest changes resolution of existing production deps (lockfile
  churn beyond vitest's own tree).

## Maintenance notes

- Future component tests will need `jsdom` + `@testing-library/react` — add
  them when the first component test lands, not before.
- The CI `typecheck` step is advisory (`|| true`) — whoever finishes the type
  error burn-down (after plans 005 + 012) must flip it to blocking.
- CI requires the `CENTRAL_LICENSE_KEY` repository secret to be configured by
  a repo admin before the workflow can pass on GitHub — say so in your report.
- Reviewer: read the assertions — characterization tests that assert nothing
  (e.g. `expect(result).toBeDefined()`) fail review.
