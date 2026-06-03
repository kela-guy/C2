/**
 * useEffectorWorkflow — owns the effector lifecycle:
 *
 *   - `regulusEffectors` (jamming) and `launcherEffectors`
 *     (kinetic) state lists
 *   - jam (mitigate) flow per-effector
 *   - global "jam all available" flow
 *   - point-weapon flow
 *   - lock-on-target / dismiss-lock / complete-mission flows
 *   - effector / launcher selection state per target
 *
 * The hook consumes the targets state from `useTacticalTargets`
 * via two callbacks (`setTargets` and `getTargets`) so it can both
 * mutate target fields (e.g. `mitigationStatus`) and read current
 * target shape (e.g. to find the linked `pointingLauncherId` when
 * dismissing a lock). The targets array itself stays in
 * `useTacticalTargets` — there is exactly one source of truth.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { toast } from "sonner";
import type {
  Detection,
  RegulusEffector,
  LauncherEffector,
  GotchaEffector,
} from "@/imports/ListOfSystems";
import { useLocale } from "@/lib/direction";
import { getStrings, useStrings } from "@/lib/intl";

import { REGULUS_EFFECTORS } from "@/app/components/tacticalAssets";
import { appendLog } from "./useTacticalTargets";

// Statuses that are "live and engageable" — i.e. can be jammed by
// the global mitigation handler. Anything outside this set is
// either already mitigated, expired, or a stage that doesn't
// accept jamming (e.g. a closed event, a decoy, etc.).
const JAMMABLE_STATUSES = new Set([
  "suspicion",
  "detection",
  "tracking",
  "event",
]);

// ─── Public hook surface ─────────────────────────────────────────────

interface UseEffectorWorkflowProps {
  /** Targets setter from `useTacticalTargets`. */
  setTargets: Dispatch<SetStateAction<Detection[]>>;
  /**
   * Reading the targets list inside handlers needs the latest
   * value (callbacks like `handleDismissLock` close over `targets`
   * to look up the linked launcher). Pass either the array (the
   * hook will keep its own ref) or a getter function. Array is
   * the simpler ergonomic — the hook stamps a ref each render so
   * handlers always read fresh state.
   */
  targets: Detection[];
  /**
   * Seed the Regulus list. Defaults to the production registry; the
   * demo passes its trimmed set so the map + card jam options match
   * the cleaner demo layout.
   */
  initialRegulusEffectors?: RegulusEffector[];
  /** Seed the Gotcha net effectors. Demo-only; empty in production. */
  initialGotchaEffectors?: GotchaEffector[];
}

export interface EffectorWorkflowApi {
  regulusEffectors: RegulusEffector[];
  setRegulusEffectors: Dispatch<SetStateAction<RegulusEffector[]>>;
  launcherEffectors: LauncherEffector[];
  setLauncherEffectors: Dispatch<SetStateAction<LauncherEffector[]>>;
  gotchaEffectors: GotchaEffector[];
  setGotchaEffectors: Dispatch<SetStateAction<GotchaEffector[]>>;

  /** Map of `targetId -> effectorId` for the currently picked Regulus. */
  selectedEffectorIds: Map<string, string>;
  /** Map of `targetId -> launcherId` for the currently picked launcher. */
  selectedLauncherIds: Map<string, string>;

  handleEffectorSelect: (targetId: string, effectorId: string) => void;
  handleLauncherSelect: (targetId: string, launcherId: string) => void;

  /** Single-effector jam flow. */
  handleMitigate: (targetId: string, effectorId: string) => void;
  /** "Jam all available regulus" handler. */
  handleMitigateAll: (targetId?: string) => void;
  /**
   * Jam-fails-on-attempt flow (demo): marks the target's
   * `mitigationStatus` as `'failed'` and toasts the malfunction so
   * the card surfaces the recommended Gotcha net fallback.
   */
  handleMitigateFail: (targetId: string, effectorId: string) => void;
  /** Gotcha net-throw flow — captures the target after a short throw. */
  handleThrowNet: (targetId: string, gotchaId: string) => void;

  /** Single-launcher point-weapon flow. */
  handlePointWeapon: (targetId: string, launcherId: string) => void;
  /** Lock the pointed launcher onto the target. */
  handleLockWeapon: (targetId: string) => void;
  /**
   * Dismiss a pending lock or pointing. Releases the linked
   * launcher and resets the target's weapon-pointing status.
   */
  handleDismissLock: (targetId: string) => void;
  /** Mark the target as neutralised + release linked launcher. */
  handleCompleteMission: (targetId: string) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useEffectorWorkflow({
  setTargets,
  targets,
  initialRegulusEffectors,
  initialGotchaEffectors,
}: UseEffectorWorkflowProps): EffectorWorkflowApi {
  const t = useStrings();
  const locale = useLocale();

  const [regulusEffectors, setRegulusEffectors] =
    useState<RegulusEffector[]>(initialRegulusEffectors ?? REGULUS_EFFECTORS);

  const [gotchaEffectors, setGotchaEffectors] =
    useState<GotchaEffector[]>(initialGotchaEffectors ?? []);

  const [launcherEffectors, setLauncherEffectors] = useState<
    LauncherEffector[]
  >(() => {
    // Initial launcher names come from the catalog at mount time —
    // toggling locale at runtime won't relabel existing launchers
    // (they live in component state), only freshly-mounted dashboards
    // pick up the new language. Rare enough to skip a watcher.
    const initT = getStrings(locale);
    return [
      {
        id: "LCHR-NVT-ALPHA",
        name: initT.simulation.launchers.alpha,
        lat: 32.4626,
        lon: 34.9963,
        status: "available",
      },
      {
        id: "LCHR-NVT-BRAVO",
        name: initT.simulation.launchers.bravo,
        lat: 32.4756,
        lon: 35.0113,
        status: "available",
      },
      {
        id: "LCHR-NVT-GAMMA",
        name: initT.simulation.launchers.gamma,
        lat: 32.4506,
        lon: 35.0243,
        status: "available",
      },
    ];
  });

  const [selectedEffectorIds, setSelectedEffectorIds] = useState<
    Map<string, string>
  >(new Map());
  const [selectedLauncherIds, setSelectedLauncherIds] = useState<
    Map<string, string>
  >(new Map());

  const handleEffectorSelect = useCallback(
    (targetId: string, effectorId: string) => {
      setSelectedEffectorIds((prev) => new Map(prev).set(targetId, effectorId));
    },
    [],
  );

  const handleLauncherSelect = useCallback(
    (targetId: string, launcherId: string) => {
      setSelectedLauncherIds((prev) =>
        new Map(prev).set(targetId, launcherId),
      );
    },
    [],
  );

  // Stable ref so handlers can read fresh targets without
  // re-binding through useCallback deps each render.
  const targetsRef = useRef(targets);
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  // Track scheduled timeouts so we can clear them on unmount —
  // otherwise a panel that closes mid-flow leaks pending writes
  // back into a torn-down React tree.
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set(),
  );
  useEffect(() => {
    const pending = pendingTimeoutsRef;
    return () => {
      for (const id of pending.current) clearTimeout(id);
      pending.current.clear();
    };
  }, []);

  // ── Generic jam / point factory ───────────────────────────────────
  // Activates an asset, marks the target's status field, then after
  // `delayMs` advances both the asset and the target into their end
  // states. Used for both jam and weapon-point flows.
  const createFlowActivateHandler = useCallback(
    (config: {
      setAssets: Dispatch<SetStateAction<RegulusEffector[] | LauncherEffector[]>>;
      assetActiveStatus: string;
      targetStatusField: "mitigationStatus" | "weaponPointingStatus";
      targetAssetIdField: "mitigatingEffectorId" | "pointingLauncherId";
      startStatus: string;
      startLog: string;
      startToast: string;
      endStatus: string;
      endLog: string;
      endToast: string;
      endAssetStatus?: string;
      extraEndTargetFields?: Partial<Detection>;
      delayMs: number;
    }) =>
      (targetId: string, assetId: string) => {
        toast.success(config.startToast);
        config.setAssets((prev) =>
          (prev as Array<RegulusEffector | LauncherEffector>).map((a) =>
            a.id === assetId
              ? { ...a, status: config.assetActiveStatus, activeTargetId: targetId }
              : a,
          ) as RegulusEffector[] & LauncherEffector[],
        );
        setTargets((prev) =>
          appendLog(prev, targetId, `${config.startLog} — ${assetId}`).map(
            (tg) =>
              tg.id === targetId
                ? {
                    ...tg,
                    [config.targetStatusField]: config.startStatus,
                    [config.targetAssetIdField]: assetId,
                  }
                : tg,
          ),
        );
        const id = setTimeout(() => {
          setTargets((prev) =>
            appendLog(prev, targetId, config.endLog).map((tg) =>
              tg.id === targetId
                ? {
                    ...tg,
                    [config.targetStatusField]: config.endStatus,
                    ...config.extraEndTargetFields,
                  }
                : tg,
            ),
          );
          if (config.endAssetStatus) {
            config.setAssets((prev) =>
              (prev as Array<RegulusEffector | LauncherEffector>).map((a) =>
                a.id === assetId
                  ? {
                      ...a,
                      status: config.endAssetStatus as string,
                      activeTargetId: undefined,
                    }
                  : a,
              ) as RegulusEffector[] & LauncherEffector[],
            );
          }
          toast.success(config.endToast);
          pendingTimeoutsRef.current.delete(id);
        }, config.delayMs);
        pendingTimeoutsRef.current.add(id);
      },
    [setTargets],
  );

  // ── Jam (mitigate) ────────────────────────────────────────────────
  const handleMitigate = useMemo(
    () =>
      createFlowActivateHandler({
        setAssets: setRegulusEffectors as Dispatch<
          SetStateAction<RegulusEffector[] | LauncherEffector[]>
        >,
        assetActiveStatus: "active",
        targetStatusField: "mitigationStatus",
        targetAssetIdField: "mitigatingEffectorId",
        startStatus: "mitigating",
        startLog: t.actionLog.jamStart,
        startToast: t.toasts.jamStarted,
        endStatus: "mitigated",
        endLog: t.actionLog.jamEnd,
        endToast: t.toasts.jamEndedAwaitVerify,
        endAssetStatus: "available",
        extraEndTargetFields: {
          missionType: "jamming",
          missionStatus: "waiting_confirmation",
          activityStatus: "mitigated" as const,
        },
        delayMs: 3000,
      }),
    [createFlowActivateHandler, t],
  );

  const handleMitigateAll = useCallback(
    (targetId?: string) => {
      const available = regulusEffectors.filter((r) => r.status === "available");
      toast.success(t.toasts.jamGlobalStarted(available.length));

      setRegulusEffectors((prev) =>
        prev.map((r) =>
          r.status === "available"
            ? { ...r, status: "active" as const, activeTargetId: targetId }
            : r,
        ),
      );

      setTargets((prev) => {
        const logged = targetId
          ? appendLog(prev, targetId, t.actionLog.jamGlobal(available.length))
          : prev;
        return logged.map((tgt) => {
          if (
            JAMMABLE_STATUSES.has(tgt.status) &&
            tgt.mitigationStatus !== "mitigated"
          ) {
            return {
              ...tgt,
              mitigationStatus: "mitigating" as const,
              mitigatingEffectorId: "ALL",
            };
          }
          return tgt;
        });
      });

      const id = setTimeout(() => {
        setTargets((prev) => {
          const logged = targetId
            ? appendLog(prev, targetId, t.actionLog.jamGlobalEnd)
            : prev;
          return logged.map((tgt) =>
            tgt.mitigatingEffectorId === "ALL" &&
            tgt.mitigationStatus === "mitigating"
              ? {
                  ...tgt,
                  mitigationStatus: "mitigated" as const,
                  activityStatus: "mitigated" as const,
                  missionType: "jamming" as const,
                  missionStatus: "waiting_confirmation" as const,
                }
              : tgt,
          );
        });
        setRegulusEffectors((prev) =>
          prev.map((r) => ({
            ...r,
            status: "available" as const,
            activeTargetId: undefined,
          })),
        );
        toast.success(t.toasts.jamEndedAwaitVerify);
        pendingTimeoutsRef.current.delete(id);
      }, 3000);
      pendingTimeoutsRef.current.add(id);
    },
    [regulusEffectors, setTargets, t],
  );

  // ── Weapon point ──────────────────────────────────────────────────
  const handlePointWeapon = useMemo(
    () =>
      createFlowActivateHandler({
        setAssets: setLauncherEffectors as Dispatch<
          SetStateAction<RegulusEffector[] | LauncherEffector[]>
        >,
        assetActiveStatus: "pointing",
        targetStatusField: "weaponPointingStatus",
        targetAssetIdField: "pointingLauncherId",
        startStatus: "pointing",
        startLog: t.actionLog.weaponStart,
        startToast: t.toasts.weaponPointing,
        endStatus: "pointed",
        endLog: t.actionLog.weaponEnd,
        endToast: t.toasts.weaponPointed,
        delayMs: 3000,
      }),
    [createFlowActivateHandler, t],
  );

  const handleLockWeapon = useCallback(
    (targetId: string) => {
      setTargets((prev) =>
        appendLog(prev, targetId, t.actionLog.locking).map((tgt) =>
          tgt.id === targetId
            ? { ...tgt, weaponPointingStatus: "locking" as const }
            : tgt,
        ),
      );

      const id = setTimeout(() => {
        setTargets((prev) => {
          const tgt = prev.find((tg) => tg.id === targetId);
          const launcherId = tgt?.pointingLauncherId;
          if (launcherId) {
            setLauncherEffectors((lp) =>
              lp.map((l) =>
                l.id === launcherId ? { ...l, status: "locked" as const } : l,
              ),
            );
          }
          return appendLog(prev, targetId, t.actionLog.locked).map((tg) =>
            tg.id === targetId
              ? { ...tg, weaponPointingStatus: "locked" as const }
              : tg,
          );
        });
        toast.success(t.toasts.lockedReadyForFire);
        pendingTimeoutsRef.current.delete(id);
      }, 1500);
      pendingTimeoutsRef.current.add(id);
    },
    [setTargets, t],
  );

  const handleDismissLock = useCallback(
    (targetId: string) => {
      const target = targetsRef.current.find((tg) => tg.id === targetId);
      const wasLocked = target?.weaponPointingStatus === "locked";
      const launcherId = target?.pointingLauncherId;
      if (launcherId) {
        setLauncherEffectors((prev) =>
          prev.map((l) =>
            l.id === launcherId
              ? {
                  ...l,
                  status: "available" as const,
                  activeTargetId: undefined,
                  bearingDeg: undefined,
                }
              : l,
          ),
        );
      }
      setTargets((prev) =>
        appendLog(
          prev,
          targetId,
          wasLocked
            ? t.actionLog.lockCancelled
            : t.actionLog.pointingCancelled,
        ).map((tg) =>
          tg.id === targetId
            ? {
                ...tg,
                weaponPointingStatus: "idle" as const,
                pointingLauncherId: undefined,
              }
            : tg,
        ),
      );
      toast.info(
        wasLocked ? t.toasts.lockCancelled : t.toasts.pointingCancelled,
      );
    },
    [setTargets, t],
  );

  // ── Jam fails on attempt (demo) ───────────────────────────────────
  // Runs the same "jamming…" spinner as a real jam, then fails: the
  // effector drops offline and the target's `mitigationStatus` flips to
  // `'failed'` (never `'mitigated'`, so the card stays in the active
  // list and surfaces the recommended Gotcha net fallback).
  const handleMitigateFail = useCallback(
    (targetId: string, effectorId: string) => {
      toast.success(t.toasts.jamStarted);
      setRegulusEffectors((prev) =>
        prev.map((r) =>
          r.id === effectorId
            ? { ...r, status: "active" as const, activeTargetId: targetId }
            : r,
        ),
      );
      setTargets((prev) =>
        appendLog(prev, targetId, `${t.actionLog.jamStart} — ${effectorId}`).map(
          (tg) =>
            tg.id === targetId
              ? {
                  ...tg,
                  mitigationStatus: "mitigating" as const,
                  mitigatingEffectorId: effectorId,
                }
              : tg,
        ),
      );

      const id = setTimeout(() => {
        toast.error(t.toasts.jamFailed(effectorId));
        setRegulusEffectors((prev) =>
          prev.map((r) =>
            r.id === effectorId
              ? { ...r, status: "inactive" as const, activeTargetId: undefined }
              : r,
          ),
        );
        setTargets((prev) =>
          appendLog(
            prev,
            targetId,
            `${t.actionLog.jamFailed} — ${effectorId}`,
          ).map((tg) =>
            tg.id === targetId
              ? { ...tg, mitigationStatus: "failed" as const }
              : tg,
          ),
        );
        pendingTimeoutsRef.current.delete(id);
      }, 3000);
      pendingTimeoutsRef.current.add(id);
    },
    [setTargets, t],
  );

  // ── Gotcha net throw (demo) ───────────────────────────────────────
  // Bespoke (not via `createFlowActivateHandler`) so `missionType`
  // flips to `'net_capture'` at the *start* — the gotcha engagement
  // flow keys its phase off it, and the card video starts the moment
  // the net is thrown rather than only at capture.
  const handleThrowNet = useCallback(
    (targetId: string, gotchaId: string) => {
      toast.success(t.toasts.netStarted);
      setGotchaEffectors((prev) =>
        prev.map((g) =>
          g.id === gotchaId
            ? { ...g, status: "active" as const, activeTargetId: targetId }
            : g,
        ),
      );
      setTargets((prev) =>
        appendLog(prev, targetId, `${t.actionLog.netStart} — ${gotchaId}`).map(
          (tg) =>
            tg.id === targetId
              ? {
                  ...tg,
                  missionType: "net_capture" as const,
                  mitigationStatus: "mitigating" as const,
                  mitigatingEffectorId: gotchaId,
                }
              : tg,
        ),
      );

      const id = setTimeout(() => {
        setTargets((prev) =>
          appendLog(prev, targetId, t.actionLog.netEnd).map((tg) =>
            tg.id === targetId
              ? {
                  ...tg,
                  mitigationStatus: "mitigated" as const,
                  activityStatus: "mitigated" as const,
                }
              : tg,
          ),
        );
        setGotchaEffectors((prev) =>
          prev.map((g) =>
            g.id === gotchaId
              ? { ...g, status: "available" as const, activeTargetId: undefined }
              : g,
          ),
        );
        toast.success(t.toasts.netCaptured);
        pendingTimeoutsRef.current.delete(id);
      }, 3000);
      pendingTimeoutsRef.current.add(id);
    },
    [setTargets, t],
  );

  const handleCompleteMission = useCallback(
    (targetId: string) => {
      const target = targetsRef.current.find((tg) => tg.id === targetId);
      const launcherId = target?.pointingLauncherId;
      if (launcherId) {
        setLauncherEffectors((prev) =>
          prev.map((l) =>
            l.id === launcherId
              ? {
                  ...l,
                  status: "available" as const,
                  activeTargetId: undefined,
                  bearingDeg: undefined,
                }
              : l,
          ),
        );
      }
      setTargets((prev) =>
        prev.map((tg) =>
          tg.id !== targetId
            ? tg
            : {
                ...tg,
                missionStatus: "complete" as const,
                status: "event_neutralized" as const,
                activityStatus: "mitigated" as const,
                weaponPointingStatus: "idle" as const,
                pointingLauncherId: undefined,
              },
        ),
      );
      toast.success(t.toasts.missionComplete);
    },
    [setTargets, t],
  );

  return {
    regulusEffectors,
    setRegulusEffectors,
    launcherEffectors,
    setLauncherEffectors,
    gotchaEffectors,
    setGotchaEffectors,
    selectedEffectorIds,
    selectedLauncherIds,
    handleEffectorSelect,
    handleLauncherSelect,
    handleMitigate,
    handleMitigateAll,
    handleMitigateFail,
    handleThrowNet,
    handlePointWeapon,
    handleLockWeapon,
    handleDismissLock,
    handleCompleteMission,
  };
}
