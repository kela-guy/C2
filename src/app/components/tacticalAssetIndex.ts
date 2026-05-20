/**
 * Reverse index from asset id → lat/lon, joining every static asset
 * registry in `tacticalAssets.ts` plus the Regulus effector defaults.
 *
 * Used by the time machine to hydrate `Detection.detectedBySensors`
 * with real sensor positions so the map can draw a ray from each
 * contributing sensor to the target it was seeing at that moment.
 * Built once at module load — registries are static.
 */

import {
  CAMERA_ASSETS,
  RADAR_ASSETS,
  LIDAR_ASSETS,
  DRONE_HIVE_ASSETS,
  WEAPON_SYSTEM_ASSETS,
  LAUNCHER_ASSETS,
  FLOODLIGHT_ASSETS,
  SPEAKER_ASSETS,
  REGULUS_EFFECTORS,
} from './tacticalAssets';

const INDEX: ReadonlyMap<string, { lat: number; lon: number }> = (() => {
  const m = new Map<string, { lat: number; lon: number }>();
  for (const a of CAMERA_ASSETS) m.set(a.id, { lat: a.latitude, lon: a.longitude });
  for (const a of RADAR_ASSETS) m.set(a.id, { lat: a.latitude, lon: a.longitude });
  for (const a of LIDAR_ASSETS) m.set(a.id, { lat: a.latitude, lon: a.longitude });
  for (const a of DRONE_HIVE_ASSETS) m.set(a.id, { lat: a.latitude, lon: a.longitude });
  for (const a of WEAPON_SYSTEM_ASSETS) m.set(a.id, { lat: a.latitude, lon: a.longitude });
  for (const a of LAUNCHER_ASSETS) m.set(a.id, { lat: a.latitude, lon: a.longitude });
  for (const a of FLOODLIGHT_ASSETS) m.set(a.id, { lat: a.latitude, lon: a.longitude });
  for (const a of SPEAKER_ASSETS) m.set(a.id, { lat: a.latitude, lon: a.longitude });
  for (const e of REGULUS_EFFECTORS) m.set(e.id, { lat: e.lat, lon: e.lon });
  return m;
})();

/**
 * Resolve a sensor / effector / asset id to its deployed position.
 * Returns `null` when the id isn't on the registry — callers should
 * fall back to the target position (co-located) or skip rendering.
 */
export function sensorPosition(id: string): { lat: number; lon: number } | null {
  return INDEX.get(id) ?? null;
}
