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

const SCENE_MODE_MAP: Record<CesiumSceneMode, Cesium.SceneMode> = {
  '2D': Cesium.SceneMode.SCENE2D,
  '2.5D': Cesium.SceneMode.COLUMBUS_VIEW,
  '3D': Cesium.SceneMode.SCENE3D,
};

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
  const htmlGeometryEntitiesRef = useRef<Cesium.Entity[]>([]);
  /**
   * Polyline entities (trails, engagement lines, etc.) keyed by their
   * stable `CesiumPolyline.id`. Keyed (not array) so the polylines effect
   * can update positions in place rather than tearing down + recreating
   * every entity on each tick — that thrash makes drone trails flicker
   * because Cesium has to re-tessellate ground-clamped polylines from
   * scratch each time.
   */
  const polylineEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  /**
   * Per-frame screen positions for HTML markers. We compute Cartesian once
   * per `htmlMarkers` change, but project to canvas coordinates every frame
   * via the scene's preRender event.
   */
  const htmlMarkerNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const htmlMarkerCartesianRef = useRef<Map<string, Cesium.Cartesian3>>(new Map());

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

    // Bing Aerial via Cesium Ion (asset 2 by default). Guard against the
    // viewer being destroyed (StrictMode double-mount, fast nav) before the
    // imagery promise resolves — otherwise we crash inside Cesium internals.
    Cesium.IonImageryProvider.fromAssetId(ionImageryAssetId)
      .then((provider) => {
        if (viewer.isDestroyed()) return;
        viewer.imageryLayers.addImageryProvider(provider);
      })
      .catch((err) => {
        if (viewer.isDestroyed()) return;
        console.error('[CesiumMap] failed to load Ion imagery:', err);
      });

    viewer.scene.mode = SCENE_MODE_MAP[sceneMode];

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
    const removePreRender = viewer.scene.preRender.addEventListener(() => {
      const nodes = htmlMarkerNodesRef.current;
      const cartesians = htmlMarkerCartesianRef.current;
      if (nodes.size === 0) return;
      for (const [id, node] of nodes) {
        const cart = cartesians.get(id);
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
    });

    viewerRef.current = viewer;

    return () => {
      removePreRender();
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
      markerEntitiesRef.current.clear();
      fovEntitiesRef.current = [];
      coverageEntitiesRef.current = [];
      htmlGeometryEntitiesRef.current = [];
      polylineEntitiesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountReady]);

  // ── HTML marker positions ────────────────────────────────────────────────
  // Re-compute Cartesian3 cache whenever `htmlMarkers` changes. The
  // per-frame loop reads from this cache, so it stays cheap.
  useEffect(() => {
    const cache = htmlMarkerCartesianRef.current;
    cache.clear();
    if (!htmlMarkers) return;
    for (const m of htmlMarkers) {
      cache.set(m.id, Cesium.Cartesian3.fromDegrees(m.lon, m.lat));
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
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const target = SCENE_MODE_MAP[sceneMode];
    if (viewer.scene.mode !== target) viewer.scene.mode = target;
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
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    for (const entity of htmlGeometryEntitiesRef.current) viewer.entities.remove(entity);
    htmlGeometryEntitiesRef.current = [];

    if (!htmlMarkers) return;

    for (const m of htmlMarkers) {
      if (m.fov) {
        const fovColor = Cesium.Color.fromCssColorString(m.fov.color ?? '#22b8cf');
        const fovOpacity = m.fov.opacity ?? 0.18;
        const fovEntity = viewer.entities.add({
          id: `${m.id}__fov`,
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(
              buildSectorPositions(m.lat, m.lon, m.fov.rangeM, m.fov.bearingDeg, m.fov.widthDeg),
            ),
            material: fovColor.withAlpha(fovOpacity),
            outline: true,
            outlineColor: fovColor.withAlpha(Math.min(1, fovOpacity * 3)),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        });
        htmlGeometryEntitiesRef.current.push(fovEntity);
      }

      if (m.coverageRadiusM != null) {
        const coverageColor = Cesium.Color.fromCssColorString(m.coverageColor ?? '#22b8cf');
        const coverageEntity = viewer.entities.add({
          id: `${m.id}__coverage`,
          position: Cesium.Cartesian3.fromDegrees(m.lon, m.lat),
          ellipse: {
            semiMajorAxis: m.coverageRadiusM,
            semiMinorAxis: m.coverageRadiusM,
            material: coverageColor.withAlpha(0.10),
            outline: true,
            outlineColor: coverageColor.withAlpha(0.5),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        });
        htmlGeometryEntitiesRef.current.push(coverageEntity);
      }
    }
    viewer.scene.requestRender();
  }, [htmlMarkers]);

  // ── Polylines (trails, engagement lines, mission routes) ──────────────────
  // Diffed by id — entities that already exist get their positions / width
  // / material updated in place; only genuinely-new ids cause an `add`, only
  // genuinely-removed ids cause a `remove`. Keeping entities alive across
  // ticks lets Cesium reuse the tessellation cache for ground-clamped
  // polylines instead of rebuilding from scratch each second, which is what
  // was making the drone-patrol trails flicker.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const existing = polylineEntitiesRef.current;
    const desiredIds = new Set<string>();

    if (polylines) {
      for (const line of polylines) {
        if (line.points.length < 2) continue;
        desiredIds.add(line.id);

        const positions = line.points.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat));
        const color = Cesium.Color.fromCssColorString(line.color ?? '#22b8cf');
        const material = line.dashed
          ? new Cesium.PolylineDashMaterialProperty({ color, dashLength: 14 })
          : new Cesium.ColorMaterialProperty(color);
        const width = line.width ?? 2;

        const entity = existing.get(line.id);
        if (entity?.polyline) {
          // Update in place. ConstantProperty wrappers let Cesium short-circuit
          // its internal "did this change?" diff so unchanged frames don't
          // re-tessellate the polyline.
          entity.polyline.positions = new Cesium.ConstantProperty(positions);
          entity.polyline.material = material;
          entity.polyline.width = new Cesium.ConstantProperty(width);
        } else {
          // First sighting of this id — add a fresh entity.
          const fresh = viewer.entities.add({
            id: `${line.id}__polyline`,
            polyline: {
              positions,
              width,
              material,
              clampToGround: true,
            },
          });
          existing.set(line.id, fresh);
        }
      }
    }

    // Remove entities that are no longer in the desired set.
    for (const [id, entity] of existing) {
      if (!desiredIds.has(id)) {
        viewer.entities.remove(entity);
        existing.delete(id);
      }
    }

    viewer.scene.requestRender();
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
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
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
