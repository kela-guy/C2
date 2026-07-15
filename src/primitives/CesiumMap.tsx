/**
 * CesiumMap — generic CesiumJS viewer primitive.
 *
 * Drop-in component that wraps `Cesium.Viewer` with a prop-driven API for the
 * common tactical-map surface:
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
import { energyWallMaterial, getRadarSweepImage } from './cesiumEnergyMaterials';
import { MARKER_HEX } from './accentHex';

/**
 * Minimum container size (px) before we're willing to construct
 * `Cesium.Viewer`. Below this, WebGL context init can fail silently and leave
 * the viewer in a "half-built" state where `_cesiumWidget` is undefined,
 * which then explodes on the first public-getter access. Same threshold the
 * legacy Mapbox path used for `mapbox-gl`.
 */
const MIN_MOUNT_SIZE_PX = 8;

export type CesiumSceneMode = '2D' | '2.5D' | '3D';

export interface CesiumMapFlyTo {
  lat: number;
  lon: number;
  /** Camera height above terrain in meters. Default 1500. */
  heightM?: number;
  /** Ease duration in seconds. Default 1.2. */
  durationSec?: number;
  /**
   * Oblique pitch in degrees (e.g. -35 for a cinematic side-on shot). When
   * set, the camera backs off the target along its heading so the look vector
   * still lands on (lat, lon) at ground level. Omit for the legacy top-down fly.
   */
  pitchDeg?: number;
  /** View heading in degrees (0 = north). Defaults to the current heading. */
  headingDeg?: number;
  /**
   * When true, `heightM` is interpreted as metres ABOVE GROUND (AGL): the
   * terrain elevation at the target is sampled and added, so the camera sits a
   * fixed height over the surface regardless of terrain. Use for an immersive,
   * on-the-field framing. Defaults to false (height above the ellipsoid).
   */
  terrainRelative?: boolean;
}

/**
 * Slow cinematic orbit around a ground point. While set, the camera circles
 * the centre at a fixed oblique pitch + range; clearing it (null) releases the
 * camera back to free control. Skipped under reduced motion.
 */
export interface CesiumMapOrbit {
  lat: number;
  lon: number;
  /** Camera height above the centre, in meters. */
  heightM: number;
  /** Oblique pitch in degrees (negative looks down), e.g. -35. */
  pitchDeg: number;
  /** Seconds for one full revolution. */
  periodSec: number;
  /** When true, `heightM` is metres above the sampled terrain (AGL). */
  terrainRelative?: boolean;
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
   * settles into the target — matches the legacy `useEngagementLine` look
   * (deleted in cesium-parity Phase 9).
   */
  particles?: {
    /** Number of dots flowing along the line. The legacy look used 3. */
    count: number;
    /** Core dot colour. Defaults to the line's `color`. */
    color?: string;
    /** Cycles per second. `0.25` ≈ 4 s loop, matching the legacy timing. */
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
  fov?: {
    rangeM: number;
    bearingDeg: number;
    widthDeg: number;
    color?: string;
    opacity?: number;
    /**
     * When set, the sector renders as a 3D extruded volume (a "threat
     * corridor" prism) instead of a terrain-clamped polygon. Height in meters.
     */
    extrudedHeightM?: number;
    /** Base height of the extruded volume in meters. Defaults to 0 (ground). */
    baseHeightM?: number;
    /**
     * When true, also draw a translucent vertical "virtual wall" curtain along
     * the FOV cone perimeter (terrain-following), demonstrating the sensor's
     * coverage volume. Independent of the flat/extruded sector fill. Rendered
     * with the animated energy-wall material (gradient fade + traveling pulse).
     */
    wall?: boolean;
    /** Height of the FOV wall curtain in meters. Defaults to 120. */
    wallHeightM?: number;
    /**
     * When set, the wall rises from the ground over this duration (ms) the
     * first time this marker id gets a wall. Position/param changes after
     * that rebuild the wall at full height (no re-rise).
     */
    wallRiseMs?: number;
  };
  /**
   * Animated 3D "energy wall" ring around the marker: the coverage volume as
   * a glowing vertical curtain that follows the terrain along the radius
   * perimeter. The money-shot visual for coverage — rendered with the
   * energy-wall material (vertical fade + traveling pulse + top rim).
   */
  coverageWall?: {
    radiusM: number;
    heightM: number;
    /** CSS color. Defaults to `MARKER_HEX.coverageCyan`. */
    color?: string;
    /** Wall rises 0 → heightM over this duration (ms) on first creation. */
    riseMs?: number;
  };
  /**
   * Rotating radar PPI sweep (terrain-anchored disc with a trailing conic
   * gradient). Reads as an active search radar inside the coverage wall.
   */
  radarSweep?: {
    rangeM: number;
    /** CSS color. Defaults to `MARKER_HEX.coverageCyan`. */
    color?: string;
    /** Seconds per revolution. Defaults to 4. */
    periodSec?: number;
  };
  /**
   * Optional multi-sector field-of-view (terrain-clamped polygons). Used by
   * composite effectors (e.g. Gotcha) that fan several directional sensors
   * around one position. Each sector renders + colours independently so a
   * single blind/degraded sector can be surfaced without lighting the whole
   * ring. `id` (when present) is reported back through
   * `onHtmlMarkerSectorClick` so the consumer can drill into that child.
   */
  fovSectors?: Array<{
    id?: string;
    rangeM: number;
    bearingDeg: number;
    widthDeg: number;
    color?: string;
    opacity?: number;
  }>;
  /** Optional coverage ring (terrain-clamped ellipse). */
  coverageRadiusM?: number;
  /** Coverage ring colour (CSS string). Defaults to `#22b8cf`. */
  coverageColor?: string;
  /**
   * When true, also render a translucent 3D "shield" dome (EllipsoidGraphics)
   * over the coverage footprint so protection reads as a volume, not just a
   * ground ring. Requires `coverageRadiusM`.
   */
  coverageDome?: boolean;
  /** Dome height (vertical radius) in meters. Defaults to coverageRadiusM * 0.5. */
  coverageHeightM?: number;
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
   * Initial camera target. Required so we don't open over the equator. In 3D,
   * pass `pitchDeg` (e.g. -35) for an oblique opening frame; the camera backs
   * off along `headingDeg` so the look vector still lands on (lat, lon).
   */
  initialView: {
    lat: number;
    lon: number;
    heightM?: number;
    pitchDeg?: number;
    headingDeg?: number;
    /** When true, `heightM` is metres above the sampled terrain (AGL). */
    terrainRelative?: boolean;
  };
  /** Markers rendered as DOM overlays positioned via scene transforms. */
  htmlMarkers?: CesiumHtmlMarker[];
  /** Polylines / trails (drone tracks, engagement lines, mission routes). */
  polylines?: CesiumPolyline[];
  /** Imperatively fly the camera to a position; pass a NEW object each time you want to fly. */
  flyTo?: CesiumMapFlyTo | null;
  /**
   * Slow cinematic orbit around a ground point. Pass an object to start
   * orbiting, `null`/`undefined` to release the camera. Ignored under
   * `prefers-reduced-motion`.
   */
  orbit?: CesiumMapOrbit | null;
  /**
   * When true, loads Cesium OSM Buildings (Ion asset) so a close oblique view
   * shows real 3D structures. Requires a valid `ionToken`. Loaded once at mount.
   */
  showOsmBuildings?: boolean;
  /**
   * When true, streams Google Photorealistic 3D Tiles (via Cesium Ion asset
   * 2275207) as the world — photoreal terrain + buildings. Requires a valid
   * `ionToken`. The classic globe (imagery skin) is hidden while tiles render;
   * the world terrain provider still loads underneath so terrain-relative
   * cameras and ground sampling keep working. Read once at mount. Falls back
   * to the classic globe + Ion imagery if the tileset fails to load.
   */
  photorealisticTiles?: boolean;
  /** Scene mode. Defaults to '2D' for parity with the legacy top-down map view. */
  sceneMode?: CesiumSceneMode;
  /**
   * Cesium Ion imagery asset id. Defaults to 2 (Bing Maps Aerial),
   * Ion's standard default. See https://ion.cesium.com for other ids.
   */
  ionImageryAssetId?: number;
  /**
   * When true, replaces the default Bing Aerial (Cesium Ion) basemap
   * with CartoDB's "Dark Matter" tiles — a flat, dark, vector-style
   * monochrome map (just roads, water, and labels on a near-black
   * canvas). Designed for marketing-demo recordings where a stylised
   * tactical chart reads better than tinted satellite imagery.
   *
   * Read once at mount; flipping the prop later has no effect (the
   * basemap is baked into the viewer's imagery layers and swapping it
   * mid-session would tear down + re-tessellate every tile).
   */
  darkMonochromeMap?: boolean;
  /**
   * When true, darkens + desaturates the base imagery into a moody "dark
   * tactical" theme while keeping the real terrain texture (so 3D relief still
   * reads). Applied to the Ion satellite layer; the flat CARTO dark basemap is
   * already dark, so this mainly matters with a token. Read once at mount.
   */
  darkImagery?: boolean;
  /**
   * Called when an HTML marker's FOV sector polygon (from `fovSectors`) is
   * clicked. Reports the owning marker id + the sector's `id` so the
   * consumer can drill into that sensor/child.
   */
  onHtmlMarkerSectorClick?: (markerId: string, sectorId: string) => void;
  /**
   * Called when the user clicks bare ground (no marker/sector hit). Reports the
   * picked lat/lon. Used by the onboarding lab for click-to-place. No-op when
   * absent, so existing consumers are unaffected.
   */
  onGroundClick?: (lat: number, lon: number) => void;
  /**
   * Receives an imperative screen->lat/lon picker once the viewer mounts (and
   * `null` on unmount). Converts client (page) pixel coordinates to a ground
   * lat/lon via terrain/ellipsoid picking — used for drag-and-drop placement.
   */
  pickerRef?: React.MutableRefObject<
    ((clientX: number, clientY: number) => { lat: number; lon: number } | null) | null
  >;
  /** Optional className for the wrapping `<div>`. Set width + height here or via parent. */
  className?: string;
  /**
   * Continuous camera pan velocity. Set to non-null while some upstream
   * gesture (e.g. edge-panning during a draw draft) wants the camera to
   * slide, and back to null / zero-vector when it stops.
   *
   * Units are UNITLESS "screen widths per second" in the camera's local
   * view plane. `vx = 1` pans one screen-width east / to the right per
   * second; `vx = -1` pans left; `vy = 1` pans up; `vy = -1` down. The
   * primitive converts to meters at run-time using the current camera
   * height (see the effect below), so a given `{vx, vy}` feels the same
   * whether the map is zoomed to a city or a country.
   *
   * Reads clamped to `-1..1`. Passing `{vx: 0, vy: 0}` is treated as
   * null (no rAF loop). The prop is inspected via `useEffect`, so
   * updating it starts / stops / re-parameterises the loop reactively;
   * callers can setState freely.
   */
  panVelocity?: { vx: number; vy: number } | null;
}

/**
 * Convert a window pixel position to a ground lat/lon. Prefers depth-aware
 * `pickPosition` in 3D, falls back to the globe ray pick, then the ellipsoid.
 * Returns null when the pointer isn't over the globe.
 */
function pickGroundLatLon(
  viewer: Cesium.Viewer,
  windowPos: Cesium.Cartesian2,
): { lat: number; lon: number } | null {
  const scene = viewer.scene;
  let cartesian: Cesium.Cartesian3 | undefined;
  if (scene.mode === Cesium.SceneMode.SCENE3D && scene.pickPositionSupported) {
    cartesian = scene.pickPosition(windowPos);
  }
  if (!cartesian) {
    const ray = viewer.camera.getPickRay(windowPos);
    if (ray) cartesian = scene.globe.pick(ray, scene) ?? undefined;
  }
  if (!cartesian) {
    cartesian = viewer.camera.pickEllipsoid(windowPos, scene.globe.ellipsoid) ?? undefined;
  }
  if (!cartesian) return null;
  const carto = Cesium.Cartographic.fromCartesian(cartesian);
  return {
    lat: Cesium.Math.toDegrees(carto.latitude),
    lon: Cesium.Math.toDegrees(carto.longitude),
  };
}

/**
 * Convert {lat, lon, heightM} → Cartesian3, with a sane height default.
 */
function toCartesian({ lat, lon, heightM }: { lat: number; lon: number; heightM?: number }) {
  return Cesium.Cartesian3.fromDegrees(lon, lat, heightM ?? 1500);
}

/**
 * Push a base imagery layer toward a dark, desaturated "tactical" look while
 * keeping enough texture for 3D terrain relief to read. Tuned to be moody, not
 * pitch black (markers + glows must still pop against it).
 */
function applyDarkImagery(layer: Cesium.ImageryLayer) {
  layer.brightness = 0.42;
  layer.contrast = 1.18;
  layer.saturation = 0.45;
  layer.gamma = 0.7;
}

/**
 * Sample terrain elevation at one or more lat/lon points, forcing the
 * most-detailed tiles to load so results are accurate even right after mount.
 * Returns 0 for the flat ellipsoid terrain provider or on any failure.
 */
async function sampleGroundHeights(
  viewer: Cesium.Viewer,
  points: Array<{ lat: number; lon: number }>,
): Promise<number[]> {
  try {
    const cartos = points.map((p) => Cesium.Cartographic.fromDegrees(p.lon, p.lat));
    const sampled = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartos);
    return sampled.map((s) => s?.height ?? 0);
  } catch {
    return points.map(() => 0);
  }
}

/** Geometry for an oblique camera: where to sit + which way to look. */
function obliqueGeometry(lat: number, lon: number, aglM: number, pitchDeg: number, headingDeg: number) {
  const pitchRad = Cesium.Math.toRadians(pitchDeg);
  const heading = Cesium.Math.toRadians(headingDeg);
  const distBack = aglM / Math.tan(Math.abs(pitchRad));
  const dLat = -Math.cos(heading) * (distBack / 111_000);
  const dLon = -Math.sin(heading) * (distBack / (111_000 * Math.cos((lat * Math.PI) / 180)));
  return { camLat: lat + dLat, camLon: lon + dLon, pitchRad, heading };
}

/**
 * Build an oblique camera view that lands the look vector on (lat, lon) at
 * `groundH`, from `aglM` above it. `camGroundH` (the terrain under the backed-
 * off camera) lifts the camera when needed so it never clips into rising
 * terrain. Pass 0 for both to get an ellipsoid-relative view.
 */
function obliqueView(
  lat: number,
  lon: number,
  groundH: number,
  aglM: number,
  pitchDeg: number,
  headingDeg: number,
  camGroundH = 0,
  minClearanceM = 60,
) {
  const { camLat, camLon, pitchRad, heading } = obliqueGeometry(lat, lon, aglM, pitchDeg, headingDeg);
  const camHeight = Math.max(groundH + aglM, camGroundH + minClearanceM);
  return {
    destination: Cesium.Cartesian3.fromDegrees(camLon, camLat, camHeight),
    orientation: { pitch: pitchRad, heading, roll: 0 },
  };
}

/**
 * Async terrain-relative oblique view: samples the ground under both the target
 * and the (backed-off) camera so the framing hugs the surface and clears hills.
 */
async function terrainObliqueView(
  viewer: Cesium.Viewer,
  lat: number,
  lon: number,
  aglM: number,
  pitchDeg: number,
  headingDeg: number,
) {
  const { camLat, camLon } = obliqueGeometry(lat, lon, aglM, pitchDeg, headingDeg);
  const [groundH, camGroundH] = await sampleGroundHeights(viewer, [
    { lat, lon },
    { lat: camLat, lon: camLon },
  ]);
  return obliqueView(lat, lon, groundH, aglM, pitchDeg, headingDeg, camGroundH);
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
 * The closed perimeter path of a FOV sector as lat/lon points, used to build a
 * vertical "virtual wall" curtain. For a directional cone the path runs
 * centre → arc → centre (walling both radial edges + the range arc); for an
 * omni sensor (width >= 360) it's just the closed range ring.
 */
function buildSectorPerimeter(
  centerLat: number,
  centerLon: number,
  rangeM: number,
  bearingDeg: number,
  widthDeg: number,
): Array<{ lat: number; lon: number }> {
  const cart = buildSectorPositions(centerLat, centerLon, rangeM, bearingDeg, widthDeg);
  // buildSectorPositions returns [center, arc0..arcN, center].
  const path = widthDeg >= 360 ? cart.slice(1) : cart;
  return path.map((c) => {
    const carto = Cesium.Cartographic.fromCartesian(c);
    return {
      lat: Cesium.Math.toDegrees(carto.latitude),
      lon: Cesium.Math.toDegrees(carto.longitude),
    };
  });
}

/**
 * Attach an animated energy-wall (WallGraphics) to `entity` along the given
 * perimeter path. Samples terrain under every vertex so the wall hugs the
 * ground and rises a constant height. When `riseMs > 0`, the wall grows from
 * the ground with an ease-out and then freezes to a constant-height wall so
 * Cesium stops re-tessellating it every frame.
 */
function attachEnergyWall(
  viewer: Cesium.Viewer,
  entity: Cesium.Entity,
  perimeter: Array<{ lat: number; lon: number }>,
  heightM: number,
  cssColor: string,
  riseMs: number,
): void {
  void (async () => {
    const grounds = await sampleGroundHeights(viewer, perimeter);
    if (viewer.isDestroyed() || !viewer.entities.contains(entity)) return;
    const positions = perimeter.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat));
    const targets = grounds.map((h) => h + heightM);
    let maximumHeights: Cesium.Property | number[];
    if (riseMs > 0) {
      const start = performance.now();
      maximumHeights = new Cesium.CallbackProperty(() => {
        const t = Math.min(1, (performance.now() - start) / riseMs);
        const eased = 1 - Math.pow(1 - t, 3);
        return grounds.map((h) => h + Math.max(2, heightM * eased));
      }, false);
      window.setTimeout(() => {
        if (viewer.isDestroyed() || !viewer.entities.contains(entity) || !entity.wall) return;
        entity.wall.maximumHeights = new Cesium.ConstantProperty(targets);
        viewer.scene.requestRender();
      }, riseMs + 80);
    } else {
      maximumHeights = targets;
    }
    entity.wall = new Cesium.WallGraphics({
      positions,
      minimumHeights: grounds,
      maximumHeights,
      material: energyWallMaterial(cssColor),
    });
    viewer.scene.requestRender();
  })();
}

/**
 * Lazy-built spring lookup table for particle easing. Same physics
 * constants the legacy `useEngagementLine.ts` used, so the animation
 * feel carried over unchanged. Built on first use, then cached.
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

export function CesiumMap({
  ionToken,
  initialView,
  htmlMarkers,
  polylines,
  flyTo,
  orbit,
  showOsmBuildings = false,
  photorealisticTiles = false,
  sceneMode = '2D',
  ionImageryAssetId = 2,
  darkMonochromeMap = false,
  darkImagery = false,
  onHtmlMarkerSectorClick,
  onGroundClick,
  pickerRef,
  className = 'w-full h-full',
  panVelocity = null,
}: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const osmBuildingsRef = useRef<Cesium.Cesium3DTileset | null>(null);
  /**
   * Geometry entities (FOV / coverage) attached to HTML markers, keyed by
   * marker id. Paired with a per-id content fingerprint so we only rebuild the
   * sector polygon / ellipse whose params actually changed instead of tearing
   * down and re-tessellating every geometry whenever the `htmlMarkers` array
   * reference changes (which happens on hover/selection, not just on real
   * geometry changes).
   */
  const htmlGeometryEntitiesRef = useRef<Map<string, { fov?: Cesium.Entity; fovWall?: Cesium.Entity; coverage?: Cesium.Entity; dome?: Cesium.Entity; sectors?: Cesium.Entity[]; wall?: Cesium.Entity; sweep?: Cesium.Entity }>>(new Map());
  const htmlGeometryFingerprintRef = useRef<Map<string, { fovKey: string | null; coverageKey: string | null; sectorsKey: string | null; wallKey: string | null; sweepKey: string | null }>>(new Map());
  /**
   * Marker ids whose energy wall (coverage or FOV) has already played its
   * rise animation. Ensures the rise fires once per marker lifetime — moving
   * a placed asset rebuilds its wall at full height instead of re-rising.
   */
  const wallRisenRef = useRef<Set<string>>(new Set());
  /**
   * Maps a FOV-sector entity id → its owning marker + sector id, so the
   * LEFT_CLICK picker can route a polygon click back through
   * `onHtmlMarkerSectorClick`.
   */
  const htmlSectorOwnerRef = useRef<Map<string, { markerId: string; sectorId: string }>>(new Map());
  /**
   * Latest `onHtmlMarkerSectorClick` callback, held in a ref because the
   * LEFT_CLICK handler is wired once at mount (`[mountReady]`) and would
   * otherwise capture a stale prop.
   */
  const onHtmlMarkerSectorClickRef = useRef<typeof onHtmlMarkerSectorClick>(onHtmlMarkerSectorClick);
  useEffect(() => {
    onHtmlMarkerSectorClickRef.current = onHtmlMarkerSectorClick;
  }, [onHtmlMarkerSectorClick]);
  /** Held in a ref because the LEFT_CLICK handler is wired once at mount. */
  const onGroundClickRef = useRef<typeof onGroundClick>(onGroundClick);
  useEffect(() => {
    onGroundClickRef.current = onGroundClick;
  }, [onGroundClick]);
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
   * Per-marker cached surface height for Google-tiles mode (globe hidden).
   * `scene.sampleHeight` renders a tiny off-screen pick pass through the
   * 3D-tileset traversal — calling it per marker per frame (as the naive
   * preRender loop did) starves the MAIN camera's tile refinement: the
   * traversal keeps servicing one-pixel pick views and the visible scene
   * never streams past the coarse levels. Sample once per marker position,
   * cache the result, and only retry (throttled) while tiles are still
   * loading underneath the marker.
   */
  const htmlMarkerTileHeightRef = useRef<
    Map<string, { lat: number; lon: number; h: number | undefined; sampledAt: number }>
  >(new Map());

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

  /**
   * True while any polyline is time-animated (flowing particles or a
   * 2-point smoothed engagement line). These read `Date.now()` inside
   * `CallbackProperty` closures, so Cesium's request-render mode has no
   * way to know they need frames — while any are live we drive a rAF
   * loop that requests a render each frame (see effect below).
   */
  const [hasAnimatedPolylines, setHasAnimatedPolylines] = useState(false);

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

    let viewer: Cesium.Viewer;
    try {
      viewer = new Cesium.Viewer(containerRef.current, {
        // Only render frames when something actually changed (camera move,
        // entity update, tile load, explicit `scene.requestRender()`).
        // Without this Cesium redraws the whole globe at up to 60 fps even
        // when the map is completely still, pegging the GPU process.
        // Continuous animations (particle dots, kinematic markers, orbit)
        // each drive their own `requestRender()` loop — see below.
        requestRenderMode: true,
        // Never re-render just because simulation time advanced; nothing in
        // the scene is keyed to the Cesium clock.
        maximumRenderTimeChange: Infinity,
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
      });
    } catch (err) {
      // Surface the real error instead of letting it cascade through React's
      // boundary as the cryptic "scene of undefined" we used to see.
      console.error('[CesiumMap] Viewer construction failed:', err);
      throw err;
    }

    // Imagery. Three modes:
    //   1. `photorealisticTiles` — Google Photorealistic 3D Tiles via Cesium
    //      Ion (asset 2275207). The tiles ARE the world (photoreal terrain +
    //      buildings), so the classic globe skin is hidden entirely. Falls
    //      back to mode 3 if the tileset fails to load.
    //   2. `darkMonochromeMap` — CARTO Dark Matter (no-labels) raster
    //      tiles. Public CDN, no token. Used by `/demo` so recordings
    //      read cleanly against bright markers without depending on
    //      the Ion satellite. Synchronous construction (no `fromAssetId`
    //      promise), so we add immediately.
    //   3. Default — Bing Aerial via Cesium Ion (asset 2 by default).
    //      Guard against the viewer being destroyed (StrictMode
    //      double-mount, fast nav) before the imagery promise resolves
    //      — otherwise we crash inside Cesium internals.
    const useGoogleTiles = photorealisticTiles && !!ionToken;
    const loadIonImagery = () => {
      Cesium.IonImageryProvider.fromAssetId(ionImageryAssetId)
        .then((provider) => {
          if (viewer.isDestroyed()) return;
          const layer = viewer.imageryLayers.addImageryProvider(provider);
          if (darkImagery) applyDarkImagery(layer);
          viewer.scene.requestRender();
        })
        .catch((err) => {
          if (viewer.isDestroyed()) return;
          console.error('[CesiumMap] failed to load Ion imagery:', err);
        });
    };
    if (useGoogleTiles) {
      // Hide the globe immediately — the tiles replace it. The world terrain
      // provider still loads below so ground sampling / terrain-relative
      // cameras keep working (sampleTerrainMostDetailed reads the provider
      // directly, independent of globe rendering).
      viewer.scene.globe.show = false;
      Cesium.createGooglePhotorealistic3DTileset({ onlyUsingWithGoogleGeocoder: true })
        .then((tileset) => {
          if (viewer.isDestroyed()) return;
          // Sharper than the library defaults: the cinematic camera sits low
          // and oblique, where the default SSE 16 + dynamicScreenSpaceError
          // (which deliberately degrades oblique views to save bandwidth)
          // read as a blurry mess. Halving the SSE and disabling the dynamic
          // degradation costs more tile downloads but keeps the hero shots
          // crisp.
          tileset.maximumScreenSpaceError = 8;
          tileset.dynamicScreenSpaceError = false;
          tileset.foveatedScreenSpaceError = false;
          // Default cache (512 MB) evicts aggressively at low SSE; give the
          // demo scene room so orbiting doesn't re-stream the same tiles.
          tileset.cacheBytes = 1_536 * 1024 * 1024;
          viewer.scene.primitives.add(tileset);
          viewer.scene.requestRender();
        })
        .catch((err) => {
          console.error('[CesiumMap] failed to load Google Photorealistic 3D Tiles:', err);
          if (viewer.isDestroyed()) return;
          // Fall back to the classic globe so the map isn't a void.
          viewer.scene.globe.show = true;
          loadIonImagery();
        });
    } else if (darkMonochromeMap) {
      const provider = new Cesium.UrlTemplateImageryProvider({
        // CARTO Dark Matter (no labels). `{s}` rotates through the
        // listed subdomains for connection parallelism.
        url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        maximumLevel: 19,
        credit: '© OpenStreetMap contributors © CARTO',
      });
      viewer.imageryLayers.addImageryProvider(provider);
    } else {
      loadIonImagery();
    }

    // Cesium World Terrain (Ion asset 1). Without it the globe is a smooth
    // ellipsoid and 3D mode reads as a tilted satellite image — no real
    // depth. The terrain provider streams elevation tiles on demand and is
    // a no-op cost in 2D mode (heights are loaded but rendered flat).
    // Same destroy guard as the imagery loader for the same reason.
    Cesium.createWorldTerrainAsync()
      .then((terrain) => {
        if (viewer.isDestroyed()) return;
        viewer.terrainProvider = terrain;
        viewer.scene.requestRender();
      })
      .catch((err) => {
        if (viewer.isDestroyed()) return;
        console.error('[CesiumMap] failed to load world terrain:', err);
      });

    // Cesium OSM Buildings (Ion asset). Gives a close oblique view real 3D
    // structures for the cinematic demo. Requires a token; destroyed with the
    // viewer on unmount (it's a scene primitive), so no separate teardown.
    // Skipped in Google-tiles mode — the photoreal tiles already include
    // real buildings and the extruded OSM shells would z-fight them.
    if (showOsmBuildings && ionToken && !useGoogleTiles) {
      Cesium.createOsmBuildingsAsync()
        .then((tileset) => {
          if (viewer.isDestroyed()) return;
          viewer.scene.primitives.add(tileset);
          osmBuildingsRef.current = tileset;
          viewer.scene.requestRender();
        })
        .catch((err) => {
          if (viewer.isDestroyed()) return;
          console.error('[CesiumMap] failed to load OSM buildings:', err);
        });
    }

    viewer.scene.mode = SCENE_MODE_MAP[sceneMode];

    // Initial camera position. Use `setView` (instant) + a deliberately tall
    // `heightM` because in `SceneMode.SCENE2D` Cesium's camera "height" is
    // interpreted as the orthographic frustum extent, not a metric distance.
    // 50_000 m gives a city-scale view; the consumer can re-target with the
    // imperative `flyTo` prop afterwards.
    if (sceneMode === '3D' && initialView.pitchDeg != null) {
      // Oblique opening frame. Set an immediate ellipsoid-relative view, then
      // (if terrain-relative) refine it once the ground elevation is sampled so
      // the camera sits the requested height ABOVE the surface, not sea level.
      const heightM = initialView.heightM ?? 1500;
      viewer.camera.setView(
        obliqueView(
          initialView.lat,
          initialView.lon,
          0,
          heightM,
          initialView.pitchDeg,
          initialView.headingDeg ?? 0,
        ),
      );
      if (initialView.terrainRelative) {
        void (async () => {
          const view = await terrainObliqueView(
            viewer,
            initialView.lat,
            initialView.lon,
            heightM,
            initialView.pitchDeg!,
            initialView.headingDeg ?? 0,
          );
          if (viewer.isDestroyed()) return;
          viewer.camera.setView(view);
          viewer.scene.requestRender();
        })();
      }
    } else {
      viewer.camera.setView({
        destination: toCartesian({ ...initialView, heightM: initialView.heightM ?? 50_000 }),
      });
    }

    // Click → sector / bare-ground handler. (Marker click/hover is handled
    // by the HTML overlay markers themselves via React DOM events.)
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(event.position);
      const id = picked?.id;
      if (id instanceof Cesium.Entity && id.id) {
        const entityId = String(id.id);
        // FOV sector polygon → drill into the owning child.
        const sectorOwner = htmlSectorOwnerRef.current.get(entityId);
        if (sectorOwner) {
          onHtmlMarkerSectorClickRef.current?.(sectorOwner.markerId, sectorOwner.sectorId);
          return;
        }
      }
      // Bare-ground click → report lat/lon for click-to-place.
      if (onGroundClickRef.current) {
        const ground = pickGroundLatLon(viewer, event.position);
        if (ground) onGroundClickRef.current(ground.lat, ground.lon);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

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
      // With the globe hidden (Google Photorealistic 3D Tiles mode) terrain
      // tiles never load, so `globe.getHeight` returns undefined. Sample the
      // rendered scene geometry (the photoreal tiles) instead so markers sit
      // on the actual visible surface — including rooftops.
      //
      // CRITICAL: `scene.sampleHeight` may only be called sparingly — each
      // call runs a pick render through the tileset traversal, and hammering
      // it per frame starves the main view's tile refinement (the site area
      // visibly never sharpens). Heights are cached per marker id + position
      // in `htmlMarkerTileHeightRef`; unresolved samples (tiles not loaded
      // yet) retry at most every 500 ms.
      const tileHeights = htmlMarkerTileHeightRef.current;
      const nowMs = performance.now();
      const sampleTilesHeightCached = (id: string, lat: number, lon: number): number | undefined => {
        const cached = tileHeights.get(id);
        if (
          cached &&
          cached.lat === lat &&
          cached.lon === lon &&
          (cached.h !== undefined || nowMs - cached.sampledAt < 500)
        ) {
          return cached.h;
        }
        const h = viewer.scene.sampleHeightSupported
          ? viewer.scene.sampleHeight(Cesium.Cartographic.fromDegrees(lon, lat, 0, terrainSampleCarto))
          : undefined;
        tileHeights.set(id, { lat, lon, h, sampledAt: nowMs });
        return h;
      };
      const sampleSurfaceHeight = (id: string, lat: number, lon: number): number | undefined => {
        if (globe.show) {
          Cesium.Cartographic.fromDegrees(lon, lat, 0, terrainSampleCarto);
          return globe.getHeight(terrainSampleCarto);
        }
        return sampleTilesHeightCached(id, lat, lon);
      };
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
              // Quantize the moving position (~1 m) so the height cache holds
              // between frames instead of resampling continuously.
              const h = sampleSurfaceHeight(
                id,
                Math.round(s.lat * 1e5) / 1e5,
                Math.round(s.lon * 1e5) / 1e5,
              );
              if (typeof h === 'number') alt = h;
            }
            Cesium.Cartesian3.fromDegrees(s.lon, s.lat, alt, undefined, scratch);
            cart = scratch;
          }
          if (!s.frozen) kinematicActive = true;
        } else {
          cart = cartesians.get(id);
          if (cart && isMode3D) {
            const carto = cartographics.get(id);
            if (carto) {
              const h = sampleSurfaceHeight(id, carto.lat, carto.lon);
              const alt = typeof h === 'number' ? h : 0;
              // Mutate the cached Cartesian3 in place so static markers
              // also stay aligned to terrain without per-frame allocation.
              Cesium.Cartesian3.fromDegrees(carto.lon, carto.lat, alt, undefined, cart);
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
      if (kinematicActive) viewer.scene.requestRender();
    });

    viewerRef.current = viewer;
    if (import.meta.env.DEV) {
      // Dev-only escape hatch for debugging the live scene from the console.
      (window as unknown as Record<string, unknown>).__cesiumViewer = viewer;
    }

    // Hand the consumer an imperative screen->lat/lon picker for drag-drop.
    if (pickerRef) {
      pickerRef.current = (clientX: number, clientY: number) => {
        if (viewer.isDestroyed()) return null;
        const rect = viewer.canvas.getBoundingClientRect();
        const pos = new Cesium.Cartesian2(clientX - rect.left, clientY - rect.top);
        return pickGroundLatLon(viewer, pos);
      };
    }

    return () => {
      if (pickerRef) pickerRef.current = null;
      removePreRender();
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
      htmlGeometryEntitiesRef.current.clear();
      htmlGeometryFingerprintRef.current.clear();
      wallRisenRef.current.clear();
      htmlSectorOwnerRef.current.clear();
      polylineEntitiesRef.current.clear();
      polylineFingerprintRef.current.clear();
      polylineParticleEntitiesRef.current.clear();
      polylineParticleEndpointsRef.current.clear();
      polylineSmoothEndpointsRef.current.clear();
      motionTracksRef.current.clear();
      kinematicCartesianScratchRef.current.clear();
      htmlMarkerCartographicRef.current.clear();
      htmlMarkerTileHeightRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    cache.clear();
    cartographics.clear();
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
    // interaction (the viewer runs with `requestRenderMode: true`). For
    // kinematic markers this also seeds the preRender loop, which keeps
    // requesting frames while any track is still interpolating.
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
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const target = SCENE_MODE_MAP[sceneMode];
    if (viewer.scene.mode === target) return;
    viewer.scene.mode = target;
    viewer.scene.requestRender();

    if (sceneMode === '3D') {
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
          duration: prefersReduced ? 0 : 0.8,
        });
      }
    }
  }, [sceneMode]);

  // ── Continuous camera pan (edge-panning source) ────────────────────────────
  // Driven by the optional `panVelocity` prop. When non-null with any
  // non-zero component, we spin a requestAnimationFrame loop that slides
  // the camera each frame proportional to the elapsed dt (so it stays
  // frame-rate independent). The velocity is in unitless "screen widths
  // per second"; we multiply by the current camera height as a rough
  // meters-per-screen conversion so the *visual* pan speed feels
  // consistent across zoom levels (a city zoom pans slower in meters
  // than a country zoom, but the same in screen widths).
  //
  // Cleanup runs when the prop clears or the component unmounts —
  // otherwise flipping panVelocity between {vx: 0.5} and {vx: -0.5}
  // would leak an rAF handle from the previous run. The effect's dep
  // array intentionally reads BOTH components so a re-parameterisation
  // (same non-null pointer, different values) still restarts the loop
  // with the fresh numbers.
  useEffect(() => {
    if (!panVelocity) return;
    const vx = Math.max(-1, Math.min(1, panVelocity.vx));
    const vy = Math.max(-1, Math.min(1, panVelocity.vy));
    if (vx === 0 && vy === 0) return;

    const viewer = viewerRef.current;
    if (!viewer) return;

    let raf = 0;
    let lastTime = performance.now();
    const step = (now: number) => {
      if (viewer.isDestroyed()) return;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      // Prefer the live camera height. `positionCartographic` is null
      // during scene-mode transitions; fall back to a sensible middle
      // ground so the loop doesn't NaN out.
      const height = viewer.camera.positionCartographic?.height ?? 50_000;
      const scale = Math.max(1_000, height);
      viewer.camera.moveRight(vx * scale * dt);
      viewer.camera.moveUp(vy * scale * dt);
      viewer.scene.requestRender();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [panVelocity]);

  // ── Render driver for time-animated polylines ──────────────────────────────
  // Particle dots and smoothed engagement lines animate off `Date.now()`
  // inside CallbackProperty closures, which request-render mode can't see.
  // While any are on screen, request a frame per rAF tick so they keep
  // flowing; the loop stops (and the scene goes idle) the moment the last
  // animated line leaves the prop set.
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

  // ── FOV + coverage entities for HTML markers ──────────────────────────────
  // The DOM overlay renders the icon + tooltip; Cesium renders the geometry
  // (terrain-clamped sector polygon for FOV, ellipse for coverage).
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const entities = htmlGeometryEntitiesRef.current;
    const fingerprints = htmlGeometryFingerprintRef.current;
    const desiredIds = new Set<string>();
    let changed = false;

    if (htmlMarkers) {
      for (const m of htmlMarkers) {
        const hasFov = !!m.fov;
        const hasCoverage = m.coverageRadiusM != null;
        const sectors = m.fovSectors ?? [];
        const hasSectors = sectors.length > 0;
        const hasWall = !!m.coverageWall;
        const hasSweep = !!m.radarSweep;
        if (!hasFov && !hasCoverage && !hasSectors && !hasWall && !hasSweep) continue;
        desiredIds.add(m.id);

        const fovKey = hasFov
          ? `${m.lat},${m.lon},${m.fov!.rangeM},${m.fov!.bearingDeg},${m.fov!.widthDeg},${m.fov!.color ?? '#22b8cf'},${m.fov!.opacity ?? 0.18},${m.fov!.extrudedHeightM ?? 0},${m.fov!.baseHeightM ?? 0},${m.fov!.wall ? 1 : 0},${m.fov!.wallHeightM ?? 0}`
          : null;
        const coverageKey = hasCoverage
          ? `${m.lat},${m.lon},${m.coverageRadiusM},${m.coverageColor ?? '#22b8cf'},${m.coverageDome ? 1 : 0},${m.coverageHeightM ?? 0}`
          : null;
        const sectorsKey = hasSectors
          ? `${m.lat},${m.lon},` +
            sectors
              .map(
                (s, i) =>
                  `${s.id ?? i}:${s.rangeM}:${s.bearingDeg}:${s.widthDeg}:${s.color ?? '#22b8cf'}:${s.opacity ?? 0.18}`,
              )
              .join('|')
          : null;
        const wallKey = hasWall
          ? `${m.lat},${m.lon},${m.coverageWall!.radiusM},${m.coverageWall!.heightM},${m.coverageWall!.color ?? MARKER_HEX.coverageCyan}`
          : null;
        const sweepKey = hasSweep
          ? `${m.lat},${m.lon},${m.radarSweep!.rangeM},${m.radarSweep!.color ?? MARKER_HEX.coverageCyan},${m.radarSweep!.periodSec ?? 4}`
          : null;

        const prev = fingerprints.get(m.id);
        if (
          prev &&
          prev.fovKey === fovKey &&
          prev.coverageKey === coverageKey &&
          prev.sectorsKey === sectorsKey &&
          prev.wallKey === wallKey &&
          prev.sweepKey === sweepKey
        ) {
          // Identical FOV/coverage/sector params — leave the existing
          // geometry in place so Cesium doesn't re-tessellate it.
          continue;
        }

        changed = true;
        const slot = entities.get(m.id);
        if (slot?.fov) viewer.entities.remove(slot.fov);
        if (slot?.fovWall) viewer.entities.remove(slot.fovWall);
        if (slot?.coverage) viewer.entities.remove(slot.coverage);
        if (slot?.dome) viewer.entities.remove(slot.dome);
        if (slot?.wall) viewer.entities.remove(slot.wall);
        if (slot?.sweep) viewer.entities.remove(slot.sweep);
        if (slot?.sectors) {
          for (const s of slot.sectors) {
            viewer.entities.remove(s);
            htmlSectorOwnerRef.current.delete(String(s.id));
          }
        }
        const nextSlot: { fov?: Cesium.Entity; fovWall?: Cesium.Entity; coverage?: Cesium.Entity; dome?: Cesium.Entity; sectors?: Cesium.Entity[]; wall?: Cesium.Entity; sweep?: Cesium.Entity } = {};

        if (hasSectors) {
          const sectorEntities: Cesium.Entity[] = [];
          sectors.forEach((s, i) => {
            const sectorColor = Cesium.Color.fromCssColorString(s.color ?? '#22b8cf');
            const sectorOpacity = s.opacity ?? 0.18;
            const sectorEntityId = `${m.id}__sector__${s.id ?? i}`;
            const entity = viewer.entities.add({
              id: sectorEntityId,
              polygon: {
                hierarchy: new Cesium.PolygonHierarchy(
                  buildSectorPositions(m.lat, m.lon, s.rangeM, s.bearingDeg, s.widthDeg),
                ),
                material: sectorColor.withAlpha(sectorOpacity),
                outline: true,
                outlineColor: sectorColor.withAlpha(Math.min(1, sectorOpacity * 3)),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              },
            });
            sectorEntities.push(entity);
            if (s.id) {
              htmlSectorOwnerRef.current.set(sectorEntityId, { markerId: m.id, sectorId: s.id });
            }
          });
          nextSlot.sectors = sectorEntities;
        }

        if (hasFov) {
          const fovColor = Cesium.Color.fromCssColorString(m.fov!.color ?? '#22b8cf');
          const fovOpacity = m.fov!.opacity ?? 0.18;
          const extruded = m.fov!.extrudedHeightM != null;
          nextSlot.fov = viewer.entities.add({
            id: `${m.id}__fov`,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(
                buildSectorPositions(m.lat, m.lon, m.fov!.rangeM, m.fov!.bearingDeg, m.fov!.widthDeg),
              ),
              material: fovColor.withAlpha(fovOpacity),
              outline: true,
              outlineColor: fovColor.withAlpha(Math.min(1, fovOpacity * 3)),
              // Extruded volume ("threat corridor") vs terrain-clamped polygon.
              // Extrusion is incompatible with CLAMP_TO_GROUND, so the height
              // pair replaces the height reference when a volume is requested.
              ...(extruded
                ? {
                    height: m.fov!.baseHeightM ?? 0,
                    extrudedHeight: m.fov!.extrudedHeightM,
                  }
                : { heightReference: Cesium.HeightReference.CLAMP_TO_GROUND }),
            },
          });

          // Vertical "virtual wall" curtain along the cone perimeter. Built
          // async because it samples terrain at each vertex so the wall hugs
          // the ground and rises a constant height — reads as a glowing sensor
          // force-field over uneven terrain. Uses the animated energy-wall
          // material; on first creation for this marker id it can play a rise
          // animation (`wallRiseMs`).
          if (m.fov!.wall) {
            const wallHeight = m.fov!.wallHeightM ?? 120;
            const perimeter = buildSectorPerimeter(
              m.lat,
              m.lon,
              m.fov!.rangeM,
              m.fov!.bearingDeg,
              m.fov!.widthDeg,
            );
            const wallEntity = viewer.entities.add({ id: `${m.id}__fovwall` });
            nextSlot.fovWall = wallEntity;
            const riseMs = wallRisenRef.current.has(m.id) ? 0 : (m.fov!.wallRiseMs ?? 0);
            wallRisenRef.current.add(m.id);
            attachEnergyWall(
              viewer,
              wallEntity,
              perimeter,
              wallHeight,
              m.fov!.color ?? '#22b8cf',
              riseMs,
            );
          }
        }

        // Animated coverage "energy wall" ring — the coverage volume as a
        // glowing terrain-following curtain along the radius perimeter.
        if (hasWall) {
          const cw = m.coverageWall!;
          const perimeter = buildSectorPerimeter(m.lat, m.lon, cw.radiusM, 0, 360);
          const wallEntity = viewer.entities.add({ id: `${m.id}__energywall` });
          nextSlot.wall = wallEntity;
          const riseMs = wallRisenRef.current.has(m.id) ? 0 : (cw.riseMs ?? 0);
          wallRisenRef.current.add(m.id);
          attachEnergyWall(viewer, wallEntity, perimeter, cw.heightM, cw.color ?? MARKER_HEX.coverageCyan, riseMs);
        }

        // Rotating radar PPI sweep — an ellipse with a trailing conic-gradient
        // texture spun via `stRotation`. Anchored just above the sampled
        // ground so it doesn't z-fight the surface.
        if (hasSweep) {
          const sweep = m.radarSweep!;
          const periodSec = sweep.periodSec ?? 4;
          const sweepColor = Cesium.Color.fromCssColorString(sweep.color ?? MARKER_HEX.coverageCyan).withAlpha(0.5);
          const rotation = new Cesium.CallbackProperty(
            () => -(((performance.now() / 1000) % periodSec) / periodSec) * Math.PI * 2,
            false,
          );
          const sweepEntity = viewer.entities.add({
            id: `${m.id}__sweep`,
            position: Cesium.Cartesian3.fromDegrees(m.lon, m.lat, 0),
            ellipse: {
              semiMajorAxis: sweep.rangeM,
              semiMinorAxis: sweep.rangeM,
              material: new Cesium.ImageMaterialProperty({
                image: getRadarSweepImage(),
                transparent: true,
                color: sweepColor,
              }),
              stRotation: rotation,
              height: 1,
            },
          });
          nextSlot.sweep = sweepEntity;
          const sweepLat = m.lat;
          const sweepLon = m.lon;
          void (async () => {
            const [groundH] = await sampleGroundHeights(viewer, [{ lat: sweepLat, lon: sweepLon }]);
            if (viewer.isDestroyed() || !viewer.entities.contains(sweepEntity) || !sweepEntity.ellipse) return;
            sweepEntity.ellipse.height = new Cesium.ConstantProperty(groundH + 4);
            viewer.scene.requestRender();
          })();
        }

        if (hasCoverage) {
          const coverageColor = Cesium.Color.fromCssColorString(m.coverageColor ?? '#22b8cf');
          // Fill / outline opacities tuned to read clearly over satellite
          // imagery without burying the markers underneath. Roughly mirrors
          // the FOV cone's solidity (0.40 fill); the outline is fully opaque
          // so the ring boundary is unambiguous even at larger zoom-outs.
          nextSlot.coverage = viewer.entities.add({
            id: `${m.id}__coverage`,
            position: Cesium.Cartesian3.fromDegrees(m.lon, m.lat),
            ellipse: {
              semiMajorAxis: m.coverageRadiusM!,
              semiMinorAxis: m.coverageRadiusM!,
              material: coverageColor.withAlpha(0.25),
              outline: true,
              outlineColor: coverageColor.withAlpha(0.95),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
          });

          // 3D "shield" dome: a translucent half-ellipsoid over the footprint
          // so "protected" reads as a volume bubble, not just a ground ring.
          // Anchored to the sampled terrain height (async) so the dome's base
          // sits ON the ground instead of being buried at sea level.
          if (m.coverageDome) {
            const domeHeight = m.coverageHeightM ?? m.coverageRadiusM! * 0.5;
            const domeEntity = viewer.entities.add({
              id: `${m.id}__dome`,
              position: Cesium.Cartesian3.fromDegrees(m.lon, m.lat, 0),
              ellipsoid: {
                radii: new Cesium.Cartesian3(
                  m.coverageRadiusM!,
                  m.coverageRadiusM!,
                  domeHeight,
                ),
                material: coverageColor.withAlpha(0.12),
                outline: true,
                outlineColor: coverageColor.withAlpha(0.45),
                // Upper hemisphere only — a dome, not a full sphere.
                maximumCone: Cesium.Math.PI_OVER_TWO,
                slicePartitions: 24,
                stackPartitions: 12,
              },
            });
            nextSlot.dome = domeEntity;
            const domeLat = m.lat;
            const domeLon = m.lon;
            void (async () => {
              const [groundH] = await sampleGroundHeights(viewer, [{ lat: domeLat, lon: domeLon }]);
              if (viewer.isDestroyed() || !viewer.entities.contains(domeEntity)) return;
              // Centre the ellipsoid at ground level so its equator (the flat
              // base of the upper hemisphere) rests on the terrain.
              domeEntity.position = new Cesium.ConstantPositionProperty(
                Cesium.Cartesian3.fromDegrees(domeLon, domeLat, groundH),
              );
              viewer.scene.requestRender();
            })();
          }
        }

        entities.set(m.id, nextSlot);
        fingerprints.set(m.id, { fovKey, coverageKey, sectorsKey, wallKey, sweepKey });
      }
    }

    // Drop geometry for markers that no longer have FOV/coverage/sectors or left the set.
    for (const [id, slot] of entities) {
      if (desiredIds.has(id)) continue;
      if (slot.fov) viewer.entities.remove(slot.fov);
      if (slot.fovWall) viewer.entities.remove(slot.fovWall);
      if (slot.coverage) viewer.entities.remove(slot.coverage);
      if (slot.dome) viewer.entities.remove(slot.dome);
      if (slot.wall) viewer.entities.remove(slot.wall);
      if (slot.sweep) viewer.entities.remove(slot.sweep);
      if (slot.sectors) {
        for (const s of slot.sectors) {
          viewer.entities.remove(s);
          htmlSectorOwnerRef.current.delete(String(s.id));
        }
      }
      entities.delete(id);
      fingerprints.delete(id);
      wallRisenRef.current.delete(id);
      changed = true;
    }

    if (changed) viewer.scene.requestRender();
  }, [htmlMarkers]);

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

    // Particles and smoothed 2-point lines animate off wall-clock time
    // inside CallbackProperty closures — flag them so the render-driver
    // effect below keeps frames coming while any are on screen.
    setHasAnimatedPolylines(
      (polylines ?? []).some(
        (l) =>
          l.points.length >= 2 &&
          ((l.particles != null && l.particles.count > 0) ||
            (l.dashed === true && l.points.length === 2)),
      ),
    );

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
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const viewer = viewerRef.current;
    const heightM = flyTo.heightM ?? 1500;
    const duration = prefersReduced ? 0 : (flyTo.durationSec ?? 1.2);

    // Top-down (legacy) fly when no pitch is requested.
    if (flyTo.pitchDeg == null) {
      viewer.camera.flyTo({
        destination: toCartesian({ lat: flyTo.lat, lon: flyTo.lon, heightM }),
        duration,
      });
      return;
    }

    const headingDeg =
      flyTo.headingDeg != null ? flyTo.headingDeg : Cesium.Math.toDegrees(viewer.camera.heading);

    // Oblique fly. Ellipsoid-relative is synchronous; terrain-relative samples
    // the ground first so `heightM` reads as height above the surface.
    if (!flyTo.terrainRelative) {
      viewer.camera.flyTo({
        ...obliqueView(flyTo.lat, flyTo.lon, 0, heightM, flyTo.pitchDeg, headingDeg),
        duration,
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      const view = await terrainObliqueView(
        viewer,
        flyTo.lat,
        flyTo.lon,
        heightM,
        flyTo.pitchDeg!,
        headingDeg,
      );
      if (cancelled || viewer.isDestroyed()) return;
      viewer.camera.flyTo({ ...view, duration });
    })();
    return () => {
      cancelled = true;
    };
  }, [flyTo]);

  // ── Cinematic orbit ─────────────────────────────────────────────────────────
  // While `orbit` is set, circle the centre point at a fixed oblique pitch via
  // a per-tick `camera.lookAt`. Released (and the camera transform reset) when
  // cleared. Skipped under reduced motion — we hold a static oblique instead.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !orbit) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let cancelled = false;
    let teardown: (() => void) | null = null;

    void (async () => {
      const groundH = orbit.terrainRelative
        ? (await sampleGroundHeights(viewer, [{ lat: orbit.lat, lon: orbit.lon }]))[0]
        : 0;
      if (cancelled || viewer.isDestroyed()) return;

      const center = Cesium.Cartesian3.fromDegrees(orbit.lon, orbit.lat, groundH);
      const pitchRad = Cesium.Math.toRadians(orbit.pitchDeg);
      const range = orbit.heightM / Math.sin(Math.abs(pitchRad) || 1);

      if (prefersReduced) {
        viewer.camera.lookAt(center, new Cesium.HeadingPitchRange(0, pitchRad, range));
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        viewer.scene.requestRender();
        return;
      }

      let heading = viewer.camera.heading;
      let last = performance.now();
      const speed = (2 * Math.PI) / orbit.periodSec; // rad/sec
      const onTick = () => {
        const now = performance.now();
        const dt = Math.min(0.1, (now - last) / 1000); // clamp big gaps (tab blur)
        last = now;
        heading = (heading + speed * dt) % (2 * Math.PI);
        viewer.camera.lookAt(center, new Cesium.HeadingPitchRange(heading, pitchRad, range));
        viewer.scene.requestRender();
      };
      const prevShouldAnimate = viewer.clock.shouldAnimate;
      viewer.clock.onTick.addEventListener(onTick);
      viewer.clock.shouldAnimate = true;

      teardown = () => {
        viewer.clock.onTick.removeEventListener(onTick);
        if (!viewer.isDestroyed()) {
          // Release the lookAt transform so free camera control resumes, and
          // restore the clock so we don't leave it spinning for other consumers.
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
          viewer.clock.shouldAnimate = prevShouldAnimate;
        }
      };
    })();

    return () => {
      cancelled = true;
      if (teardown) teardown();
    };
  }, [orbit]);

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
      {/*
        Elevated above the map-draw overlay (`z-20` in `MapDrawOverlay`)
        so map icons stay visible AND clickable even when drawn
        polygons sit on top of them — fills no longer occlude markers,
        and clicks land on the icon rather than the polygon. The
        on-shape label layer at `z-30` is still above, so polygon
        names continue to float over icons (labels > icons > shapes >
        basemap).
      */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-[25]">
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
              willChange: 'transform',
            }}
          >
            {m.content}
          </div>
        ))}
      </div>
    </div>
  );
}
