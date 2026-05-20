/**
 * Seed historical-track fixture. Just one track, but rich — full
 * sensor mix, smooth confidence ramp, pinned action-log waypoints —
 * so the History tab is never empty out of the box and the operator
 * always has something to scrub. Recorded closures from the live
 * sim accumulate alongside this seed in `useHistoryStore`.
 *
 * Coordinates sit inside the same Mediterranean coastal AOI used by
 * the live target sim so the seeded playback visually overlaps the
 * tactical map.
 */

import type {
  HistoricalActionLogEntry,
  HistoricalTrack,
  KillReason,
  SensorDetection,
  TrackClassification,
  TrackSnapshot,
} from "./types";
import type { Affiliation } from "@/primitives/markerStyles";
import type { DispositionKey } from "@/app/components/tracks/dispositions";

interface PathPoint {
  lat: number;
  lon: number;
  /** Meters above sea level. */
  alt: number;
  /** Meters/second. */
  speed: number;
}

interface TrackSpec {
  id: string;
  callsign: string;
  classification: TrackClassification;
  affiliation: Affiliation;
  disposition: DispositionKey;
  killReason: KillReason;
  finalConfidence: number;
  /** How far in the past the seed should appear, in minutes. */
  startedMinutesAgo: number;
  durationMs: number;
  path: PathPoint[];
  /** Default sensors visible across the entire track. */
  sensors: SensorBase[];
  /**
   * Time-keyed sensor overrides. Keys are progress ratios `[0, 1]`;
   * the snapshot at or after that ratio adopts the new sensor list.
   */
  sensorChanges?: Array<{ at: number; sensors: SensorBase[] }>;
  confidenceCurve?: Array<{ at: number; value: number }>;
  actionLog: Array<Omit<HistoricalActionLogEntry, "tMs"> & { at: number }>;
  summary?: string;
}

/**
 * Bare sensor specs, less the `firstDetectedAtMs` field — that one
 * is computed in {@link snapshotsFromSpec} based on the first
 * snapshot ratio at which the sensor first appears (seed sensor
 * list, or one of the `sensorChanges` activations).
 */
type SensorBase = Omit<SensorDetection, "firstDetectedAtMs">;

const SENSORS: Record<string, SensorBase> = {
  radarN: {
    id: "SENS-NVT-MAGOS-N",
    typeLabel: "Radar — North",
    distanceMeters: 4200,
    confidence: 0.88,
  },
  rfA: {
    id: "RAD-NVT-RADA",
    typeLabel: "RF spectrum",
    distanceMeters: 1900,
    confidence: 0.74,
  },
  eoNorth: {
    id: "CAM-NVT-PTZ-N",
    typeLabel: "EO/IR camera",
    distanceMeters: 1450,
    confidence: 0.87,
  },
  acoustic: {
    // No acoustic asset is deployed yet — id stays abstract so the time machine
    // falls back to the target's position (co-located ray, effectively hidden).
    id: "ACS-1",
    typeLabel: "Acoustic",
    distanceMeters: 800,
    confidence: 0.55,
  },
};

const SEED_SPEC: TrackSpec = {
  id: "TH-SEED-014",
  callsign: "T-014",
  classification: "uav",
  affiliation: "hostile",
  disposition: "suspect",
  killReason: "mitigated",
  finalConfidence: 0.96,
  startedMinutesAgo: 18,
  durationMs: 7 * 60 * 1000 + 22 * 1000,
  path: [
    { lat: 32.4830, lon: 35.0260, alt: 220, speed: 24 },
    { lat: 32.4805, lon: 35.0205, alt: 215, speed: 26 },
    { lat: 32.4770, lon: 35.0145, alt: 198, speed: 30 },
    { lat: 32.4738, lon: 35.0090, alt: 180, speed: 32 },
    { lat: 32.4702, lon: 35.0050, alt: 165, speed: 32 },
    { lat: 32.4665, lon: 35.0008, alt: 150, speed: 28 },
    { lat: 32.4634, lon: 34.9970, alt: 142, speed: 22 },
  ],
  sensors: [SENSORS.radarN, SENSORS.rfA],
  sensorChanges: [
    { at: 0.45, sensors: [SENSORS.radarN, SENSORS.rfA, SENSORS.eoNorth] },
    {
      at: 0.78,
      sensors: [SENSORS.radarN, SENSORS.rfA, SENSORS.eoNorth, SENSORS.acoustic],
    },
  ],
  confidenceCurve: [
    { at: 0, value: 0.42 },
    { at: 0.35, value: 0.78 },
    { at: 0.7, value: 0.93 },
    { at: 1, value: 0.96 },
  ],
  actionLog: [
    { at: 0, label: "First detection — radar", pinned: true, kind: "detection" },
    { at: 0.35, label: "Classified as UAV", kind: "classification" },
    {
      at: 0.55,
      label: "Reclassified as quad-rotor",
      pinned: true,
      kind: "classification",
    },
    { at: 0.78, label: "Mitigation requested", kind: "engagement" },
    {
      at: 0.92,
      label: "Mitigation engaged",
      pinned: true,
      kind: "engagement",
    },
    { at: 1, label: "Mitigated", pinned: true, kind: "outcome" },
  ],
  summary:
    "Single-rotor drone inbound from north-east. Mitigated by Kelas-jam.",
};

function snapshotsFromSpec(spec: TrackSpec): TrackSnapshot[] {
  const { path, durationMs, classification } = spec;
  const n = path.length;
  if (n < 2) {
    throw new Error(`Track ${spec.id} needs ≥2 path points`);
  }
  const confidenceCurve =
    spec.confidenceCurve ??
    [
      { at: 0, value: 0.5 },
      { at: 1, value: spec.finalConfidence },
    ];

  const firstDetectedByMs = computeSensorFirstDetected(spec, durationMs);

  return path.map((p, i) => {
    const ratio = i / (n - 1);
    const tMs = Math.round(ratio * durationMs);
    const next = path[Math.min(i + 1, n - 1)];
    const heading = bearingDeg(p.lat, p.lon, next.lat, next.lon);
    const sensors = sensorsAt(spec, ratio).map((s) => ({
      ...s,
      firstDetectedAtMs: firstDetectedByMs.get(s.id) ?? 0,
    }));
    const confidence = sampleCurve(confidenceCurve, ratio);
    return {
      tMs,
      position: { lat: p.lat, lon: p.lon },
      heading,
      speed: p.speed,
      altitude: p.alt,
      confidence,
      classification,
      sensors,
    };
  });
}

function sensorsAt(spec: TrackSpec, ratio: number): SensorBase[] {
  if (!spec.sensorChanges || spec.sensorChanges.length === 0) {
    return spec.sensors;
  }
  let active = spec.sensors;
  for (const change of spec.sensorChanges) {
    if (ratio >= change.at) active = change.sensors;
  }
  return active;
}

/**
 * Walk the seed sensor list (tMs 0) and every `sensorChanges` entry
 * to record the first ratio at which each sensor id appears. The
 * resulting map is what the snapshot loop reads to inject
 * `firstDetectedAtMs` per sensor — so a sensor activated at
 * `ratio = 0.45` reports a first-detection of `0.45 * durationMs`
 * everywhere it shows up.
 */
function computeSensorFirstDetected(
  spec: TrackSpec,
  durationMs: number,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of spec.sensors) out.set(s.id, 0);
  for (const change of spec.sensorChanges ?? []) {
    const tMs = Math.round(change.at * durationMs);
    for (const s of change.sensors) {
      if (!out.has(s.id)) out.set(s.id, tMs);
    }
  }
  return out;
}

function sampleCurve(
  keys: Array<{ at: number; value: number }>,
  ratio: number,
): number {
  if (ratio <= keys[0].at) return keys[0].value;
  if (ratio >= keys[keys.length - 1].at) return keys[keys.length - 1].value;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (ratio >= a.at && ratio <= b.at) {
      const t = (ratio - a.at) / (b.at - a.at);
      return a.value + (b.value - a.value) * t;
    }
  }
  return keys[keys.length - 1].value;
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  return ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
}

function buildTrack(spec: TrackSpec, baselineNow: number): HistoricalTrack {
  const startedAt = baselineNow - spec.startedMinutesAgo * 60 * 1000;
  const endedAt = startedAt + spec.durationMs;
  const snapshots = snapshotsFromSpec(spec);
  const actionLog = spec.actionLog.map((entry) => ({
    tMs: Math.round(entry.at * spec.durationMs),
    label: entry.label,
    pinned: entry.pinned,
  }));
  return {
    id: spec.id,
    callsign: spec.callsign,
    classification: spec.classification,
    affiliation: spec.affiliation,
    disposition: spec.disposition,
    startedAt,
    endedAt,
    durationMs: spec.durationMs,
    killReason: spec.killReason,
    finalConfidence: spec.finalConfidence,
    snapshots,
    actionLog,
    summary: spec.summary,
  };
}

/**
 * Materialize the seed historical track relative to a `baselineNow`
 * epoch ms. Pure — call once per dashboard mount and memoize.
 */
export function buildSeedHistoricalTrack(baselineNow: number): HistoricalTrack {
  return buildTrack(SEED_SPEC, baselineNow);
}
