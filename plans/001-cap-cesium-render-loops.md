# Plan 001: Cap Cesium animation-driven render loops at 30 fps

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- src/primitives/CesiumMap.tsx`
> If the file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

The app's Cesium viewer is created with `requestRenderMode: true` so the scene
only renders when something changes. But three mechanisms in
`src/primitives/CesiumMap.tsx` call `viewer.scene.requestRender()` on every
single animation frame, uncapped — on a ProMotion MacBook that is a full scene
render (including Google Photorealistic 3D Tiles when enabled) at up to
120 fps, continuously. Measured during the audit: the browser GPU helper
process sat at ~80% CPU and the renderer at ~25–30% whenever a map with
animated coverage walls or moving markers was visible. Capping
animation-driven renders at 30 fps cuts that work by 2–4x with no visible
quality loss for slow-moving effects (a 3.2 s wall pulse, a 4 s radar sweep,
drones interpolated from 4 Hz samples). User interaction (camera drags/zooms)
is NOT affected — Cesium requests those renders through its own event path,
which this plan does not touch.

## Current state

One file is in scope: `src/primitives/CesiumMap.tsx` (~2,330 lines) — the
shared Cesium map primitive used by the Dashboard tactical map and the
onboarding scene.

The three uncapped render drivers:

**Driver 1 — animated coverage materials (energy walls / radar sweeps / FOV
wall curtains).** Runs whenever ANY html marker carries one of these. The
onboarding scene (`src/app/components/onboarding/OnboardingMap.tsx`) attaches
a `coverageWall` or `fov.wall` to every placed asset by design, so on that
screen this loop runs permanently:

```ts
// src/primitives/CesiumMap.tsx:1829-1845
// ── Animated coverage-material render loop ─────────────────────────────────
// Energy walls / radar sweeps are time-driven materials; with Cesium in
// request-render mode they would freeze after one frame. Keep the scene
// rendering while any marker carries one.
const hasAnimatedCoverage = !!htmlMarkers?.some(
  (m) => m.coverageWall || m.radarSweep || m.fov?.wall,
);
useEffect(() => {
  if (!hasAnimatedCoverage) return;
  let raf = 0;
  const tick = () => {
    viewerRef.current?.scene.requestRender();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}, [hasAnimatedCoverage]);
```

**Driver 2 — time-animated polylines (flowing particles, smoothed engagement
lines).** Same shape:

```ts
// src/primitives/CesiumMap.tsx:1421-1433
useEffect(() => {
  if (!hasAnimatedPolylines) return;
  const viewer = viewerRef.current;
  if (!viewer) return;

  let raf = 0;
  const step = () => {
    if (!viewer.isDestroyed()) viewer.scene.requestRender();
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}, [hasAnimatedPolylines]);
```

**Driver 3 — kinematic markers.** A `preRender` listener (added inside the
viewer-creation effect, starting at `src/primitives/CesiumMap.tsx:1098`)
projects every html marker to canvas coordinates each frame. For markers with
a motion track it queries the track and, if any track is not frozen, requests
another frame at the end:

```ts
// src/primitives/CesiumMap.tsx:1151-1204 (abridged)
let kinematicActive = false;
for (const [id, node] of nodes) {
  const track = tracks.get(id);
  // ... project track position or static cartesian to canvas coords ...
  if (track) {
    const s = track.query(now);
    // ...
    if (!s.frozen) kinematicActive = true;
  }
  // ...
}
if (kinematicActive) viewer.scene.requestRender();
```

The Dashboard simulation (`src/app/components/Dashboard.tsx`) pushes new
position samples for friendly drones every 250 ms, so tracks are perpetually
interpolating: `frozen` (defined in `src/lib/motionTracker.ts`) only latches
after 5 s without samples (`STALE_AT_MS = 5000` at `motionTracker.ts:54`).
Result: `kinematicActive` is true on every frame of every Dashboard session
and the scene renders continuously at display refresh rate.

**Important subtlety for Driver 3**: `preRender` only fires when a render
actually happens. If you skip the `requestRender()` call without scheduling
anything else, no future frame ever fires and moving markers freeze. The
throttle must therefore *defer* the request (schedule it for later), not drop
it.

Repo conventions that apply:

- Comments in this file explain non-obvious rendering trade-offs at the point
  of use (see the existing comment blocks around each loop). Match that style
  for the throttle constant and helpers.
- Named constants in SCREAMING_SNAKE_CASE with a doc comment (see
  `SMOOTH_LINE_MS`, `TELEPORT_M` in `src/lib/motionTracker.ts:49-56` for the
  pattern).

## Commands you will need

| Purpose   | Command                                  | Expected on success |
|-----------|------------------------------------------|---------------------|
| Install   | `pnpm install`                           | exit 0              |
| Typecheck | `npx tsc -p tsconfig.app.json --noEmit`  | exit 0, no output   |
| Lint      | `pnpm lint`                              | exit 0              |
| Build     | `pnpm build`                             | exit 0              |
| Dev server| `pnpm dev`                               | serves on http://localhost:5173 |

There is no unit-test runner configured in this repo (no `test` script in
`package.json`; `*.spec.ts` files are design-governance specs, not runnable
tests). Verification is typecheck + lint + the manual steps below.

## Scope

**In scope** (the only file you should modify):

- `src/primitives/CesiumMap.tsx`

**Out of scope** (do NOT touch, even though they look related):

- `src/lib/motionTracker.ts` — the `frozen` semantics are tuned for real
  sensor feeds; changing `STALE_AT_MS` would change stale-marker UX
  (halo/dim behavior), not just rendering cost.
- `src/app/components/Dashboard.tsx` — the sim tick rate is addressed
  separately in `plans/004-move-sim-off-react-state.md`.
- `src/app/components/onboarding/OnboardingMap.tsx` — always-on walls are a
  product decision ("the walls are the point").
- `src/primitives/cesiumEnergyMaterials.ts` — material shader/uniform code
  needs no change; it samples `performance.now()` whenever a frame renders,
  so it is automatically correct at any frame rate.
- The `panVelocity` rAF loop at `CesiumMap.tsx:1371-1413` — it runs only
  while the user actively edge-pans; capping it would make panning feel
  choppy for no meaningful CPU win.
- The camera `orbit` handler (`viewer.clock.onTick` around line 2247) — only
  active during the short cinematic orbit beat.

## Git workflow

- Branch: `advisor/001-cap-cesium-render-loops`
- Commit style: conventional commits matching the repo, e.g.
  `perf(map): cap animation-driven Cesium renders at 30 fps`
  (compare `git log --oneline`: `feat(devices-panel): ship hatched offline treatment for device rows`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the shared frame-cap constant and a throttled render scheduler

Near the top of `src/primitives/CesiumMap.tsx` (module scope, alongside other
module-level constants), add:

```ts
/**
 * Frame-rate cap for ANIMATION-driven renders (energy-wall pulse, radar
 * sweeps, particle flows, kinematic marker interpolation). The viewer runs
 * in requestRenderMode; these slow-moving effects read smoothly at 30 fps,
 * while uncapped they force full scene renders at display refresh rate
 * (120 fps on ProMotion) and peg the GPU process. User-interaction renders
 * (camera moves) are requested through Cesium's own event path and are NOT
 * throttled by this.
 */
const ANIMATION_FPS_CAP = 30;
const ANIMATION_FRAME_MS = 1000 / ANIMATION_FPS_CAP;
```

Inside the `CesiumMap` component, add one ref to timestamp the last
animation-driven render request:

```ts
const lastAnimRenderAtRef = useRef(0);
```

**Verify**: `npx tsc -p tsconfig.app.json --noEmit` → exit 0.

### Step 2: Throttle the animated-coverage loop (Driver 1)

Replace the `tick` body of the effect at lines 1836–1845 so it only requests
a render when `ANIMATION_FRAME_MS` has elapsed:

```ts
useEffect(() => {
  if (!hasAnimatedCoverage) return;
  let raf = 0;
  const tick = (ts: number) => {
    if (ts - lastAnimRenderAtRef.current >= ANIMATION_FRAME_MS) {
      lastAnimRenderAtRef.current = ts;
      viewerRef.current?.scene.requestRender();
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}, [hasAnimatedCoverage]);
```

Note the rAF callback keeps running at native rate — that is intentional and
cheap; only the `requestRender()` (the expensive scene render) is capped. The
shared `lastAnimRenderAtRef` means the coverage loop and polyline loop
(Step 3) don't independently double the effective rate when both are active.

**Verify**: `npx tsc -p tsconfig.app.json --noEmit` → exit 0. Then run
`pnpm dev`, open http://localhost:5173, navigate to the onboarding scene
(route with placed assets / energy walls), and confirm walls still pulse and
radar sweeps still rotate smoothly.

### Step 3: Throttle the animated-polylines loop (Driver 2)

Apply the identical timestamp-skip pattern to the effect at lines 1421–1433,
reusing `lastAnimRenderAtRef`:

```ts
useEffect(() => {
  if (!hasAnimatedPolylines) return;
  const viewer = viewerRef.current;
  if (!viewer) return;

  let raf = 0;
  const step = (ts: number) => {
    if (!viewer.isDestroyed() && ts - lastAnimRenderAtRef.current >= ANIMATION_FRAME_MS) {
      lastAnimRenderAtRef.current = ts;
      viewer.scene.requestRender();
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}, [hasAnimatedPolylines]);
```

**Verify**: `npx tsc -p tsconfig.app.json --noEmit` → exit 0. In the dev
server, trigger a flow with particle polylines / engagement lines (Dashboard
scenario) and confirm particles still flow along the lines.

### Step 4: Defer-throttle the kinematic requestRender (Driver 3)

This one must SCHEDULE the next render, not drop it (see "Current state" —
`preRender` only fires when a render happens; dropping the request freezes
all moving markers).

Inside the viewer-creation effect (the same closure where `removePreRender`
is defined at line ~1098), add a single pending-timer guard before the
listener:

```ts
// Deferred requestRender for kinematic marker animation: preRender only
// fires when a frame renders, so we must always schedule the NEXT frame —
// but at the animation cap, not the display's native refresh rate. A single
// pending timer prevents stacking.
let kinematicRenderTimer: number | undefined;
const scheduleKinematicRender = () => {
  if (kinematicRenderTimer !== undefined) return;
  const elapsed = performance.now() - lastAnimRenderAtRef.current;
  const delay = Math.max(0, ANIMATION_FRAME_MS - elapsed);
  kinematicRenderTimer = window.setTimeout(() => {
    kinematicRenderTimer = undefined;
    lastAnimRenderAtRef.current = performance.now();
    if (!viewer.isDestroyed()) viewer.scene.requestRender();
  }, delay);
};
```

Replace line 1204:

```ts
if (kinematicActive) viewer.scene.requestRender();
```

with:

```ts
if (kinematicActive) scheduleKinematicRender();
```

In the effect's cleanup (where `removePreRender` and other teardown run —
find the `return` of this effect), add:

```ts
if (kinematicRenderTimer !== undefined) window.clearTimeout(kinematicRenderTimer);
```

**Verify**: `npx tsc -p tsconfig.app.json --noEmit` → exit 0. In the dev
server Dashboard, confirm friendly patrol drones still glide smoothly along
their routes (they are interpolated from 4 Hz samples by
`src/lib/motionTracker.ts`, so 30 fps rendering of a 250 ms exponential
smoother is visually indistinguishable from 120 fps).

### Step 5: Measure the improvement

With the dev server running and the Dashboard map visible in the browser:

```bash
ps -Ao pid,pcpu,comm -r | head -8
```

Record the `%CPU` of the browser's GPU helper process and renderer process,
and compare against the pre-change baseline (audit baseline: GPU helper ~80%,
renderer ~25–30%). Expect the GPU helper to drop very roughly proportionally
to the frame-rate reduction (120 → 30 fps ≈ 4x less render work; other
overheads mean the observed drop will be smaller but must be substantial).
Include both numbers in your completion report.

**Verify**: GPU-process CPU while the Dashboard map is idle-but-animating is
materially lower than baseline (expect at least a 40% relative drop).

### Step 6: Final gates

**Verify**:
- `pnpm lint` → exit 0
- `npx tsc -p tsconfig.app.json --noEmit` → exit 0
- `pnpm build` → exit 0
- `git status --short` → only `src/primitives/CesiumMap.tsx` modified
  (plus `plans/README.md` when you update the status row)

## Test plan

No unit-test runner exists in this repo, so verification is:

- Typecheck, lint, and production build (commands above).
- Manual smoke of each animated surface, all in `pnpm dev`:
  1. Onboarding scene: energy walls pulse, radar sweep rotates, threat
     particle flows move (Drivers 1 + 2).
  2. Dashboard: friendly drones patrol smoothly, breadcrumb trails extend,
     engagement lines ease between positions (Drivers 2 + 3).
  3. Camera interaction on both maps: drag/zoom remains at native refresh
     smoothness (interaction renders are not throttled).
- CPU measurement per Step 5.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npx tsc -p tsconfig.app.json --noEmit` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] `grep -n "ANIMATION_FPS_CAP" src/primitives/CesiumMap.tsx` returns at least 1 match
- [ ] `grep -n "if (kinematicActive) viewer.scene.requestRender()" src/primitives/CesiumMap.tsx` returns no matches
- [ ] `git status --short` shows no modified files outside the Scope list
- [ ] GPU-process CPU drop recorded in the completion report (Step 5)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the cited line ranges doesn't match the excerpts (drift since
  `805086b` — the file is under active development, see git status noise
  around `CesiumMap.tsx`).
- After Step 4, kinematic markers freeze or stutter-step instead of gliding
  (indicates the defer-scheduler isn't re-arming; do not "fix" by removing
  the throttle).
- Wall pulse / radar sweep visibly judders at 30 fps to the point of looking
  broken. Fallback you MAY apply without re-approval: raise
  `ANIMATION_FPS_CAP` to 60 (still halves ProMotion cost). Report that you
  did so.
- The fix appears to require touching `motionTracker.ts` or any other
  out-of-scope file.

## Maintenance notes

- Any NEW continuous animation added to `CesiumMap.tsx` (new rAF loop or
  `CallbackProperty` that reads wall-clock time) must route its
  `requestRender` calls through the same cap, or the win silently regresses.
  Reviewers should grep for new `requestAnimationFrame` + `requestRender`
  pairings in this file.
- If a future feature needs one specific animation at 60 fps (e.g. a missile
  fly-out), prefer a per-call bypass parameter over raising the global cap.
- Deferred follow-up (out of scope here): letting Dashboard sim tracks reach
  `frozen` between samples would let the scene fully idle when nothing moves;
  that interacts with stale-marker UX and belongs with plan 004's re-measure.
