/**
 * Seed "Kela suggestion" for the onboarding lab: the owned assets placed as a
 * starting layout, plus the tray palette (with recommended gap-fillers
 * highlighted). Coordinates mirror the Wizard-of-Oz kit
 * (`docs/discovery/04-woz-prototype-test-kit.md`) so the planted weak west
 * ground axis shows up and can be fixed by dragging.
 */

import {
  SITE,
  fromLocalMeters,
  toLocalMeters,
  type AssetKind,
  type Placement,
} from './coverageModel';

let seq = 0;
export function nextPlacementId(kind: AssetKind): string {
  seq += 1;
  return `place-${kind}-${seq}`;
}

/**
 * Centre the seed layout below was authored around (the legacy Jezreel-valley
 * `SITE_CENTER`). The seeds are re-projected relative to the current `SITE` so
 * the whole layout follows the demo base wherever it's staged.
 */
const SEED_ORIGIN = { lat: 32.4666, lon: 35.0013 };

/** The owned assets Kela places as the initial suggested layout. */
export function getSuggestedPlacements(): Placement[] {
  const seeds: Array<Omit<Placement, 'id' | 'source'>> = [
    { kind: 'radar', lat: 32.4686, lon: 34.9863, bearingDeg: 0, reasonKey: 'wideAirSearch' },
    { kind: 'radar', lat: 32.4596, lon: 35.0213, bearingDeg: 0, reasonKey: 'wideAirSearch' },
    { kind: 'radar', lat: 32.4761, lon: 34.9943, bearingDeg: 180, reasonKey: 'wideAirSearch' },
    { kind: 'regulus', lat: 32.4776, lon: 34.9913, reasonKey: 'airMitigation' },
    { kind: 'regulus', lat: 32.4646, lon: 35.0213, reasonKey: 'airMitigation' },
    { kind: 'regulus', lat: 32.4666, lon: 34.9763, reasonKey: 'airMitigation' },
    { kind: 'gotcha', lat: 32.469, lon: 35.005, reasonKey: 'counterDrone' },
    { kind: 'camera', lat: 32.4616, lon: 35.0063, bearingDeg: 330, reasonKey: 'perimeterCamera' },
    { kind: 'lidar', lat: 32.4706, lon: 35.0103, reasonKey: 'groundSensor' },
    { kind: 'launcher', lat: 32.4626, lon: 34.9963, reasonKey: 'groundIntercept' },
    { kind: 'launcher', lat: 32.4756, lon: 35.0113, reasonKey: 'groundIntercept' },
  ];
  return seeds.map((s) => {
    const { east, north } = toLocalMeters(s.lat, s.lon, SEED_ORIGIN);
    const { lat, lon } = fromLocalMeters(east, north, SITE);
    return { ...s, lat, lon, id: nextPlacementId(s.kind), source: 'suggested' as const };
  });
}

export interface TrayItem {
  id: string;
  kind: AssetKind;
  /** Highlighted as a recommended gap-filler. */
  recommended: boolean;
}

/** Palette the operator drags from. Recommended items fix the seed's gaps. */
export const TRAY_ITEMS: TrayItem[] = [
  { id: 'tray-radar', kind: 'radar', recommended: true },
  { id: 'tray-launcher', kind: 'launcher', recommended: true },
  { id: 'tray-camera', kind: 'camera', recommended: false },
  { id: 'tray-regulus', kind: 'regulus', recommended: false },
  { id: 'tray-gotcha', kind: 'gotcha', recommended: false },
  { id: 'tray-lidar', kind: 'lidar', recommended: false },
  { id: 'tray-floodlight', kind: 'floodlight', recommended: false },
];
