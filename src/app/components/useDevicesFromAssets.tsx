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
} from './tacticalIcons';
import { useStrings } from '@/lib/intl';
import type { Device } from './DevicesPanel';

const DEVICE_HEALTH: Record<string, 'operational' | 'malfunctioning'> = {
  'SENS-NVT-MAGOS-S': 'malfunctioning',
  'REG-NVT-SOUTH': 'malfunctioning',
};

const DEVICE_CONNECTION: Record<string, 'online' | 'offline' | 'error' | 'warning'> = {
  'SENS-NVT-MAGOS-S': 'warning',
  'REG-NVT-SOUTH': 'error',
  'FRIENDLY-02': 'offline',
  'LIDAR-NVT-01': 'warning',
};

/** Open error counts — light the red Logs channel + tile count badge. */
const DEVICE_ERRORS: Record<string, number> = {
  'CAM-NVT-PTZ-N': 2,
  'REG-NVT-SOUTH': 3,
  'SENS-NVT-MAGOS-S': 1,
  'LIDAR-NVT-01': 1,
};

const CAMERA_CAPS: Record<string, ('video' | 'photo')[]> = {
  'CAM-NVT-PTZ-N': ['video', 'photo'],
  'CAM-NVT-PIXELSIGHT': ['video'],
};

const DroneDeviceIcon = ({ size = 28, fill = 'white' }: { size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M23.334 15.7502L9.33696 0.583495L5.86139 4.0835L10.5007 11.0835L9.32456 15.7502L10.5007 20.4168L5.86139 27.4168L9.32456 30.6801L23.334 15.7502Z"
      fill={fill}
      stroke="#0a0a0a"
      strokeWidth="1"
    />
  </svg>
);

/** Memoized hook returning the full `Device[]` for this app. */
export function useDevicesFromAssets(): Device[] {
  const t = useStrings();
  const launcherDeviceName = t.simulation.deviceNames.missileLauncher;
  const friendly = t.simulation.friendlyDrones;
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
      errorCount: DEVICE_ERRORS[a.id],
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
      errorCount: DEVICE_ERRORS[a.id],
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
      errorCount: DEVICE_ERRORS[e.id],
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
      errorCount: DEVICE_ERRORS[a.id],
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
      Icon: SpeakerIcon,
    })),
    {
      id: 'FRIENDLY-01',
      name: friendly.patrol3.name,
      type: 'drone' as const,
      lat: 32.470,
      lon: 35.005,
      status: 'active' as const,
      operationalStatus: 'operational' as const,
      connectionState: 'online' as const,
      altitude: friendly.patrol3.altitude,
      Icon: DroneDeviceIcon,
    },
    {
      id: 'FRIENDLY-02',
      name: friendly.observation7.name,
      type: 'drone' as const,
      lat: 32.463,
      lon: 34.998,
      status: 'active' as const,
      operationalStatus: (DEVICE_CONNECTION['FRIENDLY-02'] ?? 'online') as Device['operationalStatus'] === 'malfunctioning'
        ? 'malfunctioning'
        : 'operational',
      connectionState: (DEVICE_CONNECTION['FRIENDLY-02'] ?? 'online') as Device['connectionState'],
      altitude: friendly.observation7.altitude,
      Icon: DroneDeviceIcon,
    },
  ], [launcherDeviceName, friendly]);
}
