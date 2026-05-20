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
import { showTacticalNotification } from "@/app/components/NotificationSystem";
import type { Detection } from "@/imports/ListOfSystems";
import { getPriorityBaseline } from "@/imports/useActivityStatus";
import { useLocale, type Locale } from "@/lib/direction";
import { getStrings, useStrings, type Strings } from "@/lib/intl";
import { measure } from "@/lib/perf/measure";

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
  intervalRef: MutableRefObject<ReturnType<typeof setInterval> | null>;
  isBird?: boolean;
  isCar?: boolean;
  silent?: boolean;
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
  /** Runs the 4-route, staggered scenario. */
  runFullScenario: () => void;
  /** Spawns one target. Returns the spawned target's id. */
  runSingleScenario: () => string;
  /** Spawns 20 targets in a circular swarm. */
  runSwarmScenario: () => void;
  /**
   * Tracks ids that are still on their initial approach path.
   */
  approachingTargetIds: MutableRefObject<Set<string>>;
}

// ─── Constants ───────────────────────────────────────────────────────

// 10 Hz telemetry — typical fused track/GPS cadence. Cesium motion
// interpolates between samples at frame rate; trail stays ~1 Hz.
const TELEMETRY_TICK_MS = 100;
const PATROL_TICK_MS = TELEMETRY_TICK_MS;
const PATROL_SPEED = 0.0032;
const TRAIL_SAMPLE_EVERY = 10;
const TRAIL_MAX_POINTS = 40;

const APPROACH_TOTAL_MS = 24000;
const APPROACH_TICK_MS = TELEMETRY_TICK_MS;
const APPROACH_STEPS = APPROACH_TOTAL_MS / APPROACH_TICK_MS;
const APPROACH_MILESTONE_MAGOS = Math.round(APPROACH_STEPS * (2 / 12));
const APPROACH_MILESTONE_ELTA = Math.round(APPROACH_STEPS * (3 / 12));
const APPROACH_MILESTONE_CLASSIFY = Math.round(APPROACH_STEPS * (5 / 12));

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
  const cuasIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cuasIntervalRef2 = useRef<ReturnType<typeof setInterval> | null>(null);
  const cuasIntervalRef3 = useRef<ReturnType<typeof setInterval> | null>(null);
  const cuasIntervalRef4 = useRef<ReturnType<typeof setInterval> | null>(null);
  const cuasMassRefs = useRef<ReturnType<typeof setInterval>[]>([]);
  // Bare `setTimeout` calls scheduled outside the main timer refs.
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set(),
  );

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
      measure(
        "Sim",
        "sim.friendlyPatrol",
        () => {
          trailTickRef.current += 1;
          const sampleTrail =
            trailTickRef.current % TRAIL_SAMPLE_EVERY === 0;

          patrolProgressRef.current = patrolProgressRef.current.map((p) => {
            const next = p + PATROL_SPEED;
            return next >= friendlyPatrolRoutes[0].waypoints.length ? 0 : next;
          });

          setFriendlyDrones(
            friendlyPatrolRoutes.map((route, i) => {
              const progress = patrolProgressRef.current[i];
              const legIndex = Math.floor(progress) % route.waypoints.length;
              const legFrac = progress - legIndex;
              const from = route.waypoints[legIndex];
              const to =
                route.waypoints[(legIndex + 1) % route.waypoints.length];

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
        },
        {
          properties: {
            tick: trailTickRef.current,
            drones: friendlyPatrolRoutes.length,
          },
        },
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
    return () => {
      for (const ref of cuasRefs) {
        if (ref.current) {
          clearInterval(ref.current);
          ref.current = null;
        }
      }
      for (const id of massRefs.current) clearInterval(id);
      massRefs.current = [];
      for (const id of pending.current) clearTimeout(id);
      pending.current.clear();
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────

  const appendTargetLog = useCallback((targetId: string, label: string) => {
    setTargets((prev) => appendLog(prev, targetId, label));
  }, []);

  const spawnCuasTarget = useCallback(
    (opts: SpawnOptions): string => {
      const targetId = `CUAS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = nowLocaleTime;
      const isCar = !!opts.isCar;
      const isBird = !!opts.isBird;
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

      let step = 0;
      opts.intervalRef.current = setInterval(() => {
        step++;
        const tnow = now();
        const progress = smoothstep01(Math.min(step / APPROACH_STEPS, 1));
        const curLat = opts.startLat + (opts.endLat - opts.startLat) * progress;
        const curLon = opts.startLon + (opts.endLon - opts.startLon) * progress;
        const distKm = (3.2 - progress * 2.5).toFixed(1);

        setTargets((prev) =>
          prev.map((tgt) => {
            if (tgt.id !== targetId) return tgt;
            const updated = { ...tgt };
            updated.coordinates = formatMovingCoord(curLat, curLon);
            updated.distance = sim.distanceKm(distKm);
            updated.timestamp = tnow;
            if (tgt.altitude != null)
              updated.altitude = sim.altitudeM(
                Math.round(120 + Math.sin(progress * Math.PI) * 30),
              );
            const approachSampleTrail =
              step === 1 ||
              step % 10 === 0 ||
              step === APPROACH_STEPS;
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

            if (step === APPROACH_MILESTONE_MAGOS && tgt.entityStage === "raw_detection") {
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

            if (step === APPROACH_MILESTONE_ELTA && tgt.entityStage === "raw_detection") {
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

            if (step === APPROACH_MILESTONE_CLASSIFY && tgt.entityStage === "raw_detection") {
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

        if (step >= APPROACH_STEPS) {
          if (opts.intervalRef.current) clearInterval(opts.intervalRef.current);
          approachingTargetIds.current.delete(targetId);
        }
      }, APPROACH_TICK_MS);

      return targetId;
    },
    [t],
  );

  const resetScenarioTimers = useCallback(() => {
    [
      cuasIntervalRef,
      cuasIntervalRef2,
      cuasIntervalRef3,
      cuasIntervalRef4,
    ].forEach((ref) => {
      if (ref.current) {
        clearInterval(ref.current);
        ref.current = null;
      }
    });
  }, []);

  const runFullScenario = useCallback(() => {
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
        spawn();
      } else {
        const id = setTimeout(spawn, route.delay);
        pendingTimeoutsRef.current.add(id);
      }
    });
  }, [resetScenarioTimers, spawnCuasTarget]);

  const runSingleScenario = useCallback((): string => {
    if (cuasIntervalRef.current) clearInterval(cuasIntervalRef.current);

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
    cuasMassRefs.current.forEach((ref) => clearInterval(ref));
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
        const ref: MutableRefObject<ReturnType<typeof setInterval> | null> = {
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
  };
}

export type { Locale };
