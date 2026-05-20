import { describe, expect, it } from 'vitest';
import { historicalTrackToDetection } from './timeMachine';
import type { HistoricalTrack } from './types';

const baseTrack: HistoricalTrack = {
  id: 'hist-1',
  callsign: 'T-1',
  classification: 'uav',
  affiliation: 'hostile',
  disposition: 'suspect',
  startedAt: 1_000_000,
  endedAt: 1_002_000,
  durationMs: 2000,
  killReason: 'mitigated',
  finalConfidence: 0.8,
  snapshots: [
    {
      tMs: 0,
      position: { lat: 32, lon: 34 },
      heading: 90,
      speed: 0,
      altitude: 100,
      confidence: 0.8,
      classification: 'uav',
      sensors: [],
    },
    {
      tMs: 2000,
      position: { lat: 32.01, lon: 34.01 },
      heading: 95,
      speed: 0,
      altitude: 100,
      confidence: 0.8,
      classification: 'uav',
      sensors: [],
    },
  ],
  actionLog: [],
};

describe('historicalTrackToDetection', () => {
  it('does not duplicate the trail head at the sample boundary', () => {
    const det = historicalTrackToDetection(baseTrack, 1_002_000);
    expect(det).not.toBeNull();
    const trail = det!.trail ?? [];
    expect(trail.length).toBe(2);
    const last = trail[trail.length - 1];
    expect(last.lat).toBeCloseTo(32.01, 5);
    expect(last.lon).toBeCloseTo(34.01, 5);
  });
});
