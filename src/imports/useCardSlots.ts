import React, { useMemo } from 'react';
import {
  Plane,
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
  Check,
  ScanLine,
  Route,
  Pause,
  Play,
  Home,
  Hand,
  X,
  BookOpen,
  Send,
  Shield,
  EyeOff,
  Lock,
  Timer,
  Compass,
  ArrowUpDown,
} from 'lucide-react';
import { DroneCardIcon, MissileCardIcon } from '@/primitives/MapIcons';
import type { ThreatAccent } from '@/primitives/tokens';
import type { CardAction } from '@/primitives/CardActions';
import type { SplitDropdownGroup } from '@/primitives/SplitActionButton';
import type { TimelineStep } from '@/primitives/CardTimeline';
import type { DetailRow, CardDetailsClassification } from '@/primitives/CardDetails';
import type { CardSensor } from '@/primitives/CardSensors';
import type { LogEntry } from '@/primitives/CardLog';
import type { ClosureOutcome } from '@/primitives/CardClosure';
import type { CardHeaderProps } from '@/primitives/CardHeader';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/app/components/ui/tooltip';
import type { CardMediaProps } from '@/primitives/CardMedia';
import type {
  Detection,
  RegulusEffector,
  IncidentOutcome,
} from './ListOfSystems';
import { INCIDENT_OUTCOMES } from './ListOfSystems';
import { JamWaveIcon } from '@/primitives/MapIcons';

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
  onEffectorSelect?: (effectorId: string) => void;
  onBdaOutcome?: (outcome: 'neutralized' | 'active' | 'lost') => void;
  onSensorFocus?: (sensorId: string) => void;
  onBdaCamera?: () => void;
  onRequestCameraControl?: () => void;
}

export interface CardContext {
  isDroneVerifying?: boolean;
  isCameraActive?: boolean;
  isCameraPointing?: boolean;
  allCamerasBusy?: boolean;
  controlRequestCountdown?: number | null;
  regulusEffectors?: RegulusEffector[];
  selectedEffectorId?: string;
  nearbyCameras?: { id: string; typeLabel: string; distanceM: number }[];
  nearbyHives?: { id: string; latitude: number; longitude: number; distanceM: number; battery: number; status: string }[];
}

export interface CardSlots {
  accent: ThreatAccent;
  completed: boolean;
  closureType: 'manual' | 'auto' | null;
  header: CardHeaderProps;
  media: CardMediaProps | null;
  actions: CardAction[];
  timeline: TimelineStep[];
  details: { rows: DetailRow[]; classification?: CardDetailsClassification };
  sensors: CardSensor[];
  log: LogEntry[];
  closure: { outcomes: ClosureOutcome[]; onSelect: (id: string) => void } | null;
  laserPosition: DetailRow[];
}

function buildAccent(target: Detection): ThreatAccent {
  if (target.mitigationStatus === 'mitigating') return 'mitigating';
  if (target.mitigationStatus === 'mitigated' && target.bdaStatus !== 'complete') return 'active';
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
    case 'uav': return DroneCardIcon;
    case 'missile': return MissileCardIcon;
    case 'naval': return Ship;
    case 'aircraft': return Plane;
    default: return Target;
  }
}

const CLASSIFIED_TYPE_LABELS: Record<string, string> = {
  drone: 'רחפן', bird: 'ציפור', aircraft: 'מטוס', unknown: 'לא ידוע',
};

function buildConfidenceBadge(confidence: number | undefined, classifiedType?: string): React.ReactNode {
  if (confidence == null) return null;
  const bg = confidence >= 80 ? 'bg-red-500/20 text-red-400'
    : confidence >= 40 ? 'bg-amber-500/20 text-amber-400'
    : 'bg-zinc-500/20 text-zinc-400';
  const typeLabel = CLASSIFIED_TYPE_LABELS[classifiedType ?? 'unknown'] ?? 'לא ידוע';
  return React.createElement(Tooltip, null,
    React.createElement(TooltipTrigger, { asChild: true },
      React.createElement('span', {
        className: `text-xs font-semibold font-sans tabular-nums px-1.5 py-0.5 rounded-sm flex flex-col items-center justify-center h-[22px] ${bg} cursor-default`,
      }, `${confidence}%`),
    ),
    React.createElement(TooltipContent, {
      side: 'top',
      sideOffset: 6,
      showArrow: false,
      className: 'px-2 py-1 text-[9px] font-normal font-sans text-white bg-zinc-700 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_10px_15px_-3px_rgba(0,0,0,0.3)] whitespace-nowrap',
    }, `סביר ביותר שמדובר ב${typeLabel}`),
  );
}

function buildHeader(target: Detection): CardHeaderProps {
  const Icon = buildHeaderIcon(target);
  const isActive = target.status === 'detection' || target.status === 'event';
  const isMission = target.flowType === 4;
  const isRaw = target.entityStage === 'raw_detection';
  const isCompleted = target.status === 'event_resolved'
    || target.status === 'event_neutralized'
    || target.status === 'expired';

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
    subtitle: isMission ? target.id : target.timestamp,
    badge: target.entityStage && !isCompleted ? buildConfidenceBadge(target.confidence, target.classifiedType) : undefined,
  };
}

function buildMedia(target: Detection, ctx: CardContext): CardMediaProps | null {
  const isCuas = !!target.entityStage;
  const isActive = target.status === 'detection' || target.status === 'event';
  const isSuspicion = target.status === 'suspicion';
  const isSuccess = target.status === 'event_resolved' || target.status === 'event_neutralized';
  const isExpired = target.status === 'expired';
  const isMissionActive = target.missionStatus === 'planning' || target.missionStatus === 'executing' || target.missionStatus === 'waiting_confirmation';

  const isFlowCameraActive = !isCuas && ctx.isCameraActive && (target.flowType === 1 || target.flowType === 2);
  const showVideo = (isCuas && (ctx.isCameraActive || target.entityStage === 'classified')) || isFlowCameraActive;
  const showImage = isCuas
    ? target.entityStage !== 'raw_detection'
    : (isSuspicion || isActive) && !isMissionActive && target.flowType !== 4 && !isFlowCameraActive;

  if (!showVideo && !showImage) return null;

  if (showVideo) {
    const isBdaActive = target.bdaStatus && target.bdaStatus !== 'complete' && target.bdaStatus !== 'pending';
    return {
      src: '/videos/target-feed.mov',
      type: 'video',
      badge: isCuas
        ? (target.classifiedType === 'bird' ? 'bird' : 'threat')
        : isSuspicion ? 'warning' : 'threat',
      showControls: target.mitigationStatus === 'mitigated' || isSuccess || isExpired,
      trackingLabel: isBdaActive ? 'מעקב PTZ' : (target.mitigationStatus === 'mitigated' ? 'הקלטת PTZ' : undefined),
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

function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cuasJamDropdown(
  callbacks: CardCallbacks,
  opts: { classified: boolean; busy: boolean },
): CardAction[] {
  return [
    { id: 'mitigate-all', label: 'שיבוש כללי', icon: Radio,
      onClick: (e) => { e.stopPropagation(); callbacks.onMitigateAll?.(); },
      disabled: !opts.classified || opts.busy,
    },
    { id: 'mitigate-directional', label: 'שיבוש ממוקד', icon: Crosshair,
      onClick: (e) => e.stopPropagation(),
      disabled: !opts.classified || opts.busy,
    },
    { id: 'mitigate-spectrum', label: 'שיבוש ספקטרום רחב', icon: ScanLine,
      onClick: (e) => e.stopPropagation(),
      disabled: !opts.classified || opts.busy,
    },
  ];
}

function buildJamDropdownGroups(
  sortedEffectors: { eff: RegulusEffector; km: number }[],
  activeId: string,
  callbacks: CardCallbacks,
  opts: { classified: boolean; busy: boolean },
): SplitDropdownGroup[] {
  const effectorItems = sortedEffectors.map(({ eff, km }) => ({
    id: `eff-${eff.id}`,
    label: `${eff.name} (${km.toFixed(1)} ק״מ)`,
    checked: eff.id === activeId,
    disabled: eff.status !== 'available' || opts.busy,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      callbacks.onEffectorSelect?.(eff.id);
    },
  }));

  const modeItems = cuasJamDropdown(callbacks, opts);

  return [
    { label: 'בחירת ג׳אמר', items: effectorItems },
    { items: modeItems },
  ];
}

function buildActions(target: Detection, callbacks: CardCallbacks, ctx: CardContext): CardAction[] {
  const actions: CardAction[] = [];
  const isSuccess = target.status === 'event_resolved' || target.status === 'event_neutralized';
  const isExpired = target.status === 'expired';
  const isCritical = target.status === 'detection' || target.status === 'event';
  const isSuspicion = target.status === 'suspicion';
  const isCuas = !!target.entityStage;

  if (isSuccess || isExpired) return actions;

  // Post-jam BDA: same two-row shell as pre-jam (completed split + investigation grid)
  if (target.missionType === 'jamming' && target.missionStatus === 'waiting_confirmation') {
    const cameraActive = !!ctx.isCameraActive;
    const countdown = ctx.controlRequestCountdown;
    const allBusy = !!ctx.allCamerasBusy;

    actions.push({
      id: 'mitigate',
      label: 'שיבוש הושלם',
      group: 'effector',
      onClick: (e) => e.stopPropagation(),
      effectorStatusStrip: { label: 'שיבוש הושלם', icon: Check, tone: 'success' },
    });

    if (countdown != null && countdown > 0) {
      actions.push({
        id: 'bda-camera',
        label: `${countdown} שניות לשליטה...`,
        icon: Timer,
        variant: 'ghost' as const,
        size: 'sm' as const,
        group: 'investigation' as const,
        disabled: true,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); },
        className: 'ring-1 ring-amber-400/35',
      });
    } else if (allBusy && !cameraActive) {
      actions.push({
        id: 'bda-camera',
        label: 'בקש שליטה על מצלמה',
        icon: Lock,
        variant: 'ghost' as const,
        size: 'sm' as const,
        group: 'investigation' as const,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); callbacks.onRequestCameraControl?.(); },
        className: 'ring-1 ring-amber-400/40',
      });
    } else if (cameraActive) {
      actions.push({
        id: 'bda-camera',
        label: 'בטל מצלמה',
        icon: EyeOff,
        variant: 'fill' as const,
        size: 'sm' as const,
        group: 'investigation' as const,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); callbacks.onBdaCamera?.(); },
      });
    } else {
      actions.push({
        id: 'bda-camera',
        label: 'הפנה מצלמה',
        icon: Eye,
        variant: 'fill' as const,
        size: 'sm' as const,
        group: 'investigation' as const,
        dataTour: 'cuas-cta-bda',
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); callbacks.onBdaCamera?.(); },
      });
    }

    actions.push(
      { id: 'complete-mission', label: 'סיום משימה', icon: Check, variant: 'fill', size: 'sm',
        group: 'investigation',
        dataTour: 'cuas-cta-complete',
        onClick: (e) => { e.stopPropagation(); callbacks.onCompleteMission?.(); },
      },
    );
    return actions;
  }

  // CUAS mitigation actions (drone, not bird)
  if (isCuas && target.classifiedType !== 'bird') {
    // Post-mitigation: same two-row layout (split effector row + investigation grid)
    if (target.mitigationStatus === 'mitigated') {
      const bdaPending = !target.bdaStatus || target.bdaStatus === 'pending';

      actions.push({
        id: 'mitigate',
        label: 'שיבוש הושלם',
        group: 'effector',
        onClick: (e) => e.stopPropagation(),
        effectorStatusStrip: { label: 'שיבוש הושלם', icon: Check, tone: 'success' },
      });

      actions.push({
        id: 'investigate-bda',
        label: 'תחקור — מעקב PTZ',
        icon: Eye,
        variant: 'fill',
        size: 'sm',
        group: 'investigation',
        dataTour: 'cuas-cta-bda',
        onClick: (e) => { e.stopPropagation(); callbacks.onVerify?.('investigate'); },
        className:
          'animate-pulse ring-2 ring-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.3)]',
      });

      if (bdaPending) {
        actions.push({
          id: 'start-bda',
          label: 'אימות פגיעה — נעילת רחפן',
          icon: Crosshair,
          variant: 'ghost',
          size: 'sm',
          group: 'investigation',
          onClick: (e) => { e.stopPropagation(); callbacks.onSendDroneVerification?.(); },
        });
      } else {
        actions.push({
          id: 'dismiss-target',
          label: 'ביטול',
          icon: X,
          variant: 'ghost',
          size: 'sm',
          group: 'investigation',
          onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.('dismissed'); },
        });
      }

      return actions;
    }

    const isMitigating = target.mitigationStatus === 'mitigating';
    const investigationDisabled = isMitigating;
    const investigationHoldTitle = isMitigating ? 'זמין לאחר סיום השיבוש' : undefined;

    const [tLat, tLon] = target.coordinates.split(',').map(s => parseFloat(s.trim()));
    const allEffectors = (ctx.regulusEffectors ?? [])
      .map(eff => ({ eff, km: distKm(tLat, tLon, eff.lat, eff.lon) }))
      .sort((a, b) => a.km - b.km);
    const availableEffectors = allEffectors.filter(e => e.eff.status === 'available');
    const nearest = availableEffectors[0] ?? null;
    const overridden = ctx.selectedEffectorId
      ? allEffectors.find(e => e.eff.id === ctx.selectedEffectorId && e.eff.status === 'available')
      : null;
    const active = overridden ?? nearest;

    if (isMitigating) {
      actions.push({
        id: 'mitigate',
        label: 'משבש אות...',
        badge: active ? active.eff.name : undefined,
        icon: JamWaveIcon,
        variant: 'danger',
        size: 'sm',
        group: 'effector',
        dataTour: 'cuas-cta-mitigate',
        loading: true,
        disabled: true,
        onClick: (e) => e.stopPropagation(),
        onHover: active ? (hovering) => callbacks.onSensorHover?.(hovering ? active.eff.id : null) : undefined,
        dropdownActions: cuasJamDropdown(callbacks, { classified: true, busy: true }),
        dropdownGroups: allEffectors.length > 0
          ? buildJamDropdownGroups(allEffectors, active?.eff.id ?? '', callbacks, { classified: true, busy: true })
          : undefined,
      });
    } else {
      actions.push({
        id: 'mitigate',
        label: 'שיבוש',
        badge: active ? active.eff.name : undefined,
        icon: JamWaveIcon,
        variant: 'danger',
        size: 'sm',
        group: 'effector',
        dataTour: 'cuas-cta-mitigate',
        onClick: (e) => {
          e.stopPropagation();
          if (active) callbacks.onMitigate?.(active.eff.id);
        },
        onHover: active ? (hovering) => callbacks.onSensorHover?.(hovering ? active.eff.id : null) : undefined,
        dropdownActions: cuasJamDropdown(callbacks, { classified: true, busy: false }),
        dropdownGroups: allEffectors.length > 0
          ? buildJamDropdownGroups(allEffectors, active?.eff.id ?? '', callbacks, { classified: true, busy: false })
          : undefined,
      });
    }

    const cameraPointing = !!ctx.isCameraPointing;
    const cameraActive = !!ctx.isCameraActive;

    const CameraLockedIcon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(Check, { ...props, className: `${props.className ?? ''} text-emerald-400` });

    actions.push({
      id: 'point-camera',
      label: cameraPointing ? 'מפנה מצלמה...' : cameraActive ? 'מצלמה נעולה על היעד' : 'הפנה מצלמה',
      icon: cameraActive ? CameraLockedIcon : Eye,
      variant: cameraPointing || cameraActive ? 'ghost' : 'fill',
      size: 'sm',
      group: 'investigation',
      loading: cameraPointing,
      onClick: (e) => { e.stopPropagation(); if (!cameraActive) callbacks.onVerify?.('investigate'); },
      className: cameraActive ? 'text-white cursor-default' : '',
    });

    actions.push({
      id: 'dismiss-target', label: 'ביטול', icon: X, variant: 'ghost', size: 'sm',
      group: 'investigation',
      onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.('dismissed'); },
    });

    return actions;
  }

  // CUAS bird actions
  if (isCuas && target.classifiedType === 'bird') {
    actions.push(
      { id: 'confirm-bird', label: 'אשר ציפור — סגור זיהוי', icon: Check, variant: 'warning', size: 'sm',
        group: 'effector',
        onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.('bird_confirmed'); } },
      { id: 'false-alarm', label: 'שווא', icon: Ban, variant: 'ghost', size: 'sm',
        group: 'investigation',
        onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.('false_alarm'); } },
      { id: 'investigate-bird', label: 'תחקור', icon: Eye, variant: 'ghost', size: 'sm',
        group: 'investigation',
        onClick: (e) => { e.stopPropagation(); callbacks.onVerify?.('investigate'); } },
    );
    return actions;
  }

  // Flow 1/2 investigation actions
  if ((target.flowType === 1 || target.flowType === 2) && target.flowPhase === 'investigate') {
    if (target.flowType === 2) {
      actions.push(
        { id: 'send-drone', label: 'שגר רחפן', icon: Plane, variant: 'fill', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onEscalateSendDrone?.(); } },
        { id: 'mark-poi', label: 'סמן נ.ע', icon: MapPin, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onEscalateCreatePOI?.(); } },
      );
    }
    actions.push(
      { id: 'close-event', label: 'סגור אירוע', icon: Ban, variant: 'ghost', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onAdvanceFlowPhase?.(); } },
    );
    return actions;
  }

  // Flow 1 decide phase — playbook selection
  if (target.flowType === 1 && target.flowPhase === 'decide') {
    actions.push(
      { id: 'pb-fast-inspect', label: 'חקירה מהירה', icon: Plane, variant: 'fill', size: 'md',
        onClick: (e) => { e.stopPropagation(); callbacks.onPlaybookSelect?.('fast-inspect'); } },
      { id: 'pb-full-response', label: 'תגובה מלאה', icon: Shield, variant: 'danger', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onPlaybookSelect?.('full-response'); } },
      { id: 'pb-transfer', label: 'העבר אחריות', icon: Send, variant: 'ghost', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onPlaybookSelect?.('transfer'); } },
      { id: 'close-event', label: 'סגור', icon: Ban, variant: 'ghost', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onAdvanceFlowPhase?.(); } },
    );
    return actions;
  }

  // Flow 3 drone deployment active controls
  if (target.flowType === 3 && target.droneDeployment) {
    const dp = target.droneDeployment;
    if (['flying', 'on_station', 'low_battery'].includes(dp.phase)) {
      if (!dp.overridden) {
        actions.push({ id: 'drone-pause', label: 'השהה', icon: Pause, variant: 'warning', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onDroneOverride?.(); } });
      } else {
        actions.push({ id: 'drone-resume', label: 'חדש', icon: Play, variant: 'fill', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onDroneResume?.(); } });
      }
      actions.push({ id: 'drone-rtb', label: 'חזרה לבסיס', icon: Home, variant: 'ghost', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onDroneRTB?.(); } });
    }
    return actions;
  }

  // Flow 4 mission controls
  if (target.flowType === 4 && target.plannedMission) {
    const mp = target.plannedMission;
    if (mp.phase === 'planning') {
      actions.push(
        { id: 'mission-activate', label: 'הפעל משימה', icon: Play, variant: 'fill', size: 'lg',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionActivate?.(); } },
        { id: 'mission-cancel', label: 'ביטול תכנון', icon: X, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionCancel?.(); } },
      );
    } else if (mp.phase === 'active' || mp.phase === 'paused') {
      if (mp.phase === 'active') {
        actions.push({ id: 'mission-pause', label: 'השהה', icon: Pause, variant: 'ghost', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionPause?.(); } });
      } else {
        actions.push({ id: 'mission-resume', label: 'המשך', icon: Play, variant: 'ghost', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionResume?.(); },
          className: 'shadow-[0_0_0_1px_rgba(16,185,129,0.2)] bg-emerald-500/5 hover:bg-emerald-500/10' });
      }
      actions.push(
        { id: 'mission-override', label: 'שליטה ידנית', icon: Hand, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionOverride?.(); } },
        { id: 'mission-cancel', label: 'ביטול משימה', icon: X, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionCancel?.(); } },
      );
    } else if (mp.phase === 'override') {
      actions.push(
        { id: 'mission-return', label: 'חזור למשימה', icon: Play, variant: 'fill', size: 'lg',
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
      actions.push({ id: 'jam-primary', label: 'שיבוש', icon: JamWaveIcon, variant: 'danger', size: 'lg',
        onClick: (e) => { e.stopPropagation(); callbacks.onEngage?.('jamming'); } });
      actions.push(
        { id: 'surveillance', label: 'מעקב', icon: Eye, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onVerify?.('surveillance'); },
          className: 'shadow-[0_0_0_1px_rgba(255,255,255,0.08)] bg-white/[0.03] text-zinc-400' },
        { id: 'drone', label: 'רחפן', icon: Plane, variant: 'ghost', size: 'sm',
          onClick: (e) => e.stopPropagation(),
          className: 'shadow-[0_0_0_1px_rgba(255,255,255,0.08)] bg-white/[0.03] text-zinc-400' },
        { id: 'dismiss', label: 'ביטול', icon: X, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.(); },
          className: 'shadow-[0_0_0_1px_rgba(255,255,255,0.08)] bg-white/[0.03] text-zinc-400' },
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

function buildLaserPosition(target: Detection): DetailRow[] {
  const rows: DetailRow[] = [];
  if (target.laserAzimuth) rows.push({ label: 'אזימוט', value: target.laserAzimuth, icon: Compass });
  if (target.laserElevation) rows.push({ label: 'זווית הגבהה', value: target.laserElevation, icon: ArrowUpDown });
  if (target.laserRange || target.laserDistance) rows.push({ label: 'טווח', value: target.laserRange ?? target.laserDistance!, icon: Ruler });
  return rows;
}

function buildSensors(target: Detection): CardSensor[] {
  const sensors: CardSensor[] = [];

  if (target.contributingSensors) {
    target.contributingSensors.forEach(cs => {
      sensors.push({
        id: cs.sensorId,
        typeLabel: cs.sensorType,
        detectedAt: cs.firstDetectedAt,
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
  const closureType = useMemo((): 'manual' | 'auto' | null => {
    const isCompleted = target.status === 'event_resolved'
      || target.status === 'event_neutralized'
      || target.status === 'expired';
    if (!isCompleted) return null;
    if (target.dismissReason) return 'manual';
    if (target.status === 'event_neutralized') return 'manual';
    if (target.status === 'event_resolved') return 'manual';
    return 'auto';
  }, [target.status, target.dismissReason]);
  const header = useMemo(() => buildHeader(target), [target]);
  const media = useMemo(() => buildMedia(target, ctx), [target, ctx.isCameraActive]);
  const actions = useMemo(() => buildActions(target, callbacks, ctx), [target, callbacks, ctx]);
  const timeline = useMemo(() => buildTimeline(target, ctx), [target, ctx.isDroneVerifying]);
  const details = useMemo(() => buildDetails(target), [target]);
  const laserPosition = useMemo(() => buildLaserPosition(target), [target.laserAzimuth, target.laserElevation, target.laserRange, target.laserDistance]);
  const sensors = useMemo(() => buildSensors(target), [target.contributingSensors, target.detectedBySensors]);
  const log = target.actionLog ?? [];
  const closure = useMemo(() => buildClosure(target, callbacks), [target.flowPhase, target.flowType, callbacks]);

  return { accent, completed, closureType, header, media, actions, timeline, details, sensors, log, closure, laserPosition };
}
