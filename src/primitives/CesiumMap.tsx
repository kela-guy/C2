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

import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

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

export interface CesiumMapProps {
  /** Cesium Ion access token. Required for Bing Aerial / Cesium Ion assets. */
  ionToken: string;
  /** Initial camera target. Required so we don't open over the equator. */
  initialView: { lat: number; lon: number; heightM?: number };
  /** Markers to render. */
  markers?: CesiumMarker[];
  /** Imperatively fly the camera to a position; pass a NEW object each time you want to fly. */
  flyTo?: CesiumMapFlyTo | null;
  /** Scene mode. Defaults to '2D' for parity with our current top-down Mapbox view. */
  sceneMode?: CesiumSceneMode;
  /**
   * Cesium Ion imagery asset id. Defaults to 2 (Bing Maps Aerial),
   * Ion's standard default. See https://ion.cesium.com for other ids.
   */
  ionImageryAssetId?: number;
  /** Called when a marker pin is clicked. */
  onMarkerClick?: (id: string) => void;
  /** Called when a marker is hovered (id) or unhovered (null). */
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

  // ── Bootstrap viewer (mount once) ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    Cesium.Ion.defaultAccessToken = ionToken;

    const viewer = new Cesium.Viewer(containerRef.current, {
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

    // Bing Aerial via Cesium Ion (asset 2 by default).
    Cesium.IonImageryProvider.fromAssetId(ionImageryAssetId)
      .then((provider) => {
        viewer.imageryLayers.addImageryProvider(provider);
      })
      .catch((err) => console.error('[CesiumMap] failed to load Ion imagery:', err));

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

    viewerRef.current = viewer;

    return () => {
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
      markerEntitiesRef.current.clear();
      fovEntitiesRef.current = [];
      coverageEntitiesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Imperative fly-to ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!flyTo || !viewerRef.current) return;
    viewerRef.current.camera.flyTo({
      destination: toCartesian({ lat: flyTo.lat, lon: flyTo.lon, heightM: flyTo.heightM ?? 1500 }),
      duration: flyTo.durationSec ?? 1.2,
    });
  }, [flyTo]);

  return <div ref={containerRef} className={className} />;
}
