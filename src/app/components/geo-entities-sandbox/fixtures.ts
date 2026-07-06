import type { GeoBounds, GeoEntity } from './types';

/**
 * Sandbox bounds — a small AO roughly over central Israel so the mock
 * coordinates read like the rest of the app's fixtures. Purely arbitrary; the
 * projection only cares about relative position inside these bounds.
 */
export const SANDBOX_BOUNDS: GeoBounds = {
  minLat: 31.9,
  maxLat: 32.3,
  minLng: 34.7,
  maxLng: 35.1,
};

export const SANDBOX_ENTITIES: GeoEntity[] = [
  {
    id: 'TGT-01',
    kind: 'target',
    label: 'Target Alpha',
    position: { lat: 32.08, lng: 34.81, altitudeM: 45 },
    headingDeg: 120,
    severity: 'critical',
  },
  {
    id: 'TGT-02',
    kind: 'target',
    label: 'Target Bravo',
    position: { lat: 32.16, lng: 34.95, altitudeM: 12 },
    headingDeg: 250,
    severity: 'caution',
  },
  {
    id: 'FRD-01',
    kind: 'friendly',
    label: 'Patrol 1',
    position: { lat: 32.04, lng: 34.88 },
    headingDeg: 30,
    severity: 'info',
  },
  {
    id: 'SNS-01',
    kind: 'sensor',
    label: 'Radar North',
    position: { lat: 32.22, lng: 34.78 },
    severity: 'info',
  },
  {
    id: 'POI-01',
    kind: 'poi',
    label: 'Checkpoint',
    position: { lat: 31.97, lng: 35.0 },
  },
  {
    id: 'ZON-01',
    kind: 'zone',
    label: 'Restricted Area',
    position: { lat: 32.12, lng: 34.73 },
    severity: 'caution',
  },
];
