/**
 * CesiumTacticalMap — drop-in replacement for `TacticalMap` powered by CesiumJS.
 *
 * Mounts in `Dashboard` when the URL contains `?map=cesium`. Default is still
 * Mapbox (`TacticalMap`).
 *
 * **Phase 0 (this file):** skeleton only. Same public prop surface as
 * `TacticalMap` so the call site in `Dashboard` is identical, but the body
 * renders just the Cesium globe with imagery + a watermark indicating
 * we're on the Cesium backend. No markers / interactions yet — those land
 * in subsequent phases (1: static markers, 2: icons + state styling, 3:
 * hover / click / context menu).
 *
 * Parity progress is tracked in `docs/cesium-parity.md`.
 */

import { useMemo } from 'react';
import { CesiumMap, type CesiumMarker } from '@/primitives';
import type { TacticalMapProps } from './TacticalMap';

const CESIUM_ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined) ?? '';

/**
 * Default initial view (Israel — same area the existing Mapbox map opens to).
 * `heightM` in 2D mode is interpreted as the orthographic frustum extent;
 * 80 km gives a city-scale view that includes all current asset positions.
 * In subsequent phases this becomes data-driven (fit to targets, mission, etc.).
 */
const DEFAULT_INITIAL_VIEW = { lat: 32.466, lon: 35.005, heightM: 80_000 };

export function CesiumTacticalMap({
  // Phase 1 will start consuming `targets`. For now we accept all props so the
  // call site is unchanged, then no-op everything except the imagery.
  targets,
}: TacticalMapProps) {
  // Phase 1 preview: convert the first few targets to plain Cesium markers so
  // the dashboard isn't visually empty when toggled. Replaced with a real
  // implementation (icons, state-driven styling) in Phase 2.
  const previewMarkers = useMemo<CesiumMarker[]>(() => {
    if (!targets || targets.length === 0) return [];
    return targets
      .slice(0, 50)
      .map((t) => {
        const [lat, lon] = (t.coordinates ?? '').split(',').map((s) => parseFloat(s.trim()));
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return {
          id: t.id,
          lat,
          lon,
          label: t.name ?? t.id,
          color: '#fa5252',
        } satisfies CesiumMarker;
      })
      .filter((m): m is CesiumMarker => m !== null);
  }, [targets]);

  if (!CESIUM_ION_TOKEN) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-300">
        <div className="rounded-md bg-amber-500/10 px-4 py-3 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <strong>Cesium token missing.</strong> Set <code className="font-mono">VITE_CESIUM_ION_TOKEN</code> in <code className="font-mono">.env.local</code> and restart the dev server.
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Phase indicator — gets removed in Phase 8 cutover. */}
      <div
        // Pinned to physical-left so the chip is visible even though the
        // dashboard is RTL (logical `start-2` would put it under the target
        // sidebar). Removed in Phase 8 cutover.
        className="pointer-events-none absolute top-2 left-2 z-10 rounded-md bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-200 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
        aria-live="polite"
      >
        Cesium backend (parity migration in progress)
      </div>

      <CesiumMap
        ionToken={CESIUM_ION_TOKEN}
        initialView={DEFAULT_INITIAL_VIEW}
        markers={previewMarkers}
        sceneMode="2D"
        className="absolute inset-0"
      />
    </div>
  );
}
