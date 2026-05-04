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
  type CesiumSceneMode,
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
} from './tacticalAssets';
import type { MapAsset } from './tacticalAssets';
import {
  CameraIcon,
  RadarIcon,
  LidarIcon,
  DroneHiveIcon,
  LauncherIcon,
  SensorIcon,
  DroneIcon,
} from './tacticalIcons';
import {
  FOV_RADIUS_M,
  DRONE_FOV_RADIUS_M,
  DRONE_FOV_DEG,
  bearingDegrees,
  haversineDistanceM,
} from '@/app/lib/mapGeo';
import { JAM_FLOW, WEAPON_FLOW, resolveNearestAsset, type FlowAsset } from '@/imports/engagementFlows';
import type { Detection, RegulusEffector, LauncherEffector } from '@/imports/ListOfSystems';

/**
 * Props consumed by `<CesiumTacticalMap>`. Inherited from the original
 * `TacticalMapProps` shape but trimmed to only the fields the Cesium
 * implementation actually reads — Mapbox-specific knobs (missile flight,
 * jamming-verification animation, PathFinder, planning click handlers)
 * were removed when the legacy backend was retired.
 */
export interface CesiumTacticalMapProps {
  focusCoords?: { lat: number; lon: number } | null;
  targets?: Detection[];
  activeTargetId?: string | null;
  onMarkerClick?: (targetId: string) => void;
  highlightedSensorIds?: string[];
  hoveredSensorIdFromCard?: string | null;
  jammingTargetId?: string | null;
  jammingJammerAssetId?: string | null;
  /** Show "You have control" indicator on the map. */
  controlIndicator?: boolean;
  /** Fit map to show all these points */
  fitBoundsPoints?: { lat: number; lon: number }[] | null;
  /** Mission route for Flow 4 */
  missionRoute?: {
    waypoints: { lat: number; lon: number; label: string }[];
    droneLat: number; droneLon: number; headingDeg: number;
    currentSegment: number; phase: string; trail: [number, number][];
    loop: boolean;
  } | null;
  /** Active drone deployment for Flow 3 */
  activeDrone?: {
    currentLat: number;
    currentLon: number;
    hiveLat: number;
    hiveLon: number;
    targetLat: number;
    targetLon: number;
    phase: string;
    headingDeg: number;
    trail: [number, number][];
  } | null;
  /** Camera scan visualization during planning */
  planningScanViz?: { cameraLat: number; cameraLon: number; bearings: number[] } | null;
  /** Asset ID currently selected for mission planning */
  selectedAssetId?: string | null;
  /** Regulus effectors state for CUAS */
  regulusEffectors?: RegulusEffector[];
  /** Sensor ID to flyTo and flicker (from card click) */
  sensorFocusId?: string | null;
  /** Context menu action callbacks */
  onContextMenuAction?: (action: string, elementType: 'target' | 'effector' | 'sensor', elementId: string) => void;
  /** Friendly drones shown as cyan markers with tooltip only */
  friendlyDrones?: { id: string; name: string; lat: number; lon: number; altitude: string; headingDeg?: number; fovDeg?: number; trail?: [number, number][] }[];
  /** Smooth pan to a target without zoom change */
  smoothFocusRequest?: { lat: number; lon: number } | null;
  /** Target ID hovered from card sidebar — highlight on map */
  hoveredTargetIdFromCard?: string | null;
  /** Click on a sensor/effector/launcher icon to open its device card */
  onAssetClick?: (assetId: string) => void;
  /** Asset IDs that are offline — show a gray badge on the map */
  offlineAssetIds?: string[];
  /** User-overridden effector selection per target (targetId -> effectorId) */
  selectedEffectorIds?: Map<string, string>;
  /** Launcher effectors for weapon pointing flow */
  launcherEffectors?: LauncherEffector[];
  /** User-overridden launcher selection per target (targetId -> launcherId) */
  selectedLauncherIds?: Map<string, string>;
}

const CESIUM_ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined) ?? '';

/**
 * Initial camera target. In Cesium's 2D scene mode `heightM` is the
 * orthographic frustum extent (≈ visible canvas height in meters), not a
 * metric distance — 15 km gives a city-block view that matches Mapbox's
 * default `zoom: 13.5` from `TacticalMap.tsx`.
 */
const DEFAULT_INITIAL_VIEW = { lat: 32.4666, lon: 35.0013, heightM: 15_000 };

/**
 * Marker shell + ring sizes. Match the values `TacticalMap` uses for the
 * Mapbox markers so the two backends look interchangeable: assets have a
 * 36 px surface with a tighter 28 px threat-accent ring; targets are 32 / 26.
 */
const SENSOR_SURFACE = 36;
const SENSOR_RING = 28;
const TARGET_SURFACE = 32;
const TARGET_RING = 26;
/** Default LauncherIcon glyph size on Mapbox (`LauncherIcon` defaults to 24). */
const LAUNCHER_GLYPH = 24;

/**
 * `DroneIcon` draws its nose pointing east at `rotationDeg = 0`, but our
 * heading values follow the compass convention (`0° = north`, `90° = east`).
 * Subtract 90° so the nose actually points along the heading direction.
 * Same offset Mapbox uses throughout `TacticalMap.tsx`.
 */
const droneRotationFromHeading = (headingDeg: number | null | undefined): number =>
  (headingDeg ?? 0) - 90;

/**
 * Heading window. Deliberately shorter than the velocity window (5-10 s in
 * the motion tracker): linear speed changes slowly so a longer window damps
 * sample noise without noticeable lag, but heading can change fast — at
 * loiter-drone turn rates of ~18°/s, a 5 s window means the regression is
 * trying to fit ~90° of rotation as a single line, and during a target-
 * heading change mid-window the fit underestimates the current turn rate.
 * Result: icon visibly lags the actual direction of motion.
 *
 * 1.5 s is six samples at 4 Hz — enough pair-bearings for stable regression
 * while keeping the projection-to-head close to the instantaneous tangent.
 */
const HEADING_WINDOW_MS = 1500;
/** Min trail points before we trust the regression; fall back to last-pair below this. */
const HEADING_MIN_REGRESSION_PAIRS = 2;

/**
 * Derive a heading for a hostile target from a sliding window of its trail.
 *
 * Single-pair bearings (last 2 points) are noisy — sample noise gets
 * directly amplified into heading noise and the icon visibly twitches each
 * tick. But naïvely averaging position over a window gives you the *chord*
 * direction over those samples, which lags by half the window during a turn.
 *
 * What we actually want is the *tangent at the head of the trail* with
 * sample-noise smoothed out. Compute that by:
 *   1. For each consecutive pair in the window, take its bearing.
 *   2. Unwrap (so 350° → 10° reads as +20°, not -340°).
 *   3. Least-squares fit `θ(i) = a + b·i` through the unwrapped bearings.
 *      `b` is the per-pair turn rate (in degrees per index step).
 *   4. Predict `θ` at the *latest* pair index — this is the regression-
 *      smoothed instantaneous heading, which matches the tangent of the
 *      curve at the head while damping per-pair noise via the fit.
 *
 * Returns `null` when the trail is missing or too short.
 */
function targetHeadingFromTrail(t: Detection): number | null {
  if (!t.trail || t.trail.length < 2) return null;

  // Pick the window: prefer the last 5 s, fall back to the last 6 trail
  // points if timestamps aren't parseable (HH:mm:ss strings in some
  // locales) or there aren't enough samples in the time window.
  const tail = t.trail[t.trail.length - 1];
  const tailMs = Date.parse(tail.timestamp);
  let from = 0;
  if (Number.isFinite(tailMs)) {
    const cutoff = tailMs - HEADING_WINDOW_MS;
    for (let i = t.trail.length - 1; i >= 0; i--) {
      const ts = Date.parse(t.trail[i].timestamp);
      if (Number.isFinite(ts) && ts < cutoff) { from = i + 1; break; }
    }
  }
  if (from === t.trail.length - 1) from = Math.max(0, t.trail.length - 6);

  const window = t.trail.slice(from);
  if (window.length < 2) return null;

  // Last-pair bearing — used as the fallback when the window is too short
  // for a stable regression and as the wrap-anchor for unwrapping below.
  const lastPairBearing = bearingDegrees(
    window[window.length - 2].lat,
    window[window.length - 2].lon,
    window[window.length - 1].lat,
    window[window.length - 1].lon,
  );
  if (window.length < HEADING_MIN_REGRESSION_PAIRS + 1) {
    return lastPairBearing;
  }

  // Pair-bearings (one per consecutive pair) + unwrapping so a slow turn
  // through 0/360 reads as a continuous angle for the regression.
  const bearings: number[] = [];
  for (let i = 1; i < window.length; i++) {
    bearings.push(
      bearingDegrees(
        window[i - 1].lat,
        window[i - 1].lon,
        window[i].lat,
        window[i].lon,
      ),
    );
  }
  const unwrapped: number[] = [bearings[0]];
  for (let i = 1; i < bearings.length; i++) {
    let delta = ((bearings[i] - bearings[i - 1] + 540) % 360) - 180;
    if (delta <= -180) delta += 360;
    unwrapped.push(unwrapped[i - 1] + delta);
  }

  // Least-squares regression of (i, unwrappedBearing). The output is the
  // line θ(i) = a + b·i; we evaluate at i = lastIndex to get the
  // regression-predicted bearing at the head of the trail.
  let sumI = 0, sumT = 0;
  for (let i = 0; i < unwrapped.length; i++) {
    sumI += i; sumT += unwrapped[i];
  }
  const meanI = sumI / unwrapped.length;
  const meanT = sumT / unwrapped.length;
  let num = 0, denom = 0;
  for (let i = 0; i < unwrapped.length; i++) {
    const di = i - meanI;
    num += di * (unwrapped[i] - meanT);
    denom += di * di;
  }
  if (denom <= 0) return lastPairBearing;
  const slopePerPair = num / denom;
  const lastIdx = unwrapped.length - 1;
  const headingAtHead = meanT + slopePerPair * (lastIdx - meanI);
  return ((headingAtHead % 360) + 360) % 360;
}

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
  selectedEffectorIds,
  selectedLauncherIds,
  controlIndicator,
  planningScanViz,
  onMarkerClick,
  onAssetClick,
  onContextMenuAction,
}: CesiumTacticalMapProps) {
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
  // Scene mode (2D top-down vs 3D perspective). Default 2D so the post-cutover
  // map looks identical to what operators see today; the in-map toggle (rendered
  // bottom-left) flips to 3D on demand. The primitive layer handles the live
  // mode switch and camera-height nudge.
  const [sceneMode, setSceneMode] = useState<CesiumSceneMode>('2D');
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
   * Active-target → engaging-effector pair, rendered as a dashed line on the
   * map and used to highlight the chosen effector marker. Mirrors the
   * Mapbox `jamPair` / `weaponPair` logic in `TacticalMap.tsx:600-681`.
   *
   * Resolution priority for which effector "owns" the active target:
   *   1. Already-engaged: `target.mitigatingEffectorId` (jam) or
   *      `target.pointingLauncherId` (weapon) — engagement is in flight.
   *   2. Card-side hover preview: when the user hovers an effector in the
   *      target's sidebar, the line moves to that effector for a beat.
   *   3. User override via `selectedEffectorIds` / `selectedLauncherIds`.
   *   4. Closest available effector — picked by `resolveNearestAsset`.
   *
   * Returns `null` for targets the flow doesn't apply to (mitigated /
   * expired / actively-jamming target / mismatched classification).
   */
  type EngagementFlowKind = 'jam' | 'weapon';
  type EngagementPair = {
    flow: EngagementFlowKind;
    targetLat: number;
    targetLon: number;
    effLat: number;
    effLon: number;
    effId: string;
    distanceM: number;
    phase: string;
    lineColor: string;
    badgeTextColor: string;
  };

  const engagementPair = useMemo<EngagementPair | null>(() => {
    if (!activeTargetId || !targets) return null;
    const target = targets.find((t) => t.id === activeTargetId);
    if (!target) return null;
    if (target.entityStage !== 'classified') return null;

    const [tLat, tLon] = (target.coordinates ?? '')
      .split(',')
      .map((s) => parseFloat(s.trim()));
    if (!Number.isFinite(tLat) || !Number.isFinite(tLon)) return null;

    const buildPair = (
      flow: EngagementFlowKind,
      asset: FlowAsset,
      distanceM: number,
      phase: string,
      flowDef: typeof JAM_FLOW | typeof WEAPON_FLOW,
    ): EngagementPair => ({
      flow,
      targetLat: tLat,
      targetLon: tLon,
      effLat: asset.lat,
      effLon: asset.lon,
      effId: asset.id,
      distanceM,
      phase,
      lineColor: flowDef.lineColor(phase),
      badgeTextColor: flowDef.badgeTextColor(phase),
    });

    // ── JAM flow (drone targets) ────────────────────────────────────────
    if (JAM_FLOW.matchTarget(target)) {
      if (target.mitigationStatus === 'mitigated') return null;
      if (
        target.status === 'expired' ||
        target.status === 'event_neutralized' ||
        target.status === 'event_resolved'
      ) {
        return null;
      }
      // Already-jamming targets get their own viz path.
      if (target.id === jammingTargetId) return null;
      // "Mitigate all" doesn't pin to a single effector.
      if (target.mitigatingEffectorId === 'ALL') return null;

      const phase = JAM_FLOW.getPhase(target);
      const effectors = (regulusEffectors ?? REGULUS_EFFECTORS) as unknown as FlowAsset[];

      // 1. In-flight engagement.
      if (phase === 'mitigating' && target.mitigatingEffectorId) {
        const eff = effectors.find((e) => e.id === target.mitigatingEffectorId);
        if (eff) {
          return buildPair('jam', eff, haversineDistanceM(tLat, tLon, eff.lat, eff.lon), phase, JAM_FLOW);
        }
      }

      // 2. Card-side hover preview.
      if (hoveredSensorIdFromCard) {
        const eff = effectors.find((e) => e.id === hoveredSensorIdFromCard);
        if (eff) {
          return buildPair('jam', eff, haversineDistanceM(tLat, tLon, eff.lat, eff.lon), phase, JAM_FLOW);
        }
      }

      // 3 + 4. User override → closest available.
      const overrideId = selectedEffectorIds?.get(activeTargetId);
      const resolved = resolveNearestAsset(tLat, tLon, effectors, JAM_FLOW.availableFilter, overrideId);
      if (resolved.active) {
        return buildPair('jam', resolved.active.asset, resolved.active.km * 1000, phase, JAM_FLOW);
      }
      return null;
    }

    // ── WEAPON flow (car targets) ───────────────────────────────────────
    if (WEAPON_FLOW.matchTarget(target)) {
      if (
        target.status === 'expired' ||
        target.status === 'event_neutralized' ||
        target.status === 'event_resolved'
      ) {
        return null;
      }

      const phase = WEAPON_FLOW.getPhase(target);
      const launchers = (launcherEffectors ?? []) as unknown as FlowAsset[];

      if (target.pointingLauncherId) {
        const launcher = launchers.find((l) => l.id === target.pointingLauncherId);
        if (launcher) {
          return buildPair('weapon', launcher, haversineDistanceM(tLat, tLon, launcher.lat, launcher.lon), phase, WEAPON_FLOW);
        }
      }

      if (hoveredSensorIdFromCard) {
        const launcher = launchers.find((l) => l.id === hoveredSensorIdFromCard);
        if (launcher) {
          return buildPair('weapon', launcher, haversineDistanceM(tLat, tLon, launcher.lat, launcher.lon), phase, WEAPON_FLOW);
        }
      }

      const overrideId = selectedLauncherIds?.get(activeTargetId);
      const resolved = resolveNearestAsset(tLat, tLon, launchers, WEAPON_FLOW.availableFilter, overrideId);
      if (resolved.active) {
        return buildPair('weapon', resolved.active.asset, resolved.active.km * 1000, phase, WEAPON_FLOW);
      }
      return null;
    }

    return null;
  }, [
    activeTargetId,
    targets,
    regulusEffectors,
    launcherEffectors,
    selectedEffectorIds,
    selectedLauncherIds,
    hoveredSensorIdFromCard,
    jammingTargetId,
  ]);

  /**
   * Composing every asset registry + every dynamic prop in a single
   * `htmlMarkers` memo means *any* dependency tick (kinematic targets,
   * friendly drones moving every 250 ms) rebuilds the whole array —
   * including the ~22 static sensor / effector markers whose visual
   * state hasn't changed at all. Splitting the memo by dependency
   * shape lets React (and the Cesium primitive's id-keyed diff) skip
   * the static markers entirely on dynamic ticks.
   *
   * Each sub-memo returns its slice. `htmlMarkers` is the concatenation,
   * which is itself stable as long as none of the slices changed.
   */

  /** Helper for friendly assets (cameras / radars / lidars / hives / weapons / launchers). */
  const buildFriendlyAsset = useCallback(
    (
      id: string,
      lat: number,
      lon: number,
      icon: ReactNode,
      label: string,
      surfaceSize: number = SENSOR_SURFACE,
      fov?: { rangeM: number; bearingDeg: number; widthDeg: number },
      ringSize: number = SENSOR_RING,
    ): CesiumHtmlMarker => {
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

      // FOV cone appears only when the user is engaging with this sensor —
      // hovering it on the map, hovering it in the card sidebar, or seeing it
      // highlighted as part of the active target's contributing sensors. This
      // keeps the map quiet at rest and lets the FOV act as a hover affordance
      // (matches the "show details on demand" pattern of the Mapbox dashboard).
      // Fill opacity matches Mapbox's `FRIENDLY_FOV_FILL_PAINT` (0.40) so the
      // wedge reads at a glance over satellite imagery; highlighted sensors
      // bump up further to call out the active target's contributors.
      const showFov = !isOffline && (isHovered || isSelected || isHighlighted);
      const fovOpacity = isHighlighted ? 0.55 : 0.4;
      const fovColor = '#22b8cf';

      return {
        id,
        lat,
        lon,
        zIndex: isHovered ? 40 : isSelected ? 30 : 10,
        content: (
          <MapMarker
            icon={icon}
            style={style}
            surfaceSize={surfaceSize}
            ringSize={ringSize}
            label={label}
            showLabel={isHovered || isSelected}
            pulse={isHovered || isSelected}
          />
        ),
        fov: fov && showFov
          ? { rangeM: fov.rangeM, bearingDeg: fov.bearingDeg, widthDeg: fov.widthDeg, color: fovColor, opacity: fovOpacity }
          : undefined,
        onClick: () => onAssetClickRef.current?.(id),
        onContextMenu: (e) => openContextMenu(e, 'sensor', id),
        onMouseEnter: () => setHoveredMarkerId(id),
        onMouseLeave: () => setHoveredMarkerId((current) => (current === id ? null : current)),
      };
    },
    [
      offlineSet,
      selectedAssetId,
      hoveredSensorIdFromCard,
      hoveredMarkerId,
      highlightedSensorSet,
      openContextMenu,
    ],
  );

  /** Map a sensor asset to its Phase-4 FOV definition. */
  const sensorFov = useCallback(
    (asset: MapAsset) => ({
      rangeM: FOV_RADIUS_M,
      bearingDeg: asset.bearingDeg,
      widthDeg: asset.fovDeg,
    }),
    [],
  );

  /**
   * Slice 1 — static asset markers (CAMERA / RADAR / LIDAR / HIVE /
   * WEAPON / LAUNCHER). These come from module-scope arrays and only
   * change when hover / selection / highlight / offline state changes,
   * NOT when the dashboard's kinematic simulation reruns. Splitting
   * them out skips ~22 marker rebuilds on every 250 ms friendly-drone
   * tick. Dedup with `LAUNCHER_ASSETS` is local to this slice.
   */
  const staticAssetMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    const out: CesiumHtmlMarker[] = [];
    const seen = new Set<string>();
    const push = (m: CesiumHtmlMarker) => {
      if (seen.has(m.id)) return;
      seen.add(m.id);
      out.push(m);
    };
    for (const a of CAMERA_ASSETS) {
      push(buildFriendlyAsset(a.id, a.latitude, a.longitude, <CameraIcon />, a.typeLabel, SENSOR_SURFACE, sensorFov(a)));
    }
    for (const a of RADAR_ASSETS) {
      push(buildFriendlyAsset(a.id, a.latitude, a.longitude, <RadarIcon />, a.typeLabel, SENSOR_SURFACE, sensorFov(a)));
    }
    for (const a of LIDAR_ASSETS) {
      push(buildFriendlyAsset(a.id, a.latitude, a.longitude, <LidarIcon />, a.typeLabel, SENSOR_SURFACE, sensorFov(a)));
    }
    for (const a of DRONE_HIVE_ASSETS) {
      push(buildFriendlyAsset(a.id, a.latitude, a.longitude, <DroneHiveIcon />, a.typeLabel));
    }
    for (const a of WEAPON_SYSTEM_ASSETS) {
      push(buildFriendlyAsset(a.id, a.latitude, a.longitude, <LauncherIcon size={LAUNCHER_GLYPH} />, a.typeLabel));
    }
    for (const l of LAUNCHER_ASSETS) {
      push(buildFriendlyAsset(l.id, l.latitude, l.longitude, <LauncherIcon size={LAUNCHER_GLYPH} />, l.id));
    }
    return out;
  }, [buildFriendlyAsset, sensorFov]);

  /**
   * Slice 2 — Regulus effectors. Friendly assets but with their own
   * coverage-ring + jamming state shape, so they get their own slice
   * keyed only on effector-specific deps.
   */
  const regulusEffectorMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    const out: CesiumHtmlMarker[] = [];
    const effectors = regulusEffectors ?? REGULUS_EFFECTORS;
    const isEngagementEffector = (id: string) =>
      engagementPair?.flow === 'jam' && engagementPair.effId === id;
    for (const e of effectors) {
      const isJamming = jammingJammerAssetId === e.id;
      const isHoveredFromCard = hoveredSensorIdFromCard === e.id;
      const isHoveredOnMap = hoveredMarkerId === e.id;
      const isHovered = isHoveredFromCard || isHoveredOnMap;
      const isEngaged = isEngagementEffector(e.id);
      const state: InteractionState = isHovered
        ? 'hovered'
        : isJamming
          ? 'jammer'
          : isEngaged
            ? 'selected'
            : 'default';
      const style = resolveMarkerStyle(state, 'friendly');
      const showHoverEffect = isHovered || isEngaged;
      out.push({
        id: e.id,
        lat: e.lat,
        lon: e.lon,
        zIndex: showHoverEffect ? 40 : 15,
        content: (
          <MapMarker
            icon={<SensorIcon />}
            style={style}
            surfaceSize={SENSOR_SURFACE}
            ringSize={SENSOR_RING}
            label={e.name}
            showLabel={showHoverEffect || isJamming}
            pulse={showHoverEffect}
          />
        ),
        coverageRadiusM: showHoverEffect || isJamming ? e.coverageRadiusM : undefined,
        coverageColor: isJamming ? '#4ade80' : '#22b8cf',
        onClick: () => onAssetClickRef.current?.(e.id),
        onContextMenu: (ev) => openContextMenu(ev, 'effector', e.id),
        onMouseEnter: () => setHoveredMarkerId(e.id),
        onMouseLeave: () => setHoveredMarkerId((current) => (current === e.id ? null : current)),
      });
    }
    return out;
  }, [
    regulusEffectors,
    jammingJammerAssetId,
    hoveredSensorIdFromCard,
    hoveredMarkerId,
    engagementPair,
    openContextMenu,
  ]);

  /** Slice 3 — hostile target markers. Driven entirely by `targets` + active/hover. */
  const targetMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    if (!targets) return [];
    const out: CesiumHtmlMarker[] = [];
    const seen = new Set<string>();
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
      const isNewArrival = t.isNew === true;
      const targetHeading = targetHeadingFromTrail(t);
      out.push({
        id: t.id,
        lat,
        lon,
        zIndex: isHovered ? 60 : isActive ? 50 : 20,
        content: (
          <MapMarker
            icon={
              <DroneIcon
                color={style.glyphColor}
                rotationDeg={
                  targetHeading != null
                    ? droneRotationFromHeading(targetHeading)
                    : 0
                }
              />
            }
            style={style}
            surfaceSize={TARGET_SURFACE}
            ringSize={TARGET_RING}
            heading={targetHeading ?? undefined}
            label={t.name ?? t.id}
            showLabel={isHovered || isActive}
            pulse={isHovered || isActive || isNewArrival}
          />
        ),
        kinematic: true,
        onClick: () => onMarkerClickRef.current?.(t.id),
        onContextMenu: (e) => openContextMenu(e, 'target', t.id),
        onMouseEnter: () => setHoveredMarkerId(t.id),
        onMouseLeave: () => setHoveredMarkerId((current) => (current === t.id ? null : current)),
      });
    }
    return out;
  }, [targets, activeTargetId, hoveredTargetIdFromCard, hoveredMarkerId, openContextMenu]);

  /** Slice 4 — friendly drones (kinematic). */
  const friendlyDroneMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    if (!friendlyDrones) return [];
    const out: CesiumHtmlMarker[] = [];
    const seen = new Set<string>();
    for (const d of friendlyDrones) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      const isOffline = offlineSet.has(d.id);
      const isSelected = selectedAssetId === d.id;
      const isHoveredFromCard = hoveredSensorIdFromCard === d.id;
      const isHoveredOnMap = hoveredMarkerId === d.id;
      const isHovered = isHoveredFromCard || isHoveredOnMap;
      const state: InteractionState = isOffline
        ? 'disabled'
        : isSelected
          ? 'selected'
          : isHovered
            ? 'hovered'
            : 'default';
      const style = resolveMarkerStyle(state, 'friendly');
      const showFov = d.headingDeg != null && !isOffline && (isHovered || isSelected);
      out.push({
        id: d.id,
        lat: d.lat,
        lon: d.lon,
        zIndex: isHovered ? 40 : 25,
        content: (
          <MapMarker
            icon={
              <DroneIcon
                color={style.glyphColor}
                disabled={isOffline}
                rotationDeg={droneRotationFromHeading(d.headingDeg)}
              />
            }
            style={style}
            surfaceSize={SENSOR_SURFACE}
            ringSize={SENSOR_RING}
            heading={d.headingDeg}
            label={d.name}
            showLabel={isHovered || isSelected}
            pulse={isHovered || isSelected}
          />
        ),
        fov: showFov
          ? {
              rangeM: DRONE_FOV_RADIUS_M,
              bearingDeg: d.headingDeg!,
              widthDeg: d.fovDeg ?? DRONE_FOV_DEG,
              color: '#22b8cf',
              opacity: 0.4,
            }
          : undefined,
        kinematic: !isOffline,
        onClick: () => onAssetClickRef.current?.(d.id),
        onMouseEnter: () => setHoveredMarkerId(d.id),
        onMouseLeave: () => setHoveredMarkerId((current) => (current === d.id ? null : current)),
      });
    }
    return out;
  }, [friendlyDrones, offlineSet, selectedAssetId, hoveredSensorIdFromCard, hoveredMarkerId]);

  /** Slice 5 — launcher effectors prop. */
  const launcherEffectorMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    if (!launcherEffectors) return [];
    const out: CesiumHtmlMarker[] = [];
    const seen = new Set<string>();
    for (const l of launcherEffectors) {
      const lat = (l as unknown as { lat?: number }).lat;
      const lon = (l as unknown as { lon?: number }).lon;
      if (typeof lat !== 'number' || typeof lon !== 'number') continue;
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      const isHovered = hoveredMarkerId === l.id;
      const isEngaged = engagementPair?.flow === 'weapon' && engagementPair.effId === l.id;
      const state: InteractionState = isHovered
        ? 'hovered'
        : isEngaged
          ? 'selected'
          : 'default';
      const style = resolveMarkerStyle(state, 'friendly');
      const showHoverEffect = isHovered || isEngaged;
      out.push({
        id: l.id,
        lat,
        lon,
        zIndex: showHoverEffect ? 40 : 15,
        content: (
          <MapMarker
            icon={<LauncherIcon size={LAUNCHER_GLYPH} />}
            style={style}
            surfaceSize={SENSOR_SURFACE}
            ringSize={SENSOR_RING}
            label={(l as unknown as { name?: string }).name ?? l.id}
            showLabel={showHoverEffect}
            pulse={showHoverEffect}
          />
        ),
        onClick: () => onAssetClickRef.current?.(l.id),
        onContextMenu: (e) => openContextMenu(e, 'effector', l.id),
        onMouseEnter: () => setHoveredMarkerId(l.id),
        onMouseLeave: () => setHoveredMarkerId((current) => (current === l.id ? null : current)),
      });
    }
    return out;
  }, [launcherEffectors, hoveredMarkerId, engagementPair, openContextMenu]);

  /** Slice 6 — engagement-line distance badge. */
  const engagementBadgeMarker = useMemo<CesiumHtmlMarker | null>(() => {
    if (!engagementPair) return null;
    const distanceLabel =
      engagementPair.distanceM < 1000
        ? `${Math.round(engagementPair.distanceM)}m`
        : `${(engagementPair.distanceM / 1000).toFixed(1)} km`;
    return {
      id: `__engagement-badge-${engagementPair.flow}`,
      lat: (engagementPair.targetLat + engagementPair.effLat) / 2,
      lon: (engagementPair.targetLon + engagementPair.effLon) / 2,
      zIndex: 70,
      content: (
        <div
          className="rounded px-2 py-1 font-mono text-[11px] tabular-nums whitespace-nowrap pointer-events-none select-none shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
          style={{
            backgroundColor: engagementPair.lineColor,
            color: engagementPair.badgeTextColor,
          }}
        >
          {distanceLabel}
        </div>
      ),
    };
  }, [engagementPair]);

  /**
   * Concatenated `htmlMarkers` array. Stable as long as none of its
   * sub-slices changed; CesiumMap's id-keyed diff handles per-marker
   * updates efficiently from there.
   *
   * Order matters for z-fighting on ground-clamped FOV polygons: static
   * assets first (lowest priority), then effectors, then dynamic
   * targets/drones on top.
   */
  const htmlMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    // De-dupe across slices. Launchers in particular appear in BOTH
    // `staticAssetMarkers` (from `LAUNCHER_ASSETS` constant) and
    // `launcherEffectorMarkers` (from the `launcherEffectors` prop),
    // and the latter is the richer version with engagement/hover state,
    // so it wins. Without this, React logs a stream of duplicate-key
    // warnings every frame the marker set re-renders.
    const seen = new Set<string>();
    const out: CesiumHtmlMarker[] = [];
    const append = (marker: CesiumHtmlMarker): void => {
      if (seen.has(marker.id)) return;
      seen.add(marker.id);
      out.push(marker);
    };
    for (const m of launcherEffectorMarkers) append(m);
    for (const m of staticAssetMarkers) append(m);
    for (const m of regulusEffectorMarkers) append(m);
    for (const m of targetMarkers) append(m);
    for (const m of friendlyDroneMarkers) append(m);
    if (engagementBadgeMarker) append(engagementBadgeMarker);
    return out;
  }, [
    staticAssetMarkers,
    regulusEffectorMarkers,
    targetMarkers,
    friendlyDroneMarkers,
    launcherEffectorMarkers,
    engagementBadgeMarker,
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
  // Helpers used across polyline slices. Module-stable closures so
  // they don't flap memo identities.
  const tupleToPoints = useCallback(
    (trail: [number, number][]) => trail.map(([lat, lon]) => ({ lat, lon })),
    [],
  );
  const pushCasedTrail = useCallback(
    (
      out: CesiumPolyline[],
      id: string,
      points: { lat: number; lon: number }[],
      lineColor: string,
      lineWidth: number,
      casingWidth: number,
    ) => {
      // zIndex layering matters in 3D where both polylines are ground-clamped
      // and z-fight: without it the wider black casing wins and the trail
      // reads as a solid black line. Centreline gets the higher z so it
      // paints over the casing in the middle, leaving the visible black
      // edge band on either side.
      out.push({ id: `${id}-casing`, points, color: '#000000', width: casingWidth, zIndex: 0 });
      out.push({ id, points, color: lineColor, width: lineWidth, zIndex: 1 });
    },
    [],
  );

  /** Slice — active drone + mission-route + friendly trails. */
  const trailPolylines = useMemo<CesiumPolyline[]>(() => {
    const out: CesiumPolyline[] = [];
    if (activeDrone?.trail && activeDrone.trail.length >= 2) {
      pushCasedTrail(out, 'active-drone-trail', tupleToPoints(activeDrone.trail), '#ffffff', 3, 7);
    }
    if (missionRoute?.trail && missionRoute.trail.length >= 2) {
      pushCasedTrail(out, 'mission-route-trail', tupleToPoints(missionRoute.trail), '#ffffff', 3, 7);
    }
    if (missionRoute?.waypoints && missionRoute.waypoints.length >= 2) {
      out.push({
        id: 'mission-route-plan',
        points: missionRoute.waypoints.map((w) => ({ lat: w.lat, lon: w.lon })),
        color: '#22d3ee',
        width: 3,
        dashed: true,
      });
    }
    if (friendlyDrones) {
      for (const d of friendlyDrones) {
        if (!d.trail || d.trail.length < 2) continue;
        pushCasedTrail(out, `friendly-drone-${d.id}-trail`, tupleToPoints(d.trail), '#ffffff', 2, 5);
      }
    }
    if (targets) {
      for (const t of targets) {
        if (t.entityStage !== 'classified') continue;
        if (!t.trail || t.trail.length < 2) continue;
        pushCasedTrail(
          out,
          `target-${t.id}-trail`,
          t.trail.map((p) => ({ lat: p.lat, lon: p.lon })),
          '#ffffff',
          3,
          7,
        );
      }
    }
    return out;
  }, [activeDrone, missionRoute, friendlyDrones, targets, tupleToPoints, pushCasedTrail]);

  /** Slice — engagement-related polylines (jamming + active engagement). */
  const engagementPolylines = useMemo<CesiumPolyline[]>(() => {
    const out: CesiumPolyline[] = [];
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
    if (engagementPair) {
      out.push({
        id: `${engagementPair.flow}-engagement-line`,
        points: [
          { lat: engagementPair.effLat, lon: engagementPair.effLon },
          { lat: engagementPair.targetLat, lon: engagementPair.targetLon },
        ],
        color: engagementPair.lineColor,
        width: 2,
        dashed: true,
        particles: { count: 3, color: engagementPair.lineColor, speed: 0.25 },
      });
    }
    return out;
  }, [jammingTargetId, jammingJammerAssetId, targets, regulusEffectors, engagementPair]);

  /**
   * Slice — planning-scan fan. Driven by the user's planner UI, not
   * the kinematic sim — so it stays cold while drones tick.
   */
  const planningScanPolylines = useMemo<CesiumPolyline[]>(() => {
    if (!planningScanViz || planningScanViz.bearings.length === 0) return [];
    const out: CesiumPolyline[] = [];
    const SCAN_DIST_KM = 0.4;
    const cosLat = Math.cos((planningScanViz.cameraLat * Math.PI) / 180);
    for (let i = 0; i < planningScanViz.bearings.length; i++) {
      const bearing = planningScanViz.bearings[i];
      const bearingRad = (bearing * Math.PI) / 180;
      const endLat =
        planningScanViz.cameraLat + (SCAN_DIST_KM / 111.32) * Math.cos(bearingRad);
      const endLon =
        planningScanViz.cameraLon + (SCAN_DIST_KM / (111.32 * cosLat)) * Math.sin(bearingRad);
      out.push({
        id: `planning-scan-${i}`,
        points: [
          { lat: planningScanViz.cameraLat, lon: planningScanViz.cameraLon },
          { lat: endLat, lon: endLon },
        ],
        color: 'rgba(167, 139, 250, 0.5)',
        width: 2,
        dashed: true,
      });
    }
    return out;
  }, [planningScanViz]);

  const polylines = useMemo<CesiumPolyline[]>(
    () => [...trailPolylines, ...engagementPolylines, ...planningScanPolylines],
    [trailPolylines, engagementPolylines, planningScanPolylines],
  );

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
      <CesiumMap
        ionToken={CESIUM_ION_TOKEN}
        initialView={DEFAULT_INITIAL_VIEW}
        htmlMarkers={htmlMarkers}
        polylines={polylines}
        flyTo={flyTo}
        sceneMode={sceneMode}
        className="absolute inset-0"
      />

      {/*
        2D ↔ 3D toggle. Lattice-style affordance — the label is the
        *destination* mode (click "3D" to switch to 3D). Anchored
        bottom-left to line up with the existing phase-status pill at
        top-left for a coherent left rail of map chrome.
      */}
      <button
        type="button"
        onClick={() => setSceneMode((prev) => (prev === '3D' ? '2D' : '3D'))}
        aria-label={sceneMode === '3D' ? 'Switch to 2D map' : 'Switch to 3D map'}
        aria-pressed={sceneMode === '3D'}
        className="absolute bottom-3 left-3 z-20 pointer-events-auto w-7 h-7 bg-zinc-900/80 backdrop-blur-md text-[11px] font-mono font-semibold tabular-nums text-zinc-100 shadow-[0_4px_12px_rgba(0,0,0,0.45)] hover:bg-zinc-800/90 active:bg-zinc-950/85 transition-colors flex items-center justify-center select-none"
      >
        {sceneMode === '3D' ? '2D' : '3D'}
      </button>

      {/*
        "אתה בשליטה" / "You have control" indicator. Mirrors the Mapbox
        pill in `TacticalMap.tsx:2386-2393` pixel-for-pixel — same
        emerald palette, glow shadow, slow 3 s pulse, top-centre. Shown
        only when the dashboard sets `controlIndicator={true}` (typically
        while the operator has direct control of an asset).
      */}
      {controlIndicator && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-900/90 backdrop-blur-md shadow-[0_0_0_1px_rgba(52,211,153,0.6),0_10px_15px_-3px_rgba(0,0,0,0.3),0_0_20px_rgba(52,211,153,0.2)] animate-pulse"
            style={{ animationDuration: '3s' }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-sm font-bold text-emerald-200">אתה בשליטה</span>
          </div>
        </div>
      )}

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
