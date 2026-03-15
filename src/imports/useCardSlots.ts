import { useMemo } from 'react';
import {
  Plane,
  Rocket,
  Ship,
  Target,
  Crosshair,
  Radio,
  Eye,
  Ban,
  MapPin,
  Scan,
  Ruler,
  Clock,
  Mountain,
  Zap,
  Check,
  ScanLine,
  Route,
  Pause,
  Play,
  Home,
  Hand,
  X,
} from 'lucide-react';
import type { ThreatAccent } from '@/primitives/tokens';
import type { CardAction } from '@/primitives/CardActions';
import type { TimelineStep } from '@/primitives/CardTimeline';
import type { DetailRow, CardDetailsClassification } from '@/primitives/CardDetails';
import type { CardSensor } from '@/primitives/CardSensors';
import type { LogEntry } from '@/primitives/CardLog';
import type { ClosureOutcome } from '@/primitives/CardClosure';
import type { CardHeaderProps } from '@/primitives/CardHeader';
import type { CardMediaProps } from '@/primitives/CardMedia';
import type {
  Detection,
  RegulusEffector,
  IncidentOutcome,
} from './ListOfSystems';
import { INCIDENT_OUTCOMES } from './ListOfSystems';

export interface CardCallbacks {
  onVerify?: (action: 'intercept' | 'surveillance' | 'investigate') => void;
  onEngage?: (type: 'jamming' | 'attack') => void;
  onDismiss?: (reason?: string) => void;
  onCancelMission?: () => void;
  onCompleteMission?: () => void;
  onSendDroneVerification?: () => void;
  onSensorHover?: (sensorId: string | null) => void;
  onCameraLookAt?: (cameraId: string) => void;
  onTakeControl?: () => void;
  onReleaseControl?: () => void;
  onSensorModeChange?: (mode: 'day' | 'thermal') => void;
  onPlaybookSelect?: (playbookId: string) => void;
  onClosureOutcome?: (outcome: IncidentOutcome) => void;
  onAdvanceFlowPhase?: () => void;
  onEscalateCreatePOI?: () => void;
  onEscalateSendDrone?: () => void;
  onDroneSelect?: (hiveId: string) => void;
  onDroneOverride?: () => void;
  onDroneResume?: () => void;
  onDroneRTB?: () => void;
  onMissionActivate?: () => void;
  onMissionPause?: () => void;
  onMissionResume?: () => void;
  onMissionOverride?: () => void;
  onMissionCancel?: () => void;
  onMitigate?: (effectorId: string) => void;
  onMitigateAll?: () => void;
  onBdaOutcome?: (outcome: 'neutralized' | 'active' | 'lost') => void;
  onSensorFocus?: (sensorId: string) => void;
}

export interface CardContext {
  isDroneVerifying?: boolean;
  isCameraActive?: boolean;
  regulusEffectors?: RegulusEffector[];
  nearbyCameras?: { id: string; typeLabel: string; distanceM: number }[];
  nearbyHives?: { id: string; latitude: number; longitude: number; distanceM: number; battery: number; status: string }[];
}

export interface CardSlots {
  accent: ThreatAccent;
  completed: boolean;
  header: CardHeaderProps;
  media: CardMediaProps | null;
  actions: CardAction[];
  timeline: TimelineStep[];
  details: { rows: DetailRow[]; classification?: CardDetailsClassification };
  sensors: CardSensor[];
  log: LogEntry[];
  closure: { outcomes: ClosureOutcome[]; onSelect: (id: string) => void } | null;
}

function buildAccent(target: Detection): ThreatAccent {
  if (target.mitigationStatus === 'mitigating') return 'mitigating';
  if (target.status === 'event_resolved' || target.status === 'event_neutralized') return 'resolved';
  if (target.status === 'expired') return 'expired';
  if (target.status === 'detection' || target.status === 'event') return 'detection';
  if (target.status === 'tracking') return 'tracking';
  if (target.status === 'suspicion') return 'suspicion';
  if (target.flowType === 4 && target.plannedMission?.phase === 'active') return 'active';
  if (target.flowType === 3 && target.droneDeployment && ['flying', 'on_station'].includes(target.droneDeployment.phase)) return 'active';
  return 'idle';
}

function buildHeaderIcon(target: Detection): React.ElementType {
  if (target.flowType === 4) {
    return target.plannedMission?.missionType === 'ptz' ? ScanLine : Route;
  }
  switch (target.type) {
    case 'uav': return Plane;
    case 'missile': return Rocket;
    case 'naval': return Ship;
    case 'aircraft': return Plane;
    default: return Target;
  }
}

function buildHeader(target: Detection): CardHeaderProps {
  const Icon = buildHeaderIcon(target);
  const isActive = target.status === 'detection' || target.status === 'event';
  const isMission = target.flowType === 4;
  const isRaw = target.entityStage === 'raw_detection';

  return {
    icon: Icon,
    iconColor: isMission
      ? '#a78bfa'
      : isRaw
        ? '#71717a'
        : isActive
          ? '#ef4444'
          : '#9ca3af',
    iconBgActive: !isMission && !isRaw && isActive,
    title: isMission
      ? (target.plannedMission?.missionType === 'ptz' ? 'סריקת מצלמה' : 'משימת רחפן')
      : target.name,
    subtitle: isMission ? target.id : undefined,
  };
}

function buildMedia(target: Detection, ctx: CardContext): CardMediaProps | null {
  const isCuas = !!target.entityStage;
  const isActive = target.status === 'detection' || target.status === 'event';
  const isSuspicion = target.status === 'suspicion';
  const isSuccess = target.status === 'event_resolved' || target.status === 'event_neutralized';
  const isMissionActive = target.missionStatus === 'planning' || target.missionStatus === 'executing' || target.missionStatus === 'waiting_confirmation';

  const showVideo = isCuas && (ctx.isCameraActive || target.entityStage === 'classified');
  const showImage = isCuas
    ? target.entityStage !== 'raw_detection'
    : (isSuspicion || isActive) && !isMissionActive && target.flowType !== 4;

  if (!showVideo && !showImage) return null;

  if (showVideo) {
    return {
      src: '/videos/target-feed.mov',
      type: 'video',
      badge: target.classifiedType === 'bird' ? 'bird' : 'threat',
    };
  }

  const imageUrl = isCuas
    ? 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&q=80&w=400&h=240'
    : isSuspicion
      ? 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?auto=format&fit=crop&q=80&w=400&h=200'
      : 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400&h=200';

  return {
    src: imageUrl,
    type: 'image',
    badge: isCuas ? (target.classifiedType === 'bird' ? 'bird' : 'threat') : isActive ? 'threat' : isSuspicion ? 'warning' : null,
  };
}

function buildActions(target: Detection, callbacks: CardCallbacks, ctx: CardContext): CardAction[] {
  const actions: CardAction[] = [];
  const isSuccess = target.status === 'event_resolved' || target.status === 'event_neutralized';
  const isExpired = target.status === 'expired';
  const isCritical = target.status === 'detection' || target.status === 'event';
  const isSuspicion = target.status === 'suspicion';
  const isCuas = !!target.entityStage;

  if (isSuccess || isExpired) return actions;

  // CUAS mitigation actions (classified drone, not bird)
  if (isCuas && target.entityStage !== 'raw_detection' && target.classifiedType !== 'bird') {
    if (target.mitigationStatus === 'mitigated') {
      actions.push({
        id: 'investigate-bda',
        label: 'תחקור',
        icon: Eye,
        variant: 'secondary',
        size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onVerify?.('investigate'); },
      });
      return actions;
    }
    if (target.mitigationStatus === 'mitigating') return actions;

    actions.push({
      id: 'mitigate',
      label: 'שיבוש',
      icon: Zap,
      variant: 'danger',
      size: 'lg',
      onClick: (e) => {
        e.stopPropagation();
        const effs = ctx.regulusEffectors?.filter(r => r.status === 'available') ?? [];
        if (effs.length > 0) {
          const [latS, lonS] = target.coordinates.split(',').map(s => parseFloat(s.trim()));
          const sorted = effs.sort((a, b) => Math.hypot(a.lat - latS, a.lon - lonS) - Math.hypot(b.lat - latS, b.lon - lonS));
          callbacks.onMitigate?.(sorted[0].id);
        }
      },
      disabled: target.entityStage !== 'classified',
      confirm: {
        title: 'הפעלת שיבוש',
        description: 'האם אתה בטוח? פעולה זו תפעיל שיבוש אלקטרוני.',
        doubleConfirm: true,
        confirmLabel: 'הפעל שיבוש',
      },
    });

    actions.push(
      { id: 'mitigate-all', label: 'מרחבי', icon: Radio, variant: 'secondary', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onMitigateAll?.(); },
        disabled: target.entityStage !== 'classified',
        confirm: { title: 'שיבוש מרחבי', description: 'האם אתה בטוח?', doubleConfirm: true },
      },
      { id: 'lock', label: 'נעילה', icon: Crosshair, variant: 'secondary', size: 'sm',
        onClick: (e) => e.stopPropagation(), disabled: target.entityStage !== 'classified' },
      { id: 'intercept-cuas', label: 'ירוט', icon: Target, variant: 'secondary', size: 'sm',
        onClick: (e) => e.stopPropagation(), disabled: target.entityStage !== 'classified' },
      { id: 'track-cuas', label: 'מעקב', icon: Scan, variant: 'secondary', size: 'sm',
        onClick: (e) => e.stopPropagation(), disabled: target.entityStage !== 'classified' },
    );
    return actions;
  }

  // CUAS bird actions
  if (isCuas && target.classifiedType === 'bird') {
    actions.push(
      { id: 'confirm-bird', label: 'אשר ציפור — סגור זיהוי', icon: Check, variant: 'amber', size: 'lg',
        onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.('bird_confirmed'); } },
      { id: 'false-alarm', label: 'שווא', icon: Ban, variant: 'secondary', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.('false_alarm'); } },
      { id: 'investigate-bird', label: 'תחקור', icon: Eye, variant: 'secondary', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onVerify?.('investigate'); } },
    );
    return actions;
  }

  // Flow 1/2 investigation actions
  if ((target.flowType === 1 || target.flowType === 2) && target.flowPhase === 'investigate') {
    if (target.flowType === 2) {
      actions.push(
        { id: 'send-drone', label: 'שגר רחפן', icon: Plane, variant: 'primary', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onEscalateSendDrone?.(); } },
        { id: 'mark-poi', label: 'סמן נ.ע', icon: MapPin, variant: 'secondary', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onEscalateCreatePOI?.(); } },
      );
    }
    actions.push(
      { id: 'close-event', label: 'סגור אירוע', icon: Ban, variant: 'ghost', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onAdvanceFlowPhase?.(); } },
    );
    return actions;
  }

  // Flow 1 decide phase
  if (target.flowType === 1 && target.flowPhase === 'decide') {
    actions.push(
      { id: 'close-event', label: 'סגור אירוע', icon: Ban, variant: 'ghost', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onAdvanceFlowPhase?.(); } },
    );
    return actions;
  }

  // Flow 3 drone deployment active controls
  if (target.flowType === 3 && target.droneDeployment) {
    const dp = target.droneDeployment;
    if (['flying', 'on_station', 'low_battery'].includes(dp.phase)) {
      if (!dp.overridden) {
        actions.push({ id: 'drone-pause', label: 'השהה', icon: Pause, variant: 'amber', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onDroneOverride?.(); } });
      } else {
        actions.push({ id: 'drone-resume', label: 'חדש', icon: Play, variant: 'primary', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onDroneResume?.(); } });
      }
      actions.push({ id: 'drone-rtb', label: 'חזרה לבסיס', icon: Home, variant: 'secondary', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onDroneRTB?.(); } });
    }
    return actions;
  }

  // Flow 4 mission controls
  if (target.flowType === 4 && target.plannedMission) {
    const mp = target.plannedMission;
    if (mp.phase === 'planning') {
      actions.push(
        { id: 'mission-activate', label: 'הפעל משימה', icon: Play, variant: 'primary', size: 'lg',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionActivate?.(); } },
        { id: 'mission-cancel', label: 'ביטול תכנון', icon: X, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionCancel?.(); } },
      );
    } else if (mp.phase === 'active' || mp.phase === 'paused') {
      if (mp.phase === 'active') {
        actions.push({ id: 'mission-pause', label: 'השהה', icon: Pause, variant: 'secondary', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionPause?.(); } });
      } else {
        actions.push({ id: 'mission-resume', label: 'המשך', icon: Play, variant: 'glass', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionResume?.(); },
          className: 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10' });
      }
      actions.push(
        { id: 'mission-override', label: 'שליטה ידנית', icon: Hand, variant: 'secondary', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionOverride?.(); } },
        { id: 'mission-cancel', label: 'ביטול משימה', icon: X, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionCancel?.(); } },
      );
    } else if (mp.phase === 'override') {
      actions.push(
        { id: 'mission-return', label: 'חזור למשימה', icon: Play, variant: 'primary', size: 'lg',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionResume?.(); } },
        { id: 'mission-cancel', label: 'ביטול משימה', icon: X, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionCancel?.(); } },
      );
    }
    return actions;
  }

  // Legacy non-CUAS action bar (no active mission, no flow-specific phase)
  const isMissionActive = target.missionStatus === 'planning' || target.missionStatus === 'executing' || target.missionStatus === 'waiting_confirmation';
  if (!isMissionActive) {
    if (isCritical || isSuspicion) {
      if (isCritical) {
        actions.push({ id: 'attack', label: 'ירי', icon: Crosshair, variant: 'danger', size: 'lg',
          onClick: (e) => { e.stopPropagation(); callbacks.onEngage?.('attack'); } });
      } else {
        actions.push({ id: 'intercept', label: 'יירוט', icon: Rocket, variant: 'amber', size: 'lg',
          onClick: (e) => { e.stopPropagation(); callbacks.onVerify?.('intercept'); } });
      }
      actions.push(
        { id: 'jam', label: 'שיבוש', icon: Radio, variant: 'secondary', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onEngage?.('jamming'); },
          className: 'border-white/8 bg-white/[0.03] text-zinc-400' },
        { id: 'surveillance', label: 'מעקב', icon: Eye, variant: 'secondary', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onVerify?.('surveillance'); },
          className: 'border-white/8 bg-white/[0.03] text-zinc-400' },
        { id: 'drone', label: 'רחפן', icon: Plane, variant: 'secondary', size: 'sm',
          onClick: (e) => e.stopPropagation(),
          className: 'border-white/8 bg-white/[0.03] text-zinc-400' },
        { id: 'dismiss', label: 'ביטול', icon: X, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.(); },
          className: 'border-white/8 bg-white/[0.03] text-zinc-400' },
      );
    }
  }

  return actions;
}

function buildTimeline(target: Detection, ctx: CardContext): TimelineStep[] {
  const steps: TimelineStep[] = [];

  // Mission steps (flow 4 with active mission)
  const isMissionActive = target.missionStatus === 'planning' || target.missionStatus === 'executing' || target.missionStatus === 'waiting_confirmation';
  if (isMissionActive && target.missionSteps) {
    const progress = target.missionProgress ?? 0;
    target.missionSteps.forEach((label, idx) => {
      steps.push({
        label,
        status: idx < progress ? 'complete' : idx === progress ? 'active' : 'pending',
      });
    });
    if (ctx.isDroneVerifying) {
      steps.push({ label: 'רחפן בדרך לאימות פגיעה...', status: 'active' });
    }
    return steps;
  }

  // Flow 3 drone deployment timeline
  if (target.flowType === 3 && target.droneDeployment) {
    const phases: { phase: string; label: string }[] = [
      { phase: 'select', label: 'בחר רחפן' },
      { phase: 'takeoff', label: 'המראה' },
      { phase: 'flying', label: 'בדרך לאיתור' },
      { phase: 'on_station', label: 'תצפית פעילה' },
      { phase: 'rtb', label: 'חוזר לבסיס' },
      { phase: 'landed', label: 'נחת' },
    ];
    const currentIdx = phases.findIndex(p => p.phase === target.droneDeployment!.phase);
    phases.forEach((p, idx) => {
      steps.push({
        label: p.label,
        status: idx < currentIdx ? 'complete'
          : idx === currentIdx ? (p.phase === 'low_battery' ? 'error' : 'active')
          : 'pending',
      });
    });
    return steps;
  }

  // CUAS lifecycle timeline
  if (target.entityStage) {
    const cuasPhases = [
      { label: 'זיהוי ראשוני', status: 'complete' as TimelineStep['status'] },
      {
        label: 'סיווג',
        status: (target.entityStage === 'classified' ? 'complete' : 'active') as TimelineStep['status'],
      },
    ];
    if (target.entityStage === 'classified') {
      if (target.mitigationStatus === 'mitigating') {
        cuasPhases.push({ label: 'שיבוש פעיל', status: 'active' });
      } else if (target.mitigationStatus === 'mitigated') {
        cuasPhases.push({ label: 'נוטרל', status: 'complete' });
        if (target.bdaStatus) {
          cuasPhases.push({
            label: 'אימות פגיעה',
            status: target.bdaStatus === 'complete' ? 'complete' : 'active',
          });
        }
      } else if (target.classifiedType === 'drone') {
        cuasPhases.push({ label: 'ממתין לפעולה', status: 'active' });
      }
    }
    return cuasPhases;
  }

  // Flow 1/2 investigation phases
  if ((target.flowType === 1 || target.flowType === 2) && target.flowPhase) {
    const phaseOrder = ['trigger', 'orient', 'investigate', 'decide', 'act', 'closure'];
    const labels: Record<string, string> = {
      trigger: 'זיהוי',
      orient: 'הפניה',
      investigate: target.flowType === 2 ? 'מעקב ידני' : 'חקירה',
      decide: 'החלטה',
      act: 'ביצוע',
      closure: 'סגירה',
    };
    const currentIdx = phaseOrder.indexOf(target.flowPhase);
    phaseOrder.forEach((phase, idx) => {
      steps.push({
        label: labels[phase] ?? phase,
        status: idx < currentIdx ? 'complete' : idx === currentIdx ? 'active' : 'pending',
      });
    });
    return steps;
  }

  return steps;
}

function buildDetails(target: Detection): { rows: DetailRow[]; classification?: CardDetailsClassification } {
  const rows: DetailRow[] = [];
  rows.push({ label: 'מיקום', value: target.coordinates, icon: MapPin });
  if (target.altitude) rows.push({ label: 'גובה', value: target.altitude, icon: Mountain });
  rows.push({ label: 'מרחק', value: target.distance, icon: Ruler });
  rows.push({ label: 'זמן זיהוי', value: target.timestamp, icon: Scan });
  if (target.lastSeenAt) rows.push({ label: 'נצפה לאחרונה', value: target.lastSeenAt, icon: Clock });

  let classification: CardDetailsClassification | undefined;
  if (target.entityStage === 'classified') {
    const typeLabels: Record<string, string> = {
      drone: 'רחפן', bird: 'ציפור', aircraft: 'מטוס', unknown: 'לא ידוע',
    };
    const colorClasses: Record<string, string> = {
      drone: 'text-red-400', bird: 'text-amber-400', aircraft: 'text-zinc-300',
    };
    classification = {
      type: target.classifiedType ?? 'unknown',
      typeLabel: typeLabels[target.classifiedType ?? 'unknown'] ?? 'לא ידוע',
      confidence: typeof target.confidence === 'number' ? target.confidence : undefined,
      colorClass: colorClasses[target.classifiedType ?? ''] ?? 'text-zinc-300',
    };
  } else if (target.entityStage === 'raw_detection') {
    classification = {
      type: 'unknown',
      typeLabel: 'זיהוי לא ידוע',
      confidence: typeof target.confidence === 'number' ? target.confidence : undefined,
      colorClass: 'text-zinc-400',
    };
  }

  return { rows, classification };
}

function buildSensors(target: Detection): CardSensor[] {
  const sensors: CardSensor[] = [];

  if (target.contributingSensors) {
    target.contributingSensors.forEach(cs => {
      sensors.push({
        id: cs.sensorId,
        typeLabel: cs.sensorType,
      });
    });
  }

  if (target.detectedBySensors) {
    target.detectedBySensors.forEach(s => {
      sensors.push({
        id: s.id,
        typeLabel: s.typeLabel,
      });
    });
  }

  return sensors;
}

function buildClosure(
  target: Detection,
  callbacks: CardCallbacks,
): { outcomes: ClosureOutcome[]; onSelect: (id: string) => void } | null {
  const isClosurePhase = (target.flowType === 1 || target.flowType === 2) && target.flowPhase === 'closure';
  if (!isClosurePhase) return null;

  return {
    outcomes: INCIDENT_OUTCOMES.map(o => ({
      id: o.value,
      label: o.label,
    })),
    onSelect: (id: string) => callbacks.onClosureOutcome?.(id as IncidentOutcome),
  };
}

function buildQuickAction(target: Detection, callbacks: CardCallbacks): React.ReactNode | undefined {
  return undefined; // Quick actions are built by the composition layer
}

export function useCardSlots(
  target: Detection,
  callbacks: CardCallbacks,
  ctx: CardContext = {},
): CardSlots {
  const accent = useMemo(() => buildAccent(target), [target.status, target.mitigationStatus, target.flowType, target.droneDeployment?.phase, target.plannedMission?.phase]);
  const completed = target.status === 'event_resolved' || target.status === 'event_neutralized';
  const header = useMemo(() => buildHeader(target), [target]);
  const media = useMemo(() => buildMedia(target, ctx), [target, ctx.isCameraActive]);
  const actions = useMemo(() => buildActions(target, callbacks, ctx), [target, callbacks, ctx]);
  const timeline = useMemo(() => buildTimeline(target, ctx), [target, ctx.isDroneVerifying]);
  const details = useMemo(() => buildDetails(target), [target]);
  const sensors = useMemo(() => buildSensors(target), [target.contributingSensors, target.detectedBySensors]);
  const log = target.actionLog ?? [];
  const closure = useMemo(() => buildClosure(target, callbacks), [target.flowPhase, target.flowType, callbacks]);

  return { accent, completed, header, media, actions, timeline, details, sensors, log, closure };
}
