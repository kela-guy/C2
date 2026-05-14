import React from 'react';
import {
  Crosshair,
  Lock,
  Check,
  X,
  Radio,
  ScanLine,
  Eye,
} from '@/lib/icons/central';
import { JamWaveIcon } from '@/primitives/MapIcons';
import type { Strings } from '@/lib/intl';
import { getStrings } from '@/lib/intl';
import type { Detection } from './ListOfSystems';
import type { CardAction } from '@/primitives/CardActions';
import { accentHex, slateHex } from '@/primitives/accentHex';

/*
 * Engagement-flow line/coverage/badge colors. These are consumed by
 * Mapbox paint expressions and Cesium materials — both of which
 * take literal hex strings, not CSS vars. Mapping:
 *   danger / locked / mitigating     → accent-danger
 *   warning / pointing                → accent-warning
 *   success / coverage / acknowledged → accent-success
 *   default line                      → slate-12 (white-ish)
 *   badge ink on light                → slate-1 (near-black)
 */
const FLOW_DANGER = accentHex('danger');
const FLOW_WARNING = accentHex('warning');
const FLOW_SUCCESS = accentHex('success');
const FLOW_LINE_DEFAULT = slateHex(12);
const FLOW_BADGE_INK = slateHex(1);

// ─── Shared asset interface ────────────────────────────────────────────────

export interface FlowAsset {
  id: string;
  name: string;
  lat: number;
  lon: number;
  status: string;
  [key: string]: unknown;
}

// ─── Asset resolution ──────────────────────────────────────────────────────

function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface ResolvedAsset {
  asset: FlowAsset;
  km: number;
}

export interface AssetResolution {
  all: ResolvedAsset[];
  active: ResolvedAsset | null;
}

export function resolveNearestAsset(
  targetLat: number,
  targetLon: number,
  assets: FlowAsset[],
  availableFilter: (a: FlowAsset) => boolean,
  overrideId?: string,
): AssetResolution {
  const all = assets
    .map(asset => ({ asset, km: distKm(targetLat, targetLon, asset.lat, asset.lon) }))
    .sort((a, b) => a.km - b.km);

  const available = all.filter(e => availableFilter(e.asset));
  const nearest = available[0] ?? null;
  const overridden = overrideId
    ? all.find(e => e.asset.id === overrideId && availableFilter(e.asset))
    : null;

  return { all, active: overridden ?? nearest };
}

// ─── Engagement pair (for map lines) ───────────────────────────────────────

export interface EngagementPairData {
  targetLat: number;
  targetLon: number;
  assetLat: number;
  assetLon: number;
  assetId: string;
  distanceM: number;
}

// ─── Phase config ──────────────────────────────────────────────────────────

export interface FlowPhaseUI {
  buttonLabel: string;
  buttonIcon: React.ElementType;
  buttonVariant: 'fill' | 'ghost' | 'danger' | 'warning';
  loading?: boolean;
  disabled?: boolean;
  showDropdown?: boolean;
  stripLabel?: string;
  stripIcon?: React.ElementType;
  stripTone?: 'success' | 'danger';
  isTerminal?: boolean;
  terminalActions?: {
    id: string;
    label: string;
    icon: React.ElementType;
    variant: 'fill' | 'ghost' | 'danger' | 'warning';
    callbackKey: string;
  }[];
}

// ─── Flow definition ───────────────────────────────────────────────────────

export interface EngagementFlowDef {
  id: string;
  matchTarget: (t: Detection) => boolean;

  assetContextKey: string;
  selectedIdContextKey: string;
  availableFilter: (a: FlowAsset) => boolean;

  getPhase: (t: Detection) => string;
  phases: Record<string, FlowPhaseUI>;

  lineColor: (phase: string) => string;
  badgeTextColor: (phase: string) => string;
  coverageColor: string;

  dropdownGroupLabel: string;
  extraDropdownActions?: (busy: boolean) => CardAction[];

  primaryCallbackKey: string;
  selectCallbackKey: string;

  showCamera?: boolean;
  accentPhases?: { mitigating: string[]; active: string[] };
}

// ─── JAM FLOW (drone / aircraft) ───────────────────────────────────────────

function buildJamExtraDropdown(t: Strings): (busy: boolean) => CardAction[] {
  const j = t.engagementFlows.jam;
  return (busy: boolean): CardAction[] => [
    { id: 'mitigate-all', label: j.dropdownAll, icon: Radio,
      onClick: (e) => e.stopPropagation(),
      disabled: busy,
    },
    { id: 'mitigate-directional', label: j.dropdownDirectional, icon: Crosshair,
      onClick: (e) => e.stopPropagation(),
      disabled: busy,
    },
    { id: 'mitigate-spectrum', label: j.dropdownSpectrum, icon: ScanLine,
      onClick: (e) => e.stopPropagation(),
      disabled: busy,
    },
  ];
}

/**
 * Jam-flow definition. Pass the active strings catalog to localize
 * button + strip + dropdown labels. The non-label fields
 * (matchTarget, getPhase, lineColor, etc.) are locale-independent.
 */
export function getJamFlow(t: Strings): EngagementFlowDef {
  const j = t.engagementFlows.jam;
  return {
    id: 'jam',
    matchTarget: (target) =>
      target.classifiedType !== 'bird' && target.classifiedType !== 'car',

    assetContextKey: 'regulusEffectors',
    selectedIdContextKey: 'selectedEffectorId',
    availableFilter: (a) => a.status === 'available',

    getPhase: (target) => {
      if (target.mitigationStatus === 'mitigated') return 'mitigated';
      if (target.mitigationStatus === 'mitigating') return 'mitigating';
      return 'idle';
    },

    phases: {
      idle: {
        buttonLabel: j.idleButton,
        buttonIcon: JamWaveIcon,
        buttonVariant: 'danger',
        showDropdown: true,
      },
      mitigating: {
        buttonLabel: j.mitigatingButton,
        buttonIcon: JamWaveIcon,
        buttonVariant: 'danger',
        loading: true,
        disabled: true,
        showDropdown: true,
      },
      mitigated: {
        buttonLabel: j.mitigatedButton,
        buttonIcon: Check,
        buttonVariant: 'ghost',
        isTerminal: true,
        stripLabel: j.mitigatedStrip,
        stripIcon: Check,
        stripTone: 'success',
        terminalActions: [
          { id: 'investigate-bda', label: j.verifyBdaPtz, icon: Eye, variant: 'fill', callbackKey: 'onVerify' },
        ],
      },
    },

    lineColor: (phase) => phase === 'mitigating' ? FLOW_DANGER : FLOW_LINE_DEFAULT,
    badgeTextColor: (phase) => phase === 'mitigating' ? FLOW_LINE_DEFAULT : FLOW_BADGE_INK,
    coverageColor: FLOW_SUCCESS,

    dropdownGroupLabel: '',
    extraDropdownActions: buildJamExtraDropdown(t),

    primaryCallbackKey: 'onMitigate',
    selectCallbackKey: 'onEffectorSelect',

    showCamera: true,
    accentPhases: { mitigating: ['mitigating'], active: ['mitigated'] },
  };
}

// ─── WEAPON FLOW (car / ground vehicle) ────────────────────────────────────

export function getWeaponFlow(t: Strings): EngagementFlowDef {
  const w = t.engagementFlows.weapon;
  return {
    id: 'weapon',
    matchTarget: (target) => target.classifiedType === 'car',

    assetContextKey: 'launcherEffectors',
    selectedIdContextKey: 'selectedLauncherId',
    availableFilter: (a) => a.status === 'available',

    getPhase: (target) => target.weaponPointingStatus ?? 'idle',

    phases: {
      idle: {
        buttonLabel: w.idleButton,
        buttonIcon: Crosshair,
        buttonVariant: 'danger',
        showDropdown: true,
      },
      pointing: {
        buttonLabel: w.pointingButton,
        buttonIcon: Crosshair,
        buttonVariant: 'warning',
        loading: true,
        disabled: true,
        showDropdown: true,
      },
      pointed: {
        buttonLabel: w.pointedButton,
        buttonIcon: Crosshair,
        buttonVariant: 'ghost',
        isTerminal: true,
        stripLabel: w.pointedStrip,
        stripIcon: Crosshair,
        stripTone: 'success',
        terminalActions: [
          { id: 'lock-weapon', label: w.pointedLock, icon: Lock, variant: 'danger', callbackKey: 'onLockWeapon' },
          { id: 'dismiss-pointing', label: w.pointedDismiss, icon: X, variant: 'ghost', callbackKey: 'onDismissLock' },
        ],
      },
      locking: {
        buttonLabel: w.lockingButton,
        buttonIcon: Crosshair,
        buttonVariant: 'ghost',
        isTerminal: true,
        stripLabel: w.lockingStrip,
        stripIcon: Crosshair,
        stripTone: 'success',
        terminalActions: [
          { id: 'lock-weapon', label: w.lockingTerminalLabel, icon: Lock, variant: 'danger', callbackKey: 'onLockWeapon' },
          { id: 'dismiss-pointing', label: w.pointedDismiss, icon: X, variant: 'ghost', callbackKey: 'onDismissLock' },
        ],
      },
      locked: {
        buttonLabel: w.lockedButton,
        buttonIcon: Lock,
        buttonVariant: 'ghost',
        isTerminal: true,
        stripLabel: w.lockedStrip,
        stripIcon: Lock,
        stripTone: 'danger',
        terminalActions: [
          { id: 'complete-mission', label: w.lockedComplete, icon: Check, variant: 'fill', callbackKey: 'onCompleteMission' },
          { id: 'dismiss-lock', label: w.lockedDismiss, icon: X, variant: 'ghost', callbackKey: 'onDismissLock' },
        ],
      },
    },

    lineColor: (phase) => {
      if (phase === 'locked' || phase === 'locking') return FLOW_DANGER;
      if (phase === 'pointing' || phase === 'pointed') return FLOW_WARNING;
      return FLOW_LINE_DEFAULT;
    },
    badgeTextColor: (phase) => phase === 'idle' ? FLOW_BADGE_INK : FLOW_LINE_DEFAULT,
    coverageColor: FLOW_SUCCESS,

    dropdownGroupLabel: '',

    primaryCallbackKey: 'onPointWeapon',
    selectCallbackKey: 'onLauncherSelect',

    showCamera: false,
    accentPhases: { mitigating: ['pointing', 'locking'], active: ['pointed', 'locked'] },
  };
}

/**
 * Build the engagement-flow registry for the given catalog. Use this
 * inside React (where you already have a `useStrings()` result)
 * instead of touching the legacy `JAM_FLOW` / `WEAPON_FLOW`
 * constants.
 */
export function getEngagementFlows(t: Strings): EngagementFlowDef[] {
  return [getJamFlow(t), getWeaponFlow(t)];
}

export function findFlowForTarget(target: Detection, t: Strings): EngagementFlowDef | null {
  return getEngagementFlows(t).find(f => f.matchTarget(target)) ?? null;
}

// ─── Legacy exports (label-free callers) ───────────────────────────────────
//
// CesiumTacticalMap consumes only the locale-independent fields
// (matchTarget, getPhase, lineColor, badgeTextColor, coverageColor,
// availableFilter, accentPhases) and never renders any of the
// `*Label` strings. Re-exporting English-locale instances keeps that
// call site simple without forcing it through the `useStrings` hook
// (the map mounts at module init in some demo paths).
const FALLBACK_STRINGS = getStrings('en');
export const JAM_FLOW: EngagementFlowDef = getJamFlow(FALLBACK_STRINGS);
export const WEAPON_FLOW: EngagementFlowDef = getWeaponFlow(FALLBACK_STRINGS);
export const ENGAGEMENT_FLOWS: EngagementFlowDef[] = [JAM_FLOW, WEAPON_FLOW];
