/**
 * Static tactical asset registries — cameras, radars, lidars, hives, weapons,
 * launchers, Regulus effectors, and friendly drone patrol routes.
 *
 * Extracted from the (now-deleted) Mapbox `TacticalMap.tsx` so the dashboard +
 * Cesium map + sidebar can consume the data without dragging
 * `react-map-gl` / `mapbox-gl` into the bundle. Map-free.
 */

import type { RegulusEffector } from '@/imports/ListOfSystems';

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

export const LIDAR_ASSETS: MapAsset[] = [
  { id: 'LIDAR-NVT-01', latitude: 32.4706, longitude: 35.0103, typeLabel: 'LiDAR North', fovDeg: 360, bearingDeg: 0 },
];

export const WEAPON_SYSTEM_ASSETS: MapAsset[] = [
  { id: 'WPN-NVT-01', latitude: 32.4586, longitude: 34.9923, typeLabel: 'Iron Dome', fovDeg: 0, bearingDeg: 0 },
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
