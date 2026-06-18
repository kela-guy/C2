/**
 * Geo Entities Sandbox — domain types.
 *
 * A "geo entity" is anything that lives on the tactical map with a position:
 * targets, friendly units, sensors, zones, and points of interest. The sandbox
 * uses a deliberately small, self-contained model (no coupling to the
 * production target/device types) so the surface can iterate freely before any
 * of it is promoted into the real map layers.
 */

export type GeoEntityKind = 'target' | 'friendly' | 'sensor' | 'poi' | 'zone';

export type GeoEntitySeverity = 'info' | 'caution' | 'critical';

/** Geographic position in decimal degrees plus optional altitude in meters. */
export interface GeoPosition {
  lat: number;
  lng: number;
  altitudeM?: number;
}

export interface GeoEntity {
  id: string;
  kind: GeoEntityKind;
  label: string;
  position: GeoPosition;
  /** Heading in degrees (0 = north, clockwise). Omitted for static points. */
  headingDeg?: number;
  severity?: GeoEntitySeverity;
  /** Whether the entity is currently selected/locked by the operator. */
  selected?: boolean;
}

/**
 * Normalized viewport bounds the sandbox projects entities into. Real map
 * layers use Cesium/Mapbox; the sandbox uses a flat equirectangular projection
 * over these bounds so it has zero map-engine dependencies.
 */
export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
