/**
 * useTacticalTargets — owns the tactical target lifecycle:
 *
 *   - `targets` state (every detection / classified entity on the map)
 *   - `friendlyDrones` patrol simulation (10 Hz position updates,
 *     1 Hz trail breadcrumb sampling)
 *   - CUAS spawn primitive (`spawnCuasTarget`) and the three
 *     scenario starters (single, full, swarm)
 *   - cleanup of every long-lived timer on unmount
 *
 * The hook is a faithful behaviour-preserving extract of the same
 * logic that previously lived inline inside `Dashboard.tsx`. The
 * legacy Dashboard now consumes it; the new `DashboardV2` will too.
 *
 * The hook owns the timer refs so consumers can never accidentally
 * leak a `setInterval`. The `setTargets` setter is exported so the
 * effectors workflow (`useEffectorWorkflow`) can mutate targets
 * during jam / point / lock / dismiss flows without forking the
 * source of truth.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { showTacticalNotification } from "@/app/components/tacticalNotifications";
import type { Detection } from "@/imports/ListOfSystems";
import { getPriorityBaseline } from "@/imports/useActivityStatus";
import { useLocale, type Locale } from "@/lib/direction";
import { getStrings, useStrings, type Strings } from "@/lib/intl";
import { destination, haversineDistanceM } from "@/app/lib/mapGeo";

// ─── Types ───────────────────────────────────────────────────────────

export interface FriendlyDrone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitude: string;
  headingDeg?: number;
  fovDeg?: number;
  trail?: [number, number][];
}

interface FriendlyPatrolRoute {
  id: string;
  name: string;
  altitude: string;
  fovDeg: number;
  waypoints: [number, number][];
}

interface SpawnOptions {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  nameSuffix: string;
  intervalRef: MutableRefObject<SimTimer | null>;
  isBird?: boolean;
  isCar?: boolean;
  silent?: boolean;
  /**
   * Total approach duration in ms. Defaults to the production cadence
   * (`APPROACH_TOTAL_MS`); the demo passes a larger value for a slower,
   * more presentable drone. The tick rate is unchanged so motion stays
   * smooth — only the step count (and milestone offsets) scale.
   */
  approachTotalMs?: number;
  /**
   * Approach-endpoint scatter radius (m). Defaults to
   * `APPROACH_END_JITTER_M`; pass `0` for a precise arrival (the Gotcha
   * capture flow ingresses right beside a fixed installation).
   */
  endJitterM?: number;
  /**
   * Sideways bow of the approach leg as a fraction of its length.
   * Defaults to `APPROACH_BOW_FRACTION`; pass `0` for a straight leg.
   */
  bowFraction?: number;
  /**
   * Constant-speed approach (no ease-in/out). Defaults to smoothstep
   * easing; the Gotcha capture uses linear so the ingress feels even and
   * hands off seamlessly to the loiter at a matching per-tick speed.
   */
  linearApproach?: boolean;
  /**
   * Override the post-approach roam. When set, the drone loiters around
   * its arrival point with this radius/speed instead of the field-wide
   * default — used so a captured drone hovers beside its Gotcha.
   */
  roam?: { radiusM: number; speedMPerTick: number };
}

export interface TacticalTargetsApi {
  /** Current target list. */
  targets: Detection[];
  /** Direct setter for the effectors workflow + UI handlers. */
  setTargets: Dispatch<SetStateAction<Detection[]>>;
  /** Friendly patrol drones, ticked by the friendly-patrol sim. */
  friendlyDrones: FriendlyDrone[];
  /** Append a log line to the named target's `actionLog`. */
  appendTargetLog: (targetId: string, label: string) => void;
  /** Pure spawn primitive. Returns the spawned target's id. */
  spawnCuasTarget: (opts: SpawnOptions) => string;
  /** Clears the active simulation interval refs (for scenario
   *  re-triggers — `runSingle` etc. call this internally). */
  resetScenarioTimers: () => void;
  /** Runs the 4-route, staggered scenario. Returns the first (t=0)
   *  target's id so callers can focus its card. */
  runFullScenario: () => string | null;
  /** Spawns one target. Returns the spawned target's id. */
  runSingleScenario: () => string;
  /** Spawns 20 targets in a circular swarm. */
  runSwarmScenario: () => void;
  /**
   * Tracks ids that are still on their initial approach path.
   */
  approachingTargetIds: MutableRefObject<Set<string>>;
  /**
   * Demo post-neutralization — jam outcome. Halts the target in place
   * (where it was jammed) and greys it out as a neutralized contact.
   */
  markJammed: (targetId: string) => void;
  /**
   * Demo post-neutralization — net outcome. Cancels motion, relabels
   * the marker "CAPTURED", and moves the track to neutralized.
   */
  markCaptured: (targetId: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────

// 10 Hz telemetry — typical fused track/GPS cadence. Cesium motion
// interpolates between samples at frame rate; trail stays ~1 Hz.
const TELEMETRY_TICK_MS = 100;
const PATROL_TICK_MS = TELEMETRY_TICK_MS;
const PATROL_SPEED = 0.0032;
const PATROL_REACT_COMMIT_EVERY_TICKS = 3;
const TRAIL_SAMPLE_EVERY = 10;
const TRAIL_MAX_POINTS = 40;

// Friendly drones that have lost their datalink — held stationary at
// their start waypoint (a patrolling "offline" drone makes no sense).
// Must match the `offline` entries in `DEVICE_CONNECTION`
// (useDevicesFromAssets) so the map and devices panel agree.
const OFFLINE_FRIENDLY_DRONE_IDS = new Set<string>(["FRIENDLY-02"]);

const APPROACH_TOTAL_MS = 24000;
const APPROACH_TICK_MS = TELEMETRY_TICK_MS;
const APPROACH_REACT_COMMIT_EVERY_TICKS = 3;

// Roam: once an un-engaged drone reaches its objective it patrols the
// covered area instead of freezing — a continuous heading-based wander
// (gentle per-tick turns, steering back when it drifts past the radius)
// so each track curves naturally and diverges from the others.
const ROAM_CENTER_LAT = 32.4666;
const ROAM_CENTER_LON = 35.0013;
const ROAM_RADIUS_M = 2800;
const ROAM_SPEED_M_PER_TICK = 10;
const ROAM_TURN_DEG = 3;
const ROAM_BOUNDARY_TURN_DEG = 7;

// Approach: per-drone path randomization so they don't all fly a straight
// line into the same point — the endpoint is jittered within this radius
// and the leg bows sideways by a fraction of its length.
const APPROACH_END_JITTER_M = 700;
const APPROACH_BOW_FRACTION = 0.25;

function normalizeHeading(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function headingDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

interface SimTimer {
  cancel: () => void;
}

function startVisibilityAwareInterval(callback: () => void, intervalMs: number): SimTimer {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const start = () => {
    if (intervalId != null) return;
    intervalId = setInterval(callback, intervalMs);
  };
  const stop = () => {
    if (intervalId == null) return;
    clearInterval(intervalId);
    intervalId = null;
  };
  const onVisibility = () => {
    if (document.hidden) stop();
    else start();
  };

  if (typeof document === "undefined" || !document.hidden) start();
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }

  return {
    cancel: () => {
      stop();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    },
  };
}

function formatMovingCoord(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

function smoothstep01(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

// Cached Hebrew locale time formatter. Reused across all hot paths
// so we don't allocate a fresh `Intl.DateTimeFormat` (a heavy ICU
// lookup) on every 250 ms simulation tick.
const HE_TIME_FORMATTER = new Intl.DateTimeFormat("he-IL", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
let cachedTimeSecond = -1;
let cachedTimeString = "";
/**
 * Hot-path time formatter used by every simulation tick. Cached
 * by wall-clock second so multiple targets ticking on the same
 * loop share the formatted string.
 *
 * Re-exported because the effector / BDA flows (still in legacy
 * `Dashboard.tsx` until Phase 2b) need to stamp action-log
 * entries with the same canonical time format.
 */
export function nowLocaleTime(): string {
  const second = Math.floor(Date.now() / 1000);
  if (second !== cachedTimeSecond) {
    cachedTimeSecond = second;
    cachedTimeString = HE_TIME_FORMATTER.format(new Date(second * 1000));
  }
  return cachedTimeString;
}

/**
 * Pure helper — returns a new targets array with `label` appended
 * to the named target's `actionLog`. Other targets pass through
 * unchanged.
 */
export function appendLog(
  targets: Detection[],
  targetId: string,
  label: string,
): Detection[] {
  const time = nowLocaleTime();
  return targets.map((t) =>
    t.id !== targetId
      ? t
      : {
          ...t,
          actionLog: [...(t.actionLog ?? []), { time, label }],
        },
  );
}

/**
 * Friendly patrol drones used by the simulation. Names + altitudes
 * come from the i18n catalog so they read in the active locale; the
 * rest (waypoints, FOV, ids) are deterministic geometry shared
 * across both languages.
 */
export function getFriendlyPatrolRoutes(t: Strings): FriendlyPatrolRoute[] {
  const d = t.simulation.friendlyDrones;
  return [
    {
      id: "FRIENDLY-01",
      name: d.patrol3.name,
      altitude: d.patrol3.altitude,
      fovDeg: 78,
      waypoints: [
        [32.4746, 34.9883],
        [32.4766, 34.9923],
        [32.4786, 34.9903],
        [32.4756, 34.9863],
      ],
    },
    {
      id: "FRIENDLY-02",
      name: d.observation7.name,
      altitude: d.observation7.altitude,
      fovDeg: 105,
      waypoints: [
        [32.4816, 35.0143],
        [32.4836, 35.0113],
        [32.4806, 35.0083],
        [32.4796, 35.0123],
      ],
    },
    {
      id: "FRIENDLY-03",
      name: d.patrol11.name,
      altitude: d.patrol11.altitude,
      fovDeg: 62,
      waypoints: [
        [32.468, 34.994],
        [32.47, 34.998],
        [32.472, 34.996],
        [32.4695, 34.992],
      ],
    },
    {
      id: "FRIENDLY-04",
      name: d.observation2.name,
      altitude: d.observation2.altitude,
      fovDeg: 118,
      waypoints: [
        [32.459, 35.002],
        [32.461, 35.006],
        [32.463, 35.003],
        [32.4605, 35.0],
      ],
    },
    {
      id: "FRIENDLY-05",
      name: d.patrol9.name,
      altitude: d.patrol9.altitude,
      fovDeg: 88,
      waypoints: [
        [32.485, 34.998],
        [32.487, 35.002],
        [32.489, 34.999],
        [32.486, 34.996],
      ],
    },
  ];
}

function bearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ─── Hook ────────────────────────────────────────────────────────────

/**
 * Sims can be disabled via `?sim=off` for perf-sensitive sessions
 * (kiosk mode, demos). When enabled (default) the loop also pauses
 * automatically while the tab is hidden.
 */
function isSimEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("sim") !== "off";
}

export function useTacticalTargets(): TacticalTargetsApi {
  const t = useStrings();
  const locale = useLocale();
  const friendlyPatrolRoutes = useMemo(() => getFriendlyPatrolRoutes(t), [t]);

  const [targets, setTargets] = useState<Detection[]>([]);
  const [friendlyDrones, setFriendlyDrones] = useState<FriendlyDrone[]>(() => {
    // Initial drone positions stamped at mount; subsequent locale
    // toggles don't re-label existing drones (matches launchers).
    const routes = getFriendlyPatrolRoutes(getStrings(locale));
    return routes.map((r) => ({
      id: r.id,
      name: r.name,
      lat: r.waypoints[0][0],
      lon: r.waypoints[0][1],
      altitude: r.altitude,
      headingDeg: 0,
    }));
  });

  const approachingTargetIds = useRef<Set<string>>(new Set());

  // Scenario interval refs.
  const cuasIntervalRef = useRef<SimTimer | null>(null);
  const cuasIntervalRef2 = useRef<SimTimer | null>(null);
  const cuasIntervalRef3 = useRef<SimTimer | null>(null);
  const cuasIntervalRef4 = useRef<SimTimer | null>(null);
  const cuasMassRefs = useRef<SimTimer[]>([]);
  // Bare `setTimeout` calls scheduled outside the main timer refs.
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set(),
  );
  // Per-target approach timers, keyed by id, so demo post-neutralize
  // helpers can stop a specific target's motion without reaching into
  // the scenario refs.
  const targetIntervalsRef = useRef<Map<string, SimTimer>>(new Map());

  // Fresh-targets ref so demo helpers can read current coordinates
  // without re-binding through useCallback deps each render.
  const targetsRef = useRef(targets);
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  // Patrol tick refs.
  const patrolProgressRef = useRef<number[]>(
    friendlyPatrolRoutes.map(() => 0),
  );
  const friendlyTrailRef = useRef<[number, number][][]>(
    friendlyPatrolRoutes.map(() => []),
  );
  const trailTickRef = useRef(0);

  // ── Friendly patrol sim ────────────────────────────────────────────
  useEffect(() => {
    if (!isSimEnabled()) return;

    let timerId: ReturnType<typeof setInterval> | null = null;

    const runTick = () => {
      trailTickRef.current += 1;
      const sampleTrail = trailTickRef.current % TRAIL_SAMPLE_EVERY === 0;

      patrolProgressRef.current = patrolProgressRef.current.map((p) => {
        const next = p + PATROL_SPEED;
        return next >= friendlyPatrolRoutes[0].waypoints.length ? 0 : next;
      });

      if (!sampleTrail && trailTickRef.current % PATROL_REACT_COMMIT_EVERY_TICKS !== 0) {
        return;
      }

      setFriendlyDrones(
        friendlyPatrolRoutes.map((route, i) => {
          if (OFFLINE_FRIENDLY_DRONE_IDS.has(route.id)) {
            const [startLat, startLon] = route.waypoints[0];
            return {
              id: route.id,
              name: route.name,
              lat: startLat,
              lon: startLon,
              altitude: route.altitude,
              headingDeg: bearingDegrees(
                startLat,
                startLon,
                route.waypoints[1][0],
                route.waypoints[1][1],
              ),
              fovDeg: route.fovDeg,
              trail: friendlyTrailRef.current[i],
            };
          }

          const progress = patrolProgressRef.current[i];
          const legIndex = Math.floor(progress) % route.waypoints.length;
          const legFrac = progress - legIndex;
          const from = route.waypoints[legIndex];
          const to = route.waypoints[(legIndex + 1) % route.waypoints.length];

          const lat = from[0] + (to[0] - from[0]) * legFrac;
          const lon = from[1] + (to[1] - from[1]) * legFrac;
          const heading = bearingDegrees(from[0], from[1], to[0], to[1]);

          if (sampleTrail) {
            friendlyTrailRef.current[i] = [
              ...friendlyTrailRef.current[i],
              [lat, lon],
            ].slice(-TRAIL_MAX_POINTS);
          }

          return {
            id: route.id,
            name: route.name,
            lat,
            lon,
            altitude: route.altitude,
            headingDeg: heading,
            fovDeg: route.fovDeg,
            trail: friendlyTrailRef.current[i],
          };
        }),
      );
    };

    const start = () => {
      if (timerId != null) return;
      timerId = setInterval(runTick, PATROL_TICK_MS);
    };
    const stop = () => {
      if (timerId == null) return;
      clearInterval(timerId);
      timerId = null;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    if (typeof document === "undefined" || !document.hidden) start();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      stop();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
    // We deliberately don't list `friendlyPatrolRoutes` — locale
    // changes shouldn't restart the sim (legacy parity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Master cleanup on unmount ─────────────────────────────────────
  useEffect(() => {
    const cuasRefs = [
      cuasIntervalRef,
      cuasIntervalRef2,
      cuasIntervalRef3,
      cuasIntervalRef4,
    ];
    const massRefs = cuasMassRefs;
    const pending = pendingTimeoutsRef;
    const perTarget = targetIntervalsRef;
    return () => {
      for (const ref of cuasRefs) {
        ref.current?.cancel();
        ref.current = null;
      }
      for (const timer of massRefs.current) timer.cancel();
      massRefs.current = [];
      for (const id of pending.current) clearTimeout(id);
      pending.current.clear();
      for (const timer of perTarget.current.values()) timer.cancel();
      perTarget.current.clear();
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────

  const appendTargetLog = useCallback((targetId: string, label: string) => {
    setTargets((prev) => appendLog(prev, targetId, label));
  }, []);

  // Continuous wander across the covered area for a drone that finished
  // its approach without being engaged. Each tick the heading drifts by a
  // small random amount (smooth curves, no kinks); if the drone strays
  // past the coverage radius it steers back toward center. Registered
  // under the target id so `stopTargetMotion` (jam drift / net capture)
  // cancels it cleanly.
  const startRoam = useCallback(
    (
      targetId: string,
      fromLat: number,
      fromLon: number,
      roamOpts?: {
        centerLat?: number;
        centerLon?: number;
        radiusM?: number;
        speedMPerTick?: number;
        initialHeading?: number;
      },
    ) => {
      const centerLat = roamOpts?.centerLat ?? ROAM_CENTER_LAT;
      const centerLon = roamOpts?.centerLon ?? ROAM_CENTER_LON;
      const radiusM = roamOpts?.radiusM ?? ROAM_RADIUS_M;
      const speedMPerTick = roamOpts?.speedMPerTick ?? ROAM_SPEED_M_PER_TICK;
      let lat = fromLat;
      let lon = fromLon;
      let heading = roamOpts?.initialHeading ?? Math.random() * 360;
      let step = 0;
      const timer = startVisibilityAwareInterval(() => {
        step++;
        heading += (Math.random() - 0.5) * 2 * ROAM_TURN_DEG;
        const distFromCenter = haversineDistanceM(
          lat,
          lon,
          centerLat,
          centerLon,
        );
        if (distFromCenter > radiusM) {
          const toCenter = bearingDegrees(
            lat,
            lon,
            centerLat,
            centerLon,
          );
          const correction = headingDelta(heading, toCenter);
          heading += Math.max(
            -ROAM_BOUNDARY_TURN_DEG,
            Math.min(ROAM_BOUNDARY_TURN_DEG, correction),
          );
        }
        heading = normalizeHeading(heading);
        const [nextLon, nextLat] = destination(
          lat,
          lon,
          speedMPerTick,
          heading,
        );
        lat = nextLat;
        lon = nextLon;
        const tnow = nowLocaleTime();
        const sample = step % 6 === 0;
        const curLat = lat;
        const curLon = lon;
        const curHeading = heading;
        setTargets((prev) =>
          prev.map((tg) =>
            tg.id !== targetId
              ? tg
              : {
                  ...tg,
                  coordinates: formatMovingCoord(curLat, curLon),
                  timestamp: tnow,
                  headingDeg: curHeading,
                  trail: sample
                    ? [
                        ...(tg.trail ?? []),
                        { lat: curLat, lon: curLon, timestamp: tnow },
                      ]
                    : tg.trail,
                },
          ),
        );
      }, TELEMETRY_TICK_MS);
      targetIntervalsRef.current.set(targetId, timer);
    },
    [setTargets],
  );

  const spawnCuasTarget = useCallback(
    (opts: SpawnOptions): string => {
      const targetId = `CUAS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = nowLocaleTime;
      const isCar = !!opts.isCar;
      const isBird = !!opts.isBird;
      const approachSteps = Math.max(
        1,
        Math.round((opts.approachTotalMs ?? APPROACH_TOTAL_MS) / APPROACH_TICK_MS),
      );
      const milestoneMagos = Math.round(approachSteps * (2 / 12));
      const milestoneElta = Math.round(approachSteps * (3 / 12));
      const milestoneClassify = Math.round(approachSteps * (5 / 12));
      // Re-read strings inside the callback so a mid-session locale
      // flip applies to subsequently-spawned targets. (Existing
      // targets keep whatever language was active when they spawned.)
      const sim = t.simulation;
      const log = t.actionLog;
      const notif = t.notifications;
      const targetName = isCar
        ? sim.targetNameCar(opts.nameSuffix)
        : isBird
          ? sim.targetNameBird(opts.nameSuffix)
          : sim.targetNameDrone(opts.nameSuffix);
      const rawDetection: Detection = {
        id: targetId,
        name: targetName,
        type: isCar ? "ground_vehicle" : isBird ? "unknown" : "uav",
        classifiedType: isCar ? "car" : isBird ? "bird" : "drone",
        status: "detection",
        timestamp: now(),
        createdAtMs: Date.now(),
        coordinates: formatMovingCoord(opts.startLat, opts.startLon),
        distance: sim.distanceKm("3.2"),
        entityStage: "classified",
        priority: getPriorityBaseline({
          status: "detection",
          entityStage: "classified",
          flowType: 5,
        }),
        confidence: isCar ? 88 : isBird ? 85 : 92,
        contributingSensors: [
          {
            sensorId: "RAD-NVT-RADA",
            sensorType: "Radar",
            firstDetectedAt: now(),
            lastDetectedAt: now(),
          },
        ],
        trail: [{ lat: opts.startLat, lon: opts.startLon, timestamp: now() }],
        actionLog: [
          {
            time: now(),
            label: isCar
              ? log.initialDetectionCar
              : isBird
                ? log.initialDetectionBird
                : log.initialDetectionDrone,
          },
        ],
        flowType: 5,
        mitigationStatus: "idle",
        weaponPointingStatus: isCar ? "idle" : undefined,
        altitude: isCar ? undefined : sim.altitudeM(120),
        laserDistance: sim.laserDistanceM(2840),
        laserAzimuth: "253.44°",
        laserElevation: "2.39°",
        laserRange: "3575.89 m",
      };

      approachingTargetIds.current.add(targetId);
      setTargets((prev) => [...prev, rawDetection]);

      if (!opts.silent) {
        showTacticalNotification({
          title: notif.newDetectionTitle(rawDetection.name ?? ""),
          message: isCar
            ? notif.classifiedGroundThreat(rawDetection.confidence ?? 0)
            : isBird
              ? notif.classifiedAsBird(rawDetection.confidence ?? 0)
              : notif.classifiedAirThreat(rawDetection.confidence ?? 0),
          code: targetId,
          level: isBird ? "suspect" : "critical",
        });
      }

      // Per-drone path randomization: jitter the endpoint (so drones don't
      // all converge on the same point) and bow the leg sideways (so the
      // ingress curves instead of being a straight line). Cars keep their
      // exact destination. The bow is 0 at both ends, peaking mid-leg.
      let approachEndLat = opts.endLat;
      let approachEndLon = opts.endLon;
      const endJitterM = opts.endJitterM ?? APPROACH_END_JITTER_M;
      if (!isCar && endJitterM > 0) {
        const [jLon, jLat] = destination(
          opts.endLat,
          opts.endLon,
          Math.random() * endJitterM,
          Math.random() * 360,
        );
        approachEndLat = jLat;
        approachEndLon = jLon;
      }
      const legDLat = approachEndLat - opts.startLat;
      const legDLon = approachEndLon - opts.startLon;
      const legLen = Math.hypot(legDLat, legDLon) || 1;
      const perpLat = -legDLon / legLen;
      const perpLon = legDLat / legLen;
      const bowFraction = opts.bowFraction ?? APPROACH_BOW_FRACTION;
      const bowMag = isCar
        ? 0
        : (Math.random() * 2 - 1) * legLen * bowFraction;

      let step = 0;
      let prevLat = opts.startLat;
      let prevLon = opts.startLon;
      opts.intervalRef.current = startVisibilityAwareInterval(() => {
        step++;
        const tnow = now();
        const linearProgress = Math.min(step / approachSteps, 1);
        const progress = opts.linearApproach
          ? linearProgress
          : smoothstep01(linearProgress);
        const bow = Math.sin(progress * Math.PI) * bowMag;
        const curLat =
          opts.startLat + legDLat * progress + perpLat * bow;
        const curLon =
          opts.startLon + legDLon * progress + perpLon * bow;
        const curHeading = bearingDegrees(prevLat, prevLon, curLat, curLon);
        prevLat = curLat;
        prevLon = curLon;
        const distKm = (3.2 - progress * 2.5).toFixed(1);
        const isMilestone =
          step === milestoneMagos ||
          step === milestoneElta ||
          step === milestoneClassify ||
          step >= approachSteps;

        if (step !== 1 && !isMilestone && step % APPROACH_REACT_COMMIT_EVERY_TICKS !== 0) {
          return;
        }

        setTargets((prev) =>
          prev.map((tgt) => {
            if (tgt.id !== targetId) return tgt;
            const updated = { ...tgt };
            updated.coordinates = formatMovingCoord(curLat, curLon);
            updated.distance = sim.distanceKm(distKm);
            updated.timestamp = tnow;
            updated.headingDeg = curHeading;
            if (tgt.altitude != null)
              updated.altitude = sim.altitudeM(
                Math.round(120 + Math.sin(progress * Math.PI) * 30),
              );
            const approachSampleTrail =
              step === 1 ||
              step % 10 === 0 ||
              step === approachSteps;
            updated.trail = approachSampleTrail
              ? [
                  ...(tgt.trail ?? []),
                  { lat: curLat, lon: curLon, timestamp: tnow },
                ]
              : tgt.trail;
            const currentRange = 2840 - progress * 1800;
            updated.laserDistance = sim.laserDistanceM(
              Math.round(currentRange),
            );
            updated.laserAzimuth = `${(253.44 - progress * 12).toFixed(2)}°`;
            updated.laserElevation = `${(2.39 + progress * 3.5).toFixed(2)}°`;
            updated.laserRange = `${currentRange.toFixed(2)} m`;

            if (step === milestoneMagos && tgt.entityStage === "raw_detection") {
              updated.confidence = 45;
              updated.contributingSensors = [
                ...(tgt.contributingSensors ?? []),
                {
                  sensorId: "SENS-NVT-MAGOS-N",
                  sensorType: "Magos",
                  firstDetectedAt: tnow,
                  lastDetectedAt: tnow,
                },
              ];
              updated.actionLog = [
                ...(tgt.actionLog ?? []),
                { time: tnow, label: log.additionalSensorMagos },
              ];
              showTacticalNotification({
                title: notif.additionalSensorTitle(updated.name ?? tgt.name ?? ""),
                message: notif.additionalSensorMessageMagos(
                  updated.confidence ?? 0,
                  (updated.contributingSensors?.length ?? 1) - 1,
                ),
                code: targetId,
                level: "info",
              });
            }

            if (step === milestoneElta && tgt.entityStage === "raw_detection") {
              updated.contributingSensors = [
                ...(updated.contributingSensors ?? []),
                {
                  sensorId: "RAD-NVT-ELTA",
                  sensorType: "Radar",
                  firstDetectedAt: tnow,
                  lastDetectedAt: tnow,
                },
              ];
              updated.confidence = 65;
              updated.actionLog = [
                ...(updated.actionLog ?? []),
                { time: tnow, label: log.additionalSensorElta },
              ];
              showTacticalNotification({
                title: notif.additionalSensorTitle(updated.name ?? tgt.name ?? ""),
                message: notif.additionalSensorMessageElta(
                  updated.confidence ?? 0,
                  (updated.contributingSensors?.length ?? 1) - 1,
                ),
                code: targetId,
                level: "info",
              });
            }

            if (step === milestoneClassify && tgt.entityStage === "raw_detection") {
              updated.entityStage = "classified";
              if (opts.isBird) {
                updated.classifiedType = "bird";
                updated.type = "unknown";
                updated.name = sim.targetClassifiedBird(tgt.name ?? "");
                updated.confidence = 85;
              } else if (opts.isCar) {
                updated.classifiedType = "car";
                updated.type = "ground_vehicle";
                updated.name = sim.targetClassifiedCar(tgt.name ?? "");
                updated.confidence = 88;
                updated.altitude = undefined;
                updated.weaponPointingStatus = "idle";
              } else {
                updated.classifiedType = "drone";
                updated.type = "uav";
                updated.name = sim.targetClassifiedDrone(tgt.name ?? "");
                updated.confidence = 92;
              }
              updated.status = "detection";
              updated.priority = getPriorityBaseline(updated);
              updated.actionLog = [
                ...(updated.actionLog ?? []),
                {
                  time: tnow,
                  label: opts.isBird
                    ? log.classifiedAsBird
                    : log.classifiedAsDrone,
                },
              ];
              setTimeout(() => {
                showTacticalNotification({
                  title: notif.newDetectionTitle(updated.name ?? ""),
                  message: opts.isBird
                    ? notif.awaitingApproval(updated.confidence ?? 0)
                    : notif.classifiedDroneAwait(updated.confidence ?? 0),
                  code: targetId,
                  level: opts.isBird ? "suspect" : "critical",
                });
              }, 200);
            }

            if (updated.contributingSensors) {
              updated.contributingSensors = updated.contributingSensors.map(
                (s) => ({ ...s, lastDetectedAt: tnow }),
              );
            }

            return updated;
          }),
        );

        if (step >= approachSteps) {
          opts.intervalRef.current?.cancel();
          opts.intervalRef.current = null;
          approachingTargetIds.current.delete(targetId);
          targetIntervalsRef.current.delete(targetId);
          if (!isCar && !isBird) {
            startRoam(
              targetId,
              approachEndLat,
              approachEndLon,
              opts.roam
                ? {
                    centerLat: approachEndLat,
                    centerLon: approachEndLon,
                    radiusM: opts.roam.radiusM,
                    speedMPerTick: opts.roam.speedMPerTick,
                    initialHeading: bearingDegrees(
                      opts.startLat,
                      opts.startLon,
                      approachEndLat,
                      approachEndLon,
                    ),
                  }
                : undefined,
            );
          }
        }
      }, APPROACH_TICK_MS);

      if (opts.intervalRef.current) {
        targetIntervalsRef.current.set(targetId, opts.intervalRef.current);
      }

      return targetId;
    },
    [t, startRoam],
  );

  const resetScenarioTimers = useCallback(() => {
    [
      cuasIntervalRef,
      cuasIntervalRef2,
      cuasIntervalRef3,
      cuasIntervalRef4,
    ].forEach((ref) => {
      ref.current?.cancel();
      ref.current = null;
    });
    cuasMassRefs.current.forEach((timer) => timer.cancel());
    cuasMassRefs.current = [];
  }, []);

  const runFullScenario = useCallback((): string | null => {
    resetScenarioTimers();

    const routes = [
      {
        startLat: 32.4916,
        startLon: 35.0313,
        droneEnd: { lat: 32.4666, lon: 35.0013 },
        carEnd: { lat: 32.4836, lon: 35.0233 },
        ref: cuasIntervalRef,
        delay: 0,
      },
      {
        startLat: 32.4466,
        startLon: 34.9713,
        droneEnd: { lat: 32.4646, lon: 34.9963 },
        carEnd: { lat: 32.4506, lon: 34.9773 },
        ref: cuasIntervalRef2,
        delay: 10000,
      },
      {
        startLat: 32.4966,
        startLon: 34.9963,
        droneEnd: { lat: 32.4716, lon: 35.0063 },
        carEnd: { lat: 32.4886, lon: 34.9983 },
        ref: cuasIntervalRef3,
        delay: 15000,
      },
      {
        startLat: 32.4416,
        startLon: 35.0313,
        droneEnd: { lat: 32.4596, lon: 35.0063 },
        carEnd: { lat: 32.4446, lon: 35.0273 },
        ref: cuasIntervalRef4,
        delay: 25000,
      },
    ];

    // Randomly assign types: ensure at least 1 car, rest are drones
    // with 30% car chance.
    const types: Array<"drone" | "car"> = ["drone", "drone", "drone", "drone"];
    const carIdx = Math.floor(Math.random() * routes.length);
    types[carIdx] = "car";
    for (let i = 0; i < types.length; i++) {
      if (types[i] === "drone" && Math.random() < 0.3) types[i] = "car";
    }

    let firstId: string | null = null;
    routes.forEach((route, i) => {
      const isCar = types[i] === "car";
      const end = isCar ? route.carEnd : route.droneEnd;
      const spawn = () =>
        spawnCuasTarget({
          startLat: route.startLat,
          startLon: route.startLon,
          endLat: end.lat,
          endLon: end.lon,
          nameSuffix: String(Math.floor(Math.random() * 900) + 100),
          intervalRef: route.ref,
          isCar,
        });
      if (route.delay === 0) {
        const spawnedId = spawn();
        if (firstId === null) firstId = spawnedId;
      } else {
        const id = setTimeout(spawn, route.delay);
        pendingTimeoutsRef.current.add(id);
      }
    });
    return firstId;
  }, [resetScenarioTimers, spawnCuasTarget]);

  const runSingleScenario = useCallback((): string => {
    cuasIntervalRef.current?.cancel();
    cuasIntervalRef.current = null;

    const isCar = Math.random() < 0.3;
    return spawnCuasTarget({
      startLat: 32.4916,
      startLon: 35.0313,
      endLat: isCar ? 32.4836 : 32.4666,
      endLon: isCar ? 35.0233 : 35.0013,
      nameSuffix: String(Math.floor(Math.random() * 900) + 100),
      intervalRef: cuasIntervalRef,
      isCar,
    });
  }, [spawnCuasTarget]);

  const runSwarmScenario = useCallback(() => {
    cuasMassRefs.current.forEach((timer) => timer.cancel());
    cuasMassRefs.current = [];

    const baseLat = 32.4666;
    const baseLon = 35.0013;
    const count = 20;

    for (let i = 0; i < count; i++) {
      const delay = i * 400 + Math.random() * 300;
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const radius = 0.025 + Math.random() * 0.015;
      const startLat = baseLat + Math.cos(angle) * radius;
      const startLon = baseLon + Math.sin(angle) * radius;
      const isCar = Math.random() < 0.3;
      const endOffset = isCar ? 0.015 : 0.008;
      const endLat = isCar
        ? startLat + (baseLat - startLat) * 0.3
        : baseLat + (Math.random() - 0.5) * endOffset;
      const endLon = isCar
        ? startLon + (baseLon - startLon) * 0.3
        : baseLon + (Math.random() - 0.5) * endOffset;

      const id = setTimeout(() => {
        const ref: MutableRefObject<SimTimer | null> = {
          current: null,
        };
        spawnCuasTarget({
          startLat,
          startLon,
          endLat,
          endLon,
          nameSuffix: String(100 + i),
          intervalRef: ref,
          isCar,
          silent: true,
        });
        if (ref.current) cuasMassRefs.current.push(ref.current);
      }, delay);
      pendingTimeoutsRef.current.add(id);
    }

    const swarmToast = setTimeout(() => {
      showTacticalNotification({
        title: t.notifications.swarmAlertTitle,
        message: t.notifications.swarmAlertMessage(count),
        code: "SWARM",
        level: "critical",
      });
    }, 300);
    pendingTimeoutsRef.current.add(swarmToast);
  }, [spawnCuasTarget, t]);

  const stopTargetMotion = useCallback((targetId: string) => {
    const timer = targetIntervalsRef.current.get(targetId);
    if (timer) {
      timer.cancel();
      targetIntervalsRef.current.delete(targetId);
    }
    approachingTargetIds.current.delete(targetId);
  }, []);

  // Jam landed: halt the drone where it was jammed and grey it out. No
  // drift/retreat — it holds its last position as a neutralized contact.
  const markJammed = useCallback(
    (targetId: string) => {
      stopTargetMotion(targetId);
      setTargets((prev) =>
        prev.map((tg) =>
          tg.id === targetId
            ? {
                ...tg,
                neutralizedDrift: true,
                status: "expired" as const,
                activityStatus: "timeout" as const,
              }
            : tg,
        ),
      );
    },
    [setTargets, stopTargetMotion],
  );

  const markCaptured = useCallback(
    (targetId: string) => {
      stopTargetMotion(targetId);
      setTargets((prev) =>
        appendLog(prev, targetId, t.actionLog.netEnd).map((tg) =>
          tg.id === targetId
            ? {
                ...tg,
                name: t.simulation.targetCaptured(tg.name ?? ""),
                neutralizedDrift: true,
                status: "event_neutralized" as const,
                activityStatus: "mitigated" as const,
                mitigationStatus: "mitigated" as const,
                missionType: "net_capture" as const,
              }
            : tg,
        ),
      );
    },
    [setTargets, stopTargetMotion, t],
  );

  return {
    targets,
    setTargets,
    friendlyDrones,
    appendTargetLog,
    spawnCuasTarget,
    resetScenarioTimers,
    runFullScenario,
    runSingleScenario,
    runSwarmScenario,
    approachingTargetIds,
    markJammed,
    markCaptured,
  };
}

export type { Locale };
