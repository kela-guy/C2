import React, { useMemo } from 'react';
import {
  Plane,
  Ship,
  Target,
  Crosshair,
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
} from '@/lib/icons/central';
import { DroneCardIcon, MissileCardIcon, CarCardIcon } from '@/primitives/MapIcons';
import type { ThreatAccent } from '@/primitives/tokens';
import type { CardAction } from '@/primitives/CardActions';
import type { SplitDropdownGroup } from '@/primitives/SplitActionButton';
import type { TimelineStep } from '@/primitives/CardTimeline';
import type { DetailRow, CardDetailsClassification } from '@/primitives/CardDetails';
import type { IdentityRow } from '@/primitives/CardIdentity';
import type { CardSensor } from '@/primitives/CardSensors';
import type { LogEntry } from '@/primitives/CardLog';
import type { ClosureOutcome } from '@/primitives/CardClosure';
import type { CardHeaderProps } from '@/primitives/CardHeader';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/components/ui/tooltip';
import type { CardMediaProps } from '@/primitives/CardMedia';
import type {
  Detection,
  RegulusEffector,
  LauncherEffector,
  IncidentOutcome,
} from './ListOfSystems';
import { getIncidentOutcomes } from './ListOfSystems';
import {
  getEngagementFlows,
  resolveNearestAsset,
  type EngagementFlowDef,
  type FlowAsset,
} from './engagementFlows';
import { JamWaveIcon } from '@/primitives/MapIcons';
import { useStrings, type Strings } from '@/lib/intl';

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
  onPointWeapon?: (launcherId: string) => void;
  onLockWeapon?: () => void;
  onDismissLock?: () => void;
  onLauncherSelect?: (launcherId: string) => void;
}

export interface CardContext {
  isDroneVerifying?: boolean;
  isCameraActive?: boolean;
  isCameraPointing?: boolean;
  allCamerasBusy?: boolean;
  controlRequestCountdown?: number | null;
  regulusEffectors?: RegulusEffector[];
  selectedEffectorId?: string;
  launcherEffectors?: LauncherEffector[];
  selectedLauncherId?: string;
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
  identity: IdentityRow[];
  details: { rows: DetailRow[]; classification?: CardDetailsClassification };
  sensors: CardSensor[];
  log: LogEntry[];
  closure: { outcomes: ClosureOutcome[]; onSelect: (id: string) => void } | null;
  laserPosition: DetailRow[];
}

function buildAccent(target: Detection): ThreatAccent {
  if (target.weaponPointingStatus === 'pointing' || target.weaponPointingStatus === 'locking') return 'mitigating';
  if (target.weaponPointingStatus === 'locked') return 'active';
  if (target.weaponPointingStatus === 'pointed') return 'active';
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
    case 'ground_vehicle': return CarCardIcon;
    case 'naval': return Ship;
    case 'aircraft': return Plane;
    default: return Target;
  }
}

function buildConfidenceBadge(confidence: number | undefined, classifiedType: string | undefined, t: Strings): React.ReactNode {
  if (confidence == null) return null;
  // Neutral, metadata-style pill. Severity is communicated by the icon-wrapper
  // affiliation color (AFFILIATION_PALETTES) and the status chip (lifecycle).
  // The number itself communicates confidence; tinting it red on high-confidence
  // would double-signal threat and mis-read a 99%-confident bird as hostile.
  const bg = 'bg-white/[0.06] text-zinc-300';
  const types = t.cards.classifiedTypes;
  const key = (classifiedType ?? 'unknown') as keyof typeof types;
  const typeLabel = types[key] ?? types.unknown;
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
      className: 'px-2 py-1 text-xs font-normal font-sans text-white bg-zinc-700 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_10px_15px_-3px_rgba(0,0,0,0.3)] whitespace-nowrap',
    }, t.cards.classifiedTypeLabel(typeLabel)),
  );
}

function buildHeader(target: Detection, t: Strings): CardHeaderProps {
  const Icon = buildHeaderIcon(target);
  const isActive = target.status === 'detection' || target.status === 'event';
  const isMission = target.flowType === 4;
  const isRaw = target.entityStage === 'raw_detection';
  const isCompleted = target.status === 'event_resolved'
    || target.status === 'event_neutralized'
    || target.status === 'expired';

  // When affiliation is present, it owns the icon-wrapper color (single source
  // of truth shared with the map). Fall back to lifecycle coloring otherwise
  // so existing callers (missions, raw detections, active events) keep their
  // current treatment.
  const hasAffiliation = !!target.affiliation;

  return {
    icon: Icon,
    affiliation: target.affiliation,
    iconColor: hasAffiliation
      ? undefined
      : isMission
        ? '#a78bfa'
        : isRaw
          ? '#71717a'
          : isActive
            ? '#ef4444'
            : '#9ca3af',
    iconBgActive: !hasAffiliation && !isMission && !isRaw && isActive,
    title: isMission
      ? (target.plannedMission?.missionType === 'ptz' ? t.cards.cameraScan : t.cards.droneMission)
      : target.name,
    subtitle: isMission ? target.id : target.timestamp,
    badge: target.entityStage && !isCompleted ? buildConfidenceBadge(target.confidence, target.classifiedType, t) : undefined,
  };
}

function buildMedia(target: Detection, ctx: CardContext, t: Strings): CardMediaProps | null {
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
    const isCarTarget = target.classifiedType === 'car';
    return {
      src: isCarTarget ? '/videos/weapon-feed.mp4' : '/videos/target-feed.mov',
      type: 'video',
      badge: isCuas
        ? (target.classifiedType === 'bird' ? 'bird' : 'threat')
        : isSuspicion ? 'warning' : 'threat',
      showControls: target.mitigationStatus === 'mitigated' || isSuccess || isExpired,
      trackingLabel: isBdaActive ? t.cards.trackingPtz : (target.mitigationStatus === 'mitigated' ? t.cards.recordingPtz : undefined),
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

function buildFlowDropdownGroups(
  flow: EngagementFlowDef,
  sortedAssets: { asset: FlowAsset; km: number }[],
  activeId: string,
  callbacks: CardCallbacks,
  busy: boolean,
  t: Strings,
): SplitDropdownGroup[] {
  const selectCb = callbacks[flow.selectCallbackKey as keyof CardCallbacks] as ((id: string) => void) | undefined;
  const primaryCb = callbacks[flow.primaryCallbackKey as keyof CardCallbacks] as ((id: string) => void) | undefined;
  const hoverCb = callbacks.onSensorHover;
  const assetItems = sortedAssets.map(({ asset, km }) => ({
    id: `${flow.id}-${asset.id}`,
    label: t.cards.distanceFromAsset(asset.name, km),
    active: asset.id === activeId,
    disabled: !flow.availableFilter(asset) || busy,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      selectCb?.(asset.id);
      primaryCb?.(asset.id);
    },
    onHoverStart: () => hoverCb?.(asset.id),
    onHoverEnd: () => hoverCb?.(null),
  }));

  const groups: SplitDropdownGroup[] = [{ label: flow.dropdownGroupLabel, items: assetItems }];
  if (flow.extraDropdownActions) {
    groups.push({ items: flow.extraDropdownActions(busy) });
  }
  return groups;
}

function buildFlowActions(
  flow: EngagementFlowDef,
  target: Detection,
  callbacks: CardCallbacks,
  ctx: CardContext,
  t: Strings,
): CardAction[] {
  const actions: CardAction[] = [];
  const phase = flow.getPhase(target);
  const phaseUI = flow.phases[phase];
  if (!phaseUI) return actions;

  if (phaseUI.isTerminal) {
    actions.push({
      id: `${flow.id}-terminal`,
      label: phaseUI.buttonLabel,
      group: 'primary',
      onClick: (e) => e.stopPropagation(),
      statusStrip: phaseUI.stripLabel
        ? { label: phaseUI.stripLabel, icon: phaseUI.stripIcon!, tone: phaseUI.stripTone! }
        : undefined,
    });

    if (phaseUI.terminalActions) {
      for (const ta of phaseUI.terminalActions) {
        const cb = callbacks[ta.callbackKey as keyof CardCallbacks] as ((...args: unknown[]) => void) | undefined;
        actions.push({
          id: ta.id,
          label: ta.label,
          icon: ta.icon,
          variant: ta.variant,
          size: 'sm',
          group: 'secondary',
          loading: ta.id === 'lock-weapon' && phase === 'locking',
          onClick: (e) => { e.stopPropagation(); cb?.(); },
        });
      }
    }

    if (flow.showCamera && phase === 'mitigated') {
      const bdaPending = !target.bdaStatus || target.bdaStatus === 'pending';
      if (bdaPending) {
        actions.push({
          id: 'start-bda',
          label: t.cards.bdaConfirm,
          icon: Crosshair,
          variant: 'ghost',
          size: 'sm',
          group: 'secondary',
          onClick: (e) => { e.stopPropagation(); callbacks.onSendDroneVerification?.(); },
        });
      } else {
        actions.push({
          id: 'dismiss-target', label: t.cards.dismiss, icon: X, variant: 'ghost', size: 'sm',
          group: 'secondary',
          onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.('dismissed'); },
        });
      }
    }

    return actions;
  }

  const [tLat, tLon] = target.coordinates.split(',').map(s => parseFloat(s.trim()));
  const assets = (ctx[flow.assetContextKey as keyof CardContext] ?? []) as FlowAsset[];
  const overrideId = ctx[flow.selectedIdContextKey as keyof CardContext] as string | undefined;
  const { all: sortedAssets, active } = resolveNearestAsset(tLat, tLon, assets, flow.availableFilter, overrideId);
  const busy = !!phaseUI.loading;

  const primaryCb = callbacks[flow.primaryCallbackKey as keyof CardCallbacks] as ((id: string) => void) | undefined;

  actions.push({
    id: `${flow.id}-primary`,
    label: phaseUI.buttonLabel,
    badge: active ? active.asset.name : undefined,
    icon: phaseUI.buttonIcon,
    variant: phaseUI.buttonVariant,
    size: 'sm',
    group: 'primary',
    loading: phaseUI.loading,
    disabled: phaseUI.disabled,
    onClick: (e) => {
      e.stopPropagation();
      if (!busy && active) primaryCb?.(active.asset.id);
    },
    onHover: active ? (hovering) => callbacks.onSensorHover?.(hovering ? active.asset.id : null) : undefined,
    dropdownActions: flow.extraDropdownActions ? flow.extraDropdownActions(busy) : undefined,
    dropdownGroups: sortedAssets.length > 0
      ? buildFlowDropdownGroups(flow, sortedAssets, active?.asset.id ?? '', callbacks, busy, t)
      : undefined,
  });

  if (flow.showCamera) {
    const cameraPointing = !!ctx.isCameraPointing;
    const cameraActive = !!ctx.isCameraActive;
    const CameraLockedIcon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(Check, { ...props, className: `${props.className ?? ''} text-emerald-400` });

    actions.push({
      id: 'point-camera',
      label: cameraPointing ? t.cards.cameraPointing : cameraActive ? t.cards.cameraLocked : t.cards.pointCamera,
      icon: cameraActive ? CameraLockedIcon : Eye,
      variant: cameraPointing || cameraActive ? 'ghost' : 'fill',
      size: 'sm',
      group: 'secondary',
      loading: cameraPointing,
      onClick: (e) => { e.stopPropagation(); if (!cameraActive) callbacks.onVerify?.('investigate'); },
      className: cameraActive ? 'text-white cursor-default' : '',
    });
  }

  actions.push({
    id: 'dismiss-target', label: t.cards.dismiss, icon: X, variant: 'ghost', size: 'sm',
    group: 'secondary',
    onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.('dismissed'); },
  });

  return actions;
}

function buildActions(target: Detection, callbacks: CardCallbacks, ctx: CardContext, t: Strings): CardAction[] {
  const actions: CardAction[] = [];
  const c = t.cards;
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
      label: c.jamCompleted,
      group: 'primary',
      onClick: (e) => e.stopPropagation(),
      statusStrip: { label: c.jamCompletedStrip, icon: Check, tone: 'success' },
    });

    if (countdown != null && countdown > 0) {
      actions.push({
        id: 'bda-camera',
        label: c.cameraControlCountdown(countdown),
        icon: Timer,
        variant: 'ghost' as const,
        size: 'sm' as const,
        group: 'secondary' as const,
        disabled: true,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); },
        className: 'ring-1 ring-amber-400/35',
      });
    } else if (allBusy && !cameraActive) {
      actions.push({
        id: 'bda-camera',
        label: c.requestCameraControl,
        icon: Lock,
        variant: 'ghost' as const,
        size: 'sm' as const,
        group: 'secondary' as const,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); callbacks.onRequestCameraControl?.(); },
        className: 'ring-1 ring-amber-400/40',
      });
    } else if (cameraActive) {
      actions.push({
        id: 'bda-camera',
        label: c.cancelCamera,
        icon: EyeOff,
        variant: 'fill' as const,
        size: 'sm' as const,
        group: 'secondary' as const,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); callbacks.onBdaCamera?.(); },
      });
    } else {
      actions.push({
        id: 'bda-camera',
        label: c.pointCamera,
        icon: Eye,
        variant: 'fill' as const,
        size: 'sm' as const,
        group: 'secondary' as const,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); callbacks.onBdaCamera?.(); },
      });
    }

    actions.push(
      { id: 'complete-mission', label: c.completeMission, icon: Check, variant: 'fill', size: 'sm',
        group: 'secondary',
        onClick: (e) => { e.stopPropagation(); callbacks.onCompleteMission?.(); },
      },
    );
    return actions;
  }

  // Engagement flow actions (jam, weapon, and future flows) — config-driven
  if (isCuas) {
    for (const flow of getEngagementFlows(t)) {
      if (flow.matchTarget(target)) {
        return buildFlowActions(flow, target, callbacks, ctx, t);
      }
    }
  }

  // CUAS bird actions
  if (isCuas && target.classifiedType === 'bird') {
    actions.push(
      { id: 'confirm-bird', label: c.confirmBird, icon: Check, variant: 'warning', size: 'sm',
        group: 'primary',
        onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.('bird_confirmed'); } },
      { id: 'false-alarm', label: c.falseAlarm, icon: Ban, variant: 'ghost', size: 'sm',
        group: 'secondary',
        onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.('false_alarm'); } },
      { id: 'investigate-bird', label: c.investigateBird, icon: Eye, variant: 'ghost', size: 'sm',
        group: 'secondary',
        onClick: (e) => { e.stopPropagation(); callbacks.onVerify?.('investigate'); } },
    );
    return actions;
  }

  // Flow 1/2 investigation actions
  if ((target.flowType === 1 || target.flowType === 2) && target.flowPhase === 'investigate') {
    if (target.flowType === 2) {
      actions.push(
        { id: 'send-drone', label: c.sendDrone, icon: Plane, variant: 'fill', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onEscalateSendDrone?.(); } },
        { id: 'mark-poi', label: c.markPoi, icon: MapPin, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onEscalateCreatePOI?.(); } },
      );
    }
    actions.push(
      { id: 'close-event', label: c.closeEvent, icon: Ban, variant: 'ghost', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onAdvanceFlowPhase?.(); } },
    );
    return actions;
  }

  // Flow 1 decide phase — playbook selection
  if (target.flowType === 1 && target.flowPhase === 'decide') {
    actions.push(
      { id: 'pb-fast-inspect', label: c.pbFastInspect, icon: Plane, variant: 'fill', size: 'md',
        onClick: (e) => { e.stopPropagation(); callbacks.onPlaybookSelect?.('fast-inspect'); } },
      { id: 'pb-full-response', label: c.pbFullResponse, icon: Shield, variant: 'danger', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onPlaybookSelect?.('full-response'); } },
      { id: 'pb-transfer', label: c.pbTransfer, icon: Send, variant: 'ghost', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onPlaybookSelect?.('transfer'); } },
      { id: 'close-event', label: c.closeEventShort, icon: Ban, variant: 'ghost', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onAdvanceFlowPhase?.(); } },
    );
    return actions;
  }

  // Flow 3 drone deployment active controls
  if (target.flowType === 3 && target.droneDeployment) {
    const dp = target.droneDeployment;
    if (['flying', 'on_station', 'low_battery'].includes(dp.phase)) {
      if (!dp.overridden) {
        actions.push({ id: 'drone-pause', label: c.dronePause, icon: Pause, variant: 'warning', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onDroneOverride?.(); } });
      } else {
        actions.push({ id: 'drone-resume', label: c.droneResume, icon: Play, variant: 'fill', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onDroneResume?.(); } });
      }
      actions.push({ id: 'drone-rtb', label: c.droneRtb, icon: Home, variant: 'ghost', size: 'sm',
        onClick: (e) => { e.stopPropagation(); callbacks.onDroneRTB?.(); } });
    }
    return actions;
  }

  // Flow 4 mission controls
  if (target.flowType === 4 && target.plannedMission) {
    const mp = target.plannedMission;
    if (mp.phase === 'planning') {
      actions.push(
        { id: 'mission-activate', label: c.missionActivate, icon: Play, variant: 'fill', size: 'lg',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionActivate?.(); } },
        { id: 'mission-cancel', label: c.missionCancel, icon: X, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionCancel?.(); } },
      );
    } else if (mp.phase === 'active' || mp.phase === 'paused') {
      if (mp.phase === 'active') {
        actions.push({ id: 'mission-pause', label: c.missionPause, icon: Pause, variant: 'ghost', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionPause?.(); } });
      } else {
        actions.push({ id: 'mission-resume', label: c.missionResume, icon: Play, variant: 'ghost', size: 'md',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionResume?.(); },
          className: 'shadow-[0_0_0_1px_rgba(16,185,129,0.2)] bg-emerald-500/5 hover:bg-emerald-500/10' });
      }
      actions.push(
        { id: 'mission-override', label: c.missionOverride, icon: Hand, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionOverride?.(); } },
        { id: 'mission-cancel', label: c.missionCancelFull, icon: X, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionCancel?.(); } },
      );
    } else if (mp.phase === 'override') {
      actions.push(
        { id: 'mission-return', label: c.missionReturn, icon: Play, variant: 'fill', size: 'lg',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionResume?.(); } },
        { id: 'mission-cancel', label: c.missionCancelFull, icon: X, variant: 'ghost', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onMissionCancel?.(); } },
      );
    }
    return actions;
  }

  // Legacy non-CUAS action bar (no active mission, no flow-specific phase)
  const isMissionActive = target.missionStatus === 'planning' || target.missionStatus === 'executing' || target.missionStatus === 'waiting_confirmation';
  if (!isMissionActive) {
    if (isCritical || isSuspicion) {
      actions.push({ id: 'jam-primary', label: c.jamPrimary, icon: JamWaveIcon, variant: 'danger', size: 'lg',
        onClick: (e) => { e.stopPropagation(); callbacks.onEngage?.('jamming'); } });
      actions.push(
        { id: 'surveillance', label: c.surveillance, icon: Eye, variant: 'outline', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onVerify?.('surveillance'); } },
        { id: 'drone', label: c.drone, icon: Plane, variant: 'outline', size: 'sm',
          onClick: (e) => e.stopPropagation() },
        { id: 'dismiss', label: c.dismiss, icon: X, variant: 'outline', size: 'sm',
          onClick: (e) => { e.stopPropagation(); callbacks.onDismiss?.(); } },
      );
    }
  }

  return actions;
}

function buildTimeline(target: Detection, ctx: CardContext, t: Strings): TimelineStep[] {
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
      steps.push({ label: t.cards.droneEnRouteBda, status: 'active' });
    }
    return steps;
  }

  // Flow 3 drone deployment timeline
  if (target.flowType === 3 && target.droneDeployment) {
    const dp = t.cards.dronePhases;
    const phases: { phase: string; label: string }[] = [
      { phase: 'select', label: dp.select },
      { phase: 'takeoff', label: dp.takeoff },
      { phase: 'flying', label: dp.flying },
      { phase: 'on_station', label: dp.onStation },
      { phase: 'rtb', label: dp.rtb },
      { phase: 'landed', label: dp.landed },
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
    const cp = t.cards.cuasPhases;
    const cuasPhases: TimelineStep[] = [
      { label: cp.initialDetection, status: 'complete' as TimelineStep['status'] },
      {
        label: cp.classification,
        status: (target.entityStage === 'classified' ? 'complete' : 'active') as TimelineStep['status'],
      },
    ];
    if (target.entityStage === 'classified') {
      if (target.classifiedType === 'car') {
        const wp = target.weaponPointingStatus;
        if (wp === 'pointing') {
          cuasPhases.push({ label: cp.weaponPointing, status: 'active' as TimelineStep['status'] });
        } else if (wp === 'pointed') {
          cuasPhases.push({ label: cp.weaponPointed, status: 'complete' as TimelineStep['status'] });
          cuasPhases.push({ label: cp.lock, status: 'active' as TimelineStep['status'] });
        } else if (wp === 'locking') {
          cuasPhases.push({ label: cp.weaponPointed, status: 'complete' as TimelineStep['status'] });
          cuasPhases.push({ label: cp.locking, status: 'active' as TimelineStep['status'] });
        } else if (wp === 'locked') {
          cuasPhases.push({ label: cp.weaponPointed, status: 'complete' as TimelineStep['status'] });
          cuasPhases.push({ label: cp.locked, status: 'complete' as TimelineStep['status'] });
        } else {
          cuasPhases.push({ label: cp.pendingAction, status: 'active' as TimelineStep['status'] });
        }
      } else if (target.mitigationStatus === 'mitigating') {
        cuasPhases.push({ label: cp.jamActive, status: 'active' });
      } else if (target.mitigationStatus === 'mitigated') {
        cuasPhases.push({ label: cp.neutralized, status: 'complete' });
        if (target.bdaStatus) {
          cuasPhases.push({
            label: cp.bdaConfirm,
            status: target.bdaStatus === 'complete' ? 'complete' : 'active',
          });
        }
      } else if (target.classifiedType === 'drone') {
        cuasPhases.push({ label: cp.pendingAction, status: 'active' });
      }
    }
    return cuasPhases;
  }

  // Flow 1/2 investigation phases
  if ((target.flowType === 1 || target.flowType === 2) && target.flowPhase) {
    const fs = t.cards.flowSteps;
    const phaseOrder = ['trigger', 'orient', 'investigate', 'decide', 'act', 'closure'];
    const labels: Record<string, string> = {
      trigger: fs.trigger,
      orient: fs.orient,
      investigate: target.flowType === 2 ? fs.manualTracking : fs.investigate,
      decide: fs.decide,
      act: fs.act,
      closure: fs.closure,
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

function isDroneIdentity(target: Detection): boolean {
  return target.type === 'uav' || target.classifiedType === 'drone';
}

function buildIdentity(target: Detection, t: Strings): IdentityRow[] {
  const dr = t.cards.detailRows;
  const rows: IdentityRow[] = [];
  if (isDroneIdentity(target) && target.droneName) {
    rows.push({ label: dr.droneName, value: target.droneName });
  }
  if (target.model) rows.push({ label: dr.model, value: target.model });
  if (target.serialNumber) rows.push({ label: dr.serialNumber, value: target.serialNumber });
  return rows;
}

function buildDetails(target: Detection, t: Strings): { rows: DetailRow[]; classification?: CardDetailsClassification } {
  const dr = t.cards.detailRows;
  const tl = t.cards.typeLabels;
  const rows: DetailRow[] = [];
  rows.push({ label: dr.location, value: target.coordinates, icon: MapPin });
  if (target.altitude) rows.push({ label: dr.altitude, value: target.altitude, icon: Mountain });
  rows.push({ label: dr.distance, value: target.distance, icon: Ruler });
  if (target.lastSeenAt) rows.push({ label: dr.lastSeen, value: target.lastSeenAt, icon: Clock });

  let classification: CardDetailsClassification | undefined;
  if (target.entityStage === 'classified') {
    const typeLabels: Record<string, string> = {
      drone: tl.drone, bird: tl.bird, aircraft: tl.aircraft, car: tl.car, unknown: tl.unknown,
    };
    const colorClasses: Record<string, string> = {
      drone: 'text-red-400', bird: 'text-amber-400', aircraft: 'text-zinc-300', car: 'text-orange-400',
    };
    classification = {
      type: target.classifiedType ?? 'unknown',
      typeLabel: typeLabels[target.classifiedType ?? 'unknown'] ?? tl.unknown,
      confidence: typeof target.confidence === 'number' ? target.confidence : undefined,
      colorClass: colorClasses[target.classifiedType ?? ''] ?? 'text-zinc-300',
    };
  } else if (target.entityStage === 'raw_detection') {
    classification = {
      type: 'unknown',
      typeLabel: tl.unknownDetection,
      confidence: typeof target.confidence === 'number' ? target.confidence : undefined,
      colorClass: 'text-zinc-400',
    };
  }

  return { rows, classification };
}

function buildLaserPosition(target: Detection, t: Strings): DetailRow[] {
  const dr = t.cards.detailRows;
  const rows: DetailRow[] = [];
  if (target.laserAzimuth) rows.push({ label: dr.azimuth, value: target.laserAzimuth, icon: Compass });
  if (target.laserElevation) rows.push({ label: dr.elevation, value: target.laserElevation, icon: ArrowUpDown });
  if (target.laserRange || target.laserDistance) rows.push({ label: dr.range, value: target.laserRange ?? target.laserDistance!, icon: Ruler });
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
  t: Strings,
): { outcomes: ClosureOutcome[]; onSelect: (id: string) => void } | null {
  const isClosurePhase = (target.flowType === 1 || target.flowType === 2) && target.flowPhase === 'closure';
  if (!isClosurePhase) return null;

  return {
    outcomes: getIncidentOutcomes(t).map(o => ({
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
  const t = useStrings();
  const accent = useMemo(() => buildAccent(target), [target.status, target.mitigationStatus, target.weaponPointingStatus, target.flowType, target.droneDeployment?.phase, target.plannedMission?.phase]);
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
  const header = useMemo(() => buildHeader(target, t), [target, t]);
  const media = useMemo(() => buildMedia(target, ctx, t), [target, ctx.isCameraActive, t]);
  const actions = useMemo(() => buildActions(target, callbacks, ctx, t), [target, callbacks, ctx, t]);
  const timeline = useMemo(() => buildTimeline(target, ctx, t), [target, ctx.isDroneVerifying, t]);
  const identity = useMemo(
    () => buildIdentity(target, t),
    [target.droneName, target.model, target.serialNumber, target.type, target.classifiedType, t],
  );
  const details = useMemo(() => buildDetails(target, t), [target, t]);
  const laserPosition = useMemo(() => buildLaserPosition(target, t), [target.laserAzimuth, target.laserElevation, target.laserRange, target.laserDistance, t]);
  const sensors = useMemo(() => buildSensors(target), [target.contributingSensors, target.detectedBySensors]);
  const log = target.actionLog ?? [];
  const closure = useMemo(() => buildClosure(target, callbacks, t), [target.flowPhase, target.flowType, callbacks, t]);

  return { accent, completed, closureType, header, media, actions, timeline, identity, details, sensors, log, closure, laserPosition };
}
