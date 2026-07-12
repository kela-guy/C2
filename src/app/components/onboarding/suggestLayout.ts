/**
 * Asset dock palette for the onboarding concept-video scene, plus the
 * placement id generator. The scene starts EMPTY — the operator drags every
 * asset onto the map themselves (that is the demo's arc), so there is no
 * seeded "suggested layout" anymore.
 */

import type { AssetKind } from './coverageModel';

let seq = 0;
export function nextPlacementId(kind: AssetKind): string {
  seq += 1;
  return `place-${kind}-${seq}`;
}

export interface TrayItem {
  id: string;
  kind: AssetKind;
  /** Highlighted as a recommended starting pick. */
  recommended: boolean;
}

/** Palette the operator drags from, in dock order. */
export const TRAY_ITEMS: TrayItem[] = [
  { id: 'tray-radar', kind: 'radar', recommended: true },
  { id: 'tray-regulus', kind: 'regulus', recommended: true },
  { id: 'tray-camera', kind: 'camera', recommended: false },
  { id: 'tray-launcher', kind: 'launcher', recommended: false },
  { id: 'tray-gotcha', kind: 'gotcha', recommended: false },
  { id: 'tray-lidar', kind: 'lidar', recommended: false },
  { id: 'tray-floodlight', kind: 'floodlight', recommended: false },
];
