/**
 * Pure helpers for the Devices Panel. No React, no DOM — safe to call
 * from any handler, easy to unit-test.
 */

import { HEALTH_TEXT_CLASS } from '@/primitives/HealthStatus';
import { STATUS_SORT, TYPE_ORDER } from './constants';
import type {
  ConnectionState,
  Device,
  DevicesPanelStrings,
  DeviceType,
  OperationalStatus,
} from './types';

/**
 * Normalize the `pinnedDeviceIds` prop. Consumers may pass either a
 * Set (cheap O(1) lookup, what PlaygroundPage uses) or a plain array
 * (cheaper to build for callers without state).
 */
export function normalizePinnedSet(
  value: ReadonlySet<string> | readonly string[] | undefined,
): ReadonlySet<string> {
  return value instanceof Set ? value : new Set(value ?? []);
}

/** Pick a representative icon per type from the first device of that type. */
export function pickTypeFilterIcons(
  devices: Device[],
): Partial<Record<DeviceType, Device['Icon']>> {
  const map: Partial<Record<DeviceType, Device['Icon']>> = {};
  for (const t of TYPE_ORDER) {
    const first = devices.find((d) => d.type === t);
    if (first) map[t] = first.Icon;
  }
  return map;
}

/** Number of devices of each type — drives the filter list & the Type-filter trigger summary. */
export function countDevicesByType(devices: Device[]): Record<DeviceType, number> {
  const counts = {} as Record<DeviceType, number>;
  for (const type of TYPE_ORDER) {
    counts[type] = devices.filter((d) => d.type === type).length;
  }
  return counts;
}

/** Apply search + type-filter + offline-first sort. Returns a fresh array; never mutates. */
export function filterDevices(
  devices: Device[],
  query: string,
  selectedTypes: readonly DeviceType[],
): Device[] {
  const q = query.trim().toLowerCase();
  const typeSet = selectedTypes.length === 0 ? null : new Set(selectedTypes);
  return devices
    .filter((d) => !typeSet || typeSet.has(d.type))
    .filter((d) => !q || d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q))
    .sort((a, b) => (STATUS_SORT[a.status] ?? 2) - (STATUS_SORT[b.status] ?? 2));
}

export interface DeviceGroup {
  type: DeviceType;
  label: string;
  devices: Device[];
}

/** Group devices by type in `TYPE_ORDER`, dropping empty groups. */
export function groupDevicesByType(
  devices: Device[],
  typeLabels: Record<DeviceType, string>,
): DeviceGroup[] {
  const groups: DeviceGroup[] = [];
  for (const type of TYPE_ORDER) {
    const ds = devices.filter((d) => d.type === type);
    if (ds.length > 0) {
      groups.push({ type, label: typeLabels[type], devices: ds });
    }
  }
  return groups;
}

/** Why is the ECM jam button disabled? `null` when it should remain enabled. */
export function getJamDisabledReason(
  device: Device,
  strings: DevicesPanelStrings,
): string | null {
  if (device.connectionState === 'offline') return strings.jamDisabledOffline;
  if (device.operationalStatus === 'malfunctioning') return strings.jamDisabledMalfunction;
  if (device.status === 'active') return strings.jamDisabledAlreadyActive;
  return null;
}

/** Tailwind text color for the battery percentage cell. */
export function getBatteryColor(pct: number): string {
  if (pct <= 20) return HEALTH_TEXT_CLASS.error;
  if (pct <= 40) return HEALTH_TEXT_CLASS.warning;
  return HEALTH_TEXT_CLASS.ok;
}

/** Tailwind text color for the operational-status cell. */
export function getHealthColor(status: OperationalStatus): string {
  return status === 'malfunctioning' ? HEALTH_TEXT_CLASS.warning : HEALTH_TEXT_CLASS.ok;
}

export interface DeviceDetailRow {
  label: string;
  value: string;
  color?: string;
}

/**
 * Build the rows shown in the expanded device card's stats grid. The
 * order here is the order they render in.
 */
export function buildDeviceDetailRows(
  device: Device,
  strings: DevicesPanelStrings,
): DeviceDetailRow[] {
  const rows: DeviceDetailRow[] = [
    { label: strings.location, value: `${device.lat.toFixed(4)}, ${device.lon.toFixed(4)}` },
  ];
  if (device.bearingDeg != null) {
    rows.push({ label: strings.bearing, value: `${device.bearingDeg}°` });
  }
  if (device.fovDeg != null) {
    rows.push({ label: strings.fieldOfView, value: `${device.fovDeg}°` });
  }
  if (device.coverageRadiusM != null) {
    rows.push({ label: strings.coverage, value: `${device.coverageRadiusM.toLocaleString()}m` });
  }
  if (device.altitude != null) {
    rows.push({ label: strings.altitude, value: device.altitude });
  }
  rows.push({
    label: strings.health,
    value:
      device.operationalStatus === 'malfunctioning'
        ? strings.healthMalfunction
        : strings.healthOk,
    color: getHealthColor(device.operationalStatus),
  });
  if (device.batteryPct != null) {
    rows.push({
      label: strings.battery,
      value: `${device.batteryPct}%`,
      color: getBatteryColor(device.batteryPct),
    });
  }
  return rows;
}

/** Optional collapsed-row metric line (e.g. "1.2km" coverage radius). Returns null when empty. */
export function buildCollapsedMetricLine(device: Device): string | null {
  const parts: string[] = [];
  if (device.coverageRadiusM != null) {
    parts.push(`${(device.coverageRadiusM / 1000).toFixed(1)}km`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** True when a device exposes pin/unpin affordances (cameras + drones today). */
export function isPinnableType(type: DeviceType): boolean {
  return type === 'camera' || type === 'drone' || type === 'pathfinder';
}

/** Resolve a device by id and return its type — used by `useFocusedDevice`. */
export function findDeviceType(devices: Device[], id: string): DeviceType | null {
  const d = devices.find((x) => x.id === id);
  return d ? d.type : null;
}

/** Resolve the localized connection-state label, falling back to the raw key. */
export function resolveConnectionLabel(
  state: ConnectionState,
  labels: Record<ConnectionState, string>,
): string {
  return labels[state] ?? state;
}
