import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TargetCard } from '@/primitives/TargetCard';
import { CardHeader } from '@/primitives/CardHeader';
import { CardActions } from '@/primitives/CardActions';
import { CardTimeline } from '@/primitives/CardTimeline';
import { CardDetails } from '@/primitives/CardDetails';
import { CardSensors } from '@/primitives/CardSensors';
import { CardMedia } from '@/primitives/CardMedia';
import { CardLog } from '@/primitives/CardLog';
import { CardClosure } from '@/primitives/CardClosure';
import { StatusChip } from '@/primitives/StatusChip';
import { FilterBar } from '@/primitives/FilterBar';
import { NewUpdatesPill } from '@/primitives/NewUpdatesPill';
import { AccordionSection } from '@/primitives/AccordionSection';
import { TelemetryRow } from '@/primitives/TelemetryRow';
import {
  Crosshair,
  Radar,
  Hand,
  Zap,
} from '@/lib/icons/central';
import { useCardSlots, type CardCallbacks, type CardContext } from './useCardSlots';
import { useTargetFilters } from './useTargetFilters';
import { getActivityStatus, isCompletedActivityStatus, useActivityStatus } from './useActivityStatus';
import { useStrings, type Strings } from '@/lib/intl';

function scrollBehaviorForMotionPreference(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type DetectionType = 'uav' | 'missile' | 'aircraft' | 'naval' | 'ground_vehicle' | 'unknown';
export type EntityStage = 'raw_detection' | 'classified';
export type ClassifiedType = 'drone' | 'bird' | 'aircraft' | 'car' | 'unknown';
export type MitigationStatus = 'idle' | 'mitigating' | 'mitigated' | 'failed';
export type WeaponPointingStatus = 'idle' | 'pointing' | 'pointed' | 'locking' | 'locked';
export type BdaStatus = 'pending' | 'looking' | 'stabilizing' | 'observing' | 'complete';
export type ActivityStatus = 'active' | 'recently_active' | 'timeout' | 'dismissed' | 'mitigated';

export interface ContributingSensor {
  sensorId: string;
  sensorType: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
}

export interface TrailPoint {
  lat: number;
  lon: number;
  timestamp: string;
}

export interface RegulusEffector {
  id: string;
  name: string;
  lat: number;
  lon: number;
  coverageRadiusM: number;
  status: 'available' | 'active' | 'inactive';
  activeTargetId?: string;
}

export interface LauncherEffector {
  id: string;
  name: string;
  lat: number;
  lon: number;
  status: 'available' | 'pointing' | 'locked' | 'inactive';
  activeTargetId?: string;
  bearingDeg?: number;
}

/**
 * Gotcha net-throw effector. Fixed ground installation with an
 * omnidirectional (360°) detect/act ring — the `coverageRadiusM`
 * doubles as the FOV. Same runtime shape as {@link RegulusEffector}
 * so the map marker + engagement plumbing can treat the two
 * uniformly. Demo-only: seeded from `demoAssets.ts`, never present
 * in the production asset registries.
 */
export interface GotchaEffector {
  id: string;
  name: string;
  lat: number;
  lon: number;
  coverageRadiusM: number;
  status: 'available' | 'active' | 'inactive';
  activeTargetId?: string;
}

export interface Detection {
  id: string;
  name: string;
  type: DetectionType;
  status: 'detection' | 'tracking' | 'event' | 'event_neutralized' | 'suspicion' | 'expired' | 'event_resolved';
  missionStatus?: 'idle' | 'planning' | 'executing' | 'waiting_confirmation' | 'complete' | 'aborted';
  missionType?: 'intercept' | 'surveillance' | 'attack' | 'jamming' | 'net_capture';
  timestamp: string;
  createdAtMs?: number;
  coordinates: string;
  distance: string;
  isNew?: boolean;
  missionSteps?: string[];
  missionProgress?: number;
  detectedBySensors?: { id: string; typeLabel: string; latitude: number; longitude: number }[];
  dismissReason?: string;
  flowPhase?: 'trigger' | 'orient' | 'investigate' | 'decide' | 'act' | 'closure';
  flowType?: number;
  controlledByUser?: boolean;
  sensorMode?: 'day' | 'thermal';
  droneDeployment?: DroneDeployment;
  plannedMission?: PlannedMission;
  actionLog?: { time: string; label: string }[];
  entityStage?: EntityStage;
  confidence?: number;
  classifiedType?: ClassifiedType;
  trail?: TrailPoint[];
  contributingSensors?: ContributingSensor[];
  mitigationStatus?: MitigationStatus;
  mitigatingEffectorId?: string;
  /**
   * Set while a jammed drone is breaking off and drifting away (demo
   * post-jam beat). Drives the muted "neutralized" marker read on the
   * map without affecting production drones awaiting BDA.
   */
  neutralizedDrift?: boolean;
  /**
   * Explicit travel heading in degrees (0 = north, clockwise), written
   * by the motion sim each tick. The map marker prefers this over the
   * trail-derived heading so a fast-turning drone faces exactly where
   * it's going with no regression lag.
   */
  headingDeg?: number;
  weaponPointingStatus?: WeaponPointingStatus;
  pointingLauncherId?: string;
  bdaStatus?: BdaStatus;
  activityStatus?: ActivityStatus;
  alarmZone?: 'red' | 'yellow' | 'none';
  priority?: number;
  lastSeenAt?: string;
  lastSeenCoordinates?: string;
  altitude?: string;
  laserDistance?: string;
  laserAzimuth?: string;
  laserElevation?: string;
  laserRange?: string;
}

export interface MissionWaypoint {
  lat: number;
  lon: number;
  label: string;
  stayTimeS: number;
}

export type MissionPhaseType = 'planning' | 'active' | 'paused' | 'override' | 'completed';

export interface PlannedMission {
  missionType: 'drone' | 'ptz';
  waypoints: MissionWaypoint[];
  loop: boolean;
  currentWaypointIdx: number;
  segmentProgress: number;
  phase: MissionPhaseType;
  overrideAutoResumeS?: number;
  durationMinutes: number;
  repetitions: number;
  currentRepetition: number;
  selectedAssetId?: string;
  scanBearings?: number[];
  dwellTimeS?: number;
}

export type DronePhase = 'select' | 'takeoff' | 'flying' | 'on_station' | 'low_battery' | 'rtb' | 'landed';

export interface DroneDeployment {
  droneId: string;
  hiveId: string;
  hiveLat: number;
  hiveLon: number;
  targetLat: number;
  targetLon: number;
  currentLat: number;
  currentLon: number;
  phase: DronePhase;
  battery: number;
  overridden: boolean;
}

export type IncidentOutcome =
  | 'Handled'
  | 'Escalated'
  | 'Ignored_Animal'
  | 'Ignored_AuthorizedVehicle'
  | 'Ignored_Vegetation'
  | 'Ignored_SensorError'
  | 'Ignored_OwnForces'
  | 'Ignored_PoorDetection';

/**
 * Localised incident-closure outcomes for the close-event picker. Built
 * from the active strings catalog so the same Detection in Hebrew vs
 * English shows reasons in the operator's language. Consumers call
 * this with whichever `t` they're holding (typically from
 * `useStrings()`).
 */
export function getIncidentOutcomes(t: Strings): { value: IncidentOutcome; label: string }[] {
  const r = t.listOfSystems.closeReasons;
  return [
    { value: 'Handled', label: r.handled },
    { value: 'Escalated', label: r.escalated },
    { value: 'Ignored_Animal', label: r.ignoredAnimal },
    { value: 'Ignored_AuthorizedVehicle', label: r.ignoredAuthorizedVehicle },
    { value: 'Ignored_Vegetation', label: r.ignoredVegetation },
    { value: 'Ignored_SensorError', label: r.ignoredSensorError },
    { value: 'Ignored_OwnForces', label: r.ignoredOwnForces },
    { value: 'Ignored_PoorDetection', label: r.ignoredPoorDetection },
  ];
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Localised playbook list for the flow-1 close menu. Same pattern as
 * {@link getIncidentOutcomes} — built lazily from the catalog rather
 * than baked at module scope so the active locale wins.
 */
export function getFlow1Playbooks(t: Strings): Playbook[] {
  const p = t.listOfSystems.playbooks;
  return [
    { id: 'fast-inspect', name: p.fastInspect.name, description: p.fastInspect.description, riskLevel: 'low' },
    { id: 'full-response', name: p.fullResponse.name, description: p.fullResponse.description, riskLevel: 'high' },
    { id: 'transfer', name: p.transfer.name, description: p.transfer.description, riskLevel: 'medium' },
  ];
}

/**
 * Localised "dismiss reason" quick-pick chips. Returned as a tuple of
 * the four canonical values (irrelevant / drill / misidentification /
 * other) — the order is significant for keyboard nav.
 */
export function getDismissReasons(t: Strings): readonly [string, string, string, string] {
  const r = t.listOfSystems.closeReasons;
  return [r.irrelevant, r.drill, r.misidentification, r.other] as const;
}

export const MOCK_TARGETS: Detection[] = [];

// ─── Status chip builder ────────────────────────────────────────────────────

const ACTIVITY_STATUS_CHIP_COLOR: Record<ActivityStatus, 'green' | 'red' | 'orange' | 'gray'> = {
  active: 'green',
  recently_active: 'orange',
  timeout: 'gray',
  dismissed: 'gray',
  mitigated: 'green',
};

function buildStatusChip(target: Detection, labels: Record<ActivityStatus, string>) {
  const status = getActivityStatus(target);
  const label = labels[status];
  const color = ACTIVITY_STATUS_CHIP_COLOR[status];
  return <StatusChip label={label} color={color} />;
}

// ─── Unified Card ───────────────────────────────────────────────────────────

const UnifiedCard = React.memo(function UnifiedCard({
  target,
  isOpen,
  onToggle,
  callbacks,
  ctx,
  onFocusTarget,
  thinMode,
}: {
  target: Detection;
  isOpen: boolean;
  onToggle: (target: Detection) => void;
  callbacks: CardCallbacks;
  ctx: CardContext;
  onFocusTarget?: (targetId: string) => void;
  thinMode?: boolean;
}) {
  const slots = useCardSlots(target, callbacks, ctx);
  const i18n = useStrings();
  const los = i18n.listOfSystems;
  const statusLabels = i18n.targetFilters.activityStatusLabels;
  const isSuccess = target.status === 'event_resolved' || target.status === 'event_neutralized';
  const isExpired = target.status === 'expired';
  const showDetails = !isSuccess && !isExpired && target.flowType !== 4;
  const hasActions = (target.actionLog?.length ?? 0) > 0;

  return (
    <TargetCard
      accent={slots.accent}
      completed={slots.completed}
      open={isOpen}
      onToggle={() => onToggle(target)}
      onFocus={onFocusTarget ? () => onFocusTarget(target.id) : undefined}
      header={
        <CardHeader
          {...slots.header}
          status={buildStatusChip(target, statusLabels)}
          open={isOpen}
        />
      }
    >
      {slots.closureType && (
        <div className="px-2 pt-1.5 flex items-center gap-1">
          {slots.closureType === 'manual' ? (
            <div className="flex items-center gap-1 text-[9px] text-slate-9">
              <Hand size={10} className="text-slate-9" aria-hidden="true" />
              <span>{los.closeManual}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[9px] text-slate-9">
              <Zap size={10} className="text-slate-9" aria-hidden="true" />
              <span>{los.closeAuto}</span>
            </div>
          )}
        </div>
      )}

      {slots.media && <CardMedia {...slots.media} />}

      {slots.actions.length > 0 && (
        <CardActions
          actions={slots.actions}
          confirmLabel={los.confirm}
          cancelLabel={los.cancel}
          finalConfirmTitle={los.finalConfirmTitle}
          finalConfirmLabel={los.finalConfirmLabel}
        />
      )}

      {!thinMode && slots.timeline.length > 0 && (
        <div className="px-2">
          <CardTimeline steps={slots.timeline} />
        </div>
      )}

      {showDetails && (
        <CardDetails
          rows={slots.details.rows}
          classification={slots.details.classification}
          title={los.telemetryTitle}
          copyLabel={los.telemetryCopy}
        />
      )}

      {slots.laserPosition.length > 0 && (
        <AccordionSection title={los.laserRelativeLocation} icon={Crosshair}>
          <div className="w-full py-1">
            <div className="grid grid-cols-3 grid-rows-1 gap-0">
              {slots.laserPosition.map((row, idx) => (
                <TelemetryRow key={idx} label={row.label} value={row.value} />
              ))}
            </div>
          </div>
        </AccordionSection>
      )}

      {slots.sensors.length > 0 && (
        <AccordionSection title={los.sensors(slots.sensors.length)} icon={Radar}>
          <div className="px-0 pb-2 w-full pt-2">
            <CardSensors
              sensors={slots.sensors}
              label=""
              onSensorHover={callbacks.onSensorHover}
              onSensorClick={callbacks.onSensorFocus}
            />
          </div>
        </AccordionSection>
      )}

      {!thinMode && slots.log.length > 0 && (
        <CardLog
          entries={slots.log}
          title={los.logTitle}
          moreLabel={los.logMore}
        />
      )}

      {slots.closure && (
        <CardClosure
          outcomes={slots.closure.outcomes}
          onSelect={slots.closure.onSelect}
          title={los.closeEventTitle}
        />
      )}
    </TargetCard>
  );
});

// ─── Legacy exports (backward-compatible wrappers) ──────────────────────────

/** @deprecated Use UnifiedCard with TargetCard + CardHeader instead */
export function SystemCard({
  target,
  children,
  isOpen,
  onToggle,
}: {
  target: Detection;
  children?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  loopActive?: boolean;
  onToggleLoop?: () => void;
  quickAction?: { label: string; variant: 'fill' | 'ghost' | 'danger' | 'warning'; icon?: React.ElementType; onClick: (e: React.MouseEvent) => void };
}) {
  const statusLabels = useStrings().targetFilters.activityStatusLabels;
  const accent = (() => {
    if (target.mitigationStatus === 'mitigating') return 'mitigating' as const;
    if (target.status === 'event_resolved' || target.status === 'event_neutralized') return 'resolved' as const;
    if (target.status === 'detection' || target.status === 'event') return 'detection' as const;
    if (target.status === 'tracking') return 'tracking' as const;
    if (target.status === 'suspicion') return 'suspicion' as const;
    return 'idle' as const;
  })();

  return (
    <TargetCard
      accent={accent}
      completed={target.status === 'event_resolved' || target.status === 'event_neutralized'}
      open={isOpen}
      onToggle={onToggle}
      header={
        <CardHeader
          title={target.name}
          status={buildStatusChip(target, statusLabels)}
          open={isOpen}
        />
      }
    >
      {children}
    </TargetCard>
  );
}

/** @deprecated Use UnifiedCard with useCardSlots instead */
export function ExpandedTargetDetails({ target }: { target: Detection; [key: string]: any }) {
  return <div className="p-2 text-xs text-slate-10">Use ComposedCard instead</div>;
}

// ─── List Component ─────────────────────────────────────────────────────────

export interface ListOfSystemsProps {
  className?: string;
  targets?: Detection[];
  activeTargetId?: string | null;
  onTargetClick?: (target: Detection) => void;
  onVerify?: (targetId: string, action: 'intercept' | 'surveillance' | 'investigate') => void;
  onEngage?: (targetId: string, type: 'jamming' | 'attack') => void;
  onDismiss?: (targetId: string, reason?: string) => void;
  onSensorHover?: (sensorId: string | null) => void;
  onCancelMission?: (targetId: string) => void;
  onCompleteMission?: (targetId: string) => void;
  onSendDroneVerification?: (targetId: string) => void;
  droneVerifyingTargetId?: string | null;
  onCameraLookAt?: (targetId: string, cameraId: string) => void;
  onTakeControl?: (targetId: string) => void;
  onReleaseControl?: (targetId: string) => void;
  onSensorModeChange?: (targetId: string, mode: 'day' | 'thermal') => void;
  onPlaybookSelect?: (targetId: string, playbookId: string) => void;
  onClosureOutcome?: (targetId: string, outcome: IncidentOutcome) => void;
  onAdvanceFlowPhase?: (targetId: string) => void;
  nearbyCameras?: { id: string; typeLabel: string; distanceM: number }[];
  nearbyHives?: { id: string; latitude: number; longitude: number; distanceM: number; battery: number; status: string }[];
  onEscalateCreatePOI?: (targetId: string) => void;
  onEscalateSendDrone?: (targetId: string) => void;
  onDroneSelect?: (targetId: string, hiveId: string) => void;
  onDroneOverride?: (targetId: string) => void;
  onDroneResume?: (targetId: string) => void;
  onDroneRTB?: (targetId: string) => void;
  onMissionActivate?: (targetId: string) => void;
  onMissionPause?: (targetId: string) => void;
  onMissionResume?: (targetId: string) => void;
  onMissionOverride?: (targetId: string) => void;
  onMissionCancel?: (targetId: string) => void;
  missionPlanningMode?: { targetId: string; missionType: 'drone' | 'ptz'; waypoints: { lat: number; lon: number; label: string; stayTimeS: number }[]; loop: boolean; repetitions: number; dwellTimeS?: number; selectedCameraId?: string; scanCenterDeg?: number; scanWidthDeg?: number; scanSteps?: number } | null;
  onPlanningRemoveWaypoint?: (idx: number) => void;
  onPlanningToggleLoop?: () => void;
  onPlanningFinalize?: () => void;
  onPlanningUpdateWaypoint?: (idx: number, updates: Partial<{ lat: number; lon: number; label: string; stayTimeS: number }>) => void;
  onPlanningSetRepetitions?: (n: number) => void;
  onPlanningSetDwellTime?: (seconds: number) => void;
  onPlanningSetScanCenter?: (deg: number) => void;
  onPlanningSetScanWidth?: (deg: number) => void;
  onPlanningSetScanSteps?: (n: number) => void;
  onPlanningSelectCamera?: (cameraId: string) => void;
  onPlanningZoomCameras?: () => void;
  onMitigate?: (targetId: string, effectorId: string) => void;
  onMitigateAll?: (targetId: string) => void;
  onEffectorSelect?: (targetId: string, effectorId: string) => void;
  regulusEffectors?: RegulusEffector[];
  selectedEffectorIds?: Map<string, string>;
  onPointWeapon?: (targetId: string, launcherId: string) => void;
  onLockWeapon?: (targetId: string) => void;
  onDismissLock?: (targetId: string) => void;
  onLauncherSelect?: (targetId: string, launcherId: string) => void;
  launcherEffectors?: LauncherEffector[];
  selectedLauncherIds?: Map<string, string>;
  onThrowNet?: (targetId: string, gotchaId: string) => void;
  /** Generic flow assets keyed by flow ID — use for new flows without adding individual props */
  flowAssets?: Record<string, { id: string; name: string; lat: number; lon: number; status: string }[]>;
  /** Generic flow selected asset IDs keyed by flow ID */
  flowSelectedIds?: Record<string, Map<string, string>>;
  onBdaOutcome?: (targetId: string, outcome: 'neutralized' | 'active' | 'lost') => void;
  onBdaCamera?: (targetId: string) => void;
  cameraActiveTargetId?: string | null;
  cameraPointingTargetId?: string | null;
  allCamerasBusyForTarget?: string | null;
  controlRequestCountdown?: number | null;
  controlRequestTargetId?: string | null;
  onRequestCameraControl?: (targetId: string) => void;
  onSensorFocus?: (sensorId: string) => void;
  onTargetFocus?: (targetId: string) => void;
  onTargetHover?: (targetId: string | null) => void;
  thinMode?: boolean;
}

export default function ListOfSystems({
  className = '',
  targets = MOCK_TARGETS,
  activeTargetId,
  onTargetClick,
  onVerify,
  onEngage,
  onDismiss,
  onCancelMission,
  onCompleteMission,
  onSendDroneVerification,
  droneVerifyingTargetId,
  onSensorHover,
  onCameraLookAt,
  onTakeControl,
  onReleaseControl,
  onSensorModeChange,
  onPlaybookSelect,
  onClosureOutcome,
  onAdvanceFlowPhase,
  nearbyCameras,
  nearbyHives,
  onEscalateCreatePOI,
  onEscalateSendDrone,
  onDroneSelect,
  onDroneOverride,
  onDroneResume,
  onDroneRTB,
  onMissionActivate,
  onMissionPause,
  onMissionResume,
  onMissionOverride,
  onMissionCancel,
  onMitigate,
  onMitigateAll,
  onEffectorSelect,
  regulusEffectors,
  selectedEffectorIds,
  onPointWeapon,
  onLockWeapon,
  onDismissLock,
  onLauncherSelect,
  launcherEffectors,
  selectedLauncherIds,
  onThrowNet,
  flowAssets,
  flowSelectedIds,
  onBdaOutcome,
  onBdaCamera,
  cameraActiveTargetId,
  cameraPointingTargetId,
  allCamerasBusyForTarget,
  controlRequestCountdown,
  controlRequestTargetId,
  onRequestCameraControl,
  onSensorFocus,
  onTargetFocus,
  onTargetHover,
  thinMode,
}: ListOfSystemsProps) {
  const i18n = useStrings();
  const los = i18n.listOfSystems;
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [newArrivalIds, setNewArrivalIds] = useState<string[]>([]);
  const [isScrolledToTop, setIsScrolledToTop] = useState(true);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const seenTargetIdsRef = useRef<Set<string>>(new Set());
  const hasHydratedTargetsRef = useRef(false);

  const uniqueTargets = useMemo(() => {
    const seen = new Set<string>();
    return targets.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [targets]);

  const activityStatuses = useActivityStatus(uniqueTargets);

  const {
    filters,
    activeFilterCount,
    availableSensors,
    applyFilters,
    updateFilter,
    resetFilters,
    toggleSensorId,
    toggleActivityStatus,
    setQuery,
    filterDefs,
    selections,
    onFilterChange,
  } = useTargetFilters(uniqueTargets, activeTab);

  const activeTargets = useMemo(() => (
    uniqueTargets.filter((target) => {
      const activityStatus = activityStatuses.get(target.id) ?? getActivityStatus(target);
      return !isCompletedActivityStatus(activityStatus);
    })
  ), [activityStatuses, uniqueTargets]);

  const completedTargets = useMemo(() => (
    uniqueTargets.filter((target) => {
      const activityStatus = activityStatuses.get(target.id) ?? getActivityStatus(target);
      return isCompletedActivityStatus(activityStatus);
    })
  ), [activityStatuses, uniqueTargets]);

  const filteredActiveTargets = applyFilters(activeTargets);
  const filteredCompletedTargets = applyFilters(completedTargets);

  const activeTargetsById = useMemo(
    () => new Map(activeTargets.map((target) => [target.id, target])),
    [activeTargets],
  );

  useEffect(() => {
    if (!hasHydratedTargetsRef.current) {
      seenTargetIdsRef.current = new Set(uniqueTargets.map((target) => target.id));
      hasHydratedTargetsRef.current = true;
      return;
    }

    const newTargets = activeTargets.filter((target) => !seenTargetIdsRef.current.has(target.id));
    if (newTargets.length === 0) return;

    newTargets.forEach((target) => {
      seenTargetIdsRef.current.add(target.id);
    });

    setNewArrivalIds((prev) => {
      const next = [...prev];
      for (const target of newTargets) {
        if (!next.includes(target.id)) {
          next.unshift(target.id);
        }
      }
      return next;
    });
  }, [activeTargets, uniqueTargets]);

  useEffect(() => {
    setNewArrivalIds((prev) => prev.filter((id) => activeTargetsById.has(id)));
  }, [activeTargetsById]);

  useEffect(() => {
    if (!activeTargetId) return;
    setNewArrivalIds((prev) => prev.filter((id) => id !== activeTargetId));
  }, [activeTargetId]);

  useEffect(() => {
    if (!activeTargetId && newArrivalIds.length > 0) {
      setNewArrivalIds([]);
      listScrollRef.current?.scrollTo({ top: 0, behavior: scrollBehaviorForMotionPreference() });
    }
  }, [activeTargetId, newArrivalIds.length]);

  const visibleArrivalTargets = useMemo(() => {
    const filteredIds = new Set(filteredActiveTargets.map((target) => target.id));
    return newArrivalIds
      .map((id) => activeTargetsById.get(id))
      .filter((target): target is Detection => !!target && filteredIds.has(target.id));
  }, [activeTargetsById, filteredActiveTargets, newArrivalIds]);

  const visibleArrivalIdSet = useMemo(
    () => new Set(visibleArrivalTargets.map((target) => target.id)),
    [visibleArrivalTargets],
  );

  const mainActiveTargets = useMemo(
    () => filteredActiveTargets.filter((target) => !visibleArrivalIdSet.has(target.id)),
    [filteredActiveTargets, visibleArrivalIdSet],
  );

  const activeCount = activeTargets.length;
  const completedCount = completedTargets.length;

  const handleTargetToggle = useCallback(
    (target: Detection) => {
      setNewArrivalIds((prev) => prev.filter((id) => id !== target.id));
      onTargetClick?.(target);
    },
    [onTargetClick],
  );

  // Per-target cache of the card's `callbacks`/`ctx` objects so a
  // memoized `UnifiedCard` can bail out of the sim-tick re-render.
  // Without this, every row got fresh `callbacks`/`ctx` objects on
  // each parent render and re-ran `useCardSlots` even when only one
  // target moved. The cache is keyed by target id; entries reuse their
  // object identity until a value fingerprint changes. The `useMemo`
  // resets the cache whenever any upstream handler or shared list
  // (effectors, flow assets, nearby sensors) changes identity.
  const cardDataCacheRef = useRef(
    new Map<string, { fingerprint: string; data: { callbacks: CardCallbacks; ctx: CardContext } }>(),
  );
  const getCardData = useMemo(() => {
    cardDataCacheRef.current = new Map();
    return (target: Detection): { callbacks: CardCallbacks; ctx: CardContext } => {
      const selectedEffectorId =
        selectedEffectorIds?.get(target.id) ?? flowSelectedIds?.['regulusEffectors']?.get(target.id);
      const selectedLauncherId =
        selectedLauncherIds?.get(target.id) ?? flowSelectedIds?.['launcherEffectors']?.get(target.id);
      const isDroneVerifying = droneVerifyingTargetId === target.id;
      const isCameraActive = cameraActiveTargetId === target.id;
      const isCameraPointing = cameraPointingTargetId === target.id;
      const allCamerasBusy = allCamerasBusyForTarget === target.id;
      const controlCountdown = controlRequestTargetId === target.id ? controlRequestCountdown : null;
      const fingerprint = [
        target.flowType,
        isDroneVerifying,
        isCameraActive,
        isCameraPointing,
        allCamerasBusy,
        controlCountdown,
        selectedEffectorId ?? '',
        selectedLauncherId ?? '',
      ].join('|');

      const cached = cardDataCacheRef.current.get(target.id);
      if (cached && cached.fingerprint === fingerprint) return cached.data;

      const callbacks: CardCallbacks = {
        onVerify: (action) => onVerify?.(target.id, action),
        onEngage: (type) => onEngage?.(target.id, type),
        onDismiss: (reason) => onDismiss?.(target.id, reason),
        onCancelMission: () => onCancelMission?.(target.id),
        onCompleteMission: () => onCompleteMission?.(target.id),
        onSendDroneVerification: () => onSendDroneVerification?.(target.id),
        onSensorHover,
        onCameraLookAt: (camId) => onCameraLookAt?.(target.id, camId),
        onTakeControl: () => onTakeControl?.(target.id),
        onReleaseControl: () => onReleaseControl?.(target.id),
        onSensorModeChange: (mode) => onSensorModeChange?.(target.id, mode),
        onPlaybookSelect: (pbId) => onPlaybookSelect?.(target.id, pbId),
        onClosureOutcome: (outcome) => onClosureOutcome?.(target.id, outcome),
        onAdvanceFlowPhase: () => onAdvanceFlowPhase?.(target.id),
        onEscalateCreatePOI: () => onEscalateCreatePOI?.(target.id),
        onEscalateSendDrone: () => onEscalateSendDrone?.(target.id),
        onDroneSelect: (hiveId) => onDroneSelect?.(target.id, hiveId),
        onDroneOverride: () => onDroneOverride?.(target.id),
        onDroneResume: () => onDroneResume?.(target.id),
        onDroneRTB: () => onDroneRTB?.(target.id),
        onMissionActivate: () => onMissionActivate?.(target.id),
        onMissionPause: () => onMissionPause?.(target.id),
        onMissionResume: () => onMissionResume?.(target.id),
        onMissionOverride: () => onMissionOverride?.(target.id),
        onMissionCancel: () => onMissionCancel?.(target.id),
        onMitigate: (effectorId) => onMitigate?.(target.id, effectorId),
        onMitigateAll: () => onMitigateAll?.(target.id),
        onEffectorSelect: (effectorId) => onEffectorSelect?.(target.id, effectorId),
        onPointWeapon: (launcherId) => onPointWeapon?.(target.id, launcherId),
        onLockWeapon: () => onLockWeapon?.(target.id),
        onDismissLock: () => onDismissLock?.(target.id),
        onLauncherSelect: (launcherId) => onLauncherSelect?.(target.id, launcherId),
        onThrowNet: (gotchaId) => onThrowNet?.(target.id, gotchaId),
        onBdaOutcome: (outcome) => onBdaOutcome?.(target.id, outcome),
        onBdaCamera: () => onBdaCamera?.(target.id),
        onRequestCameraControl: () => onRequestCameraControl?.(target.id),
        onSensorFocus,
      };

      const ctx: CardContext = {
        isDroneVerifying,
        isCameraActive,
        isCameraPointing,
        allCamerasBusy,
        controlRequestCountdown: controlCountdown,
        regulusEffectors: regulusEffectors ?? (flowAssets?.['regulusEffectors'] as RegulusEffector[] | undefined),
        selectedEffectorId,
        launcherEffectors: launcherEffectors ?? (flowAssets?.['launcherEffectors'] as LauncherEffector[] | undefined),
        selectedLauncherId,
        gotchaEffectors: flowAssets?.['gotchaEffectors'] as GotchaEffector[] | undefined,
        nearbyCameras: target.flowType === 1 || target.flowType === 2 ? nearbyCameras : undefined,
        nearbyHives: target.flowType === 3 ? nearbyHives : undefined,
      };

      const data = { callbacks, ctx };
      cardDataCacheRef.current.set(target.id, { fingerprint, data });
      return data;
    };
  }, [
    onVerify,
    onEngage,
    onDismiss,
    onCancelMission,
    onCompleteMission,
    onSendDroneVerification,
    onSensorHover,
    onCameraLookAt,
    onTakeControl,
    onReleaseControl,
    onSensorModeChange,
    onPlaybookSelect,
    onClosureOutcome,
    onAdvanceFlowPhase,
    onEscalateCreatePOI,
    onEscalateSendDrone,
    onDroneSelect,
    onDroneOverride,
    onDroneResume,
    onDroneRTB,
    onMissionActivate,
    onMissionPause,
    onMissionResume,
    onMissionOverride,
    onMissionCancel,
    onMitigate,
    onMitigateAll,
    onEffectorSelect,
    onPointWeapon,
    onLockWeapon,
    onDismissLock,
    onLauncherSelect,
    onThrowNet,
    onBdaOutcome,
    onBdaCamera,
    onRequestCameraControl,
    onSensorFocus,
    droneVerifyingTargetId,
    cameraActiveTargetId,
    cameraPointingTargetId,
    allCamerasBusyForTarget,
    controlRequestTargetId,
    controlRequestCountdown,
    regulusEffectors,
    launcherEffectors,
    selectedEffectorIds,
    selectedLauncherIds,
    flowAssets,
    flowSelectedIds,
    nearbyCameras,
    nearbyHives,
  ]);

  const handleListScroll = () => {
    const top = listScrollRef.current?.scrollTop ?? 0;
    setIsScrolledToTop(top <= 16);
  };



  const renderTargetList = (
    list: Detection[],
    disableLayout = false,
    emptyLabel: string = los.emptyDefault,
  ) => {
    if (list.length === 0) {
      return <div className="p-2 text-center text-xs text-slate-12">{emptyLabel}</div>;
    }

    return (
      <>
        {list.map((target, idx) => {
          const isActive = target.id === activeTargetId;
          const { callbacks, ctx } = getCardData(target);
          return (
            <div
              key={target.id}
              className="cursor-pointer"
              id={`detection-card-${target.id}`}
              {...(idx === 0 ? { 'data-tour': 'first-card' } : {})}
              onMouseEnter={() => onTargetHover?.(target.id)}
              onMouseLeave={() => onTargetHover?.(null)}
            >
              <UnifiedCard
                target={target}
                isOpen={isActive}
                onToggle={handleTargetToggle}
                callbacks={callbacks}
                ctx={ctx}
                onFocusTarget={onTargetFocus}
                thinMode={thinMode}
              />
            </div>
          );
        })}
      </>
    );
  };

  const showNewUpdatesPill = activeTab === 'active' && visibleArrivalTargets.length > 0;


  return (
    <div className={`w-full flex flex-col ${className}`}>
      <div className="sticky top-0 z-10 bg-surface-2">
        {/* Tab bar */}
        <div data-tour="detection-tabs" className="flex border-b border-border-default px-1" role="tablist">
          <button
            id="tab-active"
            onClick={() => setActiveTab('active')}
            role="tab"
            aria-selected={activeTab === 'active'}
            aria-controls="tabpanel-active"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'active' ? 'border-slate-12 text-slate-12' : 'border-transparent text-slate-10 hover:text-slate-11'
            }`}
          >
            {los.tabActive}
            {activeCount > 0 && (
              <span className="text-[10px] font-mono bg-state-hover-strong rounded px-1.5 py-0.5 tabular-nums">{activeCount}</span>
            )}
          </button>
          <button
            id="tab-completed"
            data-tour="cuas-completed-tab"
            onClick={() => setActiveTab('completed')}
            role="tab"
            aria-selected={activeTab === 'completed'}
            aria-controls="tabpanel-completed"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'completed' ? 'border-slate-12 text-slate-12' : 'border-transparent text-slate-10 hover:text-slate-11'
            }`}
          >
            {los.tabCompleted}
          </button>
        </div>

        <FilterBar
          query={filters.query}
          onQueryChange={setQuery}
          filters={filterDefs}
          selections={selections}
          onFilterChange={onFilterChange}
          onReset={resetFilters}
          searchPlaceholder={los.searchPlaceholder}
          searchAriaLabel={los.searchAriaLabel}
          clearSearchAriaLabel={los.clearSearchAriaLabel}
          resetLabel={los.resetLabel}
          resetAriaLabel={los.resetAriaLabel}
          emptyOptionsLabel={los.emptyOptionsLabel}
        />
      </div>

      <div className="relative flex-1 min-h-0">
        {showNewUpdatesPill && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-3">
            <div className="pointer-events-auto">
              <NewUpdatesPill
                count={visibleArrivalTargets.length}
                label={los.newUpdates}
                onClick={() => {
                  setNewArrivalIds([]);
                  listScrollRef.current?.scrollTo({
                    top: 0,
                    behavior: scrollBehaviorForMotionPreference(),
                  });
                }}
              />
            </div>
          </div>
        )}

        <div
          ref={listScrollRef}
          className="flex h-full flex-col gap-3 overflow-y-auto px-2 py-2"
          onScroll={handleListScroll}
        >
          {activeTab === 'active' && (
            <div id="tabpanel-active" role="tabpanel" aria-labelledby="tab-active" className="space-y-2">
              {renderTargetList(mainActiveTargets, false, los.emptyActive)}
            </div>
          )}

          {activeTab === 'completed' && (
            <div id="tabpanel-completed" role="tabpanel" aria-labelledby="tab-completed">
              {renderTargetList(filteredCompletedTargets, true, los.emptyCompleted)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
