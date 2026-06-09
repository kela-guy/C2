/**
 * CesiumMap — generic CesiumJS viewer primitive.
 *
 * Component that wraps `Cesium.Viewer` with a prop-driven tactical-map API:
 *
 *   - basemap selection (Cesium Ion imagery, default Bing Aerial)
 *   - 2D / 2.5D / 3D scene mode
 *   - marker pins with click + hover
 *   - sensor FOV cone (sector polygon) and ECM coverage circle
 *   - imperative fly-to via prop
 *
 * No app-domain coupling. Pass your own data via props.
 */

import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { MotionRegistry, createMotionTrack, type MotionTrack } from '@/lib/motion';
import { applyCesiumSettings } from './applyCesiumSettings';
import type { MapSettings } from './cesiumPresets';

/**
 * Minimum container size (px) before we're willing to construct
 * `Cesium.Viewer`. Below this, WebGL context init can fail silently and leave
 * the viewer in a "half-built" state where `_cesiumWidget` is undefined,
 * which then explodes on the first public-getter access.
 */
const MIN_MOUNT_SIZE_PX = 8;

export type CesiumSceneMode = '2D' | '2.5D' | '3D';

export interface CesiumMarker {
  id: string;
  /** Geographic position. */
  lat: number;
  lon: number;
  /** Pin label shown on hover and to screen readers. */
  label?: string;
  /** Pin colour. Accepts any CSS color string. Defaults to `#22b8cf`. */
  color?: string;
  /** When set, draws a sensor field-of-view sector (degrees + heading + range). */
  fov?: { rangeM: number; bearingDeg: number; widthDeg: number };
  /** When set, draws an ECM coverage ring (radius in meters). */
  coverageRadiusM?: number;
}

export interface CesiumMapFlyTo {
  lat: number;
  lon: number;
  /** Camera height above terrain in meters. Default 1500. */
  heightM?: number;
  /** Ease duration in seconds. Default 1.2. */
  durationSec?: number;
}

/**
 * Imperative "frame these points" request. Internally builds a
 * `BoundingSphere` from the supplied lat/lon points and uses Cesium's
 * `Camera.flyToBoundingSphere`, which accounts for the actual
 * frustum aspect — tighter than computing a centroid + maximum-span
 * height by hand, which overshoots on non-square distributions.
 *
 * Pass a NEW object identity each time you want to (re-)fit.
 */
export interface CesiumMapFitBounds {
  points: Array<{ lat: number; lon: number }>;
  /** Ease duration in seconds. Default 1.4. */
  durationSec?: number;
  /** Padding multiplier on the bounding sphere radius. Default 1.2. */
  padding?: number;
}

/**
 * Polyline / trail entity. Used for drone tracks, engagement lines,
 * mission routes, etc. Pass an array of [lon, lat] (or [lat, lon] — see
 * `coordOrder`) tuples. Width in pixels.
 */
export interface CesiumPolyline {
  id: string;
  /** Series of points along the line. */
  points: Array<{ lat: number; lon: number }>;
  /** CSS color string. Defaults to `#22b8cf`. */
  color?: string;
  /** Stroke width in pixels. Defaults to 2. */
  width?: number;
  /** When true, renders as a flowing dashed line (engagement-line style). */
  dashed?: boolean;
  /**
   * Stacking order for ground-clamped polylines. Higher z-index draws on
   * top — Cesium uses this to resolve z-fighting between two polylines
   * occupying the same path (e.g. a black casing + white centreline
   * trail, where the centreline must paint over the casing). Only has
   * effect when the polyline ends up ground-clamped (currently: all
   * non-smoothed polylines in 3D mode). Defaults to 0.
   */
  zIndex?: number;
  /**
   * Animated particles flowing from the first to the last point of the
   * line. Used for engagement-pair viz so the user sees a clear direction
   * of fire even on a still map. Spring-eased so each dot accelerates and
   * settles into the target.
   */
  particles?: {
    /** Number of dots flowing along the line. */
    count: number;
    /** Core dot colour. Defaults to the line's `color`. */
    color?: string;
    /** Cycles per second. `0.25` ≈ 4 s loop. */
    speed?: number;
  };
}

/**
 * DOM-overlay marker. Renders arbitrary React content positioned over the
 * Cesium canvas at the given lat/lon. Updated each frame from the scene's
 * `cartesianToCanvasCoordinates`. Use this when you need crisp SVGs, CSS
 * animations, or pointer-events that React already handles — i.e. anything
 * billboard images can't do well.
 */
export interface CesiumHtmlMarker {
  id: string;
  lat: number;
  lon: number;
  /** React content rendered at the marker position (centred on the lat/lon). */
  content: React.ReactNode;
  /** Z-index for stacking among siblings. */
  zIndex?: number;
  /** Optional click handler (alternative to `onHtmlMarkerClick` on the map). */
  onClick?: (e: React.MouseEvent) => void;
  /** Optional context-menu handler (right-click). */
  onContextMenu?: (e: React.MouseEvent) => void;
  /** Optional hover handlers. */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /**
   * Optional sensor field-of-view sector (terrain-clamped polygon).
   * `bearingDeg` is the centre direction (0=N, 90=E); `widthDeg` is the full
   * cone angle. Use `widthDeg: 360` for omnidirectional sensors.
   */
  fov?: { rangeM: number; bearingDeg: number; widthDeg: number; color?: string; opacity?: number };
  /** Optional coverage ring (terrain-clamped ellipse). */
  coverageRadiusM?: number;
  /** Coverage ring colour (CSS string). Defaults to `#22b8cf`. */
  coverageColor?: string;
  /**
   * When true, the marker's lat/lon prop is treated as a *sensor sample*
   * rather than a render position. The map maintains a per-id motion track
   * that interpolates between samples and extrapolates forward along the
   * last-known velocity vector when samples go quiet — see
   * `src/lib/motionTracker.ts`. Heading from velocity is exposed but not
   * applied to the icon (icons stay React-level for rotation).
   */
  kinematic?: boolean;
}

export interface CesiumMapProps {
  /** Cesium Ion access token. Required for Bing Aerial / Cesium Ion assets. */
  ionToken: string;
  /**
   * Initial camera target. Required so we don't open over the equator.
   * Orientation fields (radians) are optional — when omitted, the
   * camera lands with heading/roll = 0 and pitch = straight down,
   * matching the historical default.
   */
  initialView: {
    lat: number;
    lon: number;
    heightM?: number;
    headingRad?: number;
    pitchRad?: number;
    rollRad?: number;
  };
  /** Markers to render as Cesium points/entities (cheap, GPU). */
  markers?: CesiumMarker[];
  /** Markers rendered as DOM overlays positioned via scene transforms. */
  htmlMarkers?: CesiumHtmlMarker[];
  /**
   * When set, kinematic marker positions are read from this registry
   * (ingested upstream with source timestamps). Omit for legacy
   * in-map ingestion via `htmlMarkers[].kinematic`.
   */
  motionRegistry?: MotionRegistry;
  /** Polylines / trails (drone tracks, engagement lines, mission routes). */
  polylines?: CesiumPolyline[];
  /** Imperatively fly the camera to a position; pass a NEW object each time you want to fly. */
  flyTo?: CesiumMapFlyTo | null;
  /**
   * Imperatively frame a set of points. Wraps Cesium's
   * `flyToBoundingSphere` so the camera ends up tight on the points
   * regardless of frustum aspect or scene mode. Wins over the manual
   * centroid + max-span path that the dashboard used to roll because
   * the latter overshoots on non-square distributions. Pass a NEW
   * object identity each time you want to refit.
   */
  fitBounds?: CesiumMapFitBounds | null;
  /** Scene mode. Defaults to '2D' for the current top-down tactical view. */
  sceneMode?: CesiumSceneMode;
  /**
   * Cesium Ion imagery asset id. Defaults to 2 (Bing Maps Aerial),
   * Ion's standard default. See https://ion.cesium.com for other ids.
   */
  ionImageryAssetId?: number;
  /**
   * Basemap style. `current` uses Cesium Ion imagery (Bing Aerial by
   * default). `monochromeTerrain` uses Carto dark no-labels tiles with
   * lifted brightness/gamma for a tactical chart look.
   */
  mapViewMode?: CesiumMapViewMode;
  /**
   * Live brightness multiplier applied to the active imagery layer
   * (1.0 = identity). Updates flow through a `useEffect` so the parent
   * can wire it to a slider without remounting the viewer. When
   * `undefined`, the component falls back to a sensible default per
   * basemap (dark mode is lifted toward legibility; Ion is left at 1).
   */
  mapBrightness?: number;
  /**
   * Live gamma applied to the active imagery layer (1.0 = identity,
   * <1.0 lightens midtones, >1.0 darkens them). Same live-update story
   * as `mapBrightness`.
   */
  mapGamma?: number;
  /** Called when a `markers[]` entity is clicked (point markers only). */
  onMarkerClick?: (id: string) => void;
  /** Called when a `markers[]` entity is hovered (point markers only). */
  onMarkerHover?: (id: string | null) => void;
  /**
   * Fires after the camera comes to rest (debounced). Receives the
   * current `{lat, lon, heightM}` plus orientation (radians) so a
   * consumer can fully restore the view. In 2D scene mode, `heightM`
   * is the orthographic frustum extent, mirroring the convention of
   * `initialView` and `flyTo`. Use this to persist the camera state
   * between sessions; not intended for high-frequency consumers.
   */
  onCameraChange?: (view: {
    lat: number;
    lon: number;
    heightM: number;
    headingRad: number;
    pitchRad: number;
    rollRad: number;
  }) => void;
  /**
   * Curated scene snapshot — when supplied, the primitive imperatively
   * applies it via `applyCesiumSettings` at every Cesium-stomp checkpoint
   * (bootstrap, scene-mode flip, terrain provider landing, imagery layer
   * swap) so terrain exaggeration, atmosphere, fog, lighting, imagery
   * tint, and space color stay in lock-step with the parent's choice.
   *
   * Production callers pass the `FACTORY_PRESETS` entry matching the
   * operator's `mapViewMode`. The sandbox passes its live `MapSettings`.
   * Leaving it undefined means "use the primitive's hard-coded bootstrap
   * defaults" — `mapBrightness` / `mapGamma` then act as escape hatches.
   */
  preset?: MapSettings;
  /**
   * Sandbox / debugging hook. Fired after the bootstrap effect completes,
   * after the scene-mode effect re-asserts atmosphere/fog defaults, and
   * after the world-terrain provider lands. Lets a consumer re-apply
   * imperative scene tweaks that Cesium-internal mutations would otherwise
   * stomp. Production consumers leave this undefined — when it is, the
   * call sites collapse to a no-op and behaviour is identical.
   *
   * Fires *after* `preset` is applied, so a consumer can layer custom
   * tweaks on top of the curated snapshot.
   */
  onViewerReady?: (viewer: Cesium.Viewer) => void;
  /** Optional className for the wrapping `<div>`. Set width + height here or via parent. */
  className?: string;
}

/**
 * Convert {lat, lon, heightM} → Cartesian3, with a sane height default.
 */
function toCartesian({ lat, lon, heightM }: { lat: number; lon: number; heightM?: number }) {
  return Cesium.Cartesian3.fromDegrees(lon, lat, heightM ?? 1500);
}

/**
 * Build a sector polygon (FOV cone) as an array of Cartographic positions.
 * Returns an array of cartesian points: [origin, arc..., origin].
 */
function buildSectorPositions(
  centerLat: number,
  centerLon: number,
  rangeM: number,
  bearingDeg: number,
  widthDeg: number,
  steps = 24,
): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = [];
  positions.push(Cesium.Cartesian3.fromDegrees(centerLon, centerLat));

  const halfWidth = widthDeg / 2;
  const startBearing = bearingDeg - halfWidth;
  const endBearing = bearingDeg + halfWidth;

  // Earth's radius in meters (used for great-circle offset approximation;
  // accurate enough for visual FOV cones at sensor scale).
  const R = 6_371_000;
  const centerLatRad = (centerLat * Math.PI) / 180;
  const centerLonRad = (centerLon * Math.PI) / 180;
  const angularDistance = rangeM / R;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bearing = startBearing + t * (endBearing - startBearing);
    const bearingRad = (bearing * Math.PI) / 180;

    const lat2Rad = Math.asin(
      Math.sin(centerLatRad) * Math.cos(angularDistance) +
        Math.cos(centerLatRad) * Math.sin(angularDistance) * Math.cos(bearingRad),
    );
    const lon2Rad =
      centerLonRad +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(centerLatRad),
        Math.cos(angularDistance) - Math.sin(centerLatRad) * Math.sin(lat2Rad),
      );

    positions.push(Cesium.Cartesian3.fromDegrees((lon2Rad * 180) / Math.PI, (lat2Rad * 180) / Math.PI));
  }

  positions.push(Cesium.Cartesian3.fromDegrees(centerLon, centerLat));
  return positions;
}

/**
 * Lazy-built spring lookup table for particle easing. Built on first use,
 * then cached.
 */
let SPRING_LUT_CACHE: number[] | null = null;
function getSpringLUT(): number[] {
  if (SPRING_LUT_CACHE) return SPRING_LUT_CACHE;
  const stiffness = 160;
  const damping = 70;
  const mass = 1;
  const steps = 300;
  const dt = 1 / 120;
  let x = 0;
  let v = 0;
  const lut: number[] = [];
  for (let i = 0; i <= steps; i++) {
    lut.push(Math.max(0, Math.min(x, 1.5)));
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt;
    x += v * dt;
  }
  SPRING_LUT_CACHE = lut;
  return lut;
}

function easeSpring(t: number): number {
  const lut = getSpringLUT();
  const idx = t * (lut.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, lut.length - 1);
  return lut[lo] + (lut[hi] - lut[lo]) * (idx - lo);
}

/** Sample terrain height at a lon/lat — mirrors the html-marker path in 3D. */
function groundAltAt(
  globe: Cesium.Globe,
  lon: number,
  lat: number,
  scratch: Cesium.Cartographic,
): number {
  Cesium.Cartographic.fromDegrees(lon, lat, 0, scratch);
  const h = globe.getHeight(scratch);
  return typeof h === 'number' ? h : 0;
}

/** Camera height above which black-sky presets enable atmosphere for globe view. */
const ORBITAL_GLOBE_HEIGHT_M = 400_000;

type ToggleableScene = { show?: boolean };

function configure3DCamera(viewer: Cesium.Viewer): void {
  viewer.scene.globe.show = true;
  const ctrl = viewer.scene.screenSpaceCameraController;
  ctrl.enableCollisionDetection = false;
  ctrl.minimumZoomDistance = 1.0;
  ctrl.maximumZoomDistance = 50_000_000;
  ctrl.zoomFactor = 8;
}

/**
 * Black-sky presets disable atmosphere for tactical ground views, but
 * zooming out needs the atmospheric limb (or a transparent background)
 * to resolve the planet as a globe. Aerial presets always show it.
 */
function syncOrbitalSky(viewer: Cesium.Viewer, preset: MapSettings | undefined): void {
  if (viewer.isDestroyed()) return;
  if (viewer.scene.mode !== Cesium.SceneMode.SCENE3D) return;

  const sky = viewer.scene.skyAtmosphere as unknown as ToggleableScene | undefined;
  if (!sky) return;

  const height = viewer.camera.positionCartographic?.height ?? 0;
  const orbital = height >= ORBITAL_GLOBE_HEIGHT_M;

  if (preset && !preset.sky.atmosphere) {
    sky.show = orbital;
    try {
      viewer.scene.backgroundColor = orbital
        ? Cesium.Color.TRANSPARENT
        : Cesium.Color.fromCssColorString(preset.space.backgroundColor);
    } catch {
      viewer.scene.backgroundColor = orbital ? Cesium.Color.TRANSPARENT : Cesium.Color.BLACK;
    }
  } else {
    sky.show = true;
    viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;
  }
}

const SCENE_MODE_MAP: Record<CesiumSceneMode, Cesium.SceneMode> = {
  '2D': Cesium.SceneMode.SCENE2D,
  '2.5D': Cesium.SceneMode.COLUMBUS_VIEW,
  '3D': Cesium.SceneMode.SCENE3D,
};

export type CesiumMapViewMode = 'current' | 'monochromeTerrain' | 'monochromeLight';

const IMAGERY_DEFAULTS = {
  monochromeTerrain: { brightness: 1.9, gamma: 0.7 },
  monochromeLight: { brightness: 1.0, gamma: 1.0 },
  current: { brightness: 1.0, gamma: 1.0 },
} as const;

function createMonochromeImageryProvider() {
  return new Cesium.UrlTemplateImageryProvider({
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maximumLevel: 19,
    credit: '© OpenStreetMap contributors © CARTO',
  });
}

function createLightMonochromeImageryProvider() {
  return new Cesium.UrlTemplateImageryProvider({
    url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maximumLevel: 19,
    credit: '© OpenStreetMap contributors © CARTO',
  });
}

export function CesiumMap({
  ionToken,
  initialView,
  markers,
  htmlMarkers,
  motionRegistry,
  polylines,
  flyTo,
  fitBounds,
  sceneMode = '2D',
  ionImageryAssetId = 2,
  mapViewMode = 'current',
  mapBrightness,
  mapGamma,
  preset,
  onMarkerClick,
  onMarkerHover,
  onCameraChange,
  onViewerReady,
  className = 'w-full h-full',
}: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  // Mirror the callback in a ref so the bootstrap effect's deps stay
  // empty and the scene-mode effect doesn't churn on every parent render.
  const onViewerReadyRef = useRef(onViewerReady);
  useEffect(() => {
    onViewerReadyRef.current = onViewerReady;
  }, [onViewerReady]);
  const onCameraChangeRef = useRef(onCameraChange);
  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);
  // Same trick for `preset`: kept in a ref so the stomp-checkpoint hooks
  // (bootstrap / scene-mode / terrain-load / imagery-swap) can read the
  // freshest snapshot without their dep arrays growing.
  const presetRef = useRef(preset);
  useEffect(() => {
    presetRef.current = preset;
  }, [preset]);
  const applyPresetIfSet = useCallback((viewer: Cesium.Viewer) => {
    const p = presetRef.current;
    if (!p) return;
    applyCesiumSettings(viewer, p);
    if (viewer.scene.mode === Cesium.SceneMode.SCENE3D) {
      configure3DCamera(viewer);
      syncOrbitalSky(viewer, p);
    }
  }, []);
  /**
   * Coalesced `requestRender()` scheduler. Effect hooks that mutate
   * scene state (markers add/remove, polylines add/remove, brightness
   * change, etc.) all need to nudge Cesium to paint, but if several
   * fire in the same React commit we only need one paint. Scheduling
   * via a microtask collapses N calls in the same tick into 1.
   */
  const renderScheduledRef = useRef(false);
  const scheduleRender = useCallback(() => {
    if (renderScheduledRef.current) return;
    renderScheduledRef.current = true;
    queueMicrotask(() => {
      renderScheduledRef.current = false;
      const v = viewerRef.current;
      if (v && !v.isDestroyed()) v.scene.requestRender();
    });
  }, []);
  /**
   * Active imagery layer ref. We need a handle to the layer (not just
   * the provider) so the brightness / gamma effect can update its
   * post-process knobs without re-adding the layer. In dark mode the
   * provider is synchronous; in Ion mode the layer is created when the
   * `fromAssetId` promise resolves, so this ref is populated
   * asynchronously and the effect re-applies once it lands.
   */
  const imageryLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const imageryRequestIdRef = useRef(0);
  const markerEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const fovEntitiesRef = useRef<Cesium.Entity[]>([]);
  const coverageEntitiesRef = useRef<Cesium.Entity[]>([]);
  /**
   * Geometry entities (FOV / coverage) attached to HTML markers,
   * keyed by `${marker.id}__fov` / `${marker.id}__coverage` with a
   * content fingerprint so the reconciler can skip Cesium work
   * when nothing about a given marker's geometry actually changed.
   * Tearing all entities down and re-adding them every render
   * caused FOV cones to flicker / disappear during 60fps history
   * playback — any marker tick (e.g. the projected target's trail
   * growing) re-mints `htmlMarkers`, even when no FOV did.
   */
  const htmlGeometryEntitiesRef = useRef<
    Map<string, { entity: Cesium.Entity; fingerprint: string }>
  >(new Map());
  /**
   * Polyline entities (trails, engagement lines, etc.) keyed by their
   * stable `CesiumPolyline.id`. Keyed (not array) so the polylines effect
   * can update positions in place rather than tearing down + recreating
   * every entity on each tick.
   */
  const polylineEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());

  /**
   * Per-polyline content fingerprint. The dashboard re-creates the polylines
   * memo every second (because the `friendlyDrones` array reference changes
   * on every tick of its simulation loop), but the underlying trail
   * coordinates only actually grow every 3 ticks. Without the fingerprint
   * check, every tick triggers a position update on Cesium's polyline
   * primitive, which forces it to re-tessellate the line — and that
   * re-tessellation is what shows up as a 1 Hz visual flicker on the trails.
   *
   * Storing length + first + last point catches new-tail-appended,
   * head-trimmed (trail rotation past max length), and full-replacement
   * cases without doing a full content compare.
   */
  const polylineFingerprintRef = useRef<
    Map<string, { len: number; firstLat: number; firstLon: number; lastLat: number; lastLon: number; color: string; width: number; dashed: boolean }>
  >(new Map());

  /**
   * Per-polyline particle entities + endpoint cache. Particles read their
   * `from` / `to` lat-lon from this cache via a `CallbackProperty` so the
   * same particle entity can keep flowing along a line whose endpoints
   * change (e.g. when the engagement pair re-resolves to a different
   * effector); the cache is updated in place, and Cesium's per-frame
   * property evaluation picks up the new endpoints automatically.
   */
  const polylineParticleEntitiesRef = useRef<Map<string, Cesium.Entity[]>>(new Map());
  const polylineParticleEndpointsRef = useRef<
    Map<string, { fromLat: number; fromLon: number; toLat: number; toLon: number }>
  >(new Map());
  const polylineGroundCartoRef = useRef(new Cesium.Cartographic());

  /**
   * Endpoint-interpolation cache for 2-point dashed lines (engagement
   * lines). Stores the *previous* and *current* endpoints together with
   * a timestamp; the polyline's `CallbackProperty` eases between them
   * over a short window so the 1 Hz dashboard tick (target position
   * updates) doesn't snap-jump the line on every change.
   */
  const polylineSmoothEndpointsRef = useRef<
    Map<
      string,
      {
        curr: { fromLat: number; fromLon: number; toLat: number; toLon: number };
        prev: { fromLat: number; fromLon: number; toLat: number; toLon: number };
        changedAt: number;
      }
    >
  >(new Map());

  /** ms over which a 2-point dashed line eases to new endpoints. */
  const SMOOTH_LINE_MS = 300;
  /**
   * Per-frame screen positions for HTML markers. We compute Cartesian once
   * per `htmlMarkers` change, but project to canvas coordinates every frame
   * via the scene's preRender event.
   */
  const htmlMarkerNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const htmlMarkerCartesianRef = useRef<Map<string, Cesium.Cartesian3>>(new Map());
  /**
   * Per-id lat/lon for non-kinematic html markers. Kept alongside the
   * Cartesian3 cache so the per-frame loop can re-project at the terrain
   * surface when in 3D mode (markers default to altitude 0; without a
   * terrain-aware altitude they'd float above hills or sink under them
   * after a 2D → 3D toggle, visibly mis-aligned with the imagery beneath).
   */
  const htmlMarkerCartographicRef = useRef<Map<string, { lat: number; lon: number }>>(new Map());
  /**
   * IDs of static markers whose terrain altitude has been resolved
   * for the current 3D pose. Once a marker lands here the per-frame
   * `preRender` loop skips its `globe.getHeight()` call entirely —
   * the cached Cartesian3 already bakes in the terrain altitude.
   *
   * Invalidated by:
   *   • lat/lon update for that id (the htmlMarkers effect rebuilds
   *     the Cartesian3 cache and clears this set).
   *   • Camera mode change (3D ↔ 2D ↔ Columbus). Static heights
   *     are meaningless in 2D, so we drop everything when leaving
   *     3D and re-sample lazily on entering 3D.
   *
   * Terrain LOD streaming can change a tile's reported height after
   * the first sample, but the visual error is sub-pixel for typical
   * camera distances and the win on per-frame CPU is large
   * (~22 markers × `globe.getHeight` per frame at 30 fps eliminated).
   */
  const htmlMarkerStaticHeightSampledRef = useRef<Set<string>>(new Set());

  /**
   * Per-id motion tracks for `htmlMarkers[m].kinematic === true`. Lat/lon
   * arriving on prop updates is pushed as a sample; the preRender loop
   * queries the track at frame time to get a smoothed (interpolated /
   * extrapolated) render position. See `src/lib/motionTracker.ts`.
   *
   * `kinematicCartesianScratchRef` is a reusable Cartesian3 per kinematic
   * marker so the per-frame loop doesn't allocate a fresh object on every
   * frame. Halo entities live in their own ref so the marker-rebuild
   * effect doesn't tear them down.
   */
  const motionTracksRef = useRef<Map<string, MotionTrack>>(new Map());
  const kinematicCartesianScratchRef = useRef<Map<string, Cesium.Cartesian3>>(new Map());
  const motionRegistryRef = useRef(motionRegistry);
  motionRegistryRef.current = motionRegistry;

  /**
   * Lazy terrain promise. Created on first 2D → 3D transition and
   * reused across subsequent toggles so the operator only pays the
   * tile-decode cost once. 2D-only sessions never instantiate it.
   */
  const terrainPromiseRef = useRef<Promise<Cesium.TerrainProvider> | null>(null);

  // ── Mount-readiness gate ──────────────────────────────────────────────────
  // Defer Viewer construction until the container actually has dimensions.
  // Without this, `<ResizablePanel>` and other "measure-then-size" parents
  // can render us at 0×0 on first paint, which silently breaks Cesium's
  // WebGL context init and leaves us with a half-built viewer.
  const [mountReady, setMountReady] = useState(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const consider = (w: number, h: number) => {
      if (w > MIN_MOUNT_SIZE_PX && h > MIN_MOUNT_SIZE_PX) {
        setMountReady(true);
      }
    };

    const initial = el.getBoundingClientRect();
    consider(initial.width, initial.height);

    // Only job: flip `mountReady` once the container has non-zero size.
    // Cesium's own ResizeObserver handles canvas resize from there on.
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        consider(entry.contentRect.width, entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Bootstrap viewer (mount once container is sized) ──────────────────────
  useEffect(() => {
    if (!mountReady || !containerRef.current) return;

    Cesium.Ion.defaultAccessToken = ionToken;

    let viewer: Cesium.Viewer;
    try {
      viewer = new Cesium.Viewer(containerRef.current, {
        // Strip the widgets we don't need (keeps UI minimal).
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        // Imagery loaded below.
        baseLayer: false as unknown as Cesium.ImageryLayer,
        // Render only when something changes (camera move, requestRender
        // call, etc.) instead of continuously at the monitor refresh
        // rate. The preRender loop below already calls
        // `viewer.scene.requestRender()` for kinematic markers, which
        // is the API contract this mode expects. With this flag idle
        // CPU usage drops dramatically on a still scene.
        requestRenderMode: true,
        // Disable automatic re-renders on simulated time changes (we
        // don't drive a clock animation). Without this, Cesium would
        // request a render every time `Cesium.JulianDate.now()`
        // advances past the threshold, defeating requestRenderMode.
        maximumRenderTimeChange: Infinity,
        // 2 samples is a real edge-smoothing improvement over 1 at
        // half the cost of Cesium's default 4. Combined with the
        // DPR-capped `resolutionScale` below, lines and label outlines
        // read crisp without the fragment-shader cost of full 4x MSAA.
        msaaSamples: 2,
        // Defensive: explicit power-preference + don't bail on
        // integrated-GPU laptops that report a "major performance
        // caveat" (Cesium's default would refuse to init).
        contextOptions: {
          webgl: {
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false,
          },
        },
      });
    } catch (err) {
      console.error('[CesiumMap] Viewer construction failed:', err);
      throw err;
    }

    // Cap the render loop at 30 fps. On 120 Hz ProMotion displays
    // Cesium otherwise paints 4x more frames than a tactical map needs.
    // Combined with `requestRenderMode` above this only matters when
    // something is animating (kinematic markers, camera flyTo, etc.).
    viewer.targetFrameRate = 30;

    // Cap effective DPR at 2 on high-DPR displays. `useBrowserRecommendedResolution`
    // defaults to true — Cesium then *ignores* `devicePixelRatio` and multiplies
    // canvas CSS dimensions by `resolutionScale` alone (see Cesium d.ts:
    // "render at the browser's recommended resolution and ignore
    // window.devicePixelRatio"). So at DPR 2 we need scale=2 for retina-sharp
    // pixels, and we cap at 2 to keep DPR 3 phones from paying 3× fragment cost.
    viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2);

    // Strip scene effects we never see in the default 2D top-down
    // tactical view. Atmosphere/sun/moon/fog/shadows are pure GPU cost
    // when the camera is straight down and the imagery covers the
    // viewport. The scene-mode effect re-enables the depth-cueing
    // ones (atmosphere, fog) when the operator toggles into 3D.
    //
    // The cesium type defs in this version mark these as possibly
    // undefined / lack `.show` on `SkyBox`; the runtime API is stable
    // and well documented — guard with optional chaining and a loose
    // shim so a future Cesium upgrade can't crash the boot path.
    const scene = viewer.scene;
    type Toggleable = { show?: boolean; enabled?: boolean };
    const setShow = (obj: Toggleable | undefined, value: boolean) => {
      if (obj) obj.show = value;
    };
    const setEnabled = (obj: Toggleable | undefined, value: boolean) => {
      if (obj) obj.enabled = value;
    };
    setShow(scene.skyBox as unknown as Toggleable | undefined, false);
    setShow(scene.sun as unknown as Toggleable | undefined, false);
    setShow(scene.moon as unknown as Toggleable | undefined, false);
    setShow(scene.skyAtmosphere as unknown as Toggleable | undefined, false);
    setEnabled(scene.fog as unknown as Toggleable | undefined, false);
    setEnabled(scene.shadowMap as unknown as Toggleable | undefined, false);
    scene.globe.showGroundAtmosphere = false;
    scene.globe.enableLighting = false;
    // Default is 2 (lower = more detail = more tile requests). 4 cuts
    // terrain tile network volume roughly in half at our zoom range
    // without a visually meaningful drop.
    scene.globe.maximumScreenSpaceError = 4;

    // Default inertias (~0.9) feel slippery on trackpads — pan/zoom
    // keeps gliding after the gesture ends, which reads as imprecise
    // on a tactical map where the operator wants the camera to settle
    // on intent. Halve them so the camera locks down promptly while
    // still feeling damped (vs the harsh 0 of "kill all inertia").
    const cam = scene.screenSpaceCameraController;
    cam.inertiaSpin = 0.5;
    cam.inertiaTranslate = 0.5;
    cam.inertiaZoom = 0.5;
    cam.zoomFactor = 8;

    // Basemap imagery is applied by the `mapViewMode` effect below.

    // Cesium World Terrain is loaded lazily on first 3D entry — see
    // the scene-mode effect below. The default `EllipsoidTerrainProvider`
    // is fine for 2D top-down (terrain altitude isn't visible in
    // orthographic projection), and most operators never leave 2D, so
    // saving the network + tile-decode cost on cold start is a
    // material first-paint win. 2D-only sessions never pay for it.

    viewer.scene.mode = SCENE_MODE_MAP[sceneMode];

    // Initial camera position. Use `setView` (instant) + a deliberately tall
    // `heightM` because in `SceneMode.SCENE2D` Cesium's camera "height" is
    // interpreted as the orthographic frustum extent, not a metric distance.
    // 50_000 m gives a city-scale view; the consumer can re-target with the
    // imperative `flyTo` prop afterwards.
    viewer.camera.setView({
      destination: toCartesian({ ...initialView, heightM: initialView.heightM ?? 50_000 }),
      orientation: {
        heading: initialView.headingRad ?? 0,
        pitch: initialView.pitchRad ?? -Cesium.Math.PI_OVER_TWO,
        roll: initialView.rollRad ?? 0,
      },
    });

    applyPresetIfSet(viewer);
    onViewerReadyRef.current?.(viewer);

    // Debounce-fire `onCameraChange` ~400ms after the user stops
    // panning/zooming or a `flyTo` settles, so consumers persisting
    // the view don't thrash localStorage on every easing tick.
    let cameraPersistTimer: number | null = null;
    const removeCameraChanged = viewer.camera.changed.addEventListener(() => {
      const v = viewerRef.current;
      if (!v || v.isDestroyed()) return;
      syncOrbitalSky(v, presetRef.current);
      if (onCameraChangeRef.current) {
        if (cameraPersistTimer != null) window.clearTimeout(cameraPersistTimer);
        cameraPersistTimer = window.setTimeout(() => {
          cameraPersistTimer = null;
          const live = viewerRef.current;
          if (!live || live.isDestroyed()) return;
          const camera = live.camera;
          const carto = camera.positionCartographic;
          if (!carto) return;
          onCameraChangeRef.current?.({
            lat: Cesium.Math.toDegrees(carto.latitude),
            lon: Cesium.Math.toDegrees(carto.longitude),
            heightM: carto.height,
            headingRad: camera.heading,
            pitchRad: camera.pitch,
            rollRad: camera.roll,
          });
        }, 400);
      }
    });

    // The Cesium-entity pick handlers (LEFT_CLICK + MOUSE_MOVE on
    // `markers[]`) are created lazily by the dedicated effect below
    // — only when a consumer actually passes `markers`. `scene.pick`
    // is a per-pixel framebuffer readback that costs a frame; running
    // it on every mouse move when the entire app uses `htmlMarkers`
    // (DOM-handled clicks/hover) is pure overhead.

    // Per-frame sync of DOM-overlay marker positions. Cesium emits
    // `preRender` before each frame; we project each marker's cached
    // Cartesian to canvas coords and translate the corresponding DOM node.
    // Cheap (~20 div translates per frame) and matches what Mapbox does
    // internally for `mapboxgl.Marker`.
    //
    // Visual containment is handled by the wrapping div: it has
    // `overflow-hidden` (clips any marker translated past its bounds) and
    // `isolate` (gives marker `zIndex` values their own stacking context
    // so they can't outrank surrounding chrome like the dashboard's side
    // panel). No explicit bounds check here — `clientWidth`/`clientHeight`
    // can momentarily report 0 during initial layout, which would briefly
    // hide every marker if we gated rendering on them.
    // Reusable Cartographic for the per-frame terrain-height sample.
    // Allocated once at scope; mutated in place per marker per frame to
    // avoid GC churn on a hot path.
    const terrainSampleCarto = new Cesium.Cartographic();
    // Throttle kinematic-driven requestRender() calls to ~30fps. The
    // preRender callback runs every frame Cesium chooses to draw; on
    // request-render mode that means once per requestRender() we make.
    // Without throttling, each kinematic frame schedules another
    // immediate frame, creating an unbounded 60-120 fps loop.
    const KINEMATIC_RENDER_INTERVAL_MS = 33;
    let lastKinematicRenderAt = 0;
    const removePreRender = viewer.scene.preRender.addEventListener(() => {
      const nodes = htmlMarkerNodesRef.current;
      const cartesians = htmlMarkerCartesianRef.current;
      const cartographics = htmlMarkerCartographicRef.current;
      const tracks = motionTracksRef.current;
      const kinematicScratch = kinematicCartesianScratchRef.current;
      if (nodes.size === 0) return;
      const now = Date.now();
      // In 3D mode the imagery is draped over real terrain elevation. Markers
      // default to altitude 0 (ellipsoid) — without sampling terrain height,
      // an icon meant to sit on a 50 m hill ends up 50 m underground (or
      // visibly above when on a depression). This reads as the markers
      // "shifting" when the user toggles 2D → 3D. We sample once per marker
      // per frame; ~22 markers, cheap. In 2D mode the orthographic
      // projection ignores altitude, so we skip the work entirely.
      const isMode3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D;
      const globe = viewer.scene.globe;
      // Kinematic tracks that are still smoothing toward the latest
      // sample or extrapolating forward need the scene to keep
      // rendering — Cesium's request-render mode would otherwise idle
      // out after one frame and the marker would visibly freeze.
      let kinematicActive = false;
      const registry = motionRegistryRef.current;
      for (const [id, node] of nodes) {
        let cart: Cesium.Cartesian3 | undefined;
        const registrySample = registry?.has(id) ? registry.query(id, now) : null;
        const legacyTrack = registrySample ? null : tracks.get(id);
        const kinematicSample = registrySample ?? legacyTrack?.query(now) ?? null;

        if (kinematicSample) {
          const s = kinematicSample;
          const scratch = kinematicScratch.get(id);
          if (scratch) {
            let alt = 0;
            if (isMode3D) {
              Cesium.Cartographic.fromDegrees(s.lon, s.lat, 0, terrainSampleCarto);
              const h = globe.getHeight(terrainSampleCarto);
              if (typeof h === 'number') alt = h;
            }
            Cesium.Cartesian3.fromDegrees(s.lon, s.lat, alt, undefined, scratch);
            cart = scratch;
          }
          if (!s.frozen) kinematicActive = true;
        } else {
          cart = cartesians.get(id);
          // Sample terrain height ONCE per static marker per 3D session.
          // The cached Cartesian3 already carries the resolved altitude
          // for every id present in `htmlMarkerStaticHeightSampledRef`,
          // so re-projecting it costs only the matrix multiply inside
          // `cartesianToCanvasCoordinates` further down.
          //
          // If `globe.getHeight` returns `undefined` (terrain tile not
          // loaded yet at this LOD) we skip caching and re-attempt on
          // the next frame — eventually the tile streams in and we
          // pin the marker to it.
          if (cart && isMode3D && !htmlMarkerStaticHeightSampledRef.current.has(id)) {
            const carto = cartographics.get(id);
            if (carto) {
              Cesium.Cartographic.fromDegrees(carto.lon, carto.lat, 0, terrainSampleCarto);
              const h = globe.getHeight(terrainSampleCarto);
              if (typeof h === 'number') {
                Cesium.Cartesian3.fromDegrees(carto.lon, carto.lat, h, undefined, cart);
                htmlMarkerStaticHeightSampledRef.current.add(id);
              }
            }
          }
        }
        if (!cart) {
          node.style.display = 'none';
          continue;
        }
        const screen = viewer.scene.cartesianToCanvasCoordinates(cart);
        if (!screen) {
          // Off-screen / behind the globe.
          node.style.display = 'none';
          continue;
        }
        node.style.display = '';
        node.style.transform = `translate(-50%, -50%) translate(${screen.x}px, ${screen.y}px)`;
      }
      if (kinematicActive || polylineParticleEntitiesRef.current.size > 0) {
        const nowMs = Date.now();
        if (nowMs - lastKinematicRenderAt >= KINEMATIC_RENDER_INTERVAL_MS) {
          lastKinematicRenderAt = nowMs;
          viewer.scene.requestRender();
        }
      }
    });

    // ── Visibility gate ────────────────────────────────────────────────
    //
    // When the browser tab is hidden (alt-tab, minimised, another window
    // covering it), we don't need to draw anything — but Cesium's
    // request-render loop and our kinematic preRender keep firing
    // ~30 fps. Profiling showed this as the dominant background-tab CPU
    // cost: ~15-25% per Chrome renderer process, even when nothing is
    // visible to the user.
    //
    // Strategy:
    //   • While hidden, flip `useDefaultRenderLoop = false`. Cesium
    //     stops requesting frames entirely; the preRender callback
    //     above stops firing because Cesium isn't drawing.
    //   • On visible, restore `useDefaultRenderLoop = true` and queue
    //     one `requestRender()` so the first visible frame is fresh
    //     (camera + entities may have advanced via simulated time).
    //
    // The `visibilitychange` event fires before the tab is fully
    // backgrounded, so the in-flight frame may still complete — fine,
    // it just means we drop AT-LEAST one frame, not exactly one.
    const handleVisibilityChange = () => {
      const v = viewerRef.current;
      if (!v || v.isDestroyed()) return;
      if (document.hidden) {
        v.useDefaultRenderLoop = false;
      } else {
        v.useDefaultRenderLoop = true;
        v.scene.requestRender();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    // Apply initial state in case the tab mounts already-hidden.
    handleVisibilityChange();

    viewerRef.current = viewer;

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (cameraPersistTimer != null) {
        window.clearTimeout(cameraPersistTimer);
        cameraPersistTimer = null;
      }
      removeCameraChanged();
      removePreRender();
      viewer.destroy();
      viewerRef.current = null;
      markerEntitiesRef.current.clear();
      fovEntitiesRef.current = [];
      coverageEntitiesRef.current = [];
      htmlGeometryEntitiesRef.current.clear();
      polylineEntitiesRef.current.clear();
      polylineFingerprintRef.current.clear();
      polylineParticleEntitiesRef.current.clear();
      polylineParticleEndpointsRef.current.clear();
      polylineSmoothEndpointsRef.current.clear();
      motionTracksRef.current.clear();
      kinematicCartesianScratchRef.current.clear();
      htmlMarkerCartographicRef.current.clear();
      htmlMarkerStaticHeightSampledRef.current.clear();
      imageryLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountReady]);

  // ── Basemap imagery (live swap) ─────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const requestId = ++imageryRequestIdRef.current;
    const defaults = IMAGERY_DEFAULTS[mapViewMode];

    const removeCurrentLayer = () => {
      const layer = imageryLayerRef.current;
      if (!layer || viewer.isDestroyed()) return;
      viewer.imageryLayers.remove(layer, true);
      imageryLayerRef.current = null;
    };

    removeCurrentLayer();

    if (mapViewMode === 'monochromeTerrain' || mapViewMode === 'monochromeLight') {
      const provider =
        mapViewMode === 'monochromeLight'
          ? createLightMonochromeImageryProvider()
          : createMonochromeImageryProvider();
      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.brightness = mapBrightness ?? defaults.brightness;
      layer.gamma = mapGamma ?? defaults.gamma;
      imageryLayerRef.current = layer;
      applyPresetIfSet(viewer);
      scheduleRender();
      return () => {
        imageryRequestIdRef.current++;
        removeCurrentLayer();
      };
    }

    Cesium.IonImageryProvider.fromAssetId(ionImageryAssetId)
      .then((provider) => {
        if (viewer.isDestroyed() || requestId !== imageryRequestIdRef.current) {
          return;
        }
        const layer = viewer.imageryLayers.addImageryProvider(provider);
        layer.brightness = mapBrightness ?? defaults.brightness;
        layer.gamma = mapGamma ?? defaults.gamma;
        imageryLayerRef.current = layer;
        applyPresetIfSet(viewer);
        scheduleRender();
      })
      .catch((err) => {
        if (viewer.isDestroyed() || requestId !== imageryRequestIdRef.current) {
          return;
        }
        console.error('[CesiumMap] failed to load Ion imagery:', err);
      });

    return () => {
      imageryRequestIdRef.current++;
      removeCurrentLayer();
    };
  }, [mapViewMode, ionImageryAssetId, mountReady, scheduleRender]);

  // ── Lazy entity-pick handlers ────────────────────────────────────────────
  // `scene.pick` is a per-pixel framebuffer readback; running it on every
  // mouse move is only worth the cost when the consumer actually renders
  // Cesium-entity markers (the `markers[]` prop). The dashboard exclusively
  // uses `htmlMarkers` (DOM hover/click), so the handler stays unattached
  // there. Effect re-runs if a future consumer toggles `markers` on/off.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !markers || markers.length === 0) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(event.position);
      const id = picked?.id;
      if (id instanceof Cesium.Entity && id.id && onMarkerClick) {
        const markerId = String(id.id);
        if (markerEntitiesRef.current.has(markerId)) onMarkerClick(markerId);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const picked = viewer.scene.pick(event.endPosition);
      const id = picked?.id;
      if (id instanceof Cesium.Entity && id.id && markerEntitiesRef.current.has(String(id.id))) {
        onMarkerHover?.(String(id.id));
      } else {
        onMarkerHover?.(null);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    return () => handler.destroy();
  }, [markers, onMarkerClick, onMarkerHover]);

  const staticHtmlMarkerKey = useMemo(() => {
    if (!htmlMarkers) return '';
    return htmlMarkers
      .filter((m) => !m.kinematic)
      .map((m) => `${m.id}:${m.lat.toFixed(6)}:${m.lon.toFixed(6)}`)
      .join('|');
  }, [htmlMarkers]);

  // ── Static HTML marker Cartesian cache ───────────────────────────────────
  useEffect(() => {
    const cache = htmlMarkerCartesianRef.current;
    const cartographics = htmlMarkerCartographicRef.current;
    cache.clear();
    cartographics.clear();
    htmlMarkerStaticHeightSampledRef.current.clear();
    if (!htmlMarkers) return;
    for (const m of htmlMarkers) {
      if (m.kinematic) continue;
      cache.set(m.id, Cesium.Cartesian3.fromDegrees(m.lon, m.lat));
      cartographics.set(m.id, { lat: m.lat, lon: m.lon });
    }
    scheduleRender();
  }, [staticHtmlMarkerKey, htmlMarkers, scheduleRender]);

  // ── Legacy in-map kinematic ingestion (no upstream registry) ─────────────
  useEffect(() => {
    if (motionRegistry) return;
    if (!htmlMarkers) {
      motionTracksRef.current.clear();
      kinematicCartesianScratchRef.current.clear();
      return;
    }

    const liveKinematicIds = new Set<string>();
    const sampleAt = Date.now();
    for (const m of htmlMarkers) {
      if (!m.kinematic) continue;
      liveKinematicIds.add(m.id);
      let track = motionTracksRef.current.get(m.id);
      if (!track) {
        track = createMotionTrack();
        motionTracksRef.current.set(m.id, track);
        kinematicCartesianScratchRef.current.set(m.id, new Cesium.Cartesian3());
      }
      track.pushSample(m.lat, m.lon, sampleAt, { mode: 'live' });
    }

    for (const id of motionTracksRef.current.keys()) {
      if (!liveKinematicIds.has(id)) {
        motionTracksRef.current.delete(id);
        kinematicCartesianScratchRef.current.delete(id);
      }
    }
    scheduleRender();
  }, [htmlMarkers, motionRegistry, scheduleRender]);

  useEffect(() => {
    if (!motionRegistry || !htmlMarkers) {
      kinematicCartesianScratchRef.current.clear();
      return;
    }
    const scratch = kinematicCartesianScratchRef.current;
    for (const m of htmlMarkers) {
      if (!m.kinematic) continue;
      if (!scratch.has(m.id)) {
        scratch.set(m.id, new Cesium.Cartesian3());
      }
    }
    for (const id of scratch.keys()) {
      const stillKinematic = htmlMarkers.some((m) => m.id === id && m.kinematic);
      if (!stillKinematic) scratch.delete(id);
    }
    scheduleRender();
  }, [htmlMarkers, motionRegistry, scheduleRender]);

  // ── Token (live update) ────────────────────────────────────────────────────
  useEffect(() => {
    Cesium.Ion.defaultAccessToken = ionToken;
  }, [ionToken]);

  // ── Imagery brightness / gamma (live update) ───────────────────────────────
  // When the parent slides the brightness/gamma controls, re-apply the
  // values to the active imagery layer. Falls back to the same defaults
  // the mount-time code uses so dropping the prop reverts the look
  // instead of leaving the layer at its previous slider value.
  //
  // The Ion path adds its imagery asynchronously, so the layer ref may
  // be null on first run; the effect simply no-ops, and the mount-time
  // code re-applies the props once the promise resolves. The viewer
  // also forces a render so the change is visible without waiting for
  // the next interaction tick (camera/marker/etc.).
  useEffect(() => {
    const layer = imageryLayerRef.current;
    if (!layer) return;
    const defaults = IMAGERY_DEFAULTS[mapViewMode];
    layer.brightness = mapBrightness ?? defaults.brightness;
    layer.gamma = mapGamma ?? defaults.gamma;
    scheduleRender();
  }, [mapBrightness, mapGamma, mapViewMode, scheduleRender]);

  // ── Preset (live update) ───────────────────────────────────────────────────
  // Re-apply the curated snapshot whenever the parent swaps it. In
  // production this happens when the operator picks a different map
  // style (mapViewMode change → matching FACTORY_PRESET), but the effect
  // is shape-agnostic so the sandbox's slider-driven settings also flow
  // through here without a remount.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !preset) return;
    applyCesiumSettings(viewer, preset);
    if (viewer.scene.mode === Cesium.SceneMode.SCENE3D) {
      configure3DCamera(viewer);
      syncOrbitalSky(viewer, preset);
    }
    scheduleRender();
  }, [preset, scheduleRender]);

  // ── Scene mode ─────────────────────────────────────────────────────────────
  // In SCENE2D, the camera "height" is interpreted as the orthographic frustum
  // extent (≈ visible canvas height in metres). In SCENE3D, it's the camera's
  // height above ground in a perspective frustum. The default 15 km extent
  // reads as a comfortable city-scale top-down frame in 2D, but lands the
  // user too high in 3D — the city blurs into a satellite shot. When the
  // consumer flips into 3D from a too-high vantage, fly the camera down to
  // a city-zoom altitude with a 45° pitch so the perspective view feels right
  // without losing the operator's centre lat/lon.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const target = SCENE_MODE_MAP[sceneMode];
    if (viewer.scene.mode === target) return;
    viewer.scene.mode = target;
    // Static-marker terrain heights are mode-specific (ignored in 2D,
    // resolved against the globe in 3D). Drop the cache so the next
    // 3D frame re-samples each marker against the freshly-loaded
    // terrain LOD instead of reusing a stale altitude from a prior
    // 3D session.
    htmlMarkerStaticHeightSampledRef.current.clear();

    // Atmosphere + fog read as depth cues in 3D and as wasted fill in
    // 2D. Toggle alongside the scene mode so the tactical top-down
    // view stays clean and the perspective view gets its horizon back.
    // Same defensive shim as the bootstrap — Cesium's type defs are
    // sparse on these but the runtime API is stable.
    const inThreeD = sceneMode === '3D';
    type ToggleableLocal = { show?: boolean; enabled?: boolean };
    const sky = viewer.scene.skyAtmosphere as unknown as ToggleableLocal | undefined;
    if (sky) sky.show = inThreeD;
    viewer.scene.globe.showGroundAtmosphere = inThreeD;
    const fog = viewer.scene.fog as unknown as ToggleableLocal | undefined;
    if (fog) fog.enabled = inThreeD;

    applyPresetIfSet(viewer);
    onViewerReadyRef.current?.(viewer);

    if (sceneMode === '3D') {
      configure3DCamera(viewer);
      syncOrbitalSky(viewer, presetRef.current);

      // Kick off the world-terrain load lazily on first 3D entry. The
      // promise is cached on the ref so subsequent 2D ↔ 3D toggles
      // reuse the resolved provider without re-fetching tiles.
      if (!terrainPromiseRef.current) {
        terrainPromiseRef.current = Cesium.createWorldTerrainAsync();
        terrainPromiseRef.current
          .then((terrain) => {
            const v = viewerRef.current;
            if (!v || v.isDestroyed()) return;
            v.terrainProvider = terrain;
            // Static-marker terrain heights need a fresh sample once
            // the new provider lands — drop the cache so the per-frame
            // loop re-projects each marker against actual elevations.
            htmlMarkerStaticHeightSampledRef.current.clear();
            v.scene.requestRender();
            applyPresetIfSet(v);
            onViewerReadyRef.current?.(v);
          })
          .catch((err) => {
            console.error('[CesiumMap] failed to load world terrain:', err);
            terrainPromiseRef.current = null;
          });
      }

      const cart = viewer.camera.positionCartographic;
      if (cart && cart.height > 6_000) {
        const lat = (cart.latitude * 180) / Math.PI;
        const lon = (cart.longitude * 180) / Math.PI;
        // Oblique side-on shot — terrain reads in 3D, hills cast depth.
        // -30° pitch keeps things closer to horizontal than a top-down
        // bird's-eye, so foreground/background separation is obvious.
        // 2.5 km altitude at this pitch puts the viewer roughly 4–5 km
        // back from the centre point — close enough that drone-scale
        // entities aren't lost in the satellite imagery, far enough
        // that the surrounding terrain context stays visible.
        //
        // The flyTo target is *behind* the centre point (offset along
        // the camera's view direction) so the camera ends up looking
        // toward the centre, not from straight above it.
        const PITCH_DEG = -30;
        const HEIGHT_M = 2_500;
        const pitchRad = Cesium.Math.toRadians(PITCH_DEG);
        const heading = viewer.camera.heading;
        // Offset the destination so that a -30° pitch + position-back
        // -from-target lands the centre near the middle of the screen.
        // distBack = height / tan(|pitch|) — geometric back-up so the
        // look-vector intersects ground at the original centre.
        const distBack = HEIGHT_M / Math.tan(Math.abs(pitchRad));
        // Convert distBack metres into a lat offset along the heading.
        // Heading 0 = north; offset back is opposite (-cos / -sin).
        const dLat = -Math.cos(heading) * (distBack / 111_000);
        const dLon =
          -Math.sin(heading) *
          (distBack / (111_000 * Math.cos((lat * Math.PI) / 180)));
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon + dLon, lat + dLat, HEIGHT_M),
          orientation: {
            pitch: pitchRad,
            heading,
            roll: 0,
          },
          duration: 0.8,
        });
      }
    }
  }, [sceneMode]);

  // ── Markers + FOV + Coverage (rebuild on prop change) ──────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Clear previous.
    for (const entity of markerEntitiesRef.current.values()) {
      viewer.entities.remove(entity);
    }
    markerEntitiesRef.current.clear();
    for (const entity of fovEntitiesRef.current) viewer.entities.remove(entity);
    fovEntitiesRef.current = [];
    for (const entity of coverageEntitiesRef.current) viewer.entities.remove(entity);
    coverageEntitiesRef.current = [];

    if (!markers) return;

    for (const marker of markers) {
      const color = marker.color ?? '#22b8cf';
      const cesiumColor = Cesium.Color.fromCssColorString(color);

      // Pin entity.
      const entity = viewer.entities.add({
        id: marker.id,
        name: marker.label ?? marker.id,
        position: Cesium.Cartesian3.fromDegrees(marker.lon, marker.lat),
        point: {
          pixelSize: 12,
          color: cesiumColor,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: marker.label
          ? {
              text: marker.label,
              font: '12px sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -16),
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
              backgroundPadding: new Cesium.Cartesian2(6, 4),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            }
          : undefined,
      });
      markerEntitiesRef.current.set(marker.id, entity);

      // FOV sector.
      if (marker.fov) {
        const fovEntity = viewer.entities.add({
          id: `${marker.id}__fov`,
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(
              buildSectorPositions(
                marker.lat,
                marker.lon,
                marker.fov.rangeM,
                marker.fov.bearingDeg,
                marker.fov.widthDeg,
              ),
            ),
            material: cesiumColor.withAlpha(0.18),
          },
        });
        fovEntitiesRef.current.push(fovEntity);
      }

      // ECM coverage ring.
      if (marker.coverageRadiusM != null) {
        const coverageEntity = viewer.entities.add({
          id: `${marker.id}__coverage`,
          position: Cesium.Cartesian3.fromDegrees(marker.lon, marker.lat),
          ellipse: {
            semiMajorAxis: marker.coverageRadiusM,
            semiMinorAxis: marker.coverageRadiusM,
            material: cesiumColor.withAlpha(0.10),
          },
        });
        coverageEntitiesRef.current.push(coverageEntity);
      }
    }
  }, [markers]);

  // ── FOV + coverage entities for HTML markers ──────────────────────────────
  // The DOM overlay renders the icon + tooltip; Cesium renders the geometry
  // (terrain-clamped sector polygon for FOV, ellipse for coverage). Per-id
  // reconcile keyed by fingerprint — `htmlMarkers` re-mints on every
  // playback frame (because a moving target's trail forces a new array),
  // so a teardown + re-add loop would flicker the lit FOV cones to black
  // for one frame each tick.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const cache = htmlGeometryEntitiesRef.current;
    const desired = new Set<string>();
    let dirty = false;

    if (htmlMarkers) {
      for (const m of htmlMarkers) {
        if (m.fov) {
          const id = `${m.id}__fov`;
          desired.add(id);
          const color = m.fov.color ?? '#22b8cf';
          const opacity = m.fov.opacity ?? 0.18;
          const fingerprint = `${m.lat.toFixed(6)}|${m.lon.toFixed(6)}|${m.fov.rangeM}|${m.fov.bearingDeg}|${m.fov.widthDeg}|${color}|${opacity}`;
          const cached = cache.get(id);
          if (cached && cached.fingerprint === fingerprint) continue;
          if (cached) viewer.entities.remove(cached.entity);
          const fovColor = Cesium.Color.fromCssColorString(color);
          const entity = viewer.entities.add({
            id,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(
                buildSectorPositions(m.lat, m.lon, m.fov.rangeM, m.fov.bearingDeg, m.fov.widthDeg),
              ),
              material: fovColor.withAlpha(opacity),
            },
          });
          cache.set(id, { entity, fingerprint });
          dirty = true;
        }

        if (m.coverageRadiusM != null) {
          const id = `${m.id}__coverage`;
          desired.add(id);
          const color = m.coverageColor ?? '#22b8cf';
          const fingerprint = `${m.lat.toFixed(6)}|${m.lon.toFixed(6)}|${m.coverageRadiusM}|${color}`;
          const cached = cache.get(id);
          if (cached && cached.fingerprint === fingerprint) continue;
          if (cached) viewer.entities.remove(cached.entity);
          const coverageColor = Cesium.Color.fromCssColorString(color);
          // Fill opacity tuned to read clearly over satellite imagery
          // without burying the markers underneath. The ring is ground-
          // draped (no height), so a geometry outline can't render on
          // terrain — fill alone defines the coverage area.
          const entity = viewer.entities.add({
            id,
            position: Cesium.Cartesian3.fromDegrees(m.lon, m.lat),
            ellipse: {
              semiMajorAxis: m.coverageRadiusM,
              semiMinorAxis: m.coverageRadiusM,
              material: coverageColor.withAlpha(0.25),
            },
          });
          cache.set(id, { entity, fingerprint });
          dirty = true;
        }
      }
    }

    for (const [id, entry] of cache) {
      if (desired.has(id)) continue;
      viewer.entities.remove(entry.entity);
      cache.delete(id);
      dirty = true;
    }

    if (dirty) scheduleRender();
  }, [htmlMarkers, scheduleRender]);

  // ── Polylines (trails, engagement lines, mission routes) ──────────────────
  // Per id: if the content + style fingerprint is identical to the previous
  // run, skip Cesium entirely. Otherwise update existing positions / material
  // / width in place, or add a fresh entity for unseen ids. Static
  // polylines (trails, mission routes, scan fans) get `clampToGround: true`
  // so they drape on terrain in 3D mode — at altitude=0 they otherwise
  // float visibly above the imagery wherever terrain rises above sea
  // level. The fingerprint short-circuit means re-tessellation only fires
  // when content actually changes, so the cost is bounded. Smoothed
  // 2-point engagement lines (CallbackProperty positions) keep
  // clampToGround off — re-tessellating per frame would tank perf.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const existing = polylineEntitiesRef.current;
    const fingerprints = polylineFingerprintRef.current;
    const particleEntities = polylineParticleEntitiesRef.current;
    const particleEndpoints = polylineParticleEndpointsRef.current;
    const desiredIds = new Set<string>();
    let scheduledRender = false;

    if (polylines) {
      for (const line of polylines) {
        if (line.points.length < 2) continue;
        desiredIds.add(line.id);

        const first = line.points[0];
        const last = line.points[line.points.length - 1];
        const colorCss = line.color ?? '#22b8cf';
        const width = line.width ?? 2;
        const dashed = line.dashed === true;
        const next = {
          len: line.points.length,
          firstLat: first.lat,
          firstLon: first.lon,
          lastLat: last.lat,
          lastLon: last.lon,
          color: colorCss,
          width,
          dashed,
        };

        const prev = fingerprints.get(line.id);
        const entity = existing.get(line.id);
        const sameAsPrev =
          prev &&
          prev.len === next.len &&
          prev.firstLat === next.firstLat &&
          prev.firstLon === next.firstLon &&
          prev.lastLat === next.lastLat &&
          prev.lastLon === next.lastLon &&
          prev.color === next.color &&
          prev.width === next.width &&
          prev.dashed === next.dashed;

        // 2-point dashed lines (engagement-line style) use a smoothing path:
        // the entity is created once with a `CallbackProperty` for positions
        // that eases between the previous and current endpoints over
        // `SMOOTH_LINE_MS`. The 1 Hz dashboard tick (target position update)
        // therefore plays as a 300 ms ease-out instead of a hard snap, which
        // is what was reading as "glitching" on the engagement line. The
        // particle dots already tracked the same endpoints so they smooth too.
        const isSmoothed = dashed && line.points.length === 2;
        if (isSmoothed) {
          const nowMs = Date.now();
          const history = polylineSmoothEndpointsRef.current.get(line.id);
          const newCurr = {
            fromLat: first.lat,
            fromLon: first.lon,
            toLat: last.lat,
            toLon: last.lon,
          };
          if (history) {
            // Snapshot the previous "curr" as "prev" iff endpoints actually
            // moved — otherwise we'd reset the easing every memo recompute,
            // making the line visibly twitch on no-op updates.
            const moved =
              history.curr.fromLat !== newCurr.fromLat ||
              history.curr.fromLon !== newCurr.fromLon ||
              history.curr.toLat !== newCurr.toLat ||
              history.curr.toLon !== newCurr.toLon;
            if (moved) {
              polylineSmoothEndpointsRef.current.set(line.id, {
                curr: newCurr,
                prev: history.curr,
                changedAt: nowMs,
              });
            }
          } else {
            // First sighting — start with prev = curr so no easing occurs
            // on initial render.
            polylineSmoothEndpointsRef.current.set(line.id, {
              curr: newCurr,
              prev: newCurr,
              changedAt: nowMs,
            });
          }
        }

        // Particle endpoints always need to track the latest first / last
        // points, even on otherwise-unchanged updates, so the moving dots
        // re-target if the engagement pair switches mid-flight.
        if (line.particles && line.particles.count > 0) {
          particleEndpoints.set(line.id, {
            fromLat: first.lat,
            fromLon: first.lon,
            toLat: last.lat,
            toLon: last.lon,
          });
        }

        if (entity && sameAsPrev) {
          // No change → don't touch Cesium polyline. The endpoint cache
          // above still got refreshed so any in-flight particle animation
          // tracks the new positions on its next frame.
          continue;
        }

        const cesiumColor = Cesium.Color.fromCssColorString(colorCss);
        // Static dashed pattern. Animated dashes (sliding along the line)
        // are deferred — see `docs/cesium-engagement-line-dash-animation.md`
        // for the attempts that didn't land. The 3 spring-eased particle
        // dots provide the flow direction in the meantime.
        const material = dashed
          ? new Cesium.PolylineDashMaterialProperty({ color: cesiumColor, dashLength: 12 })
          : new Cesium.ColorMaterialProperty(cesiumColor);

        if (entity?.polyline) {
          if (!isSmoothed) {
            // Trails / non-smoothed lines: replace positions directly. The
            // smoothed lines never reach this branch because their entity
            // keeps the same `CallbackProperty` for its lifetime — only
            // material / width get patched here when we fall through.
            const positions = line.points.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat));
            entity.polyline.positions = new Cesium.ConstantProperty(positions);
          }
          entity.polyline.material = material;
          entity.polyline.width = new Cesium.ConstantProperty(width);
        } else if (isSmoothed) {
          // First creation of a smoothed engagement line: install the
          // interpolating CallbackProperty. The two-element Cartesian3
          // array is reused across frames (mutated in place) so Cesium's
          // polyline primitive doesn't see "new array reference" churn.
          const lineId = line.id;
          const cachedArr: Cesium.Cartesian3[] = [
            new Cesium.Cartesian3(),
            new Cesium.Cartesian3(),
          ];
          const positionsProp = new Cesium.CallbackProperty((_time, _result) => {
            const ep = polylineSmoothEndpointsRef.current.get(lineId);
            if (!ep) return cachedArr;
            const elapsed = Date.now() - ep.changedAt;
            const tNorm = Math.min(1, Math.max(0, elapsed / SMOOTH_LINE_MS));
            // Ease-out cubic — fast at first, settles softly into the
            // new endpoint. Avoids the sharp 1 Hz snap.
            const eased = 1 - Math.pow(1 - tNorm, 3);
            const fromLat = ep.prev.fromLat + (ep.curr.fromLat - ep.prev.fromLat) * eased;
            const fromLon = ep.prev.fromLon + (ep.curr.fromLon - ep.prev.fromLon) * eased;
            const toLat = ep.prev.toLat + (ep.curr.toLat - ep.prev.toLat) * eased;
            const toLon = ep.prev.toLon + (ep.curr.toLon - ep.prev.toLon) * eased;
            const v = viewerRef.current;
            let fromAlt = 0;
            let toAlt = 0;
            if (v && !v.isDestroyed() && v.scene.mode === Cesium.SceneMode.SCENE3D) {
              const scratch = polylineGroundCartoRef.current;
              fromAlt = groundAltAt(v.scene.globe, fromLon, fromLat, scratch);
              toAlt = groundAltAt(v.scene.globe, toLon, toLat, scratch);
            }
            Cesium.Cartesian3.fromDegrees(fromLon, fromLat, fromAlt, undefined, cachedArr[0]);
            Cesium.Cartesian3.fromDegrees(toLon, toLat, toAlt, undefined, cachedArr[1]);
            return cachedArr;
          }, false);
          const clampGround = sceneMode === '3D';
          const fresh = viewer.entities.add({
            id: `${lineId}__polyline`,
            polyline: {
              positions: positionsProp,
              width,
              material,
              clampToGround: clampGround,
            },
          });
          existing.set(lineId, fresh);
        } else {
          const positions = line.points.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat));
          const fresh = viewer.entities.add({
            id: `${line.id}__polyline`,
            polyline: {
              positions,
              width,
              material,
              // Drape the polyline on terrain so trails follow the
              // actual ground surface in 3D mode rather than floating
              // at sea level above the imagery. Cesium's GroundPrimitive
              // path tessellates the line into ground-clamped strips;
              // re-tessellation cost is negligible because static lines
              // (trails, mission routes, scan fans) only re-create their
              // entity when content actually changes (fingerprint check
              // earlier in this loop). The smoothed-engagement-line
              // branch above doesn't get this — its CallbackProperty
              // positions would re-tessellate every frame.
              clampToGround: true,
              // zIndex resolves z-fighting between two ground polylines
              // occupying the same path — e.g. a black casing + white
              // centreline trail. Higher z-index draws on top.
              zIndex: line.zIndex ?? 0,
            },
          });
          existing.set(line.id, fresh);
        }
        fingerprints.set(line.id, next);
        scheduledRender = true;

        // Spawn particle entities the first time we see a polyline that
        // requested them. The CallbackProperty closure reads from the
        // endpoints ref, so the same entity follows whatever the latest
        // start / end points are without us having to recreate it.
        if (line.particles && line.particles.count > 0 && !particleEntities.has(line.id)) {
          const count = line.particles.count;
          const speed = line.particles.speed ?? 0.25;
          const dotColor = Cesium.Color.fromCssColorString(line.particles.color ?? colorCss);
          const lineId = line.id;
          const created: Cesium.Entity[] = [];
          for (let i = 0; i < count; i++) {
            const phaseOffset = i / count;
            // `Entity.position` requires a `PositionProperty` subclass.
            // `CallbackProperty` works for `polyline.positions` etc. but
            // the entity-level `position` field silently no-ops on it,
            // which is why the dots looked frozen. `CallbackPositionProperty`
            // is Cesium's purpose-built variant for animated entity
            // positions and is what we need here.
            //
            // The closure also eases between the previous and current
            // endpoints (via `polylineSmoothEndpointsRef`) when the line
            // is smoothed, so the dots travel along the same eased path
            // as the line itself instead of skipping ahead each tick.
            const positionProp = new Cesium.CallbackPositionProperty((_time, result) => {
              const endpoints = polylineParticleEndpointsRef.current.get(lineId);
              if (!endpoints) {
                return Cesium.Cartesian3.fromDegrees(0, 0, 0, undefined, result);
              }
              // If the line is smoothed, sample the eased endpoints so the
              // particle path matches the line's interpolated geometry.
              const smooth = polylineSmoothEndpointsRef.current.get(lineId);
              let fromLat = endpoints.fromLat;
              let fromLon = endpoints.fromLon;
              let toLat = endpoints.toLat;
              let toLon = endpoints.toLon;
              if (smooth) {
                const sElapsed = Date.now() - smooth.changedAt;
                const sNorm = Math.min(1, Math.max(0, sElapsed / SMOOTH_LINE_MS));
                const sEased = 1 - Math.pow(1 - sNorm, 3);
                fromLat = smooth.prev.fromLat + (smooth.curr.fromLat - smooth.prev.fromLat) * sEased;
                fromLon = smooth.prev.fromLon + (smooth.curr.fromLon - smooth.prev.fromLon) * sEased;
                toLat = smooth.prev.toLat + (smooth.curr.toLat - smooth.prev.toLat) * sEased;
                toLon = smooth.prev.toLon + (smooth.curr.toLon - smooth.prev.toLon) * sEased;
              }
              const t = ((Date.now() / 1000) * speed + phaseOffset) % 1;
              const eased = easeSpring(t);
              const lon = fromLon + (toLon - fromLon) * eased;
              const lat = fromLat + (toLat - fromLat) * eased;
              let alt = 0;
              const v = viewerRef.current;
              if (v && !v.isDestroyed() && v.scene.mode === Cesium.SceneMode.SCENE3D) {
                const scratch = polylineGroundCartoRef.current;
                const fromAlt = groundAltAt(v.scene.globe, fromLon, fromLat, scratch);
                const toAlt = groundAltAt(v.scene.globe, toLon, toLat, scratch);
                alt = fromAlt + (toAlt - fromAlt) * eased;
              }
              return Cesium.Cartesian3.fromDegrees(lon, lat, alt, undefined, result);
            }, false);
            const particleEntity = viewer.entities.add({
              id: `${lineId}__particle-${i}`,
              position: positionProp,
              point: {
                pixelSize: 8,
                color: dotColor,
                outlineColor: dotColor.withAlpha(0.4),
                outlineWidth: 4,
                heightReference:
                  sceneMode === '3D'
                    ? Cesium.HeightReference.CLAMP_TO_GROUND
                    : Cesium.HeightReference.NONE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              },
            });
            created.push(particleEntity);
          }
          particleEntities.set(lineId, created);
        }
      }
    }

    // Remove entities that are no longer in the desired set.
    for (const [id, entity] of existing) {
      if (!desiredIds.has(id)) {
        viewer.entities.remove(entity);
        existing.delete(id);
        fingerprints.delete(id);
        polylineSmoothEndpointsRef.current.delete(id);
        scheduledRender = true;
      }
    }
    // Tear down particles for any line that's no longer present.
    for (const [id, particles] of particleEntities) {
      if (!desiredIds.has(id)) {
        for (const p of particles) viewer.entities.remove(p);
        particleEntities.delete(id);
        particleEndpoints.delete(id);
        scheduledRender = true;
      }
    }

    // Engagement lines are created once with a CallbackProperty; when the
    // operator toggles 2D ↔ 3D we need to flip ground clamping on the
    // existing entities without waiting for endpoint movement.
    const clampGround = sceneMode === '3D';
    if (polylines) {
      for (const line of polylines) {
        if (!desiredIds.has(line.id)) continue;
        const isSmoothed = line.dashed && line.points.length === 2;
        if (!isSmoothed) continue;
        const entity = existing.get(line.id);
        if (entity?.polyline) {
          entity.polyline.clampToGround = new Cesium.ConstantProperty(clampGround);
        }
        const particles = particleEntities.get(line.id);
        if (particles) {
          const heightRef = clampGround
            ? Cesium.HeightReference.CLAMP_TO_GROUND
            : Cesium.HeightReference.NONE;
          for (const p of particles) {
            if (p.point) {
              p.point.heightReference = new Cesium.ConstantProperty(heightRef);
            }
          }
        }
      }
    }

    if (scheduledRender) scheduleRender();
  }, [polylines, sceneMode, scheduleRender]);

  // ── Imperative fly-to ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!flyTo || !viewerRef.current) return;
    viewerRef.current.camera.flyTo({
      destination: toCartesian({ lat: flyTo.lat, lon: flyTo.lon, heightM: flyTo.heightM ?? 1500 }),
      duration: flyTo.durationSec ?? 1.2,
    });
  }, [flyTo]);

  // ── Imperative fit-bounds (BoundingSphere) ───────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !fitBounds || fitBounds.points.length === 0) return;
    const cartesians = fitBounds.points.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat));
    const sphere = Cesium.BoundingSphere.fromPoints(cartesians);
    if (sphere.radius <= 0) {
      // Single-point or coincident — fall back to a flat fly-to with a
      // sensible default extent. flyToBoundingSphere with radius 0 is
      // a no-op in Cesium.
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(fitBounds.points[0].lon, fitBounds.points[0].lat, 5_000),
        duration: fitBounds.durationSec ?? 1.4,
      });
      return;
    }
    const padded = new Cesium.BoundingSphere(sphere.center, sphere.radius * (fitBounds.padding ?? 1.2));
    viewer.camera.flyToBoundingSphere(padded, {
      duration: fitBounds.durationSec ?? 1.4,
    });
  }, [fitBounds]);

  // Stable ref-callback factory for the per-marker DOM node tracking.
  // Lives at the parent so `HtmlMarkerNode` can safely memoize on a
  // stable function identity — without it, every parent re-render
  // would mint a fresh ref-callback per marker and defeat the memo.
  const setMarkerNode = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) htmlMarkerNodesRef.current.set(id, node);
    else htmlMarkerNodesRef.current.delete(id);
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {/*
        DOM-overlay container. Sits absolutely over the Cesium canvas with
        `pointer-events: none` so clicks fall through to the scene unless
        a child element explicitly opts in via `pointer-events: auto`.
        Each marker is positioned via the `transform` set in the per-frame
        sync above; it never re-renders unless the React tree changes.

        The parent container's className is provided by the consumer and
        already establishes a positioning context (`absolute inset-0` in
        the dashboard, `w-full h-full` in the styleguide). We don't append
        `relative` here because that would override `position: absolute`
        in the dashboard chain and collapse the container to 0×0.
      */}
      {/*
        Stack the overlay explicitly above the Cesium canvas (which Cesium
        appends to the same `containerRef` after React mounts, so a plain
        `z-auto` overlay would lose to it in source-order tie-break) and
        below dashboard chrome that sits higher in the document — the side
        panel uses `z-30`, so a single-digit z-index here keeps markers
        on top of the map without breaking out of the dashboard's stack.
        `position: absolute` + a numeric z-index also creates a stacking
        context, so the per-marker `zIndex` values (10..60) only compete
        with each other instead of bubbling up to the document root.
      */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]">
        {htmlMarkers?.map((m) => (
          <HtmlMarkerNode key={m.id} marker={m} setNode={setMarkerNode} />
        ))}
      </div>
    </div>
  );
}

/**
 * Per-marker DOM wrapper. Memoized on the marker object reference, so
 * when the parent stabilizes per-id marker references via fingerprint
 * caching, hover-driven parent re-renders skip reconciling unchanged
 * markers entirely. Only the marker whose hover state actually flipped
 * gets a new object ref and reconciles.
 */
const HtmlMarkerNode = memo(function HtmlMarkerNode({
  marker,
  setNode,
}: {
  marker: CesiumHtmlMarker;
  setNode: (id: string, node: HTMLDivElement | null) => void;
}) {
  const id = marker.id;
  const refCb = useCallback((node: HTMLDivElement | null) => setNode(id, node), [id, setNode]);
  return (
    <div
      ref={refCb}
      onClick={marker.onClick}
      onContextMenu={marker.onContextMenu}
      onMouseEnter={marker.onMouseEnter}
      onMouseLeave={marker.onMouseLeave}
      className="pointer-events-auto absolute top-0 left-0"
      style={{
        zIndex: marker.zIndex,
        display: 'none',
        willChange: 'transform',
      }}
    >
      {marker.content}
    </div>
  );
});
