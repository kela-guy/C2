/**
 * Map backend selector.
 *
 * Default backend is Cesium (via `CesiumTacticalMap`) following the
 * Phase 8 cutover. The legacy Mapbox-based `TacticalMap` stays
 * available as an opt-out via the `?map=mapbox` URL parameter so
 * operators can roll back if a regression appears mid-shift.
 *
 * Read once at module load — switching backends requires a full page
 * reload, which keeps lifecycle simple (no live re-mount of the map).
 */

export type MapBackend = 'mapbox' | 'cesium';

const PARAM_NAME = 'map';

function readBackendFromSearch(search: string): MapBackend {
  try {
    const params = new URLSearchParams(search);
    const value = params.get(PARAM_NAME);
    if (value === 'mapbox') return 'mapbox';
    return 'cesium';
  } catch {
    return 'cesium';
  }
}

export const MAP_BACKEND: MapBackend =
  typeof window !== 'undefined'
    ? readBackendFromSearch(window.location.search)
    : 'cesium';

/** True when running with `?map=cesium` *or* the unsuffixed default URL. */
export const IS_CESIUM = MAP_BACKEND === 'cesium';
