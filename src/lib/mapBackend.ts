/**
 * Map backend selector.
 *
 * Default backend is Mapbox (via `TacticalMap`). The Cesium-based
 * `CesiumTacticalMap` is selected via the `?map=cesium` URL parameter
 * during the Cesium parity migration.
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
    if (value === 'cesium') return 'cesium';
    return 'mapbox';
  } catch {
    return 'mapbox';
  }
}

export const MAP_BACKEND: MapBackend =
  typeof window !== 'undefined'
    ? readBackendFromSearch(window.location.search)
    : 'mapbox';

/** True when running with `?map=cesium`. */
export const IS_CESIUM = MAP_BACKEND === 'cesium';
