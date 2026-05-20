/**
 * Render-time projection that translates `viewedAtMs` into a
 * `Detection[]` the existing `ListOfSystems` and `CesiumTacticalMap`
 * can consume without branching.
 *
 * Live mode (`viewedAtMs ≈ now`) returns the live array reference
 * unchanged so live rendering pays zero overhead. Historical mode
 * samples each closed `HistoricalTrack` overlapping `viewedAtMs` and
 * emits a synthetic `Detection` shaped exactly like a real one.
 *
 * Live targets that are still in flight are not back-projected:
 * their breadcrumb timestamps are display strings (Hebrew locale
 * time), not parseable epochs, and a "live entity at past time"
 * doesn't have a frozen state to render anyway. They reappear when
 * the operator returns the scrubber to "now".
 */

import type {
  ContributingSensor,
  Detection,
  DetectionType,
  TrailPoint,
} from "@/imports/ListOfSystems";
import { sampleAt, type HistoricalTrack, type TrackClassification } from "./types";
import { sensorPosition } from "@/app/components/tacticalAssetIndex";

/**
 * Liveness threshold (epsilon, ms) used to short-circuit the
 * projection when `viewedAtMs` is effectively "now". Matches the
 * value in `ViewedAtContext` so the two stay in step.
 */
const LIVE_EPSILON_MS = 250;

/**
 * Sample a historical track at `viewedAtMs` (epoch). Returns null
 * when the scrubber sits *before* the track starts — the operator
 * shouldn't see a marker for a drone that hasn't appeared yet.
 *
 * After the track ends we keep emitting the final frame (sample
 * clamped to `endedAt`). That way the bright trail + hostile marker
 * stay put once playback or a manual scrub leaves the window,
 * pairing cleanly with the dim full-path overlay rendered behind it.
 *
 * Trail polyline mirrors the live convention: every snapshot up to
 * (and including) the sampled time becomes a `TrailPoint`. The
 * result is a `Detection` shaped exactly like a live one — same
 * fields, same string formats — so downstream consumers don't
 * branch on origin.
 */
export function historicalTrackToDetection(
  track: HistoricalTrack,
  viewedAtMs: number,
): Detection | null {
  if (viewedAtMs < track.startedAt) return null;
  const sampleAtMs = Math.min(track.endedAt, viewedAtMs);
  const tMs = sampleAtMs - track.startedAt;
  const snap = sampleAt(track, tMs);

  const trail: TrailPoint[] = [];
  for (const s of track.snapshots) {
    if (s.tMs > tMs) break;
    trail.push({
      lat: s.position.lat,
      lon: s.position.lon,
      timestamp: formatLocaleHHMMSS(track.startedAt + s.tMs),
    });
  }
  const last = trail[trail.length - 1];
  const headMatchesLast =
    last != null &&
    Math.abs(last.lat - snap.position.lat) < 1e-6 &&
    Math.abs(last.lon - snap.position.lon) < 1e-6;
  if (!headMatchesLast) {
    trail.push({
      lat: snap.position.lat,
      lon: snap.position.lon,
      timestamp: formatLocaleHHMMSS(sampleAtMs),
    });
  }

  const actionLog = track.actionLog
    .filter((entry) => entry.tMs <= tMs)
    .map((entry) => ({
      time: formatLocaleHHMMSS(track.startedAt + entry.tMs),
      label: entry.label,
    }));

  const contributingSensors: ContributingSensor[] = snap.sensors.map((s) => ({
    sensorId: s.id,
    sensorType: s.typeLabel,
    firstDetectedAt: formatLocaleHHMMSS(track.startedAt + s.firstDetectedAtMs),
    lastDetectedAt: formatLocaleHHMMSS(sampleAtMs),
  }));

  const detectedBySensors = snap.sensors.map((s) => {
    const pos = sensorPosition(s.id);
    return {
      id: s.id,
      typeLabel: s.typeLabel,
      latitude: pos?.lat ?? snap.position.lat,
      longitude: pos?.lon ?? snap.position.lon,
    };
  });

  const isClosure = sampleAtMs >= track.endedAt - LIVE_EPSILON_MS;
  const mitigationStatus =
    track.killReason === "mitigated" && isClosure ? "mitigated" : "idle";
  const activityStatus = isClosure
    ? track.killReason === "mitigated"
      ? "mitigated"
      : track.killReason === "timeout"
        ? "timeout"
        : "dismissed"
    : "active";

  return {
    id: track.id,
    name: track.callsign,
    type: track.classification as DetectionType,
    status: isClosure ? "event_resolved" : "tracking",
    timestamp: formatLocaleHHMMSS(sampleAtMs),
    createdAtMs: track.startedAt,
    coordinates: `${snap.position.lat.toFixed(5)}, ${snap.position.lon.toFixed(5)}`,
    distance: `${(estimateDistanceKm(snap.position.lat, snap.position.lon)).toFixed(2)} km`,
    confidence: Math.round(snap.confidence * 100),
    classifiedType: classificationToClassified(snap.classification),
    entityStage: "classified",
    trail,
    contributingSensors,
    detectedBySensors,
    actionLog,
    mitigationStatus,
    activityStatus,
    altitude: `${Math.round(snap.altitude)} m`,
    priority: 1,
  };
}

/**
 * Final projection. Live mode returns the live array unchanged;
 * historical mode emits whatever closed tracks have started by
 * `viewedAtMs` — projection clamps to `endedAt` so the final
 * frame stays put once the scrubber leaves the window.
 */
export function unionAtTime(
  liveTargets: Detection[],
  closedTracks: HistoricalTrack[],
  viewedAtMs: number,
  isLive: boolean,
): Detection[] {
  if (isLive) return liveTargets;
  const out: Detection[] = [];
  for (const track of closedTracks) {
    const projected = historicalTrackToDetection(track, viewedAtMs);
    if (projected) out.push(projected);
  }
  return out;
}

const HE_TIME_FORMATTER = new Intl.DateTimeFormat("he-IL", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatLocaleHHMMSS(epochMs: number): string {
  return HE_TIME_FORMATTER.format(new Date(epochMs));
}

function classificationToClassified(
  cls: TrackClassification,
): Detection["classifiedType"] {
  switch (cls) {
    case "uav":
      return "drone";
    case "aircraft":
      return "aircraft";
    case "ground_vehicle":
      return "car";
    case "missile":
    case "naval":
    case "unknown":
      return "unknown";
  }
}

const REFERENCE_LAT = 32.4506;
const REFERENCE_LON = 34.9813;

/**
 * Cheap planar approximation, enough for the panel's slant-range
 * read-out. Actual map distances are computed by Cesium from the
 * marker geometry.
 */
function estimateDistanceKm(lat: number, lon: number): number {
  const dLat = (lat - REFERENCE_LAT) * 111.32;
  const dLon =
    (lon - REFERENCE_LON) *
    111.32 *
    Math.cos((REFERENCE_LAT * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}
