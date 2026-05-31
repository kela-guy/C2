/**
 * Static tactical asset registries — cameras, radars, lidars, hives, weapons,
 * launchers, Regulus effectors, and friendly drone patrol routes.
 *
 * Extracted from the (now-deleted) Mapbox `TacticalMap.tsx` so the dashboard +
 * Cesium map + sidebar can consume the data without dragging
 * `react-map-gl` / `mapbox-gl` into the bundle. Map-free.
 */

import type { RegulusEffector } from '@/imports/ListOfSystems';
import { fovPolygon, pointInPolygon, FOV_RADIUS_M } from '@/app/lib/mapGeo';

export interface MapAsset {
  id: string;
  latitude: number;
  longitude: number;
  typeLabel: string;
  fovDeg: number;
  bearingDeg: number;
}

export const CAMERA_ASSETS: MapAsset[] = [
  { id: 'CAM-NVT-PTZ-N', latitude: 32.4746, longitude: 34.9983, typeLabel: 'PTZ Camera (North)', fovDeg: 90, bearingDeg: 350 },
  { id: 'CAM-NVT-PIXELSIGHT', latitude: 32.4616, longitude: 35.0063, typeLabel: 'PixelSight', fovDeg: 360, bearingDeg: 0 },
];

export const RADAR_ASSETS: MapAsset[] = [
  { id: 'SENS-NVT-MAGOS-N', latitude: 32.4761, longitude: 34.9943, typeLabel: 'Magos (North)', fovDeg: 180, bearingDeg: 0 },
  { id: 'SENS-NVT-MAGOS-S', latitude: 32.4531, longitude: 35.0083, typeLabel: 'Magos (South)', fovDeg: 180, bearingDeg: 180 },
  { id: 'RAD-NVT-RADA', latitude: 32.4686, longitude: 34.9863, typeLabel: 'RADA ieMHR', fovDeg: 360, bearingDeg: 0 },
  { id: 'RAD-NVT-ELTA', latitude: 32.4596, longitude: 35.0213, typeLabel: 'Elta MHR', fovDeg: 360, bearingDeg: 0 },
];

export const DRONE_HIVE_ASSETS: MapAsset[] = [
  { id: 'HIVE-NVT-MAIN', latitude: 32.4666, longitude: 35.0013, typeLabel: 'Drone Hive', fovDeg: 0, bearingDeg: 0 },
];

/**
 * The defended center of the protected area — the point inbound threats
 * are assumed to be heading toward. Matches the hive/cluster center the
 * live CUAS approach targets converge on, so Flow Builder playback moves
 * its spawn along the same axis a real incoming track would.
 */
export const SITE_CENTER = { lat: 32.4666, lon: 35.0013 } as const;

export const LIDAR_ASSETS: MapAsset[] = [
  { id: 'LIDAR-NVT-01', latitude: 32.4706, longitude: 35.0103, typeLabel: 'LiDAR North', fovDeg: 360, bearingDeg: 0 },
];

export const WEAPON_SYSTEM_ASSETS: MapAsset[] = [
  { id: 'WPN-NVT-01', latitude: 32.4586, longitude: 34.9923, typeLabel: 'Iron Dome', fovDeg: 0, bearingDeg: 0 },
];

// Floodlights + PA speakers. Deliberately pushed out toward the site
// perimeter (wider lat/lon spread than the sensor cluster) so the map
// markers don't pile up in the center.
// `bearingDeg` aims each floodlight's beam inward toward SITE_CENTER;
// `fovDeg` is the full cone (beam spread). Rendered as an always-on
// orange wedge on the map.
export const FLOODLIGHT_ASSETS: MapAsset[] = [
  { id: 'FL-NVT-N', latitude: 32.4802, longitude: 35.0148, typeLabel: 'Floodlight (North)', fovDeg: 70, bearingDeg: 220 },
  { id: 'FL-NVT-S', latitude: 32.4512, longitude: 34.9902, typeLabel: 'Floodlight (South)', fovDeg: 70, bearingDeg: 31 },
];

export const SPEAKER_ASSETS: MapAsset[] = [
  { id: 'SPK-NVT-W', latitude: 32.4628, longitude: 34.9712, typeLabel: 'PA Speaker (West Gate)', fovDeg: 0, bearingDeg: 0 },
  { id: 'SPK-NVT-E', latitude: 32.4738, longitude: 35.0262, typeLabel: 'PA Speaker (East Tower)', fovDeg: 0, bearingDeg: 0 },
];

export const LAUNCHER_ASSETS = [
  { id: 'LCHR-NVT-ALPHA', latitude: 32.4626, longitude: 34.9963 },
  { id: 'LCHR-NVT-BRAVO', latitude: 32.4756, longitude: 35.0113 },
  { id: 'LCHR-NVT-GAMMA', latitude: 32.4506, longitude: 35.0243 },
];

export const REGULUS_EFFECTORS: RegulusEffector[] = [
  { id: 'REG-NVT-NORTH', name: 'Regulus North', lat: 32.4776, lon: 34.9913, coverageRadiusM: 2500, status: 'available' },
  { id: 'REG-NVT-EAST', name: 'Regulus East', lat: 32.4646, lon: 35.0213, coverageRadiusM: 2500, status: 'available' },
  { id: 'REG-NVT-SOUTH', name: 'Regulus South', lat: 32.4526, lon: 35.0013, coverageRadiusM: 2500, status: 'available' },
  { id: 'REG-NVT-WEST', name: 'Regulus West', lat: 32.4666, lon: 34.9763, coverageRadiusM: 2500, status: 'available' },
];

/**
 * Sensors whose FOV cone covers a given lat/lon. Mirrors the legacy
 * `findDetectingSensors` in `TacticalMap.tsx` but lives next to the
 * asset registry so non-map code (e.g. the Flow Builder) can call it
 * without pulling react-map-gl into the bundle.
 *
 * If no asset's strict FOV contains the point, falls back to the
 * single nearest asset by Euclidean lat/lon distance — guarantees the
 * caller always gets at least one sensor when at least one exists, so
 * panel UX never lands in the "no detector matched" dead end on a
 * fresh location.
 */
export function findDetectingSensorAssets(lat: number, lon: number): MapAsset[] {
  const pool = [...CAMERA_ASSETS, ...RADAR_ASSETS, ...LIDAR_ASSETS];
  const result: MapAsset[] = [];
  for (const asset of pool) {
    const ring = fovPolygon(
      asset.latitude,
      asset.longitude,
      asset.fovDeg,
      asset.bearingDeg,
      FOV_RADIUS_M,
    );
    if (pointInPolygon(lon, lat, ring)) result.push(asset);
  }
  if (result.length === 0 && pool.length > 0) {
    let closest: MapAsset | null = null;
    let bestDistSq = Number.POSITIVE_INFINITY;
    for (const asset of pool) {
      const dLat = asset.latitude - lat;
      const dLon = asset.longitude - lon;
      const distSq = dLat * dLat + dLon * dLon;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        closest = asset;
      }
    }
    if (closest) result.push(closest);
  }
  return result;
}
