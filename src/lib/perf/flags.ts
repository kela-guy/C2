/**
 * Perf instrumentation feature flags.
 *
 * The whole `src/lib/perf` tree is dev-only — `setupPerf()` (in
 * `bootstrap.ts`) is dynamically imported from `main.tsx` behind an
 * `import.meta.env.DEV` gate, so none of this ships to prod. Inside
 * dev, individual layers are gated by URL flags + `localStorage` so an
 * operator/dev can toggle without code changes:
 *
 *   - `?perf=0` or absent  → no HUD, no observers (silent)
 *   - `?perf=1`            → HUD + observer battery + frame pacing
 *   - `?perf=full`         → everything in `?perf=1` plus JS Self
 *                            Profiler sampling + memory sampler
 *
 * The choice is persisted in `localStorage` so HMR and reloads keep
 * the state without the dev re-typing the query string. Pass
 * `?perf=clear` to wipe it.
 */

const STORAGE_KEY = 'c2hub.perf.level';

export type PerfLevel = 'off' | 'on' | 'full';

function readUrlLevel(): PerfLevel | 'clear' | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('perf');
  if (raw == null) return null;
  if (raw === 'clear') return 'clear';
  if (raw === '0' || raw === 'off' || raw === 'false') return 'off';
  if (raw === 'full' || raw === '2') return 'full';
  return 'on';
}

function readStorageLevel(): PerfLevel | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'on' || raw === 'off' || raw === 'full') return raw;
    return null;
  } catch {
    return null;
  }
}

function writeStorageLevel(level: PerfLevel | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (level == null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, level);
    }
  } catch {
    // Storage may be unavailable (private mode, quota); flags fall back to URL only.
  }
}

let cachedLevel: PerfLevel | null = null;

/**
 * Resolve the effective perf level once, caching the result. URL beats
 * storage; absence of either defaults to `off`. `?perf=clear` resets
 * storage and returns `off`.
 */
export function getPerfLevel(): PerfLevel {
  if (cachedLevel != null) return cachedLevel;
  const urlLevel = readUrlLevel();
  if (urlLevel === 'clear') {
    writeStorageLevel(null);
    cachedLevel = 'off';
    return cachedLevel;
  }
  if (urlLevel != null) {
    writeStorageLevel(urlLevel);
    cachedLevel = urlLevel;
    return cachedLevel;
  }
  cachedLevel = readStorageLevel() ?? 'off';
  return cachedLevel;
}

/** Convenience: any non-`off` level enables the always-on observers + HUD. */
export function isPerfEnabled(): boolean {
  return getPerfLevel() !== 'off';
}

/** Convenience: `full` gates the heavyweight samplers (JS Self Profiler, memory). */
export function isPerfFull(): boolean {
  return getPerfLevel() === 'full';
}

/**
 * Imperatively set the level (used by the HUD's toggle UI). Updates
 * storage and the cache; the caller is responsible for reloading or
 * tearing down observers if they want a hot switch.
 */
export function setPerfLevel(level: PerfLevel): void {
  cachedLevel = level;
  writeStorageLevel(level);
}
