import { describe, it, expect } from 'vitest';
import {
  haversineDistanceM,
  bearingDegrees,
  destination,
  fovPolygon,
} from './mapGeo';

describe('haversineDistanceM', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistanceM(32.08, 34.78, 32.08, 34.78)).toBe(0);
  });

  it('measures 1 degree of latitude as ~111,195 m', () => {
    // pi/180 * EARTH_RADIUS_M (6,371,000) = 111,194.93 m
    const d = haversineDistanceM(0, 0, 1, 0);
    expect(d).toBeGreaterThan(111_095);
    expect(d).toBeLessThan(111_295);
  });

  it('is symmetric: d(a,b) === d(b,a)', () => {
    const ab = haversineDistanceM(32.08, 34.78, 31.77, 35.21);
    const ba = haversineDistanceM(31.77, 35.21, 32.08, 34.78);
    expect(ab).toBeCloseTo(ba, 10);
  });
});

describe('bearingDegrees', () => {
  it('returns 0 for due north', () => {
    expect(bearingDegrees(0, 0, 1, 0)).toBeCloseTo(0, 10);
  });

  it('returns 90 for due east', () => {
    expect(bearingDegrees(0, 0, 0, 1)).toBeCloseTo(90, 10);
  });

  it('always returns a value in [0, 360)', () => {
    const cases: Array<[number, number, number, number]> = [
      [0, 0, -1, 0], // due south
      [0, 0, 0, -1], // due west
      [10, 10, -5, -20],
      [45, -120, 44, -121],
    ];
    for (const [lat1, lon1, lat2, lon2] of cases) {
      const b = bearingDegrees(lat1, lon1, lat2, lon2);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(360);
    }
  });
});

describe('destination', () => {
  it('round-trips: 1,000 m out at bearing 45deg, haversine back is ~1,000 m', () => {
    const [lon, lat] = destination(32.08, 34.78, 1_000, 45);
    const back = haversineDistanceM(32.08, 34.78, lat, lon);
    expect(Math.abs(back - 1_000)).toBeLessThanOrEqual(1);
  });

  it('returns [lon, lat] (GeoJSON order)', () => {
    // Due north from (lat 10, lon 20): longitude stays 20, latitude grows.
    const [lon, lat] = destination(10, 20, 10_000, 0);
    expect(lon).toBeCloseTo(20, 6);
    expect(lat).toBeGreaterThan(10);
  });
});

describe('fovPolygon', () => {
  // NOTE: the doc comment at mapGeo.ts:47 claims the full-circle ring omits
  // the center vertex; the implementation includes it (degenerate zero-width
  // slit, harmless for fills and ray-casting). These tests characterize the
  // actual behavior. Doc comment is stale — flagged to the maintainer.
  it('fovDeg >= 360 produces [center, 33 rim points, center] (length 35)', () => {
    const ring = fovPolygon(32.08, 34.78, 360, 0, 1_200);
    expect(ring).toHaveLength(35);
    expect(ring[0]).toEqual([34.78, 32.08]);
    expect(ring[ring.length - 1]).toEqual([34.78, 32.08]);
    // Every rim point sits at the requested radius.
    for (const [lon, lat] of ring.slice(1, -1)) {
      expect(haversineDistanceM(32.08, 34.78, lat, lon)).toBeCloseTo(1_200, 3);
    }
  });

  it('fovDeg < 360 produces a pie slice: center first/last with max(8, floor(fovDeg/360*32)) + 1 rim points', () => {
    const fovDeg = 90;
    const steps = Math.max(8, Math.floor((fovDeg / 360) * 32)); // 8
    const ring = fovPolygon(0, 0, fovDeg, 0, 400);
    expect(ring).toHaveLength(steps + 1 + 2); // rim points + center at both ends
    expect(ring[0]).toEqual([0, 0]);
    expect(ring[ring.length - 1]).toEqual([0, 0]);
    for (const [lon, lat] of ring.slice(1, -1)) {
      expect(haversineDistanceM(0, 0, lat, lon)).toBeCloseTo(400, 3);
    }
  });
});
