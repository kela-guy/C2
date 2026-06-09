/**
 * Visual catalog for onboarding asset kinds — the icon + colours used by the
 * tray chips and the map markers/coverage. Numeric capabilities live in
 * `coverageModel.ts`; human labels live in the `onboarding.assetKinds` strings.
 */

import type { ElementType } from 'react';
import { Camera, Crosshair, Radar, Radio, SunFilled, Target } from '@/lib/icons/central';
import {
  CameraIcon,
  FloodlightIcon,
  GotchaIcon,
  LauncherIcon,
  LidarIcon,
  RadarIcon,
  SensorIcon,
} from '../tacticalIcons';
import type { AssetKind } from './coverageModel';

export interface AssetVisual {
  /** Sidebar (tray + explainer) glyph — a clean Central line icon. */
  icon: ElementType;
  /** On-map glyph — the production tactical icon used inside MapMarker. */
  mapIcon: ElementType;
  /** Map coverage / FOV colour (CSS hex). */
  hex: string;
  /** Tailwind text colour for tray chips + marker glyphs. */
  textClass: string;
  /** Whether this asset's coverage on the map is a detection cone or a ring. */
  shape: 'cone' | 'ring' | 'none';
}

export const ASSET_VISUAL: Record<AssetKind, AssetVisual> = {
  camera: { icon: Camera, mapIcon: CameraIcon, hex: '#22d3ee', textClass: 'text-cyan-300', shape: 'cone' },
  radar: { icon: Radar, mapIcon: RadarIcon, hex: '#38bdf8', textClass: 'text-sky-300', shape: 'cone' },
  lidar: { icon: Radar, mapIcon: LidarIcon, hex: '#2dd4bf', textClass: 'text-teal-300', shape: 'ring' },
  gotcha: { icon: Crosshair, mapIcon: GotchaIcon, hex: '#a78bfa', textClass: 'text-violet-300', shape: 'ring' },
  regulus: { icon: Radio, mapIcon: SensorIcon, hex: '#34d399', textClass: 'text-emerald-300', shape: 'ring' },
  launcher: { icon: Target, mapIcon: LauncherIcon, hex: '#fb923c', textClass: 'text-orange-300', shape: 'ring' },
  floodlight: { icon: SunFilled, mapIcon: FloodlightIcon, hex: '#fde68a', textClass: 'text-amber-200', shape: 'none' },
};

export const ASSET_ORDER: AssetKind[] = [
  'radar',
  'camera',
  'lidar',
  'regulus',
  'gotcha',
  'launcher',
  'floodlight',
];
