/**
 * Unified "asset health" model for the device icon tile.
 *
 * Operators need ONE place to glance at to know whether an asset needs
 * attention. Today trouble is smeared across two axes (operational
 * malfunction + connection state) and four redundant cues. This rolls
 * them into a single worst-wins severity carried by the icon tile, with
 * the connection chip kept as the textual detail.
 *
 * Severity precedence (worst wins):
 *   critical : malfunction | connection error | battery <= 20%  (pulses)
 *   error    : open errors (errorCount > 0)  — broken, already known (static red, no pulse)
 *   warning  : connection warning | battery <= 40%
 *   offline  : disconnected (known-absent, not alarmist)
 *   ok       : everything nominal
 *
 * `critical` and `error` share the same red tile; the difference is the
 * pulse — critical means "needs attention now" (pings), error means
 * "broken, already logged" (still).
 */

import type { ConnectionState, Device, DeviceError, DevicesPanelStrings } from './types';

export type DeviceHealth = 'ok' | 'warning' | 'error' | 'critical' | 'offline';

const BATTERY_CRITICAL_PCT = 20;
const BATTERY_LOW_PCT = 40;

/**
 * Open-error count for a device. The structured `errors` list is the source
 * of truth when present; `errorCount` stays as a lightweight fallback for
 * callers that only know the number (no per-error detail).
 */
export function getDeviceErrorCount(device: Device): number {
  return device.errors?.length ?? device.errorCount ?? 0;
}

export function getDeviceHealth(device: Device): DeviceHealth {
  const batt = device.batteryPct;
  if (
    device.operationalStatus === 'malfunctioning' ||
    device.connectionState === 'error' ||
    (batt != null && batt <= BATTERY_CRITICAL_PCT)
  ) {
    return 'critical';
  }
  if (getDeviceErrorCount(device) > 0) {
    return 'error';
  }
  if (device.connectionState === 'warning' || (batt != null && batt <= BATTERY_LOW_PCT)) {
    return 'warning';
  }
  if (device.connectionState === 'offline') return 'offline';
  return 'ok';
}

/**
 * Worst-wins severity rank. Higher = more urgent. Mirrors the precedence in
 * `getDeviceHealth` so a roll-up reads identically to a single tile.
 */
const HEALTH_RANK: Record<DeviceHealth, number> = {
  critical: 4,
  error: 3,
  warning: 2,
  offline: 1,
  ok: 0,
};

/**
 * Effective health for a (possibly composite) device: the worst of the
 * device's own health and every child's health. Non-composite devices have
 * no `children`, so this equals `getDeviceHealth` — zero behavior change for
 * the existing flat devices.
 */
export function getEffectiveDeviceHealth(device: Device): DeviceHealth {
  let worst = getDeviceHealth(device);
  for (const child of device.children ?? []) {
    const childHealth = getEffectiveDeviceHealth(child);
    if (HEALTH_RANK[childHealth] > HEALTH_RANK[worst]) worst = childHealth;
  }
  return worst;
}

/** Number of children at or above `warning` — drives the persistent parent cue. */
export function getUnhealthyChildCount(device: Device): number {
  let count = 0;
  for (const child of device.children ?? []) {
    if (HEALTH_RANK[getEffectiveDeviceHealth(child)] >= HEALTH_RANK.warning) count += 1;
  }
  return count;
}

/**
 * Rolled-up open-error count for a (possibly composite) device: the device's
 * own errors plus every descendant child's. Lets a composite parent surface a
 * single Logs button even when the faults live entirely on its children.
 */
export function getCompositeErrorCount(device: Device): number {
  let count = getDeviceErrorCount(device);
  for (const child of device.children ?? []) {
    count += getCompositeErrorCount(child);
  }
  return count;
}

/**
 * A device's own open issues for the errors modal. Structured `errors[]` are
 * the source of truth when present; otherwise a warning / error / critical
 * health is synthesized into a single entry from its human-readable reason, so
 * a degraded asset that carries no structured error (e.g. a connection warning)
 * still explains itself in the modal. `ok` / `offline` contribute nothing.
 */
function getDeviceOwnIssues(
  device: Device,
  strings: DevicesPanelStrings,
  connectionLabels: Record<ConnectionState, string>,
): DeviceError[] {
  if (device.errors?.length) return device.errors;
  const health = getDeviceHealth(device);
  const reason = getDeviceHealthReason(device, strings, connectionLabels);
  if (health === 'warning') {
    return [{ severity: 'warning', message: reason ?? strings.healthWarning }];
  }
  if (health === 'error' || health === 'critical') {
    return [{ severity: 'error', message: reason ?? strings.healthError }];
  }
  return [];
}

/**
 * Flattened issue list for a (possibly composite) device: the device's own
 * issues first, then each child's, with the child name prefixed onto the
 * message so the parent's errors modal stays legible about which sensor /
 * camera is at fault. Warnings are included alongside errors so the amber Logs
 * button always opens onto an explanation.
 */
export function getAggregatedIssues(
  device: Device,
  strings: DevicesPanelStrings,
  connectionLabels: Record<ConnectionState, string>,
): DeviceError[] {
  const out: DeviceError[] = [...getDeviceOwnIssues(device, strings, connectionLabels)];
  for (const child of device.children ?? []) {
    for (const err of getAggregatedIssues(child, strings, connectionLabels)) {
      out.push({ ...err, message: `${child.name} · ${err.message}` });
    }
  }
  return out;
}

export interface DeviceHealthVisual {
  /** Icon-tile background. Severity tints mirror the `HEALTH_TONE` badge fills (flat, no ring). */
  tile: string;
  /** Fill passed to the device glyph. Offline desaturates; issues keep the glyph legible. */
  iconFill: string;
}

export const DEVICE_HEALTH_VISUAL: Record<DeviceHealth, DeviceHealthVisual> = {
  ok: { tile: 'bg-white/10', iconFill: 'white' },
  warning: { tile: 'bg-[oklch(0.733_0.194_75_/_0.3)]', iconFill: 'white' },
  // Same solid red as critical — the only difference is critical adds the ping.
  error: { tile: 'bg-[oklch(0.384_0.13_25)]', iconFill: 'white' },
  critical: { tile: 'bg-[oklch(0.384_0.13_25)]', iconFill: 'white' },
  offline: { tile: 'bg-white/[0.04]', iconFill: 'rgba(255,255,255,0.4)' },
};

/**
 * Critical-tile ping overlay — a brighter red than the solid `critical` tint so
 * the expanding ring stays legible as it animates over it (picked from the same
 * audition as the tile tints).
 */
export const DEVICE_HEALTH_CRITICAL_PING = 'bg-[oklch(0.591_0.192_25_/_0.55)]';

/**
 * Human-readable reason for the worst condition — drives the badge
 * tooltip + aria-label so the signal is never color-only. `null` when
 * the asset is healthy. Order mirrors `getDeviceHealth` precedence.
 */
export function getDeviceHealthReason(
  device: Device,
  strings: DevicesPanelStrings,
  connectionLabels: Record<ConnectionState, string>,
): string | null {
  const batt = device.batteryPct;
  if (device.operationalStatus === 'malfunctioning') return strings.healthMalfunction;
  if (device.connectionState === 'error') return connectionLabels.error;
  if (batt != null && batt <= BATTERY_CRITICAL_PCT) return `${strings.battery} ${batt}%`;
  if (device.connectionState === 'warning') return connectionLabels.warning;
  if (batt != null && batt <= BATTERY_LOW_PCT) return `${strings.battery} ${batt}%`;
  if (device.connectionState === 'offline') return connectionLabels.offline;
  return null;
}
