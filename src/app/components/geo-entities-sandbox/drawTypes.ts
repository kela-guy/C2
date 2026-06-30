/**
 * Geo Drawing Sandbox — shape model + geometry helpers.
 *
 * Shapes live in NORMALIZED canvas coordinates (each x/y in `[0, 1]`) so the
 * model is independent of the rendered map size. The hosting canvas projects
 * those normalized points into pixels at draw time, and back to lat/lng over
 * {@link import('./fixtures').SANDBOX_BOUNDS} for the coordinate readout.
 *
 * The 5 drawing tools map to 4 underlying geometries:
 *   - polygon  -> No Fly Zone, Patrol Area
 *   - polyline -> Virtual Wall
 *   - point    -> Critical Point
 *   - freehand -> Free Drawing
 *
 * Keeping the geometry kind separate from the tool id lets the controller share
 * one set of pointer/transform handlers across tools that draw the same shape.
 */

import type { GeoBounds } from './types';

/**
 * Drawing tool selected from the toolbar. `select` is the cursor/move tool.
 *
 * Two families coexist:
 *   - "semantic" ids (noFlyZone, virtualWall, criticalPoint, patrolArea,
 *     freeDraw) — used by the original 6 toolbar design variants where the
 *     intent of the shape drives the picker.
 *   - "geometric" ids (polygon, line, curve) — used by the For Cursor
 *     toolbar where the user picks the underlying shape first and labels
 *     it later. They map onto the same `GeoShapeKind` engine.
 */
export type GeoToolId =
  | 'select'
  | 'noFlyZone'
  | 'virtualWall'
  | 'criticalPoint'
  | 'patrolArea'
  | 'freeDraw'
  | 'polygon'
  | 'line'
  | 'arrow'
  | 'curve'
  | 'circle'
  | 'point';

/**
 * Underlying geometry the tool produces. `circle` is stored as the two
 * opposite corners of its bounding box (`points = [topLeft, bottomRight]`)
 * so the shared bbox / transform helpers resize it for free.
 */
export type GeoShapeKind = 'polygon' | 'polyline' | 'point' | 'freehand' | 'circle';

/** Normalized point in canvas-local space, both components in `[0, 1]`. */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Operational urgency tag attached to a shape from the in-context Area
 * Text popover (Dashboard map-draw flow). The sandbox doesn't read this
 * field — it's purely metadata for the live Dashboard overlay.
 */
export type GeoAreaStatus = 'low' | 'middle' | 'high';

/** Stroke style applied by the map-draw style popover. */
export type GeoLineStyle = 'solid' | 'dashed' | 'none';

/** Fill rendering mode applied by the map-draw style popover. */
export type GeoFillMode = 'fill' | 'transparent' | 'none';

/**
 * Semantic zone preset. The map-draw flow tags each shape with one of
 * these — the color, line color, and behavior parameters all derive
 * from the picked type. The {@link import('../map-draw/zoneTypes').ZONE_TYPES}
 * registry is the source of truth for labels / colors / parameter
 * schemas; this string is what's persisted on a shape.
 */
export type GeoZoneType =
  | 'general'
  | 'noFly'
  | 'restricted'
  | 'alarm'
  | 'silent';

/**
 * Per-zone parameters. Schema is loose on purpose — the inspector only
 * scaffolds the fields today; concrete validation lands when each type's
 * details ship.
 */
export interface GeoZoneParams {
  /** No Fly Zone — minimum altitude (meters) the restriction starts at. */
  altitudeMin?: number;
  /** No Fly Zone — maximum altitude (meters) the restriction ends at. */
  altitudeMax?: number;
  /** Alarm Zone — start of the active window, ISO time-of-day "HH:mm". */
  alarmStart?: string;
  /** Alarm Zone — end of the active window, ISO time-of-day "HH:mm". */
  alarmEnd?: string;
}

/** Persisted shape after a draw is finished. */
export interface GeoShape {
  id: string;
  /** Tool the shape was drawn with (drives label/default colors/icon). */
  tool: GeoToolId;
  kind: GeoShapeKind;
  /** User-editable name; defaults to the tool label + index. */
  name: string;
  description: string;
  /** Hex color used for the fill; stroke derives from this when no
   * dedicated stroke color is set. */
  color: string;
  /** Optional dedicated stroke/line color. Falls back to {@link color}. */
  strokeColor?: string;
  /** 0–1 fill opacity (only meaningful for polygon/freehand-as-area). */
  fillOpacity: number;
  /**
   * Geometry. Order is the order they were drawn in. For polygons we DO NOT
   * repeat the first point at the end — the renderer closes the path.
   */
  points: Vec2[];

  // ---------------------------------------------------------------------
  // Optional metadata used by the Dashboard map-draw flow. These fields
  // are not consumed by the sandbox; renderers there fall back to the
  // tool defaults when they're missing.
  // ---------------------------------------------------------------------

  /** Urgency status set from the Area Text popover (Dashboard). */
  status?: GeoAreaStatus;
  /**
   * Semantic zone preset. Selecting one updates `color` / `strokeColor`
   * to the type's signature color and unlocks the matching parameter
   * fields in the inspector.
   */
  zoneType?: GeoZoneType;
  /** Parameters scoped to the picked zone type. See {@link GeoZoneParams}. */
  zoneParams?: GeoZoneParams;
  /**
   * Optional reference link (e.g. a source map / KML / document URL)
   * attached from the panel's Coordinates section. Display-only metadata.
   */
  linkUrl?: string;
  /** Stroke style: solid / dashed / none. Default is solid. */
  lineStyle?: GeoLineStyle;
  /** Stroke width in CSS pixels. Default is 2. */
  strokeWidth?: number;
  /** How the fill is rendered: fill / transparent / no-fill. Default fill. */
  fillMode?: GeoFillMode;
  /** Hidden shapes are not painted on the map (toggled from the panel). */
  hidden?: boolean;
  /** Locked shapes can't be moved / scaled / rotated on the map. */
  locked?: boolean;
}

/** In-progress draft while the user is mid-draw. */
export interface DraftShape {
  tool: GeoToolId;
  kind: GeoShapeKind;
  points: Vec2[];
  /** Live cursor position so polygons/walls can preview the next segment. */
  cursor: Vec2 | null;
}

/** Selection-time transform handles. */
export type HandleId =
  | 'body'
  | 'rotate'
  | 'nw'
  | 'ne'
  | 'se'
  | 'sw'
  | 'n'
  | 'e'
  | 's'
  | 'w';

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function bbox(points: Vec2[]): BBox {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function bboxCenter(b: BBox): Vec2 {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function clampPoint(p: Vec2): Vec2 {
  return { x: clamp01(p.x), y: clamp01(p.y) };
}

/** Translate every point by `dx, dy` (normalized units). */
export function translatePoints(points: Vec2[], dx: number, dy: number): Vec2[] {
  return points.map((p) => clampPoint({ x: p.x + dx, y: p.y + dy }));
}

/**
 * Scale `points` about the given anchor by independent x/y factors. Anchor is
 * given in normalized space (typically the opposite corner during a corner
 * drag, or the bbox center during an edge drag).
 */
export function scalePoints(
  points: Vec2[],
  anchor: Vec2,
  sx: number,
  sy: number,
): Vec2[] {
  return points.map((p) =>
    clampPoint({
      x: anchor.x + (p.x - anchor.x) * sx,
      y: anchor.y + (p.y - anchor.y) * sy,
    }),
  );
}

/** Rotate every point around `center` by `radians`. */
export function rotatePoints(points: Vec2[], center: Vec2, radians: number): Vec2[] {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return points.map((p) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return clampPoint({
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    });
  });
}

/**
 * Project a normalized canvas point back to lat/lng using the same
 * equirectangular mapping as the existing entities sandbox.
 */
export function unproject(p: Vec2, bounds: GeoBounds): { lat: number; lng: number } {
  const lng = bounds.minLng + p.x * (bounds.maxLng - bounds.minLng);
  // Canvas y grows downward, latitude grows northward — invert.
  const lat = bounds.minLat + (1 - p.y) * (bounds.maxLat - bounds.minLat);
  return { lat, lng };
}

/**
 * Inverse of {@link unproject}: map a lat/lng onto a normalized canvas
 * point. Used by the panel's editable Coordinates section so typing a
 * coordinate re-anchors the matching vertex on the map. The result is
 * clamped to `[0, 1]` so out-of-bounds coordinates still land on-canvas.
 */
export function project(
  coord: { lat: number; lng: number },
  bounds: GeoBounds,
): Vec2 {
  const x = (coord.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
  // Latitude grows northward, canvas y grows downward — invert.
  const y = 1 - (coord.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
  return clampPoint({ x, y });
}

/** Format a normalized point as a "lat, lng" string with 4-decimal precision. */
export function formatLatLng(p: Vec2, bounds: GeoBounds): string {
  const { lat, lng } = unproject(p, bounds);
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/** Stable id generator — random suffix is enough for an in-memory sandbox. */
export function makeShapeId(tool: GeoToolId): string {
  return `${tool}-${Math.random().toString(36).slice(2, 8)}`;
}
