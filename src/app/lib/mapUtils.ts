import type { RefObject } from 'react';
import type { MapRef } from 'react-map-gl';
import type mapboxgl from 'mapbox-gl';

/**
 * Extract the underlying mapbox-gl Map instance from a react-map-gl ref.
 * Some react-map-gl versions return the Map directly; others wrap it with .getMap().
 * Returns null when the ref isn't hydrated yet.
 */
export function getMapInstance(ref: RefObject<MapRef | null>): mapboxgl.Map | null {
  const current = ref.current as unknown as
    | (MapRef & { getMap?: () => mapboxgl.Map })
    | mapboxgl.Map
    | null;
  if (!current) return null;
  if (typeof (current as { getMap?: unknown }).getMap === 'function') {
    return (current as { getMap: () => mapboxgl.Map }).getMap() ?? null;
  }
  return current as mapboxgl.Map;
}

/** Log an error in dev, swallow in prod. For map operations where recovery isn't meaningful. */
export function logMapError(context: string, err: unknown): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[map] ${context}:`, err);
  }
}

/**
 * Safely call a mapbox operation that might fail during style loading, unmount, etc.
 * Empty catches all over the codebase were hiding real bugs — this keeps them visible in dev.
 */
export function tryMapOp<T>(context: string, fn: () => T): T | undefined {
  try {
    return fn();
  } catch (err) {
    logMapError(context, err);
    return undefined;
  }
}

/**
 * Mapbox access token. Set VITE_MAPBOX_TOKEN in .env.local (see .env.example).
 * There is intentionally no fallback: a missing token must fail loudly
 * instead of silently billing a shared account.
 */
export const MAPBOX_TOKEN: string =
  (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ?? '';

if (!MAPBOX_TOKEN && import.meta.env.DEV) {
  console.error(
    '[mapUtils] VITE_MAPBOX_TOKEN is not set — Mapbox surfaces (/fov-test, legacy map) will not render. See .env.example.',
  );
}
