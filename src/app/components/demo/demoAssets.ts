/**
 * Demo-only tactical asset registries.
 *
 * A trimmed, deliberately uncluttered version of the production
 * `tacticalAssets.ts` set, sized for the scripted live-sales demo on
 * `/demo`: just enough sensors/effectors to make the flows read while
 * still conveying "border protection" coverage. Threaded into
 * `CesiumTacticalMap` via optional override props so production `/`
 * stays byte-identical (the map falls back to the real constants when
 * these aren't passed).
 *
 * Effector names are intentionally English-only — they mirror the
 * production `REGULUS_EFFECTORS` labels and read fine in either locale
 * for a demo surface.
 */

import type { MapAsset } from '@/app/components/tacticalAssets';
import type { GotchaEffector, RegulusEffector } from '@/imports/ListOfSystems';

export const DEMO_CAMERA_ASSETS: MapAsset[] = [
  { id: 'CAM-NVT-PTZ-N', latitude: 32.4746, longitude: 34.9983, typeLabel: 'PTZ Camera (North)', fovDeg: 90, bearingDeg: 350 },
  { id: 'CAM-NVT-PIXELSIGHT', latitude: 32.4616, longitude: 35.0063, typeLabel: 'PixelSight', fovDeg: 360, bearingDeg: 0 },
];

export const DEMO_RADAR_ASSETS: MapAsset[] = [
  { id: 'SENS-NVT-MAGOS-N', latitude: 32.4761, longitude: 34.9943, typeLabel: 'Magos (North)', fovDeg: 180, bearingDeg: 0 },
  { id: 'SENS-NVT-MAGOS-S', latitude: 32.4531, longitude: 35.0083, typeLabel: 'Magos (South)', fovDeg: 180, bearingDeg: 180 },
  { id: 'RAD-NVT-RADA', latitude: 32.4686, longitude: 34.9863, typeLabel: 'RADA ieMHR', fovDeg: 360, bearingDeg: 0 },
];

export const DEMO_DRONE_HIVE_ASSETS: MapAsset[] = [
  { id: 'HIVE-NVT-MAIN', latitude: 32.4666, longitude: 35.0013, typeLabel: 'Drone Hive', fovDeg: 0, bearingDeg: 0 },
];

/**
 * Four jammers along the perimeter. `REG-NVT-SOUTH` is the one the
 * scripted jam-fails beat targets, so the operator falls back to a
 * Gotcha net — the data itself stays `available`; the malfunction is
 * surfaced at engagement time, not seeded as offline.
 */
export const DEMO_REGULUS_EFFECTORS: RegulusEffector[] = [
  { id: 'REG-NVT-NORTH', name: 'Regulus North', lat: 32.4776, lon: 34.9913, coverageRadiusM: 2500, status: 'available' },
  { id: 'REG-NVT-EAST', name: 'Regulus East', lat: 32.4646, lon: 35.0213, coverageRadiusM: 2500, status: 'available' },
  { id: 'REG-NVT-SOUTH', name: 'Regulus South', lat: 32.4526, lon: 35.0013, coverageRadiusM: 2500, status: 'available' },
  { id: 'REG-NVT-WEST', name: 'Regulus West', lat: 32.4666, lon: 34.9763, coverageRadiusM: 2500, status: 'available' },
];

/**
 * Three fixed Gotcha net installations along the north-east defensive
 * arc — the corridor the scripted hostiles approach down. Each carries
 * an omnidirectional 1.4 km detect/act ring.
 */
export const GOTCHA_EFFECTORS: GotchaEffector[] = [
  { id: 'GOTCHA-NE', name: 'Gotcha NE', lat: 32.4806, lon: 35.0143, coverageRadiusM: 1400, status: 'available' },
  { id: 'GOTCHA-EAST', name: 'Gotcha East', lat: 32.4736, lon: 35.0203, coverageRadiusM: 1400, status: 'available' },
  { id: 'GOTCHA-CENTER', name: 'Gotcha Center', lat: 32.4706, lon: 35.0073, coverageRadiusM: 1400, status: 'available' },
];
