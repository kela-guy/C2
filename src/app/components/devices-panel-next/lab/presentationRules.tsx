/**
 * Low-fi action-presentation model for the `/devices-lab` layout study.
 *
 * Sandbox-only. Encodes the corrected Device Action Matrix (post
 * questionnaire) as two things the three layout variants share:
 *
 *   1. ACTION_META  — every action's label, glyph, primary/secondary
 *      group, and the *presentation pattern* it renders as
 *      (icon-only+tooltip / labeled toggle / nav / progress / selector /
 *      destructive split). This is the UX decision layer.
 *   2. DEVICE_ACTIONS — which primary + secondary actions each (corrected)
 *      device kind exposes.
 *
 * `ActionControl` is the single dispatcher: given an action id and an
 * `iconOnly` hint, it renders the right pattern. Each variant decides
 * placement + density by choosing which slots are icon-only; the controls
 * themselves (toggle state, calibrate progress, jam confirm) live here so
 * all three variants behave identically.
 *
 * Nothing here ships — once a layout is chosen it gets rebuilt against the
 * real registry in `devices-panel-next/`.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import { Power, Droplets } from 'lucide-react';
import {
  MapPin,
  Video,
  Bell,
  Wrench,
  Check,
  List,
  ChevronDown,
  Radio,
  Play,
  Sun,
} from '@/lib/icons/central';
import { JamIcon } from '@/primitives/ProductIcons';
import { DotmSquare3 } from '@/app/components/ui/dotm-square-3';
import { CameraIcon, SensorIcon, SpeakerIcon, FloodlightIcon } from '../../tacticalIcons';
import { DroneDeviceIcon } from '@/primitives/ProductIcons';
import { DeviceAction } from '../DeviceAction';
import type { DeviceActionTone } from '../deviceActionTones';

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export type ActionId =
  | 'showOnMap'
  | 'onOff'
  | 'watchVideo'
  | 'notifications'
  | 'logs'
  | 'calibrations'
  | 'wipers'
  | 'jam'
  | 'audio';

/** The rendering pattern an action resolves to. */
export type ActionPattern =
  | 'iconButton' // icon-only glyph + tooltip (low-signal, repeated)
  | 'toggle' // icon + text, lit `pressed` state
  | 'navButton' // icon + text, opens a panel
  | 'progress' // icon + text, idle -> running -> done state machine
  | 'selector' // combobox / dropdown
  | 'destructiveSplit'; // danger split button + confirm + active state

export interface ActionMeta {
  label: string;
  icon: ReactNode;
  group: 'primary' | 'secondary';
  pattern: ActionPattern;
  tone: DeviceActionTone;
  /** Short rationale shown in the lab legend. */
  why: string;
}

const ICON = 12;

export const ACTION_META: Record<ActionId, ActionMeta> = {
  showOnMap: {
    label: 'Show on map',
    icon: <MapPin size={ICON} />,
    group: 'primary',
    pattern: 'iconButton',
    tone: 'neutral',
    why: 'Universal + one-shot. Icon-only keeps every row calm (Law of Similarity).',
  },
  onOff: {
    label: 'On / Off',
    icon: <Power size={ICON} />,
    group: 'primary',
    pattern: 'toggle',
    tone: 'caution',
    why: 'Power state must be unambiguous — labeled toggle, lit when on (not an iOS switch).',
  },
  watchVideo: {
    label: 'Watch video',
    icon: <Video size={ICON} />,
    group: 'secondary',
    pattern: 'toggle',
    tone: 'neutral',
    why: 'Opens/holds a feed — a meaningful on/off, so labeled toggle.',
  },
  notifications: {
    label: 'Notifications',
    icon: <Bell size={ICON} />,
    group: 'secondary',
    pattern: 'navButton',
    tone: 'neutral',
    why: 'Opens a panel (now also holds Mute). Salient enough to keep its label.',
  },
  logs: {
    label: 'Logs',
    icon: <List size={ICON} />,
    group: 'secondary',
    pattern: 'iconButton',
    tone: 'neutral',
    why: 'Low-signal icon-only — but turns red with the error count when the device has errors, so there is no separate "Errors" entry (Von Restorff).',
  },
  calibrations: {
    label: 'Calibrate',
    icon: <Wrench size={ICON} />,
    group: 'secondary',
    pattern: 'progress',
    tone: 'neutral',
    why: 'One-shot with progress — Calibrate -> Calibrating… -> Calibrated (Goal Gradient).',
  },
  wipers: {
    label: 'Wipers',
    icon: <Droplets size={ICON} />,
    group: 'secondary',
    pattern: 'toggle',
    tone: 'caution',
    why: 'Local altered state — labeled toggle, caution tone.',
  },
  jam: {
    label: 'Jam',
    icon: <JamIcon size={ICON} />,
    group: 'secondary',
    pattern: 'destructiveSplit',
    tone: 'danger',
    why: 'Destructive — danger split (Jam / Jam all), confirm, active JAMMING state.',
  },
  audio: {
    label: 'Audio',
    icon: <Radio size={ICON} />,
    group: 'secondary',
    pattern: 'selector',
    tone: 'neutral',
    why: 'Pick-one from a set — combobox.',
  },
};

// ---------------------------------------------------------------------------
// Devices (corrected matrix)
// ---------------------------------------------------------------------------

export type LabDeviceKind =
  | 'camera'
  | 'radar'
  | 'drone'
  | 'jam'
  | 'weapon'
  | 'lidar'
  | 'ramcall'
  | 'lightProjector'
  | 'pathfinder';

interface DeviceActionSet {
  primary: ActionId[];
  secondary: ActionId[];
}

export const DEVICE_ACTIONS: Record<LabDeviceKind, DeviceActionSet> = {
  camera: { primary: ['showOnMap'], secondary: ['watchVideo', 'notifications', 'logs'] },
  radar: { primary: ['showOnMap'], secondary: ['notifications', 'logs'] },
  drone: {
    primary: ['showOnMap'],
    secondary: ['watchVideo', 'notifications', 'logs', 'calibrations', 'wipers'],
  },
  jam: { primary: ['showOnMap'], secondary: ['notifications', 'logs', 'jam'] },
  weapon: { primary: ['showOnMap'], secondary: ['logs'] },
  lidar: { primary: ['showOnMap'], secondary: ['notifications', 'logs'] },
  ramcall: { primary: ['showOnMap', 'onOff'], secondary: ['logs', 'audio'] },
  lightProjector: { primary: ['showOnMap', 'onOff'], secondary: ['logs'] },
  pathfinder: { primary: ['showOnMap'], secondary: ['watchVideo', 'calibrations'] },
};

type TileIcon = FC<{ size?: number; fill?: string; active?: boolean }>;

export interface LabDevice {
  id: string;
  name: string;
  kind: LabDeviceKind;
  Icon: TileIcon;
  meta: string;
  stats: { label: string; value: string; color?: string }[];
  online: boolean;
  cameraPreview?: boolean;
  /** Pre-seed an error count so the Logs control lights up red with a badge. */
  errorCount?: number;
}

/**
 * The stress devices from the plan: busiest bar (Drone), destructive split
 * (Jam), On/Off + selector (Ramcall), watch-video + errored Logs (Camera),
 * and a second On/Off (Floodlight).
 */
export const LAB_DEVICES: LabDevice[] = [
  {
    id: 'DRN-3',
    name: 'Patrol-3',
    kind: 'drone',
    Icon: DroneDeviceIcon,
    meta: '120 m · 64%',
    stats: [
      { label: 'Location', value: '32.774, 35.033' },
      { label: 'Altitude', value: '120 m' },
      { label: 'Battery', value: '64%', color: 'text-emerald-300' },
    ],
    online: true,
  },
  {
    id: 'ECM-1',
    name: 'Regulus North',
    kind: 'jam',
    Icon: SensorIcon,
    meta: '2.5 km coverage',
    stats: [
      { label: 'Location', value: '32.833, 35.041' },
      { label: 'Coverage', value: '2,500 m' },
      { label: 'Health', value: 'OK', color: 'text-emerald-300' },
    ],
    online: true,
  },
  {
    id: 'SPK-1',
    name: 'LRAD North',
    kind: 'ramcall',
    Icon: SpeakerIcon,
    meta: 'Idle',
    stats: [
      { label: 'Location', value: '32.825, 35.055' },
      { label: 'Health', value: 'OK', color: 'text-emerald-300' },
    ],
    online: true,
  },
  {
    id: 'CAM-1',
    name: 'PTZ North',
    kind: 'camera',
    Icon: CameraIcon,
    meta: 'FOV 62° · 82%',
    stats: [
      { label: 'Location', value: '32.811, 35.021' },
      { label: 'Bearing', value: '145°' },
      { label: 'Field of view', value: '62°' },
    ],
    online: true,
    cameraPreview: true,
    errorCount: 2,
  },
  {
    id: 'FLD-1',
    name: 'Perimeter Floodlight',
    kind: 'lightProjector',
    Icon: FloodlightIcon,
    meta: 'Off',
    stats: [
      { label: 'Location', value: '32.792, 35.083' },
      { label: 'Health', value: 'OK', color: 'text-emerald-300' },
    ],
    online: true,
  },
];

export const AUDIO_TRACKS = ['Evacuate — EN', 'Warning — HE', 'Siren', 'Disperse — AR'];

// ---------------------------------------------------------------------------
// Per-card shared state
// ---------------------------------------------------------------------------

/**
 * The header Play toggle and the footer audio selector live in different
 * parts of the card but must agree on which track is queued, so the queued
 * track is shared per card. Lets the icon-only Play button name its track on
 * hover instead of leaving the operator guessing.
 */
interface SelectedTrack {
  index: number;
  label: string;
  setIndex: (index: number) => void;
}

const SelectedTrackContext = createContext<SelectedTrack | null>(null);

export function DeviceCardProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0);
  const value = useMemo<SelectedTrack>(
    () => ({ index, label: AUDIO_TRACKS[index], setIndex }),
    [index],
  );
  return <SelectedTrackContext.Provider value={value}>{children}</SelectedTrackContext.Provider>;
}

function useSelectedTrack() {
  return useContext(SelectedTrackContext);
}

// ---------------------------------------------------------------------------
// Pattern controls
// ---------------------------------------------------------------------------

interface ControlProps {
  id: ActionId;
  device: LabDevice;
  /** Force the compact icon-only glyph (header / collapsed rail). */
  iconOnly?: boolean;
}

const offlineReason = (online: boolean) => (online ? null : 'Device offline');

/** icon-only glyph + tooltip — Show on map. Never takes a label. */
function IconButtonAction({ id, device }: ControlProps) {
  const meta = ACTION_META[id];
  // Show on map stays enabled offline (you can still recenter the map).
  const disabled = id === 'showOnMap' ? false : !device.online;
  return (
    <DeviceAction
      icon={meta.icon}
      iconOnly
      tone={meta.tone}
      ghost
      tooltip={meta.label}
      ariaLabel={meta.label}
      disabled={disabled}
      disabledReason={offlineReason(device.online)}
      onClick={() => console.info(`[layout-lab] ${id}`, device.id)}
    />
  );
}

/**
 * Logs is icon-only and low-signal until something breaks: with an error
 * count it turns danger-toned and grows a red count badge, so the row never
 * carries a redundant separate "Errors" control.
 */
function LogsAction({ device }: ControlProps) {
  const meta = ACTION_META.logs;
  const count = device.errorCount ?? 0;
  const hasErrors = count > 0;
  const label = hasErrors
    ? `Logs · ${count} ${count === 1 ? 'error' : 'errors'}`
    : 'Logs';
  return (
    <span className="relative inline-flex">
      <DeviceAction
        icon={meta.icon}
        iconOnly
        ghost
        tone={hasErrors ? 'danger' : 'neutral'}
        tooltip={label}
        ariaLabel={label}
        onClick={() => console.info('[layout-lab] logs', device.id)}
      />
      {hasErrors && (
        <span className="pointer-events-none absolute -end-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-none text-white ring-2 ring-[#141414]">
          {count}
        </span>
      )}
    </span>
  );
}

const TOGGLE_LABELS: Partial<Record<ActionId, { on: string; off: string }>> = {
  onOff: { on: 'On', off: 'Off' },
  watchVideo: { on: 'Watching', off: 'Watch video' },
  wipers: { on: 'Wipers on', off: 'Wipers' },
};

/**
 * On/Off is one unified primary toggle, but it carries the device's own
 * glyph + verb so the header reads naturally: Ramcall plays audio, a Light
 * projector turns on.
 */
const ON_OFF_BY_KIND: Partial<Record<LabDeviceKind, { icon: ReactNode; on: string; off: string }>> = {
  ramcall: { icon: <Play size={ICON} />, on: 'Stop', off: 'Play' },
  lightProjector: { icon: <Sun size={ICON} />, on: 'Turn off', off: 'Turn on' },
};

function ToggleAction({ id, device, iconOnly }: ControlProps) {
  const meta = ACTION_META[id];
  const [on, setOn] = useState(false);
  const onOff = id === 'onOff' ? ON_OFF_BY_KIND[device.kind] : undefined;
  // Wipers run continuously while on, so the lit state swaps the glyph for
  // the dot-matrix spinner. It stays a normal (non-`loading`) button so the
  // second click stops it.
  const runningSpinner = id === 'wipers' && on;
  const icon = runningSpinner ? (
    <DotmSquare3 size={14} dotSize={2} ariaLabel="Wipers running" />
  ) : (
    onOff?.icon ?? meta.icon
  );
  const labels = onOff ?? TOGGLE_LABELS[id] ?? { on: meta.label, off: meta.label };
  const label = on ? labels.on : labels.off;

  // Ramcall's Play toggle names the queued track so the icon-only header
  // button says what it will broadcast on hover.
  const track = useSelectedTrack();
  const namesTrack = id === 'onOff' && device.kind === 'ramcall' && track != null;
  const tooltipText = namesTrack ? `${label} · ${track!.label}` : label;
  const ariaText = namesTrack ? `${label} — ${track!.label}` : label;

  return (
    <DeviceAction
      icon={icon}
      label={iconOnly ? undefined : label}
      iconOnly={iconOnly}
      tone={meta.tone}
      pressed={on}
      ghost={iconOnly}
      tooltip={iconOnly ? tooltipText : namesTrack ? tooltipText : undefined}
      ariaLabel={ariaText}
      disabled={!device.online}
      disabledReason={offlineReason(device.online)}
      onClick={() => setOn((v) => !v)}
    />
  );
}

/** icon + text, opens a panel — Notifications. */
function NavAction({ id, device, iconOnly }: ControlProps) {
  const meta = ACTION_META[id];
  return (
    <DeviceAction
      icon={meta.icon}
      label={iconOnly ? undefined : meta.label}
      iconOnly={iconOnly}
      tone={meta.tone}
      ghost={iconOnly}
      tooltip={iconOnly ? meta.label : undefined}
      ariaLabel={meta.label}
      disabled={!device.online}
      disabledReason={offlineReason(device.online)}
      onClick={() => console.info(`[layout-lab] open ${id}`, device.id)}
    />
  );
}

type CalibState = 'idle' | 'running' | 'done';

function CalibrateAction({ device, iconOnly }: ControlProps) {
  const meta = ACTION_META.calibrations;
  const [state, setState] = useState<CalibState>('idle');

  useEffect(() => {
    if (state !== 'running') return;
    const t = setTimeout(() => setState('done'), 2000);
    return () => clearTimeout(t);
  }, [state]);
  useEffect(() => {
    if (state !== 'done') return;
    const t = setTimeout(() => setState('idle'), 1500);
    return () => clearTimeout(t);
  }, [state]);

  const label = state === 'running' ? 'Calibrating…' : state === 'done' ? 'Calibrated' : 'Calibrate';
  const icon =
    state === 'done' ? <Check size={ICON} className="text-emerald-400" /> : meta.icon;

  return (
    <DeviceAction
      icon={icon}
      label={iconOnly ? undefined : label}
      iconOnly={iconOnly}
      tone={meta.tone}
      ghost={iconOnly}
      tooltip={iconOnly ? label : undefined}
      ariaLabel={label}
      loading={state === 'running'}
      disabled={!device.online || state !== 'idle'}
      disabledReason={offlineReason(device.online)}
      onClick={() => setState('running')}
    />
  );
}

type JamState = 'idle' | 'confirm' | 'jamming';

function JamAction({ device, iconOnly }: ControlProps) {
  const meta = ACTION_META.jam;
  const [state, setState] = useState<JamState>('idle');
  const [scope, setScope] = useState<'one' | 'all'>('one');
  const [menuOpen, setMenuOpen] = useState(false);

  const armConfirm = (next: 'one' | 'all') => {
    setMenuOpen(false);
    setScope(next);
    setState('confirm');
  };

  if (iconOnly) {
    return (
      <DeviceAction
        icon={meta.icon}
        iconOnly
        ghost
        tone="danger"
        tooltip="Jam"
        ariaLabel="Jam"
        disabled={!device.online}
        disabledReason={offlineReason(device.online)}
        onClick={() => console.info('[layout-lab] jam', device.id)}
      />
    );
  }

  if (state === 'jamming') {
    return (
      <DeviceAction
        icon={
          <span className="relative flex size-3 items-center justify-center">
            <span className="absolute inline-flex size-2 rounded-full bg-red-400 opacity-75 animate-ping motion-reduce:hidden" />
            <span className="relative inline-flex size-1.5 rounded-full bg-red-300" />
          </span>
        }
        label={scope === 'all' ? 'JAMMING ALL' : 'JAMMING'}
        tone="danger"
        pressed
        ariaLabel="Stop jamming"
        onClick={() => setState('idle')}
      />
    );
  }

  if (state === 'confirm') {
    return (
      <div className="inline-flex items-center gap-1.5" role="group" aria-label="Confirm jam">
        <span className="text-xs text-white/70">{scope === 'all' ? 'Jam all?' : 'Jam?'}</span>
        <DeviceAction
          icon={<Check size={ICON} />}
          label="Confirm"
          tone="danger"
          ariaLabel="Confirm jam"
          onClick={() => setState('jamming')}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setState('idle');
          }}
          className="rounded px-2 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // idle — split button: [ Jam | ⌄ ] where ⌄ opens the Jam-all menu.
  return (
    <div className="relative inline-flex">
      <div className="inline-flex items-stretch overflow-hidden rounded">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            armConfirm('one');
          }}
          disabled={!device.online}
          aria-label="Jam"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[oklch(0.927_0.062_17)] bg-[oklch(0.348_0.111_17)] hover:bg-[oklch(0.445_0.151_17)] transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {meta.icon}
          Jam
        </button>
        <span className="w-px bg-black/30" aria-hidden="true" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          disabled={!device.online}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="More jam options"
          className={`inline-flex items-center px-1.5 text-[oklch(0.927_0.062_17)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-300/50 disabled:opacity-50 disabled:cursor-not-allowed ${
            menuOpen ? 'bg-[oklch(0.445_0.151_17)]' : 'bg-[oklch(0.348_0.111_17)] hover:bg-[oklch(0.445_0.151_17)]'
          }`}
        >
          <ChevronDown
            size={ICON}
            className={`transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute end-0 top-full z-20 mt-1 flex min-w-[160px] flex-col gap-0.5 rounded-md border border-white/10 bg-zinc-900 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none"
          >
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                armConfirm('one');
              }}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-start text-xs text-white/80 hover:bg-white/10 [&_svg]:size-3"
            >
              <JamIcon size={ICON} />
              <span className="flex-1">Jam this jammer</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                armConfirm('all');
              }}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-start text-xs text-red-300 hover:bg-red-500/10 [&_svg]:size-3"
            >
              <JamIcon size={ICON} />
              <span className="flex-1">Jam all jammers</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AudioSelect({ device, iconOnly }: ControlProps) {
  const meta = ACTION_META.audio;
  const track = useSelectedTrack();
  const [localIndex, setLocalIndex] = useState(0);
  const index = track?.index ?? localIndex;
  const cycle = () => {
    const next = (index + 1) % AUDIO_TRACKS.length;
    if (track) track.setIndex(next);
    else setLocalIndex(next);
  };

  if (iconOnly) {
    return (
      <DeviceAction
        icon={meta.icon}
        iconOnly
        ghost
        tone="neutral"
        tooltip={`Audio — ${AUDIO_TRACKS[index]}`}
        ariaLabel="Audio selection"
        disabled={!device.online}
        onClick={cycle}
      />
    );
  }

  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={false}
      aria-label="Audio selection"
      disabled={!device.online}
      onClick={(e) => {
        e.stopPropagation();
        cycle();
      }}
      className="inline-flex h-7 min-w-0 max-w-[160px] items-center justify-between gap-1.5 rounded px-2 text-xs font-medium text-white/[0.64] hover:text-white bg-white/[0.05] hover:bg-white/[0.10] transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Radio size={ICON} className="shrink-0 opacity-70" />
      <span className="truncate">{AUDIO_TRACKS[index]}</span>
      <ChevronDown size={ICON} className="shrink-0 opacity-60" />
    </button>
  );
}

/** Single dispatcher — every variant renders actions through this. */
export function ActionControl({ id, device, iconOnly }: ControlProps) {
  const { pattern } = ACTION_META[id];
  switch (pattern) {
    case 'iconButton':
      return id === 'logs' ? (
        <LogsAction id={id} device={device} />
      ) : (
        <IconButtonAction id={id} device={device} />
      );
    case 'toggle':
      return <ToggleAction id={id} device={device} iconOnly={iconOnly} />;
    case 'navButton':
      return <NavAction id={id} device={device} iconOnly={iconOnly} />;
    case 'progress':
      return <CalibrateAction id={id} device={device} iconOnly={iconOnly} />;
    case 'selector':
      return <AudioSelect id={id} device={device} iconOnly={iconOnly} />;
    case 'destructiveSplit':
      return <JamAction id={id} device={device} iconOnly={iconOnly} />;
    default:
      return null;
  }
}
