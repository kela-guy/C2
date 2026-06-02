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

import type { ConnectionState, Device, DevicesPanelStrings } from '../devices-panel/types';

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
  /** Icon-tile background + ring. Tints are intentionally faint (ui-craft: rings over fills). */
  tile: string;
  /** Fill passed to the device glyph. Offline desaturates; issues keep the glyph legible. */
  iconFill: string;
}

export const DEVICE_HEALTH_VISUAL: Record<DeviceHealth, DeviceHealthVisual> = {
  ok: { tile: 'bg-white/10', iconFill: 'white' },
  warning: { tile: 'bg-amber-500/15 ring-1 ring-inset ring-amber-400/25', iconFill: 'white' },
  critical: { tile: 'bg-red-500/15 ring-1 ring-inset ring-red-400/30', iconFill: 'white' },
  offline: { tile: 'bg-white/[0.04]', iconFill: 'rgba(255,255,255,0.4)' },
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
  if (batt != null && batt <= BATTERY_CRITICAL_PCT) return `${strings.battery} ${batt}%`;
  if (device.connectionState === 'warning') return connectionLabels.warning;
  if (batt != null && batt <= BATTERY_LOW_PCT) return `${strings.battery} ${batt}%`;
  if (device.connectionState === 'offline') return connectionLabels.offline;
  return null;
}
