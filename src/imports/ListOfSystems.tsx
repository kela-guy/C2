import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';
import {
  TargetCard,
  CardHeader,
  CardActions,
  CardTimeline,
  CardDetails,
  CardIdentity,
  CardSensors,
  CardMedia,
  CardLog,
  CardClosure,
  ActivityTimestampChip,
  FilterBar,
  NewUpdatesPill,
  AccordionSection,
  TelemetryRow,
} from '@/primitives';
import {
  Crosshair,
  Radar,
  Hand,
  Zap,
} from '@/lib/icons/central';
import { useScrollEdges } from '@/lib/scroll/useScrollEdges';
import { ScrollEdgeCue } from '@/lib/scroll/ScrollEdgeCue';
import { useCardSlots, type CardCallbacks, type CardContext } from './useCardSlots';
import { useTargetFilters } from './useTargetFilters';
import { getActivityStatus, getCreatedAtMs, formatTimeSince, isCompletedActivityStatus, useActivityStatus } from './useActivityStatus';
import { useStrings, type Strings } from '@/lib/intl';
import type { Affiliation } from '@/primitives/markerStyles';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DetectionType = 'uav' | 'missile' | 'aircraft' | 'naval' | 'ground_vehicle' | 'unknown';
export type EntityStage = 'raw_detection' | 'classified';
export type ClassifiedType = 'drone' | 'bird' | 'aircraft' | 'car' | 'tank' | 'truck' | 'unknown';
export type MitigationStatus = 'idle' | 'mitigating' | 'mitigated' | 'failed';
export type WeaponPointingStatus = 'idle' | 'pointing' | 'pointed' | 'locking' | 'locked';
/**
 * Gotcha (counter-drone / anti-air net effector) engagement lifecycle.
 * Peer to `MitigationStatus`: a target can be engaged by either the jammer
 * (Regulus) or a Gotcha unit — whichever the operator commits, or whichever
 * the card recommends as nearest.
 */
export type GotchaEngageStatus = 'idle' | 'engaging' | 'engaged' | 'failed';
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

export interface Detection {
  id: string;
  name: string;
  type: DetectionType;
  status: 'detection' | 'tracking' | 'event' | 'event_neutralized' | 'suspicion' | 'expired' | 'event_resolved';
  missionStatus?: 'idle' | 'planning' | 'executing' | 'waiting_confirmation' | 'complete' | 'aborted';
  missionType?: 'intercept' | 'surveillance' | 'attack' | 'jamming';
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
  weaponPointingStatus?: WeaponPointingStatus;
  pointingLauncherId?: string;
  /** Gotcha engagement lifecycle (peer to `mitigationStatus`). */
  gotchaStatus?: GotchaEngageStatus;
  /** Id of the Gotcha unit committed to this target. */
  engagingGotchaId?: string;
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
  affiliation?: Affiliation;
  /** Operator-facing drone callsign (General info row), separate from card header title. */
  droneName?: string;
  model?: string;
  serialNumber?: string;
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
  // Status dot + timestamp: the timestamp is the visible text, color conveys the
  // activity status (status word kept in the aria-label), and hover surfaces the
  // relative "time since detection".
  return (
    <ActivityTimestampChip
      timestamp={target.timestamp}
      color={color}
      statusLabel={label}
      hoverLabel={formatTimeSince(getCreatedAtMs(target))}
    />
  );
}

// Shallow-equality for a CardContext. buildCtx always emits the same key set,
// so comparing every field with === is sufficient to detect "nothing changed"
// and reuse the previous object identity (keeps memoized cards from re-rendering).
function shallowEqualCtx(a: CardContext, b: CardContext): boolean {
  const keys = Object.keys(a) as (keyof CardContext)[];
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

// Drop cache entries whose target id no longer exists in the live set, so the
// per-card identity caches don't grow unbounded over a long session.
function pruneById<T>(cache: Map<string, T>, live: Map<string, Detection>): void {
  for (const id of cache.keys()) {
    if (!live.has(id)) cache.delete(id);
  }
}

// ─── Unified Card ───────────────────────────────────────────────────────────

function UnifiedCardImpl({
  target,
  isOpen,
  onToggle,
  callbacks,
  ctx,
  onFocus,
  thinMode,
}: {
  target: Detection;
  isOpen: boolean;
  onToggle: () => void;
  callbacks: CardCallbacks;
  ctx: CardContext;
  onFocus?: () => void;
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
      severity={slots.severity}
      completed={slots.completed}
      open={isOpen}
      onToggle={onToggle}
      onFocus={onFocus}
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
            <div className="flex items-center gap-1 text-xs text-slate-9">
              <Hand size={10} className="text-slate-9" aria-hidden="true" />
              <span>{los.closeManual}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-slate-9">
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

      {slots.identity.length > 0 && (
        <CardIdentity
          rows={slots.identity}
          title={los.generalInfoTitle}
          copyLabel={los.copy}
          copiedLabel={los.copied}
        />
      )}

      {showDetails && (
        <CardDetails
          rows={slots.details.rows}
          classification={slots.details.classification}
          title={los.telemetryTitle}
        />
      )}

      {slots.laserPosition.length > 0 && (
        <AccordionSection title={los.laserRelativeLocation} icon={Crosshair}>
          <div className="w-full py-1">
            <div className="grid grid-cols-3 grid-rows-1 gap-0">
              {slots.laserPosition.map((row, idx) => (
                <TelemetryRow key={idx} label={row.label} value={row.value} icon={row.icon} />
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
}

// Memoized so that when one target moves (loiter tick changes only that
// target's reference) or unrelated list state updates, only the affected
// card re-renders. Depends on stable callbacks/ctx/onToggle identities from
// the parent list (see the per-card identity caches in ListOfSystemsImpl).
const UnifiedCard = React.memo(UnifiedCardImpl);

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
  onEngageGotcha?: (targetId: string, gotchaId: string) => void;
  onGotchaSelect?: (targetId: string, gotchaId: string) => void;
  onPointWeapon?: (targetId: string, launcherId: string) => void;
  onLockWeapon?: (targetId: string) => void;
  onDismissLock?: (targetId: string) => void;
  onLauncherSelect?: (targetId: string, launcherId: string) => void;
  launcherEffectors?: LauncherEffector[];
  selectedLauncherIds?: Map<string, string>;
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
  /** Toggle audio broadcast over the nearest speaker for a target (play/stop). */
  onPlayAudio?: (targetId: string) => void;
  /** Pick which speaker track a target broadcasts. */
  onSelectAudioTrack?: (targetId: string, trackId: string) => void;
  /** Target whose audio broadcast is currently live. */
  audioPlayingTargetId?: string | null;
  /** Selectable speaker tracks for the card's Play-audio control. */
  audioTracks?: { id: string; label: string }[];
  /** Per-target selected speaker track id. */
  selectedAudioTrackIds?: Map<string, string>;
  onSensorFocus?: (sensorId: string) => void;
  onTargetFocus?: (targetId: string) => void;
  onTargetHover?: (targetId: string | null) => void;
  thinMode?: boolean;
}

function ListOfSystemsImpl({
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
  onEngageGotcha,
  onGotchaSelect,
  onPointWeapon,
  onLockWeapon,
  onDismissLock,
  onLauncherSelect,
  launcherEffectors,
  selectedLauncherIds,
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
  onPlayAudio,
  onSelectAudioTrack,
  audioPlayingTargetId,
  audioTracks,
  selectedAudioTrackIds,
  onSensorFocus,
  onTargetFocus,
  onTargetHover,
  thinMode,
}: ListOfSystemsProps) {
  const prefersReducedMotion = useReducedMotion();
  const i18n = useStrings();
  const los = i18n.listOfSystems;
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [newArrivalIds, setNewArrivalIds] = useState<string[]>([]);
  const listScrollRef = useRef<HTMLDivElement>(null);
  // The list scroll container, exposed to react-virtuoso as its
  // `customScrollParent` so we keep the existing sticky-header + height
  // chain instead of letting Virtuoso own the scroller.
  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null);
  const seenTargetIdsRef = useRef<Set<string>>(new Set());
  const hasHydratedTargetsRef = useRef(false);
  // Overflow edge cues for the (virtualized) list scroller. Virtuoso owns the
  // scroll element via customScrollParent, so we observe it directly and
  // overlay the cues in the relative wrapper rather than wrapping in ScrollArea.
  const listEdges = useScrollEdges({ ref: listScrollRef });

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

  const filteredActiveTargets = useMemo(
    () => applyFilters(activeTargets),
    [applyFilters, activeTargets],
  );
  const filteredCompletedTargets = useMemo(
    () => applyFilters(completedTargets),
    [applyFilters, completedTargets],
  );

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
      listScrollRef.current?.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  }, [activeTargetId, newArrivalIds.length, prefersReducedMotion]);

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

  // Latest handler props live in a ref so the per-card callback closures below
  // can stay reference-stable across renders (and even when the parent recreates
  // a handler). The cached closures always read `handlersRef.current`.
  const handlersRef = useRef({
    onVerify, onEngage, onDismiss, onCancelMission, onCompleteMission,
    onSendDroneVerification, onSensorHover, onCameraLookAt, onTakeControl,
    onReleaseControl, onSensorModeChange, onPlaybookSelect, onClosureOutcome,
    onAdvanceFlowPhase, onEscalateCreatePOI, onEscalateSendDrone, onDroneSelect,
    onDroneOverride, onDroneResume, onDroneRTB, onMissionActivate, onMissionPause,
    onMissionResume, onMissionOverride, onMissionCancel, onMitigate, onMitigateAll,
    onEffectorSelect, onEngageGotcha, onGotchaSelect, onPointWeapon, onLockWeapon, onDismissLock, onLauncherSelect,
    onBdaOutcome, onBdaCamera, onRequestCameraControl, onPlayAudio, onSelectAudioTrack, onSensorFocus,
    onTargetClick, onTargetFocus,
  });
  handlersRef.current = {
    onVerify, onEngage, onDismiss, onCancelMission, onCompleteMission,
    onSendDroneVerification, onSensorHover, onCameraLookAt, onTakeControl,
    onReleaseControl, onSensorModeChange, onPlaybookSelect, onClosureOutcome,
    onAdvanceFlowPhase, onEscalateCreatePOI, onEscalateSendDrone, onDroneSelect,
    onDroneOverride, onDroneResume, onDroneRTB, onMissionActivate, onMissionPause,
    onMissionResume, onMissionOverride, onMissionCancel, onMitigate, onMitigateAll,
    onEffectorSelect, onEngageGotcha, onGotchaSelect, onPointWeapon, onLockWeapon, onDismissLock, onLauncherSelect,
    onBdaOutcome, onBdaCamera, onRequestCameraControl, onPlayAudio, onSelectAudioTrack, onSensorFocus,
    onTargetClick, onTargetFocus,
  };

  // Per-target identity caches keyed by target id. Built lazily; reused across
  // renders so memoized UnifiedCards for unchanged targets bail out.
  const targetsByIdRef = useRef(new Map<string, Detection>());
  const callbacksCacheRef = useRef(new Map<string, CardCallbacks>());
  const toggleCacheRef = useRef(new Map<string, () => void>());
  const focusCacheRef = useRef(new Map<string, () => void>());
  const ctxCacheRef = useRef(new Map<string, CardContext>());

  targetsByIdRef.current.clear();
  for (const tgt of targets) targetsByIdRef.current.set(tgt.id, tgt);

  const getCallbacks = (id: string): CardCallbacks => {
    const cached = callbacksCacheRef.current.get(id);
    if (cached) return cached;
    const h = handlersRef;
    const cb: CardCallbacks = {
      onVerify: (action) => h.current.onVerify?.(id, action),
      onEngage: (type) => h.current.onEngage?.(id, type),
      onDismiss: (reason) => h.current.onDismiss?.(id, reason),
      onCancelMission: () => h.current.onCancelMission?.(id),
      onCompleteMission: () => h.current.onCompleteMission?.(id),
      onSendDroneVerification: () => h.current.onSendDroneVerification?.(id),
      onSensorHover: (sensorId) => h.current.onSensorHover?.(sensorId),
      onCameraLookAt: (camId) => h.current.onCameraLookAt?.(id, camId),
      onTakeControl: () => h.current.onTakeControl?.(id),
      onReleaseControl: () => h.current.onReleaseControl?.(id),
      onSensorModeChange: (mode) => h.current.onSensorModeChange?.(id, mode),
      onPlaybookSelect: (pbId) => h.current.onPlaybookSelect?.(id, pbId),
      onClosureOutcome: (outcome) => h.current.onClosureOutcome?.(id, outcome),
      onAdvanceFlowPhase: () => h.current.onAdvanceFlowPhase?.(id),
      onEscalateCreatePOI: () => h.current.onEscalateCreatePOI?.(id),
      onEscalateSendDrone: () => h.current.onEscalateSendDrone?.(id),
      onDroneSelect: (hiveId) => h.current.onDroneSelect?.(id, hiveId),
      onDroneOverride: () => h.current.onDroneOverride?.(id),
      onDroneResume: () => h.current.onDroneResume?.(id),
      onDroneRTB: () => h.current.onDroneRTB?.(id),
      onMissionActivate: () => h.current.onMissionActivate?.(id),
      onMissionPause: () => h.current.onMissionPause?.(id),
      onMissionResume: () => h.current.onMissionResume?.(id),
      onMissionOverride: () => h.current.onMissionOverride?.(id),
      onMissionCancel: () => h.current.onMissionCancel?.(id),
      onMitigate: (effectorId) => h.current.onMitigate?.(id, effectorId),
      onMitigateAll: () => h.current.onMitigateAll?.(id),
      onEffectorSelect: (effectorId) => h.current.onEffectorSelect?.(id, effectorId),
      onEngageGotcha: (gotchaId) => h.current.onEngageGotcha?.(id, gotchaId),
      onGotchaSelect: (gotchaId) => h.current.onGotchaSelect?.(id, gotchaId),
      onPointWeapon: (launcherId) => h.current.onPointWeapon?.(id, launcherId),
      onLockWeapon: () => h.current.onLockWeapon?.(id),
      onDismissLock: () => h.current.onDismissLock?.(id),
      onLauncherSelect: (launcherId) => h.current.onLauncherSelect?.(id, launcherId),
      onBdaOutcome: (outcome) => h.current.onBdaOutcome?.(id, outcome),
      onBdaCamera: () => h.current.onBdaCamera?.(id),
      onRequestCameraControl: () => h.current.onRequestCameraControl?.(id),
      onPlayAudio: () => h.current.onPlayAudio?.(id),
      onSelectAudioTrack: (trackId) => h.current.onSelectAudioTrack?.(id, trackId),
      onSensorFocus: (sensorId) => h.current.onSensorFocus?.(sensorId),
    };
    callbacksCacheRef.current.set(id, cb);
    return cb;
  };

  const getToggle = (id: string): (() => void) => {
    const cached = toggleCacheRef.current.get(id);
    if (cached) return cached;
    const toggle = () => {
      setNewArrivalIds((prev) => prev.filter((x) => x !== id));
      const cur = targetsByIdRef.current.get(id);
      if (cur) handlersRef.current.onTargetClick?.(cur);
    };
    toggleCacheRef.current.set(id, toggle);
    return toggle;
  };

  const getFocus = (id: string): (() => void) => {
    const cached = focusCacheRef.current.get(id);
    if (cached) return cached;
    const focus = () => handlersRef.current.onTargetFocus?.(id);
    focusCacheRef.current.set(id, focus);
    return focus;
  };

  const buildCtx = (target: Detection): CardContext => ({
    isDroneVerifying: droneVerifyingTargetId === target.id,
    isCameraActive: cameraActiveTargetId === target.id,
    isCameraPointing: cameraPointingTargetId === target.id,
    allCamerasBusy: allCamerasBusyForTarget === target.id,
    controlRequestCountdown: controlRequestTargetId === target.id ? controlRequestCountdown : null,
    regulusEffectors: regulusEffectors ?? flowAssets?.['regulusEffectors'] as RegulusEffector[] | undefined,
    selectedEffectorId: selectedEffectorIds?.get(target.id) ?? flowSelectedIds?.['regulusEffectors']?.get(target.id),
    launcherEffectors: launcherEffectors ?? flowAssets?.['launcherEffectors'] as LauncherEffector[] | undefined,
    selectedLauncherId: selectedLauncherIds?.get(target.id) ?? flowSelectedIds?.['launcherEffectors']?.get(target.id),
    gotchaEffectors: flowAssets?.['gotchaEffectors'],
    selectedGotchaId: flowSelectedIds?.['gotchaEffectors']?.get(target.id),
    nearbyCameras: (target.flowType === 1 || target.flowType === 2) ? nearbyCameras : undefined,
    nearbyHives: target.flowType === 3 ? nearbyHives : undefined,
    audioTracks,
    selectedAudioTrackId: selectedAudioTrackIds?.get(target.id),
    isAudioPlaying: audioPlayingTargetId === target.id,
  });

  // Reuse the previous ctx object identity when none of its derived values
  // changed, so an idle card's `ctx` prop stays stable across renders.
  const getCtx = (target: Detection): CardContext => {
    const next = buildCtx(target);
    const prev = ctxCacheRef.current.get(target.id);
    if (prev && shallowEqualCtx(prev, next)) return prev;
    ctxCacheRef.current.set(target.id, next);
    return next;
  };

  // Prune caches for targets no longer present.
  pruneById(callbacksCacheRef.current, targetsByIdRef.current);
  pruneById(toggleCacheRef.current, targetsByIdRef.current);
  pruneById(focusCacheRef.current, targetsByIdRef.current);
  pruneById(ctxCacheRef.current, targetsByIdRef.current);

  const renderTargetList = (
    list: Detection[],
    emptyLabel: string = los.emptyDefault,
  ) => {
    if (list.length === 0) {
      return <div className="p-2 text-center text-xs text-white">{emptyLabel}</div>;
    }

    // Virtualized: only the on-screen cards are mounted, so a 20-target
    // swarm renders ~a screenful instead of all rows. `customScrollParent`
    // reuses the panel's existing scroll container so the sticky tab/filter
    // header and height chain stay intact. Each `UnifiedCard` is memoized,
    // so only the actively changing card re-renders.
    return (
      <Virtuoso
        data={list}
        customScrollParent={scrollParent ?? undefined}
        computeItemKey={(_, target) => target.id}
        increaseViewportBy={300}
        itemContent={(_, target) => {
          const isActive = target.id === activeTargetId;
          return (
            <div
              className="cursor-pointer pb-2"
              id={`detection-card-${target.id}`}
              onMouseEnter={() => onTargetHover?.(target.id)}
              onMouseLeave={() => onTargetHover?.(null)}
            >
              <UnifiedCard
                target={target}
                isOpen={isActive}
                onToggle={getToggle(target.id)}
                callbacks={getCallbacks(target.id)}
                ctx={getCtx(target)}
                onFocus={onTargetFocus ? getFocus(target.id) : undefined}
                thinMode={thinMode}
              />
            </div>
          );
        }}
      />
    );
  };

  const showNewUpdatesPill = activeTab === 'active' && visibleArrivalTargets.length > 0;


  return (
    <div className={`w-full flex flex-col ${className}`}>
      <div className="sticky top-0 z-10 bg-surface-2">
        {/* Tab bar */}
        <div className="flex border-b border-white/10 px-1" role="tablist">
          <button
            id="tab-active"
            onClick={() => setActiveTab('active')}
            role="tab"
            aria-selected={activeTab === 'active'}
            aria-controls="tabpanel-active"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'active' ? 'border-white text-white' : 'border-transparent text-slate-10 hover:text-slate-11'
            }`}
          >
            {los.tabActive}
            {activeCount > 0 && (
              <span className="text-xs font-mono bg-white/10 rounded px-1.5 py-0.5 tabular-nums">{activeCount}</span>
            )}
          </button>
          <button
            id="tab-completed"
            onClick={() => setActiveTab('completed')}
            role="tab"
            aria-selected={activeTab === 'completed'}
            aria-controls="tabpanel-completed"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'completed' ? 'border-white text-white' : 'border-transparent text-slate-10 hover:text-slate-11'
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
        <AnimatePresence>
          {showNewUpdatesPill && (
            // The wrapper must be a motion element: AnimatePresence only
            // defers unmount for motion children, so with a plain <div> the
            // pill's own exit animation never got a chance to run.
            <motion.div
              key="new-updates-pill"
              className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-3"
            >
              <div className="pointer-events-auto">
                <NewUpdatesPill
                  count={visibleArrivalTargets.length}
                  label={los.newUpdates}
                  onClick={() => {
                    setNewArrivalIds([]);
                    listScrollRef.current?.scrollTo({
                      top: 0,
                      behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    });
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={(el) => {
            listScrollRef.current = el;
            setScrollParent(el);
          }}
          className="h-full overflow-y-auto px-2 py-2"
        >
          {activeTab === 'active' && (
            <div id="tabpanel-active" role="tabpanel" aria-labelledby="tab-active" className="h-full">
              {renderTargetList(mainActiveTargets, los.emptyActive)}
            </div>
          )}

          {activeTab === 'completed' && (
            <div id="tabpanel-completed" role="tabpanel" aria-labelledby="tab-completed" className="h-full">
              {renderTargetList(filteredCompletedTargets, los.emptyCompleted)}
            </div>
          )}
        </div>

        <ScrollEdgeCue edge="top" visible={listEdges.top} surfaceLevel="level0" />
        <ScrollEdgeCue edge="bottom" visible={listEdges.bottom} surfaceLevel="level0" />
      </div>
    </div>
  );
}

// Memoized so the 4 Hz friendly-patrol tick (which never touches `targets`)
// and unrelated Dashboard state changes (camera, panels) do not re-render the
// entire card list. Relies on Dashboard passing stable prop identities.
const ListOfSystems = React.memo(ListOfSystemsImpl);

export default ListOfSystems;
