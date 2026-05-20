/**
 * Track History data model.
 *
 * A `HistoricalTrack` is the post-mortem record of a target — the
 * complete state machine from first detection through to a kill
 * reason. It is intentionally NOT a {@link Detection}: the live
 * panel deals in mutable in-flight state, this one in a frozen
 * timeline that can be scrubbed.
 *
 * A track owns a single `snapshots[]` array sorted by `tMs`
 * (relative to `startedAt`). Sampling at any wall-clock millisecond
 * within `[0, durationMs]` resolves a `TrackSnapshot` via binary
 * search + linear interp on continuous fields (position, heading,
 * speed, altitude). Discrete fields (sensor list, action log,
 * classification, confidence) are evaluated as step functions —
 * the value at time t is the most recent snapshot's value.
 *
 * Phase-1 ships fixtures only; the shape is API-ready so the
 * eventual `/api/tracks/{id}` endpoint can hand a track to the
 * playback engine unchanged.
 */

import type { Affiliation } from '@/primitives/markerStyles';
import type { DispositionKey } from '@/app/components/tracks/dispositions';

/**
 * Why a track stopped getting updates. Maps 1:1 to a color token in
 * `--accent-*` so the row stripe, kill-reason badge, and trail-head
 * marker share visual language with the rest of the app.
 *
 * - `mitigated`: operator/effector neutralized the threat. Maps to
 *   `--accent-success`.
 * - `dropped`: track classification fell below the live-panel
 *   confidence floor and was retired. Maps to `--accent-warning`.
 * - `no_more_detections`: sensors stopped seeing the target before
 *   any action was taken (lost). Maps to `--accent-danger`.
 * - `timeout`: track aged past the retention window without a fresh
 *   snapshot. Maps to `--slate-9` (neutral / inactive).
 */
export type KillReason =
  | 'mitigated'
  | 'dropped'
  | 'no_more_detections'
  | 'timeout';

/**
 * Same six classes the live `Detection` model uses. Duplicated as
 * a string-literal union here so this module doesn't have to depend
 * on `@/imports/ListOfSystems` and so a future API consumer can
 * type-check against this file standalone.
 */
export type TrackClassification =
  | 'uav'
  | 'missile'
  | 'aircraft'
  | 'naval'
  | 'ground_vehicle'
  | 'unknown';

/**
 * Sensor detection sample inside a snapshot. Mirrors the shape of
 * a `CardSensor` with an explicit `confidence` so the time-aware
 * card can fade rows that were uncertain at that moment.
 */
export interface SensorDetection {
  id: string;
  typeLabel: string;
  /** Slant-range distance in meters at the snapshot time. */
  distanceMeters: number;
  /** [0, 1]. Lower = uncertain detection at this moment. */
  confidence: number;
  /**
   * ms relative to `track.startedAt` — when this sensor first locked
   * onto the track. Mirrors `tMs` so consumers convert with
   * `track.startedAt + s.firstDetectedAtMs`. PRD: "sensors that
   * detected the target + first detection time per sensor".
   */
  firstDetectedAtMs: number;
}

/**
 * Coarse taxonomy for action-log moments. Drives the scrubber
 * tooltip's eyebrow icon + label so the operator can read a pinned
 * dot's purpose without parsing the freeform `label`.
 *
 * - `detection`: first/regained sensor lock, signal-loss recovery.
 * - `classification`: type promoted, demoted, or refined.
 * - `engagement`: mitigation requested, weapon engaged, jammer on.
 * - `outcome`: terminal beat — mitigated, lost, dismissed, timed out.
 *
 * Optional — entries without a kind are treated as `detection` at
 * the render site so legacy fixtures keep working.
 */
export type ActionLogKind =
  | 'detection'
  | 'classification'
  | 'engagement'
  | 'outcome';

export interface HistoricalActionLogEntry {
  /** Wall-clock ms since `track.startedAt`. */
  tMs: number;
  /** "Engagement", "Reclassified", "Kelas mitigated" — short label. */
  label: string;
  /**
   * Whether this entry should pin a waypoint dot on the scrubber.
   * Reserved for high-signal beats (engagements, kills, classification
   * flips). Routine "still tracking" pings should leave this `false`
   * to keep the scrubber readable.
   */
  pinned?: boolean;
  /**
   * Taxonomy bucket used by the scrubber tooltip. Optional — see
   * {@link ActionLogKind} for the fallback behaviour.
   */
  kind?: ActionLogKind;
}

export interface TrackSnapshot {
  /** ms relative to `track.startedAt`. Strictly increasing within snapshots[]. */
  tMs: number;
  position: { lat: number; lon: number };
  /** Degrees from North (0=N, 90=E, ...). */
  heading: number;
  /** Meters/second. */
  speed: number;
  /** Meters above sea level. */
  altitude: number;
  /** [0, 1]. Step function — holds until next snapshot. */
  confidence: number;
  classification: TrackClassification;
  /**
   * Active sensors at this moment. Step function — the wrapper
   * components reuse the most recent snapshot's value rather than
   * interpolating.
   */
  sensors: SensorDetection[];
}

export interface HistoricalTrack {
  id: string;
  /** Operator-facing track callsign — "T-014", "K-203". */
  callsign: string;
  classification: TrackClassification;
  affiliation: Affiliation;
  disposition: DispositionKey;
  /** Wall-clock ms (epoch). */
  startedAt: number;
  /** Wall-clock ms (epoch). `endedAt - startedAt === durationMs`. */
  endedAt: number;
  /** Convenience: `endedAt - startedAt`. Duplicated so consumers don't
   * have to recompute it on every render. */
  durationMs: number;
  killReason: KillReason;
  /**
   * Final operator confidence at `endedAt`. The detail card surfaces
   * this in the closure ribbon; the row uses it for the inline
   * confidence chip.
   */
  finalConfidence: number;
  /** Sorted ascending by `tMs`. First snapshot has `tMs === 0`. */
  snapshots: TrackSnapshot[];
  /** Sorted ascending by `tMs`. */
  actionLog: HistoricalActionLogEntry[];
  /**
   * Optional one-line synopsis displayed under the title in the
   * detail card. Free text; designers should keep it under ~80
   * chars. `undefined` is fine — the card stays compact.
   */
  summary?: string;
}

/**
 * Bounding box used by the 2D history map to project lat/lon to
 * pixels. Each track carries its own bbox so the chart auto-frames
 * the entire trail with consistent padding regardless of which
 * track is selected.
 */
export interface TrackBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/** Compute the lat/lon bounding box of every snapshot in a track. */
export function trackBounds(track: HistoricalTrack): TrackBounds {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const s of track.snapshots) {
    if (s.position.lat < minLat) minLat = s.position.lat;
    if (s.position.lat > maxLat) maxLat = s.position.lat;
    if (s.position.lon < minLon) minLon = s.position.lon;
    if (s.position.lon > maxLon) maxLon = s.position.lon;
  }
  return { minLat, maxLat, minLon, maxLon };
}

/**
 * Sample a track at relative time `tMs`, clamped to `[0, durationMs]`.
 *
 * Continuous fields (position, heading, speed, altitude) interpolate
 * linearly between bracketing snapshots. Heading wraps the short way
 * around the 360° circle so a track flying north-east through 0°
 * doesn't visibly snap from 359° to 1° via the long route.
 *
 * Discrete fields (`confidence`, `classification`, `sensors`) hold
 * the value of the most recent snapshot — they are step functions,
 * not interpolated.
 *
 * Worst-case O(log n) thanks to the binary search; `n` is the
 * snapshot count (≤ a few hundred per track in fixtures).
 */
export function sampleAt(
  track: HistoricalTrack,
  tMs: number,
): TrackSnapshot {
  const snapshots = track.snapshots;
  const clamped = Math.max(0, Math.min(track.durationMs, tMs));
  if (snapshots.length === 1) return snapshots[0];
  if (clamped <= snapshots[0].tMs) return snapshots[0];
  const last = snapshots[snapshots.length - 1];
  if (clamped >= last.tMs) return last;

  let lo = 0;
  let hi = snapshots.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (snapshots[mid].tMs <= clamped) lo = mid;
    else hi = mid;
  }
  const a = snapshots[lo];
  const b = snapshots[hi];
  const span = b.tMs - a.tMs;
  const ratio = span > 0 ? (clamped - a.tMs) / span : 0;
  return {
    tMs: clamped,
    position: {
      lat: a.position.lat + (b.position.lat - a.position.lat) * ratio,
      lon: a.position.lon + (b.position.lon - a.position.lon) * ratio,
    },
    heading: lerpAngle(a.heading, b.heading, ratio),
    speed: a.speed + (b.speed - a.speed) * ratio,
    altitude: a.altitude + (b.altitude - a.altitude) * ratio,
    confidence: a.confidence,
    classification: a.classification,
    sensors: a.sensors,
  };
}

function lerpAngle(a: number, b: number, t: number): number {
  let delta = ((b - a) % 360 + 540) % 360 - 180;
  return (a + delta * t + 360) % 360;
}

/** Highest operator confidence the track ever reached, in [0, 1]. */
export function peakConfidence(track: HistoricalTrack): number {
  let peak = 0;
  for (const s of track.snapshots) {
    if (s.confidence > peak) peak = s.confidence;
  }
  return peak;
}

/** First snapshot — guaranteed to exist (snapshots is non-empty by construction). */
export function firstSnapshot(track: HistoricalTrack): TrackSnapshot {
  return track.snapshots[0];
}

/** Last snapshot — guaranteed to exist (snapshots is non-empty by construction). */
export function lastSnapshot(track: HistoricalTrack): TrackSnapshot {
  return track.snapshots[track.snapshots.length - 1];
}
