/**
 * Coverage model for the onboarding auto-coverage lab.
 *
 * Pure, map-free domain logic: asset capabilities, the area-of-interest /
 * grid config, threat axes, and the scoring types. The actual sampling lives
 * in `useCoverageScore.ts`. Numbers are grounded in the real registries
 * (`tacticalAssets.ts`, `gotchaAssets.ts`) and the agreed definitions in
 * `docs/discovery/03-coverage-definition.md`.
 *
 * IMPORTANT: this is a flat estimate (no terrain line-of-sight). It finds
 * coverage gaps, not true terrain dead zones — the viewshed engine is
 * deferred. The UI labels the score as an estimate accordingly.
 */

export const EARTH_RADIUS_M = 6_371_000;

/** Threat domains a sensor/effector can act against. */
export type Domain = 'air' | 'ground';

/** The placeable asset families in the onboarding lab. */
export type AssetKind =
  | 'camera'
  | 'radar'
  | 'lidar'
  | 'gotcha'
  | 'regulus'
  | 'launcher'
  | 'floodlight';

/** How an asset detects (awareness) — a directional or omni FOV cone. */
export interface DetectSpec {
  rangeM: number;
  /** Full cone width in degrees; >= 360 = omnidirectional. */
  fovDeg: number;
  domains: Domain[];
}

/** How an asset mitigates (reach) — an omni engagement ring. */
export interface MitigateSpec {
  rangeM: number;
  domains: Domain[];
}

export interface AssetCapability {
  detect?: DetectSpec;
  mitigate?: MitigateSpec;
  /** Support assets (floodlight) aid response but earn no protection credit. */
  support?: boolean;
}

/**
 * Effective ground engagement range for kinetic launchers. KNOWN DATA GAP:
 * the registry has no launcher range; this placeholder is flagged in
 * `docs/discovery/03-coverage-definition.md` section 8, pending product input.
 */
export const LAUNCHER_RANGE_M = 3000;

export const CAPABILITIES: Record<AssetKind, AssetCapability> = {
  camera: { detect: { rangeM: 1200, fovDeg: 90, domains: ['air', 'ground'] } },
  radar: { detect: { rangeM: 1200, fovDeg: 360, domains: ['air', 'ground'] } },
  lidar: { detect: { rangeM: 1000, fovDeg: 360, domains: ['ground'] } },
  gotcha: {
    detect: { rangeM: 500, fovDeg: 360, domains: ['air'] },
    mitigate: { rangeM: 500, domains: ['air'] },
  },
  regulus: { mitigate: { rangeM: 2500, domains: ['air'] } },
  launcher: { mitigate: { rangeM: LAUNCHER_RANGE_M, domains: ['ground'] } },
  floodlight: { support: true },
};

/** A placed (or draft) asset on the map. */
export interface Placement {
  id: string;
  kind: AssetKind;
  lat: number;
  lon: number;
  /** Centre bearing for directional detectors (0=N, 90=E). */
  bearingDeg?: number;
  /** Where it came from — drives the "why placed" explainer + styling. */
  source: 'suggested' | 'user';
  /** Optional reason key shown in the explainer (suggested placements). */
  reasonKey?: string;
}

export interface ThreatAxis {
  id: string;
  /** Approach bearing toward the protected centre (0=N, 90=E). */
  bearingDeg: number;
  /** Relative exposure weight (primary corridors weigh more). */
  weight: number;
}

/**
 * Default approach corridors toward `SITE`. West is the primary (wadi) axis,
 * matching the Wizard-of-Oz kit's planted weak ground axis.
 */
export const THREAT_AXES: ThreatAxis[] = [
  { id: 'north', bearingDeg: 0, weight: 1.0 },
  { id: 'east', bearingDeg: 90, weight: 1.0 },
  { id: 'south', bearingDeg: 180, weight: 1.0 },
  { id: 'west', bearingDeg: 270, weight: 1.6 },
];

/** Air vs ground blend for the combined headline (air-heavy demo site). */
export const ALPHA = 0.6;

/**
 * Demo base location for the onboarding lab. Decoupled from the live tactical
 * map's `SITE_CENTER` so the demo can be staged anywhere with one edit — all
 * onboarding geometry (threat axes, risk zones, suggested layout, camera) is
 * derived relative to this point.
 *
 * Currently set to the Mitzpe Ramon crater rim — the ~300 m cliffs of Makhtesh
 * Ramon drop away to the south, giving a spectacular canyon vista at the
 * near-ground camera that sells the "standing on the field" feel.
 *
 * Alternatives worth recording at:
 *   - Golan / Mount Hermon foothills: { lat: 33.2540, lon: 35.7130 }, heading 0
 *   - Golan / Mount Bental lookout:   { lat: 33.1080, lon: 35.7820 }, heading 0
 *   - Original Jezreel valley site:   { lat: 32.4666, lon: 35.0013 }, heading 0
 */
export const ONBOARDING_SITE = { lat: 30.6088, lon: 34.8015 } as const;

export const SITE = ONBOARDING_SITE;

/**
 * Heading (deg, 0=N) the cinematic hero camera faces. Tuned per site so the
 * opening frame looks toward the most dramatic terrain. At Mitzpe Ramon the
 * crater is to the south, so we face 180° to look out over the canyon.
 */
export const SITE_HERO_HEADING_DEG = 180;

export const AOI_RADIUS_M = 3000;
export const GRID_CELL_M = 100;
export const AXIS_SIGMA_DEG = 35;
export const OPEN_AXIS_THRESHOLD = 0.3;
/** Cells weighted above this that are unprotected become gap callouts. */
export const GAP_WEIGHT_THRESHOLD = 0.45;
export const MAX_GAPS = 14;

export interface AxisScore extends ThreatAxis {
  /** Protected fraction along this corridor, 0..1. */
  score: number;
  open: boolean;
}

export interface CoverageGap {
  id: string;
  lat: number;
  lon: number;
  /** `blind` = no detection at all; `unengaged` = seen but cannot engage. */
  kind: 'blind' | 'unengaged';
}

export interface CoverageResult {
  /** Protected (detect AND mitigate) fractions, 0..1. */
  airScore: number;
  groundScore: number;
  combined: number;
  /** Awareness-only (detection) fractions, 0..1. */
  awarenessAir: number;
  awarenessGround: number;
  axes: AxisScore[];
  openAxes: AxisScore[];
  gaps: CoverageGap[];
  placementsCount: number;
}

/** Convert a lat/lon to local east/north metres relative to a centre. */
export function toLocalMeters(
  lat: number,
  lon: number,
  center: { lat: number; lon: number },
): { east: number; north: number } {
  const north = ((lat - center.lat) * Math.PI) / 180 * EARTH_RADIUS_M;
  const east =
    ((lon - center.lon) * Math.PI) / 180 *
    EARTH_RADIUS_M *
    Math.cos((center.lat * Math.PI) / 180);
  return { east, north };
}

/** Convert local east/north metres back to lat/lon relative to a centre. */
export function fromLocalMeters(
  east: number,
  north: number,
  center: { lat: number; lon: number },
): { lat: number; lon: number } {
  const lat = center.lat + (north / EARTH_RADIUS_M) * (180 / Math.PI);
  const lon =
    center.lon +
    (east / (EARTH_RADIUS_M * Math.cos((center.lat * Math.PI) / 180))) *
      (180 / Math.PI);
  return { lat, lon };
}

/** Smallest absolute angular difference between two bearings, in degrees. */
export function angularDiffDeg(a: number, b: number): number {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return d;
}

/** Steps of the onboarding flow, in order. */
export type OnboardingStep =
  | 'welcome'
  | 'scanning'
  | 'threats'
  | 'review'
  | 'refine'
  | 'summary';
export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'scanning',
  'threats',
  'review',
  'refine',
  'summary',
];

/**
 * Steps that earn a progress dot. `scanning` is a transient auto-advancing
 * moment, so it never appears as a dot — the rail would flicker otherwise.
 */
export const VISIBLE_STEPS: OnboardingStep[] = [
  'welcome',
  'threats',
  'review',
  'refine',
  'summary',
];

/**
 * A problematic area surfaced BEFORE any assets exist — the "why" behind the
 * suggested layout. Derived from the threat axes (placement-independent), so
 * it can be shown in the `threats` step to justify Kela's recommendation.
 */
export interface ThreatZone {
  id: string;
  lat: number;
  lon: number;
  /** Approach bearing toward the protected centre (0=N, 90=E). */
  bearingDeg: number;
  severity: 'high' | 'medium';
}

/**
 * Representative risk markers, one per approach corridor, placed partway out
 * along each axis from the protected centre. Primary corridors (weight >= 1.6)
 * read as `high`. Kept deliberately sparse (one per axis) so the map shows a
 * clear threat picture, not a field of red dots.
 */
export function getThreatZones(): ThreatZone[] {
  const distM = AOI_RADIUS_M * 0.6;
  return THREAT_AXES.map((axis) => {
    const rad = (axis.bearingDeg * Math.PI) / 180;
    const east = Math.sin(rad) * distM;
    const north = Math.cos(rad) * distM;
    const { lat, lon } = fromLocalMeters(east, north, SITE);
    return {
      id: `zone-${axis.id}`,
      lat,
      lon,
      bearingDeg: axis.bearingDeg,
      severity: axis.weight >= 1.6 ? ('high' as const) : ('medium' as const),
    };
  });
}
