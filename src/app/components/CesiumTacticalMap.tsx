/**
 * CesiumTacticalMap — drop-in replacement for `TacticalMap` powered by CesiumJS.
 *
 * Mounts in `Dashboard` when the URL contains `?map=cesium`. Default is still
 * Mapbox (`TacticalMap`).
 *
 * **Batch 1 — Phase 1 (this revision):** all assets and detections render as
 * plain coloured Cesium pins, categorised by asset type. The point is to
 * verify positions, prop plumbing, and that nothing is missing. Visual styling
 * (real SVG icons, threat-accent rings, heading rotation) lands in Phase 2.
 *
 * Parity progress: `docs/cesium-parity.md`.
 */

import { useMemo } from 'react';
import { CesiumMap, type CesiumMarker } from '@/primitives';
import {
  CAMERA_ASSETS,
  RADAR_ASSETS,
  DRONE_HIVE_ASSETS,
  LIDAR_ASSETS,
  WEAPON_SYSTEM_ASSETS,
  LAUNCHER_ASSETS,
  REGULUS_EFFECTORS,
} from './TacticalMap';
import type { TacticalMapProps } from './TacticalMap';

const CESIUM_ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined) ?? '';

/**
 * Default initial view (Israel — same area the existing Mapbox map opens to).
 * `heightM` in 2D mode is interpreted as the orthographic frustum extent;
 * 80 km gives a city-scale view that includes all current asset positions.
 * In subsequent phases this becomes data-driven (fit to targets, mission, etc.).
 */
const DEFAULT_INITIAL_VIEW = { lat: 32.466, lon: 35.005, heightM: 80_000 };

/** Phase-1 colour palette by asset category. Phase 2 replaces with proper styling. */
const CATEGORY_COLOR = {
  target: '#fa5252', // red
  camera: '#74c0fc', // blue
  radar: '#22b8cf', // cyan
  lidar: '#a5d8ff', // light blue
  hive: '#fcc419', // amber
  weapon: '#ff922b', // orange
  launcher: '#fa5252', // red
  regulus: '#ef4444', // red (effector)
  friendlyDrone: '#22d3ee', // cyan
  launcherEffector: '#fa5252',
} as const;

export function CesiumTacticalMap({
  targets,
  regulusEffectors,
  friendlyDrones,
  launcherEffectors,
}: TacticalMapProps) {
  /**
   * Compose every asset registry + every dynamic prop into one big
   * `CesiumMarker[]`. Each entry is categorised by colour for now — Phase 2
   * will swap individual entries for real billboard / DOM-overlay icons.
   *
   * IDs across registries can collide (e.g. `LAUNCHER_ASSETS` + the
   * `launcherEffectors` prop both reference the same launcher), and Cesium
   * throws if the same entity id is added twice. Dedupe by id; the first
   * source wins (registries before props).
   */
  const allMarkers = useMemo<CesiumMarker[]>(() => {
    const out: CesiumMarker[] = [];
    const seen = new Set<string>();
    const push = (m: CesiumMarker) => {
      if (seen.has(m.id)) return;
      seen.add(m.id);
      out.push(m);
    };

    // Targets — coordinates parsed from the "lat, lon" string.
    if (targets) {
      for (const t of targets) {
        const [lat, lon] = (t.coordinates ?? '').split(',').map((s) => parseFloat(s.trim()));
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        push({
          id: t.id,
          lat,
          lon,
          label: t.name ?? t.id,
          color: CATEGORY_COLOR.target,
        });
      }
    }

    // Static asset registries.
    for (const a of CAMERA_ASSETS) {
      push({ id: a.id, lat: a.latitude, lon: a.longitude, label: a.typeLabel, color: CATEGORY_COLOR.camera });
    }
    for (const a of RADAR_ASSETS) {
      push({ id: a.id, lat: a.latitude, lon: a.longitude, label: a.typeLabel, color: CATEGORY_COLOR.radar });
    }
    for (const a of LIDAR_ASSETS) {
      push({ id: a.id, lat: a.latitude, lon: a.longitude, label: a.typeLabel, color: CATEGORY_COLOR.lidar });
    }
    for (const a of DRONE_HIVE_ASSETS) {
      push({ id: a.id, lat: a.latitude, lon: a.longitude, label: a.typeLabel, color: CATEGORY_COLOR.hive });
    }
    for (const a of WEAPON_SYSTEM_ASSETS) {
      push({ id: a.id, lat: a.latitude, lon: a.longitude, label: a.typeLabel, color: CATEGORY_COLOR.weapon });
    }
    for (const l of LAUNCHER_ASSETS) {
      push({ id: l.id, lat: l.latitude, lon: l.longitude, label: l.id, color: CATEGORY_COLOR.launcher });
    }

    // Regulus effectors — pull from props if provided, fall back to module
    // defaults so the map renders consistently with the Mapbox path.
    const effectors = regulusEffectors ?? REGULUS_EFFECTORS;
    for (const e of effectors) {
      push({ id: e.id, lat: e.lat, lon: e.lon, label: e.name, color: CATEGORY_COLOR.regulus });
    }

    // Friendly drones (dashboard prop).
    if (friendlyDrones) {
      for (const d of friendlyDrones) {
        push({ id: d.id, lat: d.lat, lon: d.lon, label: d.name, color: CATEGORY_COLOR.friendlyDrone });
      }
    }

    // Launcher effectors (dashboard prop) — likely overlaps `LAUNCHER_ASSETS`,
    // dedupe handles it.
    if (launcherEffectors) {
      for (const l of launcherEffectors) {
        // LauncherEffector shape mirrors RegulusEffector — assume lat/lon present.
        const lat = (l as unknown as { lat?: number }).lat;
        const lon = (l as unknown as { lon?: number }).lon;
        if (typeof lat !== 'number' || typeof lon !== 'number') continue;
        push({
          id: l.id,
          lat,
          lon,
          label: (l as unknown as { name?: string }).name ?? l.id,
          color: CATEGORY_COLOR.launcherEffector,
        });
      }
    }

    return out;
  }, [targets, regulusEffectors, friendlyDrones, launcherEffectors]);

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
      {/* Phase indicator — pinned to physical-left so it's visible despite the
          dashboard's `dir="rtl"`. Removed in Phase 8 cutover. */}
      <div
        className="pointer-events-none absolute top-2 left-2 z-10 rounded-md bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-200 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
        aria-live="polite"
      >
        Cesium backend — Phase 1 ({allMarkers.length} markers)
      </div>

      <CesiumMap
        ionToken={CESIUM_ION_TOKEN}
        initialView={DEFAULT_INITIAL_VIEW}
        markers={allMarkers}
        sceneMode="2D"
        className="absolute inset-0"
      />
    </div>
  );
}
