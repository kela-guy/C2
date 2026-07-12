/**
 * Roll-up health for a composite Gotcha unit.
 *
 * `deviceHealth.ts` is strictly per-device (`getDeviceHealth`) — there is
 * no existing aggregation to reuse, so this is the (small) net-new helper
 * the plan calls for. Worst-child wins, with the SAME precedence
 * `getDeviceHealth` uses so the roll-up reads identically to a single
 * device tile: error > warning > offline > ok.
 */

import { SEVERITY_COLOR } from '@/primitives/urgency';
import { MARKER_HEX } from '@/primitives/accentHex';
import type { DeviceHealth } from '../devices-panel/deviceHealth';
import type { GotchaUnit, SectorHealth } from './types';

/** Worst-wins rank. Higher = more urgent. Mirrors `getDeviceHealth` order. */
const HEALTH_RANK: Record<DeviceHealth, number> = {
  error: 3,
  warning: 2,
  offline: 1,
  ok: 0,
};

/** Worst severity across a set of child healths. Empty → `ok`. */
export function rollUpHealth(children: readonly SectorHealth[]): DeviceHealth {
  let worst: DeviceHealth = 'ok';
  for (const h of children) {
    if (HEALTH_RANK[h] > HEALTH_RANK[worst]) worst = h;
  }
  return worst;
}

/** Roll-up health for a whole unit — all sensors plus the camera, if any. */
export function getUnitHealth(unit: GotchaUnit): DeviceHealth {
  const parts: SectorHealth[] = unit.sensors.map((s) => s.health);
  if (unit.camera) parts.push(unit.camera.health);
  return rollUpHealth(parts);
}

/**
 * Latency thresholds (ms). Assumption to confirm — at ~10 s the feed is
 * "almost worthless", so that's the error floor; warning kicks in well
 * before. Returns the health a sensor's latency alone implies, or `ok`.
 */
export const LATENCY_WARNING_MS = 4_000;
export const LATENCY_CRITICAL_MS = 10_000;

export function latencyHealth(latencyMs: number | undefined): DeviceHealth {
  if (latencyMs == null) return 'ok';
  if (latencyMs >= LATENCY_CRITICAL_MS) return 'error';
  if (latencyMs >= LATENCY_WARNING_MS) return 'warning';
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
 * Gotcha sector / ring colour from a worst-wins `DeviceHealth`. Reuses the
 * unified urgency palette (`SEVERITY_COLOR`) so the effector speaks the same
 * colour language as the threat markers: warning → MEDIUM amber,
 * error → HIGH red. Offline is the neutral LOW zinc
 * (known-absent, not alarmist); healthy sectors use the friendly cyan.
 *
 * Lives here (not in `CesiumTacticalMap`) so lightweight consumers — the
 * styleguide legend — can import the rule without pulling in Cesium.
 */
export function gotchaSectorColor(health: DeviceHealth): string {
  switch (health) {
    case 'warning':
      return SEVERITY_COLOR.MEDIUM;
    case 'error':
      return SEVERITY_COLOR.HIGH;
    case 'offline':
      return SEVERITY_COLOR.LOW;
    default:
      return MARKER_HEX.fovCyan;
  }
}
