/**
 * Demo asset-count configuration model.
 *
 * The dashboard's presented entities come from static seed registries
 * (`tacticalAssets.ts`, `gotcha/gotchaAssets.ts`) plus the friendly patrol
 * routes owned by `Dashboard.tsx`. This module gives demos a cap-only knob
 * per entity kind: each count slices its registry to the first N entries
 * (seed order), and `buildVisibleAssetIds` unions the surviving ids so both
 * the Cesium map and the devices panel can filter by id without either one
 * refactoring its registry imports. Map-free.
 */

import {
  CAMERA_ASSETS,
  RADAR_ASSETS,
  LIDAR_ASSETS,
  DRONE_HIVE_ASSETS,
  WEAPON_SYSTEM_ASSETS,
  FLOODLIGHT_ASSETS,
  SPEAKER_ASSETS,
  LAUNCHER_ASSETS,
  REGULUS_EFFECTORS,
} from '../tacticalAssets';
import { GOTCHA_UNITS } from '../gotcha/gotchaAssets';

export type AssetKindKey =
  | 'camera'
  | 'radar'
  | 'lidar'
  | 'floodlight'
  | 'speaker'
  | 'launcher'
  | 'regulus'
  | 'gotcha'
  | 'droneHive'
  | 'weaponSystem'
  | 'friendlyDrone';

export type AssetCounts = Record<AssetKindKey, number>;

/**
 * Friendly patrol drones are seeded by `getFriendlyPatrolRoutes` in
 * `Dashboard.tsx` (FRIENDLY-01 … FRIENDLY-05). The ids are deterministic
 * geometry shared across locales, so the registry-of-ids can live here
 * without importing the i18n-dependent route builder.
 */
export const FRIENDLY_DRONE_IDS = [
  'FRIENDLY-01',
  'FRIENDLY-02',
  'FRIENDLY-03',
  'FRIENDLY-04',
  'FRIENDLY-05',
] as const;

interface AssetKindMeta {
  /** Panel row label. */
  label: string;
  /** Seed ids in registry order — `counts[kind]` keeps the first N. */
  ids: readonly string[];
}

/**
 * Per-kind metadata. `max` is derived from the registry lengths so adding a
 * seed asset automatically raises the slider ceiling.
 */
export const ASSET_KIND_META: Record<AssetKindKey, AssetKindMeta> = {
  camera: { label: 'Cameras', ids: CAMERA_ASSETS.map((a) => a.id) },
  radar: { label: 'Radars', ids: RADAR_ASSETS.map((a) => a.id) },
  lidar: { label: 'Lidars', ids: LIDAR_ASSETS.map((a) => a.id) },
  floodlight: { label: 'Floodlights', ids: FLOODLIGHT_ASSETS.map((a) => a.id) },
  speaker: { label: 'PA Speakers', ids: SPEAKER_ASSETS.map((a) => a.id) },
  launcher: { label: 'Launchers', ids: LAUNCHER_ASSETS.map((a) => a.id) },
  regulus: { label: 'Regulus ECM', ids: REGULUS_EFFECTORS.map((a) => a.id) },
  gotcha: { label: 'Gotcha Units', ids: GOTCHA_UNITS.map((u) => u.id) },
  droneHive: { label: 'Drone Hives', ids: DRONE_HIVE_ASSETS.map((a) => a.id) },
  weaponSystem: { label: 'Weapon Systems', ids: WEAPON_SYSTEM_ASSETS.map((a) => a.id) },
  friendlyDrone: { label: 'Friendly Drones', ids: FRIENDLY_DRONE_IDS },
};

/** Stable row order for the panel. */
export const ASSET_KIND_ORDER: AssetKindKey[] = [
  'camera',
  'radar',
  'lidar',
  'floodlight',
  'speaker',
  'launcher',
  'regulus',
  'gotcha',
  'droneHive',
  'weaponSystem',
  'friendlyDrone',
];

export function assetKindMax(kind: AssetKindKey): number {
  return ASSET_KIND_META[kind].ids.length;
}

/** Everything on — the seed registries as shipped. */
export const DEFAULT_ASSET_COUNTS: AssetCounts = Object.fromEntries(
  ASSET_KIND_ORDER.map((kind) => [kind, assetKindMax(kind)]),
) as AssetCounts;

/**
 * The union of asset ids that survive the per-kind caps. Consumers treat
 * membership as "present": markers, device rows, and flow assets whose id
 * is missing from the set are dropped for this session.
 */
export function buildVisibleAssetIds(counts: AssetCounts): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const kind of ASSET_KIND_ORDER) {
    const meta = ASSET_KIND_META[kind];
    const n = Math.max(0, Math.min(counts[kind] ?? meta.ids.length, meta.ids.length));
    for (let i = 0; i < n; i++) ids.add(meta.ids[i]);
  }
  return ids;
}

// ── Persistence ─────────────────────────────────────────────────────────────
// Follows the codebase's `c2hub.*` localStorage convention (see
// `lib/flowBuilder/storage.ts`): single namespaced key, versioned JSON
// envelope, try/catch on every read/write so private mode or quota
// exceptions degrade gracefully — the panel still works, counts just
// don't persist.

const ASSET_COUNTS_STORAGE_KEY = 'c2hub.assetConfig.counts';

interface AssetCountsBundle {
  version: 1;
  counts: Partial<Record<AssetKindKey, number>>;
}

function isBundle(value: unknown): value is AssetCountsBundle {
  if (!value || typeof value !== 'object') return false;
  const b = value as Partial<AssetCountsBundle>;
  return b.version === 1 && !!b.counts && typeof b.counts === 'object';
}

/**
 * Read the persisted caps. Unknown kinds are dropped, missing kinds fall
 * back to their default (max), and each value is clamped to [0, max] —
 * so seed-registry changes between sessions can't produce out-of-range
 * sliders. Any failure returns the defaults.
 */
export function readStoredAssetCounts(): AssetCounts {
  if (typeof window === 'undefined') return { ...DEFAULT_ASSET_COUNTS };
  try {
    const raw = window.localStorage.getItem(ASSET_COUNTS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ASSET_COUNTS };
    const parsed: unknown = JSON.parse(raw);
    if (!isBundle(parsed)) return { ...DEFAULT_ASSET_COUNTS };
    const next = { ...DEFAULT_ASSET_COUNTS };
    for (const kind of ASSET_KIND_ORDER) {
      const stored = parsed.counts[kind];
      if (typeof stored === 'number' && Number.isFinite(stored)) {
        next[kind] = Math.max(0, Math.min(Math.round(stored), assetKindMax(kind)));
      }
    }
    return next;
  } catch {
    return { ...DEFAULT_ASSET_COUNTS };
  }
}

/** Persist the caps. Failures are swallowed (see module note above). */
export function writeStoredAssetCounts(counts: AssetCounts): void {
  if (typeof window === 'undefined') return;
  const bundle: AssetCountsBundle = { version: 1, counts };
  try {
    window.localStorage.setItem(ASSET_COUNTS_STORAGE_KEY, JSON.stringify(bundle));
  } catch {
    /* private mode, quota, etc. — non-fatal. */
  }
}
