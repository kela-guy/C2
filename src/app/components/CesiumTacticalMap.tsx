/**
 * CesiumTacticalMap — drop-in replacement for `TacticalMap` powered by CesiumJS.
 *
 * Mounts in `Dashboard` when the URL contains `?map=cesium`. Default is still
 * Mapbox (`TacticalMap`).
 *
 * **Batch 2 (this revision) — Phases 4 → 6:**
 *   - Phase 4: terrain-clamped FOV cones for cameras / radars / lidars and
 *     ECM coverage rings around Regulus effectors. Highlighted-sensor FOVs
 *     brighten via the `highlightedSensorIds` prop.
 *   - Phase 5: drone trails (active deployment, mission route, friendly
 *     drones), classified target tracks, and a dashed engagement line
 *     between the active jammer + its target. New-arrival pulse on
 *     `Detection.isNew`.
 *   - Phase 6: imperative camera control through `focusCoords`,
 *     `smoothFocusRequest`, `fitBoundsPoints`, and `sensorFocusId` —
 *     each routed to `CesiumMap.flyTo` with appropriate frustum extents.
 *
 * Anything still pending is tracked in `docs/cesium-parity.md`.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CesiumMap,
  type CesiumHtmlMarker,
  type CesiumMapFlyTo,
  type CesiumPolyline,
  MapMarker,
  resolveMarkerStyle,
  type Affiliation,
  type InteractionState,
} from '@/primitives';
import {
  CAMERA_ASSETS,
  RADAR_ASSETS,
  DRONE_HIVE_ASSETS,
  LIDAR_ASSETS,
  WEAPON_SYSTEM_ASSETS,
  LAUNCHER_ASSETS,
  REGULUS_EFFECTORS,
  CameraIcon,
  RadarIcon,
  LidarIcon,
  DroneHiveIcon,
  LauncherIcon,
  SensorIcon,
  DroneIcon,
  FOV_RADIUS_M,
} from './TacticalMap';
import type { TacticalMapProps, MapAsset } from './TacticalMap';
import type { Detection } from '@/imports/ListOfSystems';

const CESIUM_ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined) ?? '';

/** 2D scene "height" is orthographic frustum extent. 80 km gives a city view. */
const DEFAULT_INITIAL_VIEW = { lat: 32.466, lon: 35.005, heightM: 80_000 };

/** Pixel size for the SVG icon inside each MapMarker shell. */
const SENSOR_SURFACE = 36;
const TARGET_SURFACE = 40;

/**
 * Map a `Detection.status` onto an `InteractionState` so we can reuse the
 * existing `markerStyles.ts` palette. Mirrors the pairing the Mapbox map uses.
 */
function detectionInteractionState(d: Detection): InteractionState {
  switch (d.status) {
    case 'tracking':
      return 'active';
    case 'event':
    case 'event_neutralized':
    case 'event_resolved':
      return 'alert';
    case 'expired':
      return 'expired';
    case 'suspicion':
      return 'default';
    case 'detection':
    default:
      return 'default';
  }
}

/**
 * Right-click context-menu state. Mirrors what TacticalMap's Mapbox
 * implementation feeds back through `onContextMenuAction`.
 */
type ContextMenuState = {
  x: number;
  y: number;
  elementType: 'target' | 'sensor' | 'effector';
  elementId: string;
};

export function CesiumTacticalMap({
  targets,
  activeTargetId,
  hoveredTargetIdFromCard,
  hoveredSensorIdFromCard,
  highlightedSensorIds,
  selectedAssetId,
  offlineAssetIds,
  regulusEffectors,
  friendlyDrones,
  launcherEffectors,
  jammingTargetId,
  jammingJammerAssetId,
  activeDrone,
  missionRoute,
  focusCoords,
  smoothFocusRequest,
  fitBoundsPoints,
  sensorFocusId,
  onMarkerClick,
  onAssetClick,
  onContextMenuAction,
}: TacticalMapProps) {
  const offlineSet = useMemo(() => new Set(offlineAssetIds ?? []), [offlineAssetIds]);
  const highlightedSensorSet = useMemo(
    () => new Set(highlightedSensorIds ?? []),
    [highlightedSensorIds],
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  // Tracks which marker the cursor is currently over (DOM-level hover).
  // Drives the white-on-hover ring + tooltip visibility regardless of
  // whether the hover came from this map or from the card sidebar.
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  // Stable callbacks, used inside memoised marker arrays.
  const onMarkerClickRef = useRef(onMarkerClick);
  const onAssetClickRef = useRef(onAssetClick);
  const onContextMenuActionRef = useRef(onContextMenuAction);
  onMarkerClickRef.current = onMarkerClick;
  onAssetClickRef.current = onAssetClick;
  onContextMenuActionRef.current = onContextMenuAction;

  const openContextMenu = useCallback(
    (e: React.MouseEvent, elementType: ContextMenuState['elementType'], elementId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, elementType, elementId });
    },
    [],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const fireContextAction = useCallback(
    (action: string) => {
      if (!contextMenu) return;
      onContextMenuActionRef.current?.(action, contextMenu.elementType, contextMenu.elementId);
      setContextMenu(null);
    },
    [contextMenu],
  );

  /**
   * Compose every asset registry + every dynamic prop into a single
   * `htmlMarkers[]`. Each entry pairs a geographic position with a React
   * node — usually a `<MapMarker>` SVG. Cesium's per-frame loop projects
   * the position to canvas coords; React handles the rest.
   *
   * Dedupe by id (LAUNCHER_ASSETS + launcherEffectors prop overlap).
   */
  const htmlMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    const out: CesiumHtmlMarker[] = [];
    const seen = new Set<string>();

    /** Helper for friendly assets (cameras / radars / lidars / hives / weapons / launchers). */
    const pushFriendlyAsset = (
      id: string,
      lat: number,
      lon: number,
      icon: ReactNode,
      label: string,
      surfaceSize: number = SENSOR_SURFACE,
      fov?: { rangeM: number; bearingDeg: number; widthDeg: number },
    ) => {
      if (seen.has(id)) return;
      seen.add(id);
      const isOffline = offlineSet.has(id);
      const isSelected = selectedAssetId === id;
      const isHoveredFromCard = hoveredSensorIdFromCard === id;
      const isHoveredOnMap = hoveredMarkerId === id;
      const isHighlighted = highlightedSensorSet.has(id);
      const isHovered = isHoveredFromCard || isHoveredOnMap;
      const affiliation: Affiliation = 'friendly';
      const state: InteractionState = isOffline
        ? 'disabled'
        : isHovered
          ? 'hovered'
          : isSelected
            ? 'selected'
            : 'default';
      const style = resolveMarkerStyle(state, affiliation);

      // FOV brightens when this sensor is highlighted from the active target's
      // sensor list (matches Mapbox's `highlightedSensorIds` semantics).
      const fovOpacity = isHighlighted ? 0.35 : 0.18;
      const fovColor = isOffline ? '#71717a' : '#22b8cf';

      out.push({
        id,
        lat,
        lon,
        zIndex: isHovered ? 40 : isSelected ? 30 : 10,
        content: (
          <MapMarker
            icon={icon}
            style={style}
            surfaceSize={surfaceSize}
            label={label}
            showLabel={isHovered || isSelected}
            pulse={isHovered || isSelected}
          />
        ),
        fov: fov && !isOffline
          ? { rangeM: fov.rangeM, bearingDeg: fov.bearingDeg, widthDeg: fov.widthDeg, color: fovColor, opacity: fovOpacity }
          : undefined,
        onClick: () => onAssetClickRef.current?.(id),
        onContextMenu: (e) => openContextMenu(e, 'sensor', id),
        onMouseEnter: () => setHoveredMarkerId(id),
        onMouseLeave: () => setHoveredMarkerId((current) => (current === id ? null : current)),
      });
    };

    /** Map a sensor asset to its Phase-4 FOV definition. */
    const sensorFov = (asset: MapAsset) => ({
      rangeM: FOV_RADIUS_M,
      bearingDeg: asset.bearingDeg,
      widthDeg: asset.fovDeg,
    });

    // Targets — hostile by default, state from `Detection.status`.
    if (targets) {
      for (const t of targets) {
        const [lat, lon] = (t.coordinates ?? '').split(',').map((s) => parseFloat(s.trim()));
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        const isActive = activeTargetId === t.id;
        const isHoveredFromCard = hoveredTargetIdFromCard === t.id;
        const isHoveredOnMap = hoveredMarkerId === t.id;
        const isHovered = isHoveredFromCard || isHoveredOnMap;
        const baseState = detectionInteractionState(t);
        const state: InteractionState = isHovered
          ? 'hovered'
          : isActive
            ? 'selected'
            : baseState;
        const style = resolveMarkerStyle(state, 'hostile');
        // New-arrival pulse — Detection.isNew triggers a brief animation when
        // a fresh detection lands on the map. Mirrors Mapbox parity (the
        // existing TacticalMap shows `<NewArrivalPulse>` on isNew targets).
        const isNewArrival = t.isNew === true;
        out.push({
          id: t.id,
          lat,
          lon,
          zIndex: isHovered ? 60 : isActive ? 50 : 20,
          content: (
            <MapMarker
              icon={<DroneIcon />}
              style={style}
              surfaceSize={TARGET_SURFACE}
              label={t.name ?? t.id}
              showLabel={isHovered || isActive}
              pulse={isHovered || isActive || isNewArrival}
            />
          ),
          onClick: () => onMarkerClickRef.current?.(t.id),
          onContextMenu: (e) => openContextMenu(e, 'target', t.id),
          onMouseEnter: () => setHoveredMarkerId(t.id),
          onMouseLeave: () => setHoveredMarkerId((current) => (current === t.id ? null : current)),
        });
      }
    }

    // Static asset registries. Sensors (camera / radar / lidar) get an FOV cone.
    for (const a of CAMERA_ASSETS) {
      pushFriendlyAsset(a.id, a.latitude, a.longitude, <CameraIcon />, a.typeLabel, SENSOR_SURFACE, sensorFov(a));
    }
    for (const a of RADAR_ASSETS) {
      pushFriendlyAsset(a.id, a.latitude, a.longitude, <RadarIcon />, a.typeLabel, SENSOR_SURFACE, sensorFov(a));
    }
    for (const a of LIDAR_ASSETS) {
      pushFriendlyAsset(a.id, a.latitude, a.longitude, <LidarIcon />, a.typeLabel, SENSOR_SURFACE, sensorFov(a));
    }
    for (const a of DRONE_HIVE_ASSETS) {
      pushFriendlyAsset(a.id, a.latitude, a.longitude, <DroneHiveIcon />, a.typeLabel);
    }
    for (const a of WEAPON_SYSTEM_ASSETS) {
      pushFriendlyAsset(a.id, a.latitude, a.longitude, <LauncherIcon size={32} />, a.typeLabel, 40);
    }
    for (const l of LAUNCHER_ASSETS) {
      pushFriendlyAsset(l.id, l.latitude, l.longitude, <LauncherIcon size={32} />, l.id, 40);
    }

    // Regulus effectors — friendly assets but treated as effectors for context menu.
    // Default state, only flips to `'jammer'` (green ring + pulse) when this
    // specific Regulus is actively jamming.
    const effectors = regulusEffectors ?? REGULUS_EFFECTORS;
    for (const e of effectors) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      const isJamming = jammingJammerAssetId === e.id;
      const isHoveredFromCard = hoveredSensorIdFromCard === e.id;
      const isHoveredOnMap = hoveredMarkerId === e.id;
      const isHovered = isHoveredFromCard || isHoveredOnMap;
      const state: InteractionState = isHovered
        ? 'hovered'
        : isJamming
          ? 'jammer'
          : 'default';
      const style = resolveMarkerStyle(state, 'friendly');
      out.push({
        id: e.id,
        lat: e.lat,
        lon: e.lon,
        zIndex: isHovered ? 40 : 15,
        content: (
          <MapMarker
            icon={<SensorIcon />}
            style={style}
            surfaceSize={SENSOR_SURFACE}
            label={e.name}
            showLabel={isHovered}
            pulse={isHovered}
          />
        ),
        // ECM coverage ring (terrain-clamped ellipse). Brightens when the
        // effector is actively jamming so it visually matches the active
        // jam state on the marker itself.
        coverageRadiusM: e.coverageRadiusM,
        coverageColor: isJamming ? '#4ade80' : '#22b8cf',
        onClick: () => onAssetClickRef.current?.(e.id),
        onContextMenu: (ev) => openContextMenu(ev, 'effector', e.id),
        onMouseEnter: () => setHoveredMarkerId(e.id),
        onMouseLeave: () => setHoveredMarkerId((current) => (current === e.id ? null : current)),
      });
    }

    // Friendly drones — heading rotation if available.
    if (friendlyDrones) {
      for (const d of friendlyDrones) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        const isHovered = hoveredMarkerId === d.id;
        const state: InteractionState = isHovered ? 'hovered' : 'default';
        const style = resolveMarkerStyle(state, 'friendly');
        out.push({
          id: d.id,
          lat: d.lat,
          lon: d.lon,
          zIndex: isHovered ? 40 : 25,
          content: (
            <MapMarker
              icon={<DroneIcon rotationDeg={d.headingDeg ?? 0} />}
              style={style}
              surfaceSize={SENSOR_SURFACE}
              heading={d.headingDeg}
              label={d.name}
              showLabel={isHovered}
              pulse={isHovered}
            />
          ),
          onClick: () => onAssetClickRef.current?.(d.id),
          onMouseEnter: () => setHoveredMarkerId(d.id),
          onMouseLeave: () => setHoveredMarkerId((current) => (current === d.id ? null : current)),
        });
      }
    }

    // Launcher effectors (dashboard prop) — overlaps LAUNCHER_ASSETS, dedupe applies.
    if (launcherEffectors) {
      for (const l of launcherEffectors) {
        const lat = (l as unknown as { lat?: number }).lat;
        const lon = (l as unknown as { lon?: number }).lon;
        if (typeof lat !== 'number' || typeof lon !== 'number') continue;
        if (seen.has(l.id)) continue;
        seen.add(l.id);
        const isHovered = hoveredMarkerId === l.id;
        const state: InteractionState = isHovered ? 'hovered' : 'default';
        const style = resolveMarkerStyle(state, 'friendly');
        out.push({
          id: l.id,
          lat,
          lon,
          zIndex: isHovered ? 40 : 15,
          content: (
            <MapMarker
              icon={<LauncherIcon size={32} />}
              style={style}
              surfaceSize={40}
              label={(l as unknown as { name?: string }).name ?? l.id}
              showLabel={isHovered}
              pulse={isHovered}
            />
          ),
          onClick: () => onAssetClickRef.current?.(l.id),
          onContextMenu: (e) => openContextMenu(e, 'effector', l.id),
          onMouseEnter: () => setHoveredMarkerId(l.id),
          onMouseLeave: () => setHoveredMarkerId((current) => (current === l.id ? null : current)),
        });
      }
    }

    return out;
  }, [
    targets,
    activeTargetId,
    hoveredTargetIdFromCard,
    hoveredSensorIdFromCard,
    highlightedSensorSet,
    selectedAssetId,
    offlineSet,
    regulusEffectors,
    friendlyDrones,
    launcherEffectors,
    jammingJammerAssetId,
    hoveredMarkerId,
    openContextMenu,
  ]);

  /**
   * Polylines (Phase 5):
   *   - Active drone trail (Flow 3 deployment) — white casing on red.
   *   - Mission route trail (Flow 4) — cyan friendly trail.
   *   - Friendly-drone trails (`friendlyDrones[].trail`) — cyan friendly.
   *   - Classified target trails (`target.trail`) — white hostile trail.
   *   - Engagement line (dashed) — between jammer + jamming target.
   *
   * Trail tuples are `[lat, lon][]` per `TacticalMapProps`. Detection trails
   * use the structured `TrailPoint` shape. Both flatten to the polyline
   * primitive's `{lat, lon}` points.
   */
  const polylines = useMemo<CesiumPolyline[]>(() => {
    const out: CesiumPolyline[] = [];

    const tupleToPoints = (trail: [number, number][]) =>
      trail.map(([lat, lon]) => ({ lat, lon }));

    // Active drone deployment trail (Flow 3).
    if (activeDrone?.trail && activeDrone.trail.length >= 2) {
      out.push({
        id: 'active-drone-trail',
        points: tupleToPoints(activeDrone.trail),
        color: '#ffffff',
        width: 3,
      });
    }

    // Mission route current trail (Flow 4).
    if (missionRoute?.trail && missionRoute.trail.length >= 2) {
      out.push({
        id: 'mission-route-trail',
        points: tupleToPoints(missionRoute.trail),
        color: '#22d3ee',
        width: 3,
      });
    }

    // Mission route waypoints — connect them as a planned line so the user
    // sees the next leg even before the drone has moved there.
    if (missionRoute?.waypoints && missionRoute.waypoints.length >= 2) {
      out.push({
        id: 'mission-route-plan',
        points: missionRoute.waypoints.map((w) => ({ lat: w.lat, lon: w.lon })),
        color: '#22d3ee',
        width: 2,
        dashed: true,
      });
    }

    // Friendly drone trails (PathFinder, Starling, etc.).
    if (friendlyDrones) {
      for (const d of friendlyDrones) {
        if (!d.trail || d.trail.length < 2) continue;
        out.push({
          id: `friendly-drone-${d.id}-trail`,
          points: tupleToPoints(d.trail),
          color: '#22d3ee',
          width: 2,
        });
      }
    }

    // Hostile target trails — only for `classified` entities, matching
    // Mapbox's filter (raw detections don't draw a track).
    if (targets) {
      for (const t of targets) {
        if (t.entityStage !== 'classified') continue;
        if (!t.trail || t.trail.length < 2) continue;
        out.push({
          id: `target-${t.id}-trail`,
          points: t.trail.map((p) => ({ lat: p.lat, lon: p.lon })),
          color: '#ffffff',
          width: 2,
        });
      }
    }

    // Engagement line (dashed) — straight line between the actively-jamming
    // effector and its target. Phase 5's "engagement-line dashed animation".
    if (jammingTargetId && jammingJammerAssetId) {
      const target = targets?.find((t) => t.id === jammingTargetId);
      const effectors = regulusEffectors ?? REGULUS_EFFECTORS;
      const jammer = effectors.find((e) => e.id === jammingJammerAssetId);
      if (target && jammer) {
        const [tLat, tLon] = (target.coordinates ?? '').split(',').map((s) => parseFloat(s.trim()));
        if (Number.isFinite(tLat) && Number.isFinite(tLon)) {
          out.push({
            id: 'jamming-engagement-line',
            points: [
              { lat: jammer.lat, lon: jammer.lon },
              { lat: tLat, lon: tLon },
            ],
            color: '#4ade80',
            width: 3,
            dashed: true,
          });
        }
      }
    }

    return out;
  }, [activeDrone, missionRoute, friendlyDrones, targets, jammingTargetId, jammingJammerAssetId, regulusEffectors]);

  /**
   * Phase 6 — imperative camera control. Each prop is converted into a
   * `CesiumMapFlyTo` request that's passed straight through to the primitive.
   * We pass a NEW object identity each time so the primitive's effect re-runs.
   *
   *   - `focusCoords` — pan-with-zoom to a target's location (city block scale).
   *   - `smoothFocusRequest` — pan without zoom (uses a wider frustum).
   *   - `fitBoundsPoints` — fit camera to cover all points (centroid + span).
   *   - `sensorFocusId` — fly to a specific sensor / effector by id.
   *
   * Heights are in meters and interpreted by Cesium's 2D scene mode as the
   * orthographic frustum extent (i.e. visible diameter).
   */
  const [flyTo, setFlyTo] = useState<CesiumMapFlyTo | null>(null);

  // focusCoords → tight 5 km frustum (≈ Mapbox zoom 15).
  useEffect(() => {
    if (!focusCoords) return;
    setFlyTo({ lat: focusCoords.lat, lon: focusCoords.lon, heightM: 5_000, durationSec: 1.2 });
  }, [focusCoords?.lat, focusCoords?.lon]);

  // smoothFocusRequest → pan without zoom; keep at city-view scale.
  useEffect(() => {
    if (!smoothFocusRequest) return;
    setFlyTo({ lat: smoothFocusRequest.lat, lon: smoothFocusRequest.lon, heightM: 30_000, durationSec: 1.0 });
  }, [smoothFocusRequest?.lat, smoothFocusRequest?.lon]);

  // fitBoundsPoints → centroid + span-derived height with padding.
  useEffect(() => {
    if (!fitBoundsPoints || fitBoundsPoints.length < 2) return;
    const lats = fitBoundsPoints.map((p) => p.lat);
    const lons = fitBoundsPoints.map((p) => p.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    // 1 deg lat ≈ 111 km. Use the larger of lat-span or longitude-span (corrected
    // by cos(lat)) so all points are visible. 1.5× pad.
    const latSpanM = (maxLat - minLat) * 111_000;
    const lonSpanM = (maxLon - minLon) * 111_000 * Math.cos((centerLat * Math.PI) / 180);
    const heightM = Math.max(2_000, Math.max(latSpanM, lonSpanM) * 1.5);
    setFlyTo({ lat: centerLat, lon: centerLon, heightM, durationSec: 1.4 });
  }, [fitBoundsPoints]);

  // sensorFocusId → look up the asset's lat/lon and fly there.
  useEffect(() => {
    if (!sensorFocusId) return;
    const allAssets: { id: string; lat: number; lon: number }[] = [
      ...CAMERA_ASSETS.map((a) => ({ id: a.id, lat: a.latitude, lon: a.longitude })),
      ...RADAR_ASSETS.map((a) => ({ id: a.id, lat: a.latitude, lon: a.longitude })),
      ...LIDAR_ASSETS.map((a) => ({ id: a.id, lat: a.latitude, lon: a.longitude })),
      ...DRONE_HIVE_ASSETS.map((a) => ({ id: a.id, lat: a.latitude, lon: a.longitude })),
      ...WEAPON_SYSTEM_ASSETS.map((a) => ({ id: a.id, lat: a.latitude, lon: a.longitude })),
      ...LAUNCHER_ASSETS.map((a) => ({ id: a.id, lat: a.latitude, lon: a.longitude })),
      ...(regulusEffectors ?? REGULUS_EFFECTORS).map((e) => ({ id: e.id, lat: e.lat, lon: e.lon })),
    ];
    const asset = allAssets.find((a) => a.id === sensorFocusId);
    if (!asset) return;
    setFlyTo({ lat: asset.lat, lon: asset.lon, heightM: 4_000, durationSec: 1.0 });
  }, [sensorFocusId, regulusEffectors]);

  if (!CESIUM_ION_TOKEN) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-300">
        <div className="rounded-md bg-amber-500/10 px-4 py-3 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <strong>Cesium token missing.</strong> Set <code className="font-mono">VITE_CESIUM_ION_TOKEN</code> in <code className="font-mono">.env.local</code> and restart the dev server.
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Phase indicator — physical-left so RTL chrome doesn't bury it. */}
      <div
        className="pointer-events-none absolute top-2 left-2 z-10 rounded-md bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-200 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
        aria-live="polite"
      >
        Cesium backend — Phases 2-6 ({htmlMarkers.length} markers, {polylines.length} lines)
      </div>

      <CesiumMap
        ionToken={CESIUM_ION_TOKEN}
        initialView={DEFAULT_INITIAL_VIEW}
        htmlMarkers={htmlMarkers}
        polylines={polylines}
        flyTo={flyTo}
        sceneMode="2D"
        className="absolute inset-0"
      />

      {contextMenu && (
        <CesiumContextMenu
          state={contextMenu}
          onClose={closeContextMenu}
          onAction={fireContextAction}
        />
      )}
    </div>
  );
}

/**
 * Right-click context menu shown over the Cesium canvas. Action ids match
 * what the existing Mapbox handler in `Dashboard.tsx` looks for in
 * `onContextMenuAction(action, elementType, elementId)`.
 */
function CesiumContextMenu({
  state,
  onClose,
  onAction,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  const items = state.elementType === 'target'
    ? [
        { id: 'open-card', label: 'פתח כרטיס' },
        { id: 'mitigate', label: 'שיבוש' },
        { id: 'mitigate-all', label: 'שיבוש כולל' },
        { id: 'track', label: 'מעקב' },
        { id: 'investigate', label: 'חקירה' },
        { id: 'dismiss', label: 'דחייה' },
      ]
    : state.elementType === 'sensor'
      ? [{ id: 'view-feed', label: 'צפה בהזנה' }]
      : [];

  if (items.length === 0) {
    onClose();
    return null;
  }

  return (
    <>
      {/* Backdrop closes the menu on outside click. */}
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-50 min-w-[160px] rounded-md bg-[#1c1c20] py-1 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(0,0,0,0.5)]"
        style={{ top: state.y, left: state.x }}
        role="menu"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            onClick={() => onAction(item.id)}
            className="block w-full px-3 py-1.5 text-end text-[12px] hover:bg-white/[0.08] focus-visible:bg-white/[0.08] focus-visible:outline-none cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
