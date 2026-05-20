import { describe, expect, it } from 'vitest';
import { MotionRegistry } from './registry';
import { createMotionTrack, shortestArcDeg } from './motionTracker';
import { buildMovementSamples } from './buildSamples';
import type { MovementSample } from './types';

describe('createMotionTrack', () => {
  it('smooths live samples toward newer fixes', () => {
    const track = createMotionTrack();
    track.pushSample(32, 34, 0, { mode: 'live' });
    track.pushSample(32.00002, 34.00002, 500, { mode: 'live' });
    const mid = track.query(250);
    expect(mid.lat).toBeGreaterThan(32);
    expect(mid.lat).toBeLessThan(32.00002);
  });

  it('snaps on replay without rubber-banding', () => {
    const track = createMotionTrack();
    track.pushSample(32, 34, 0, { mode: 'live' });
    track.pushSample(33, 35, 1000, { mode: 'live' });
    track.query(2000);
    track.pushSample(32.5, 34.5, 5000, { mode: 'replay' });
    const snap = track.query(6000);
    expect(snap.lat).toBe(32.5);
    expect(snap.lon).toBe(34.5);
    expect(snap.confidence).toBe(1);
  });

  it('resets on seek', () => {
    const track = createMotionTrack();
    track.pushSample(32, 34, 0, { mode: 'live' });
    track.pushSample(33, 35, 1000, { mode: 'live' });
    track.pushSample(32.1, 34.1, 500, { mode: 'seek' });
    const snap = track.peek();
    expect(snap.lat).toBe(32.1);
    expect(snap.lon).toBe(34.1);
  });

  it('freezes after stale live gap', () => {
    const track = createMotionTrack();
    track.pushSample(32, 34, 0, { mode: 'live' });
    const stale = track.query(6000);
    expect(stale.frozen).toBe(true);
  });
});

describe('shortestArcDeg', () => {
  it('wraps across north', () => {
    expect(shortestArcDeg(350, 10)).toBeCloseTo(20, 5);
  });
});

describe('MotionRegistry', () => {
  it('detects backward scrub as seek', () => {
    const registry = new MotionRegistry();
    const forward: MovementSample[] = [
      { id: 't1', lat: 32, lon: 34, sourceTimeMs: 1000, mode: 'replay' },
    ];
    registry.ingest(forward);
    const backward: MovementSample[] = [
      { id: 't1', lat: 32.1, lon: 34.1, sourceTimeMs: 500, mode: 'replay' },
    ];
    registry.ingest(backward);
    const snap = registry.peek('t1');
    expect(snap?.lat).toBe(32.1);
  });

  it('drops static ids from the track map', () => {
    const registry = new MotionRegistry();
    registry.ingest([
      { id: 'd1', lat: 32, lon: 34, sourceTimeMs: 0, mode: 'live' },
    ]);
    expect(registry.has('d1')).toBe(true);
    registry.ingest([
      { id: 'd1', lat: 32, lon: 34, sourceTimeMs: 0, mode: 'static' },
    ]);
    expect(registry.has('d1')).toBe(false);
  });
});

describe('buildMovementSamples', () => {
  it('skips non-finite coordinates', () => {
    const samples = buildMovementSamples(
      [{ id: 'x', coordinates: 'bad,coords', name: 'x' } as never],
      [{ id: 'd', lat: Number.NaN, lon: 34, name: 'd', altitude: '0' }],
      0,
      'live',
      new Set(),
      () => null,
    );
    expect(samples).toHaveLength(0);
  });
});
