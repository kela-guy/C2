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
import { GotchaIcon } from '@/app/components/tacticalIcons';
import type { Strings } from '@/lib/intl';
import { getStrings } from '@/lib/intl';
import type { Detection } from './ListOfSystems';
import type { CardAction } from '@/primitives/CardActions';

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
    /**
     * Optional argument forwarded to the resolved callback. Needed for
     * callbacks that branch on an action discriminant (e.g. `onVerify` expects
     * `'investigate'`); callbacks that ignore args are unaffected.
     */
    callbackArg?: string;
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
      target.classifiedType !== 'bird' &&
      target.classifiedType !== 'car' &&
      target.classifiedType !== 'tank' &&
      target.classifiedType !== 'truck',

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
          { id: 'investigate-bda', label: j.verifyBdaPtz, icon: Eye, variant: 'fill', callbackKey: 'onVerify', callbackArg: 'investigate' },
        ],
      },
    },

    lineColor: (phase) => phase === 'mitigating' ? '#ef4444' : '#ffffff',
    badgeTextColor: (phase) => phase === 'mitigating' ? '#ffffff' : '#000000',
    coverageColor: '#12b886',

    dropdownGroupLabel: '',
    extraDropdownActions: buildJamExtraDropdown(t),

    primaryCallbackKey: 'onMitigate',
    selectCallbackKey: 'onEffectorSelect',

    showCamera: true,
    accentPhases: { mitigating: ['mitigating'], active: ['mitigated'] },
  };
}

// ─── GOTCHA FLOW (counter-drone net effector — peer to jam) ────────────────
//
// Gotcha is an anti-air / counter-drone capture effector. It applies to the
// same target set as jam (drones / aircraft / uav), so on those cards both
// jam and gotcha are offered as equal engagement options; the card picks the
// nearest effector as the recommended primary (see `buildActions`).

/** Renders the Gotcha glyph in the button's text color (not a fixed fill). */
const GotchaFlowIcon = ({ size = 16 }: { size?: number }) =>
  React.createElement(GotchaIcon, { size, fill: 'currentColor' });

export function getGotchaFlow(t: Strings): EngagementFlowDef {
  const g = t.engagementFlows.gotcha;
  return {
    id: 'gotcha',
    // Same counter-air target set as jam.
    matchTarget: (target) =>
      target.classifiedType !== 'bird' &&
      target.classifiedType !== 'car' &&
      target.classifiedType !== 'tank' &&
      target.classifiedType !== 'truck',

    assetContextKey: 'gotchaEffectors',
    selectedIdContextKey: 'selectedGotchaId',
    availableFilter: (a) => a.status === 'available',

    getPhase: (target) => {
      if (target.gotchaStatus === 'engaged') return 'engaged';
      if (target.gotchaStatus === 'engaging') return 'engaging';
      return 'idle';
    },

    phases: {
      idle: {
        buttonLabel: g.idleButton,
        buttonIcon: GotchaFlowIcon,
        buttonVariant: 'danger',
        showDropdown: true,
      },
      engaging: {
        buttonLabel: g.engagingButton,
        buttonIcon: GotchaFlowIcon,
        buttonVariant: 'danger',
        loading: true,
        disabled: true,
        showDropdown: true,
      },
      engaged: {
        buttonLabel: g.engagedButton,
        buttonIcon: Check,
        buttonVariant: 'ghost',
        isTerminal: true,
        stripLabel: g.engagedStrip,
        stripIcon: Check,
        stripTone: 'success',
        // No terminalActions: the card slots swap in the speaker (PA
        // broadcast) toggle for the engaged gotcha state instead of the
        // PTZ investigate action (see `buildFlowActions`).
      },
    },

    lineColor: (phase) => phase === 'engaging' ? '#ef4444' : '#ffffff',
    badgeTextColor: (phase) => phase === 'engaging' ? '#ffffff' : '#000000',
    coverageColor: '#12b886',

    dropdownGroupLabel: '',

    primaryCallbackKey: 'onEngageGotcha',
    selectCallbackKey: 'onGotchaSelect',

    showCamera: false,
    accentPhases: { mitigating: ['engaging'], active: ['engaged'] },
  };
}

// ─── WEAPON FLOW (car / ground vehicle) ────────────────────────────────────

export function getWeaponFlow(t: Strings): EngagementFlowDef {
  const w = t.engagementFlows.weapon;
  return {
    id: 'weapon',
    matchTarget: (target) =>
      target.classifiedType === 'car' ||
      target.classifiedType === 'tank' ||
      target.classifiedType === 'truck',

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
      if (phase === 'locked' || phase === 'locking') return '#ef4444';
      if (phase === 'pointing' || phase === 'pointed') return '#f59e0b';
      return '#ffffff';
    },
    badgeTextColor: (phase) => phase === 'idle' ? '#000000' : '#ffffff',
    coverageColor: '#12b886',

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
  return [getJamFlow(t), getGotchaFlow(t), getWeaponFlow(t)];
}

/**
 * Counter-air flows (jam + gotcha) that can apply to the SAME target. Unlike
 * `getEngagementFlows` (first-match-wins), these are offered together on a
 * card, with the nearest effector recommended as primary.
 */
export function getCounterAirFlows(t: Strings): EngagementFlowDef[] {
  return [getJamFlow(t), getGotchaFlow(t)];
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
export const GOTCHA_FLOW: EngagementFlowDef = getGotchaFlow(FALLBACK_STRINGS);
export const WEAPON_FLOW: EngagementFlowDef = getWeaponFlow(FALLBACK_STRINGS);
export const ENGAGEMENT_FLOWS: EngagementFlowDef[] = [JAM_FLOW, GOTCHA_FLOW, WEAPON_FLOW];
