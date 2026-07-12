/**
 * Canonical friendly-asset kind → glyph registry. The ONE mapping table —
 * map marker slices, device-panel tiles, onboarding catalog, and sandboxes
 * all resolve their icon through here instead of re-declaring their own
 * kind→icon record. Domain aliases map onto these canonical kinds at the
 * call site (`jammer` / `regulus` → `sensor`, `weapon` → `launcher`).
 *
 * Lives in its own module (not `tacticalIcons.tsx`) so the icon file keeps
 * exporting only components and stays fast-refresh friendly.
 */

import type { ReactNode } from 'react';
import {
  CameraIcon,
  RadarIcon,
  LidarIcon,
  SensorIcon,
  DroneHiveIcon,
  LauncherIcon,
  FloodlightIcon,
  SpeakerIcon,
  GotchaIcon,
  type AssetGlyphProps,
} from './tacticalIcons';

export const ASSET_KIND_ICON = {
  camera: CameraIcon,
  radar: RadarIcon,
  lidar: LidarIcon,
  /** ECM / jammer / Regulus effector. */
  sensor: SensorIcon,
  droneHive: DroneHiveIcon,
  launcher: LauncherIcon,
  floodlight: FloodlightIcon,
  speaker: SpeakerIcon,
  gotcha: GotchaIcon,
} as const satisfies Record<string, (props: AssetGlyphProps) => ReactNode>;

export type AssetIconKind = keyof typeof ASSET_KIND_ICON;
