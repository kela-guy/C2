/**
 * Sandbox-only device fixtures for `/devices-lab`.
 *
 * Covers every `DeviceType` plus the interesting state permutations
 * (offline / error / warning, malfunction, low + empty battery,
 * active jam) so the registry-driven row can be eyeballed in one
 * scroll. Production data still comes from `useDevicesFromAssets`.
 */

import type { Device } from '../devices-panel/types';
import {
  SensorIcon,
  CameraIcon,
  RadarIcon,
  DroneHiveIcon,
  LauncherIcon,
  LidarIcon,
  FloodlightIcon,
  SpeakerIcon,
} from '../tacticalIcons';
import { DroneDeviceIcon } from '@/primitives/ProductIcons';

export const MOCK_DEVICES: Device[] = [
  // Cameras — pinnable + draggable + preview
  {
    id: 'CAM-01', name: 'PTZ North', type: 'camera', lat: 32.811, lon: 35.021,
    status: 'available', operationalStatus: 'operational', connectionState: 'online',
    fovDeg: 62, bearingDeg: 145, batteryPct: 82, capabilities: ['video', 'photo'], Icon: CameraIcon,
  },
  {
    id: 'CAM-02', name: 'PixelSight West', type: 'camera', lat: 32.793, lon: 34.984,
    status: 'available', operationalStatus: 'operational', connectionState: 'warning',
    fovDeg: 40, bearingDeg: 270, batteryPct: 16, capabilities: ['video'], Icon: CameraIcon,
  },
  {
    id: 'CAM-03', name: 'Gate Cam', type: 'camera', lat: 32.802, lon: 35.052,
    status: 'offline', operationalStatus: 'operational', connectionState: 'offline',
    fovDeg: 55, bearingDeg: 90, Icon: CameraIcon,
  },
  // Radar — malfunction + error
  {
    id: 'RAD-01', name: 'Magos S', type: 'radar', lat: 32.822, lon: 35.013,
    status: 'available', operationalStatus: 'malfunctioning', connectionState: 'error',
    fovDeg: 120, bearingDeg: 30, Icon: RadarIcon,
  },
  // Dock
  {
    id: 'DOCK-01', name: 'Drone Hive', type: 'dock', lat: 32.781, lon: 35.004,
    status: 'available', operationalStatus: 'operational', connectionState: 'online',
    batteryPct: 91, Icon: DroneHiveIcon,
  },
  // Drones — pinnable, wipers + calibrate, low battery / offline
  {
    id: 'DRN-01', name: 'Patrol-3', type: 'drone', lat: 32.774, lon: 35.033,
    status: 'active', operationalStatus: 'operational', connectionState: 'online',
    altitude: '120 m', batteryPct: 64, Icon: DroneDeviceIcon,
  },
  {
    id: 'DRN-02', name: 'Observer-7', type: 'drone', lat: 32.766, lon: 34.971,
    status: 'active', operationalStatus: 'operational', connectionState: 'offline',
    altitude: '90 m', batteryPct: 8, Icon: DroneDeviceIcon,
  },
  // ECM — jam (idle) + jam (active)
  {
    id: 'ECM-01', name: 'Regulus North', type: 'ecm', lat: 32.833, lon: 35.041,
    status: 'available', operationalStatus: 'operational', connectionState: 'online',
    coverageRadiusM: 2500, Icon: SensorIcon,
  },
  {
    id: 'ECM-02', name: 'Regulus South', type: 'ecm', lat: 32.741, lon: 35.062,
    status: 'active', operationalStatus: 'operational', connectionState: 'online',
    coverageRadiusM: 1800, Icon: SensorIcon,
  },
  // Launcher
  {
    id: 'LCH-01', name: 'Missile Launcher', type: 'launcher', lat: 32.844, lon: 35.005,
    status: 'available', operationalStatus: 'operational', connectionState: 'online', Icon: LauncherIcon,
  },
  // LIDAR
  {
    id: 'LID-01', name: 'LIDAR East', type: 'lidar', lat: 32.815, lon: 35.071,
    status: 'available', operationalStatus: 'operational', connectionState: 'warning',
    fovDeg: 360, bearingDeg: 0, Icon: LidarIcon,
  },
  // Weapon system
  {
    id: 'WPN-01', name: 'C-RAM Battery', type: 'weapon_system', lat: 32.851, lon: 35.022,
    status: 'available', operationalStatus: 'operational', connectionState: 'online', Icon: LauncherIcon,
  },
  // Floodlights — toggle on/off + offline
  {
    id: 'FLD-01', name: 'Perimeter Floodlight', type: 'floodlight', lat: 32.792, lon: 35.083,
    status: 'available', operationalStatus: 'operational', connectionState: 'online', Icon: FloodlightIcon,
  },
  {
    id: 'FLD-02', name: 'Gate Floodlight', type: 'floodlight', lat: 32.803, lon: 35.094,
    status: 'offline', operationalStatus: 'operational', connectionState: 'offline', Icon: FloodlightIcon,
  },
  // Speakers — play/stop + track select, one malfunction
  {
    id: 'SPK-01', name: 'LRAD North', type: 'speaker', lat: 32.825, lon: 35.055,
    status: 'available', operationalStatus: 'operational', connectionState: 'online', Icon: SpeakerIcon,
  },
  {
    id: 'SPK-02', name: 'LRAD South', type: 'speaker', lat: 32.755, lon: 35.046,
    status: 'available', operationalStatus: 'malfunctioning', connectionState: 'online', Icon: SpeakerIcon,
  },
];
