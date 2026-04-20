/**
 * Shared geodesy helpers for Mapbox overlays.
 * Single source of truth — import from here, don't reinline.
 */

export const EARTH_RADIUS_M = 6_371_000;
export const FOV_RADIUS_M = 1_200;
export const DRONE_FOV_RADIUS_M = 400;
export const DRONE_FOV_DEG = 90;

/** Haversine great-circle distance in metres. */
export function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/** Initial bearing (deg) from p1 to p2. 0° = north, 90° = east. */
export function bearingDegrees(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Destination point given origin, distance (m), and bearing (deg). Returns [lon, lat] (GeoJSON order). */
export function destination(lat: number, lon: number, distM: number, bearingDeg: number): [number, number] {
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const d = distM / EARTH_RADIUS_M;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

/**
 * GeoJSON Polygon ring [lon, lat][] for a FOV cone.
 * fovDeg >= 360 → full circle (no center vertex at start/end).
 * fovDeg <  360 → cone with center at origin (pie-slice).
 */
export function fovPolygon(lat: number, lon: number, fovDeg: number, bearingDeg: number, radiusM: number): [number, number][] {
  const center: [number, number] = [lon, lat];
  if (fovDeg >= 360) {
    const points: [number, number][] = [center];
    for (let i = 0; i <= 32; i++) {
      points.push(destination(lat, lon, radiusM, (i / 32) * 360));
    }
    points.push(center);
    return points;
  }
  const startAngle = bearingDeg - fovDeg / 2;
  const steps = Math.max(8, Math.floor((fovDeg / 360) * 32));
  const points: [number, number][] = [center];
  for (let i = 0; i <= steps; i++) {
    points.push(destination(lat, lon, radiusM, startAngle + (fovDeg * i) / steps));
  }
  points.push(center);
  return points;
}

/** Ray-casting point-in-polygon. Expects ring as [lon, lat][]. */
export function pointInPolygon(lon: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
