import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  CollapsibleGroup,
  MissionPhaseChip,
  FilterBar,
  StackedCard,
  AccordionSection,
  TelemetryRow,
  CARD_TOKENS,
} from '@/primitives';
import {
  Crosshair,
  Target,
  Scan,
  Pause,
  Plane,
  AlertTriangle,
  ListTodo,
  ScanLine,
  Radar,
} from 'lucide-react';
import { useCardSlots, type CardCallbacks, type CardContext } from './useCardSlots';
import { useTargetFilters } from './useTargetFilters';
import { groupIntoBursts, isBurst } from './useTargetBursts';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DetectionType = 'uav' | 'missile' | 'aircraft' | 'naval' | 'unknown';
export type EntityStage = 'raw_detection' | 'classified';
export type ClassifiedType = 'drone' | 'bird' | 'aircraft' | 'unknown';
export type MitigationStatus = 'idle' | 'mitigating' | 'mitigated' | 'failed';
export type BdaStatus = 'pending' | 'looking' | 'stabilizing' | 'observing' | 'complete';

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

function buildStatusChip(target: Detection) {
  if (target.entityStage === 'raw_detection') return <StatusChip label="לא ידוע" color="gray" />;
  if (target.status === 'detection') return <StatusChip label="איתור" color="red" />;
  if (target.status === 'tracking') return <StatusChip label="מעקב" color="orange" />;
  if (target.status === 'event') return <StatusChip label="מטרה" color="green" />;
  if (target.status === 'suspicion') return <StatusChip label="תח״ש" color="orange" />;
  if (target.status === 'event_neutralized') return <StatusChip label="נוטרל" color="green" />;
  if (target.status === 'event_resolved') return <StatusChip label="הושלם" color="green" />;
  if (target.status === 'expired') return <StatusChip label="פג תוקף" color="gray" />;
  return null;
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
  const isMission = target.flowType === 4;
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
          status={
            isMission && target.plannedMission
              ? <MissionPhaseChip phase={target.plannedMission.phase} />
              : buildStatusChip(target)
          }
          open={isOpen}
        />
      }
    >
      {slots.media && <CardMedia {...slots.media} />}

      {slots.actions.length > 0 && <CardActions actions={slots.actions} />}

      {!thinMode && slots.timeline.length > 0 && (
        <div className="px-2" style={{ borderBottom: `1px solid ${CARD_TOKENS.surface.level2}` }}>
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
  quickAction?: { label: string; variant: 'primary' | 'danger' | 'amber' | 'glass' | 'ghost' | 'secondary'; icon?: React.ElementType; onClick: (e: React.MouseEvent) => void };
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
  regulusEffectors?: RegulusEffector[];
  onBdaOutcome?: (targetId: string, outcome: 'neutralized' | 'active' | 'lost') => void;
  onBdaCamera?: (targetId: string) => void;
  cameraActiveTargetId?: string | null;
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
  regulusEffectors,
  onBdaOutcome,
  onBdaCamera,
  cameraActiveTargetId,
  allCamerasBusyForTarget,
  controlRequestCountdown,
  controlRequestTargetId,
  onRequestCameraControl,
  onSensorFocus,
  onTargetFocus,
  onTargetHover,
  thinMode,
}: ListOfSystemsProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [expandedBurstTargets, setExpandedBurstTargets] = useState<Set<string>>(new Set());

  const uniqueTargets = useMemo(() => {
    const seen = new Set<string>();
    return targets.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [targets]);

  const {
    filters,
    activeFilterCount,
    availableSensors,
    availableTypes,
    getActiveFilters,
    applyFilters,
    updateFilter,
    removeFilter,
    resetFilters,
    toggleSensorId,
    toggleType,
    toggleSignature,
  } = useTargetFilters(uniqueTargets);

  const rawDetections = uniqueTargets.filter((t) => t.entityStage === 'raw_detection');

  const listVisibleTargets = applyFilters(
    uniqueTargets.filter((t) => t.entityStage !== 'raw_detection')
  );

  const nonMissionTargets = listVisibleTargets.filter((t) => t.flowType !== 4);
  const missionTargets = listVisibleTargets
    .filter((t) => t.flowType === 4 && !['event_neutralized', 'event_resolved', 'expired'].includes(t.status));
  const completedMissions = listVisibleTargets
    .filter((t) => t.flowType === 4 && ['event_neutralized', 'event_resolved', 'expired'].includes(t.status));

  const groups = {
    needsReview: nonMissionTargets.filter((t) => t.status === 'suspicion'),
    tasks: nonMissionTargets.filter((t) => ['detection', 'tracking', 'event'].includes(t.status)),
    cleared: nonMissionTargets.filter((t) => ['event_neutralized', 'event_resolved'].includes(t.status)),
    expired: nonMissionTargets.filter((t) => t.status === 'expired'),
  };

  const activeCount = groups.needsReview.length + groups.tasks.length + missionTargets.length + rawDetections.length;
  const completedList = [...groups.cleared, ...groups.expired, ...completedMissions];

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
    onBdaOutcome: (outcome) => onBdaOutcome?.(target.id, outcome),
    onBdaCamera: () => onBdaCamera?.(target.id),
    onRequestCameraControl: () => onRequestCameraControl?.(target.id),
    onSensorFocus,
  });

  const buildCtx = (target: Detection): CardContext => ({
    isDroneVerifying: droneVerifyingTargetId === target.id,
    isCameraActive: cameraActiveTargetId === target.id,
    allCamerasBusy: allCamerasBusyForTarget === target.id,
    controlRequestCountdown: controlRequestTargetId === target.id ? controlRequestCountdown : null,
    regulusEffectors,
    nearbyCameras: (target.flowType === 1 || target.flowType === 2) ? nearbyCameras : undefined,
    nearbyHives: target.flowType === 3 ? nearbyHives : undefined,
  });

  const renderSingleCard = (
    target: Detection,
    isActive: boolean,
    callbacks: CardCallbacks,
    ctx: CardContext,
  ) => (
    <UnifiedCard
      target={target}
      isOpen={isActive}
      onToggle={() => onTargetClick?.(target)}
      callbacks={callbacks}
      ctx={ctx}
      onFocus={onTargetFocus ? () => onTargetFocus(target.id) : undefined}
      thinMode={thinMode}
    />
  );

  const handleBulkMitigate = (targets: Detection[]) => {
    for (const t of targets) onMitigateAll?.(t.id);
  };

  const renderTargetList = (list: Detection[]) => {
    if (list.length === 0) {
      return <div className="p-2 text-center text-[10px] text-gray-600 font-mono">אין איתורים</div>;
    }

    const items = groupIntoBursts(list);

    return (
      <AnimatePresence mode="popLayout">
        {items.map((item, idx) => {
          if (isBurst(item)) {
            return (
              <motion.div
                key={item.id}
                layout="position"
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                {...(idx === 0 ? { 'data-tour': 'first-card' } : {})}
              >
                <StackedCard
                  burst={item}
                  expanded={item.targets.some(t => expandedBurstTargets.has(t.id))}
                  onToggleExpanded={() => {
                    setExpandedBurstTargets(prev => {
                      const next = new Set(prev);
                      const ids = item.targets.map(t => t.id);
                      const isExpanded = ids.some(id => next.has(id));
                      if (isExpanded) {
                        ids.forEach(id => next.delete(id));
                      } else {
                        ids.forEach(id => next.add(id));
                      }
                      return next;
                    });
                  }}
                  activeTargetId={activeTargetId ?? null}
                  onTargetClick={(t) => onTargetClick?.(t)}
                  buildCallbacks={buildCallbacks}
                  buildCtx={buildCtx}
                  renderCard={renderSingleCard}
                  onBulkMitigate={onMitigateAll ? handleBulkMitigate : undefined}
                  onTargetHover={onTargetHover}
                />
              </motion.div>
            );
          }

          const target = item;
          const isActive = target.id === activeTargetId;
          return (
            <motion.div
              key={target.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="cursor-pointer"
              id={`detection-card-${target.id}`}
              {...(idx === 0 ? { 'data-tour': 'first-card' } : {})}
              onMouseEnter={() => onTargetHover?.(target.id)}
              onMouseLeave={() => onTargetHover?.(null)}
            >
              <UnifiedCard
                target={target}
                isOpen={isActive}
                onToggle={() => onTargetClick?.(target)}
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

  return (
    <div className={`w-full flex flex-col ${className}`}>
      <div className="sticky top-0 z-10 bg-[#141414]">
        {/* Tab bar */}
        <div data-tour="detection-tabs" className="flex border-b border-white/10 px-1" dir="rtl" role="tablist">
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
          activeFilters={getActiveFilters()}
          activeFilterCount={activeFilterCount}
          availableSensors={availableSensors}
          availableTypes={availableTypes}
          onUpdate={updateFilter}
          onRemove={removeFilter}
          onToggleSensor={toggleSensorId}
          onToggleType={toggleType}
          onToggleSignature={toggleSignature}
          onReset={resetFilters}
        />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
        {activeTab === 'active' && (
          <div id="tabpanel-active" role="tabpanel" aria-labelledby="tab-active">
            <CollapsibleGroup title="מטרות" count={groups.tasks.length} icon={ListTodo} defaultOpen>
              {renderTargetList(groups.tasks)}
            </CollapsibleGroup>
            <CollapsibleGroup title="תנועות חשודות" count={groups.needsReview.length} icon={AlertTriangle} defaultOpen>
              {renderTargetList(groups.needsReview)}
            </CollapsibleGroup>
            {rawDetections.length > 0 && (
              <CollapsibleGroup title="זיהויים לא ידועים" count={rawDetections.length} icon={Radar} defaultOpen>
                {renderTargetList(rawDetections)}
              </CollapsibleGroup>
            )}
            <CollapsibleGroup title="סריקות ידניות" count={missionTargets.length} icon={ScanLine} defaultOpen>
              {missionTargets.length === 0 ? (
                <div className="p-3 text-center text-[10px] text-zinc-400 font-mono">אין סריקות פעילות</div>
              ) : (
                renderTargetList(missionTargets)
              )}
            </CollapsibleGroup>
          </div>
        )}
        {activeTab === 'completed' && (
          <div id="tabpanel-completed" role="tabpanel" aria-labelledby="tab-completed">
            {completedList.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-gray-600 font-mono">אין אירועים שהושלמו</div>
            ) : (
              renderTargetList(completedList)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
