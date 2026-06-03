/**
 * useDemoDirector — scripts the hands-free `/demo` flows.
 *
 * Sequences spawn → engagement → post-neutralize across a timeline by
 * driving the existing `useTacticalTargets` + `useEffectorWorkflow`
 * handlers; it owns no simulation of its own. Demo-only: mounted only
 * when the dashboard runs in `demoMode`.
 *
 * Each public runner is self-contained and re-runnable; `reset` clears
 * the board and every pending step so a presenter can restart cleanly.
 */

import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import type { EffectorWorkflowApi } from "./useEffectorWorkflow";
import type { TacticalTargetsApi } from "./useTacticalTargets";
import type { RegulusEffector } from "@/imports/ListOfSystems";

interface LatLon {
  lat: number;
  lon: number;
}

interface SimTimerLike {
  current: { cancel: () => void } | null;
}

interface UseDemoDirectorProps {
  tactical: TacticalTargetsApi;
  effectors: EffectorWorkflowApi;
  onActivateTarget: (id: string | null) => void;
  openTargetsPanel: () => void;
}

export interface DemoDirectorApi {
  runHostileCycle: () => void;
  runThreeDrones: () => void;
  runJammerFailsGotcha: () => void;
  /**
   * Jam handler for the card's Jam CTA. For a drone rigged by
   * `runJammerFailsGotcha` the attempt fails (and the Gotcha net is
   * then recommended); every other drone jams normally.
   */
  mitigate: (targetId: string, effectorId: string) => void;
  /** Operator-driven net throw: video + in-flight beat, then capture. */
  throwNet: (targetId: string, gotchaId: string) => void;
  reset: () => void;
}

const FIELD_CENTER: LatLon = { lat: 32.4666, lon: 35.0013 };

// Demo drones crawl in over ~72s (3× the 24s production cadence) so the
// approach reads clearly during a live walkthrough.
const DEMO_APPROACH_MS = 72_000;

// Staggered north-east approach corridor — the arc the Gotcha sites
// in `demoAssets.ts` cover.
const APPROACH_STARTS: LatLon[] = [
  { lat: 32.4916, lon: 35.0313 },
  { lat: 32.4976, lon: 35.0193 },
  { lat: 32.4856, lon: 35.0403 },
];

function dist2(a: LatLon, b: LatLon): number {
  return (a.lat - b.lat) ** 2 + (a.lon - b.lon) ** 2;
}

function nearestAvailable<T extends { lat: number; lon: number; status: string }>(
  from: LatLon,
  assets: T[],
): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const a of assets) {
    if (a.status !== "available") continue;
    const d = dist2(from, { lat: a.lat, lon: a.lon });
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

export function useDemoDirector({
  tactical,
  effectors,
  onActivateTarget,
  openTargetsPanel,
}: UseDemoDirectorProps): DemoDirectorApi {
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  // Spawn intervals the director owns directly (one per scripted drone).
  const spawnRefsRef = useRef<SimTimerLike[]>([]);
  // Drones whose Jam attempt is rigged to fail (jammer-fails scenario).
  const failJamIdsRef = useRef<Set<string>>(new Set());

  // Latest regulus list, so the jam-fail step scheduled earlier reads
  // fresh state when it picks the nearest jammer.
  const regulusRef = useRef<RegulusEffector[]>(effectors.regulusEffectors);
  useEffect(() => {
    regulusRef.current = effectors.regulusEffectors;
  }, [effectors.regulusEffectors]);

  useEffect(() => {
    const timers = timersRef;
    return () => {
      for (const id of timers.current) clearTimeout(id);
      timers.current.clear();
    };
  }, []);

  const after = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
  }, []);

  const spawnDrone = useCallback(
    (start: LatLon): string => {
      const ref: SimTimerLike = { current: null };
      spawnRefsRef.current.push(ref);
      return tactical.spawnCuasTarget({
        startLat: start.lat,
        startLon: start.lon,
        endLat: FIELD_CENTER.lat,
        endLon: FIELD_CENTER.lon,
        nameSuffix: String(Math.floor(Math.random() * 900) + 100),
        intervalRef: ref as MutableRefObject<{ cancel: () => void } | null>,
        // Slower, more presentable approach for the demo (vs the 24s
        // production cadence).
        approachTotalMs: DEMO_APPROACH_MS,
      });
    },
    [tactical],
  );

  // Spawn → jam (nearest Regulus) → drone breaks off and drifts away.
  const scheduleJamCycle = useCallback(
    (start: LatLon, baseMs: number, activate: boolean) => {
      after(baseMs, () => {
        const id = spawnDrone(start);
        if (activate) {
          openTargetsPanel();
          onActivateTarget(id);
        }
        after(8000, () => {
          const jammer = nearestAvailable(start, regulusRef.current);
          if (jammer) effectors.handleMitigate(id, jammer.id);
        });
        after(11800, () => tactical.flyTargetAway(id));
      });
    },
    [after, spawnDrone, openTargetsPanel, onActivateTarget, effectors, tactical],
  );

  const runHostileCycle = useCallback(() => {
    scheduleJamCycle(APPROACH_STARTS[0], 0, true);
  }, [scheduleJamCycle]);

  const runThreeDrones = useCallback(() => {
    openTargetsPanel();
    APPROACH_STARTS.forEach((start, i) => {
      scheduleJamCycle(start, i * 2500, i === 0);
    });
  }, [scheduleJamCycle, openTargetsPanel]);

  // Operator-driven net throw: the card video + "throwing" beat run
  // immediately; the drone keeps drifting for the throw duration, then
  // halts and is marked captured on the map (matching the effector's
  // 3s mitigate transition).
  const throwNet = useCallback(
    (targetId: string, gotchaId: string) => {
      effectors.handleThrowNet(targetId, gotchaId);
      after(3000, () => tactical.markCaptured(targetId));
    },
    [after, effectors, tactical],
  );

  // Routes the card's Jam click: rigged drones fail (then recommend the
  // Gotcha net), everything else jams normally.
  const mitigate = useCallback(
    (targetId: string, effectorId: string) => {
      if (failJamIdsRef.current.has(targetId)) {
        effectors.handleMitigateFail(targetId, effectorId);
      } else {
        effectors.handleMitigate(targetId, effectorId);
      }
    },
    [effectors],
  );

  // Spawn a drone whose jam is rigged to fail, then hand control to the
  // operator: the card opens on the Jam CTA, the click fails, and the
  // recommended Gotcha net (→ `throwNet`) finishes the capture.
  const runJammerFailsGotcha = useCallback(() => {
    const start = APPROACH_STARTS[0];
    const id = spawnDrone(start);
    failJamIdsRef.current.add(id);
    openTargetsPanel();
    onActivateTarget(id);
  }, [spawnDrone, openTargetsPanel, onActivateTarget]);

  const reset = useCallback(() => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current.clear();
    for (const ref of spawnRefsRef.current) ref.current?.cancel();
    spawnRefsRef.current = [];
    failJamIdsRef.current.clear();
    tactical.resetScenarioTimers();
    tactical.setTargets([]);
    effectors.setRegulusEffectors((prev) =>
      prev.map((r) => ({ ...r, status: "available" as const, activeTargetId: undefined })),
    );
    effectors.setGotchaEffectors((prev) =>
      prev.map((g) => ({ ...g, status: "available" as const, activeTargetId: undefined })),
    );
    onActivateTarget(null);
  }, [tactical, effectors, onActivateTarget]);

  return {
    runHostileCycle,
    runThreeDrones,
    runJammerFailsGotcha,
    mitigate,
    throwNet,
    reset,
  };
}
