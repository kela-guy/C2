# Plan 004: Re-measure the Dashboard sim tick, then take hostile-target motion off the React render path if warranted

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. This plan has an explicit EXIT at Step 2: if
> the measurement says the work isn't warranted, mark this plan REJECTED in
> `plans/README.md` with the measured numbers and stop — that is a successful
> outcome, not a failure. When done (either way), update the status row for
> this plan in `plans/README.md` — unless a reviewer dispatched you and told
> you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- src/app/components/Dashboard.tsx src/app/components/liveMapStore.ts`
> If either file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M (S if the measurement says stop at Step 2)
- **Risk**: MED
- **Depends on**: plans/001-cap-cesium-render-loops.md (must be DONE first — it changes the CPU baseline this plan measures against)
- **Category**: perf
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

The Dashboard runs a hostile-drone loiter simulation on a 250 ms interval.
Each tick that moves any target calls `setTargets(...)` on Dashboard state,
which reconciles the entire ~2,774-line `Dashboard.tsx` component tree at
4 Hz. The codebase has already solved this exact problem once for friendly
drones: `src/app/components/liveMapStore.ts` is a `useSyncExternalStore`
store created specifically so "the 4 Hz tick re-renders the map alone" (its
own header says so). Hostile-target motion never got the same treatment.

However: the audit rated this MED confidence, the sim already short-circuits
no-op ticks, and plan 001 (Cesium render-loop cap) removes what is likely the
dominant CPU cost. So this plan measures first and only implements if the
numbers justify it.

## Current state

Files involved:

- `src/app/components/Dashboard.tsx` — owns `targets` state; the loiter sim
  effect starts at line 848; `setTargets` inside the tick at line 874.
- `src/app/components/liveMapStore.ts` — the existing out-of-React channel
  (73 lines). Pattern to extend.

The sim tick (abridged):

```ts
// src/app/components/Dashboard.tsx:848-880 (abridged)
useEffect(() => {
  if (!SIM_ENABLED) return;
  const TICK_MS = 250;
  // ...
  const interval = setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    // ...
    setTargets(prev => {
      // Track whether any target actually moved this tick. With zero active
      // drones (no targets, all mitigated/approaching/flow-driven) nothing
      // changes, so we return the SAME array reference to skip a Dashboard
      // re-render entirely instead of allocating a fresh no-op array at 4 Hz.
      let loiterChanged = false;
      const next = prev.map(t => {
        // ... loiter movement writes t.coordinates ...
      });
      // ...
    });
  }, TICK_MS);
  // ...
}, []);
```

The existing store pattern this plan extends:

```ts
// src/app/components/liveMapStore.ts:17-29
export interface LiveMapSnapshot {
  friendlyDrones: FriendlyDrone[];
  hoveredSensorId: string | null;
  hoveredTargetId: string | null;
}

export interface LiveMapStore {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => LiveMapSnapshot;
  setFriendlyDrones: (drones: FriendlyDrone[]) => void;
  setHoveredSensorId: (id: string | null) => void;
  setHoveredTargetId: (id: string | null) => void;
}
```

The map consumes the store via `useSyncExternalStore` inside
`src/app/components/LiveCesiumTacticalMap.tsx` (a thin subscriber wrapper
around `CesiumTacticalMap`), so Dashboard writes don't re-render Dashboard.

**Key complication (why this is not a mechanical copy of the friendly-drone
move):** `targets` is not map-only state. Target objects feed the target
card list, detail panes, and selectors across the Dashboard. The loiter sim
mutates `t.coordinates` (a string) 4 times per second, and coordinates are
*displayed* in card details. Splitting position out of React therefore needs
a two-cadence design: high-frequency positions to the map via the store,
low-frequency (e.g. 1 Hz) coordinate refresh into React state for the cards
— or coordinates read on demand rather than ticked. Which targets are
affected: only "active drones" (classified, not mitigated/resolved/expired —
see the `isActiveDrone` predicate at `Dashboard.tsx:887-893`).

## Commands you will need

| Purpose   | Command                                  | Expected on success |
|-----------|------------------------------------------|---------------------|
| Typecheck | `npx tsc -p tsconfig.app.json --noEmit`  | exit 0, no output   |
| Lint      | `pnpm lint`                              | exit 0              |
| Build     | `pnpm build`                             | exit 0              |
| Dev server| `pnpm dev`                               | serves on http://localhost:5173 |

No unit-test runner exists in this repo.

## Scope

**In scope** (only if Step 2 says proceed):

- `src/app/components/Dashboard.tsx`
- `src/app/components/liveMapStore.ts`
- `src/app/components/LiveCesiumTacticalMap.tsx`
- `src/app/components/CesiumTacticalMap.tsx` (only if the map needs a new
  prop for store-fed hostile positions)

**Out of scope** (do NOT touch):

- `src/primitives/CesiumMap.tsx` — plan 001 owns that file's changes.
- `src/lib/motionTracker.ts`.
- The card/list components under `src/imports/` — the two-cadence design
  must not require changes there; if it does, that's a STOP condition.
- The flow-player movement path (`useFlowPlayer`) and approach animations —
  they manage their own targets and are excluded by the sim's own guards.

## Git workflow

- Branch: `advisor/004-move-sim-off-react-state`
- Conventional commits, e.g.
  `perf(dashboard): move loiter target positions to the live map store`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm plan 001 landed

Check `plans/README.md`: plan 001 must be DONE. Confirm in code:
`rg -n "ANIMATION_FPS_CAP" src/primitives/CesiumMap.tsx` → at least 1 match.

**Verify**: match found. If not, STOP — the measurement below would be
against the wrong baseline.

### Step 2: Measure — decide proceed or reject

1. `pnpm dev`, open the Dashboard, and get at least one active hostile drone
   loitering (the default demo scenario spawns targets; confirm a target
   card shows a classified drone that is not mitigated).
2. In the browser DevTools Performance panel, record 10 seconds.
3. Read the result: sum the time attributed to React
   commits/reconciliation triggered by the 250 ms tick (look for recurring
   ~4 Hz scripting bursts originating from the `setInterval` callback, as
   opposed to Cesium's `render` work).

Decision rule:

- If the recurring tick bursts average **under ~8 ms of scripting per
  second total** (i.e. under ~2 ms per tick), the sim is not a meaningful
  CPU consumer post-001. Mark this plan **REJECTED** in `plans/README.md`
  with the measured number and stop here.
- Otherwise proceed to Step 3.

**Verify**: the measured ms/tick figure is written down; decision recorded.

### Step 3: Extend the store with hostile positions

In `liveMapStore.ts`, add to the snapshot and store interface:

```ts
/** Per-target live position override, keyed by target id. Written by the
 * Dashboard loiter sim at 4 Hz; read only by the map subscriber. */
hostilePositions: ReadonlyMap<string, { lat: number; lon: number }>;
setHostilePositions: (positions: ReadonlyMap<string, { lat: number; lon: number }>) => void;
```

Follow the existing setter pattern (replace snapshot, `emit()`), matching
the file's comment style.

**Verify**: `npx tsc -p tsconfig.app.json --noEmit` → exit 0.

### Step 4: Split the sim tick into two cadences

In the loiter effect (`Dashboard.tsx:848`):

- Every 250 ms tick: compute new positions for active drones exactly as
  today, but write them to `liveMap.setHostilePositions(...)` and to a local
  ref — do NOT call `setTargets`.
- Every 4th tick (1 Hz): flush the ref into React state with the existing
  `setTargets` mapper so card-visible `coordinates` strings and trails stay
  fresh. Keep the existing same-reference short-circuit for no-op flushes,
  the `activeLoiterIds` pruning, and the `document.hidden` pause.

The jamming/approach/flow code paths that also call `setTargets` elsewhere
in the file are untouched.

**Verify**: `npx tsc -p tsconfig.app.json --noEmit` → exit 0.

### Step 5: Feed the map from the store

In `LiveCesiumTacticalMap.tsx` (the existing `useSyncExternalStore`
subscriber), merge `hostilePositions` over the target coordinates before
they reach `CesiumTacticalMap`, so markers move at 4 Hz while Dashboard
re-renders at 1 Hz. If `CesiumTacticalMap` needs a new optional prop for
this, add it there; the kinematic motion tracks in the map primitive
(`pushSample` on prop updates) will keep interpolating smoothly exactly as
they do today — the sample cadence they see is unchanged (4 Hz).

**Verify**: `npx tsc -p tsconfig.app.json --noEmit` → exit 0. In `pnpm dev`:
hostile drone markers still loiter smoothly on the map; the coordinates
shown in an open target card update about once per second; jamming a target
still freezes/redirects it correctly.

### Step 6: Re-measure and gate

Repeat the Step 2 measurement. The recurring 4 Hz scripting bursts from
Dashboard reconciliation should be gone (replaced by a 1 Hz burst and a
negligible 4 Hz store write). Record before/after in the completion report.

**Verify**:
- `pnpm lint` → exit 0
- `npx tsc -p tsconfig.app.json --noEmit` → exit 0
- `pnpm build` → exit 0
- `git status --short` → only in-scope files modified

## Test plan

No unit-test runner exists. Acceptance is behavioral, all in `pnpm dev`:

- Hostile drones loiter smoothly (map, 4 Hz path).
- Target card coordinates tick at ~1 Hz (React path).
- Mitigation flows (jam, engage) still work end to end on a loitering
  target — these read/write target state through the untouched `setTargets`
  call sites.
- `?sim=off` still disables all sim movement.
- Step 6 profiling shows the 4 Hz reconciliation bursts eliminated.

## Done criteria

Machine-checkable. ALL must hold (skip all but the first if REJECTED at
Step 2):

- [ ] Decision + measurement from Step 2 recorded in `plans/README.md`
- [ ] `rg -n "setHostilePositions" src/app/components/liveMapStore.ts` → match
- [ ] The 250 ms tick contains no `setTargets` call (1 Hz flush only):
      inspect the effect at `Dashboard.tsx` (loiter sim) and confirm
- [ ] `pnpm lint`, `npx tsc -p tsconfig.app.json --noEmit`, `pnpm build` all exit 0
- [ ] Before/after profile numbers in the completion report
- [ ] `git status --short` shows no modified files outside the Scope list
- [ ] `plans/README.md` status row updated (DONE or REJECTED)

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 001 is not DONE (Step 1).
- The two-cadence split turns out to require changes in the card/list
  components under `src/imports/` (position is consumed somewhere at 4 Hz
  that this plan didn't identify).
- Any mitigation/engagement flow misbehaves after Step 4 — the interleaving
  of the 1 Hz flush with the other `setTargets` call sites is the riskiest
  part of this plan; report the specific flow rather than patching around
  it.
- The Step 2 measurement is ambiguous (can't isolate the tick bursts) —
  report what you saw instead of guessing.

## Maintenance notes

- After this lands there are two sources of truth for active-drone
  positions (store = fresh, React state = up to 1 s stale). Anything new
  that consumes target coordinates for *rendering on the map* must read the
  store; anything for *UI text* can use React state. A short comment at the
  store's `hostilePositions` field should say this.
- If a future backend feed replaces the sim, the store write is the natural
  integration point and the 1 Hz React flush can likely drop entirely.
- Deferred deliberately: letting motion tracks freeze between samples so
  the Cesium scene can fully idle (noted in plan 001's maintenance notes).
