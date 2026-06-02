/**
 * Single source of truth for "what is a device of type X".
 *
 * Everything the row used to derive from scattered `isEcm` / `isSpeaker`
 * / `isFloodlight` / `isDrone` / `isCamera` booleans now lives here:
 *   - capabilities (drag, pin, camera preview)
 *   - which stat fields the expanded card shows, in order
 *   - which actions appear in the expanded footer, in order
 *
 * The collapsed header carries no controls — every action lives in the
 * footer. The row components just read `DEVICE_REGISTRY[device.type]` and
 * map over these arrays — no per-type branching anywhere in the tree.
 */

import type { Device, DeviceType, DevicesPanelStrings } from '../devices-panel/types';
import { getBatteryColor, getHealthColor } from '../devices-panel/utils';

/** Atomic controls a device can expose. Resolved to a `DeviceAction` per slot. */
export type DeviceActionKind =
  | 'center'
  | 'mute'
  | 'pin'
  | 'floodlight'
  | 'speaker'
  | 'jam'
  | 'wipers'
  | 'calibrate';

/** Stat fields the expanded card can render. Rendered only when the device carries the value. */
export type DetailFieldKey =
  | 'location'
  | 'bearing'
  | 'fieldOfView'
  | 'coverage'
  | 'altitude'
  | 'health'
  | 'battery';

export interface DeviceCapabilities {
  /** Camera/drone rows can be pinned into a video feed slot. */
  pinnable?: boolean;
  /** Camera rows can be dragged onto a video tile (react-dnd source). */
  draggableToFeed?: boolean;
  /** Camera rows show the live preview hero above the stat grid. */
  cameraPreview?: boolean;
}

export interface DeviceTypeConfig {
  capabilities: DeviceCapabilities;
  /** Ordered candidate stat fields. Missing values are skipped at build time. */
  detailFields: DetailFieldKey[];
  /** Expanded footer action bar, in render order. */
  footerActions: DeviceActionKind[];
}

const SENSOR_FIELDS: DetailFieldKey[] = ['location', 'bearing', 'fieldOfView', 'health'];
const BASE_FOOTER: DeviceActionKind[] = ['center', 'mute'];

export const DEVICE_REGISTRY: Record<DeviceType, DeviceTypeConfig> = {
  camera: {
    capabilities: { pinnable: true, draggableToFeed: true, cameraPreview: true },
    detailFields: ['location', 'bearing', 'fieldOfView', 'health', 'battery'],
    footerActions: ['center', 'pin', 'mute'],
  },
  radar: {
    capabilities: {},
    detailFields: SENSOR_FIELDS,
    footerActions: BASE_FOOTER,
  },
  dock: {
    capabilities: {},
    detailFields: ['location', 'health', 'battery'],
    footerActions: BASE_FOOTER,
  },
  drone: {
    capabilities: { pinnable: true },
    detailFields: ['location', 'altitude', 'health', 'battery'],
    footerActions: ['center', 'pin', 'mute', 'wipers', 'calibrate'],
  },
  ecm: {
    capabilities: {},
    detailFields: ['location', 'coverage', 'health'],
    footerActions: ['jam', 'center', 'mute'],
  },
  launcher: {
    capabilities: {},
    detailFields: ['location', 'health'],
    footerActions: BASE_FOOTER,
  },
  lidar: {
    capabilities: {},
    detailFields: SENSOR_FIELDS,
    footerActions: BASE_FOOTER,
  },
  weapon_system: {
    capabilities: {},
    detailFields: ['location', 'health'],
    footerActions: BASE_FOOTER,
  },
  floodlight: {
    capabilities: {},
    detailFields: ['location', 'health'],
    footerActions: ['floodlight', 'center', 'mute'],
  },
  speaker: {
    capabilities: {},
    detailFields: ['location', 'health'],
    footerActions: ['speaker', 'center', 'mute'],
  },
};

export interface DeviceDetailRow {
  label: string;
  value: string;
  color?: string;
}

/**
 * Build the expanded-card stat rows from a registry field list. Pure —
 * replaces the presence-based branching that used to live in `utils.ts`.
 */
export function buildDetailRows(
  device: Device,
  strings: DevicesPanelStrings,
  fields: DetailFieldKey[],
): DeviceDetailRow[] {
  const rows: DeviceDetailRow[] = [];
  for (const field of fields) {
    switch (field) {
      case 'location':
        rows.push({ label: strings.location, value: `${device.lat.toFixed(4)}, ${device.lon.toFixed(4)}` });
        break;
      case 'bearing':
        if (device.bearingDeg != null) rows.push({ label: strings.bearing, value: `${device.bearingDeg}°` });
        break;
      case 'fieldOfView':
        if (device.fovDeg != null) rows.push({ label: strings.fieldOfView, value: `${device.fovDeg}°` });
        break;
      case 'coverage':
        if (device.coverageRadiusM != null)
          rows.push({ label: strings.coverage, value: `${device.coverageRadiusM.toLocaleString()}m` });
        break;
      case 'altitude':
        if (device.altitude != null) rows.push({ label: strings.altitude, value: device.altitude });
        break;
      case 'health':
        rows.push({
          label: strings.health,
          value: device.operationalStatus === 'malfunctioning' ? strings.healthMalfunction : strings.healthOk,
          color: getHealthColor(device.operationalStatus),
        });
        break;
      case 'battery':
        if (device.batteryPct != null)
          rows.push({ label: strings.battery, value: `${device.batteryPct}%`, color: getBatteryColor(device.batteryPct) });
        break;
    }
  }
  return rows;
}
