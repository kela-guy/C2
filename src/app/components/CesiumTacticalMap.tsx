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

import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type SetStateAction } from 'react';
import { useViewedAt } from '@/app/state/ViewedAtContext';
import {
  MotionRegistry,
  buildMovementSamples,
  type MovementMode,
} from '@/lib/motion';
import { sensorPosition } from '@/app/components/tacticalAssetIndex';
import { useDirection } from '@/lib/direction';
import {
  CesiumMap,
  type CesiumHtmlMarker,
  type CesiumMapFitBounds,
  type CesiumMapFlyTo,
  type CesiumPolyline,
  type CesiumSceneMode,
} from '@/primitives/CesiumMap';
import { MapMarker } from '@/primitives/MapMarker';
import { resolveMarkerStyle, type Affiliation, type InteractionState } from '@/primitives/markerStyles';
import {
  CAMERA_ASSETS,
  RADAR_ASSETS,
  DRONE_HIVE_ASSETS,
  LIDAR_ASSETS,
  WEAPON_SYSTEM_ASSETS,
  LAUNCHER_ASSETS,
  FLOODLIGHT_ASSETS,
  SPEAKER_ASSETS,
  REGULUS_EFFECTORS,
} from './tacticalAssets';
import type { FloodlightAsset, MapAsset, SpeakerAsset } from './tacticalAssets';
import {
  CameraIcon,
  RadarIcon,
  LidarIcon,
  DroneHiveIcon,
  LauncherIcon,
  FloodlightIcon,
  SpeakerIcon,
  SensorIcon,
  DroneIcon,
  MissileIcon,
  GotchaIcon,
} from './tacticalIcons';
import { CarIcon, JamWaveIcon } from '@/primitives/MapIcons';
import {
  BellOff,
  Compass,
  Radar,
  ExternalLink,
  Eye,
  MapPin,
  Maximize2,
  Phone,
  Radio,
  Search,
  Settings,
  Video,
  Wrench,
  X,
} from '@/lib/icons/central';
import {
  FOV_RADIUS_M,
  DRONE_FOV_RADIUS_M,
  DRONE_FOV_DEG,
  bearingDegrees,
  haversineDistanceM,
} from '@/app/lib/mapGeo';
import { JAM_FLOW, WEAPON_FLOW, GOTCHA_FLOW, resolveNearestAsset, type FlowAsset } from '@/imports/engagementFlows';
import { useStrings } from '@/lib/intl';
import {
  isMonochromeMapView,
  persistCameraView,
  persistSceneMode,
  readPersistedCameraView,
  readPersistedSceneMode,
  type MapViewMode,
} from '@/app/components/dashboard/mapViewMode';
import { presetForMapStyle } from '@/primitives/cesiumPresets';
import type { Detection, RegulusEffector, LauncherEffector, GotchaEffector } from '@/imports/ListOfSystems';
import { accentHex, slateHex } from '@/primitives/accentHex';

/*
 * Cesium scene materials and polyline paint consume literal hex
 * strings. The colors below mirror the Mapbox layer in `TacticalMap`
 * so a route switch from `?map=cesium` to default looks identical.
 *
 *   sensor FOV         → accent-info     (cyan-blue)
 *   floodlight beam    → accent-warning  (amber)
 *   ECM coverage       → accent-success  (green)
 *   weapon lock        → accent-danger   (red)
 *   active drone trail → slate-12        (white-ish)
 *   trail casing       → near-black icon-art outline
 *   raw track          → accent-magenta  (purple-ish)
 */
const CESIUM_FOV = accentHex('info');
const CESIUM_FLOODLIGHT_FOV = accentHex('warning');
const CESIUM_JAM = accentHex('success');
const CESIUM_TRAIL = slateHex(12);
const CESIUM_TRAIL_CASING = '#000000';
const CESIUM_RAW_TRACK = accentHex('historical');

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
  /** Gotcha net effectors (demo only). Each renders a 360° coverage ring. */
  gotchaEffectors?: GotchaEffector[];
  /**
   * Optional static-asset overrides. Each defaults to the production
   * registry constant when omitted, so the live dashboard renders
   * identically — the demo passes a trimmed set for a cleaner map.
   */
  cameraAssets?: MapAsset[];
  radarAssets?: MapAsset[];
  lidarAssets?: MapAsset[];
  hiveAssets?: MapAsset[];
  weaponAssets?: MapAsset[];
  launcherAssets?: { id: string; latitude: number; longitude: number }[];
  floodlightAssets?: FloodlightAsset[];
  speakerAssets?: SpeakerAsset[];
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
  /**
   * Friendly "force units" (BlackBerry-style ground operators) shown as
   * phone-glyph markers. Optional and additive: when omitted, the map
   * renders identically to the production dashboard. Used by the
   * marketing demo route to dispatch units to suspicious vehicles.
   */
  forceUnits?: ForceUnitMarker[];
  /** Operator-selected basemap style (Ion imagery vs monochrome terrain). */
  mapViewMode?: MapViewMode;
  /**
   * Selected closed historical track's full recorded path, rendered
   * as a dim white "what happened" line behind the bright active
   * trail. Decoupled from the scrubber — appears the instant the
   * operator opens a track card and stays until they close it. The
   * bright trail (from `targets[].trail`) paints over the dim line
   * up to `viewedAtMs`, so the two layers together tell "the full
   * story so far + how far the scrubber has played."
   */
  historicalTrackOverlay?: {
    id: string;
    fullPath: { lat: number; lon: number }[];
  } | null;
}

/**
 * Marker-level data for a friendly force unit. Intentionally a minimal
 * shape (id + lat/lon + label + status) so demo callers don't have to
 * hydrate a full `Detection`. The full data model with capabilities,
 * stream src, etc. lives in the marketing-demo module — this is just
 * the slice the map needs to render the marker.
 */
export interface ForceUnitMarker {
  id: string;
  lat: number;
  lon: number;
  label: string;
  status: 'available' | 'dispatched';
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
 * Pick the right hostile-target glyph from a {@link Detection}. The map
 * used to render every threat as a {@link DroneIcon} regardless of what
 * the operator had classified the target as, so a card titled "Vehicle"
 * still showed the drone glyph next to it. We resolve the icon in this
 * priority order:
 *
 *   1. `classifiedType` — the operator's confirmed call. Authoritative
 *      whenever it's set (`car` → vehicle, `drone` / `aircraft` → drone,
 *      `bird` falls back to drone since we have no bird glyph).
 *   2. `type` — the raw sensor classification. `ground_vehicle` → car,
 *      `missile` → missile, everything else (uav / aircraft / naval /
 *      unknown) falls back to drone.
 *
 * Each glyph is asked to render at the heading-rotated angle so the
 * nose / front aligns with motion. `CarIcon` doesn't take a rotation
 * prop today (the SVG is flat), so the rotation is dropped in that
 * branch — vehicles read fine without a heading nose.
 */
function buildThreatIcon(
  target: Detection,
  glyphColor: string,
  targetHeading: number | null,
): React.ReactNode {
  const rotationDeg =
    targetHeading != null ? droneRotationFromHeading(targetHeading) : 0;

  const classified = target.classifiedType;
  if (classified === 'car') return <CarIcon color={glyphColor} />;
  if (classified === 'drone' || classified === 'aircraft' || classified === 'bird') {
    return <DroneIcon color={glyphColor} rotationDeg={rotationDeg} />;
  }

  switch (target.type) {
    case 'ground_vehicle':
      return <CarIcon color={glyphColor} />;
    case 'missile':
      return <MissileIcon fill={glyphColor} rotationDeg={rotationDeg} />;
    case 'uav':
    case 'aircraft':
    case 'naval':
    case 'unknown':
      return <DroneIcon color={glyphColor} rotationDeg={rotationDeg} />;
    default: {
      const _exhaustive: never = target.type;
      void _exhaustive;
      return <DroneIcon color={glyphColor} rotationDeg={rotationDeg} />;
    }
  }
}

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

type ContextMenuItemDef = {
  id: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  separatorBefore?: boolean;
};

const MENU_ICON_SIZE = 16;

function contextMenuIcon(id: string, destructive?: boolean): ReactNode {
  const cls = destructive
    ? 'size-4 shrink-0 text-accent-danger'
    : 'size-4 shrink-0 text-slate-9';
  switch (id) {
    case 'mitigate':
    case 'activate':
      return (
        <span className={cls} aria-hidden>
          <JamWaveIcon size={MENU_ICON_SIZE} />
        </span>
      );
    case 'mitigate-all':
      return <Radio size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    case 'investigate':
      return <Search size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    case 'track':
      return <Eye size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    case 'open-card':
    case 'show-video':
      return <Maximize2 size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    case 'view-feed':
      return <Video size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    case 'open-tab':
    case 'edit':
      return <ExternalLink size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    case 'show-on-map':
      return <Compass size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    case 'show-coverage':
      return <Radar size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    case 'copy-coordinates':
      return <MapPin size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    case 'mute-alerts':
      return <BellOff size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    case 'settings':
      return <Settings size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    case 'calibrate':
      return <Wrench size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    case 'dismiss':
      return <X size={MENU_ICON_SIZE} className={cls} aria-hidden />;
    default:
      return null;
  }
}

function menuItem(
  id: string,
  label: string,
  opts?: Omit<ContextMenuItemDef, 'id' | 'label' | 'icon'>,
): ContextMenuItemDef {
  return {
    id,
    label,
    icon: contextMenuIcon(id, opts?.destructive),
    ...opts,
  };
}

/**
 * Right-click context-menu state. Item list mirrors `TacticalMap.tsx`
 * (Mapbox) — built at open time from the clicked entity.
 */
type ContextMenuState = {
  x: number;
  y: number;
  elementType: 'target' | 'sensor' | 'effector';
  elementId: string;
  headerLabel?: string;
  coordinates?: string;
  items: ContextMenuItemDef[];
};

function CesiumTacticalMapImpl({
  targets,
  activeTargetId,
  hoveredTargetIdFromCard,
  hoveredSensorIdFromCard,
  highlightedSensorIds,
  selectedAssetId,
  offlineAssetIds,
  regulusEffectors,
  gotchaEffectors,
  cameraAssets,
  radarAssets,
  lidarAssets,
  hiveAssets,
  weaponAssets,
  launcherAssets,
  floodlightAssets,
  speakerAssets,
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
  forceUnits,
  mapViewMode = 'current',
  historicalTrackOverlay,
  onMarkerClick,
  onAssetClick,
  onContextMenuAction,
}: CesiumTacticalMapProps) {
  const t = useStrings().map;
  const viewedAt = useViewedAt();
  const offlineSet = useMemo(() => new Set(offlineAssetIds ?? []), [offlineAssetIds]);
  // Resolve the curated Cesium snapshot for the operator's chosen
  // basemap. Memo keeps prop identity stable across renders so
  // CesiumMap's preset-live-update effect only runs when the operator
  // actually picks a different style.
  const mapPreset = useMemo(() => presetForMapStyle(mapViewMode), [mapViewMode]);
  const motionRegistryRef = useRef<MotionRegistry | null>(null);
  if (!motionRegistryRef.current) {
    motionRegistryRef.current = new MotionRegistry();
  }
  const movementMode: MovementMode = viewedAt.isLive ? 'live' : 'replay';
  const movementSamples = useMemo(() => {
    const wallNow = Date.now();
    const sourceTimeMs = movementMode === 'live' ? wallNow : viewedAt.viewedAtMs;
    const samples = buildMovementSamples(
      targets,
      friendlyDrones,
      sourceTimeMs,
      movementMode,
      offlineSet,
      targetHeadingFromTrail,
    );
    const registry = motionRegistryRef.current!;
    registry.ingest(samples);
    if (movementMode === 'live') {
      registry.advance(wallNow);
    }
    return samples;
  }, [targets, friendlyDrones, viewedAt.viewedAtMs, movementMode, offlineSet]);

  const motionPosition = useCallback(
    (id: string, lat: number, lon: number) => {
      const q = motionRegistryRef.current?.peek(id);
      if (q) return { lat: q.lat, lon: q.lon, headingDeg: q.headingDeg };
      return { lat, lon, headingDeg: null as number | null };
    },
    [],
  );
  const highlightedSensorSet = useMemo(
    () => new Set(highlightedSensorIds ?? []),
    [highlightedSensorIds],
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [coveragePinnedIds, setCoveragePinnedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const setFlyToRef = useRef<(req: CesiumMapFlyTo) => void>(() => {});
  const cameraIds = useMemo(
    () => new Set(CAMERA_ASSETS.map((a) => a.id)),
    [],
  );
  // Tracks which marker the cursor is currently over (DOM-level hover).
  // Drives the white-on-hover ring + tooltip visibility regardless of
  // whether the hover came from this map or from the card sidebar.
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  /**
   * Hover-out debounce. A fast mouse-skim across markers used to
   * thrash FOV cones in/out (the primitive tears down and re-adds
   * each FOV polygon when the marker's `fov` prop flips). Holding
   * the leave for ~50 ms collapses skim-throughs into a no-op while
   * still feeling immediate to a deliberate hover.
   */
  const HOVER_LEAVE_DEBOUNCE_MS = 50;
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterMarker = useCallback((id: string) => {
    if (hoverLeaveTimerRef.current !== null) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
    setHoveredMarkerId(id);
  }, []);
  const leaveMarker = useCallback((id: string) => {
    if (hoverLeaveTimerRef.current !== null) clearTimeout(hoverLeaveTimerRef.current);
    hoverLeaveTimerRef.current = setTimeout(() => {
      hoverLeaveTimerRef.current = null;
      setHoveredMarkerId((current) => (current === id ? null : current));
    }, HOVER_LEAVE_DEBOUNCE_MS);
  }, []);
  useEffect(() => {
    return () => {
      if (hoverLeaveTimerRef.current !== null) clearTimeout(hoverLeaveTimerRef.current);
    };
  }, []);
  // Scene mode (2D top-down vs 3D perspective). Default 2D so the post-cutover
  // map looks identical to what operators see today; the in-map toggle (rendered
  // bottom-left) flips to 3D on demand. The primitive layer handles the live
  // mode switch and camera-height nudge. Restored from localStorage so a
  // refresh keeps the operator on the projection they were using.
  const [sceneMode, setSceneModeState] = useState<CesiumSceneMode>(
    () => readPersistedSceneMode() ?? '2D',
  );
  const setSceneMode = useCallback(
    (updater: SetStateAction<CesiumSceneMode>) => {
      setSceneModeState((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: CesiumSceneMode) => CesiumSceneMode)(prev)
            : updater;
        if (next !== prev) persistSceneMode(next);
        return next;
      });
    },
    [],
  );
  // Restored once on mount; Cesium owns the camera after that and
  // streams updates back via `handleCameraChange` below.
  const initialView = useMemo(
    () => readPersistedCameraView() ?? DEFAULT_INITIAL_VIEW,
    [],
  );
  const handleCameraChange = useCallback(
    (view: {
      lat: number;
      lon: number;
      heightM: number;
      headingRad: number;
      pitchRad: number;
      rollRad: number;
    }) => {
      persistCameraView(view);
    },
    [],
  );
  // Stable callbacks, used inside memoised marker arrays.
  const onMarkerClickRef = useRef(onMarkerClick);
  const onAssetClickRef = useRef(onAssetClick);
  const onContextMenuActionRef = useRef(onContextMenuAction);
  onMarkerClickRef.current = onMarkerClick;
  onAssetClickRef.current = onAssetClick;
  onContextMenuActionRef.current = onContextMenuAction;

  const buildContextMenuItems = useCallback(
    (
      elementType: ContextMenuState['elementType'],
      elementId: string,
      headerLabel?: string,
    ): Omit<ContextMenuState, 'x' | 'y'> => {
      const m = t.contextMenu;
      const isOffline = offlineSet.has(elementId);

      if (elementType === 'target') {
        const target = targets.find((tg) => tg.id === elementId);
        const items: ContextMenuItemDef[] = [];
        const canJam =
          target &&
          target.classifiedType !== 'bird' &&
          target.mitigationStatus !== 'mitigated';
        if (canJam) {
          items.push(
            menuItem('mitigate', m.target.mitigate),
            menuItem('mitigate-all', m.target.mitigateAll),
          );
        }
        if (target?.mitigationStatus === 'mitigated') {
          items.push(menuItem('investigate', m.target.investigate));
        }
        items.push(
          menuItem('track', m.target.track),
          menuItem('open-card', m.target.openCard),
          menuItem('copy-coordinates', m.target.copyLocation, {
            separatorBefore: true,
            disabled: !target?.coordinates,
          }),
          menuItem('dismiss', m.target.cancel, {
            destructive: true,
            separatorBefore: true,
          }),
        );
        return {
          elementType,
          elementId,
          headerLabel: target?.name ?? elementId,
          coordinates: target?.coordinates,
          items,
        };
      }

      if (elementType === 'effector') {
        return {
          elementType,
          elementId,
          headerLabel: headerLabel ?? elementId,
          items: [
            menuItem('show-on-map', m.asset.showOnMap),
            menuItem('show-coverage', m.asset.showCoverage),
            menuItem('activate', m.asset.activateJam, { disabled: isOffline }),
            menuItem('mute-alerts', m.asset.muteAlerts, {
              disabled: isOffline,
              separatorBefore: true,
            }),
            menuItem('settings', m.asset.advancedSettings, { disabled: isOffline }),
            menuItem('calibrate', m.asset.calibrate, { disabled: isOffline }),
            menuItem('edit', m.asset.editSystem, { disabled: isOffline }),
          ],
        };
      }

      const isCamera = cameraIds.has(elementId);
      const assetItems: ContextMenuItemDef[] = [];
      if (isCamera) {
        assetItems.push(
          menuItem('show-video', m.asset.showVideo, { disabled: isOffline }),
          menuItem('view-feed', m.asset.viewFeedPanel, { disabled: isOffline }),
        );
      }
      assetItems.push(
        menuItem('open-tab', m.asset.openTab, { disabled: isOffline }),
        menuItem('show-on-map', m.asset.showOnMap),
        menuItem('show-coverage', m.asset.showCoverage),
        menuItem('mute-alerts', m.asset.muteAlerts, {
          disabled: isOffline,
          separatorBefore: true,
        }),
        menuItem('settings', m.asset.advancedSettings, { disabled: isOffline }),
        menuItem('calibrate', m.asset.calibrate, { disabled: isOffline }),
        menuItem('edit', m.asset.editSystem, { disabled: isOffline }),
      );

      return {
        elementType,
        elementId,
        headerLabel: headerLabel ?? elementId,
        items: assetItems,
      };
    },
    [cameraIds, offlineSet, t.contextMenu, targets],
  );

  const openContextMenu = useCallback(
    (
      e: React.MouseEvent,
      elementType: ContextMenuState['elementType'],
      elementId: string,
      headerLabel?: string,
    ) => {
      if (!onContextMenuActionRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const built = buildContextMenuItems(elementType, elementId, headerLabel);
      if (built.items.length === 0) return;
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        ...built,
      });
    },
    [buildContextMenuItems],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const fireContextAction = useCallback(
    (action: string) => {
      if (!contextMenu) return;
      if (action === 'copy-coordinates' && contextMenu.coordinates) {
        void navigator.clipboard.writeText(contextMenu.coordinates);
        setContextMenu(null);
        return;
      }
      if (action === 'show-coverage') {
        setCoveragePinnedIds((prev) => {
          const next = new Set(prev);
          if (next.has(contextMenu.elementId)) next.delete(contextMenu.elementId);
          else next.add(contextMenu.elementId);
          return next;
        });
        setContextMenu(null);
        return;
      }
      if (action === 'show-on-map') {
        let lat: number | undefined;
        let lon: number | undefined;
        if (contextMenu.elementType === 'target' && contextMenu.coordinates) {
          const [a, b] = contextMenu.coordinates.split(',').map((s) => parseFloat(s.trim()));
          lat = a;
          lon = b;
        } else {
          const pos =
            sensorPosition(contextMenu.elementId) ??
            regulusEffectors?.find((r) => r.id === contextMenu.elementId) ??
            launcherEffectors?.find((l) => l.id === contextMenu.elementId);
          if (pos) {
            lat = 'lat' in pos ? pos.lat : undefined;
            lon = 'lon' in pos ? pos.lon : undefined;
          }
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            const drone = friendlyDrones?.find((d) => d.id === contextMenu.elementId);
            if (drone) {
              lat = drone.lat;
              lon = drone.lon;
            }
          }
        }
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          setFlyToRef.current({ lat: lat!, lon: lon!, heightM: 5_000, durationSec: 0.8 });
        }
        setContextMenu(null);
        return;
      }
      onContextMenuActionRef.current?.(
        action,
        contextMenu.elementType,
        contextMenu.elementId,
      );
      setContextMenu(null);
    },
    [contextMenu, friendlyDrones, launcherEffectors, regulusEffectors],
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
  type EngagementFlowKind = 'jam' | 'weapon' | 'gotcha';
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

    const [rawLat, rawLon] = (target.coordinates ?? '')
      .split(',')
      .map((s) => parseFloat(s.trim()));
    if (!Number.isFinite(rawLat) || !Number.isFinite(rawLon)) return null;
    const targetPos = motionPosition(target.id, rawLat, rawLon);

    const buildPair = (
      flow: EngagementFlowKind,
      asset: FlowAsset,
      distanceM: number,
      phase: string,
      flowDef: typeof JAM_FLOW | typeof WEAPON_FLOW | typeof GOTCHA_FLOW,
    ): EngagementPair => ({
      flow,
      targetLat: targetPos.lat,
      targetLon: targetPos.lon,
      effLat: asset.lat,
      effLon: asset.lon,
      effId: asset.id,
      distanceM,
      phase,
      lineColor: flowDef.lineColor(phase),
      badgeTextColor: flowDef.badgeTextColor(phase),
    });

    // ── GOTCHA flow (recommended / in-flight net capture) ───────────────
    if (GOTCHA_FLOW.matchTarget(target)) {
      if (
        target.status === 'expired' ||
        target.status === 'event_neutralized' ||
        target.status === 'event_resolved'
      ) {
        return null;
      }
      const phase = GOTCHA_FLOW.getPhase(target);
      if (phase === 'captured') return null;
      const gotchas = (gotchaEffectors ?? []) as unknown as FlowAsset[];

      // In-flight throw pins the line to the throwing site.
      if (phase === 'throwing' && target.mitigatingEffectorId) {
        const eff = gotchas.find((e) => e.id === target.mitigatingEffectorId);
        if (eff) {
          return buildPair('gotcha', eff, haversineDistanceM(targetPos.lat, targetPos.lon, eff.lat, eff.lon), phase, GOTCHA_FLOW);
        }
      }

      if (hoveredSensorIdFromCard) {
        const eff = gotchas.find((e) => e.id === hoveredSensorIdFromCard);
        if (eff) {
          return buildPair('gotcha', eff, haversineDistanceM(targetPos.lat, targetPos.lon, eff.lat, eff.lon), phase, GOTCHA_FLOW);
        }
      }

      const resolved = resolveNearestAsset(targetPos.lat, targetPos.lon, gotchas, GOTCHA_FLOW.availableFilter);
      if (resolved.active) {
        return buildPair('gotcha', resolved.active.asset, resolved.active.km * 1000, phase, GOTCHA_FLOW);
      }
      return null;
    }

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
          return buildPair('jam', eff, haversineDistanceM(targetPos.lat, targetPos.lon, eff.lat, eff.lon), phase, JAM_FLOW);
        }
      }

      // 2. Card-side hover preview.
      if (hoveredSensorIdFromCard) {
        const eff = effectors.find((e) => e.id === hoveredSensorIdFromCard);
        if (eff) {
          return buildPair('jam', eff, haversineDistanceM(targetPos.lat, targetPos.lon, eff.lat, eff.lon), phase, JAM_FLOW);
        }
      }

      // 3 + 4. User override → closest available.
      const overrideId = selectedEffectorIds?.get(activeTargetId);
      const resolved = resolveNearestAsset(targetPos.lat, targetPos.lon, effectors, JAM_FLOW.availableFilter, overrideId);
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
          return buildPair('weapon', launcher, haversineDistanceM(targetPos.lat, targetPos.lon, launcher.lat, launcher.lon), phase, WEAPON_FLOW);
        }
      }

      if (hoveredSensorIdFromCard) {
        const launcher = launchers.find((l) => l.id === hoveredSensorIdFromCard);
        if (launcher) {
          return buildPair('weapon', launcher, haversineDistanceM(targetPos.lat, targetPos.lon, launcher.lat, launcher.lon), phase, WEAPON_FLOW);
        }
      }

      const overrideId = selectedLauncherIds?.get(activeTargetId);
      const resolved = resolveNearestAsset(targetPos.lat, targetPos.lon, launchers, WEAPON_FLOW.availableFilter, overrideId);
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
    gotchaEffectors,
    selectedEffectorIds,
    selectedLauncherIds,
    hoveredSensorIdFromCard,
    jammingTargetId,
    movementSamples,
    motionPosition,
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

  /**
   * Per-asset marker cache. Static-asset markers only change when
   * hover / selection / highlight / offline state for *that* id flips,
   * so 99% of asset renders on a hover-tick are cache hits — keeps
   * the per-marker `<MapMarker>` JSX reference stable and lets the
   * `HtmlMarkerNode` memo in `CesiumMap` skip reconciling those nodes
   * entirely. Only the affected marker reconciles. Same trick the
   * friendly-drone slice already uses.
   */
  const friendlyAssetCacheRef = useRef<
    Map<string, { fingerprint: string; marker: CesiumHtmlMarker }>
  >(new Map());

  /** Helper for friendly assets (cameras / radars / lidars / hives / weapons / launchers). */
  const buildFriendlyAsset = useCallback(
    (
      id: string,
      lat: number,
      lon: number,
      icon: ReactNode,
      label: string,
      surfaceSize: number = SENSOR_SURFACE,
      fov?: { rangeM: number; bearingDeg: number; widthDeg: number; color?: string },
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

      // FOV cone appears only when the user is engaging with this sensor —
      // hovering it on the map, hovering it in the card sidebar, or seeing it
      // highlighted as part of the active target's contributing sensors. This
      // keeps the map quiet at rest and lets the FOV act as a hover affordance
      // (matches the "show details on demand" pattern of the Mapbox dashboard).
      // Fill opacity matches Mapbox's `FRIENDLY_FOV_FILL_PAINT` (0.40) so the
      // wedge reads at a glance over satellite imagery; highlighted sensors
      // bump up further to call out the active target's contributors.
      const showFov =
        !isOffline &&
        (isHovered || isSelected || isHighlighted || coveragePinnedIds.has(id));
      const fovOpacity = isHighlighted ? 0.55 : 0.4;
      const fovColor = fov?.color ?? CESIUM_FOV;

      // Fingerprint covers everything that affects the rendered marker
      // shape; lat/lon/icon/label/sizes are static for a given id so
      // they're omitted, but FOV bearing/width/range are folded in
      // because some assets (PTZ cameras, etc.) could move them later.
      const fingerprint = `${state}|${showFov ? '1' : '0'}|${fovOpacity}|${fov ? `${fov.rangeM}-${fov.bearingDeg}-${fov.widthDeg}` : ''}`;
      const cached = friendlyAssetCacheRef.current.get(id);
      if (cached && cached.fingerprint === fingerprint) {
        return cached.marker;
      }

      const style = resolveMarkerStyle(state, affiliation);
      const fresh: CesiumHtmlMarker = {
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
        onContextMenu: (e) => openContextMenu(e, 'sensor', id, label),
        onMouseEnter: () => enterMarker(id),
        onMouseLeave: () => leaveMarker(id),
      };
      friendlyAssetCacheRef.current.set(id, { fingerprint, marker: fresh });
      return fresh;
    },
    [
      coveragePinnedIds,
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

  const floodlightFov = useCallback(
    (asset: FloodlightAsset) => ({
      rangeM: FOV_RADIUS_M,
      bearingDeg: asset.bearingDeg,
      widthDeg: asset.fovDeg,
      color: CESIUM_FLOODLIGHT_FOV,
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
    const cameras = cameraAssets ?? CAMERA_ASSETS;
    const radars = radarAssets ?? RADAR_ASSETS;
    const lidars = lidarAssets ?? LIDAR_ASSETS;
    const hives = hiveAssets ?? DRONE_HIVE_ASSETS;
    const weapons = weaponAssets ?? WEAPON_SYSTEM_ASSETS;
    const launchers = launcherAssets ?? LAUNCHER_ASSETS;
    const floodlights = floodlightAssets ?? FLOODLIGHT_ASSETS;
    const speakers = speakerAssets ?? SPEAKER_ASSETS;
    const out: CesiumHtmlMarker[] = [];
    const seen = new Set<string>();
    const push = (m: CesiumHtmlMarker) => {
      if (seen.has(m.id)) return;
      seen.add(m.id);
      out.push(m);
    };
    for (const a of cameras) {
      push(buildFriendlyAsset(a.id, a.latitude, a.longitude, <CameraIcon />, a.typeLabel, SENSOR_SURFACE, sensorFov(a)));
    }
    for (const a of radars) {
      push(buildFriendlyAsset(a.id, a.latitude, a.longitude, <RadarIcon />, a.typeLabel, SENSOR_SURFACE, sensorFov(a)));
    }
    for (const a of lidars) {
      push(buildFriendlyAsset(a.id, a.latitude, a.longitude, <LidarIcon />, a.typeLabel, SENSOR_SURFACE, sensorFov(a)));
    }
    for (const a of hives) {
      push(buildFriendlyAsset(a.id, a.latitude, a.longitude, <DroneHiveIcon />, a.typeLabel));
    }
    for (const a of weapons) {
      push(buildFriendlyAsset(a.id, a.latitude, a.longitude, <LauncherIcon size={LAUNCHER_GLYPH} />, a.typeLabel));
    }
    for (const l of launchers) {
      push(buildFriendlyAsset(l.id, l.latitude, l.longitude, <LauncherIcon size={LAUNCHER_GLYPH} />, l.id));
    }
    for (const f of floodlights) {
      push(
        buildFriendlyAsset(
          f.id,
          f.latitude,
          f.longitude,
          <FloodlightIcon />,
          f.typeLabel,
          SENSOR_SURFACE,
          floodlightFov(f),
        ),
      );
    }
    for (const s of speakers) {
      push(buildFriendlyAsset(s.id, s.latitude, s.longitude, <SpeakerIcon />, s.typeLabel));
    }
    return out;
  }, [
    buildFriendlyAsset,
    floodlightFov,
    sensorFov,
    cameraAssets,
    radarAssets,
    lidarAssets,
    hiveAssets,
    weaponAssets,
    launcherAssets,
    floodlightAssets,
    speakerAssets,
  ]);

  /**
   * Slice 2 — Regulus effectors. Friendly assets with coverage-ring +
   * jamming state. Per-id cache so hover ticks only reconcile the
   * affected effector.
   */
  const regulusCacheRef = useRef<
    Map<string, { fingerprint: string; marker: CesiumHtmlMarker }>
  >(new Map());
  const regulusEffectorMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    const out: CesiumHtmlMarker[] = [];
    const cache = regulusCacheRef.current;
    const effectors = regulusEffectors ?? REGULUS_EFFECTORS;
    const seen = new Set<string>();
    const isEngagementEffector = (id: string) =>
      engagementPair?.flow === 'jam' && engagementPair.effId === id;
    for (const e of effectors) {
      seen.add(e.id);
      const isJamming = jammingJammerAssetId === e.id;
      const isHoveredFromCard = hoveredSensorIdFromCard === e.id;
      const isHoveredOnMap = hoveredMarkerId === e.id;
      const isHovered = isHoveredFromCard || isHoveredOnMap;
      const isEngaged = isEngagementEffector(e.id);
      // While the operator's jam is mid-flight, the engaged jammer reads
      // as actively jamming: green pulsing ring + green coverage (vs the
      // muted `selected` preview shown before the jam is committed).
      const isActiveJam = isEngaged && engagementPair?.phase === 'mitigating';
      const isJamState = isJamming || isActiveJam;
      const state: InteractionState = isHovered
        ? 'hovered'
        : isJamState
          ? 'jammer'
          : isEngaged
            ? 'selected'
            : 'default';
      const showHoverEffect = isHovered || isEngaged;
      const showCoverage =
        showHoverEffect || isJamming || coveragePinnedIds.has(e.id);
      const fingerprint = `${state}|${showHoverEffect ? '1' : '0'}|${showCoverage ? '1' : '0'}|${isJamState ? '1' : '0'}|${e.coverageRadiusM}|${e.name}`;
      const cached = cache.get(e.id);
      if (cached && cached.fingerprint === fingerprint) {
        out.push(cached.marker);
        continue;
      }

      const style = resolveMarkerStyle(state, 'friendly');
      const fresh: CesiumHtmlMarker = {
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
            showLabel={showHoverEffect || isJamState}
            pulse={showHoverEffect}
          />
        ),
        coverageRadiusM: showCoverage ? e.coverageRadiusM : undefined,
        coverageColor: isJamState ? CESIUM_JAM : CESIUM_FOV,
        onClick: () => onAssetClickRef.current?.(e.id),
        onContextMenu: (ev) => openContextMenu(ev, 'effector', e.id, e.name),
        onMouseEnter: () => enterMarker(e.id),
        onMouseLeave: () => leaveMarker(e.id),
      };
      cache.set(e.id, { fingerprint, marker: fresh });
      out.push(fresh);
    }
    for (const id of cache.keys()) {
      if (!seen.has(id)) cache.delete(id);
    }
    return out;
  }, [
    coveragePinnedIds,
    regulusEffectors,
    jammingJammerAssetId,
    hoveredSensorIdFromCard,
    hoveredMarkerId,
    engagementPair,
    openContextMenu,
  ]);

  /**
   * Slice 2b — Gotcha net effectors (demo only). Friendly assets with a
   * 360° coverage ring shown on hover / pin / while actively throwing a
   * net. Empty (and thus free) in production where no gotcha effectors
   * are passed.
   */
  const activeGotchaIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tg of targets ?? []) {
      // Light the gotcha only while the net is in flight — once the throw
      // resolves (mitigated/captured) the marker returns to idle.
      if (
        tg.missionType === 'net_capture' &&
        tg.mitigatingEffectorId &&
        tg.mitigationStatus === 'mitigating'
      ) {
        ids.add(tg.mitigatingEffectorId);
      }
    }
    return ids;
  }, [targets]);

  const gotchaEffectorMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    const effectors = gotchaEffectors ?? [];
    if (effectors.length === 0) return [];
    const out: CesiumHtmlMarker[] = [];
    const isEngagementGotcha = (id: string) =>
      engagementPair?.flow === 'gotcha' && engagementPair.effId === id;
    for (const e of effectors) {
      const isHovered =
        hoveredSensorIdFromCard === e.id || hoveredMarkerId === e.id;
      // A recommended gotcha (engagement line pointing at it) lights up
      // the same as one actively throwing: white ring, pulse, and FOV.
      const isActive =
        e.status === 'active' ||
        activeGotchaIds.has(e.id) ||
        isEngagementGotcha(e.id);
      // Gotcha active uses a white ring + white pulse (the `active`
      // state) rather than the green `jammer` look reserved for jamming.
      const state: InteractionState = isHovered
        ? 'hovered'
        : isActive
          ? 'active'
          : 'default';
      const showHoverEffect = isHovered || isActive;
      const showCoverage =
        showHoverEffect || coveragePinnedIds.has(e.id);
      const style = resolveMarkerStyle(
        state,
        'friendly',
        isActive ? { ringPulse: true } : undefined,
      );
      out.push({
        id: e.id,
        lat: e.lat,
        lon: e.lon,
        zIndex: showHoverEffect ? 40 : 15,
        content: (
          <MapMarker
            icon={<GotchaIcon />}
            style={style}
            surfaceSize={SENSOR_SURFACE}
            ringSize={SENSOR_RING}
            label={e.name}
            showLabel={showHoverEffect}
            pulse={showHoverEffect}
          />
        ),
        coverageRadiusM: showCoverage ? e.coverageRadiusM : undefined,
        coverageColor: isActive ? CESIUM_FLOODLIGHT_FOV : CESIUM_FOV,
        onClick: () => onAssetClickRef.current?.(e.id),
        onContextMenu: (ev) => openContextMenu(ev, 'effector', e.id, e.name),
        onMouseEnter: () => enterMarker(e.id),
        onMouseLeave: () => leaveMarker(e.id),
      });
    }
    return out;
  }, [
    gotchaEffectors,
    activeGotchaIds,
    coveragePinnedIds,
    hoveredSensorIdFromCard,
    hoveredMarkerId,
    engagementPair,
    openContextMenu,
    enterMarker,
    leaveMarker,
  ]);

  /**
   * Slice 3 — hostile target markers (kinematic).
   *
   * Same fingerprint-cache trick as `friendlyDroneMarkers`: targets
   * tick at 2 Hz from the loiter sim, but interaction state, status,
   * classification, name, and heading-bucket are usually stable
   * across ticks. Reuse the previous marker object (with patched
   * lat/lon) when nothing visually relevant changed so the inner
   * `<MapMarker>` subtree skips reconciliation.
   */
  const targetCacheRef = useRef<
    Map<string, { fingerprint: string; marker: CesiumHtmlMarker }>
  >(new Map());
  const targetMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    if (!targets) {
      targetCacheRef.current.clear();
      return [];
    }
    const cache = targetCacheRef.current;
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
      // A jammed drone breaking off reads as neutralized (greyed) even
      // while it's still the selected card's target.
      const state: InteractionState = isHovered
        ? 'hovered'
        : t.neutralizedDrift
          ? 'expired'
          : isActive
            ? 'selected'
            : baseState;
      const isNewArrival = t.isNew === true;
      const targetHeading = t.headingDeg ?? targetHeadingFromTrail(t);
      const headingBucket = targetHeading != null ? Math.round(targetHeading) : null;
      const fingerprint = `${state}|${headingBucket}|${t.classifiedType ?? ''}|${t.type}|${t.name ?? ''}|${isNewArrival ? '1' : '0'}|${isActive ? '1' : '0'}`;

      const cached = cache.get(t.id);
      if (cached && cached.fingerprint === fingerprint) {
        const reused: CesiumHtmlMarker = { ...cached.marker, lat, lon };
        out.push(reused);
        cache.set(t.id, { fingerprint, marker: reused });
        continue;
      }

      const style = resolveMarkerStyle(state, 'hostile');
      const fresh: CesiumHtmlMarker = {
        id: t.id,
        lat,
        lon,
        zIndex: isHovered ? 60 : isActive ? 50 : 20,
        content: (
          <MapMarker
            icon={buildThreatIcon(t, style.glyphColor, targetHeading)}
            style={style}
            surfaceSize={TARGET_SURFACE}
            ringSize={TARGET_RING}
            heading={targetHeading ?? undefined}
            label={t.name ?? t.id}
            showLabel={isHovered || isActive}
            pulse={(isHovered || isActive || isNewArrival) && !t.neutralizedDrift}
          />
        ),
        kinematic: true,
        onClick: () => onMarkerClickRef.current?.(t.id),
        onContextMenu: (e) => openContextMenu(e, 'target', t.id),
        onMouseEnter: () => enterMarker(t.id),
        onMouseLeave: () => leaveMarker(t.id),
      };
      out.push(fresh);
      cache.set(t.id, { fingerprint, marker: fresh });
    }
    for (const id of cache.keys()) {
      if (!seen.has(id)) cache.delete(id);
    }
    return out;
  }, [targets, activeTargetId, hoveredTargetIdFromCard, hoveredMarkerId, openContextMenu]);

  /**
   * Slice 4 — friendly drones (kinematic).
   *
   * Per-drone cache. The patrol sim ticks at 2 Hz: lat/lon (and
   * sometimes heading) change every tick, but interaction state
   * (`isHovered`, `isSelected`, `isOffline`) is usually stable. We
   * cache each drone's marker by a fingerprint that combines the
   * inputs that affect visual output (rotation rounding to 1° avoids
   * sub-degree rebuilds). When the fingerprint matches we reuse the
   * previous marker object, only patching `lat` / `lon` so the
   * Cesium kinematic motion-track still receives a fresh sample.
   * Net effect: React skips reconciling the inner `<MapMarker>`
   * subtree every patrol tick when nothing meaningful changed.
   */
  const friendlyDroneCacheRef = useRef<
    Map<string, { fingerprint: string; marker: CesiumHtmlMarker }>
  >(new Map());
  const friendlyDroneMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    if (!friendlyDrones) {
      friendlyDroneCacheRef.current.clear();
      return [];
    }
    const cache = friendlyDroneCacheRef.current;
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
      const showFov = d.headingDeg != null && !isOffline && (isHovered || isSelected);
      // Round heading to whole degrees for fingerprinting — sub-degree
      // jitter from the patrol sim shouldn't force a rebuild.
      const headingRounded = d.headingDeg != null ? Math.round(d.headingDeg) : null;
      const fingerprint = `${state}|${headingRounded}|${d.fovDeg ?? ''}|${showFov ? '1' : '0'}|${d.name}`;

      const cached = cache.get(d.id);
      if (cached && cached.fingerprint === fingerprint) {
        // Reuse the marker but patch lat/lon so Cesium's motion track
        // gets the new sample on this tick.
        const reused: CesiumHtmlMarker = { ...cached.marker, lat: d.lat, lon: d.lon };
        out.push(reused);
        cache.set(d.id, { fingerprint, marker: reused });
        continue;
      }

      const style = resolveMarkerStyle(state, 'friendly');
      const pos = motionPosition(d.id, d.lat, d.lon);
      const fovBearing = pos.headingDeg ?? d.headingDeg;
      const fresh: CesiumHtmlMarker = {
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
        fov: showFov && fovBearing != null
          ? {
              rangeM: DRONE_FOV_RADIUS_M,
              bearingDeg: fovBearing,
              widthDeg: d.fovDeg ?? DRONE_FOV_DEG,
              color: CESIUM_FOV,
              opacity: 0.4,
            }
          : undefined,
        kinematic: !isOffline,
        onClick: () => onAssetClickRef.current?.(d.id),
        onContextMenu: (e) => openContextMenu(e, 'sensor', d.id, d.name),
        onMouseEnter: () => enterMarker(d.id),
        onMouseLeave: () => leaveMarker(d.id),
      };
      out.push(fresh);
      cache.set(d.id, { fingerprint, marker: fresh });
    }
    // Drop cache entries for drones that vanished.
    for (const id of cache.keys()) {
      if (!seen.has(id)) cache.delete(id);
    }
    return out;
  }, [
    friendlyDrones,
    offlineSet,
    selectedAssetId,
    hoveredSensorIdFromCard,
    hoveredMarkerId,
    openContextMenu,
    motionPosition,
  ]);

  /** Slice 5 — launcher effectors prop. */
  const launcherCacheRef = useRef<
    Map<string, { fingerprint: string; marker: CesiumHtmlMarker }>
  >(new Map());
  const launcherEffectorMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    if (!launcherEffectors) {
      launcherCacheRef.current.clear();
      return [];
    }
    const out: CesiumHtmlMarker[] = [];
    const cache = launcherCacheRef.current;
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
      const showHoverEffect = isHovered || isEngaged;
      const name = (l as unknown as { name?: string }).name ?? l.id;
      const fingerprint = `${state}|${showHoverEffect ? '1' : '0'}|${name}`;
      const cached = cache.get(l.id);
      if (cached && cached.fingerprint === fingerprint) {
        const reused: CesiumHtmlMarker = { ...cached.marker, lat, lon };
        out.push(reused);
        cache.set(l.id, { fingerprint, marker: reused });
        continue;
      }

      const style = resolveMarkerStyle(state, 'friendly');
      const fresh: CesiumHtmlMarker = {
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
            label={name}
            showLabel={showHoverEffect}
            pulse={showHoverEffect}
          />
        ),
        onClick: () => onAssetClickRef.current?.(l.id),
        onContextMenu: (e) => openContextMenu(e, 'sensor', l.id, name),
        onMouseEnter: () => enterMarker(l.id),
        onMouseLeave: () => leaveMarker(l.id),
      };
      cache.set(l.id, { fingerprint, marker: fresh });
      out.push(fresh);
    }
    for (const id of cache.keys()) {
      if (!seen.has(id)) cache.delete(id);
    }
    return out;
  }, [launcherEffectors, hoveredMarkerId, engagementPair, openContextMenu]);

  /**
   * Slice 5b — friendly "force unit" markers (BlackBerry phones).
   * Mirrors the `friendlyDroneMarkers` shape but uses the phone glyph
   * and a lighter-weight state machine: `available` → idle friendly,
   * `dispatched` → selected/active styling so the dispatched unit
   * stands out visually on the map. Kept additive — when `forceUnits`
   * is undefined the slice is empty and nothing renders.
   */
  const forceUnitCacheRef = useRef<
    Map<string, { fingerprint: string; marker: CesiumHtmlMarker }>
  >(new Map());
  const forceUnitMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    if (!forceUnits || forceUnits.length === 0) {
      forceUnitCacheRef.current.clear();
      return [];
    }
    const out: CesiumHtmlMarker[] = [];
    const cache = forceUnitCacheRef.current;
    const seen = new Set<string>();
    for (const u of forceUnits) {
      if (seen.has(u.id)) continue;
      seen.add(u.id);
      const isHovered = hoveredMarkerId === u.id;
      const isDispatched = u.status === 'dispatched';
      const state: InteractionState = isHovered
        ? 'hovered'
        : isDispatched
          ? 'selected'
          : 'default';
      const fingerprint = `${state}|${u.status}|${u.label}`;
      const cached = cache.get(u.id);
      if (cached && cached.fingerprint === fingerprint) {
        const reused: CesiumHtmlMarker = { ...cached.marker, lat: u.lat, lon: u.lon };
        out.push(reused);
        cache.set(u.id, { fingerprint, marker: reused });
        continue;
      }

      const style = resolveMarkerStyle(state, 'friendly');
      const fresh: CesiumHtmlMarker = {
        id: u.id,
        lat: u.lat,
        lon: u.lon,
        zIndex: isHovered ? 40 : isDispatched ? 25 : 12,
        content: (
          <MapMarker
            icon={<Phone size={18} aria-hidden="true" />}
            style={style}
            surfaceSize={SENSOR_SURFACE}
            ringSize={SENSOR_RING}
            label={u.label}
            showLabel={isHovered || isDispatched}
            pulse={isHovered || isDispatched}
          />
        ),
        onClick: () => onAssetClickRef.current?.(u.id),
        onMouseEnter: () => enterMarker(u.id),
        onMouseLeave: () => leaveMarker(u.id),
      };
      cache.set(u.id, { fingerprint, marker: fresh });
      out.push(fresh);
    }
    for (const id of cache.keys()) {
      if (!seen.has(id)) cache.delete(id);
    }
    return out;
  }, [forceUnits, hoveredMarkerId]);

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
    for (const m of gotchaEffectorMarkers) append(m);
    for (const m of targetMarkers) append(m);
    for (const m of friendlyDroneMarkers) append(m);
    for (const m of forceUnitMarkers) append(m);
    if (engagementBadgeMarker) append(engagementBadgeMarker);
    return out;
  }, [
    staticAssetMarkers,
    regulusEffectorMarkers,
    gotchaEffectorMarkers,
    targetMarkers,
    friendlyDroneMarkers,
    launcherEffectorMarkers,
    forceUnitMarkers,
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
  const trailWithMotionHead = useCallback(
    (_id: string, points: { lat: number; lon: number }[]) => points,
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
      out.push({ id: `${id}-casing`, points, color: CESIUM_TRAIL_CASING, width: casingWidth, zIndex: 0 });
      out.push({ id, points, color: lineColor, width: lineWidth, zIndex: 1 });
    },
    [],
  );

  /** Slice — active drone + mission-route + friendly trails. */
  const trailPolylines = useMemo<CesiumPolyline[]>(() => {
    const out: CesiumPolyline[] = [];
    if (activeDrone?.trail && activeDrone.trail.length >= 2) {
      pushCasedTrail(out, 'active-drone-trail', tupleToPoints(activeDrone.trail), CESIUM_TRAIL, 3, 7);
    }
    if (missionRoute?.trail && missionRoute.trail.length >= 2) {
      pushCasedTrail(out, 'mission-route-trail', tupleToPoints(missionRoute.trail), CESIUM_TRAIL, 3, 7);
    }
    if (missionRoute?.waypoints && missionRoute.waypoints.length >= 2) {
      out.push({
        id: 'mission-route-plan',
        points: missionRoute.waypoints.map((w) => ({ lat: w.lat, lon: w.lon })),
        color: CESIUM_FOV,
        width: 3,
        dashed: true,
      });
    }
    if (friendlyDrones) {
      for (const d of friendlyDrones) {
        if (!d.trail || d.trail.length < 2) continue;
        pushCasedTrail(
          out,
          `friendly-drone-${d.id}-trail`,
          trailWithMotionHead(d.id, tupleToPoints(d.trail)),
          CESIUM_TRAIL,
          2,
          5,
        );
      }
    }
    if (targets) {
      for (const t of targets) {
        if (t.entityStage !== 'classified') continue;
        if (!t.trail || t.trail.length < 2) continue;
        pushCasedTrail(
          out,
          `target-${t.id}-trail`,
          trailWithMotionHead(
            t.id,
            t.trail.map((p) => ({ lat: p.lat, lon: p.lon })),
          ),
          CESIUM_TRAIL,
          3,
          7,
        );
      }
    }
    return out;
  }, [activeDrone, missionRoute, friendlyDrones, targets, tupleToPoints, pushCasedTrail, trailWithMotionHead, movementSamples]);

  /** Slice — engagement-related polylines (jamming + active engagement). */
  const engagementPolylines = useMemo<CesiumPolyline[]>(() => {
    const out: CesiumPolyline[] = [];
    if (jammingTargetId && jammingJammerAssetId) {
      const target = targets?.find((t) => t.id === jammingTargetId);
      const effectors = regulusEffectors ?? REGULUS_EFFECTORS;
      const jammer = effectors.find((e) => e.id === jammingJammerAssetId);
      if (target && jammer) {
        const [rawLat, rawLon] = (target.coordinates ?? '').split(',').map((s) => parseFloat(s.trim()));
        if (Number.isFinite(rawLat) && Number.isFinite(rawLon)) {
          const targetPos = motionPosition(target.id, rawLat, rawLon);
          out.push({
            id: 'jamming-engagement-line',
            points: [
              { lat: jammer.lat, lon: jammer.lon },
              { lat: targetPos.lat, lon: targetPos.lon },
            ],
            color: CESIUM_JAM,
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
  }, [jammingTargetId, jammingJammerAssetId, targets, regulusEffectors, engagementPair, motionPosition, movementSamples]);

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
        color: `color-mix(in oklch, ${CESIUM_RAW_TRACK} 50%, transparent)`,
        width: 2,
        dashed: true,
      });
    }
    return out;
  }, [planningScanViz]);

  /**
   * Slice — dim full-path overlay for the selected closed historical
   * track. Single thin white polyline at low opacity, no casing,
   * always behind every other polyline so the bright active trail
   * paints over it cleanly up to `viewedAtMs`. Decoupled from
   * playback — the operator sees "what happened" the moment they
   * open the track card.
   */
  const historicalTrackOverlayPolylines = useMemo<CesiumPolyline[]>(() => {
    if (!historicalTrackOverlay || historicalTrackOverlay.fullPath.length < 2) {
      return [];
    }
    return [
      {
        id: `history-overlay-${historicalTrackOverlay.id}`,
        points: historicalTrackOverlay.fullPath,
        color: `color-mix(in oklch, ${CESIUM_TRAIL} 15%, transparent)`,
        width: 2,
        zIndex: -1,
      },
    ];
  }, [historicalTrackOverlay]);

  const polylines = useMemo<CesiumPolyline[]>(
    () => [
      ...historicalTrackOverlayPolylines,
      ...trailPolylines,
      ...engagementPolylines,
      ...planningScanPolylines,
    ],
    [
      historicalTrackOverlayPolylines,
      trailPolylines,
      engagementPolylines,
      planningScanPolylines,
    ],
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
  const [fitBounds, setFitBounds] = useState<CesiumMapFitBounds | null>(null);
  setFlyToRef.current = (req) => setFlyTo(req);

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

  // fitBoundsPoints → BoundingSphere fit. Cesium computes the camera
  // distance that makes the sphere fill the frustum tightly, accounting
  // for actual aspect — beats the prior centroid + max-span heuristic
  // which overshot on non-square distributions.
  useEffect(() => {
    if (!fitBoundsPoints || fitBoundsPoints.length < 2) return;
    setFitBounds({ points: fitBoundsPoints, durationSec: 1.4 });
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
      ...FLOODLIGHT_ASSETS.map((a) => ({ id: a.id, lat: a.latitude, lon: a.longitude })),
      ...SPEAKER_ASSETS.map((a) => ({ id: a.id, lat: a.latitude, lon: a.longitude })),
      ...(regulusEffectors ?? REGULUS_EFFECTORS).map((e) => ({ id: e.id, lat: e.lat, lon: e.lon })),
    ];
    const asset = allAssets.find((a) => a.id === sensorFocusId);
    if (!asset) return;
    setFlyTo({ lat: asset.lat, lon: asset.lon, heightM: 4_000, durationSec: 1.0 });
  }, [sensorFocusId, regulusEffectors]);

  // The dark monochrome basemap uses CartoDB tiles (no Ion token
  // required), so the missing-token guard is skipped in that mode —
  // otherwise the marketing demo would land on the Hebrew warning
  // panel even though the basemap it requests is fully fetchable.
  if (!CESIUM_ION_TOKEN && !isMonochromeMapView(mapViewMode)) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-surface-1 text-slate-11">
        <div className="rounded-md bg-accent-warning-tint px-4 py-3 text-sm shadow-[0_0_0_1px_var(--border-default)]">
          <strong>Cesium token missing.</strong> Set <code className="font-mono">VITE_CESIUM_ION_TOKEN</code> in <code className="font-mono">.env.local</code> and restart the dev server.
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/*
        The canvas-overflow wrapper extends laterally past the visible
        map cell by the open panel widths (driven by CSS vars set on
        the gridblock map cell wrapper). The grandparent tile's
        overflow:hidden clips the excess. Net effect: Cesium's CSS box
        is invariant across panel toggles, so the framebuffer never
        re-allocates and the world content stays anchored to viewport
        coords while the visible portion is just clipped.
      */}
      <div className="gridblock-canvas-overflow absolute top-0">
        <CesiumMap
          ionToken={CESIUM_ION_TOKEN}
          initialView={initialView}
          htmlMarkers={htmlMarkers}
          motionRegistry={motionRegistryRef.current ?? undefined}
          polylines={polylines}
          flyTo={flyTo}
          fitBounds={fitBounds}
          sceneMode={sceneMode}
          mapViewMode={mapViewMode}
          preset={mapPreset}
          onCameraChange={handleCameraChange}
          className="absolute inset-0"
        />
      </div>

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
        className="absolute bottom-3 left-3 z-20 pointer-events-auto w-7 h-7 bg-[color-mix(in_oklch,var(--surface-3)_85%,transparent)] backdrop-blur-md text-[11px] font-mono font-semibold tabular-nums text-slate-12 shadow-[0_4px_12px_rgba(0,0,0,0.45)] hover:bg-[color-mix(in_oklch,var(--surface-4)_90%,transparent)] active:bg-[color-mix(in_oklch,var(--surface-1)_92%,transparent)] transition-colors flex items-center justify-center select-none"
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[color-mix(in_oklch,var(--accent-success-soft)_90%,transparent)] backdrop-blur-md shadow-[0_0_0_1px_color-mix(in_oklch,var(--accent-success)_60%,transparent),0_10px_15px_-3px_rgba(0,0,0,0.3),0_0_20px_color-mix(in_oklch,var(--accent-success)_20%,transparent)] animate-pulse"
            style={{ animationDuration: '3s' }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-accent-success shadow-[0_0_8px_color-mix(in_oklch,var(--accent-success)_80%,transparent)]" />
            <span className="text-sm font-bold text-accent-success">{t.youHaveControl}</span>
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
 * Memoized export. The dashboard re-renders on lots of unrelated
 * state (panel resize, dialogs opening, etc.) — without `memo`, every
 * such re-render rebuilds this component's giant memo chain even when
 * its props are referentially identical.
 */
export const CesiumTacticalMap = memo(CesiumTacticalMapImpl);

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
  const { direction } = useDirection();

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        dir={direction}
        className="fixed z-50 min-w-[200px] rounded-md bg-surface-3 py-1 text-slate-12 shadow-[0_0_0_1px_var(--border-default),0_8px_30px_rgba(0,0,0,0.5)]"
        style={{ top: state.y, left: state.x }}
        role="menu"
      >
        {state.headerLabel ? (
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-11 border-b border-border-default truncate text-start">
            {state.headerLabel}
          </div>
        ) : null}
        {state.items.map((item) => (
          <Fragment key={item.id}>
            {item.separatorBefore ? (
              <div className="my-1 h-px bg-border-default" role="separator" />
            ) : null}
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) onAction(item.id);
              }}
              className={[
                'flex w-full items-center gap-2.5 px-2.5 py-1.5 text-start text-[12px] focus-visible:outline-none',
                item.disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-state-hover-strong focus-visible:bg-state-hover-strong cursor-pointer',
                item.destructive ? 'text-accent-danger' : 'text-slate-11',
              ].join(' ')}
            >
              {item.icon}
              <span className="min-w-0 flex-1">{item.label}</span>
            </button>
          </Fragment>
        ))}
      </div>
    </>
  );
}
