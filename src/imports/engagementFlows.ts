import React from 'react';
import {
  Crosshair,
  Lock,
  Check,
  X,
  Radio,
  ScanLine,
  Eye,
} from 'lucide-react';
import { JamWaveIcon } from '@/primitives/MapIcons';
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

const JAM_EXTRA_DROPDOWN = (busy: boolean): CardAction[] => [
  { id: 'mitigate-all', label: 'שיבוש כללי', icon: Radio,
    onClick: (e) => e.stopPropagation(),
    disabled: busy,
  },
  { id: 'mitigate-directional', label: 'שיבוש ממוקד', icon: Crosshair,
    onClick: (e) => e.stopPropagation(),
    disabled: busy,
  },
  { id: 'mitigate-spectrum', label: 'שיבוש ספקטרום רחב', icon: ScanLine,
    onClick: (e) => e.stopPropagation(),
    disabled: busy,
  },
];

export const JAM_FLOW: EngagementFlowDef = {
  id: 'jam',
  matchTarget: (t) =>
    t.classifiedType !== 'bird' && t.classifiedType !== 'car',

  assetContextKey: 'regulusEffectors',
  selectedIdContextKey: 'selectedEffectorId',
  availableFilter: (a) => a.status === 'available',

  getPhase: (t) => {
    if (t.mitigationStatus === 'mitigated') return 'mitigated';
    if (t.mitigationStatus === 'mitigating') return 'mitigating';
    return 'idle';
  },

  phases: {
    idle: {
      buttonLabel: 'שיבוש',
      buttonIcon: JamWaveIcon,
      buttonVariant: 'danger',
      showDropdown: true,
    },
    mitigating: {
      buttonLabel: 'משבש אות...',
      buttonIcon: JamWaveIcon,
      buttonVariant: 'danger',
      loading: true,
      disabled: true,
      showDropdown: true,
    },
    mitigated: {
      buttonLabel: 'שיבוש הושלם',
      buttonIcon: Check,
      buttonVariant: 'ghost',
      isTerminal: true,
      stripLabel: 'שיבוש הושלם',
      stripIcon: Check,
      stripTone: 'success',
      terminalActions: [
        { id: 'investigate-bda', label: 'תחקור — מעקב PTZ', icon: Eye, variant: 'fill', callbackKey: 'onVerify' },
      ],
    },
  },

  lineColor: (phase) => phase === 'mitigating' ? '#ef4444' : '#ffffff',
  badgeTextColor: (phase) => phase === 'mitigating' ? '#ffffff' : '#000000',
  coverageColor: '#12b886',

  dropdownGroupLabel: '',
  extraDropdownActions: JAM_EXTRA_DROPDOWN,

  primaryCallbackKey: 'onMitigate',
  selectCallbackKey: 'onEffectorSelect',

  showCamera: true,
  accentPhases: { mitigating: ['mitigating'], active: ['mitigated'] },
};

// ─── WEAPON FLOW (car / ground vehicle) ────────────────────────────────────

export const WEAPON_FLOW: EngagementFlowDef = {
  id: 'weapon',
  matchTarget: (t) => t.classifiedType === 'car',

  assetContextKey: 'launcherEffectors',
  selectedIdContextKey: 'selectedLauncherId',
  availableFilter: (a) => a.status === 'available',

  getPhase: (t) => t.weaponPointingStatus ?? 'idle',

  phases: {
    idle: {
      buttonLabel: 'כוון נשק',
      buttonIcon: Crosshair,
      buttonVariant: 'danger',
      showDropdown: true,
    },
    pointing: {
      buttonLabel: 'מכוון...',
      buttonIcon: Crosshair,
      buttonVariant: 'warning',
      loading: true,
      disabled: true,
      showDropdown: true,
    },
    pointed: {
      buttonLabel: 'נשק מכוון',
      buttonIcon: Crosshair,
      buttonVariant: 'ghost',
      isTerminal: true,
      stripLabel: 'נשק מכוון',
      stripIcon: Crosshair,
      stripTone: 'success',
      terminalActions: [
        { id: 'lock-weapon', label: 'נעל', icon: Lock, variant: 'danger', callbackKey: 'onLockWeapon' },
        { id: 'dismiss-pointing', label: 'בטל כיוון', icon: X, variant: 'ghost', callbackKey: 'onDismissLock' },
      ],
    },
    locking: {
      buttonLabel: 'נשק מכוון',
      buttonIcon: Crosshair,
      buttonVariant: 'ghost',
      isTerminal: true,
      stripLabel: 'נשק מכוון',
      stripIcon: Crosshair,
      stripTone: 'success',
      terminalActions: [
        { id: 'lock-weapon', label: 'נועל...', icon: Lock, variant: 'danger', callbackKey: 'onLockWeapon' },
        { id: 'dismiss-pointing', label: 'בטל כיוון', icon: X, variant: 'ghost', callbackKey: 'onDismissLock' },
      ],
    },
    locked: {
      buttonLabel: 'נעול על מטרה',
      buttonIcon: Lock,
      buttonVariant: 'ghost',
      isTerminal: true,
      stripLabel: 'LOCKED',
      stripIcon: Lock,
      stripTone: 'danger',
      terminalActions: [
        { id: 'complete-mission', label: 'סיום משימה', icon: Check, variant: 'fill', callbackKey: 'onCompleteMission' },
        { id: 'dismiss-lock', label: 'בטל נעילה', icon: X, variant: 'ghost', callbackKey: 'onDismissLock' },
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

// ─── Registry ──────────────────────────────────────────────────────────────

export const ENGAGEMENT_FLOWS: EngagementFlowDef[] = [JAM_FLOW, WEAPON_FLOW];

export function findFlowForTarget(target: Detection): EngagementFlowDef | null {
  return ENGAGEMENT_FLOWS.find(f => f.matchTarget(target)) ?? null;
}
