/**
 * Static Gotcha effector registry.
 *
 * One seed unit for the MVP, placed near `SITE_CENTER` (the defended
 * centre the CUAS approach targets converge on — see `tacticalAssets.ts`).
 * Four 120-degree sensors at the standard 0/90/180/270 mounting cover the
 * full 360-degree ring with no gap. Map-free so non-map code can read it.
 */

import type { GotchaUnit } from './types';

/** Standard sensor range (m) for the seed unit. */
const GOTCHA_RANGE_M = 500;

export const GOTCHA_UNITS: GotchaUnit[] = [
  {
    id: 'GOTCHA-NVT-01',
    name: 'Gotcha North',
    // Offset from the hive/centre cluster so the marker doesn't pile up.
    lat: 32.469,
    lon: 35.005,
    targetClasses: ['drone'],
    sensors: [
      { id: 'GOTCHA-NVT-01-S-N', name: 'אזור א׳', bearingDeg: 0, fovDeg: 120, rangeM: GOTCHA_RANGE_M, health: 'ok', latencyMs: 800 },
      { id: 'GOTCHA-NVT-01-S-E', name: 'אזור ב׳', bearingDeg: 90, fovDeg: 120, rangeM: GOTCHA_RANGE_M, health: 'warning', latencyMs: 5200 },
      { id: 'GOTCHA-NVT-01-S-S', name: 'אזור ג׳', bearingDeg: 180, fovDeg: 120, rangeM: GOTCHA_RANGE_M, health: 'ok', latencyMs: 900 },
      { id: 'GOTCHA-NVT-01-S-W', name: 'אזור ד׳', bearingDeg: 270, fovDeg: 120, rangeM: GOTCHA_RANGE_M, health: 'ok', latencyMs: 750 },
    ],
    camera: {
      id: 'GOTCHA-NVT-01-CAM',
      name: 'Gotcha Camera / Net',
      health: 'ok',
    },
  },
];
