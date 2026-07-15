/**
 * Unified "asset health" model for the device icon tile.
 *
 * Two states only: the asset is working (`ok`) or it isn't (`error`).
 * Everything that used to be its own tier — connection warning, low
 * battery, offline — is now a *reason inside error*, carried as text
 * (tile tooltip, connection chip, errors modal), never as its own color.
 * The only time the tile isn't red is when everything works.
 *
 * Error triggers (any one is enough):
 *   malfunction | connection error/warning/offline | battery <= 20% | open errors
 */

import type { ConnectionState, Device, DeviceError, DevicesPanelStrings } from './types';

export type DeviceHealth = 'ok' | 'error';

const BATTERY_CRITICAL_PCT = 20;

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
    device.connectionState === 'warning' ||
    device.connectionState === 'offline' ||
    (batt != null && batt <= BATTERY_CRITICAL_PCT) ||
    getDeviceErrorCount(device) > 0
  ) {
    return 'error';
  }
  return 'ok';
}

/**
 * Effective health for a (possibly composite) device: `error` if the
 * device or any descendant child has an error. Non-composite devices have
 * no `children`, so this equals `getDeviceHealth`.
 */
export function getEffectiveDeviceHealth(device: Device): DeviceHealth {
  if (getDeviceHealth(device) === 'error') return 'error';
  for (const child of device.children ?? []) {
    if (getEffectiveDeviceHealth(child) === 'error') return 'error';
  }
  return 'ok';
}

/** Number of children in error — drives the persistent parent cue. */
export function getUnhealthyChildCount(device: Device): number {
  let count = 0;
  for (const child of device.children ?? []) {
    if (getEffectiveDeviceHealth(child) === 'error') count += 1;
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
 * the source of truth when present; otherwise an error health is synthesized
 * into a single entry from its human-readable reason, so a failing asset that
 * carries no structured error (e.g. a dropped link) still explains itself in
 * the modal. `ok` contributes nothing.
 */
function getDeviceOwnIssues(
  device: Device,
  strings: DevicesPanelStrings,
  connectionLabels: Record<ConnectionState, string>,
): DeviceError[] {
  if (device.errors?.length) return device.errors;
  if (getDeviceHealth(device) === 'error') {
    const reason = getDeviceHealthReason(device, strings, connectionLabels);
    return [{ severity: 'error', message: reason ?? strings.healthError }];
  }
  return [];
}

/**
 * Flattened issue list for a (possibly composite) device: the device's own
 * issues first, then each child's, with the child name prefixed onto the
 * message so the parent's errors modal stays legible about which sensor /
 * camera is at fault.
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
  /** Icon-tile background. The error tint mirrors the `HEALTH_TONE` badge fill (flat, no ring). */
  tile: string;
  /** Fill passed to the device glyph. Stays legible in both states. */
  iconFill: string;
}

export const DEVICE_HEALTH_VISUAL: Record<DeviceHealth, DeviceHealthVisual> = {
  ok: { tile: 'bg-white/10', iconFill: 'white' },
  error: { tile: 'bg-accent-danger-soft', iconFill: 'white' },
};

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
  if (device.connectionState === 'warning') return connectionLabels.warning;
  if (device.connectionState === 'offline') return connectionLabels.offline;
  if (batt != null && batt <= BATTERY_CRITICAL_PCT) return `${strings.battery} ${batt}%`;
  return null;
}
