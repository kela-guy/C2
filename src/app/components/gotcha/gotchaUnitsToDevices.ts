/**
 * Adapt the composite `GotchaUnit` model into the shared `Device` shape so the
 * Gotcha renders through the normal registry-driven `DeviceRow` — identical in
 * look + behavior to every other asset — instead of a bespoke component tree.
 *
 * The unit becomes a `type: 'effector'` parent `Device` with `children` (its 4
 * sensors + camera). Each child's `DeviceHealth` is mapped back onto the plain
 * fields `getDeviceHealth` already reads (connection state / errors), so the
 * shared tile + roll-up reuse the existing derivation with no new vocabulary:
 *   warning  → connectionState 'warning'
 *   error    → an `errors[]` entry (static red, no pulse)
 *   critical → connectionState 'error' (pulsing red)
 *   offline  → connectionState 'offline'
 *   ok       → online
 */

import type {
  ConnectionState,
  Device,
  DeviceError,
  OperationalStatus,
} from '../devices-panel/types';
import type { DeviceHealth } from '../devices-panel/deviceHealth';
import { GotchaIcon, SensorIcon, CameraIcon } from '../tacticalIcons';
import { effectiveSensorHealth } from './gotchaHealth';
import type { GotchaUnit } from './types';

type HealthFields = Pick<
  Device,
  'status' | 'operationalStatus' | 'connectionState' | 'errors'
>;

/** Map a worst-wins `DeviceHealth` onto the fields `getDeviceHealth` reads. */
function healthToDeviceFields(health: DeviceHealth, faultMessage: string): HealthFields {
  const operationalStatus: OperationalStatus = 'operational';
  switch (health) {
    case 'critical':
      return { status: 'active', operationalStatus, connectionState: 'error' as ConnectionState };
    case 'error':
      return {
        status: 'active',
        operationalStatus,
        connectionState: 'online',
        errors: [{ severity: 'error', message: faultMessage } satisfies DeviceError],
      };
    case 'warning':
      return { status: 'active', operationalStatus, connectionState: 'warning' };
    case 'offline':
      return { status: 'offline', operationalStatus, connectionState: 'offline' };
    case 'ok':
    default:
      return { status: 'active', operationalStatus, connectionState: 'online' };
  }
}

/** `123.4°` formatting for the bearing portion of a sensor's metric line. */
function sensorMeta(bearingDeg: number, fovDeg: number, latencyMs?: number): string {
  const latency = latencyMs != null ? ` · ${(latencyMs / 1000).toFixed(1)}s` : '';
  return `${bearingDeg}° · ${fovDeg}° FOV${latency}`;
}

export function gotchaUnitsToDevices(units: GotchaUnit[]): Device[] {
  return units.map((unit) => {
    const sensorChildren: Device[] = unit.sensors.map((sensor) => {
      const health = effectiveSensorHealth(sensor.health, sensor.latencyMs);
      return {
        id: sensor.id,
        name: sensor.name,
        type: 'radar',
        lat: unit.lat,
        lon: unit.lon,
        fovDeg: sensor.fovDeg,
        bearingDeg: sensor.bearingDeg,
        coverageRadiusM: sensor.rangeM,
        subtitle: sensorMeta(sensor.bearingDeg, sensor.fovDeg, sensor.latencyMs),
        Icon: SensorIcon,
        ...healthToDeviceFields(health, `${sensor.name} fault`),
      } satisfies Device;
    });

    const children: Device[] = [...sensorChildren];
    if (unit.camera) {
      children.push({
        id: unit.camera.id,
        name: unit.camera.name,
        type: 'camera',
        lat: unit.lat,
        lon: unit.lon,
        subtitle: 'Camera / net',
        Icon: CameraIcon,
        ...healthToDeviceFields(unit.camera.health, `${unit.camera.name} fault`),
      } satisfies Device);
    }

    const subtitle = `${unit.targetClasses.join(' · ')} · ${unit.sensors.length} sectors`;

    return {
      id: unit.id,
      name: unit.name,
      type: 'effector',
      lat: unit.lat,
      lon: unit.lon,
      subtitle,
      Icon: GotchaIcon,
      children,
      // The parent's own health is nominal; the shared roll-up tile derives the
      // unit's state from the children via `getEffectiveDeviceHealth`.
      ...healthToDeviceFields('ok', ''),
    } satisfies Device;
  });
}
