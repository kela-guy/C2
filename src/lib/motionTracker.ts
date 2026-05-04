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
 * ─── Smoothing model ─────────────────────────────────────────────────────
 *
 * Two layers stacked on top of each other:
 *
 *   1. **Windowed regression** over a 5-10 s sliding window of recent samples
 *      gives a stable instantaneous estimate of linear velocity and angular
 *      velocity (heading rate). Single-pair velocity is too noisy on real
 *      sensor data — sample noise gets directly amplified into velocity
 *      noise — so we fit a line through the recent samples instead.
 *      Window adapts: tries 5 s first, extends to 10 s if there aren't
 *      enough samples for a stable fit.
 *
 *   2. **Exponential display smoothing** at frame rate eases the rendered
 *      position + heading toward the regression-derived target. `τ = 250 ms`
 *      is critically-damped-feeling.
 *
 * Forward extrapolation when samples go quiet uses the smoothed velocity and
 * smoothed angular velocity, so heading keeps tracking through turns even
 * after the last sample arrives.
 *
 * ─── Why no acceleration / jerk ──────────────────────────────────────────
 *
 * For loitering drones / vehicles / vessels, motion is approximately
 * constant-velocity-with-occasional-turns. Acceleration estimates from the
 * same 5-10 s window are noise-dominated (tiny signal, sample-noise floor)
 * and adding ̇v (or angular jerk ω̇) to extrapolation would *amplify* noise
 * rather than reduce it. Same conclusion for jerk.
 *
 * Accelerating tracks (missiles boosting, accelerating vehicles) are an
 * edge case where a constant-acceleration model would help; out of scope
 * for this iteration. Tracked entities don't currently include any such
 * profiles.
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

/**
 * Sliding window for velocity / angular-velocity regression. Try the
 * preferred window first; if too few samples land in it (e.g. very sparse
 * feeds), extend up to the max. Always need at least `MIN_REGRESSION_SAMPLES`
 * to fit a line stably.
 */
const VELOCITY_WINDOW_PREFERRED_MS = 5000;
const VELOCITY_WINDOW_MAX_MS = 10000;
const MIN_REGRESSION_SAMPLES = 3;
/**
 * How many samples we hold in the buffer. 64 covers ~16 s at 4 Hz; older
 * samples are evicted by `VELOCITY_WINDOW_MAX_MS` first, so this is just a
 * runaway-memory guard for very high sample rates.
 */
const SAMPLE_BUFFER_MAX = 64;

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

/**
 * Least-squares slope for `y = slope * t + intercept` over (tᵢ, yᵢ) pairs.
 * `t` is in milliseconds, so the returned slope is per-millisecond — caller
 * scales by 1000 to get per-second.
 *
 * Returns 0 when the time variance is zero (all samples at the same instant
 * — degenerate, can't fit a line).
 *
 * Takes parallel `tArr` / `yArr` arrays + `n` instead of an array of
 * `{t, y}` pairs so callers can reuse pre-allocated scratch buffers
 * across frames without paying for per-frame object allocation.
 */
function regressSlopePerMs(tArr: ArrayLike<number>, yArr: ArrayLike<number>, n: number): number {
  if (n < 2) return 0;
  let sumT = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumT += tArr[i];
    sumY += yArr[i];
  }
  const meanT = sumT / n;
  const meanY = sumY / n;
  let num = 0;
  let denom = 0;
  for (let i = 0; i < n; i++) {
    const dt = tArr[i] - meanT;
    num += dt * (yArr[i] - meanY);
    denom += dt * dt;
  }
  return denom > 0 ? num / denom : 0;
}

export function createMotionTrack(): MotionTrack {
  const samples: Sample[] = [];
  let displayLat = 0;
  let displayLon = 0;
  let displayHeadingDeg: number | null = null;
  let lastQueryAt = 0;
  let frozen = false;
  let initialised = false;
  // ── Per-frame scratch buffers ──────────────────────────────────────────
  // The integration loop runs at the render frame rate (~30 Hz with the
  // capped target frame rate) for every kinematic marker (~10+ on a
  // typical Dashboard). The previous implementation allocated 5+ arrays
  // and an object per sample on every call, all garbage at frame end.
  // Pre-allocated typed/native arrays sized for the SAMPLE_BUFFER_MAX
  // upper bound let the regression run zero-allocation. We track a
  // `_n` field per buffer instead of mutating .length so V8 can keep the
  // array hidden-class stable across frames.
  const tBuf = new Float64Array(SAMPLE_BUFFER_MAX);
  const yLatBuf = new Float64Array(SAMPLE_BUFFER_MAX);
  const yLonBuf = new Float64Array(SAMPLE_BUFFER_MAX);
  const pairTBuf = new Float64Array(SAMPLE_BUFFER_MAX);
  const pairHBuf = new Float64Array(SAMPLE_BUFFER_MAX);
  const unwrapBuf = new Float64Array(SAMPLE_BUFFER_MAX);
  /** Logical length within `selectWindow` / `compute*` scratch buffers. */
  let windowN = 0;
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

  /**
   * Pick the regression window adaptively: prefer 5 s, but extend up to
   * 10 s if not enough samples landed in the shorter window. Writes the
   * selected sample tail into `tBuf` / `yLatBuf` / `yLonBuf` and updates
   * `windowN`. No heap allocation.
   */
  function selectWindow(now: number): void {
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
    const n = samples.length - from;
    windowN = n;
    for (let i = 0; i < n; i++) {
      const s = samples[from + i];
      tBuf[i] = s.t;
      yLatBuf[i] = s.lat;
      yLonBuf[i] = s.lon;
    }
  }

  // Reused result objects so `query()` itself doesn't allocate.
  const velOut = { vLatPerSec: 0, vLonPerSec: 0 };
  const angOut: { headingDeg: number | null; angVelDegPerSec: number } = {
    headingDeg: null,
    angVelDegPerSec: 0,
  };

  /**
   * Linear velocity from least-squares regression on (t, lat) and (t, lon).
   * Falls back to the last-two-sample chord if there aren't enough samples
   * for a stable fit. Reads from the scratch buffers populated by
   * `selectWindow`. Mutates and returns `velOut`.
   */
  function computeVelocity(): { vLatPerSec: number; vLonPerSec: number } {
    const n = windowN;
    if (n < 2) {
      velOut.vLatPerSec = 0;
      velOut.vLonPerSec = 0;
      return velOut;
    }
    if (n < MIN_REGRESSION_SAMPLES) {
      const dt = (tBuf[n - 1] - tBuf[0]) / 1000;
      if (dt <= 0) {
        velOut.vLatPerSec = 0;
        velOut.vLonPerSec = 0;
      } else {
        velOut.vLatPerSec = (yLatBuf[n - 1] - yLatBuf[0]) / dt;
        velOut.vLonPerSec = (yLonBuf[n - 1] - yLonBuf[0]) / dt;
      }
      return velOut;
    }
    const vLatPerMs = regressSlopePerMs(tBuf, yLatBuf, n);
    const vLonPerMs = regressSlopePerMs(tBuf, yLonBuf, n);
    velOut.vLatPerSec = vLatPerMs * 1000;
    velOut.vLonPerSec = vLonPerMs * 1000;
    return velOut;
  }

  /**
   * Heading + angular velocity from the same window.
   *
   * For each consecutive sample pair (a, b) we get an instantaneous bearing
   * (a → b) tagged at the midpoint timestamp. Pairs whose chord-speed is
   * below the heading floor are skipped (sensor noise dominates direction
   * for stationary blobs). The remaining pair-bearings are unwrapped (so a
   * slow turn through 0/360 doesn't read as a 360°/s spin) and least-squares
   * regressed against time → angular velocity in deg/s.
   *
   * Heading itself is the newest pair-bearing, so it tracks the current
   * direction of travel rather than a window-averaged direction (which would
   * lag too much during turns).
   */
  function computeAngular(): { headingDeg: number | null; angVelDegPerSec: number } {
    const n = windowN;
    if (n < 2) {
      angOut.headingDeg = null;
      angOut.angVelDegPerSec = 0;
      return angOut;
    }

    // Pair-wise bearings + chord-speed filter, written into the
    // pre-allocated `pairTBuf` / `pairHBuf` (no array push).
    let pairCount = 0;
    for (let i = 1; i < n; i++) {
      const dt = (tBuf[i] - tBuf[i - 1]) / 1000;
      if (dt <= 0) continue;
      const speed = approxDistanceM(yLatBuf[i - 1], yLonBuf[i - 1], yLatBuf[i], yLonBuf[i]) / dt;
      if (speed < HEADING_FROM_VEL_MIN_M_PER_S) continue;
      pairTBuf[pairCount] = (tBuf[i - 1] + tBuf[i]) / 2;
      pairHBuf[pairCount] = bearingDeg(yLatBuf[i - 1], yLonBuf[i - 1], yLatBuf[i], yLonBuf[i]);
      pairCount++;
    }
    if (pairCount === 0) {
      angOut.headingDeg = null;
      angOut.angVelDegPerSec = 0;
      return angOut;
    }

    const latestHeading = pairHBuf[pairCount - 1];

    if (pairCount < MIN_REGRESSION_SAMPLES) {
      angOut.headingDeg = latestHeading;
      angOut.angVelDegPerSec = 0;
      return angOut;
    }

    // Unwrap into the pre-allocated `unwrapBuf`.
    unwrapBuf[0] = pairHBuf[0];
    for (let i = 1; i < pairCount; i++) {
      const delta = shortestArcDeg(pairHBuf[i - 1], pairHBuf[i]);
      unwrapBuf[i] = unwrapBuf[i - 1] + delta;
    }
    const omegaPerMs = regressSlopePerMs(pairTBuf, unwrapBuf, pairCount);

    angOut.headingDeg = latestHeading;
    angOut.angVelDegPerSec = omegaPerMs * 1000;
    return angOut;
  }

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
      // throw away the buffer (history is now meaningless). Clear the freeze
      // latch so the next `query` exits the held state.
      samples.length = 0;
      samples.push({ lat, lon, t });
      displayLat = lat;
      displayLon = lon;
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

    // Evict samples older than the regression window's max (10 s by default)
    // so the buffer doesn't grow unboundedly on long-lived tracks.
    const evictBefore = t - VELOCITY_WINDOW_MAX_MS;
    while (samples.length > 0 && samples[0].t < evictBefore) samples.shift();

    // Hard cap as a memory guard for very high sample-rate feeds.
    while (samples.length > SAMPLE_BUFFER_MAX) samples.shift();

    // A fresh sample always thaws the freeze latch — we're getting data again.
    frozen = false;
  };

  const query = (now: number): MotionQuery => {
    if (!initialised) {
      return snapshot;
    }

    selectWindow(now);
    const { vLatPerSec, vLonPerSec } = computeVelocity();
    const { headingDeg: instHeading, angVelDegPerSec } = computeAngular();

    const newest = samples[samples.length - 1];
    const ageMs = now - newest.t;

    // ── Target position ───────────────────────────────────────────────────
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
      // Predict forward along the smoothed velocity vector. The window is
      // 5-10 s of recent samples so the slope is stable against per-sample
      // noise but still tracks turns within a couple of seconds.
      const dtSec = ageMs / 1000;
      targetLat = newest.lat + vLatPerSec * dtSec;
      targetLon = newest.lon + vLonPerSec * dtSec;
    } else {
      // Too stale — latch frozen at the current displayed position.
      frozen = true;
      targetLat = displayLat;
      targetLon = displayLon;
    }

    // ── Target heading ────────────────────────────────────────────────────
    // Use the windowed instantaneous heading; extrapolate forward by the
    // smoothed angular velocity so a turning track keeps turning visually
    // even after the last sample arrived. If the chord-speed filter killed
    // every pair (stationary or near-stationary), keep the previous
    // displayed heading rather than introducing a null.
    let targetHeading: number | null = instHeading ?? displayHeadingDeg;
    if (
      instHeading != null &&
      ageMs > EXTRAP_AFTER_MS &&
      ageMs <= STALE_AT_MS
    ) {
      const dtSec = ageMs / 1000;
      targetHeading = ((instHeading + angVelDegPerSec * dtSec) % 360 + 360) % 360;
    }

    // ── Display smoothing ─────────────────────────────────────────────────
    // Exponential easing toward the target. `factor = 1 - exp(-dt/τ)` gives
    // critically-damped-feeling motion regardless of frame rate.
    const dtMs = Math.max(0, now - lastQueryAt);
    const factor = 1 - Math.exp(-dtMs / SMOOTH_TAU_MS);
    displayLat += (targetLat - displayLat) * factor;
    displayLon += (targetLon - displayLon) * factor;

    if (targetHeading != null) {
      if (displayHeadingDeg == null) {
        displayHeadingDeg = targetHeading;
      } else {
        // Shortest-arc lerp so the marker doesn't spin the long way around
        // when heading crosses 0/360.
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

  return { pushSample, query, peek };
}

// Re-export the shortest-arc helper for callers that want to smooth heading
// themselves at React-level cadence without re-implementing the math.
export { shortestArcDeg };
