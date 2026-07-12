/**
 * Visual catalog for onboarding asset kinds — the icon + colours used by the
 * tray chips and the map markers/coverage. Numeric capabilities live in
 * `coverageModel.ts`; human labels live in the `onboarding.assetKinds` strings.
 */

import type { ElementType } from 'react';
import { Camera, Crosshair, Radar, Radio, SunFilled, Target } from '@/lib/icons/central';
import { ASSET_KIND_ICON } from '../assetKindIcons';
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

// `mapIcon` routes through the canonical registry (`regulus` is the
// registry's `sensor` / ECM kind) so onboarding markers match production.
export const ASSET_VISUAL: Record<AssetKind, AssetVisual> = {
  camera: { icon: Camera, mapIcon: ASSET_KIND_ICON.camera, hex: '#22d3ee', textClass: 'text-cyan-300', shape: 'cone' },
  radar: { icon: Radar, mapIcon: ASSET_KIND_ICON.radar, hex: '#38bdf8', textClass: 'text-sky-300', shape: 'cone' },
  lidar: { icon: Radar, mapIcon: ASSET_KIND_ICON.lidar, hex: '#2dd4bf', textClass: 'text-teal-300', shape: 'ring' },
  gotcha: { icon: Crosshair, mapIcon: ASSET_KIND_ICON.gotcha, hex: '#a78bfa', textClass: 'text-violet-300', shape: 'ring' },
  regulus: { icon: Radio, mapIcon: ASSET_KIND_ICON.sensor, hex: '#34d399', textClass: 'text-emerald-300', shape: 'ring' },
  launcher: { icon: Target, mapIcon: ASSET_KIND_ICON.launcher, hex: '#fb923c', textClass: 'text-orange-300', shape: 'ring' },
  floodlight: { icon: SunFilled, mapIcon: ASSET_KIND_ICON.floodlight, hex: '#fde68a', textClass: 'text-amber-200', shape: 'none' },
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
