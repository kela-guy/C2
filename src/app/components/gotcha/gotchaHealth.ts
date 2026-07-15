/**
 * Roll-up health for a composite Gotcha unit.
 *
 * `deviceHealth.ts` is strictly per-device (`getDeviceHealth`) — there is
 * no existing aggregation to reuse, so this is the (small) net-new helper
 * the plan calls for. Binary model: any child in error puts the unit in
 * error, so the roll-up reads identically to a single device tile.
 */

import { SEVERITY_COLOR } from '@/primitives/urgency';
import { MARKER_HEX } from '@/primitives/accentHex';
import type { DeviceHealth } from '../devices-panel/deviceHealth';
import type { GotchaUnit, SectorHealth } from './types';

/** Any child in error → `error`. Empty → `ok`. */
export function rollUpHealth(children: readonly SectorHealth[]): DeviceHealth {
  return children.includes('error') ? 'error' : 'ok';
}

/** Roll-up health for a whole unit — all sensors plus the camera, if any. */
export function getUnitHealth(unit: GotchaUnit): DeviceHealth {
  const parts: SectorHealth[] = unit.sensors.map((s) => s.health);
  if (unit.camera) parts.push(unit.camera.health);
  return rollUpHealth(parts);
}

/**
 * Latency threshold (ms). A stale link is an error with a "stale link"
 * cause — there is no intermediate warning tier. At ~4 s the feed can no
 * longer be trusted for engagement decisions, so that's the error floor.
 */
export const LATENCY_ERROR_MS = 4_000;

export function latencyHealth(latencyMs: number | undefined): DeviceHealth {
  if (latencyMs == null) return 'ok';
  if (latencyMs >= LATENCY_ERROR_MS) return 'error';
  return 'ok';
}

/**
 * Effective per-sector health, folding the latency monitor into the
 * declared health (worst wins). Keeps "the link is too laggy to trust"
 * visible on the map/row even when the sensor otherwise reports fine.
 */
export function effectiveSensorHealth(health: SectorHealth, latencyMs?: number): DeviceHealth {
  return rollUpHealth([health, latencyHealth(latencyMs)]);
}

/**
 * Gotcha sector / ring colour from a binary `DeviceHealth`. Reuses the
 * unified urgency palette (`SEVERITY_COLOR`) so the effector speaks the
 * same colour language as the threat markers: error → HIGH red. Healthy
 * sectors use the friendly cyan.
 *
 * Lives here (not in `CesiumTacticalMap`) so lightweight consumers — the
 * styleguide legend — can import the rule without pulling in Cesium.
 */
export function gotchaSectorColor(health: DeviceHealth): string {
  return health === 'error' ? SEVERITY_COLOR.HIGH : MARKER_HEX.fovCyan;
}
