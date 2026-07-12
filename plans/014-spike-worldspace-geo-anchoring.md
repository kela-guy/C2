# Plan 014: Spike — anchor map-draw shapes to world space (Cesium)

> **Executor instructions**: This is a **design/spike plan**, not a build
> plan. The deliverable is a written findings document plus a throwaway
> prototype — NOT production code. Follow the steps, honor the STOP
> conditions, and when done update the status row for this plan in
> `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- src/app/components/map-draw/ src/app/components/geo-entities-sandbox/`
> The map-draw area is under active development (the working tree has
> uncommitted onboarding/map changes). Expect some drift; if the core
> screen-space model described below has already changed, STOP and report.

## Status

- **Priority**: P3
- **Effort**: M (spike; the eventual build is L and is NOT this plan)
- **Risk**: LOW (prototype only; no production surface touched)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

The map-draw feature (zones, lines, pins, KML/GeoJSON import) shipped into the
production Dashboard, but the overlay is deliberately **screen-space**: shapes
are stored in normalized viewport coordinates and do not reproject when the
Cesium camera pans, tilts, or zooms. The module header says so explicitly.
That was the right prototype economy, but it caps the feature: an operator who
draws a restricted zone and then moves the camera sees the zone detach from
the terrain, and imported KML (which is inherently geographic) is projected
through a fixed sandbox bounding box. Before committing to the L-effort
production build, this spike answers the load-bearing technical questions and
produces a migration design.

## Current state

- `src/app/components/map-draw/MapDrawOverlay.tsx:1-10` — the design decision:

```1:10:src/app/components/map-draw/MapDrawOverlay.tsx
/**
 * Map-draw overlay — screen-space drawing layer painted on top of the
 * Cesium tactical map.
 *
 * This is the production wrapper around the geo-drawing engine that lives
 * in `geo-entities-sandbox/`. It intentionally treats fingers/mouse in
 * **screen space**: shapes do not reproject when the camera pans or
 * tilts. That keeps the prototype focused on the interaction model the
 * design lab is exploring (annotation chrome, panel-driven inspector)
 * without taking on the cost of Cesium-coupled geometry.
```

- Key modules:
  - `src/app/components/geo-entities-sandbox/drawTypes.ts` — `GeoShape`,
    `Vec2`, `bbox`, `clampPoint`, `unproject` (normalized-coordinate engine).
  - `src/app/components/geo-entities-sandbox/useGeoDraw.ts` (~1,137 lines) —
    draw state machine; shapes live in React state, no persistence.
  - `src/app/components/map-draw/imports.ts` — KML/GeoJSON parser; imported
    geometry is mapped into normalized screen space via `SANDBOX_BOUNDS`
    (`src/app/components/map-draw/MapDrawOverlay.tsx:47` imports it from
    `../geo-entities-sandbox/fixtures`).
  - `src/primitives/CesiumMap.tsx` — the Cesium viewer wrapper; uses
    `requestRenderMode` (render-on-demand) — any per-frame reprojection
    approach must respect this (see `plans/001-cap-cesium-render-loops.md`
    context: render loops that defeat request-render mode are a known CPU
    problem in this app).
- Cesium APIs of interest (verify availability in cesium ^1.140):
  `viewer.scene.pickPosition`, `scene.globe.pick(ray)`,
  `Cesium.SceneTransforms.worldToWindowCoordinates` (per-frame world→screen),
  `Cesium.Entity` with `PolygonGraphics`/`PolylineGraphics` +
  `HeightReference.CLAMP_TO_GROUND` (native world-space rendering).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Dev server | `pnpm dev` | serves; needs `VITE_CESIUM_ION_TOKEN` for photoreal tiles |
| Build | `pnpm build` | exit 0 (prototype must not break it) |

## Scope

**In scope**:
- `docs/geo-anchoring-spike.md` (create — the primary deliverable)
- A prototype surface: either a new DEV-only route
  `src/app/components/geo-entities-sandbox/GeoAnchorSpike.tsx` + a DEV-gated
  route in `src/app/App.tsx` (follow the `GeoEntitiesSandbox` pattern at
  `App.tsx:61-63`, `277-286`), or modifications confined to
  `geo-entities-sandbox/` files.

**Out of scope** (do NOT touch):
- `src/app/components/map-draw/` production files (`MapDrawOverlay.tsx`,
  `MapDrawPanel.tsx`, `MapDrawProvider`, `imports.ts`) — the working tree has
  active development here; the spike must not create merge conflicts.
- `src/primitives/CesiumMap.tsx` — read it, don't edit it; the prototype makes
  its own minimal Cesium viewer or composes the existing one via props.
- Any persistence layer, any UI polish.

## Git workflow

- Branch: `advisor/014-geo-anchoring-spike`
- Commit style: `spike(geo): world-space anchoring findings + prototype`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Answer the projection questions in a minimal prototype

Build the smallest possible Cesium scene (own viewer in the spike route is
fine) that demonstrates, for a polygon and a polyline:

1. **Draw capture**: converting pointer positions to geographic coordinates —
   compare `scene.pickPosition` (needs depth; works on 3D Tiles) vs
   `globe.pick(camera.getPickRay(...))` (ellipsoid/terrain). Record which
   works on (a) the flat-raster fallback scene and (b) Google Photorealistic
   tiles, and their failure modes (returns undefined when?).
2. **Rendering**: the same shape rendered two ways — (a) native Cesium
   entities clamped to ground, (b) screen-space SVG re-projected per camera
   move via `worldToWindowCoordinates` listening on `camera.changed`.
   Measure/observe: visual fidelity on tilt, behavior when partially behind
   terrain, and render-mode cost (does approach (b) force continuous
   renders?).

**Verify**: `pnpm build` → exit 0; the spike route renders both approaches.

### Step 2: Write the findings document

Create `docs/geo-anchoring-spike.md` covering:

- **Recommendation**: native entities vs re-projected overlay (or hybrid:
  native geometry + screen-space editing handles), with the evidence from
  Step 1.
- **Data-model migration**: how `GeoShape` (normalized `Vec2` points) becomes
  geographic (`[lat, lon]` or Cartographic) — field-by-field; what happens to
  existing screen-space semantics (e.g. "circle" that is screen-round vs
  geodesic); how `imports.ts` simplifies once shapes are natively geographic
  (KML already IS lat/lon — the `SANDBOX_BOUNDS` projection step disappears).
- **Interaction model**: how the existing gesture engine (`useGeoDraw`)
  survives — capture stays in screen space, commit converts to world space;
  which handle interactions need per-frame reprojection.
- **Render-mode budget**: how the approach coexists with `requestRenderMode`
  (cite what you observed; reference the render-loop concerns from
  `plans/001-cap-cesium-render-loops.md`).
- **Open questions** for the maintainer, each with your recommendation (e.g.
  altitude semantics for lines; what "arrow" and "curve" mean geodesically;
  whether export should ship before or after anchoring — see the plans/README
  note on the import/export asymmetry finding).
- **Effort estimate** for the production build, broken into stages.

**Verify**: the document exists and every claim in it traces to something you
observed in Step 1 or read in the code (no speculation presented as fact).

## Test plan

Not applicable — spike. The findings doc is the artifact under review.

## Done criteria

ALL must hold:

- [ ] `docs/geo-anchoring-spike.md` exists with all six sections above
- [ ] Prototype route exists, is DEV-gated, and `pnpm build` exits 0
- [ ] No files under `src/app/components/map-draw/` modified (`git status`)
- [ ] `src/primitives/CesiumMap.tsx` not modified
- [ ] `plans/README.md` status row updated (unless the reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- The screen-space model in `MapDrawOverlay.tsx`/`drawTypes.ts` has materially
  changed since `805086b` (active development area) — the spike questions may
  already be answered or reframed.
- No Cesium Ion token is available in the environment AND the flat-raster
  fallback is insufficient to answer Step 1's questions — report which
  questions remain unanswered rather than guessing.
- Step 1 shows BOTH rendering approaches are unworkable (fidelity or
  render-budget) — that finding IS the deliverable; write it up and stop.

## Maintenance notes

- The follow-on production build should be planned only after a maintainer
  reads the findings doc and picks an approach — do not chain into it.
- The map-draw export/persistence feature (separate direction finding) is
  sequenced after this: exporting screen-space coordinates as if they were
  geographic would be misleading.
