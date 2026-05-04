/**
 * CesiumMap — generic CesiumJS viewer primitive.
 *
 * Drop-in component that wraps `Cesium.Viewer` with a prop-driven API for the
 * common surface our existing Mapbox-based map exposes:
 *
 *   - basemap selection (Cesium Ion imagery, default Bing Aerial)
 *   - 2D / 2.5D / 3D scene mode
 *   - marker pins with click + hover
 *   - sensor FOV cone (sector polygon) and ECM coverage circle
 *   - imperative fly-to via prop
 *
 * No app-domain coupling. Pass your own data via props.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { createMotionTrack, type MotionTrack } from '@/lib/motionTracker';
import { mark, measure } from '@/lib/perf/measure';

/**
 * Dev-only diagnostic logging. Cesium errors are useful while building
 * the dashboard but in production they (a) leak the [CesiumMap] tag to
 * end users' devtools, (b) cost CPU on the (rare) error paths, and
 * (c) clutter Sentry-style error pipes. Gate them behind the Vite dev
 * flag so they're tree-shaken from prod bundles entirely.
 */
const devError =
  import.meta.env.DEV
    ? (...args: unknown[]) => console.error(...args)
    : () => {};

/**
 * Minimum container size (px) before we're willing to construct
 * `Cesium.Viewer`. Below this, WebGL context init can fail silently and leave
 * the viewer in a "half-built" state where `_cesiumWidget` is undefined,
 * which then explodes on the first public-getter access. Mirrors the same
 * threshold our Mapbox path uses for `mapbox-gl`.
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
   * settles into the target — mirrors Mapbox's `useEngagementLine` look.
   */
  particles?: {
    /** Number of dots flowing along the line. Mapbox uses 3. */
    count: number;
    /** Core dot colour. Defaults to the line's `color`. */
    color?: string;
    /** Cycles per second. `0.25` ≈ 4 s loop, matching Mapbox. */
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
  /** Initial camera target. Required so we don't open over the equator. */
  initialView: { lat: number; lon: number; heightM?: number };
  /** Markers to render as Cesium points/entities (cheap, GPU). */
  markers?: CesiumMarker[];
  /** Markers rendered as DOM overlays positioned via scene transforms. */
  htmlMarkers?: CesiumHtmlMarker[];
  /** Polylines / trails (drone tracks, engagement lines, mission routes). */
  polylines?: CesiumPolyline[];
  /** Imperatively fly the camera to a position; pass a NEW object each time you want to fly. */
  flyTo?: CesiumMapFlyTo | null;
  /** Scene mode. Defaults to '2D' for parity with our current top-down Mapbox view. */
  sceneMode?: CesiumSceneMode;
  /**
   * Cesium Ion imagery asset id. Defaults to 2 (Bing Maps Aerial),
   * Ion's standard default. See https://ion.cesium.com for other ids.
   */
  ionImageryAssetId?: number;
  /** Called when a `markers[]` entity is clicked (point markers only). */
  onMarkerClick?: (id: string) => void;
  /** Called when a `markers[]` entity is hovered (point markers only). */
  onMarkerHover?: (id: string | null) => void;
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
 * Lazy-built spring lookup table for particle easing. Same physics
 * constants as `useEngagementLine.ts` so the Cesium and Mapbox paths
 * accelerate / settle identically. Built on first use, then cached.
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

const SCENE_MODE_MAP: Record<CesiumSceneMode, Cesium.SceneMode> = {
  '2D': Cesium.SceneMode.SCENE2D,
  '2.5D': Cesium.SceneMode.COLUMBUS_VIEW,
  '3D': Cesium.SceneMode.SCENE3D,
};

/**
 * Lazy world-terrain loader, shared across viewers. Streaming Cesium World
 * Terrain (Ion asset 1) costs nothing visually in 2D — but it still spins
 * up tile requests in the background. We defer the load until the first
 * 3D switch and reuse the resolved provider across viewer instances.
 */
let WORLD_TERRAIN_PROMISE: Promise<Cesium.TerrainProvider> | null = null;
async function ensureWorldTerrain(viewer: Cesium.Viewer): Promise<void> {
  try {
    if (!WORLD_TERRAIN_PROMISE) {
      WORLD_TERRAIN_PROMISE = Cesium.createWorldTerrainAsync();
    }
    const terrain = await WORLD_TERRAIN_PROMISE;
    if (viewer.isDestroyed()) return;
    if (viewer.terrainProvider !== terrain) {
      viewer.terrainProvider = terrain;
      viewer.scene.requestRender();
    }
  } catch (err) {
    if (viewer.isDestroyed()) return;
    devError('[CesiumMap] failed to load world terrain:', err);
    // Reset the cache so a future 3D switch can retry rather than
    // resolving instantly to a rejected promise.
    WORLD_TERRAIN_PROMISE = null;
  }
}

export function CesiumMap({
  ionToken,
  initialView,
  markers,
  htmlMarkers,
  polylines,
  flyTo,
  sceneMode = '2D',
  ionImageryAssetId = 2,
  onMarkerClick,
  onMarkerHover,
  className = 'w-full h-full',
}: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const markerEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const fovEntitiesRef = useRef<Cesium.Entity[]>([]);
  const coverageEntitiesRef = useRef<Cesium.Entity[]>([]);
  /** Geometry entities (FOV / coverage) attached to HTML markers. */
  // HTML-marker FOV / coverage entities, keyed by `${markerId}__fov` and
  // `${markerId}__coverage`. We diff in place with a per-entity content
  // fingerprint so high-frequency `htmlMarkers` rebuilds (friendly drone
  // patrols update at >4 Hz) don't tear down and re-tessellate ground-
  // clamped polygons that haven't actually changed.
  const htmlGeometryEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const htmlGeometryFingerprintRef = useRef<Map<string, string>>(new Map());
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
   * Cached `globe.getHeight()` result per marker keyed by `${lat},${lon}`.
   * `globe.getHeight` walks the loaded terrain tile tree on every call —
   * cheap individually, but with 20+ static markers and a 30 FPS render
   * loop it becomes hundreds of tile lookups per second. We re-sample
   * lazily: when the marker's lat/lon changes, when the cached value is
   * still null/undefined (terrain tile loaded after the first attempt),
   * or when a new globe tile finishes loading (handled by clearing the
   * cache below).
   */
  const htmlMarkerTerrainHeightRef = useRef<Map<string, { key: string; height: number | undefined }>>(new Map());
  /**
   * Tracks which static (non-kinematic) markers have already had their
   * canvas position written for the current camera pose. While the
   * camera is idle their CSS transform doesn't need to be re-issued —
   * the browser keeps the existing layered transform without re-pasting
   * a string of identical bytes 30 times a second. Cleared on camera
   * movement (see camera.changed listener) and on htmlMarkers prop
   * changes (cache rebuild).
   */
  const staticProjectedRef = useRef<Set<string>>(new Set());

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

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        consider(entry.contentRect.width, entry.contentRect.height);
        // Cesium's auto-resize handles canvas dimensions, but in 2D mode
        // the orthographic frustum doesn't always redraw until interaction.
        // Force a render so the imagery stays sharp on container resize.
        viewerRef.current?.scene.requestRender();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Bootstrap viewer (mount once container is sized) ──────────────────────
  useEffect(() => {
    if (!mountReady || !containerRef.current) return;

    Cesium.Ion.defaultAccessToken = ionToken;

    // #region agent log
    const __dbgViewerId = `viewer_${Math.random().toString(36).slice(2, 8)}_${Date.now()}`;
    const __dbg = (loc: string, hyp: string, message: string, data: Record<string, unknown>): void => {
      fetch('http://127.0.0.1:7266/ingest/86ca69bf-eb7c-4994-9aae-fe544ebf4b6e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '70413c' },
        body: JSON.stringify({
          sessionId: '70413c',
          hypothesisId: hyp,
          location: `CesiumMap.tsx:${loc}`,
          message,
          data: { viewerId: __dbgViewerId, ...data },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    };
    __dbg('viewer-bootstrap', 'H5', 'Viewer effect started', {
      mountReady,
      containerSize: { w: containerRef.current?.clientWidth, h: containerRef.current?.clientHeight },
      tokenPresent: !!ionToken,
      sceneMode,
    });
    // #endregion

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
        // Don't render at the device pixel ratio — on retina displays
        // Cesium otherwise renders at 2x or 3x, which roughly doubles or
        // triples fragment shader work for no perceptible quality gain
        // on a satellite-imagery basemap. We cap DPR via `resolutionScale`
        // below.
        useBrowserRecommendedResolution: false,
        // Imagery loaded below.
        baseLayer: false as unknown as Cesium.ImageryLayer,
      });
    } catch (err) {
      // Surface the real error instead of letting it cascade through React's
      // boundary as the cryptic "scene of undefined" we used to see.
      devError('[CesiumMap] Viewer construction failed:', err);
      throw err;
    }

    // ── Render-loop tuning ──────────────────────────────────────────────
    // Cesium defaults to a continuous render loop (~60 FPS) regardless of
    // whether anything actually changed. For an operator console showing
    // a mostly-static map with a handful of moving markers, that's a huge
    // amount of wasted GPU. Switch to on-demand rendering: the scene only
    // re-renders when something explicitly calls `scene.requestRender()`.
    //
    // The `preRender` callback below already issues `requestRender()`
    // while kinematic markers, particles, or smoothing engagement lines
    // are active, so animations keep ticking; once they settle the scene
    // truly idles. `maximumRenderTimeChange = Infinity` disables the
    // simulation-clock heuristic that would otherwise force a frame
    // every few seconds even when nothing needs redrawing.
    viewer.scene.requestRenderMode = true;
    viewer.scene.maximumRenderTimeChange = Infinity;
    // Cap effective DPR — 1.5 keeps imagery sharp on retina without
    // paying for a full 2x/3x raster. Falls back to 1 on platforms
    // without devicePixelRatio.
    const dpr = typeof window !== 'undefined' && window.devicePixelRatio
      ? window.devicePixelRatio
      : 1;
    viewer.resolutionScale = Math.min(1.5, dpr);

    // ── Disable expensive scene effects we don't need ──────────────────
    // We render an operator console, not a planetarium. Atmospheric fog,
    // sky atmosphere, sky box, sun and moon entities all run their own
    // shaders + per-frame work for purely cosmetic effect on a top-down
    // satellite-imagery view. Disabling them shaves measurable GPU time
    // off every requested frame.
    viewer.scene.fog.enabled = false;
    if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = false;
    if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
    if (viewer.scene.sun) viewer.scene.sun.show = false;
    if (viewer.scene.moon) viewer.scene.moon.show = false;
    // FXAA is a fragment-shader pass that smooths edges; on a satellite
    // basemap with sharp HTML markers the cost outweighs the benefit.
    if (viewer.scene.postProcessStages.fxaa) {
      viewer.scene.postProcessStages.fxaa.enabled = false;
    }
    // Cap globe LOD aggressiveness — 2 ≈ a tile-resolution drop in the
    // mid-distance, invisible at the operator's typical zoom but cuts
    // tile-fetch + tessellation cost roughly in half. Default is 2 in
    // current Cesium; setting it explicitly documents intent.
    viewer.scene.globe.maximumScreenSpaceError = 2;
    viewer.scene.globe.preloadAncestors = false;
    viewer.scene.globe.preloadSiblings = false;
    // Cap the render loop at 30 FPS — operators can't perceive the
    // difference between 30 and 60 FPS for ground-clamped markers, and
    // the cap halves the render budget. Combined with `requestRenderMode`
    // above, this is an upper bound on idle waste, not the typical rate.
    viewer.targetFrameRate = 30;

    // Bing Aerial via Cesium Ion (asset 2 by default). Guard against the
    // viewer being destroyed (StrictMode double-mount, fast nav) before the
    // imagery promise resolves — otherwise we crash inside Cesium internals.
    // #region agent log
    const __dbgImageryRequestedAt = performance.now();
    __dbg('imagery-request', 'H1', 'IonImageryProvider.fromAssetId requested', {
      assetId: ionImageryAssetId,
      tokenLen: ionToken?.length ?? 0,
    });
    // #endregion
    Cesium.IonImageryProvider.fromAssetId(ionImageryAssetId)
      .then((provider) => {
        // #region agent log
        const carto = Cesium.Cartographic.fromCartesian(viewer.camera.position);
        __dbg('imagery-resolved', 'H1+H2+H3+H5', 'IonImageryProvider resolved', {
          elapsedMs: Math.round(performance.now() - __dbgImageryRequestedAt),
          destroyed: viewer.isDestroyed(),
          providerCtor: provider.constructor?.name,
          imageryLayerCountBefore: viewer.imageryLayers.length,
          useDefaultRenderLoop: viewer.useDefaultRenderLoop,
          requestRenderMode: viewer.scene.requestRenderMode,
          canvas: { w: viewer.scene.canvas.clientWidth, h: viewer.scene.canvas.clientHeight, dw: viewer.scene.canvas.width, dh: viewer.scene.canvas.height },
          sceneMode: viewer.scene.mode,
          globeShow: viewer.scene.globe.show,
          camera: { lat: Cesium.Math.toDegrees(carto.latitude), lon: Cesium.Math.toDegrees(carto.longitude), heightM: Math.round(carto.height) },
        });
        // #endregion
        if (viewer.isDestroyed()) return;
        viewer.imageryLayers.addImageryProvider(provider);
        // With `requestRenderMode = true`, adding an imagery layer
        // doesn't always seed the first render itself — explicitly
        // request one so the tile-fetch pipeline starts immediately
        // instead of waiting for the next user interaction.
        viewer.scene.requestRender();
        // #region agent log
        __dbg('imagery-added', 'H2', 'addImageryProvider+requestRender done', {
          imageryLayerCountAfter: viewer.imageryLayers.length,
          useDefaultRenderLoop: viewer.useDefaultRenderLoop,
        });
        // H6: patch the imagery provider's `requestImage` so we can see
        // EVERY call Cesium makes to actually fetch a tile. If we see
        // tileLoadProgressEvent firings (queue growth) but ZERO
        // requestImage calls, the load pipeline is decoupled from the
        // queue — tiles are wanted but never fetched.
        let __dbgRequestImageCalls = 0;
        const __dbgProvider = provider as unknown as {
          requestImage?: (...args: unknown[]) => unknown;
          errorEvent?: { addEventListener: (cb: (e: unknown) => void) => () => void };
          _resource?: { url?: string };
          url?: string;
        };
        const __dbgOriginalRequestImage = __dbgProvider.requestImage?.bind(provider);
        if (__dbgOriginalRequestImage) {
          __dbgProvider.requestImage = (...args: unknown[]) => {
            __dbgRequestImageCalls++;
            if (__dbgRequestImageCalls <= 5) {
              __dbg('provider-requestImage', 'H6', 'provider.requestImage called', {
                callIndex: __dbgRequestImageCalls,
                args: args.slice(0, 3),
              });
            }
            return __dbgOriginalRequestImage(...args);
          };
        } else {
          __dbg('provider-requestImage-missing', 'H6', 'provider has no requestImage method', {
            keys: Object.keys(__dbgProvider).slice(0, 30),
          });
        }
        // H6: provider error events
        if (__dbgProvider.errorEvent?.addEventListener) {
          __dbgProvider.errorEvent.addEventListener((e: unknown) => {
            const err = e as { error?: { message?: string }; level?: number; timesRetried?: number };
            __dbg('provider-error', 'H6', 'imagery provider errorEvent fired', {
              level: err?.level,
              timesRetried: err?.timesRetried,
              message: err?.error?.message?.slice?.(0, 200),
            });
          });
        }
        // After 4s, log how many requestImage calls we've actually seen,
        // and dump a few internal-state hints from the provider.
        window.setTimeout(() => {
          if (viewer.isDestroyed()) return;
          __dbg('provider-state-4s', 'H6', 'provider state 4s after add', {
            requestImageCallCount: __dbgRequestImageCalls,
            providerCtor: provider.constructor?.name,
            tilesLoaded: viewer.scene.globe.tilesLoaded,
            // Best-effort introspection of common BingMaps fields
            hasUrl: !!(__dbgProvider as { _imageUrlTemplate?: unknown })._imageUrlTemplate,
            sample: Object.keys(provider).filter((k) => k.startsWith('_')).slice(0, 12),
          });
        }, 4000);
        // Track tile-load progress for the next ~12s to see if Cesium ever
        // queues any imagery/terrain tiles at all (H3/H4).
        let __dbgTileLogs = 0;
        const __dbgTileSampler = viewer.scene.globe.tileLoadProgressEvent.addEventListener((queued: number) => {
          if (__dbgTileLogs >= 8) return;
          __dbgTileLogs++;
          __dbg('tile-progress', 'H3+H4', 'tileLoadProgressEvent', { queued, sample: __dbgTileLogs });
        });
        window.setTimeout(() => {
          try { __dbgTileSampler(); } catch { /* noop */ }
          if (viewer.isDestroyed()) {
            __dbg('post-3s-snapshot', 'H5', 'viewer destroyed before snapshot', {});
            return;
          }
          const carto2 = Cesium.Cartographic.fromCartesian(viewer.camera.position);
          __dbg('post-3s-snapshot', 'H2+H3+H4', 'snapshot 3s after imagery add', {
            useDefaultRenderLoop: viewer.useDefaultRenderLoop,
            requestRenderMode: viewer.scene.requestRenderMode,
            imageryLayerCount: viewer.imageryLayers.length,
            tileSamplesSeen: __dbgTileLogs,
            sceneMode: viewer.scene.mode,
            camera: { lat: Cesium.Math.toDegrees(carto2.latitude), lon: Cesium.Math.toDegrees(carto2.longitude), heightM: Math.round(carto2.height) },
            canvas: { w: viewer.scene.canvas.clientWidth, h: viewer.scene.canvas.clientHeight },
          });
        }, 3000);
        // #endregion
      })
      .catch((err) => {
        // #region agent log
        __dbg('imagery-rejected', 'H1', 'IonImageryProvider rejected', {
          elapsedMs: Math.round(performance.now() - __dbgImageryRequestedAt),
          destroyed: viewer.isDestroyed(),
          errName: (err as Error)?.name,
          errMessage: (err as Error)?.message?.slice(0, 200),
        });
        // #endregion
        if (viewer.isDestroyed()) return;
        devError('[CesiumMap] failed to load Ion imagery:', err);
      });

    // Cesium World Terrain (Ion asset 1) is only meaningful in 3D mode —
    // 2D renders top-down with no depth, so the terrain mesh is never
    // sampled visually. We previously loaded it eagerly on bootstrap,
    // which started a continuous tile-streaming background workload even
    // for sessions that never leave 2D. Defer the load to the first 3D
    // switch (handled in the scene-mode effect below) and keep the
    // ellipsoid as the default.
    viewer.scene.mode = SCENE_MODE_MAP[sceneMode];
    if (sceneMode === '3D') {
      void ensureWorldTerrain(viewer);
    }

    // Initial camera position. Use `setView` (instant) + a deliberately tall
    // `heightM` because in `SceneMode.SCENE2D` Cesium's camera "height" is
    // interpreted as the orthographic frustum extent, not a metric distance.
    // 50_000 m gives a city-scale view; the consumer can re-target with the
    // imperative `flyTo` prop afterwards.
    viewer.camera.setView({
      destination: toCartesian({ ...initialView, heightM: initialView.heightM ?? 50_000 }),
    });

    // Click → marker handler.
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
    // Whenever a new terrain tile loads we may finally have a real height
    // for markers that previously fell back to 0 — clear the cache so the
    // next preRender pass re-samples them. The event fires periodically
    // during initial terrain streaming and then settles to silence.
    const removeTileLoadHandler = viewer.scene.globe.tileLoadProgressEvent.addEventListener(() => {
      htmlMarkerTerrainHeightRef.current.clear();
    });
    // Cesium's camera.changed event fires once the camera position /
    // orientation has changed by `percentageChanged` (default 0.5).
    // Lower it so even small pans / zooms trigger a re-project of the
    // static marker set; otherwise a slow drag could leave markers
    // pinned to stale screen coordinates.
    viewer.camera.percentageChanged = 0.001;
    const removeCameraChanged = viewer.camera.changed.addEventListener(() => {
      staticProjectedRef.current.clear();
      // Force a render so the new screen positions paint without
      // waiting for the next animation tick.
      viewer.scene.requestRender();
    });
    // Camera entry/exit on user interaction also invalidates: moveStart
    // resets immediately so we re-project on the very next frame even
    // if the cumulative move falls below percentageChanged.
    const removeMoveStart = viewer.camera.moveStart.addEventListener(() => {
      staticProjectedRef.current.clear();
    });
    // Mode switches (2D ↔ 3D) reproject everything via cartographic
    // altitude, so the cached screen positions are no longer valid.
    const removeModeChange = viewer.scene.morphComplete.addEventListener(() => {
      staticProjectedRef.current.clear();
    });
    const removePreRender = viewer.scene.preRender.addEventListener(() => {
      const nodes = htmlMarkerNodesRef.current;
      const cartesians = htmlMarkerCartesianRef.current;
      const cartographics = htmlMarkerCartographicRef.current;
      const terrainCache = htmlMarkerTerrainHeightRef.current;
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
      const projectedSet = staticProjectedRef.current;
      // Kinematic tracks that are still smoothing toward the latest
      // sample or extrapolating forward need the scene to keep
      // rendering — Cesium's request-render mode would otherwise idle
      // out after one frame and the marker would visibly freeze.
      let kinematicActive = false;
      for (const [id, node] of nodes) {
        const track = tracks.get(id);
        let cart: Cesium.Cartesian3 | undefined;
        if (track) {
          const s = track.query(now);
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
          // Static (non-kinematic) markers: skip the entire project →
          // cartesianToCanvas → DOM-write pipeline when the camera is
          // idle and we've already written a transform for this id.
          // The set is cleared on camera move, mode morph, and marker
          // prop changes, so a stale value can never persist visually.
          if (projectedSet.has(id)) continue;
          cart = cartesians.get(id);
          if (cart && isMode3D) {
            const carto = cartographics.get(id);
            if (carto) {
              // Static markers don't move, so terrain height only needs
              // to be sampled once per (lat,lon) — cache it. Re-sample
              // when (a) we don't have a cached entry for this id at the
              // current lat/lon, or (b) the cache was cleared by the
              // tile-load handler above (signalling new terrain data).
              const key = `${carto.lat},${carto.lon}`;
              let cached = terrainCache.get(id);
              if (!cached || cached.key !== key) {
                Cesium.Cartographic.fromDegrees(carto.lon, carto.lat, 0, terrainSampleCarto);
                const h = globe.getHeight(terrainSampleCarto);
                cached = { key, height: typeof h === 'number' ? h : undefined };
                terrainCache.set(id, cached);
                const alt = cached.height ?? 0;
                Cesium.Cartesian3.fromDegrees(carto.lon, carto.lat, alt, undefined, cart);
              }
              // If we have no real height yet we keep the cached entry
              // around with `undefined`; tileLoadProgressEvent will clear
              // it when new terrain arrives so we re-sample.
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
          // Mark static markers as projected even when off-screen so we
          // don't pay the cartesianToCanvas cost again until the camera
          // moves (a hidden node staying hidden is the desired state).
          if (!track) projectedSet.add(id);
          continue;
        }
        node.style.display = '';
        node.style.transform = `translate(-50%, -50%) translate(${screen.x}px, ${screen.y}px)`;
        if (!track) projectedSet.add(id);
      }
      // With `requestRenderMode = true` the scene only renders when
      // something explicitly asks. Animations driven by Date.now() inside
      // CallbackProperty closures (engagement-line smoothing,
      // particle dots) need a frame every tick or they freeze. Schedule
      // a render whenever any time-dependent visual is active. When
      // nothing is animating the scene goes truly idle (~0% GPU).
      //
      // Smoothing only pumps frames while the ease window is active —
      // once the line settles we stop re-rendering even though the
      // endpoints map still has entries (they're kept around so the
      // next endpoint change has a `prev` to ease from).
      const particlesActive = polylineParticleEntitiesRef.current.size > 0;
      let smoothingActive = false;
      if (polylineSmoothEndpointsRef.current.size > 0) {
        for (const ep of polylineSmoothEndpointsRef.current.values()) {
          if (now - ep.changedAt < SMOOTH_LINE_MS) {
            smoothingActive = true;
            break;
          }
        }
      }
      if (kinematicActive || particlesActive || smoothingActive) {
        viewer.scene.requestRender();
      }
    });

    viewerRef.current = viewer;

    // Dev-only Cesium perf instrumentation. Dynamically imported behind
    // an `import.meta.env.DEV` gate so the perf module never reaches
    // production bundles. Disposes alongside the viewer. Also registers
    // the viewer with the PerfHud so stats-gl + Cesium debug toggles
    // can attach.
    //
    // Why we capture `viewer` in `localViewer` and check it against
    // `viewerRef.current` after the dynamic import resolves:
    //   - React 18 StrictMode mounts the effect twice in dev. Both
    //     mounts kick off the dynamic import in parallel.
    //   - If the second mount's viewer settles first, the first mount's
    //     `.then` callback would attach listeners to the OLD (already
    //     destroyed) viewer, then the second's would attach to the new
    //     one — and we'd hold on to a `cesiumMarksDispose` that
    //     references the wrong handle.
    //   - The identity check `viewerRef.current === localViewer` is the
    //     cheapest way to confirm "this is still my mount's viewer".
    let cesiumMarksDispose: (() => void) | null = null;
    let unregisterPerfViewer: (() => void) | null = null;
    let perfTeardownRequested = false;
    if (import.meta.env.DEV) {
      const localViewer = viewer;
      void import('@/lib/perf/cesiumMarks').then(({ installCesiumMarks }) => {
        if (perfTeardownRequested) return;
        if (viewerRef.current !== localViewer || localViewer.isDestroyed()) return;
        const handle = installCesiumMarks(localViewer, {
          getHtmlMarkerCount: () => htmlMarkerNodesRef.current.size,
        });
        cesiumMarksDispose = handle.dispose;
      });
      void import('@/app/components/perf/PerfHud').then(({ registerCesiumViewerForPerf }) => {
        if (perfTeardownRequested) return;
        if (viewerRef.current !== localViewer || localViewer.isDestroyed()) return;
        registerCesiumViewerForPerf(localViewer);
        unregisterPerfViewer = () => registerCesiumViewerForPerf(null);
      });
    }

    return () => {
      removePreRender();
      removeTileLoadHandler();
      removeCameraChanged();
      removeMoveStart();
      removeModeChange();
      perfTeardownRequested = true;
      cesiumMarksDispose?.();
      unregisterPerfViewer?.();
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
      markerEntitiesRef.current.clear();
      fovEntitiesRef.current = [];
      coverageEntitiesRef.current = [];
      htmlGeometryEntitiesRef.current.clear();
      htmlGeometryFingerprintRef.current.clear();
      polylineEntitiesRef.current.clear();
      polylineFingerprintRef.current.clear();
      polylineParticleEntitiesRef.current.clear();
      polylineParticleEndpointsRef.current.clear();
      polylineSmoothEndpointsRef.current.clear();
      motionTracksRef.current.clear();
      kinematicCartesianScratchRef.current.clear();
      htmlMarkerCartographicRef.current.clear();
      htmlMarkerTerrainHeightRef.current.clear();
      staticProjectedRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountReady]);

  // ── Pause render loop when offscreen / tab hidden ─────────────────────────
  // With request-render mode the steady-state cost is already low, but
  // any animation tick (kinematic markers, particles, smoothing engagement
  // lines) keeps requesting frames whether anybody is watching or not.
  // Toggle Cesium's master render loop based on container visibility so
  // covered / scrolled-away / backgrounded maps drop to a hard zero.
  //
  // This single pattern handles three otherwise distinct cases:
  //   1. Styleguide page scrolled past the Cesium demos.
  //   2. Dashboard map covered by a fullscreen modal / device drawer.
  //   3. Browser tab in the background.
  // When the container scrolls back into view (or the tab regains focus)
  // we re-enable the loop and force one render so the canvas paints
  // immediately instead of waiting for the next animation tick.
  useEffect(() => {
    if (!mountReady) return;
    const viewer = viewerRef.current;
    const el = containerRef.current;
    if (!viewer || !el) return;

    let isIntersecting = true;
    let isPageVisible = typeof document !== 'undefined' ? !document.hidden : true;

    const apply = () => {
      const shouldRender = isIntersecting && isPageVisible;
      if (viewer.isDestroyed()) return;
      if (viewer.useDefaultRenderLoop !== shouldRender) {
        // #region agent log
        fetch('http://127.0.0.1:7266/ingest/86ca69bf-eb7c-4994-9aae-fe544ebf4b6e', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '70413c' },
          body: JSON.stringify({
            sessionId: '70413c',
            hypothesisId: 'H2',
            location: 'CesiumMap.tsx:io-apply',
            message: 'useDefaultRenderLoop transition',
            data: { from: viewer.useDefaultRenderLoop, to: shouldRender, isIntersecting, isPageVisible },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        viewer.useDefaultRenderLoop = shouldRender;
        if (shouldRender) viewer.scene.requestRender();
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isIntersecting = entry.isIntersecting;
        }
        apply();
      },
      // Small rootMargin keeps the map "warm" when the user scrolls
      // toward it so it's already painting by the time it enters
      // the viewport — no perceptible blank-canvas flash.
      { rootMargin: '200px' },
    );
    io.observe(el);

    const onVisibility = () => {
      isPageVisible = !document.hidden;
      apply();
    };
    document.addEventListener('visibilitychange', onVisibility);

    apply();

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      // Leave the viewer with the render loop enabled on cleanup so a
      // fresh remount (HMR, route change) doesn't start in paused state.
      if (!viewer.isDestroyed()) viewer.useDefaultRenderLoop = true;
    };
  }, [mountReady]);

  // ── HTML marker positions ────────────────────────────────────────────────
  // Re-compute Cartesian3 cache whenever `htmlMarkers` changes. The
  // per-frame loop reads from this cache, so it stays cheap.
  //
  // Kinematic markers don't write to the static cache — instead, the new
  // lat/lon is pushed as a sample to the per-id motion track, and the
  // per-frame preRender loop queries the track at frame time. Tracks /
  // scratch buffers for ids that left the prop set are dropped here so
  // they don't leak across long sessions.
  useEffect(() => {
    const cache = htmlMarkerCartesianRef.current;
    const cartographics = htmlMarkerCartographicRef.current;
    const terrainCache = htmlMarkerTerrainHeightRef.current;
    cache.clear();
    cartographics.clear();
    // Terrain heights are keyed by id+lat,lon — when the marker set
    // changes (or any marker moves), invalidate so the next preRender
    // re-samples for the new positions.
    terrainCache.clear();
    // Static-marker screen-position cache must also be invalidated when
    // the marker prop set changes (positions or membership may differ).
    staticProjectedRef.current.clear();
    if (!htmlMarkers) {
      motionTracksRef.current.clear();
      kinematicCartesianScratchRef.current.clear();
      return;
    }

    const liveKinematicIds = new Set<string>();
    const sampleAt = Date.now();
    for (const m of htmlMarkers) {
      if (m.kinematic) {
        liveKinematicIds.add(m.id);
        let track = motionTracksRef.current.get(m.id);
        if (!track) {
          track = createMotionTrack();
          motionTracksRef.current.set(m.id, track);
          kinematicCartesianScratchRef.current.set(m.id, new Cesium.Cartesian3());
        }
        track.pushSample(m.lat, m.lon, sampleAt);
      } else {
        // Cache as a fresh Cartesian3 we can mutate in place each frame —
        // the preRender loop re-projects at the terrain surface in 3D.
        cache.set(m.id, Cesium.Cartesian3.fromDegrees(m.lon, m.lat));
        cartographics.set(m.id, { lat: m.lat, lon: m.lon });
      }
    }

    // Drop tracks + scratch Cartesians for ids that vanished or that are
    // no longer kinematic (e.g. a drone going offline mid-session).
    for (const id of motionTracksRef.current.keys()) {
      if (!liveKinematicIds.has(id)) {
        motionTracksRef.current.delete(id);
        kinematicCartesianScratchRef.current.delete(id);
      }
    }

    // Force a render so positions update immediately even without user
    // interaction (Cesium uses request-render mode by default).
    viewerRef.current?.scene.requestRender();
  }, [htmlMarkers]);

  // ── Token (live update) ────────────────────────────────────────────────────
  useEffect(() => {
    Cesium.Ion.defaultAccessToken = ionToken;
  }, [ionToken]);

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

    if (sceneMode === '3D') {
      void ensureWorldTerrain(viewer);
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
            outline: true,
            outlineColor: cesiumColor.withAlpha(0.6),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
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
            outline: true,
            outlineColor: cesiumColor.withAlpha(0.5),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        });
        coverageEntitiesRef.current.push(coverageEntity);
      }
    }
  }, [markers]);

  // ── FOV + coverage entities for HTML markers ──────────────────────────────
  // The DOM overlay renders the icon + tooltip; Cesium renders the geometry
  // (terrain-clamped sector polygon for FOV, ellipse for coverage). These
  // are kept in a separate ref so the `markers[]` effect above doesn't tear
  // them down on every change.
  //
  // Two-stage lifecycle for FOV entities:
  //   1. Geometry. Keyed by `${id}__fov`. The entity is created lazily
  //      the first time a sensor's FOV needs to be drawn, then stays
  //      resident in `viewer.entities` for the lifetime of the viewer.
  //      A fingerprint short-circuits the GroundPrimitive rebuild —
  //      we only touch `polygon.hierarchy` / material when sensor lat/lon /
  //      bearing / range actually change.
  //   2. Visibility. The hover-driven prop (`hoveredSensorIdFromCard`)
  //      flips `m.fov` on/off in `CesiumTacticalMap`. Old code interpreted
  //      "no `m.fov` this render" as "remove the entity"; that destroyed
  //      and re-built the terrain-clamped GroundPrimitive on every hover,
  //      which has to (a) re-tessellate via earcut, (b) issue async
  //      terrain-height samples, and (c) on first hover ever, compile
  //      the GroundPrimitive shader pipeline. The result was a visible
  //      ~hundreds-of-ms delay between hover and FOV paint, every hover.
  //      We now toggle `entity.show` instead — re-hover paths reuse the
  //      already-tessellated, terrain-clamped primitive instantly.
  //
  // Coverage rings are diffed with the same fingerprint pattern but still
  // use create/remove semantics — they're driven by sticky state (jamming,
  // engagement) rather than transient hover, so the cost amortises and
  // the hold-resident pattern would only add memory.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const entities = htmlGeometryEntitiesRef.current;
    const fingerprints = htmlGeometryFingerprintRef.current;
    // Marker ids present in this render, regardless of fov visibility.
    // Used at the end to distinguish "marker still exists, FOV hidden"
    // (toggle show=false) from "marker gone entirely" (remove entity).
    const liveMarkerIds = new Set<string>();
    // FOV ids that should be visible right now. Anything in `entities`
    // ending with `__fov` whose markerId is live but isn't in this set
    // gets `show = false` rather than being torn down.
    const wantFovVisible = new Set<string>();
    const desiredCoverage = new Set<string>();
    let scheduledRender = false;

    if (htmlMarkers) {
      for (const m of htmlMarkers) {
        liveMarkerIds.add(m.id);

        if (m.fov) {
          const fovId = `${m.id}__fov`;
          wantFovVisible.add(fovId);
          const fovColorCss = m.fov.color ?? '#22b8cf';
          const fovOpacity = m.fov.opacity ?? 0.18;
          // Quantize lat/lon/bearing so micro-jitter from kinematic
          // smoothing doesn't invalidate the fingerprint every frame.
          const fp = `fov:${m.lat.toFixed(5)}:${m.lon.toFixed(5)}:${m.fov.rangeM}:${m.fov.bearingDeg.toFixed(1)}:${m.fov.widthDeg}:${fovColorCss}:${fovOpacity}`;
          if (fingerprints.get(fovId) !== fp) {
            // The expensive path. Wrapped in `measure` so the perf trace
            // surfaces exactly when wedge geometry recomputes (expected:
            // first hover per sensor, plus per-tick for kinematic drones
            // whose bearing changes). A re-hover of an unchanged sensor
            // skips this branch entirely and only flips visibility below.
            measure(
              'Cesium',
              'fov.geometryUpdate',
              () => {
                const fovColor = Cesium.Color.fromCssColorString(fovColorCss);
                const hierarchy = new Cesium.PolygonHierarchy(
                  buildSectorPositions(m.lat, m.lon, m.fov!.rangeM, m.fov!.bearingDeg, m.fov!.widthDeg),
                );
                const existing = entities.get(fovId);
                if (existing?.polygon) {
                  existing.polygon.hierarchy = new Cesium.ConstantProperty(hierarchy);
                  existing.polygon.material = new Cesium.ColorMaterialProperty(fovColor.withAlpha(fovOpacity));
                  existing.polygon.outlineColor = new Cesium.ConstantProperty(
                    fovColor.withAlpha(Math.min(1, fovOpacity * 3)),
                  );
                } else {
                  // Initial `show: false` — the toggle pass below flips
                  // it on the same frame, before `requestRender()`, so
                  // there's no visible flash. Doing it this way also
                  // guarantees we emit a `fov.toggle` mark on first
                  // appearance, so the trace shows the full lifecycle.
                  const fovEntity = viewer.entities.add({
                    id: fovId,
                    show: false,
                    polygon: {
                      hierarchy,
                      material: fovColor.withAlpha(fovOpacity),
                      outline: true,
                      outlineColor: fovColor.withAlpha(Math.min(1, fovOpacity * 3)),
                      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    },
                  });
                  entities.set(fovId, fovEntity);
                }
              },
              { properties: { sensorId: m.id } },
            );
            fingerprints.set(fovId, fp);
            scheduledRender = true;
          }
        }

        if (m.coverageRadiusM != null) {
          const coverageId = `${m.id}__coverage`;
          desiredCoverage.add(coverageId);
          const coverageColorCss = m.coverageColor ?? '#22b8cf';
          const fp = `cov:${m.lat.toFixed(5)}:${m.lon.toFixed(5)}:${m.coverageRadiusM}:${coverageColorCss}`;
          if (fingerprints.get(coverageId) !== fp) {
            const coverageColor = Cesium.Color.fromCssColorString(coverageColorCss);
            const position = Cesium.Cartesian3.fromDegrees(m.lon, m.lat);
            const existing = entities.get(coverageId);
            if (existing?.ellipse) {
              existing.position = new Cesium.ConstantPositionProperty(position);
              existing.ellipse.semiMajorAxis = new Cesium.ConstantProperty(m.coverageRadiusM);
              existing.ellipse.semiMinorAxis = new Cesium.ConstantProperty(m.coverageRadiusM);
              existing.ellipse.material = new Cesium.ColorMaterialProperty(coverageColor.withAlpha(0.25));
              existing.ellipse.outlineColor = new Cesium.ConstantProperty(coverageColor.withAlpha(0.95));
            } else {
              // Fill / outline opacities tuned to read clearly over satellite
              // imagery without burying the markers underneath. Roughly mirrors
              // the FOV cone's solidity (0.40 fill); the outline is fully opaque
              // so the ring boundary is unambiguous even at larger zoom-outs.
              const coverageEntity = viewer.entities.add({
                id: coverageId,
                position,
                ellipse: {
                  semiMajorAxis: m.coverageRadiusM,
                  semiMinorAxis: m.coverageRadiusM,
                  material: coverageColor.withAlpha(0.25),
                  outline: true,
                  outlineColor: coverageColor.withAlpha(0.95),
                  heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
              });
              entities.set(coverageId, coverageEntity);
            }
            fingerprints.set(coverageId, fp);
            scheduledRender = true;
          }
        }
      }
    }

    // Visibility + cleanup pass. Iterates the resident entity cache once:
    //   - FOV entity for a vanished marker  → tear down (sensor removed
    //     from the prop set; e.g. operator dismissed it, or the asset
    //     registry trimmed offline ids).
    //   - FOV entity for a live marker      → flip `show` to match
    //     `wantFovVisible`. This is the fast hover/unhover path.
    //   - Coverage entity not in desired    → tear down (coverage isn't
    //     hover-cycled; sticky state only).
    for (const [id, entity] of entities) {
      if (id.endsWith('__fov')) {
        const markerId = id.slice(0, -'__fov'.length);
        if (!liveMarkerIds.has(markerId)) {
          viewer.entities.remove(entity);
          entities.delete(id);
          fingerprints.delete(id);
          scheduledRender = true;
          continue;
        }
        const wantShow = wantFovVisible.has(id);
        if (entity.show !== wantShow) {
          entity.show = wantShow;
          mark('Cesium', 'fov.toggle', {
            properties: { sensorId: markerId, visible: wantShow },
          });
          scheduledRender = true;
        }
      } else if (id.endsWith('__coverage')) {
        if (!desiredCoverage.has(id)) {
          viewer.entities.remove(entity);
          entities.delete(id);
          fingerprints.delete(id);
          scheduledRender = true;
        }
      }
    }

    if (scheduledRender) viewer.scene.requestRender();
  }, [htmlMarkers]);

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
            Cesium.Cartesian3.fromDegrees(fromLon, fromLat, 0, undefined, cachedArr[0]);
            Cesium.Cartesian3.fromDegrees(toLon, toLat, 0, undefined, cachedArr[1]);
            return cachedArr;
          }, false);
          const fresh = viewer.entities.add({
            id: `${lineId}__polyline`,
            polyline: {
              positions: positionsProp,
              width,
              material,
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
        // Particles can be turned OFF on a line whose `id` stays the
        // same (e.g. an engagement-pair line whose `particles` flag is
        // toggled off mid-life). The cleanup loop below only fires
        // when the line id disappears entirely, so we'd silently leak
        // `count` particle entities per such transition. Tear them
        // down here when the line is desired but no longer wants
        // particles.
        if ((!line.particles || line.particles.count <= 0) && particleEntities.has(line.id)) {
          const stale = particleEntities.get(line.id);
          if (stale) {
            for (const p of stale) viewer.entities.remove(p);
          }
          particleEntities.delete(line.id);
          particleEndpoints.delete(line.id);
          scheduledRender = true;
        }
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
              return Cesium.Cartesian3.fromDegrees(
                fromLon + (toLon - fromLon) * eased,
                fromLat + (toLat - fromLat) * eased,
                0,
                undefined,
                result,
              );
            }, false);
            const particleEntity = viewer.entities.add({
              id: `${lineId}__particle-${i}`,
              position: positionProp,
              point: {
                pixelSize: 8,
                color: dotColor,
                outlineColor: dotColor.withAlpha(0.4),
                outlineWidth: 4,
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

    if (scheduledRender) viewer.scene.requestRender();
  }, [polylines]);

  // ── Imperative fly-to ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!flyTo || !viewerRef.current) return;
    viewerRef.current.camera.flyTo({
      destination: toCartesian({ lat: flyTo.lat, lon: flyTo.lon, heightM: flyTo.heightM ?? 1500 }),
      duration: flyTo.durationSec ?? 1.2,
    });
  }, [flyTo]);

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
          <div
            key={m.id}
            ref={(node) => {
              if (node) htmlMarkerNodesRef.current.set(m.id, node);
              else htmlMarkerNodesRef.current.delete(m.id);
            }}
            onClick={m.onClick}
            onContextMenu={m.onContextMenu}
            onMouseEnter={m.onMouseEnter}
            onMouseLeave={m.onMouseLeave}
            className="pointer-events-auto absolute top-0 left-0"
            style={{
              zIndex: m.zIndex,
              // Hidden by default until first preRender places it. Avoids
              // a flash at (0,0) before the scene has run a frame.
              display: 'none',
              // `will-change: transform` was previously set on every marker
              // to force a composite layer. With ~30 markers that adds up
              // to non-trivial GPU memory pressure on integrated cards,
              // and the modern Chromium compositor already promotes
              // animated transforms on its own. Static markers also have
              // their transform writes skipped entirely (see
              // `staticProjectedRef` in the preRender loop), so there's
              // nothing to optimise for. Letting the browser decide.
            }}
          >
            {m.content}
          </div>
        ))}
      </div>
    </div>
  );
}
