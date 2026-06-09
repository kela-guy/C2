/**
 * App-side adapter that turns the TacticalMap asset registries into the
 * generic `Device[]` shape consumed by `<DevicesPanel />`.
 *
 * Lives in `src/app/components/` (not in primitives or in DevicesPanel.tsx)
 * so DevicesPanel itself stays free of app-specific imports and is
 * drop-in for any consumer.
 */

import { useMemo } from 'react';
import {
  CAMERA_ASSETS,
  RADAR_ASSETS,
  DRONE_HIVE_ASSETS,
  REGULUS_EFFECTORS,
  LAUNCHER_ASSETS,
  LIDAR_ASSETS,
  WEAPON_SYSTEM_ASSETS,
  FLOODLIGHT_ASSETS,
  SPEAKER_ASSETS,
} from './tacticalAssets';
import {
  SensorIcon,
  CameraIcon,
  RadarIcon,
  DroneHiveIcon,
  LauncherIcon,
  LidarIcon,
  FloodlightIcon,
  SpeakerIcon,
  GotchaIcon,
} from './tacticalIcons';
import { useStrings } from '@/lib/intl';
import type { Device } from './DevicesPanel';
import type { GotchaEffector } from '@/imports/ListOfSystems';

const DEVICE_HEALTH: Record<string, 'operational' | 'malfunctioning'> = {
  'SENS-NVT-MAGOS-S': 'malfunctioning',
  'REG-NVT-SOUTH': 'malfunctioning',
};

const DEVICE_CONNECTION: Record<string, 'online' | 'offline' | 'error' | 'warning'> = {
  'SENS-NVT-MAGOS-S': 'warning',
  'REG-NVT-SOUTH': 'error',
  // Held stationary on the map by `OFFLINE_FRIENDLY_DRONE_IDS` in useTacticalTargets.
  'FRIENDLY-02': 'offline',
  'LIDAR-NVT-01': 'warning',
};

const CAMERA_CAPS: Record<string, ('video' | 'photo')[]> = {
  'CAM-NVT-PTZ-N': ['video', 'photo'],
  'CAM-NVT-PIXELSIGHT': ['video'],
};

const DroneDeviceIcon = ({ size = 28, fill = 'white' }: { size?: number; fill?: string }) => (
  // The near-black stroke is icon-art (gives the geometry crisp
  // separation against any substrate). Intentionally NOT routed
  // through accentHex() — it's outline geometry, not a theme color.
  <svg width={size} height={size} viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M23.334 15.7502L9.33696 0.583495L5.86139 4.0835L10.5007 11.0835L9.32456 15.7502L10.5007 20.4168L5.86139 27.4168L9.32456 30.6801L23.334 15.7502Z"
      fill={fill}
      stroke="#0a0a0a"
      strokeWidth="1"
    />
  </svg>
);

export type SimFriendlyDroneDevice = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitude: string;
};

/** Memoized hook returning the full `Device[]` for this app. */
export function useDevicesFromAssets(
  friendlyDrones: SimFriendlyDroneDevice[] = [],
  gotchaEffectors: GotchaEffector[] = [],
): Device[] {
  const t = useStrings();
  const launcherDeviceName = t.simulation.deviceNames.missileLauncher;
  return useMemo<Device[]>(() => [
    ...CAMERA_ASSETS.map((a) => ({
      id: a.id,
      name: a.typeLabel,
      type: 'camera' as const,
      lat: a.latitude,
      lon: a.longitude,
      status: 'available' as const,
      operationalStatus: (DEVICE_HEALTH[a.id] ?? 'operational') as Device['operationalStatus'],
      connectionState: (DEVICE_CONNECTION[a.id] ?? 'online') as Device['connectionState'],
      fovDeg: a.fovDeg,
      bearingDeg: a.bearingDeg,
      Icon: CameraIcon,
      batteryPct: a.id === 'CAM-NVT-PTZ-N' ? 18 : undefined,
      capabilities: CAMERA_CAPS[a.id],
    })),
    ...RADAR_ASSETS.map((a) => ({
      id: a.id,
      name: a.typeLabel,
      type: 'radar' as const,
      lat: a.latitude,
      lon: a.longitude,
      status: 'available' as const,
      operationalStatus: (DEVICE_HEALTH[a.id] ?? 'operational') as Device['operationalStatus'],
      connectionState: (DEVICE_CONNECTION[a.id] ?? 'online') as Device['connectionState'],
      fovDeg: a.fovDeg,
      bearingDeg: a.bearingDeg,
      Icon: RadarIcon,
    })),
    ...DRONE_HIVE_ASSETS.map((a) => ({
      id: a.id,
      name: a.typeLabel,
      type: 'dock' as const,
      lat: a.latitude,
      lon: a.longitude,
      status: 'available' as const,
      operationalStatus: 'operational' as const,
      connectionState: 'online' as const,
      Icon: DroneHiveIcon,
      batteryPct: 91,
    })),
    ...REGULUS_EFFECTORS.map((e) => ({
      id: e.id,
      name: e.name,
      type: 'ecm' as const,
      lat: e.lat,
      lon: e.lon,
      status: (e.status === 'active' ? 'active' : e.status === 'inactive' ? 'offline' : 'available') as Device['status'],
      operationalStatus: (DEVICE_HEALTH[e.id] ?? 'operational') as Device['operationalStatus'],
      connectionState: (DEVICE_CONNECTION[e.id] ?? 'online') as Device['connectionState'],
      coverageRadiusM: e.coverageRadiusM,
      Icon: SensorIcon,
    })),
    ...gotchaEffectors.map((g) => ({
      id: g.id,
      name: g.name,
      type: 'gotcha' as const,
      lat: g.lat,
      lon: g.lon,
      status: (g.status === 'active' ? 'active' : g.status === 'inactive' ? 'offline' : 'available') as Device['status'],
      operationalStatus: 'operational' as const,
      connectionState: 'online' as const,
      coverageRadiusM: g.coverageRadiusM,
      Icon: GotchaIcon,
    })),
    ...LAUNCHER_ASSETS.map((l) => ({
      id: l.id,
      name: launcherDeviceName,
      type: 'launcher' as const,
      lat: l.latitude,
      lon: l.longitude,
      status: 'available' as const,
      operationalStatus: 'operational' as const,
      connectionState: 'online' as const,
      Icon: LauncherIcon,
    })),
    ...LIDAR_ASSETS.map((a) => ({
      id: a.id,
      name: a.typeLabel,
      type: 'lidar' as const,
      lat: a.latitude,
      lon: a.longitude,
      status: 'available' as const,
      operationalStatus: (DEVICE_HEALTH[a.id] ?? 'operational') as Device['operationalStatus'],
      connectionState: (DEVICE_CONNECTION[a.id] ?? 'online') as Device['connectionState'],
      fovDeg: a.fovDeg,
      bearingDeg: a.bearingDeg,
      Icon: LidarIcon,
    })),
    ...WEAPON_SYSTEM_ASSETS.map((a) => ({
      id: a.id,
      name: a.typeLabel,
      type: 'weapon_system' as const,
      lat: a.latitude,
      lon: a.longitude,
      status: 'available' as const,
      operationalStatus: 'operational' as const,
      connectionState: 'online' as const,
      Icon: LauncherIcon,
    })),
    ...FLOODLIGHT_ASSETS.map((a) => ({
      id: a.id,
      name: a.typeLabel,
      type: 'floodlight' as const,
      lat: a.latitude,
      lon: a.longitude,
      status: 'available' as const,
      operationalStatus: (DEVICE_HEALTH[a.id] ?? 'operational') as Device['operationalStatus'],
      connectionState: (DEVICE_CONNECTION[a.id] ?? 'online') as Device['connectionState'],
      bearingDeg: a.bearingDeg,
      fovDeg: a.fovDeg,
      Icon: FloodlightIcon,
    })),
    ...SPEAKER_ASSETS.map((a) => ({
      id: a.id,
      name: a.typeLabel,
      type: 'speaker' as const,
      lat: a.latitude,
      lon: a.longitude,
      status: 'available' as const,
      operationalStatus: (DEVICE_HEALTH[a.id] ?? 'operational') as Device['operationalStatus'],
      connectionState: (DEVICE_CONNECTION[a.id] ?? 'online') as Device['connectionState'],
      coverageRadiusM: a.coverageRadiusM,
      Icon: SpeakerIcon,
    })),
    ...friendlyDrones.map((d) => {
      const connection = (DEVICE_CONNECTION[d.id] ?? 'online') as Device['connectionState'];
      return {
        id: d.id,
        name: d.name,
        type: 'drone' as const,
        lat: d.lat,
        lon: d.lon,
        status: 'active' as const,
        operationalStatus:
          connection === 'offline' ? ('malfunctioning' as const) : ('operational' as const),
        connectionState: connection,
        altitude: d.altitude,
        Icon: DroneDeviceIcon,
      };
    }),
  ], [launcherDeviceName, friendlyDrones, gotchaEffectors]);
}
