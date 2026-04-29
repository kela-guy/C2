# Cesium parity matrix

Goal: replace the Mapbox-based `TacticalMap` with `CesiumTacticalMap` and validate every existing capability lands intact. The two components share the same public API (`TacticalMapProps` from `src/app/components/TacticalMap.tsx`); the active backend is chosen at runtime via the `?map=cesium` URL parameter.

**Toggle:** append `?map=cesium` to any dashboard URL to load the Cesium backend. Default is Mapbox. Read once on page load — switching requires a refresh.

## Status legend

- `✓` — implemented and verified to match Mapbox visually + behaviorally
- `⏳` — implemented but not yet verified
- `✗` — not yet implemented
- `⚠` — implemented with a known gap vs Mapbox (note in row)
- `🚫` — gap that we have decided to accept (Mapbox-only)

## Phase plan

| Batch PR | Phases | Scope |
|---|---|---|
| **Batch 1** | 0 → 3 | Skeleton + toggle + static markers + icons + state styling + click/hover/menu |
| **Batch 2** (this branch family) | 4 → 6 | FOV + coverage + animations + camera control |
| Batch 3 | 7 → 9 | Edge cases + perf + cutover + Mapbox removal |

---

## Phase 0 — Infra + skeleton  *(this PR)*

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| `TacticalMapProps` exported and shared between both components | ✓ | ✓ | `export interface TacticalMapProps` in `TacticalMap.tsx`; `CesiumTacticalMap` imports it. |
| `?map=cesium` URL toggle | ✓ | ✓ | `src/lib/mapBackend.ts` reads once on load. |
| Cesium component mounts cleanly with the same props as Mapbox | ✓ | ✓ | Phase-indicator pill rendered top-left. |
| Bing Aerial imagery via Cesium Ion | ✓ | ✓ | Asset id `2`. Token from `VITE_CESIUM_ION_TOKEN`. |
| Default camera centered on Israel | ✓ | ✓ | `lat 32.466, lon 35.005, height 12 km`. |
| Targets parsed from `Detection.coordinates` and rendered as plain pins | ✓ | ⏳ | First 50 targets shown as red dots. Replaced by Phase 2 with proper icons. |

---

## Phase 1 — Static markers  *(complete)*

Render every map element as a Cesium entity with the correct lat/lon. Visual styling minimal; verify count + position + the parsing of every data shape.

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| Detection targets | ✓ | ✓ | Coordinates parsed from `Detection.coordinates`. Hostile affiliation; state from `Detection.status`. |
| Camera assets (`CAMERA_ASSETS`) | ✓ | ✓ | Friendly affiliation. Real `<CameraIcon>` inside `<MapMarker>`. |
| Radar assets (`RADAR_ASSETS`) | ✓ | ✓ | Friendly. `<RadarIcon>`. |
| Drone-hive assets (`DRONE_HIVE_ASSETS`) | ✓ | ✓ | Friendly. `<DroneHiveIcon>`. |
| Lidar assets (`LIDAR_ASSETS`) | ✓ | ✓ | Friendly. `<LidarIcon>`. |
| Launcher assets (`LAUNCHER_ASSETS`) | ✓ | ✓ | Friendly. `<LauncherIcon>` at 40 px. |
| Weapon-system assets (`WEAPON_SYSTEM_ASSETS`) | ✓ | ✓ | Friendly. `<LauncherIcon>` at 40 px. |
| Regulus effectors (prop, fallback to module default) | ✓ | ✓ | Friendly with `'jammer'` interaction state. |
| Friendly drones (prop) | ✓ | ✓ | Friendly. `<DroneIcon>` rotates by `headingDeg`. |
| Launcher effectors (prop) | ✓ | ✓ | Friendly. Deduped against `LAUNCHER_ASSETS`. |

### Mount blocker — resolved

`CesiumMap` previously crashed inside the dashboard's `ResizablePanel` (cryptic `TypeError: Cannot read properties of undefined (reading 'scene')`). Triage found the root cause: the `ResizablePanel` ancestor briefly measures `0×0` during initial layout, Cesium's WebGL context fails to initialize on a zero-sized container, and the resulting "half-built" viewer (no `_cesiumWidget`) explodes on the first public-getter access. **StrictMode was a red herring** — there's no `<StrictMode>` anywhere in the bootstrap.

Fixed by:
1. Adding a `mountReady` gate in `CesiumMap.tsx` that defers `new Cesium.Viewer(...)` until the container is `> 8×8 px` (mirrors Mapbox's pattern in `TacticalMap.tsx`).
2. Wrapping the `Viewer` constructor in `try/catch` so any future construction failure surfaces a real error instead of cascading through React.
3. Calling `viewer.scene.requestRender()` from the same `ResizeObserver` that drives the gate, so the canvas redraws cleanly when the user drags the resize handle.
4. Adding `CesiumErrorBoundary` around the dashboard's Cesium branch only — Mapbox keeps its existing error semantics. Fallback UI offers a one-click "reload with Mapbox" link.

## Phase 2 — Marker icons + state-driven styling  *(complete)*

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| Custom SVG icons via `MapIcons.tsx` / `TacticalMap` | ✓ | ✓ | Rendered as DOM overlay through new `htmlMarkers` prop on `CesiumMap`. Cesium's `preRender` event projects each marker's Cartesian to canvas coords every frame. |
| Threat-accent rings via `markerStyles.ts` | ✓ | ✓ | Reuses `<MapMarker>` primitive with `resolveMarkerStyle(state, affiliation)`. |
| Heading rotation on drones | ✓ | ✓ | `friendlyDrones[].headingDeg` passes through to `<DroneIcon rotationDeg=...>` and `<MapMarker heading=...>`. |
| Affiliation palettes (hostile / friendly) | ✓ | ✓ | Targets default to hostile; assets default to friendly. |
| `selectedAssetId` highlight | ✓ | ✓ | Sets `state='selected'` and bumps zIndex. |
| `hoveredTargetIdFromCard` highlight | ✓ | ✓ | Sets `state='hovered'` + label + pulse. |
| `hoveredSensorIdFromCard` flash | ✓ | ✓ | Same — pulse + label visible. |
| `offlineAssetIds` dimming | ✓ | ✓ | Sets `state='disabled'` (`MarkerStyle` greys out). |
| `isNew` arrival pulse | ✓ | ✓ | Detection.isNew triggers `<MapMarker pulse>`. Wired in Phase 5. |
| Heading rotation on missiles | ✓ | ✗ | No live missiles in `targets` yet — wires up alongside missile launch animations in Phase 5. |

## Phase 3 — Hover, click, context menu  *(complete)*

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| Marker hover state + tooltip | ✓ | ✓ | Native DOM `onMouseEnter` / `onMouseLeave` on each `htmlMarker`; `<MapMarker>` renders the pulse + label. |
| `onMarkerClick(targetId)` | ✓ | ✓ | DOM `onClick` fires the prop directly; ref kept fresh so memoisation never staleness. |
| `onAssetClick(assetId)` | ✓ | ✓ | Same pattern — DOM click on asset markers. |
| Right-click context menu (target: open-card / mitigate / mitigate-all / dismiss / track / investigate) | ✓ | ✓ | New `CesiumContextMenu` component renders at `(clientX, clientY)` and dispatches the existing `onContextMenuAction(action, 'target', id)`. |
| Right-click context menu (sensor: view-feed) | ✓ | ✓ | Same component handles both; sensor menu shows just the "view feed" action. |
| Card-hover → marker highlight bridge | ✓ | ✓ | `hoveredTargetIdFromCard` + `hoveredSensorIdFromCard` drive `state='hovered'` on the matching marker. |

---

## Phase 4 — FOV + coverage  *(complete)*

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| Camera FOV cone (sector polygon) | ✓ | ✓ | Terrain-clamped `Polygon` from `buildSectorPositions(...)`. Driven by `htmlMarkers[].fov`. |
| Lidar FOV cone | ✓ | ✓ | Same path — sensor-type-agnostic. |
| Radar surveillance area | ✓ | ✓ | Same path; widthDeg of 360 supported for omni radars. |
| ECM coverage ring (Regulus effectors) | ✓ | ✓ | Terrain-clamped `Ellipse` from `htmlMarkers[].coverageRadiusM`. Brightens to green when actively jamming. |
| Highlighted-sensor FOV state | ✓ | ✓ | `highlightedSensorIds` raises FOV opacity from 0.18 → 0.35. |
| FOV color-by-sensor-mode (day / thermal) | ✓ | ⚠ | Single cyan colour for all FOVs; per-sensor day/thermal colour deferred to Phase 7 polish. |

## Phase 5 — Track + path animations  *(complete)*

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| Drone-deployment trail + smooth heading | ✓ | ✓ | `activeDrone.trail` rendered as a white clamped polyline; heading already drives `<DroneIcon>` rotation. |
| Mission-route drone animation along waypoints | ✓ | ✓ | `missionRoute.trail` = solid cyan polyline of completed segments; `missionRoute.waypoints` = dashed cyan polyline of planned legs. |
| Missile launch animation + phase changes (planning → launched → terminal → BDA) | ✓ | ✗ | No live missiles in `targets` yet — covered alongside Mapbox-equivalent animation in Phase 7. |
| Engagement-line dashed animation between target + effector | ✓ | ✓ | Dashed green polyline between `jammingJammerAssetId` effector and `jammingTargetId` target, driven by `Cesium.PolylineDashMaterialProperty`. |
| New-arrival pulse | ✓ | ✓ | `Detection.isNew` flips `<MapMarker pulse>` on the target marker. |
| Jamming verification overlay (4.5 s sweep) | ✓ | ✗ | Camera-side overlay; not exercised in current scenarios — punt to Phase 7. |

## Phase 6 — Camera control  *(complete)*

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| `focusCoords` smooth pan | ✓ | ✓ | Maps to `flyTo` with 5 km frustum (≈ Mapbox zoom 15). |
| `smoothFocusRequest` (pan without zoom) | ✓ | ✓ | `flyTo` at 30 km frustum (city-view scale). |
| `fitBoundsPoints` | ✓ | ✓ | Centroid + max(latSpan, lonSpan·cos(lat)) × 1.5 padding. |
| `cameraLookAtRequest` (camera FOV animates to target) | ✓ | ⚠ | Bearing-anim FOV deferred — Phase 7 polish; current pass uses static FOV cones. |
| `sensorFocusId` flyTo + flicker | ✓ | ✓ | `flyTo` at 4 km frustum. Flicker is a marker-side animation — out of scope for camera. |
| Bearing on flyTo | ✓ | ✗ | Optional Cesium camera roll/heading; not requested by current scenarios. |
| Manual zoom / pan / rotate | ✓ | ✓ | Cesium native input. |

---

## Phase 7 — Edge cases + performance *(Batch 3)*

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| `controlIndicator` overlay | ✓ | ✓ | "אתה בשליטה" emerald pill at top-centre — same palette + 3 s pulse as Mapbox. `CesiumTacticalMap.tsx:963-979`. |
| `planningMode` click-to-add waypoints | ✓ | 🚫 | Dropped from Cesium scope — drone-mission waypoint authoring stays Mapbox-only for now. |
| `planningScanViz` camera scan visualization | ✓ | ✗ | |
| `selectedEffectorIds` per-target effector highlight | ✓ | ✓ | Consumed by `engagementPair` (`CesiumTacticalMap.tsx:292`); the engagement line shifts to the user-picked Regulus, and the chosen marker gets `state='selected'` via `isEngagementEffector`. Mapbox uses the prop the same way (only in `jamPair`). |
| `selectedLauncherIds` per-target launcher highlight | ✓ | ✓ | Consumed by `engagementPair` (`CesiumTacticalMap.tsx:327`); engagement line shifts to user-picked launcher and the marker's `isEngaged` check sets `state='selected'`. |
| `pathFinderConnectedId` Starling drone connect state | ✓ | 🚫 | Dropped from Cesium scope — not pursuing pathfinder/Starling parity. |
| FPS within 10% of Mapbox | ✓ | ✗ | Profile in this phase. |
| No memory leaks across 5 min of interaction | ✓ | ✗ | |
| Bundle size impact | n/a | ✗ | Already +1.3 MB; offset by Phase 9 Mapbox removal. |

## Phase 8 — Cutover

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| Default flips to Cesium; toggle becomes `?map=mapbox` | ✓ | ✗ | One full release on Cesium with rollback. |

## Phase 9 — Mapbox removal

| Capability | Status |
|---|---|
| Delete `TacticalMap.tsx` | ✗ |
| Drop `mapbox-gl` dependency | ✗ |
| Remove `VITE_MAPBOX_TOKEN` from `.env.example` | ✗ |

---

## Verification protocol (rerun after every phase)

1. Open `/?map=mapbox` and `/?map=cesium` side by side.
2. From the simulation menu run each scenario: CUAS Single, CUAS Flow, CUAS Mass Detection.
3. Click through:
   - Open target card → expand each section → click sensor in card (verify marker highlight) → engage / dismiss → close card.
   - Right-click each kind of marker (target, sensor, effector, launcher) → exercise every context-menu action.
   - Drag a camera into the camera viewer panel.
4. Tick the matrix row(s) the phase covers. Open an issue for any divergence — note it in the row's "Notes" column.
5. Side-by-side screenshots / short screen recording attached to the phase PR.
