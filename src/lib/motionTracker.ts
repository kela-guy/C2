/**
 * Per-id kinematic state for moving map objects. Backend sample arrivals are
 * irregular (typically 1 Hz, sometimes much sparser); the map needs to render
 * at 60 Hz without snapping on every fix and without hiding the fact that
 * we're flying blind when samples dry up.
 *
 * Each track:
 *   1. Ingests `(lat, lon, t)` samples via `pushSample`.
 *   2. Returns a smoothed render position via `query(now)` — the caller is
 *      Cesium's per-frame `preRender` hook.
 *
 * Between fresh samples the track interpolates (eases the displayed position
 * toward the latest sample). Once the gap exceeds `EXTRAP_AFTER_MS` it
 * starts predicting forward along the last-known velocity vector. Past
 * `STALE_AT_MS` the track latches `frozen = true`, holds the last displayed
 * position, and the halo radius pegs at `MAX_HALO_M` so the operator sees
 * "we don't actually know where this is anymore".
 *
 * Pure module — no Cesium / DOM imports — so it stays unit-testable and the
 * map primitive owns the per-frame integration loop.
 */

/** Exponential-smoothing time constant for displayed position + heading. */
const SMOOTH_TAU_MS = 250;
/** Below this gap since `lastSampleAt`, we just ease toward the newest sample. */
const EXTRAP_AFTER_MS = 250;
/** Past this gap, latch frozen + halo at max. Confidence reaches 0 here. */
const STALE_AT_MS = 5000;
/** Single-step displacement larger than this is treated as a teleport (snap, no smooth). */
const TELEPORT_M = 1500;
/**
 * Halo radius bounds (meters). 0 at full confidence, MAX at stale. The max
 * needs to read clearly on satellite imagery at city-scale zoom (~15 km
 * across the canvas), so it's tuned for visibility rather than being a
 * literal sensor accuracy figure.
 */
const MIN_HALO_M = 0;
const MAX_HALO_M = 800;
/**
 * Ground speed below this is too noisy to derive a heading from — keep the
 * last good heading instead so a stationary blob doesn't spin.
 */
const HEADING_FROM_VEL_MIN_M_PER_S = 0.5;
/** Number of recent samples kept (only the last two are read for velocity). */
const SAMPLE_RING_SIZE = 4;

interface Sample {
  lat: number;
  lon: number;
  t: number;
}

export interface MotionQuery {
  lat: number;
  lon: number;
  /** Heading in compass degrees (0 = N, 90 = E). May be `null` until we have a velocity. */
  headingDeg: number | null;
  /** 1 = fresh fix, 0 = at-or-past staleness threshold. */
  confidence: number;
  /**
   * Milliseconds since the newest sample arrived. Drives the "Ns ago"
   * badge and the marker dim — exposed so the consumer doesn't have to
   * track the sample timestamp itself.
   */
  ageMs: number;
  /** Halo radius in meters. Kept for callers that still want a spatial uncertainty cue; primary stale signal is now the marker dim + age badge. */
  haloRadiusM: number;
  /** True once we've stopped extrapolating (held the last displayed position). */
  frozen: boolean;
}

export interface MotionTrack {
  pushSample: (lat: number, lon: number, t: number) => void;
  /**
   * Advance the smoother and return the resulting snapshot. Caches the
   * result so that follow-up `peek()` calls within the same frame see the
   * same numbers. Call once per frame from the per-frame integration loop.
   */
  query: (now: number) => MotionQuery;
  /**
   * Return the most recent `query` result without advancing state. Use
   * this from any reader (e.g. a Cesium `CallbackProperty`) that needs to
   * read the same snapshot multiple times per frame — e.g. an ellipse's
   * major and minor axis callbacks must agree, otherwise Cesium throws
   * `semiMajorAxis must be >= semiMinorAxis` when the two evaluations
   * straddle a `Date.now()` tick.
   */
  peek: () => MotionQuery;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * Approximate metres between two lat/lon points using equirectangular
 * projection. Plenty accurate at the per-marker scale (sub-km) where we
 * only use it to detect teleport jumps and compute ground speed.
 */
function approxDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const meanLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const dLatRad = (lat2 - lat1) * (Math.PI / 180);
  const dLonRad = (lon2 - lon1) * (Math.PI / 180);
  const x = dLonRad * Math.cos(meanLatRad);
  return Math.sqrt(x * x + dLatRad * dLatRad) * R;
}

/** Compass bearing (0 = N, 90 = E) from p1 → p2 in degrees. */
function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Shortest-arc difference (b - a) in degrees, in (-180, 180]. */
function shortestArcDeg(a: number, b: number): number {
  let d = ((b - a + 540) % 360) - 180;
  if (d <= -180) d += 360;
  return d;
}

export function createMotionTrack(): MotionTrack {
  const samples: Sample[] = [];
  let displayLat = 0;
  let displayLon = 0;
  let displayHeadingDeg: number | null = null;
  let lastQueryAt = 0;
  let velLatPerSec = 0;
  let velLonPerSec = 0;
  let frozen = false;
  let initialised = false;
  // Snapshot of the most recent `query()` result. `peek()` returns this
  // without mutating state so multiple readers in the same frame agree.
  let snapshot: MotionQuery = {
    lat: 0,
    lon: 0,
    headingDeg: null,
    confidence: 0,
    ageMs: 0,
    haloRadiusM: MAX_HALO_M,
    frozen: false,
  };

  const pushSample = (lat: number, lon: number, t: number) => {
    // Drop out-of-order arrivals — keeps velocity sane if a delayed packet
    // shows up after a newer one.
    if (samples.length > 0 && t < samples[samples.length - 1].t) return;

    if (!initialised) {
      // First sample — place displayed position there with no easing so
      // the marker doesn't fly in from (0, 0) on initial render. Seed the
      // snapshot too so any reader (Cesium ellipse callbacks) that fires
      // before the first `query()` sees a sane position rather than the
      // module-default (0, 0).
      displayLat = lat;
      displayLon = lon;
      lastQueryAt = t;
      samples.push({ lat, lon, t });
      initialised = true;
      snapshot = {
        lat,
        lon,
        headingDeg: null,
        confidence: 1,
        ageMs: 0,
        haloRadiusM: MIN_HALO_M,
        frozen: false,
      };
      return;
    }

    const last = samples[samples.length - 1];
    const distM = approxDistanceM(last.lat, last.lon, lat, lon);
    if (distM > TELEPORT_M) {
      // Teleport — abandon the smoothing path, snap to the new sample, and
      // throw away the velocity (it's now meaningless). Clear the freeze
      // latch so the next `query` exits the held state.
      samples.length = 0;
      samples.push({ lat, lon, t });
      displayLat = lat;
      displayLon = lon;
      velLatPerSec = 0;
      velLonPerSec = 0;
      displayHeadingDeg = null;
      frozen = false;
      snapshot = {
        lat,
        lon,
        headingDeg: null,
        confidence: 1,
        ageMs: 0,
        haloRadiusM: MIN_HALO_M,
        frozen: false,
      };
      return;
    }

    samples.push({ lat, lon, t });
    if (samples.length > SAMPLE_RING_SIZE) samples.shift();

    // Velocity from the two newest samples. With only one sample we leave
    // velocity at zero (no extrapolation possible yet).
    const a = samples[samples.length - 2];
    const b = samples[samples.length - 1];
    const dt = (b.t - a.t) / 1000;
    if (dt > 0) {
      velLatPerSec = (b.lat - a.lat) / dt;
      velLonPerSec = (b.lon - a.lon) / dt;

      // Derive heading from the velocity vector. Below the speed floor the
      // direction is dominated by sensor noise — keep the previous heading.
      const groundSpeed = approxDistanceM(a.lat, a.lon, b.lat, b.lon) / dt;
      if (groundSpeed >= HEADING_FROM_VEL_MIN_M_PER_S) {
        displayHeadingDeg = bearingDeg(a.lat, a.lon, b.lat, b.lon);
      }
    }

    // A fresh sample always thaws the freeze latch — we're getting data again.
    frozen = false;
  };

  const query = (now: number): MotionQuery => {
    if (!initialised) {
      return snapshot;
    }

    const newest = samples[samples.length - 1];
    const ageMs = now - newest.t;

    // Compute target position the smoother is chasing.
    let targetLat: number;
    let targetLon: number;

    if (frozen) {
      // Latched — hold whatever displayed position we had at freeze time.
      targetLat = displayLat;
      targetLon = displayLon;
    } else if (ageMs <= EXTRAP_AFTER_MS) {
      // Fresh enough to just chase the newest sample directly. Smoothing
      // turns the prop-update step into a glide.
      targetLat = newest.lat;
      targetLon = newest.lon;
    } else if (ageMs <= STALE_AT_MS) {
      // Predict forward along the last-known velocity vector. Capped at
      // STALE_AT_MS-worth of extrapolation so the prediction doesn't fly
      // arbitrarily far past the last fix.
      const dtSec = ageMs / 1000;
      targetLat = newest.lat + velLatPerSec * dtSec;
      targetLon = newest.lon + velLonPerSec * dtSec;
    } else {
      // Too stale — latch frozen at the current displayed position.
      frozen = true;
      targetLat = displayLat;
      targetLon = displayLon;
    }

    // Exponential smoothing toward the target. `factor` is `1 - exp(-dt/τ)`
    // which gives critically-damped-feeling motion regardless of frame rate.
    const dtMs = Math.max(0, now - lastQueryAt);
    const factor = 1 - Math.exp(-dtMs / SMOOTH_TAU_MS);
    displayLat += (targetLat - displayLat) * factor;
    displayLon += (targetLon - displayLon) * factor;

    // Heading smoothing — same factor, but on the shortest arc so we don't
    // spin the long way around 0/360.
    if (displayHeadingDeg != null) {
      // Heading is already updated on `pushSample`; we keep it as-is here.
      // (No per-frame heading smoothing yet — adds DOM complexity for the
      // map's per-frame loop. Heading updates land at sample rate.)
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

  return { pushSample, query, peek };
}

// Re-export the shortest-arc helper for callers that want to smooth heading
// themselves at React-level cadence without re-implementing the math.
export { shortestArcDeg };
