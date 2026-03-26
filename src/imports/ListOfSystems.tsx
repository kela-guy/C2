import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  TargetCard,
  CardHeader,
  CardActions,
  CardTimeline,
  CardDetails,
  CardSensors,
  CardMedia,
  CardLog,
  CardClosure,
  StatusChip,
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
} from 'lucide-react';
import { useCardSlots, type CardCallbacks, type CardContext } from './useCardSlots';
import { ACTIVITY_STATUS_LABELS, useTargetFilters } from './useTargetFilters';
import { getActivityStatus, isCompletedActivityStatus, useActivityStatus } from './useActivityStatus';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DetectionType = 'uav' | 'missile' | 'aircraft' | 'naval' | 'unknown';
export type EntityStage = 'raw_detection' | 'classified';
export type ClassifiedType = 'drone' | 'bird' | 'aircraft' | 'unknown';
export type MitigationStatus = 'idle' | 'mitigating' | 'mitigated' | 'failed';
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

export const INCIDENT_OUTCOMES: { value: IncidentOutcome; label: string }[] = [
  { value: 'Handled', label: 'טופל' },
  { value: 'Escalated', label: 'הועבר לגורם מוסמך' },
  { value: 'Ignored_Animal', label: 'בעל חיים' },
  { value: 'Ignored_AuthorizedVehicle', label: 'רכב מורשה' },
  { value: 'Ignored_Vegetation', label: 'צמחייה / רוח' },
  { value: 'Ignored_SensorError', label: 'תקלת חיישן' },
  { value: 'Ignored_OwnForces', label: 'כוחות עצמיים' },
  { value: 'Ignored_PoorDetection', label: 'זיהוי לקוי' },
];

export interface Playbook {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export const FLOW1_PLAYBOOKS: Playbook[] = [
  { id: 'fast-inspect', name: 'חקירה מהירה', description: 'שיגור רחפן + התחלת הקלטה', riskLevel: 'low' },
  { id: 'full-response', name: 'תגובה מלאה', description: 'רחפן + כוח תגובה + הקלטה', riskLevel: 'high' },
  { id: 'transfer', name: 'העברת אחריות', description: 'העברת נתונים למשטרה / גורם סמוך', riskLevel: 'medium' },
];

export const DISMISS_REASONS = [
  'לא רלוונטי',
  'תרגיל',
  'זיהוי שגוי',
  'אחר',
] as const;

export const MOCK_TARGETS: Detection[] = [];

// ─── Status chip builder ────────────────────────────────────────────────────

const ACTIVITY_STATUS_CHIP_COLOR: Record<ActivityStatus, 'green' | 'red' | 'orange' | 'gray'> = {
  active: 'green',
  recently_active: 'orange',
  timeout: 'gray',
  dismissed: 'gray',
  mitigated: 'green',
};

function buildStatusChip(target: Detection) {
  const status = getActivityStatus(target);
  const label = ACTIVITY_STATUS_LABELS[status];
  const color = ACTIVITY_STATUS_CHIP_COLOR[status];
  return <StatusChip label={label} color={color} />;
}

// ─── Unified Card ───────────────────────────────────────────────────────────

function UnifiedCard({
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
  const isSuccess = target.status === 'event_resolved' || target.status === 'event_neutralized';
  const isExpired = target.status === 'expired';
  const showDetails = !isSuccess && !isExpired && target.flowType !== 4;
  const hasActions = (target.actionLog?.length ?? 0) > 0;

  return (
    <TargetCard
      accent={slots.accent}
      completed={slots.completed}
      open={isOpen}
      onToggle={onToggle}
      onFocus={onFocus}
      header={
        <CardHeader
          {...slots.header}
          status={buildStatusChip(target)}
          open={isOpen}
        />
      }
    >
      {slots.closureType && (
        <div className="px-2 pt-1.5 flex items-center gap-1">
          {slots.closureType === 'manual' ? (
            <div className="flex items-center gap-1 text-[9px] text-zinc-500">
              <Hand size={10} className="text-zinc-500" aria-hidden="true" />
              <span>סגירה ידנית</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[9px] text-zinc-500">
              <Zap size={10} className="text-zinc-500" aria-hidden="true" />
              <span>סגירה אוטומטית</span>
            </div>
          )}
        </div>
      )}

      {slots.media && <CardMedia {...slots.media} />}

      {slots.actions.length > 0 && <CardActions actions={slots.actions} />}

      {!thinMode && slots.timeline.length > 0 && (
        <div className="px-2">
          <CardTimeline steps={slots.timeline} />
        </div>
      )}

      {showDetails && (
        <CardDetails
          rows={slots.details.rows}
          classification={slots.details.classification}
        />
      )}

      {slots.laserPosition.length > 0 && (
        <AccordionSection title="מיקום יחסי ללייזר" icon={Crosshair}>
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
        <AccordionSection title={`חיישנים (${slots.sensors.length})`} icon={Radar}>
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
        <CardLog entries={slots.log} />
      )}

      {slots.closure && (
        <CardClosure outcomes={slots.closure.outcomes} onSelect={slots.closure.onSelect} />
      )}
    </TargetCard>
  );
}

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
          status={buildStatusChip(target)}
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
  return <div className="p-2 text-xs text-zinc-400">Use ComposedCard instead</div>;
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
  const prefersReducedMotion = useReducedMotion();
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

  const buildCallbacks = (target: Detection): CardCallbacks => ({
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
    onBdaOutcome: (outcome) => onBdaOutcome?.(target.id, outcome),
    onBdaCamera: () => onBdaCamera?.(target.id),
    onRequestCameraControl: () => onRequestCameraControl?.(target.id),
    onSensorFocus,
  });

  const buildCtx = (target: Detection): CardContext => ({
    isDroneVerifying: droneVerifyingTargetId === target.id,
    isCameraActive: cameraActiveTargetId === target.id,
    isCameraPointing: cameraPointingTargetId === target.id,
    allCamerasBusy: allCamerasBusyForTarget === target.id,
    controlRequestCountdown: controlRequestTargetId === target.id ? controlRequestCountdown : null,
    regulusEffectors,
    selectedEffectorId: selectedEffectorIds?.get(target.id),
    nearbyCameras: (target.flowType === 1 || target.flowType === 2) ? nearbyCameras : undefined,
    nearbyHives: target.flowType === 3 ? nearbyHives : undefined,
  });

  const handleTargetToggle = (target: Detection) => {
    setNewArrivalIds((prev) => prev.filter((id) => id !== target.id));
    onTargetClick?.(target);
  };

  const handleListScroll = () => {
    const top = listScrollRef.current?.scrollTop ?? 0;
    setIsScrolledToTop(top <= 16);
  };



  const renderTargetList = (
    list: Detection[],
    disableLayout = false,
    emptyLabel = 'אין איתורים',
  ) => {
    if (list.length === 0) {
      return <div className="p-2 text-center text-xs text-white">{emptyLabel}</div>;
    }

    return (
      <AnimatePresence mode={disableLayout ? undefined : 'popLayout'}>
        {list.map((target, idx) => {
          const isActive = target.id === activeTargetId;
          return (
            <motion.div
              key={target.id}
              layout={disableLayout ? false : 'position'}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="cursor-pointer"
              id={`detection-card-${target.id}`}
              {...(idx === 0 ? { 'data-tour': 'first-card' } : {})}
              onMouseEnter={() => onTargetHover?.(target.id)}
              onMouseLeave={() => onTargetHover?.(null)}
            >
              <UnifiedCard
                target={target}
                isOpen={isActive}
                onToggle={() => handleTargetToggle(target)}
                callbacks={buildCallbacks(target)}
                ctx={buildCtx(target)}
                onFocus={onTargetFocus ? () => onTargetFocus(target.id) : undefined}
                thinMode={thinMode}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    );
  };

  const showNewUpdatesPill = activeTab === 'active' && visibleArrivalTargets.length > 0;


  return (
    <div className={`w-full flex flex-col ${className}`}>
      <div className="sticky top-0 z-10 bg-[#141414]">
        {/* Tab bar */}
        <div data-tour="detection-tabs" className="flex border-b border-white/10 px-1" role="tablist">
          <button
            id="tab-active"
            onClick={() => setActiveTab('active')}
            role="tab"
            aria-selected={activeTab === 'active'}
            aria-controls="tabpanel-active"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'active' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            פעילות
            {activeCount > 0 && (
              <span className="text-[10px] font-mono bg-white/10 rounded px-1.5 py-0.5 tabular-nums">{activeCount}</span>
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
              activeTab === 'completed' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            הושלמו
          </button>
        </div>

        <FilterBar
          filters={filters}
          activeFilterCount={activeFilterCount}
          availableSensors={availableSensors}
          onUpdate={updateFilter}
          onToggleActivity={toggleActivityStatus}
          onToggleSensor={toggleSensorId}
          onReset={resetFilters}
        />
      </div>

      <div className="relative flex-1 min-h-0">
        <AnimatePresence>
          {showNewUpdatesPill && (
            <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-3">
              <div className="pointer-events-auto">
                <NewUpdatesPill
                  count={visibleArrivalTargets.length}
                  onClick={() => {
                    setNewArrivalIds([]);
                    listScrollRef.current?.scrollTo({
                      top: 0,
                      behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    });
                  }}
                />
              </div>
            </div>
          )}
        </AnimatePresence>

        <div
          ref={listScrollRef}
          className="flex h-full flex-col gap-3 overflow-y-auto px-2 py-2"
          onScroll={handleListScroll}
        >
          {activeTab === 'active' && (
            <div id="tabpanel-active" role="tabpanel" aria-labelledby="tab-active" className="space-y-2">
              {renderTargetList(mainActiveTargets, false, 'אין מטרות פעילות')}
            </div>
          )}

          {activeTab === 'completed' && (
            <div id="tabpanel-completed" role="tabpanel" aria-labelledby="tab-completed">
              {renderTargetList(filteredCompletedTargets, true, 'אין אירועים שהושלמו')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
