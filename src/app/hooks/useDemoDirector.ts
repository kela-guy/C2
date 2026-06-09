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
import { resolveNearestAsset, type FlowAsset } from "@/imports/engagementFlows";
import type { EffectorWorkflowApi } from "./useEffectorWorkflow";
import type { TacticalTargetsApi } from "./useTacticalTargets";

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
   * Hands-free twin of `runJammerFailsGotcha`: spawns the rigged drone
   * and auto-advances jam-fail → recommended Gotcha net → capture on a
   * 3-5s-per-phase timeline, no operator clicks.
   */
  runJammerFailsGotchaAuto: () => void;
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

// Demo drones approach over ~48s (2× the 24s production cadence) so the
// approach reads clearly during a live walkthrough without dragging.
const DEMO_APPROACH_MS = 48_000;

// Pause the auto jammer-fails flow holds between scripted actions, so
// each observable phase lands in the 3-5s window.
const AUTO_PHASE_MS = 4000;

// Gotcha net "throwing" hold — long enough for the full capture video to
// play in the card. Mirrors `GOTCHA_NET_THROW_MS` in `useEffectorWorkflow`
// so the map "CAPTURED" halt lands with the card's capture transition.
const NET_THROW_MS = 10_000;

// Staggered north-east approach corridor — the arc the Gotcha sites
// in `demoAssets.ts` cover.
const APPROACH_STARTS: LatLon[] = [
  { lat: 32.4916, lon: 35.0313 },
  { lat: 32.4976, lon: 35.0193 },
  { lat: 32.4856, lon: 35.0403 },
];

// Gotcha capture geometry. The scripted hostile is detected ~550 m out
// NE of GOTCHA-CENTER and glides straight in at a constant ~30 m/s
// (3 m/tick, matching the loiter) so the ingress reads as a steady,
// natural approach that settles ~95 m beside the installation. Linear
// speed + matched loiter keep it from looking like a fast dart that
// brakes on arrival.
const GOTCHA_CAPTURE_SITE: LatLon = { lat: 32.4712, lon: 35.008 };
const GOTCHA_APPROACH_START: LatLon = { lat: 32.4741, lon: 35.0114 };
const GOTCHA_APPROACH_MS = 15_000;
const GOTCHA_ROAM = { radiusM: 180, speedMPerTick: 3 };

// Auto flow: hold the recommended-Gotcha beat (video playing, hostile
// still inbound) until the drone reaches the capture site, then throw the
// net so it lands at close range. Measured from the jam-fail call.
const GOTCHA_AUTO_THROW_DELAY_MS = GOTCHA_APPROACH_MS - AUTO_PHASE_MS + 500;

function pickNearestAvailableId(
  assets: FlowAsset[],
  lat: number,
  lon: number,
): string | null {
  return (
    resolveNearestAsset(lat, lon, assets, (a) => a.status === "available")
      .active?.asset.id ?? null
  );
}

function parseCoords(coord: string | undefined): LatLon | null {
  if (!coord) return null;
  const [lat, lon] = coord.split(",").map((s) => parseFloat(s.trim()));
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
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

  // Live state read inside scheduled steps so the auto flow picks the
  // same nearest assets the map/card resolve at action time.
  const targetsRef = useRef(tactical.targets);
  const regulusRef = useRef(effectors.regulusEffectors);
  const gotchaRef = useRef(effectors.gotchaEffectors);
  targetsRef.current = tactical.targets;
  regulusRef.current = effectors.regulusEffectors;
  gotchaRef.current = effectors.gotchaEffectors;

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
    (
      start: LatLon,
      opts?: {
        end?: LatLon;
        approachMs?: number;
        endJitterM?: number;
        roam?: { radiusM: number; speedMPerTick: number };
      },
    ): string => {
      const ref: SimTimerLike = { current: null };
      spawnRefsRef.current.push(ref);
      const end = opts?.end ?? FIELD_CENTER;
      return tactical.spawnCuasTarget({
        startLat: start.lat,
        startLon: start.lon,
        endLat: end.lat,
        endLon: end.lon,
        nameSuffix: String(Math.floor(Math.random() * 900) + 100),
        intervalRef: ref as MutableRefObject<{ cancel: () => void } | null>,
        // Slower, more presentable approach for the demo (vs the 24s
        // production cadence).
        approachTotalMs: opts?.approachMs ?? DEMO_APPROACH_MS,
        endJitterM: opts?.endJitterM,
        roam: opts?.roam,
      });
    },
    [tactical],
  );

  // The Gotcha flows spawn a hostile that flies straight to the capture
  // site beside the Gotcha and loiters there through the net video.
  const spawnGotchaTarget = useCallback(
    () =>
      spawnDrone(GOTCHA_APPROACH_START, {
        end: GOTCHA_CAPTURE_SITE,
        approachMs: GOTCHA_APPROACH_MS,
        endJitterM: 0,
        bowFraction: 0,
        linearApproach: true,
        roam: GOTCHA_ROAM,
      }),
    [spawnDrone],
  );

  // Spawn the drone and hand control to the operator — the jam (and the
  // resulting drift-off) run from the card's Jam click via `mitigate`,
  // not on a timer.
  const scheduleJamCycle = useCallback(
    (start: LatLon, baseMs: number, activate: boolean) => {
      after(baseMs, () => {
        const id = spawnDrone(start);
        if (activate) {
          openTargetsPanel();
          onActivateTarget(id);
        }
      });
    },
    [after, spawnDrone, openTargetsPanel, onActivateTarget],
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
      after(NET_THROW_MS, () => tactical.markCaptured(targetId));
    },
    [after, effectors, tactical],
  );

  // Routes the card's Jam click: rigged drones fail (then recommend the
  // Gotcha net); everything else jams normally and, once the jam lands
  // (~3s mitigate), the drone halts where it was jammed and greys out.
  const mitigate = useCallback(
    (targetId: string, effectorId: string) => {
      if (failJamIdsRef.current.has(targetId)) {
        effectors.handleMitigateFail(targetId, effectorId);
      } else {
        effectors.handleMitigate(targetId, effectorId);
        after(3800, () => tactical.markJammed(targetId));
      }
    },
    [after, effectors, tactical],
  );

  // Spawn a drone whose jam is rigged to fail, then hand control to the
  // operator: the card opens on the Jam CTA, the click fails, and the
  // recommended Gotcha net (→ `throwNet`) finishes the capture.
  const runJammerFailsGotcha = useCallback(() => {
    const id = spawnGotchaTarget();
    failJamIdsRef.current.add(id);
    openTargetsPanel();
    onActivateTarget(id);
  }, [spawnGotchaTarget, openTargetsPanel, onActivateTarget]);

  // Hands-free twin of the above: drives jam-fail → Gotcha net → capture
  // on a timeline, picking the same nearest assets the map/card resolve.
  const runJammerFailsGotchaAuto = useCallback(() => {
    const start = GOTCHA_APPROACH_START;
    const id = spawnGotchaTarget();
    openTargetsPanel();
    onActivateTarget(id);

    after(AUTO_PHASE_MS, () => {
      const pos = parseCoords(
        targetsRef.current.find((t) => t.id === id)?.coordinates,
      ) ?? start;
      const regId = pickNearestAvailableId(
        regulusRef.current as unknown as FlowAsset[],
        pos.lat,
        pos.lon,
      );
      if (!regId) return;
      effectors.handleMitigateFail(id, regId);

      after(GOTCHA_AUTO_THROW_DELAY_MS, () => {
        const pos2 = parseCoords(
          targetsRef.current.find((t) => t.id === id)?.coordinates,
        ) ?? start;
        const gotchaId = pickNearestAvailableId(
          gotchaRef.current as unknown as FlowAsset[],
          pos2.lat,
          pos2.lon,
        );
        if (!gotchaId) return;
        throwNet(id, gotchaId);
      });
    });
  }, [spawnGotchaTarget, openTargetsPanel, onActivateTarget, after, effectors, throwNet]);

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
    runJammerFailsGotchaAuto,
    mitigate,
    throwNet,
    reset,
  };
}
