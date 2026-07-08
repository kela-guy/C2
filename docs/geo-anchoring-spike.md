# Spike findings: anchoring map-draw shapes to world space (Cesium)

Deliverable of `plans/014-spike-worldspace-geo-anchoring.md`. Evidence comes
from a throwaway prototype at the DEV-only route `/geo-anchor-spike`
(`src/app/components/geo-entities-sandbox/GeoAnchorSpike.tsx`), run against
cesium 1.140.0 with a valid Ion token on three scene presets: flat raster
(CARTO dark, ellipsoid terrain), Cesium World Terrain + Ion satellite
imagery, and Google Photorealistic 3D Tiles (Ion asset 2275207). The
prototype viewer runs `requestRenderMode: true`.

**How to read the evidence labels.** Every claim below is tagged:

- **[observed]** — seen directly in the prototype during this spike
  (screenshots / pick logs / instrumentation counters).
- **[contract]** — derived from the Cesium 1.140 type declarations /
  documented API semantics or from reading this repo's code, NOT verified
  by running it.

One measurement limitation, stated up front: the spike was observed through
an embedded automation browser whose `requestAnimationFrame` was throttled
to ~2–3 ticks/s regardless of tab visibility, so **absolute** frame-rate
numbers (e.g. "the overlay costs N renders/s at 120 Hz") could not be
measured. **Relative and structural** observations (does X fire at all,
does idle stay at zero, do counters track each other 1:1) were unaffected
and are what the conclusions rest on.

---

## 1. Recommendation

**Hybrid: native ground-clamped Cesium entities for shape bodies; the
existing screen-space DOM/SVG layer only for transient editing chrome
(vertex/transform handles, labels), re-projected from world positions.**

The pure screen-space re-projection approach (SVG re-painted from
`SceneTransforms.worldToWindowCoordinates` on `camera.changed`) is not
viable as the *shape renderer* on 3D scenes, for reasons observed directly:

- **Edges don't drape.** The SVG connects vertices with straight screen
  lines. Native clamped geometry follows terrain relief between vertices.
  On the World Terrain and photoreal scenes at a low tilt (-8°) the same
  four world vertices produced a draped cyan polygon hugging a hillside and
  an orange SVG polygon floating across the valley in a visibly different
  screen region. [observed — see "vertex heights" caveat below, which
  amplified the effect but is itself part of the finding]
- **No occlusion.** `worldToWindowCoordinates` does no visibility test:
  vertices buried under terrain (h=0 ellipsoid points under ~700 m
  terrain) still projected and painted. A shape behind a hill draws on top
  of the hill. [observed] Native clamped entities are depth-tested and
  occlude naturally. [observed]
- **Behind-camera vertices vanish wholesale.** After turning the camera
  180°, `worldToWindowCoordinates` returned `undefined` for every vertex
  and the SVG paths dropped out entirely [observed]. For a shape partially
  behind the camera, per-vertex `undefined`s would distort the polygon
  unless the overlay implements its own frustum clipping — significant
  extra geometry code for a worse result. [contract, follows directly from
  the observed per-vertex behavior]
- **`camera.changed` doesn't cover shape edits.** The overlay only
  re-projected after a camera move; committing a shape did not trigger it
  (the prototype needed an explicit kick). Any real implementation carries
  a second invalidation path. [observed]

Native entities, by contrast, did everything the feature needs out of the
box: polygons with no height reference drape over BOTH terrain and 3D
Tiles (classification default) and stay glued through tilt/pan/zoom with
zero app-side work per frame [observed on all three scene presets — the
polygon drape over photoreal buildings and terrain relief was
unambiguous]. `clampToGround` polylines rendered and tracked the surface
on all presets [observed, though at the camera distances used the drape
was less visually striking than the polygon's; the repo already relies on
the same flag for terrain-following trails —
`CesiumMap.tsx:1696-1721`].

Why *hybrid* and not pure-native: transform handles, hover chips, and
labels are UI chrome that wants crisp CSS/SVG rendering and React pointer
handling. `CesiumMap.tsx` already ships exactly this pattern —
`htmlMarkers` DOM nodes re-positioned each frame from a `preRender`
listener via `cartesianToCanvasCoordinates` (`src/primitives/CesiumMap.tsx:926-993`).
The editing chrome should reuse that mechanism, not a `camera.changed`
listener. [contract — pattern read from code, not re-benchmarked]

**Draw-capture picker.** Production order should be
`scene.pickPosition` → `globe.pick(getPickRay)` → `camera.pickEllipsoid`,
which is exactly what `pickGroundLatLon` in `CesiumMap.tsx:330-352` already
implements. Observed behavior per scene:

| Scene | `scene.pickPosition` | `globe.pick(ray)` | `camera.pickEllipsoid` |
|---|---|---|---|
| Flat raster (ellipsoid terrain) | works; small depth noise (h ≈ -2.2 m) | works (h ≈ 0) | works (h = 0) |
| World Terrain | works (h = 713.4 m) | works, agrees to ~0.5 m (h = 713.9 m) | **~6 km off** on an oblique view — intersects the ellipsoid, not the terrain |
| Photorealistic 3D Tiles (click on a building) | works — returns the tile surface (roof, h = 854 m) | **ignores tiles** — returns the terrain point behind the building, ~370 m displaced (h = 716 m) | ~2 km off, h = 0 |
| Sky (any scene) | `undefined` | `undefined` | `undefined` |

All rows [observed] (pick-log excerpts, one click per row):

```
flat:      pickPosition: 31.78989, 35.17857, h=-2.2m | globe.pick: 31.78987, 35.17857, h=-0.0m | pickEllipsoid: 31.78987, 35.17857, h=0.0m
terrain:   pickPosition: 31.74959, 35.17977, h=713.4m | globe.pick: 31.74955, 35.17977, h=713.9m | pickEllipsoid: 31.80568, 35.17890, h=0.0m
photoreal: pickPosition: 31.73609, 35.18017, h=854.0m | globe.pick: 31.73934, 35.18068, h=716.3m | pickEllipsoid: 31.75626, 35.18332, h=0.0m
sky:       all three undefined
```

Failure modes to design around: every picker returns `undefined` on sky
clicks (drafts must tolerate a no-op vertex) [observed]; `pickPosition`
requires `scene.pickPositionSupported` (true in the tested environment,
depends on WebGL depth-texture support) [observed + contract]; on 3D-Tile
scenes `pickPosition` picks building roofs/walls — see open question 2.

**Vertex heights matter.** The seeded demo shapes used
`Cartesian3.fromDegrees(lon, lat)` (h=0). Native *clamped* rendering was
immune (clamping ignores stored height), but the SVG projection of those
same points diverged wildly on terrain scenes because the points are
hundreds of meters underground. [observed] Any world-space model must
either store surface heights captured at pick time or treat positions as
2-D (lat/lon) + clamp — recommendation: the latter (see §2).

---

## 2. Data-model migration (`GeoShape` → geographic)

Current model: `src/app/components/geo-entities-sandbox/drawTypes.ts` —
`points: Vec2[]` normalized to `[0,1]` canvas space, projected to lat/lng
only for display via `unproject(p, SANDBOX_BOUNDS)`. [contract — read]

Proposed field-by-field:

| Field | Today | After | Notes |
|---|---|---|---|
| `points` | `Vec2[]` (normalized canvas) | `GeoPoint[]` = `{ lat: number; lon: number }` (degrees, WGS84) | No stored height — shapes are ground-clamped; altitude semantics live on the zone, not the vertex (open question 1). Rendering derives `Cartesian3.fromDegrees` at entity-build time. |
| `sourceBounds` | Projection bounds stamped on imported shapes so the panel can recover original lat/lng | **deleted** | Points ARE the original lat/lng once native. |
| `kind: 'circle'` | Two bbox corners in normalized space (screen-round) | `{ center: GeoPoint; radiusM: number }` (geodesic) | See open question 3. A screen-round circle is not a geographic object; radius-in-meters maps 1:1 to Cesium `EllipseGraphics` (`semiMajorAxis === semiMinorAxis`), same primitive the repo already uses for coverage rings (`CesiumMap.tsx:1443-1454`). |
| `id, tool, kind, name, description, color, strokeColor, fillOpacity, strokeOpacity, status, zoneType, zoneParams, linkUrl, lineStyle, fillMode, hidden, locked` | — | unchanged | Pure metadata/styling; nothing coordinate-coupled. |
| `strokeWidth` | CSS px | unchanged (px) | Cesium polyline `width` is also in pixels. [contract] |

Semantics that change meaning:

- **"Circle" screen-round → geodesic**: today a circle stays round on
  screen at any camera; a geodesic circle is a fixed ground footprint that
  foreshortens under tilt. That is the *correct* behavior for zones (an
  ECM ring is a physical radius), and it matches how the app already
  renders coverage rings.
- **`bbox`/`scalePoints`/`rotatePoints` helpers**: currently operate in
  normalized 2-D space. Post-migration they operate on degrees, where 1°
  of longitude shrinks by `cos(lat)`. At the AO scale (tens of km) a
  local-tangent-plane correction (scale lon deltas by `1/cos(lat)`) is
  sufficient; do transforms in a local east-north frame around the shape
  centroid and convert back. [contract — standard geodesy, not prototyped]
- **`clampPoint` / the `[0,1]` clamp**: deleted. There is no canvas edge
  in world space; the "keep shapes on the map" constraint disappears.

**`imports.ts` simplification** (read: `src/app/components/map-draw/imports.ts`):
the entire projection stage disappears — `pickProjectionBounds` (~60 lines
of safe-area math), `projectRaw`'s `project()` call, the `ImportViewport`
panel-inset plumbing, and the `SANDBOX_BOUNDS` fallback. KML/GeoJSON
parsing already produces raw `LatLng[]` as its intermediate representation
(`RawShape.latLngs`); post-migration that IS the final geometry. What
remains of the projection pass is ring-closure dedup and min-vertex
validation. The "imported file lands under the docked panel" problem the
safe-area hack solves becomes a *camera* concern: fly the camera to the
imported bbox instead of distorting the geometry to fit the visible
strip. [contract — read from code]

---

## 3. Interaction model (how `useGeoDraw` survives)

`useGeoDraw` (~1,137 lines) is coordinate-system-agnostic in a useful way:
it never sees pixels — the canvas converts pointer events to normalized
points before calling in (its own header says so). That boundary is where
the migration happens; the state machine (draft lifecycle, selection,
undo/redo stacks, transaction depth, z-order) survives unchanged.
[contract — read from code]

- **Capture stays in screen space; commit converts to world space.**
  During a draft, pointer positions are picked to ground per placed vertex
  (one `pickPosition`/`globe.pick` per click — cheap; observed
  interactively without perceptible lag on all three scenes). Freehand is
  the one tool that picks per pointer-move; if that proves costly on
  photoreal tiles, capture freehand in screen space and batch-convert on
  pointer-up (N picks once). [observed for click-tools; freehand cost is
  contract-level speculation, flagged as such]
- **The generic-type option**: `useGeoDraw`'s handlers take `Vec2`; the
  hook's transform math (translate/scale/rotate about anchors) is the part
  that must become geodesy-aware (§2). Practical route: keep the hook's
  drag state machine, swap its geometry helpers for the local-tangent
  versions, and have the hosting canvas hand it `{lat, lon}` from picks
  instead of normalized points — this keeps all ~1,100 lines of
  lifecycle/undo/selection logic intact.
- **Which interactions need per-frame reprojection**: only *rendered
  chrome positions* — vertex handles, the rotate handle, the selection
  bbox, labels — and only while a shape is selected or a camera move is in
  flight. Reuse the `preRender` + `cartesianToCanvasCoordinates` loop that
  already positions `htmlMarkers` (that loop only runs when a frame
  renders, so it is free at idle under request-render mode). The drag
  *math* itself does not need per-frame reprojection: a body-drag is
  "pick the ground under the pointer, translate all vertices by the
  lat/lon delta". [contract — pattern read from `CesiumMap.tsx:926-993`]
- **Edge-panning during draw** already exists as a solved problem
  (`panVelocity` prop on `CesiumMap`); world-space drafts make it *better*
  because the draft doesn't distort when the camera slides. [contract]

---

## 4. Render-mode budget

Reference point: `plans/001-cap-cesium-render-loops.md` documents that
uncapped per-frame `requestRender()` loops peg the GPU process; anything
this feature adds must not create a new always-on loop.

Observed in the prototype (viewer with `requestRenderMode: true`,
`maximumRenderTimeChange: Infinity`, both rendering approaches live, shapes
committed):

- **Idle: 0 renders/s** — postRender counter stayed at zero across
  multi-second idle windows on both the flat and photoreal scenes. Neither
  native clamped entities nor the (static) SVG overlay defeats
  request-render mode at rest. [observed]
- **During camera movement**: postRender count == `camera.changed` count
  == SVG re-projection passes, 1:1:1 (at the environment's throttled tick
  rate — absolute Hz unverifiable here, see preamble). The overlay's
  `camera.changed` listener adds **no** scene renders (it never calls
  `requestRender`); its cost is one React commit per fired event.
  [observed ratio; absolute rate unverified]
- The prototype set `camera.percentageChanged = 0.001` to make the overlay
  track tightly; at that threshold `camera.changed` fires on essentially
  every rendered frame of a camera move, so on a 120 Hz display the pure
  screen-space approach implies ~120 React commits/s while panning.
  [contract — rate extrapolated, not observed at native refresh]
- **Native-entity edit cost**: ground-clamped geometry re-tessellates when
  its positions change (the repo already documents this trade-off for
  clamped polylines — `CesiumMap.tsx:1522-1533`). For map-draw this cost
  lands once per committed edit, not per frame. During a vertex drag,
  either update a `ConstantProperty` per move (re-tessellating a single
  shape at pointer-move rate — bounded, but worth measuring in the real
  build) or drag a lightweight non-clamped preview and re-clamp on
  release. [contract]

Bottom line for the budget: the hybrid keeps the scene fully idle at rest,
piggybacks chrome repositioning on frames Cesium was already rendering,
and adds zero rAF loops — consistent with plan 001's direction.

---

## 5. Open questions for the maintainer

1. **Altitude semantics for zones/lines.** Recommendation: clamp
   everything to ground by default; treat `zoneParams.altitudeMin/Max` (No
   Fly) as a *rendering upgrade* later — extruded polygon volumes
   (`height`/`extrudedHeight`, the same pair `CesiumMap.tsx:1396-1401`
   already uses for threat corridors) — rather than per-vertex altitude.
   Per-vertex altitude complicates every interaction for a use case
   (draped operational zones) that doesn't need it.
2. **What should a click on a building mean on photoreal tiles?**
   `pickPosition` returns the roof/wall point (observed, h=854 m vs
   716 m terrain). For zone-drawing, the *plan-view footprint* is usually
   the intent, and a roof-height vertex clamps to the same footprint
   anyway under the clamp-everything model — but the recorded lat/lon is
   the roof's, which on a tilted view is horizontally offset from where
   the building meets the ground (~370 m in the observed click).
   Recommendation: accept `pickPosition` for MVP (it matches what the user
   pointed at); if operators complain about roof-skew, add a
   "drape to terrain" refinement pass using `globe.pick` at commit time.
3. **Circle: geodesic or screen-round?** Recommendation: geodesic
   (`center + radiusM`, foreshortens under tilt) — a zone radius is a
   physical quantity, and it matches the existing coverage-ring rendering.
   The cost: the on-screen "circle" flattens at low camera angles, a
   deliberate visual change from today's screen-round behavior.
4. **What do "arrow" and "curve" mean geodesically?** Both are polylines
   with decoration today. Recommendation: store control vertices as
   geographic points; tessellate the curve (and the arrowhead triangle) in
   a local tangent plane at render time, emit as a dense clamped polyline
   (+small polygon for the head). Cesium has no native curve/arrow
   primitive, so this is app-side tessellation either way. [contract]
5. **Freehand density.** Screen-space freehand at world scale produces
   very dense vertex chains whose clamped re-tessellation cost is
   unmeasured. Recommendation: simplify (Douglas-Peucker in the tangent
   plane) at commit; tune epsilon against real drawings in the build.
6. **2D / Columbus-view behavior.** The production tactical map exposes
   2D/2.5D/3D modes. The spike only observed SCENE3D. `pickPosition` is
   gated on `SceneMode.SCENE3D` in the repo's own picker and the fallbacks
   cover 2D [contract — read from `CesiumMap.tsx:336-345`]; native
   entities render in all modes. Flagged because it was NOT observed.
7. **Export sequencing.** Plan 014's maintenance notes already state it:
   export/persistence should land *after* anchoring — exporting today's
   screen-space coordinates as KML/GeoJSON would fabricate geography
   (imported files round-trip only via the `sourceBounds` crutch).
   Recommendation: hold export until shapes are natively geographic, then
   it is a ~trivial serializer.
8. **Migration of existing in-session shapes**: none needed — shapes have
   no persistence (React state only, confirmed in `useGeoDraw.ts`), so
   there is no stored data to migrate. [contract — read]

---

## 6. Effort estimate for the production build

Consistent with the plan's "L" rating. Stages sized for one engineer who
knows the codebase; each stage leaves the app shippable:

| Stage | Work | Size |
|---|---|---|
| 1. Geographic data model | `GeoShape.points` → `{lat,lon}[]`, circle → center+radius, delete `sourceBounds`/clamp helpers, swap transform helpers for tangent-plane versions, update `imports.ts` (deletion-heavy) + panel coordinate readout | 3–4 days |
| 2. Native rendering layer | A `MapDrawEntities` adapter that renders `GeoShape[]` as clamped Cesium entities (polygon + clamped outline ring, clamped polyline, ellipse, billboard/point), styled from the existing zone-type registry; fingerprint-based updates following the existing `CesiumMap` polyline pattern | 4–5 days |
| 3. Capture/commit pipeline | Pointer→pick per vertex, draft preview entity, sky-click tolerance, freehand batch-convert + simplify | 2–3 days |
| 4. Selection & transform chrome | World-anchored handles re-projected via the existing `preRender` loop; body/vertex/scale/rotate drags in tangent-plane math; the riskiest stage (interaction feel) | 4–5 days |
| 5. Integration & retirement | Wire into `MapDrawOverlay`/`MapDrawProvider` surface area, keep the panel contract, delete the screen-space painting path, 2D/2.5D verification (open question 6) | 3–4 days |
| 6. Perf validation | Verify idle-zero renders on the Dashboard map, measure drag re-tessellation, freehand density tuning | 1–2 days |

Total ≈ **17–23 working days (~3.5–4.5 weeks)**. The estimate assumes the
map-draw production files are stable when the build starts (they are under
active development at the time of this spike — the plan's out-of-scope
warning).

---

## Appendix: prototype notes

- Route: `/geo-anchor-spike` (DEV-gated in `App.tsx`, tree-shaken from
  production; `pnpm build` exits 0 with the route in place — verified).
- The three scene presets rebuild the viewer wholesale; shapes reset on
  preset switch by design.
- Instrumentation: `postRender` counter, `camera.changed` counter, SVG
  re-projection pass counter, surfaced in the on-screen stats strip.
- Every click logs all three pickers side by side in the on-screen pick
  log; the excerpts in §1 are copied from it verbatim.
- Environment caveats: automation browser rAF-throttled (~2–3/s), so
  smoothness and absolute frame rates were not assessable; `pnpm dev`
  ran with a valid `VITE_CESIUM_ION_TOKEN`, so terrain and photoreal
  questions WERE answerable (the flat-raster fallback was not needed).
