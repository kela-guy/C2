/**
 * useClosedTrackRecorder — observes the live `Detection[]` and
 * appends every closure to the history store as a `HistoricalTrack`.
 *
 * "Closure" is defined by the same predicate the target panel uses
 * to bucket completed rows: `isCompletedActivityStatus` returning
 * true (`mitigated`, `dismissed`, or `timeout`). The close-out
 * flows in `useEffectorWorkflow` and the dismiss path don't splice
 * the target out of `tactical.targets` — they only flip status
 * fields and let the UI move them to a "completed" bucket — so
 * status-transition detection is the only reliable signal.
 *
 * The recorder keeps a set of already-recorded ids to guarantee
 * one HistoricalTrack per target, even if React re-runs the effect
 * with the same closed state on subsequent renders.
 *
 * Trail timestamps on live targets are display strings (Hebrew
 * locale time), not parseable epochs, so the recorder distributes
 * the breadcrumbs evenly across `[startedAt, endedAt]` to derive
 * `tMs`. Phase 2 (real backend) will hand us a trail with epoch
 * timestamps and the spreader becomes unnecessary.
 */

import { useEffect, useRef } from "react";
import type { Detection } from "@/imports/ListOfSystems";
import { bearingDegrees } from "@/app/lib/mapGeo";
import {
  getActivityStatus,
  isCompletedActivityStatus,
} from "@/imports/useActivityStatus";
import type {
  HistoricalActionLogEntry,
  HistoricalTrack,
  KillReason,
  SensorDetection,
  TrackClassification,
  TrackSnapshot,
} from "@/app/components/track-history/types";
import type { Affiliation } from "@/primitives/markerStyles";

interface RecorderOptions {
  liveTargets: Detection[];
  appendClosed: (track: HistoricalTrack) => void;
}

const FALLBACK_AFFILIATION: Affiliation = "hostile";

export function useClosedTrackRecorder({
  liveTargets,
  appendClosed,
}: RecorderOptions): void {
  const recordedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const now = Date.now();
    for (const target of liveTargets) {
      if (recordedIdsRef.current.has(target.id)) continue;
      const status = getActivityStatus(target, now);
      if (!isTerminalForHistory(target, status)) continue;
      const track = freezeDetection(target, now);
      if (!track) continue;
      recordedIdsRef.current.add(target.id);
      appendClosed(track);
    }
  }, [liveTargets, appendClosed]);
}

/**
 * Convert the last seen `Detection` into a frozen `HistoricalTrack`.
 * Returns null when the target lacks the minimum data needed (no
 * trail or no createdAtMs) — the seed handles the "always-present"
 * affordance, so dropping a thin closure is acceptable.
 */
function freezeDetection(
  detection: Detection,
  closedAtMs: number,
): HistoricalTrack | null {
  const trail = detection.trail;
  if (!trail || trail.length < 2) return null;
  const startedAt = detection.createdAtMs ?? closedAtMs - trail.length * 500;
  const endedAt = closedAtMs;
  const durationMs = Math.max(endedAt - startedAt, 1000);
  const classification = inferClassification(detection);
  const sensors = inferSensors(detection);

  const snapshots: TrackSnapshot[] = trail.map((point, i) => {
    const ratio = i / Math.max(trail.length - 1, 1);
    const tMs = Math.round(ratio * durationMs);
    const next = trail[Math.min(i + 1, trail.length - 1)];
    const heading = bearingDegrees(point.lat, point.lon, next.lat, next.lon);
    return {
      tMs,
      position: { lat: point.lat, lon: point.lon },
      heading,
      speed: 0,
      altitude: parseAltitudeMeters(detection.altitude),
      confidence: clamp01((detection.confidence ?? 0) / 100),
      classification,
      sensors,
    };
  });

  const actionLog: HistoricalActionLogEntry[] = (detection.actionLog ?? []).map(
    (entry, i, arr) => {
      const ratio = arr.length === 1 ? 0 : i / (arr.length - 1);
      return {
        tMs: Math.round(ratio * durationMs),
        label: entry.label,
        pinned: i === arr.length - 1,
      };
    },
  );

  return {
    id: `${detection.id}-r${closedAtMs}`,
    callsign: detection.name || detection.id,
    classification,
    affiliation: FALLBACK_AFFILIATION,
    disposition: "suspect",
    startedAt,
    endedAt,
    durationMs,
    killReason: inferKillReason(detection),
    finalConfidence: clamp01((detection.confidence ?? 0) / 100),
    snapshots,
    actionLog,
    summary: detection.dismissReason || undefined,
  };
}

function inferClassification(d: Detection): TrackClassification {
  switch (d.classifiedType) {
    case "drone":
      return "uav";
    case "aircraft":
      return "aircraft";
    case "car":
      return "ground_vehicle";
    case "bird":
    case "unknown":
    case undefined:
      break;
  }
  switch (d.type) {
    case "uav":
    case "missile":
    case "aircraft":
    case "naval":
    case "ground_vehicle":
      return d.type;
    case "unknown":
      return "unknown";
  }
}

function inferSensors(d: Detection): SensorDetection[] {
  const list = d.contributingSensors ?? [];
  return list.map((s) => ({
    id: s.sensorId,
    typeLabel: s.sensorType,
    distanceMeters: 0,
    confidence: clamp01((d.confidence ?? 0) / 100),
    firstDetectedAtMs: 0,
  }));
}

function inferKillReason(d: Detection): KillReason {
  if (d.mitigationStatus === "mitigated") return "mitigated";
  if (d.activityStatus === "timeout") return "timeout";
  if (d.activityStatus === "dismissed") return "dropped";
  return "no_more_detections";
}

function isTerminalForHistory(
  target: Detection,
  activityStatus: ReturnType<typeof getActivityStatus>,
): boolean {
  if (isCompletedActivityStatus(activityStatus)) return true;
  if (target.mitigationStatus === "mitigated") return true;
  return false;
}

function parseAltitudeMeters(label: string | undefined): number {
  if (!label) return 0;
  const m = label.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
