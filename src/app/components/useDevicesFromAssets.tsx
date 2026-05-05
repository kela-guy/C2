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
  SensorIcon,
  CameraIcon,
  RadarIcon,
  DroneHiveIcon,
  LauncherIcon,
  LidarIcon,
} from './TacticalMap';
import type { Device } from './DevicesPanel';
import { DroneDeviceIcon } from '@/primitives/ProductIcons';

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

const CAMERA_CAPS: Record<string, ('video' | 'photo')[]> = {
  'CAM-NVT-PTZ-N': ['video', 'photo'],
  'CAM-NVT-PIXELSIGHT': ['video'],
};

/** Hebrew preset labels for cameras — kept here (app-side) since DevicesPanel is presentation-only. */
export const CAMERA_PRESETS: Record<string, string[]> = {
  'CAM-NVT-PTZ-N': ['זום', 'לילה', 'רגיל'],
  'CAM-NVT-PIXELSIGHT': ['רגיל', 'תרמי'],
};

/** Memoized hook returning the full `Device[]` for this app. */
export function useDevicesFromAssets(): Device[] {
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
    ...LAUNCHER_ASSETS.map((l) => ({
      id: l.id,
      name: 'משגר טילים',
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
    {
      id: 'FRIENDLY-01',
      name: 'סיור-3',
      type: 'drone' as const,
      lat: 32.470,
      lon: 35.005,
      status: 'active' as const,
      operationalStatus: 'operational' as const,
      connectionState: 'online' as const,
      altitude: '80 מ׳',
      Icon: DroneDeviceIcon,
    },
    {
      id: 'FRIENDLY-02',
      name: 'תצפית-7',
      type: 'drone' as const,
      lat: 32.463,
      lon: 34.998,
      status: 'active' as const,
      operationalStatus: (DEVICE_CONNECTION['FRIENDLY-02'] ?? 'online') as Device['operationalStatus'] === 'malfunctioning'
        ? 'malfunctioning'
        : 'operational',
      connectionState: (DEVICE_CONNECTION['FRIENDLY-02'] ?? 'online') as Device['connectionState'],
      altitude: '110 מ׳',
      Icon: DroneDeviceIcon,
    },
  ], []);
}
