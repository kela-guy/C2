import type { Detection } from '@/imports/ListOfSystems';
import type { MovementMode, MovementSample } from './types';

export type FriendlyDroneSampleSource = {
  id: string;
  lat: number;
  lon: number;
  headingDeg?: number;
};

export function buildMovementSamples(
  targets: Detection[] | undefined,
  friendlyDrones: FriendlyDroneSampleSource[] | undefined,
  sourceTimeMs: number,
  mode: MovementMode,
  offlineIds: ReadonlySet<string>,
  targetHeading: (target: Detection) => number | null,
): MovementSample[] {
  const out: MovementSample[] = [];

  for (const target of targets ?? []) {
    const [lat, lon] = (target.coordinates ?? '')
      .split(',')
      .map((s) => parseFloat(s.trim()));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.push({
      id: target.id,
      lat,
      lon,
      headingDeg: targetHeading(target) ?? undefined,
      sourceTimeMs,
      mode,
    });
  }

  for (const drone of friendlyDrones ?? []) {
    if (!Number.isFinite(drone.lat) || !Number.isFinite(drone.lon)) continue;
    const droneMode: MovementMode = offlineIds.has(drone.id) ? 'static' : mode;
    out.push({
      id: drone.id,
      lat: drone.lat,
      lon: drone.lon,
      headingDeg: drone.headingDeg,
      sourceTimeMs,
      mode: droneMode,
    });
  }

  return out;
}
