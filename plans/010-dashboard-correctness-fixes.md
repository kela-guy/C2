# Plan 010: Fix the Dashboard timer leak and three latent correctness bugs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- src/app/components/Dashboard.tsx src/primitives/CesiumMap.tsx`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition. **Known at planning time**: the user's working
> tree has uncommitted `CesiumMap.tsx` changes. This plan's excerpts are from
> commit `805086b` — if you are executing in a worktree at that commit, they
> will match; the reviewer handles merge implications.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/008-establish-test-baseline.md (soft — for the patrol-wrap unit test; the fixes themselves don't need it)
- **Category**: bug
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

Four verified correctness issues, all in the production console path:

1. **Dead timer registry.** `Dashboard.tsx` declares `pendingTimeoutsRef`
   (line 627), documents it as tracking "bare setTimeout calls", and clears it
   on unmount (line 648) — but nothing ever `.add()`s to it, while the file
   contains **23 bare `setTimeout` calls** that fire `setTargets`, focus
   resets, and mitigation cascades. Navigating away mid-simulation fires state
   setters on an unmounted tree and can leave stray intervals running.
2. **Patrol wrap bug.** The patrol tick resets every drone's progress against
   route `[0]`'s waypoint count instead of its own route's.
3. **Stale closure.** The camera-control countdown reads `targets` from the
   effect closure inside a `setInterval`; the file already maintains
   `targetsRef` for exactly this problem but this effect doesn't use it.
4. **Missing destroy guard.** The Cesium pan rAF loop calls camera methods
   without the `viewer.isDestroyed()` guard that the adjacent animated-polyline
   loop has — a scheduled frame after `viewer.destroy()` throws inside Cesium.

## Current state

All excerpts at commit `805086b`.

- `src/app/components/Dashboard.tsx:625-627` — the empty registry:

```625:627:src/app/components/Dashboard.tsx
  // Tracks bare `setTimeout` calls scheduled outside the main timer refs so we
  // can clear them on unmount (CUAS spawn, mitigation cascades, focus resets).
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
```

  The master unmount cleanup (lines 634-655) already drains it:
  `for (const id of pending.current) clearTimeout(id);`.
  The 23 bare call sites (line numbers at `805086b`): 505, 1163, 1231, 1284,
  1297, 1332, 1368, 1418, 1461, 1587, 1592, 1661, 1709, 1714, 1970, 1971,
  2036, 2113, 2157, 2237, 2297 — plus two already-tracked sites using
  `cameraPointingTimeoutRef` (1648, 2001) which you must NOT rewrap.
- `src/app/components/Dashboard.tsx:751-754` — patrol wrap:

```751:754:src/app/components/Dashboard.tsx
      patrolProgressRef.current = patrolProgressRef.current.map((p) => {
        const next = p + PATROL_SPEED;
        return next >= friendlyPatrolRoutes[0].waypoints.length ? 0 : next;
      });
```

  (All routes currently have 4 waypoints, so the bug is latent — it bites the
  first time someone edits a route.)
- `src/app/components/Dashboard.tsx:692-716` — the countdown effect. It calls
  `targets.find(t => t.id === prev.targetId)` inside a `setInterval` and lists
  `targets` in its dep array, but `setInterval` captures the closure at effect
  setup; the established in-file pattern for this is the always-fresh ref:

```383:387:src/app/components/Dashboard.tsx
  // Always-fresh mirror of `targets` for callbacks that must read the
  // current track without being recreated each render (e.g. the flow
  // player's camera-point op reads a moving target's live coordinates).
  const targetsRef = useRef<Detection[]>([]);
  targetsRef.current = targets;
```

- `src/primitives/CesiumMap.tsx` (at `805086b`, around line 1176) — pan loop
  without guard; contrast the guarded polyline loop ~40 lines below it:

```ts
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const height = viewer.camera.positionCartographic?.height ?? 50_000;
      const scale = Math.max(1_000, height);
      viewer.camera.moveRight(vx * scale * dt);
      viewer.camera.moveUp(vy * scale * dt);
      viewer.scene.requestRender();
      raf = requestAnimationFrame(step);
    };
```

  The guarded pattern used elsewhere in the same file:
  `if (!viewer.isDestroyed()) viewer.scene.requestRender();`

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build | `pnpm build` | exit 0 |
| Tests (if 008 landed) | `pnpm test` | all pass |
| Bare-timeout audit | see Done criteria | 0 unregistered sites |

## Scope

**In scope** (the only files you should modify):
- `src/app/components/Dashboard.tsx`
- `src/primitives/CesiumMap.tsx` (the pan-loop effect only)
- `src/app/components/dashboardTimers.test.ts` (create — only if plan 008 landed)

**Out of scope** (do NOT touch):
- `cuasIntervalRef`/`cuasMassRefs`/`cameraPointingTimeoutRef` wiring — those
  timers are already tracked.
- Any other effect, memo, or render logic in Dashboard.
- Everything else in `CesiumMap.tsx` — especially the energy-wall timers and
  marker teardown (a separate deferred finding).

## Git workflow

- Branch: `advisor/010-dashboard-correctness`
- Commit per step; style: `fix(dashboard): register bare timeouts for unmount cleanup`, etc.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a tracked-timeout helper and convert the 23 call sites

Directly below the `pendingTimeoutsRef` declaration (line 627), add:

```ts
  // Schedule a timeout that is auto-cleared on Dashboard unmount. Use this
  // for every fire-and-forget delay; long-lived named timers keep their own refs.
  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      pendingTimeoutsRef.current.delete(id);
      fn();
    }, ms);
    pendingTimeoutsRef.current.add(id);
    return id;
  }, []);
```

Convert every bare `setTimeout(...)` call site listed in Current state to
`scheduleTimeout(...)`. Rules:
- `window.setTimeout(show, ...)` at line 505 counts — convert it.
- Do NOT convert the two `cameraPointingTimeoutRef.current = setTimeout(...)`
  sites (1648, 2001) — they're separately tracked and cleared.
- Where the return value of `setTimeout` is unused (all 21 remaining sites),
  the conversion is mechanical.

**Verify**:
`rg -n "setTimeout\(" src/app/components/Dashboard.tsx | rg -v "scheduleTimeout|cameraPointingTimeoutRef|const id = setTimeout"` → no matches.

### Step 2: Fix the patrol wrap

Change the map callback at lines 751-754 to use the per-index route:

```ts
      patrolProgressRef.current = patrolProgressRef.current.map((p, i) => {
        const next = p + PATROL_SPEED;
        return next >= friendlyPatrolRoutes[i].waypoints.length ? 0 : next;
      });
```

**Verify**: `pnpm build` → exit 0.

### Step 3: Fix the stale-targets closure in the countdown effect

In the effect at lines 692-716, replace the closure read
`targets.find(...)` with `targetsRef.current.find(...)` and remove `targets`
from the dependency array (keep `cameraControlRequest?.targetId` and `t`).
Add a one-line comment referencing the `targetsRef` pattern (see lines 383-387).

**Verify**: `npx eslint src/app/components/Dashboard.tsx` reports no NEW
`react-hooks/exhaustive-deps` error at this effect compared to before your
change (the ref read is the documented in-file convention).

### Step 4: Guard the Cesium pan loop

In `src/primitives/CesiumMap.tsx`, at the top of the pan-loop `step` callback
(the effect keyed on `[panVelocity]`), add:

```ts
      if (viewer.isDestroyed()) return;
```

as the first line, so no camera call and no further `requestAnimationFrame`
happens after destroy.

**Verify**: `pnpm build` → exit 0.

### Step 5 (only if plan 008 landed): patrol-wrap regression test

The patrol logic is inline in Dashboard, so test it indirectly: extract is NOT
allowed (out of scope). Instead write
`src/app/components/dashboardTimers.test.ts` asserting the pure wrap math:
replicate the map callback as a local function in the test with routes of
unequal waypoint counts (e.g. 4 and 6) and assert each index wraps at its own
length. This is a characterization of the intended behavior; link it in a
comment to `Dashboard.tsx` patrol tick. If plan 008 has not landed, skip this
step and say so in the report.

**Verify**: `pnpm test` → all pass.

## Test plan

- Step 5's wrap test (conditional on 008).
- Manual: `pnpm dev`, load `/`, trigger a CUAS simulation (devices panel →
  simulate), navigate to `/styleguide` mid-run, and confirm the console shows
  no "setState on unmounted component" warnings. If you cannot run a browser,
  state that this check was skipped.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `rg -n "setTimeout\(" src/app/components/Dashboard.tsx | rg -v "scheduleTimeout|cameraPointingTimeoutRef|const id = setTimeout"` → no matches
- [ ] `rg -n "friendlyPatrolRoutes\[0\].waypoints.length" src/app/components/Dashboard.tsx` → no matches
- [ ] `rg -n "isDestroyed" src/primitives/CesiumMap.tsx` includes a hit inside the pan-loop effect
- [ ] `pnpm build` exits 0
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated (unless the reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- The code at any cited line doesn't match the excerpt (drift — especially
  `CesiumMap.tsx`, which has known uncommitted changes in the user's tree).
- A bare `setTimeout` site turns out to store or clear its id somewhere this
  plan didn't map — report the site, don't guess.
- Converting a call site changes observable timing (e.g. a site relies on the
  raw id for cancellation elsewhere).
- The countdown effect's dep change triggers an exhaustive-deps error that
  can't be resolved by the documented ref pattern.

## Maintenance notes

- New `setTimeout` calls in Dashboard should use `scheduleTimeout` — a
  reviewer catching a bare `setTimeout` in future PRs should point here.
- The patrol-wrap fix matters the moment route geometries diverge; the test in
  Step 5 is the guard.
- Deferred (found in audit, not planned): energy-wall rise timers in
  `CesiumMap.tsx` (~line 589 at HEAD) are never cancelled on marker teardown —
  currently harmless due to `isDestroyed()` guards; revisit if wall teardown
  changes.
