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
 *   critical : malfunction | connection error | battery <= 20%
 *   warning  : connection warning | battery <= 40%
 *   offline  : disconnected (known-absent, not alarmist)
 *   ok       : everything nominal
 */

import type { ConnectionState, Device, DevicesPanelStrings } from './types';

export type DeviceHealth = 'ok' | 'warning' | 'critical' | 'offline';

const BATTERY_CRITICAL_PCT = 20;
const BATTERY_LOW_PCT = 40;

export function getDeviceHealth(device: Device): DeviceHealth {
  const batt = device.batteryPct;
  if (
    device.operationalStatus === 'malfunctioning' ||
    device.connectionState === 'error' ||
    (batt != null && batt <= BATTERY_CRITICAL_PCT)
  ) {
    return 'critical';
  }
  if (device.connectionState === 'warning' || (batt != null && batt <= BATTERY_LOW_PCT)) {
    return 'warning';
  }
  if (device.connectionState === 'offline') return 'offline';
  return 'ok';
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
