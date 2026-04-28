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
| **Batch 1** (this branch family) | 0 → 3 | Skeleton + toggle + static markers + icons + state styling + click/hover/menu |
| Batch 2 | 4 → 6 | FOV + coverage + animations + camera control |
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

## Phase 1 — Static markers  *(in progress)*

Render every map element as a Cesium entity with the correct lat/lon. Visual styling minimal; verify count + position + the parsing of every data shape.

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| Detection targets | ✓ | ⏳ | Coordinates parsed from `Detection.coordinates` ("lat, lon" string). Code shipped. |
| Camera assets (`CAMERA_ASSETS`) | ✓ | ⏳ | Pulled from `TacticalMap` registry. Code shipped. |
| Radar assets (`RADAR_ASSETS`) | ✓ | ⏳ | Code shipped. |
| Drone-hive assets (`DRONE_HIVE_ASSETS`) | ✓ | ⏳ | Code shipped. |
| Lidar assets (`LIDAR_ASSETS`) | ✓ | ⏳ | Code shipped. |
| Launcher assets (`LAUNCHER_ASSETS`) | ✓ | ⏳ | Code shipped. |
| Weapon-system assets (`WEAPON_SYSTEM_ASSETS`) | ✓ | ⏳ | Code shipped. |
| Regulus effectors (prop, fallback to module default) | ✓ | ⏳ | Code shipped. |
| Friendly drones (prop) | ✓ | ⏳ | Code shipped. |
| Launcher effectors (prop) | ✓ | ⏳ | Code shipped. |

### Known blocker — Cesium mount fails inside Dashboard's `ResizablePanel`

`CesiumMap` mounts cleanly in the styleguide (`/styleguide#cesium-map`) but throws inside the dashboard's `ResizablePanel` ancestor when `?map=cesium` is set. React's error boundary swallows the underlying exception; the only diagnostic that surfaces is `TypeError: Cannot read properties of undefined (reading 'scene')` from inside `Cesium.Viewer.imageryLayers`. A guard against `viewer.isDestroyed()` was added — same crash persists, suggesting the viewer is mid-construction when the destroy fires.

Likely root cause:
- React 18 `StrictMode` double-mounts the component in development; the first mount creates a Cesium viewer in a `ResizablePanel`-controlled container that is briefly `0×0`. The viewer's WebGL context fails to initialize, but the constructor doesn't throw — instead it returns a "half-built" viewer whose getters access undefined internals.
- Cleanup of mount #1 then collides with construction of mount #2 in the same container DOM.

Suggested next steps (Phase 1 continuation, separate PR):
1. Wrap `new Cesium.Viewer(...)` in a try/catch and surface the actual error to the console.
2. Defer viewer construction until `containerRef.current.clientWidth > 0` (use a `ResizeObserver`).
3. Wrap `<CesiumMap>` in an error boundary with a useful fallback so the rest of the dashboard stays functional.
4. Add `key={IS_CESIUM ? 'cesium' : 'mapbox'}` to the `MapComponent` JSX so React fully unmounts on toggle (already the case at page-load since toggle reads once; this would only matter if we ever support live switching).
5. If StrictMode is the trigger, evaluate disabling StrictMode for the map subtree (or, better, fix the underlying ordering bug).

## Phase 2 — Marker icons + state-driven styling

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| Custom SVG icons via `MapIcons.tsx` (DroneIcon, MissileIcon, etc.) | ✓ | ✗ | Render as Cesium billboards via canvas (or DOM-overlay for crisp Hebrew labels). |
| Threat-accent rings (idle / suspicion / detection / tracking / mitigating / active / resolved / expired) | ✓ | ✗ | Reuse `markerStyles.ts`. |
| Heading rotation on drones / missiles | ✓ | ✗ | |
| Affiliation palettes (hostile / friendly / unknown) | ✓ | ✗ | |
| `selectedAssetId` highlight | ✓ | ✗ | |
| `hoveredTargetIdFromCard` highlight | ✓ | ✗ | |
| `hoveredSensorIdFromCard` flash | ✓ | ✗ | |
| `offlineAssetIds` dimming | ✓ | ✗ | |
| `isNew` arrival pulse | ✓ | ✗ | |

## Phase 3 — Hover, click, context menu

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| Marker hover state + tooltip | ✓ | ✗ | |
| `onMarkerClick(targetId)` | ✓ | ✗ | |
| `onAssetClick(assetId)` | ✓ | ✗ | |
| Right-click context menu (target: open-card / mitigate / mitigate-all / dismiss / track / investigate) | ✓ | ✗ | DOM overlay anchored to scene coords. |
| Right-click context menu (sensor: view-feed) | ✓ | ✗ | |
| Card-hover → marker highlight bridge | ✓ | ✗ | Driven by `hoveredTargetIdFromCard`. |

---

## Phase 4 — FOV + coverage *(Batch 2)*

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| Camera FOV cone (sector polygon) | ✓ | ✗ | `CesiumMap` already supports `fov` on a marker. |
| Lidar FOV cone | ✓ | ✗ | |
| Radar surveillance area | ✓ | ✗ | |
| ECM coverage ring (Regulus effectors) | ✓ | ✗ | `CesiumMap` already supports `coverageRadiusM`. |
| Highlighted-sensor FOV state | ✓ | ✗ | |
| FOV color-by-sensor-mode (day / thermal) | ✓ | ✗ | |

## Phase 5 — Track + path animations

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| Drone-deployment trail + smooth heading | ✓ | ✗ | Try `SampledPositionProperty`; CZML if shape allows. |
| Mission-route drone animation along waypoints | ✓ | ✗ | |
| Missile launch animation + phase changes (planning → launched → terminal → BDA) | ✓ | ✗ | |
| Engagement-line dashed animation between target + effector | ✓ | ✗ | |
| New-arrival pulse | ✓ | ✗ | |
| Jamming verification overlay (4.5 s sweep) | ✓ | ✗ | |

## Phase 6 — Camera control

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| `focusCoords` smooth pan | ✓ | ✗ | |
| `smoothFocusRequest` (pan without zoom) | ✓ | ✗ | |
| `fitBoundsPoints` | ✓ | ✗ | |
| `cameraLookAtRequest` (camera FOV animates to target) | ✓ | ✗ | |
| `sensorFocusId` flyTo + flicker | ✓ | ✗ | |
| Bearing on flyTo | ✓ | ✗ | |
| Manual zoom / pan / rotate | ✓ | ✗ | Cesium gives this for free. |

---

## Phase 7 — Edge cases + performance *(Batch 3)*

| Capability | Mapbox | Cesium | Notes |
|---|---|---|---|
| `controlIndicator` overlay | ✓ | ✗ | |
| `planningMode` click-to-add waypoints | ✓ | ✗ | |
| `planningScanViz` camera scan visualization | ✓ | ✗ | |
| `selectedEffectorIds` per-target effector highlight | ✓ | ✗ | |
| `selectedLauncherIds` per-target launcher highlight | ✓ | ✗ | |
| `pathFinderConnectedId` Starling drone connect state | ✓ | ✗ | |
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
