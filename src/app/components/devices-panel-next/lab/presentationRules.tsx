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
import { Check, ChevronDown, Power, Radio } from '@/lib/icons/central';
import { JamIcon } from '@/primitives/ProductIcons';
import {
  CalibrationIcon,
  MapPinIcon,
  NotificationIcon,
  NotificationMutedIcon,
  PauseIcon,
  PlayFilledIcon,
  WatchStreamIcon,
  WipeIcon,
} from '../../devices-panel/icons';
import { DotmSquare1 } from '@/app/components/ui/dotm-square-1';
import { CameraIcon, SensorIcon, SpeakerIcon, FloodlightIcon } from '../../tacticalIcons';
import { DroneDeviceIcon } from '@/primitives/ProductIcons';
import { DeviceAction } from '../../devices-panel/DeviceAction';
import type { DeviceActionTone } from '../../devices-panel/deviceActionTones';
import { FloodlightSegmentedCompact } from '../../devices-panel/controls/FloodlightSegmentedToggle';
import type { DeviceHealth } from '../../devices-panel/deviceHealth';
import type { ConnectionState } from '../../devices-panel/types';

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export type ActionId =
  | 'showOnMap'
  | 'onOff'
  | 'watchVideo'
  | 'notifications'
  | 'mute'
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

/** Logs glyph — a 3-column grid of bars (custom, no Central twin). */
function LogsGridIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 2H9.75H14.25H15V3.5H14.25H9.75H9V2ZM9 12.5H9.75H14.25H15V14H14.25H9.75H9V12.5ZM9.75 7.25H9V8.75H9.75H14.25H15V7.25H14.25H9.75ZM1 12.5H1.75H2.25H3V14H2.25H1.75H1V12.5ZM1.75 2H1V3.5H1.75H2.25H3V2H2.25H1.75ZM1 7.25H1.75H2.25H3V8.75H2.25H1.75H1V7.25ZM5.75 12.5H5V14H5.75H6.25H7V12.5H6.25H5.75ZM5 2H5.75H6.25H7V3.5H6.25H5.75H5V2ZM5.75 7.25H5V8.75H5.75H6.25H7V7.25H6.25H5.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

export const ACTION_META: Record<ActionId, ActionMeta> = {
  showOnMap: {
    label: 'Show on map',
    icon: <MapPinIcon size={ICON} />,
    group: 'primary',
    pattern: 'iconButton',
    tone: 'neutral',
    why: 'Universal + one-shot. Icon-only keeps every row calm (Law of Similarity).',
  },
  onOff: {
    label: 'On / Off',
    icon: <Power size={ICON} className="[&_path]:stroke-2" />,
    group: 'primary',
    pattern: 'toggle',
    tone: 'neutral',
    why: 'Power state must be unambiguous — labeled toggle, lit bright white when on (not an iOS switch).',
  },
  watchVideo: {
    label: 'Watch video',
    icon: <WatchStreamIcon size={ICON} />,
    group: 'secondary',
    pattern: 'toggle',
    tone: 'neutral',
    why: 'Opens/holds a feed — a meaningful on/off, so labeled toggle.',
  },
  notifications: {
    label: 'Notifications',
    icon: <NotificationIcon size={ICON} />,
    group: 'secondary',
    pattern: 'navButton',
    tone: 'neutral',
    why: 'Lives in the 3-dot overflow as a timed toggle: arm it for a 30s window (lit bell + countdown + radar sweep), press again to disarm. Low-signal enough to stay tucked away until needed.',
  },
  mute: {
    label: 'Mute',
    icon: <NotificationIcon size={ICON} />,
    group: 'secondary',
    pattern: 'toggle',
    tone: 'neutral',
    why: 'Silences the asset — labeled toggle, bell becomes a slashed bell when muted.',
  },
  logs: {
    label: 'Logs',
    icon: <LogsGridIcon size={ICON} />,
    group: 'secondary',
    pattern: 'iconButton',
    tone: 'neutral',
    why: 'Low-signal icon-only — but turns red with the error count when the device has errors, so there is no separate "Errors" entry (Von Restorff).',
  },
  calibrations: {
    label: 'Calibrate',
    icon: <CalibrationIcon size={ICON} />,
    group: 'secondary',
    pattern: 'progress',
    tone: 'neutral',
    why: 'One-shot with progress — Calibrate -> Calibrating… -> Calibrated (Goal Gradient).',
  },
  wipers: {
    label: 'Wipers',
    icon: <WipeIcon size={ICON} />,
    group: 'secondary',
    pattern: 'toggle',
    tone: 'neutral',
    why: 'Local altered state — labeled toggle, lit bright white when on.',
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
  ramcall: { primary: ['showOnMap', 'onOff'], secondary: ['mute', 'logs', 'audio'] },
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
  /**
   * Worst-wins severity for the icon tile (mirrors the real `deviceHealth`
   * binary model). Defaults to `ok` when online, `error` otherwise.
   */
  health?: DeviceHealth;
  /**
   * Connection state for the corner dot + tooltip chip. Defaults to
   * `online` / `offline` from `online`.
   */
  connection?: ConnectionState;
  /** Extra human-readable reason shown under the chip in the tile tooltip. */
  healthReason?: string;
}

/**
 * The stress devices from the plan: busiest bar (Drone), destructive split
 * (Jam), On/Off + selector (Ramcall), watch-video + errored Logs (Camera),
 * and a second On/Off (Floodlight).
 */
export const LAB_DEVICES: LabDevice[] = [
  // ok — healthy, online, default-expanded
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
    health: 'ok',
  },
  // errored asset — red errors chip + red Logs
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
    health: 'error',
    healthReason: 'Sensor fault',
  },
  // error — degraded connection remains the reason
  {
    id: 'SPK-1',
    name: 'LRAD North',
    kind: 'ramcall',
    Icon: SpeakerIcon,
    meta: 'Idle',
    stats: [
      { label: 'Location', value: '32.825, 35.055' },
      { label: 'Health', value: 'Degraded', color: 'text-amber-400' },
    ],
    online: true,
    health: 'error',
    connection: 'warning',
    healthReason: 'Connection degraded',
  },
  // error — offline is retained as connection input and surfaced as the reason
  {
    id: 'ECM-1',
    name: 'Regulus North',
    kind: 'jam',
    Icon: SensorIcon,
    meta: '2.5 km coverage',
    stats: [
      { label: 'Location', value: '32.833, 35.041' },
      { label: 'Coverage', value: '2,500 m' },
      { label: 'Health', value: 'Offline', color: 'text-white/50' },
    ],
    online: false,
    health: 'error',
    connection: 'offline',
    healthReason: 'Device offline',
  },
  // ok — second On/Off device, lone-overflow footer
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
    health: 'ok',
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
/** How long a single armed notifications window lasts before auto-disarming. */
export const NOTIFY_WINDOW_S = 30;

interface CardState {
  index: number;
  label: string;
  setIndex: (index: number) => void;
  /** Speaker Play/Stop state — shared so the Play button + now-playing indicator agree. */
  playing: boolean;
  setPlaying: (value: boolean) => void;
  /** Mute toggle state — drives the bell ↔ slashed-bell glyph. */
  muted: boolean;
  setMuted: (value: boolean) => void;
  /**
   * Notifications armed state + live countdown. Lifted to the card so the
   * footer overflow toggle and the always-visible header indicator stay in
   * sync — arming it from the menu keeps counting down even after the menu
   * closes or the row collapses.
   */
  notifyOn: boolean;
  notifyRemaining: number;
  setNotifyOn: (value: boolean) => void;
}

const CardStateContext = createContext<CardState | null>(null);

export function DeviceCardProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [notifyOn, setNotifyOn] = useState(false);
  const [notifyRemaining, setNotifyRemaining] = useState(NOTIFY_WINDOW_S);

  // The countdown lives here (not in the menu row) so it survives the menu
  // closing and the row collapsing; it auto-disarms when the window lapses.
  useEffect(() => {
    if (!notifyOn) return;
    setNotifyRemaining(NOTIFY_WINDOW_S);
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const left = NOTIFY_WINDOW_S - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) setNotifyOn(false);
      else setNotifyRemaining(left);
    }, 250);
    return () => window.clearInterval(tick);
  }, [notifyOn]);

  const value = useMemo<CardState>(
    () => ({
      index,
      label: AUDIO_TRACKS[index],
      setIndex,
      playing,
      setPlaying,
      muted,
      setMuted,
      notifyOn,
      notifyRemaining,
      setNotifyOn,
    }),
    [index, playing, muted, notifyOn, notifyRemaining],
  );
  return <CardStateContext.Provider value={value}>{children}</CardStateContext.Provider>;
}

export function useCardState() {
  return useContext(CardStateContext);
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
        <span className="pointer-events-none absolute -end-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-3xs font-semibold leading-none text-white ring-2 ring-[#141414]">
          {count}
        </span>
      )}
    </span>
  );
}

const TOGGLE_LABELS: Partial<Record<ActionId, { on: string; off: string }>> = {
  onOff: { on: 'On', off: 'Off' },
  watchVideo: { on: 'Watching', off: 'Watch video' },
  wipers: { on: 'Wiping…', off: 'Wipers' },
  mute: { on: 'Muted', off: 'Mute' },
};

interface OnOffKind {
  /** Static glyph used in both states (e.g. the light projector's sun). */
  icon?: ReactNode;
  /** Distinct on/off glyphs (e.g. the speaker's Pause/Play). */
  onIcon?: ReactNode;
  offIcon?: ReactNode;
  on: string;
  off: string;
}

/**
 * On/Off is one unified primary toggle, but it carries the device's own
 * glyph + verb so the header reads naturally: Ramcall plays/pauses audio, a
 * Light projector turns on.
 */
const ON_OFF_BY_KIND: Partial<Record<LabDeviceKind, OnOffKind>> = {
  ramcall: {
    offIcon: <PlayFilledIcon size={ICON} />,
    onIcon: <PauseIcon size={ICON} />,
    on: 'Stop',
    off: 'Play',
  },
};

function ToggleAction({ id, device, iconOnly }: ControlProps) {
  const meta = ACTION_META[id];
  const card = useCardState();
  // The speaker Play/Stop and the Mute toggle are shared per-card state so the
  // header glyph, the now-playing indicator, and the footer agree. Everything
  // else keeps a private toggle.
  const isSpeakerPlay = id === 'onOff' && device.kind === 'ramcall';
  const isFloodlight = id === 'onOff' && device.kind === 'lightProjector';
  const isMute = id === 'mute';
  const [localOn, setLocalOn] = useState(false);
  const on = isSpeakerPlay ? card?.playing ?? false : isMute ? card?.muted ?? false : localOn;
  const setOn = (next: boolean) => {
    if (isSpeakerPlay && card) card.setPlaying(next);
    else if (isMute && card) card.setMuted(next);
    else setLocalOn(next);
  };

  if (isFloodlight) {
    return (
      <FloodlightSegmentedCompact
        on={on}
        onToggle={() => setOn(!on)}
        disabled={!device.online}
      />
    );
  }

  const onOff = id === 'onOff' ? ON_OFF_BY_KIND[device.kind] : undefined;
  // Wipers run continuously while on, so the lit state swaps the glyph for
  // the dot-matrix spinner. It stays a normal (non-`loading`) button so the
  // second click stops it.
  const runningSpinner = id === 'wipers' && on;
  const ICON_SLOT = 20;
  const stateIcon = onOff
    ? (on ? onOff.onIcon : onOff.offIcon) ?? onOff.icon ?? meta.icon
    : isMute
      ? on
        ? <NotificationMutedIcon size={ICON} />
        : <NotificationIcon size={ICON} />
      : meta.icon;
  const icon = runningSpinner ? (
    <DotmSquare1
      size={ICON_SLOT}
      dotSize={2}
      speed={1.1}
      pattern="full"
      colorPreset="solid-theme"
      animated
      opacityBase={0.12}
      opacityMid={0.42}
      opacityPeak={1}
      ariaLabel="Wipers running"
    />
  ) : (
    stateIcon
  );
  const labels = onOff ?? TOGGLE_LABELS[id] ?? { on: meta.label, off: meta.label };
  const label = on ? labels.on : labels.off;

  // Ramcall's Play toggle names the queued track so the icon-only header
  // button says what it will broadcast on hover.
  const track = card;
  const namesTrack = isSpeakerPlay && track != null;
  const tooltipText = namesTrack ? `${label} · ${track!.label}` : label;
  const ariaText = namesTrack ? `${label} — ${track!.label}` : label;

  // Reserve the widest state so flipping on/off never resizes the button
  // (Fitts: a stable target that doesn't shift under the cursor). Both
  // labels share one grid cell; the inactive one stays laid out but hidden,
  // so the cell is always max(on, off) wide. The accessible name comes from
  // `ariaLabel`, so the stacked text is decorative.
  const labelNode = iconOnly ? undefined : (
    <span className="grid">
      <span
        aria-hidden="true"
        className={`col-start-1 row-start-1 whitespace-nowrap ${on ? '' : 'invisible'}`}
      >
        {labels.on}
      </span>
      <span
        aria-hidden="true"
        className={`col-start-1 row-start-1 whitespace-nowrap ${on ? 'invisible' : ''}`}
      >
        {labels.off}
      </span>
    </span>
  );

  // Footer toggles use a size-4 icon slot; `[&_svg]:size-4` scales the glyph to
  // fill it and the wipers spinner is sized to match, so the icon column never
  // shifts when the spinner swaps in.
  const iconNode = iconOnly ? icon : (
    <span className="inline-flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
      {icon}
    </span>
  );

  return (
    <DeviceAction
      icon={iconNode}
      label={labelNode}
      iconOnly={iconOnly}
      tone={meta.tone}
      pressed={on}
      ghost={iconOnly}
      tooltip={iconOnly ? tooltipText : namesTrack ? tooltipText : undefined}
      ariaLabel={ariaText}
      disabled={!device.online}
      disabledReason={offlineReason(device.online)}
      onClick={() => setOn(!on)}
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
  const glyph =
    state === 'done' ? <Check size={ICON} className="text-emerald-400" /> : meta.icon;
  // Match the footer toggles' size-4 glyph; the header (icon-only) stays
  // compact and lets DeviceAction clamp the svg.
  const icon = iconOnly ? glyph : (
    <span className="inline-flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
      {glyph}
    </span>
  );

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
          className="rounded px-2 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-state-hover-overlay transition-colors"
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
            className="absolute end-0 top-full z-20 mt-1 flex min-w-[160px] flex-col gap-0.5 rounded-md border border-white/10 bg-slate-2 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none"
          >
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                armConfirm('one');
              }}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-start text-xs text-white/80 hover:bg-state-hover-overlay [&_svg]:size-3"
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
  const track = useCardState();
  const [localIndex, setLocalIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const index = track?.index ?? localIndex;

  const select = (next: number) => {
    if (track) track.setIndex(next);
    else setLocalIndex(next);
    setOpen(false);
  };

  // icon-only fallback (e.g. a collapsed rail) keeps the lightweight cycle —
  // there's no room for a chevron + popover there.
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
        onClick={() => select((index + 1) % AUDIO_TRACKS.length)}
      />
    );
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Audio selection"
        disabled={!device.online}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        // Fixed width so picking a longer/shorter track name never resizes
        // the control (same anti-jump rule as the toggles).
        className={`inline-flex h-7 w-[150px] items-center justify-between gap-1.5 rounded px-2 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-state-focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${
          open
            ? 'text-white bg-white/[0.10]'
            : 'text-white/[0.64] hover:text-white bg-white/[0.05] hover:bg-state-hover-overlay'
        }`}
      >
        <Radio size={ICON} className="shrink-0 opacity-70" />
        <span className="flex-1 truncate text-start">{AUDIO_TRACKS[index]}</span>
        <ChevronDown
          size={ICON}
          className={`shrink-0 opacity-60 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="listbox"
            aria-label="Audio tracks"
            className="absolute start-0 top-full z-20 mt-1 flex min-w-[180px] flex-col gap-0.5 rounded-md border border-white/10 bg-slate-2 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none"
          >
            {AUDIO_TRACKS.map((trackLabel, i) => {
              const selected = i === index;
              return (
                <button
                  key={trackLabel}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={(e) => {
                    e.stopPropagation();
                    select(i);
                  }}
                  className={`flex items-center gap-2 rounded px-2 py-1.5 text-start text-xs [&_svg]:size-3 ${
                    selected ? 'bg-white/[0.08] text-white' : 'text-white/80 hover:bg-state-hover-overlay'
                  }`}
                >
                  <span className="flex w-3 shrink-0 items-center justify-center">
                    {selected && <Check className="text-white" />}
                  </span>
                  <span className="flex-1 truncate">{trackLabel}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
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
