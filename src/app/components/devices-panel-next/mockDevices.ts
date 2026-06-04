/**
 * Sandbox-only device fixtures for `/devices-lab`.
 *
 * Covers every `DeviceType`, but the severity is deliberately balanced so
 * the docked panel reads like a real fleet: exactly ONE `critical` tile
 * (the only one that pulses — needs attention now), with every other row
 * spread across the calmer scenarios we settled on in the lab — errored
 * asset (red Logs channel, no pulse), connection warning, low battery,
 * offline, and plain healthy. Production data still comes from
 * `useDevicesFromAssets`.
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
  // ok — healthy baseline (online, operational, good battery)
  {
    id: 'CAM-01', name: 'PTZ North', type: 'camera', lat: 32.811, lon: 35.021,
    status: 'available', operationalStatus: 'operational', connectionState: 'online',
    fovDeg: 62, bearingDeg: 145, batteryPct: 82, capabilities: ['video', 'photo'], Icon: CameraIcon,
  },
  // errored asset — warning tile + red Logs channel (open errors), not critical (no pulse)
  {
    id: 'CAM-02', name: 'PixelSight West', type: 'camera', lat: 32.793, lon: 34.984,
    status: 'available', operationalStatus: 'operational', connectionState: 'warning',
    fovDeg: 40, bearingDeg: 270, batteryPct: 35, capabilities: ['video'],
    errors: [
      { severity: 'error', message: 'Lens heater fault — defrost unavailable' },
      { severity: 'warning', message: 'Stream bitrate degraded (link quality low)' },
    ],
    Icon: CameraIcon,
  },
  // offline — disconnected (faint tile, glyph desaturated)
  {
    id: 'CAM-03', name: 'Gate Cam', type: 'camera', lat: 32.802, lon: 35.052,
    status: 'offline', operationalStatus: 'operational', connectionState: 'offline',
    fovDeg: 55, bearingDeg: 90, Icon: CameraIcon,
  },
  // critical — the ONLY needs-attention-now tile (malfunction + connection error + open errors). Pulses.
  {
    id: 'RAD-01', name: 'Magos S', type: 'radar', lat: 32.822, lon: 35.013,
    status: 'available', operationalStatus: 'malfunctioning', connectionState: 'error',
    fovDeg: 120, bearingDeg: 30,
    errors: [
      { severity: 'error', message: 'Antenna motor stalled — no rotation' },
      { severity: 'error', message: 'Connection lost to processing unit' },
      { severity: 'warning', message: 'Internal temperature above nominal (78°C)' },
    ],
    Icon: RadarIcon,
  },
  // ok
  {
    id: 'DOCK-01', name: 'Drone Hive', type: 'dock', lat: 32.781, lon: 35.004,
    status: 'available', operationalStatus: 'operational', connectionState: 'online',
    batteryPct: 91, Icon: DroneHiveIcon,
  },
  // errored asset — online + open errors (red Logs channel only, neutral tile, no pulse)
  {
    id: 'DRN-01', name: 'Patrol-3', type: 'drone', lat: 32.774, lon: 35.033,
    status: 'active', operationalStatus: 'operational', connectionState: 'online',
    altitude: '120 m', batteryPct: 64,
    errors: [{ severity: 'warning', message: 'GPS accuracy reduced — 9 satellites' }],
    Icon: DroneDeviceIcon,
  },
  // warning — low battery (<= 40%), still online
  {
    id: 'DRN-02', name: 'Observer-7', type: 'drone', lat: 32.766, lon: 34.971,
    status: 'active', operationalStatus: 'operational', connectionState: 'online',
    altitude: '90 m', batteryPct: 34, Icon: DroneDeviceIcon,
  },
  // errored asset — a deliberately busy log (30 entries) to exercise the
  // errors modal's inner scroll + severity filter badges.
  {
    id: 'ECM-01', name: 'Regulus North', type: 'ecm', lat: 32.833, lon: 35.041,
    status: 'available', operationalStatus: 'operational', connectionState: 'online',
    coverageRadiusM: 2500,
    errors: [
      { severity: 'error', message: 'Amplifier channel 2 offline' },
      { severity: 'error', message: 'Amplifier channel 5 offline' },
      { severity: 'error', message: 'VSWR fault on antenna B' },
      { severity: 'error', message: 'PLL lock lost on synthesizer A' },
      { severity: 'error', message: 'DAC overrange on transmit path' },
      { severity: 'error', message: 'Beamforming table checksum mismatch' },
      { severity: 'error', message: 'RF front-end overcurrent trip' },
      { severity: 'error', message: 'Antenna C feed disconnected' },
      { severity: 'error', message: 'FPGA bitstream load failed (slot 3)' },
      { severity: 'error', message: 'Timing reference drift exceeds limit' },
      { severity: 'error', message: 'Transmit gate stuck closed' },
      { severity: 'error', message: 'Memory ECC double-bit error' },
      { severity: 'warning', message: 'Cooling fan RPM below threshold' },
      { severity: 'warning', message: 'Calibration overdue (14 days)' },
      { severity: 'warning', message: 'Power supply ripple elevated' },
      { severity: 'warning', message: 'Internal temperature 71°C (high)' },
      { severity: 'warning', message: 'Reflected power above nominal' },
      { severity: 'warning', message: 'Clock jitter trending upward' },
      { severity: 'warning', message: 'Firmware update available (v4.2.1)' },
      { severity: 'warning', message: 'Spectrum mask margin narrowing' },
      { severity: 'warning', message: 'GPS disciplining holdover active' },
      { severity: 'warning', message: 'Battery backup at 62%' },
      { severity: 'warning', message: 'Log storage 84% full' },
      { severity: 'warning', message: 'Heartbeat latency 320 ms' },
      { severity: 'warning', message: 'Antenna A gain 0.6 dB below baseline' },
      { severity: 'warning', message: 'Fan 2 duty cycle saturated' },
      { severity: 'warning', message: 'Config drift from golden profile' },
      { severity: 'warning', message: 'NTP sync skew 1.4 s' },
      { severity: 'warning', message: 'Self-test deferred (busy)' },
      { severity: 'warning', message: 'Uplink retransmits elevated (3%)' },
    ],
    Icon: SensorIcon,
  },
  // ok (active jam)
  {
    id: 'ECM-02', name: 'Regulus South', type: 'ecm', lat: 32.741, lon: 35.062,
    status: 'active', operationalStatus: 'operational', connectionState: 'online',
    coverageRadiusM: 1800, Icon: SensorIcon,
  },
  // ok
  {
    id: 'LCH-01', name: 'Missile Launcher', type: 'launcher', lat: 32.844, lon: 35.005,
    status: 'available', operationalStatus: 'operational', connectionState: 'online', Icon: LauncherIcon,
  },
  // warning + errored asset — degraded connection with open errors (warning tile + red Logs + count badge)
  {
    id: 'LID-01', name: 'LIDAR East', type: 'lidar', lat: 32.815, lon: 35.071,
    status: 'available', operationalStatus: 'operational', connectionState: 'warning',
    fovDeg: 360, bearingDeg: 0,
    errors: [
      { severity: 'error', message: 'Point cloud dropout on sector 3' },
      { severity: 'warning', message: 'Window contamination detected' },
      { severity: 'warning', message: 'Spin rate jitter above tolerance' },
      { severity: 'warning', message: 'Returns below expected density' },
    ],
    Icon: LidarIcon,
  },
  // ok
  {
    id: 'WPN-01', name: 'C-RAM Battery', type: 'weapon_system', lat: 32.851, lon: 35.022,
    status: 'available', operationalStatus: 'operational', connectionState: 'online', Icon: LauncherIcon,
  },
  // ok
  {
    id: 'FLD-01', name: 'Perimeter Floodlight', type: 'floodlight', lat: 32.792, lon: 35.083,
    status: 'available', operationalStatus: 'operational', connectionState: 'online', Icon: FloodlightIcon,
  },
  // offline
  {
    id: 'FLD-02', name: 'Gate Floodlight', type: 'floodlight', lat: 32.803, lon: 35.094,
    status: 'offline', operationalStatus: 'operational', connectionState: 'offline', Icon: FloodlightIcon,
  },
  // ok
  {
    id: 'SPK-01', name: 'LRAD North', type: 'speaker', lat: 32.825, lon: 35.055,
    status: 'available', operationalStatus: 'operational', connectionState: 'online', Icon: SpeakerIcon,
  },
  // errored asset — online + open errors (red Logs channel only, neutral tile, no pulse)
  {
    id: 'SPK-02', name: 'LRAD South', type: 'speaker', lat: 32.755, lon: 35.046,
    status: 'available', operationalStatus: 'operational', connectionState: 'online',
    errors: [
      { severity: 'error', message: 'Driver array fault — reduced output' },
      { severity: 'error', message: 'Audio input clipping detected' },
      { severity: 'warning', message: 'Amplifier running hot' },
      { severity: 'warning', message: 'Track cache failed to preload' },
      { severity: 'warning', message: 'Firmware update pending' },
    ],
    Icon: SpeakerIcon,
  },
];
