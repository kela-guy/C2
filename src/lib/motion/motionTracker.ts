import type { MovementMode } from './types';

interface Sample {
  lat: number;
  lon: number;
  t: number;
}

export interface MotionQuery {
  lat: number;
  lon: number;
  headingDeg: number | null;
  confidence: number;
  ageMs: number;
  haloRadiusM: number;
  frozen: boolean;
}

export interface PushSampleOptions {
  mode?: MovementMode;
  headingDeg?: number | null;
}

export interface MotionTrack {
  pushSample: (
    lat: number,
    lon: number,
    t: number,
    options?: PushSampleOptions,
  ) => void;
  reset: () => void;
  query: (now: number) => MotionQuery;
  peek: () => MotionQuery;
}

const SMOOTH_TAU_MS = 120;
/** Brief settle on a fresh sample, then advance along the last segment. */
const EXTRAP_AFTER_MS = 40;
/** Ignore sub-50 ms sample gaps (duplicate-t bumps) when deriving segment geometry. */
const MIN_SEGMENT_DT_SEC = 0.05;
/** Small extension past newest while waiting for the next ~100 ms telemetry fix. */
const MAX_SEGMENT_OVERSHOOT = 0.06;
const STALE_AT_MS = 5000;
const TELEPORT_M = 1500;
const MIN_HALO_M = 0;
const MAX_HALO_M = 800;
const HEADING_FROM_VEL_MIN_M_PER_S = 0.5;
const VELOCITY_WINDOW_PREFERRED_MS = 5000;
const VELOCITY_WINDOW_MAX_MS = 10000;
const MIN_REGRESSION_SAMPLES = 3;
const SAMPLE_BUFFER_MAX = 64;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function approxDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const meanLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const dLatRad = (lat2 - lat1) * (Math.PI / 180);
  const dLonRad = (lon2 - lon1) * (Math.PI / 180);
  const x = dLonRad * Math.cos(meanLatRad);
  return Math.sqrt(x * x + dLatRad * dLatRad) * R;
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function shortestArcDeg(a: number, b: number): number {
  let d = ((b - a + 540) % 360) - 180;
  if (d <= -180) d += 360;
  return d;
}

function regressSlopePerMs(pts: ReadonlyArray<{ t: number; y: number }>): number {
  const n = pts.length;
  if (n < 2) return 0;
  let sumT = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumT += pts[i].t;
    sumY += pts[i].y;
  }
  const meanT = sumT / n;
  const meanY = sumY / n;
  let num = 0;
  let denom = 0;
  for (let i = 0; i < n; i++) {
    const dt = pts[i].t - meanT;
    num += dt * (pts[i].y - meanY);
    denom += dt * dt;
  }
  return denom > 0 ? num / denom : 0;
}

function segmentTarget(
  samples: Sample[],
  now: number,
  ageMs: number,
): { lat: number; lon: number } | null {
  if (samples.length < 2) return null;
  const newest = samples[samples.length - 1];
  const prev = samples[samples.length - 2];
  const spanMs = newest.t - prev.t;
  if (spanMs < MIN_SEGMENT_DT_SEC * 1000) return null;

  const uRaw = (now - prev.t) / spanMs;
  const overshootCap = Math.min(
    MAX_SEGMENT_OVERSHOOT,
    (ageMs / spanMs) * MAX_SEGMENT_OVERSHOOT,
  );
  const u = Math.min(uRaw, 1 + overshootCap);
  return {
    lat: prev.lat + (newest.lat - prev.lat) * u,
    lon: prev.lon + (newest.lon - prev.lon) * u,
  };
}

function snapSnapshot(
  lat: number,
  lon: number,
  headingDeg: number | null,
  frozen: boolean,
): MotionQuery {
  return {
    lat,
    lon,
    headingDeg,
    confidence: 1,
    ageMs: 0,
    haloRadiusM: MIN_HALO_M,
    frozen,
  };
}

export function createMotionTrack(): MotionTrack {
  const samples: Sample[] = [];
  let displayLat = 0;
  let displayLon = 0;
  let displayHeadingDeg: number | null = null;
  let lastQueryAt = 0;
  let frozen = false;
  let initialised = false;
  let trackMode: MovementMode = 'live';
  let snapshot: MotionQuery = {
    lat: 0,
    lon: 0,
    headingDeg: null,
    confidence: 0,
    ageMs: 0,
    haloRadiusM: MAX_HALO_M,
    frozen: false,
  };

  const reset = () => {
    samples.length = 0;
    displayLat = 0;
    displayLon = 0;
    displayHeadingDeg = null;
    lastQueryAt = 0;
    frozen = false;
    initialised = false;
    trackMode = 'live';
    snapshot = {
      lat: 0,
      lon: 0,
      headingDeg: null,
      confidence: 0,
      ageMs: 0,
      haloRadiusM: MAX_HALO_M,
      frozen: false,
    };
  };

  function selectWindow(now: number): Sample[] {
    const start = (cutoff: number) => {
      for (let i = samples.length - 1; i >= 0; i--) {
        if (samples[i].t < cutoff) return i + 1;
      }
      return 0;
    };
    let from = start(now - VELOCITY_WINDOW_PREFERRED_MS);
    if (samples.length - from < MIN_REGRESSION_SAMPLES) {
      from = start(now - VELOCITY_WINDOW_MAX_MS);
    }
    return samples.slice(from);
  }

  function computeVelocity(window: Sample[]): { vLatPerSec: number; vLonPerSec: number } {
    if (window.length < 2) return { vLatPerSec: 0, vLonPerSec: 0 };
    if (window.length < MIN_REGRESSION_SAMPLES) {
      const a = window[0];
      const b = window[window.length - 1];
      const dt = (b.t - a.t) / 1000;
      if (dt <= 0) return { vLatPerSec: 0, vLonPerSec: 0 };
      return { vLatPerSec: (b.lat - a.lat) / dt, vLonPerSec: (b.lon - a.lon) / dt };
    }
    const latPts = window.map((s) => ({ t: s.t, y: s.lat }));
    const lonPts = window.map((s) => ({ t: s.t, y: s.lon }));
    const vLatPerMs = regressSlopePerMs(latPts);
    const vLonPerMs = regressSlopePerMs(lonPts);
    return { vLatPerSec: vLatPerMs * 1000, vLonPerSec: vLonPerMs * 1000 };
  }

  function computeAngular(window: Sample[]): { headingDeg: number | null; angVelDegPerSec: number } {
    if (window.length < 2) return { headingDeg: null, angVelDegPerSec: 0 };

    const pairs: Array<{ t: number; h: number }> = [];
    for (let i = 1; i < window.length; i++) {
      const a = window[i - 1];
      const b = window[i];
      const dt = (b.t - a.t) / 1000;
      if (dt <= 0) continue;
      const speed = approxDistanceM(a.lat, a.lon, b.lat, b.lon) / dt;
      if (speed < HEADING_FROM_VEL_MIN_M_PER_S) continue;
      pairs.push({ t: (a.t + b.t) / 2, h: bearingDeg(a.lat, a.lon, b.lat, b.lon) });
    }
    if (pairs.length === 0) return { headingDeg: null, angVelDegPerSec: 0 };

    const latestHeading = pairs[pairs.length - 1].h;

    if (pairs.length < MIN_REGRESSION_SAMPLES) {
      return { headingDeg: latestHeading, angVelDegPerSec: 0 };
    }

    const unwrapped: number[] = [pairs[0].h];
    for (let i = 1; i < pairs.length; i++) {
      const delta = shortestArcDeg(pairs[i - 1].h, pairs[i].h);
      unwrapped.push(unwrapped[i - 1] + delta);
    }
    const angPts = pairs.map((p, i) => ({ t: p.t, y: unwrapped[i] }));
    const omegaPerMs = regressSlopePerMs(angPts);

    return { headingDeg: latestHeading, angVelDegPerSec: omegaPerMs * 1000 };
  }

  const pushSample = (
    lat: number,
    lon: number,
    t: number,
    options?: PushSampleOptions,
  ) => {
    const mode = options?.mode ?? 'live';
    const suppliedHeading = options?.headingDeg;

    if (mode === 'replay' || mode === 'seek') {
      trackMode = mode;
      samples.length = 0;
      samples.push({ lat, lon, t });
      displayLat = lat;
      displayLon = lon;
      displayHeadingDeg = suppliedHeading ?? displayHeadingDeg;
      frozen = false;
      initialised = true;
      lastQueryAt = t;
      snapshot = snapSnapshot(lat, lon, displayHeadingDeg, false);
      return;
    }

    trackMode = 'live';

    let sampleT = t;
    if (samples.length > 0 && sampleT <= samples[samples.length - 1].t) {
      sampleT = samples[samples.length - 1].t + 1;
    }

    if (!initialised) {
      displayLat = lat;
      displayLon = lon;
      displayHeadingDeg = suppliedHeading ?? null;
      lastQueryAt = sampleT;
      samples.push({ lat, lon, t: sampleT });
      initialised = true;
      snapshot = snapSnapshot(lat, lon, displayHeadingDeg, false);
      return;
    }

    const last = samples[samples.length - 1];
    const distM = approxDistanceM(last.lat, last.lon, lat, lon);
    if (distM > TELEPORT_M) {
      samples.length = 0;
      samples.push({ lat, lon, t: sampleT });
      displayLat = lat;
      displayLon = lon;
      displayHeadingDeg = suppliedHeading ?? null;
      frozen = false;
      snapshot = snapSnapshot(lat, lon, displayHeadingDeg, false);
      return;
    }

    samples.push({ lat, lon, t: sampleT });

    const evictBefore = sampleT - VELOCITY_WINDOW_MAX_MS;
    while (samples.length > 0 && samples[0].t < evictBefore) samples.shift();
    while (samples.length > SAMPLE_BUFFER_MAX) samples.shift();

    frozen = false;
    if (suppliedHeading != null) displayHeadingDeg = suppliedHeading;
  };

  const query = (now: number): MotionQuery => {
    if (!initialised) return snapshot;

    if (trackMode === 'replay' || trackMode === 'seek') {
      const newest = samples[samples.length - 1];
      snapshot = snapSnapshot(
        newest.lat,
        newest.lon,
        displayHeadingDeg,
        false,
      );
      return snapshot;
    }

    const window = selectWindow(now);
    const { headingDeg: instHeading, angVelDegPerSec } = computeAngular(window);

    const newest = samples[samples.length - 1];
    const ageMs = now - newest.t;

    let targetLat: number;
    let targetLon: number;

    if (frozen) {
      targetLat = displayLat;
      targetLon = displayLon;
    } else if (ageMs <= EXTRAP_AFTER_MS) {
      targetLat = newest.lat;
      targetLon = newest.lon;
    } else if (ageMs <= STALE_AT_MS) {
      const alongSegment = segmentTarget(samples, now, ageMs);
      if (alongSegment) {
        targetLat = alongSegment.lat;
        targetLon = alongSegment.lon;
      } else {
        targetLat = newest.lat;
        targetLon = newest.lon;
      }
    } else {
      frozen = true;
      targetLat = displayLat;
      targetLon = displayLon;
    }

    let targetHeading: number | null = instHeading ?? displayHeadingDeg;
    if (
      instHeading != null &&
      ageMs > EXTRAP_AFTER_MS &&
      ageMs <= STALE_AT_MS
    ) {
      const dtSec = ageMs / 1000;
      targetHeading = ((instHeading + angVelDegPerSec * dtSec) % 360 + 360) % 360;
    }

    const dtMs = Math.max(0, now - lastQueryAt);
    const factor = 1 - Math.exp(-dtMs / SMOOTH_TAU_MS);
    displayLat += (targetLat - displayLat) * factor;
    displayLon += (targetLon - displayLon) * factor;

    if (targetHeading != null) {
      if (displayHeadingDeg == null) {
        displayHeadingDeg = targetHeading;
      } else {
        const delta = shortestArcDeg(displayHeadingDeg, targetHeading);
        displayHeadingDeg =
          ((displayHeadingDeg + delta * factor) % 360 + 360) % 360;
      }
    }

    lastQueryAt = now;

    const staleness = clamp01(ageMs / STALE_AT_MS);
    const confidence = 1 - staleness;
    const haloRadiusM = MIN_HALO_M + (MAX_HALO_M - MIN_HALO_M) * staleness;

    snapshot = {
      lat: displayLat,
      lon: displayLon,
      headingDeg: displayHeadingDeg,
      confidence,
      ageMs,
      haloRadiusM,
      frozen,
    };

    return snapshot;
  };

  const peek = () => snapshot;

  return { pushSample, reset, query, peek };
}

export { shortestArcDeg };
