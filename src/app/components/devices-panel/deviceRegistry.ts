/**
 * Single source of truth for "what is a device of type X".
 *
 * Everything the row used to derive from scattered `isEcm` / `isSpeaker`
 * / `isFloodlight` / `isDrone` / `isCamera` booleans now lives here:
 *   - capabilities (drag, pin, camera preview)
 *   - which stat fields the expanded card shows, in order
 *   - which primary actions sit in the collapsed header cluster
 *   - which actions appear in the expanded footer, in order
 *   - which low-signal inspect actions collapse into the footer 3-dot overflow
 *
 * The collapsed header carries the always-visible primary cluster
 * (Show-on-map + per-type On/Off); secondary actions live in the footer,
 * and Logs / Notifications tuck into the overflow menu. The row components
 * just read `DEVICE_REGISTRY[device.type]` and map over these arrays — no
 * per-type branching anywhere in the tree.
 */

import type { Device, DeviceType, DevicesPanelStrings } from './types';
import { getBatteryColor, getHealthColor } from './utils';

/** Atomic controls a device can expose. Resolved to a `DeviceAction` per slot. */
export type DeviceActionKind =
  | 'center'
  | 'pin'
  | 'watchVideo'
  // Pathfinder takeoff primary. State-aware: renders Launch when docked,
  // Return-to-base when airborne (see `resolveDeviceAction`).
  | 'launchControl'
  // Pathfinder header abort. Resolves to a Stop glyph only while the launch
  // sequence is running (`pathfinderFlightState === 'launching'`); null otherwise.
  | 'launchAbort'
  | 'floodlight'
  | 'speaker'
  | 'jam'
  | 'wipers'
  | 'calibrate'
  | 'audio'
  | 'logs'
  | 'notifications';

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
  /**
   * Composite device: the expanded card renders `device.children` as nested
   * child rows, and the collapsed health tile rolls up the worst child. Used
   * by the Gotcha effector (parent + 4 sensors + camera).
   */
  composite?: boolean;
}

export interface DeviceTypeConfig {
  capabilities: DeviceCapabilities;
  /** Ordered candidate stat fields. Missing values are skipped at build time. */
  detailFields: DetailFieldKey[];
  /**
   * Always-visible header cluster, rendered icon-only at the row's
   * inline-end. `center` (Show-on-map) is pinned to the outer edge; any
   * other entries (per-type On/Off) sit inboard of it.
   */
  headerActions: DeviceActionKind[];
  /** Expanded footer action bar, in render order. */
  footerActions: DeviceActionKind[];
  /** Low-signal inspect actions collapsed into the footer 3-dot overflow. */
  overflowActions: DeviceActionKind[];
}

const SENSOR_FIELDS: DetailFieldKey[] = ['location', 'bearing', 'fieldOfView', 'health'];
/** Header carries only Show-on-map for sensor-style devices. */
const HEADER_CENTER: DeviceActionKind[] = ['center'];
/** The default inspect overflow — error channel + timed notifications. */
const INSPECT_OVERFLOW: DeviceActionKind[] = ['notifications', 'logs'];

export const DEVICE_REGISTRY: Record<DeviceType, DeviceTypeConfig> = {
  // Composite Gotcha effector. Rendered by the shared `DeviceRow`; the
  // `composite` capability makes the expansion render `device.children`
  // (its sensors + camera) as nested child rows, and the header tile rolls
  // their worst health up via `getEffectiveDeviceHealth`.
  effector: {
    capabilities: { composite: true },
    detailFields: ['location', 'health'],
    headerActions: HEADER_CENTER,
    footerActions: [],
    overflowActions: INSPECT_OVERFLOW,
  },
  camera: {
    capabilities: { pinnable: true, draggableToFeed: true, cameraPreview: true },
    detailFields: ['location', 'bearing', 'fieldOfView', 'health', 'battery'],
    headerActions: HEADER_CENTER,
    footerActions: ['watchVideo'],
    overflowActions: INSPECT_OVERFLOW,
  },
  radar: {
    capabilities: {},
    detailFields: SENSOR_FIELDS,
    headerActions: HEADER_CENTER,
    footerActions: [],
    overflowActions: INSPECT_OVERFLOW,
  },
  dock: {
    capabilities: {},
    detailFields: ['location', 'health', 'battery'],
    headerActions: HEADER_CENTER,
    footerActions: [],
    overflowActions: INSPECT_OVERFLOW,
  },
  drone: {
    capabilities: { pinnable: true },
    detailFields: ['location', 'altitude', 'health', 'battery'],
    headerActions: HEADER_CENTER,
    footerActions: ['watchVideo', 'calibrate', 'wipers'],
    overflowActions: INSPECT_OVERFLOW,
  },
  // Pathfinder mirrors the drone affordances (pinnable feed, calibrate) but
  // leads with the state-aware `launchControl` (Launch <-> Return to base).
  pathfinder: {
    capabilities: { pinnable: true },
    detailFields: ['location', 'altitude', 'health', 'battery'],
    headerActions: ['launchAbort', 'center'],
    footerActions: ['launchControl', 'watchVideo', 'calibrate'],
    overflowActions: INSPECT_OVERFLOW,
  },
  ecm: {
    capabilities: {},
    detailFields: ['location', 'coverage', 'health'],
    headerActions: HEADER_CENTER,
    footerActions: ['jam'],
    overflowActions: INSPECT_OVERFLOW,
  },
  launcher: {
    capabilities: {},
    detailFields: ['location', 'health'],
    headerActions: HEADER_CENTER,
    footerActions: [],
    overflowActions: ['logs'],
  },
  lidar: {
    capabilities: {},
    detailFields: SENSOR_FIELDS,
    headerActions: HEADER_CENTER,
    footerActions: [],
    overflowActions: INSPECT_OVERFLOW,
  },
  weapon_system: {
    capabilities: {},
    detailFields: ['location', 'health'],
    headerActions: HEADER_CENTER,
    footerActions: [],
    overflowActions: ['logs'],
  },
  floodlight: {
    capabilities: {},
    detailFields: ['location', 'health'],
    headerActions: ['floodlight', 'center'],
    footerActions: [],
    overflowActions: ['logs'],
  },
  speaker: {
    capabilities: {},
    detailFields: ['location', 'health'],
    headerActions: ['speaker', 'center'],
    footerActions: ['audio'],
    overflowActions: ['logs'],
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
