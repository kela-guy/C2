import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDrag, useDragLayer } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { X, Camera, Plane, MapPin, BellOff, Wrench, Check, Loader2, Pin, PinFilled, PinOff, Square, ChevronsUpDown } from '@/lib/icons/central';
import { GridblockPanel } from './gridblock';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Switch } from './ui/switch';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './ui/command';
import { Button } from './ui/button';
import { StatusChip } from '@/primitives/StatusChip';
import { JamIcon, BatteryIcon } from '@/primitives/ProductIcons';
import { FilterBar, type FilterDef } from '@/primitives';
import { accentHex, slateHex } from '@/primitives/accentHex';

export const DEVICE_CAMERA_DRAG_TYPE = 'DEVICE_CAMERA';
export interface DeviceCameraDragItem {
  cameraId: string;
  label: string;
  deviceType: 'camera' | 'drone';
}

export function DevicesIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 5C4 4.44772 4.44772 4 5 4H9C9.55228 4 10 4.44772 10 5V9C10 9.55228 9.55228 10 9 10H5C4.44772 10 4 9.55228 4 9V5Z" stroke="currentColor" strokeWidth="1.995" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 15C4 14.4477 4.44772 14 5 14H9C9.55228 14 10 14.4477 10 15V19C10 19.5523 9.55228 20 9 20H5C4.44772 20 4 19.5523 4 19V15Z" stroke="currentColor" strokeWidth="1.995" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 5C14 4.44772 14.4477 4 15 4H19C19.5523 4 20 4.44772 20 5V9C20 9.55228 19.5523 10 19 10H15C14.4477 10 14 9.55228 14 9V5Z" stroke="currentColor" strokeWidth="1.995" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 17C14 15.3431 15.3431 14 17 14C18.6569 14 20 15.3431 20 17C20 18.6569 18.6569 20 17 20C15.3431 20 14 18.6569 14 17Z" stroke="currentColor" strokeWidth="1.995" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/** Solid filled play glyph. Used by the speaker Play/Stop button — matches the rounded-corner triangle from the design library. */
function PlayFilledIcon({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.5145 2.14251C6.20556 1.95715 5.82081 1.95229 5.5073 2.1298C5.19379 2.30731 5 2.63973 5 3V21C5 21.3603 5.19379 21.6927 5.5073 21.8702C5.82081 22.0477 6.20556 22.0429 6.5145 21.8575L21.5145 12.8575C21.8157 12.6768 22 12.3513 22 12C22 11.6487 21.8157 11.3232 21.5145 11.1425L6.5145 2.14251Z" />
    </svg>
  );
}

export type DeviceType =
  | 'camera'
  | 'radar'
  | 'dock'
  | 'drone'
  | 'ecm'
  | 'launcher'
  | 'lidar'
  | 'weapon_system'
  | 'floodlight'
  | 'speaker';
export type ConnectionState = 'online' | 'offline' | 'error' | 'warning';
export type OperationalStatus = 'operational' | 'malfunctioning';
export type CameraCapability = 'video' | 'photo';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  lat: number;
  lon: number;
  status: 'available' | 'active' | 'offline';
  operationalStatus: OperationalStatus;
  connectionState: ConnectionState;
  fovDeg?: number;
  bearingDeg?: number;
  coverageRadiusM?: number;
  batteryPct?: number;
  capabilities?: CameraCapability[];
  altitude?: string;
  /** Icons may opt into an `active` prop to render their lit/playing variant (floodlight, speaker). Other icons ignore it. */
  Icon: React.FC<{ size?: number; fill?: string; active?: boolean }>;
}

const TYPE_ORDER: DeviceType[] = [
  'camera',
  'radar',
  'dock',
  'drone',
  'ecm',
  'launcher',
  'lidar',
  'weapon_system',
  'floodlight',
  'speaker',
];

/** English type-group labels. Override via `typeLabels` prop. */
export const DEFAULT_TYPE_LABELS: Record<DeviceType, string> = {
  camera: 'Cameras',
  radar: 'Radars',
  dock: 'Docks',
  drone: 'Drones',
  ecm: 'ECM',
  launcher: 'Launchers',
  lidar: 'LIDAR',
  weapon_system: 'Weapon systems',
  floodlight: 'Floodlights',
  speaker: 'Speakers',
};

/** Built-in audio tracks the speaker combobox offers when no override is supplied. */
export const DEFAULT_SPEAKER_TRACKS: { id: string; label: string }[] = [
  { id: 'air-raid', label: 'Air Raid' },
  { id: 'all-clear', label: 'All Clear' },
  { id: 'evacuate', label: 'Evacuate' },
  { id: 'lockdown', label: 'Lockdown' },
  { id: 'test-tone', label: 'Test Tone' },
];

const STATUS_SORT: Record<string, number> = { offline: 0, active: 1, available: 2 };

/** English connection-state labels. Override via `connectionStateLabels` prop. */
export const DEFAULT_CONNECTION_STATE_LABELS: Record<ConnectionState, string> = {
  online: 'Online',
  offline: 'Offline',
  error: 'Error',
  warning: 'Warning',
};

/** Strings consumed inside DevicesPanel + DeviceRow. All defaults are English; pass overrides via the `strings` prop. */
export interface DevicesPanelStrings {
  searchPlaceholder: string;
  clearSearch: string;
  resetFilters: string;
  resetFiltersLabel: string;
  /** Trigger label for the Type filter popover. */
  typeFilterLabel: string;
  noMatches: string;
  /** Stat-row labels in the expanded device card. */
  location: string;
  bearing: string;
  fieldOfView: string;
  coverage: string;
  altitude: string;
  health: string;
  healthOk: string;
  healthMalfunction: string;
  battery: string;
  /** ECM/jam controls. */
  jam: string;
  jamActive: string;
  jamDisabledOffline: string;
  jamDisabledMalfunction: string;
  jamDisabledAlreadyActive: string;
  centerOnMap: string;
  mute: string;
  unmute: string;
  wipers: string;
  wipersAriaLabel: string;
  calibrate: string;
  calibrating: string;
  calibrated: string;
  calibrateAriaLabel: string;
  /** Floodlight + speaker controls. */
  floodlightOn: string;
  floodlightOff: string;
  floodlightToggleAriaLabel: string;
  /** Hover-action copy ("Turn on" / "Turn off"). */
  floodlightTurnOn: string;
  floodlightTurnOff: string;
  speakerPlay: string;
  speakerStop: string;
  speakerPlaying: string;
  speakerDisabledOffline: string;
  audioTrack: string;
  audioTrackAriaLabel: string;
  audioTrackSearchPlaceholder: string;
  audioTrackNoMatches: string;
  /** Pin / unpin a camera or drone to a video feed slot in the playground. */
  pinToFeed: string;
  pinToFeedAriaLabel: string;
  unpinFromFeed: string;
  unpinFromFeedAriaLabel: string;
  /** Tooltip on the small collapsed-row pin toggle, in its off (not-pinned) state. */
  pinToFeedTooltip: string;
  /** Tooltip on the small collapsed-row pin toggle, in its on (pinned) state. */
  pinnedToFeedTooltip: string;
}

export const DEFAULT_DEVICE_PANEL_STRINGS: DevicesPanelStrings = {
  searchPlaceholder: 'Search…',
  clearSearch: 'Clear search',
  resetFilters: 'Reset filters',
  resetFiltersLabel: 'Clear',
  typeFilterLabel: 'Devices',
  noMatches: 'No matching devices',
  location: 'Location',
  bearing: 'Bearing',
  fieldOfView: 'Field of view',
  coverage: 'Coverage',
  altitude: 'Altitude',
  health: 'Health',
  healthOk: 'OK',
  healthMalfunction: 'Malfunction',
  battery: 'Battery',
  jam: 'Activate',
  jamActive: 'Jam active',
  jamDisabledOffline: 'Device offline',
  jamDisabledMalfunction: 'Device malfunction',
  jamDisabledAlreadyActive: 'Already jamming',
  centerOnMap: 'Center on map',
  mute: 'Mute',
  unmute: 'Unmute',
  wipers: 'Wipers',
  wipersAriaLabel: 'Wipers',
  calibrate: 'Calibrate',
  calibrating: 'Calibrating…',
  calibrated: 'Done',
  calibrateAriaLabel: 'Calibrate',
  floodlightOn: 'On',
  floodlightOff: 'Off',
  floodlightToggleAriaLabel: 'Toggle floodlight',
  floodlightTurnOn: 'Turn on',
  floodlightTurnOff: 'Turn off',
  speakerPlay: 'Play',
  speakerStop: 'Stop',
  speakerPlaying: 'Playing',
  speakerDisabledOffline: 'Speaker offline',
  audioTrack: 'Track',
  audioTrackAriaLabel: 'Audio track',
  audioTrackSearchPlaceholder: 'Search…',
  audioTrackNoMatches: 'No matches',
  pinToFeed: 'Pin to feed',
  pinToFeedAriaLabel: 'Pin device to a video feed',
  unpinFromFeed: 'Unpin',
  unpinFromFeedAriaLabel: 'Remove device from the video feed',
  pinToFeedTooltip: 'Pin to feed',
  pinnedToFeedTooltip: 'Pinned to feed',
};

const CONNECTION_STATE_COLORS: Record<ConnectionState, string> = {
  online: 'bg-accent-success',
  offline: 'bg-slate-9',
  error: 'bg-accent-danger',
  warning: 'bg-accent-warning',
};

const CONNECTION_STATE_CHIP_COLORS: Record<ConnectionState, 'green' | 'gray' | 'red' | 'orange'> = {
  online: 'green',
  offline: 'gray',
  error: 'red',
  warning: 'orange',
};

/**
 * Tiny self-ticking countdown for a single muted device. Owns its own
 * 1 Hz interval so the parent `DevicesPanel` doesn't have to re-render
 * every second to refresh `MM:SS` text on every visible row.
 */
function MuteCountdown({ expiry }: { expiry: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, expiry - now);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return (
    <>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </>
  );
}

function DeviceRowHoverButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  pressed,
}: {
  icon: typeof MapPin;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          disabled={disabled}
          aria-label={label}
          aria-pressed={pressed}
          className="inline-flex size-6 items-center justify-center rounded-xs text-slate-9 hover:text-slate-12 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon size={16} strokeWidth={1.75} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="px-2 py-1 text-[10px] text-slate-11 bg-surface-3 shadow-[0_0_0_1px_var(--border-default)] whitespace-nowrap"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function DeviceDragPreviewLayer() {
  const { item, itemType, isDragging, offset } = useDragLayer((monitor) => ({
    item: monitor.getItem<DeviceCameraDragItem | null>(),
    itemType: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    offset: monitor.getClientOffset() ?? monitor.getSourceClientOffset(),
  }));

  if (!isDragging || itemType !== DEVICE_CAMERA_DRAG_TYPE || !item || !offset) {
    return null;
  }

  const Icon = item.deviceType === 'drone' ? Plane : Camera;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[100] flex max-w-[120px] min-w-0 -translate-x-1/2 -translate-y-1/2 items-center gap-1 bg-surface-3 px-1.5 py-1 text-[11px] font-medium leading-none text-slate-12 shadow-[0_0_0_1px_var(--border-default),0_2px_8px_rgba(0,0,0,0.35)]"
      style={{ left: offset.x, top: offset.y }}
    >
      <Icon size={11} className="shrink-0 text-slate-10" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </div>,
    document.body,
  );
}

export function DeviceRow({
  device,
  isExpanded,
  onToggle,
  onHover,
  onJamActivate,
  onFloodlightToggle,
  onSpeakerToggle,
  isFloodlightOn,
  isSpeakerPlaying,
  speakerTracks = DEFAULT_SPEAKER_TRACKS,
  onFlyTo,
  isMuted,
  muteExpiry,
  onToggleMute,
  onPinToFeed,
  onUnpinFromFeed,
  isPinnedToFeed,
  connectionStateLabels = DEFAULT_CONNECTION_STATE_LABELS,
  strings = DEFAULT_DEVICE_PANEL_STRINGS,
}: {
  device: Device;
  isExpanded: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
  onJamActivate?: (jammerId: string) => void;
  onFloodlightToggle?: (floodlightId: string, next: boolean) => void;
  onSpeakerToggle?: (speakerId: string, next: boolean) => void;
  isFloodlightOn?: boolean;
  isSpeakerPlaying?: boolean;
  speakerTracks?: { id: string; label: string }[];
  onFlyTo: (lat: number, lon: number) => void;
  isMuted: boolean;
  /** Unix epoch ms when the mute expires; null when not muted. */
  muteExpiry: number | null;
  onToggleMute: (deviceId: string) => void;
  /** Pin a camera/drone into the next available video feed slot. */
  onPinToFeed?: (deviceId: string) => void;
  /** Unpin a camera/drone from its video feed slot. */
  onUnpinFromFeed?: (deviceId: string) => void;
  /** Whether this device is currently pinned to a feed. Drives the toggle visual + label. */
  isPinnedToFeed?: boolean;
  connectionStateLabels?: Record<ConnectionState, string>;
  strings?: DevicesPanelStrings;
}) {
  const metricParts: string[] = [];
  if (device.coverageRadiusM != null) metricParts.push(`${(device.coverageRadiusM / 1000).toFixed(1)}km`);

  const isMalfunctioning = device.operationalStatus === 'malfunctioning';
  const isCamera = device.type === 'camera';
  const canDragToVideo = isCamera || device.type === 'drone';
  const isFloodlight = device.type === 'floodlight';
  const isSpeaker = device.type === 'speaker';
  const [speakerTrack, setSpeakerTrack] = useState<string>(speakerTracks[0]?.id ?? '');
  const [speakerTrackOpen, setSpeakerTrackOpen] = useState(false);
  const selectedSpeakerTrack = speakerTracks.find((t) => t.id === speakerTrack) ?? speakerTracks[0];

  const [wipersOn, setWipersOn] = useState(false);
  const [calibState, setCalibState] = useState<'idle' | 'running' | 'done'>('idle');

  useEffect(() => {
    if (calibState !== 'running') return;
    const t = setTimeout(() => setCalibState('done'), 2000);
    return () => clearTimeout(t);
  }, [calibState]);

  useEffect(() => {
    if (calibState !== 'done') return;
    const t = setTimeout(() => setCalibState('idle'), 1500);
    return () => clearTimeout(t);
  }, [calibState]);

  const [{ isDragging }, dragRef, previewRef] = useDrag(() => ({
    type: DEVICE_CAMERA_DRAG_TYPE,
    item: {
      cameraId: device.id,
      label: device.name,
      deviceType: device.type === 'drone' ? 'drone' : 'camera',
    } satisfies DeviceCameraDragItem,
    canDrag: canDragToVideo,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [device.id, device.name, device.type, canDragToVideo]);

  useEffect(() => {
    if (!canDragToVideo) return;
    previewRef(getEmptyImage(), { captureDraggingState: true });
  }, [canDragToVideo, previewRef]);

  const statRows: { label: string; value: string; color?: string }[] = [
    { label: strings.location, value: `${device.lat.toFixed(4)}, ${device.lon.toFixed(4)}` },
  ];
  if (device.bearingDeg != null) statRows.push({ label: strings.bearing, value: `${device.bearingDeg}°` });
  if (device.fovDeg != null) statRows.push({ label: strings.fieldOfView, value: `${device.fovDeg}°` });
  if (device.coverageRadiusM != null) statRows.push({ label: strings.coverage, value: `${device.coverageRadiusM.toLocaleString()}m` });
  if (device.altitude != null) statRows.push({ label: strings.altitude, value: device.altitude });
  statRows.push({
    label: strings.health,
    value: isMalfunctioning ? strings.healthMalfunction : strings.healthOk,
    color: isMalfunctioning ? 'text-accent-warning' : 'text-accent-success',
  });
  if (device.batteryPct != null) {
    statRows.push({
      label: strings.battery,
      value: `${device.batteryPct}%`,
      color: device.batteryPct <= 20 ? 'text-accent-danger' : device.batteryPct <= 40 ? 'text-accent-warning' : 'text-accent-success',
    });
  }

  const showStatusDot = device.connectionState !== 'online';
  const isOffline = device.connectionState === 'offline';
  const canPinToFeed =
    (device.type === 'camera' || device.type === 'drone') &&
    !!(onPinToFeed || onUnpinFromFeed);

  return (
    <Collapsible open={isExpanded} style={isDragging ? { opacity: 0.4 } : undefined}>
      <div
        ref={canDragToVideo ? dragRef : undefined}
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className={`group relative flex items-center justify-center gap-2.5 px-4 py-2.5 transition-[background-color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong border-b border-border-default ${
          isExpanded ? 'bg-state-hover' : 'hover:bg-state-hover active:bg-state-hover-strong'
        } cursor-pointer`}
        onMouseEnter={() => onHover(device.id)}
        onMouseLeave={() => onHover(null)}
      >
        <div className={`relative w-8 h-8 rounded flex items-center justify-center shrink-0 ${isMalfunctioning ? 'bg-accent-warning-soft/40' : 'bg-state-hover-strong'}`}>
          <device.Icon
            size={20}
            fill={isMalfunctioning ? accentHex('warning') : slateHex(12)}
            active={(isFloodlight && !!isFloodlightOn) || (isSpeaker && !!isSpeakerPlaying)}
          />
          {showStatusDot && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`absolute -bottom-0.5 -end-0.5 size-2 rounded-full ring-2 ring-surface-1 ${CONNECTION_STATE_COLORS[device.connectionState]}`}
                  aria-label={connectionStateLabels[device.connectionState]}
                />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="px-2 py-1 text-[10px] text-slate-11 bg-surface-3 shadow-[0_0_0_1px_var(--border-default)] whitespace-nowrap"
              >
                {connectionStateLabels[device.connectionState]}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[13px] font-medium truncate ${isMalfunctioning ? 'text-accent-warning' : 'text-slate-11'}`}>{device.name}</span>
              {device.connectionState !== 'online' && (
                <StatusChip
                  label={connectionStateLabels[device.connectionState]}
                  color={CONNECTION_STATE_CHIP_COLORS[device.connectionState]}
                  className="h-5 px-1.5 text-[10px] leading-none"
                />
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isMuted && muteExpiry != null && (
                <span className="flex items-center gap-1 text-xs font-mono tabular-nums text-slate-12">
                  <BellOff size={12} className="text-slate-12" />
                  <MuteCountdown expiry={muteExpiry} />
                </span>
              )}
              {device.batteryPct != null && (
                <span className="flex items-center gap-1.5 text-[11px] font-['Heebo'] tabular-nums text-slate-9 align-middle">
                  <BatteryIcon pct={device.batteryPct} />
                  {device.batteryPct}%
                </span>
              )}
            </div>
          </div>
          {metricParts.length > 0 && (
            <div className="text-[11px] font-mono tabular-nums text-slate-9 truncate">
              {metricParts.join(' · ')}
            </div>
          )}
        </div>
        {device.type === 'ecm' && (() => {
          const isDisabled = isOffline || isMalfunctioning || device.status === 'active';
          const disabledReason = isOffline
            ? strings.jamDisabledOffline
            : isMalfunctioning
              ? strings.jamDisabledMalfunction
              : device.status === 'active'
                ? strings.jamDisabledAlreadyActive
                : undefined;
          const btn = (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onJamActivate?.(device.id); }}
              disabled={isDisabled}
              className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-[background-color,transform] duration-150 ease-out disabled:opacity-40 disabled:cursor-not-allowed bg-accent-danger-soft text-slate-12 ring-1 ring-inset ring-accent-danger-soft/40 hover:bg-accent-danger active:scale-[0.98] focus-visible:outline-none focus-visible:ring-border-strong"
            >
              <JamIcon size={12} />
              {device.status === 'active' ? strings.jamActive : strings.jam}
            </button>
          );

          if (!disabledReason) return btn;

          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  {btn}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="px-2 py-1 text-[10px] text-slate-11 bg-surface-3 shadow-[0_0_0_1px_var(--border-default)] whitespace-nowrap"
              >
                {disabledReason}
              </TooltipContent>
            </Tooltip>
          );
        })()}

        {isFloodlight && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0 inline-flex" onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={!!isFloodlightOn}
                  onCheckedChange={(next) => onFloodlightToggle?.(device.id, next)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={isOffline}
                  aria-label={isFloodlightOn ? strings.floodlightTurnOff : strings.floodlightTurnOn}
                  className="h-[18px] w-8 data-[state=checked]:bg-slate-12 data-[state=unchecked]:bg-state-hover-strong [&_[data-slot=switch-thumb]]:data-[state=checked]:bg-surface-2"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={6}
              className="px-2 py-1 text-[10px] text-slate-11 bg-surface-3 shadow-[0_0_0_1px_var(--border-default)] whitespace-nowrap"
            >
              {isFloodlightOn ? strings.floodlightTurnOff : strings.floodlightTurnOn}
            </TooltipContent>
          </Tooltip>
        )}

        {isSpeaker && (() => {
          const playing = !!isSpeakerPlaying;
          const disabled = isOffline;
          const btn = (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onSpeakerToggle?.(device.id, !playing); }}
              disabled={disabled}
              aria-pressed={playing}
              className="shrink-0 h-7 gap-1.5 px-2 rounded text-[11px] font-medium"
            >
              {playing ? <Square size={12} /> : <PlayFilledIcon size={12} />}
              {playing ? strings.speakerStop : strings.speakerPlay}
            </Button>
          );
          if (!disabled) return btn;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  {btn}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="px-2 py-1 text-[10px] text-slate-11 bg-surface-3 shadow-[0_0_0_1px_var(--border-default)] whitespace-nowrap"
              >
                {strings.speakerDisabledOffline}
              </TooltipContent>
            </Tooltip>
          );
        })()}

        <div
          className="absolute end-2 top-1/2 z-10 flex h-full w-20 -translate-y-1/2 items-center justify-end gap-0 bg-gradient-to-r from-[color-mix(in_oklch,var(--slate-12)_4%,var(--surface-2))] via-[color-mix(in_oklch,var(--slate-12)_4%,var(--surface-2))] via-50% to-transparent ps-2 opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
        >
          <DeviceRowHoverButton
            icon={MapPin}
            label={strings.centerOnMap}
            onClick={() => onFlyTo(device.lat, device.lon)}
          />
          {canPinToFeed ? (
            <DeviceRowHoverButton
              icon={isPinnedToFeed ? PinFilled : Pin}
              label={
                isPinnedToFeed
                  ? strings.pinnedToFeedTooltip
                  : strings.pinToFeedTooltip
              }
              pressed={!!isPinnedToFeed}
              disabled={
                isOffline || (isPinnedToFeed ? !onUnpinFromFeed : !onPinToFeed)
              }
              onClick={() => {
                if (isPinnedToFeed) onUnpinFromFeed?.(device.id);
                else onPinToFeed?.(device.id);
              }}
            />
          ) : null}
        </div>
      </div>

      <CollapsibleContent className="overflow-hidden animate-in fade-in-0 duration-200">
        <div className="flex flex-col bg-state-hover">
          <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3">
            {statRows.map(row => (
              <DetailRow key={row.label} label={row.label} value={row.value} color={row.color} />
            ))}
          </div>

          <div className="flex items-center gap-2 px-2 py-1.5 border-t border-border-default">
            {isSpeaker && speakerTracks.length > 0 && (
              <>
                <Popover open={speakerTrackOpen} onOpenChange={setSpeakerTrackOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={speakerTrackOpen}
                      aria-label={strings.audioTrackAriaLabel}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="flex h-7 min-w-0 max-w-[180px] items-center justify-between gap-1.5 px-2 rounded text-[11px] font-medium text-slate-12/[0.64] hover:text-slate-12 bg-state-hover hover:bg-state-hover-strong transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong"
                    >
                      <span className="truncate">
                        {selectedSpeakerTrack?.label ?? strings.audioTrack}
                      </span>
                      <ChevronsUpDown size={12} className="shrink-0 opacity-60" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={4}
                    className="w-[var(--radix-popover-trigger-width)] min-w-[180px] p-0 text-slate-12 origin-top-left rtl:origin-top-right"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Command className="bg-transparent">
                      <CommandInput
                        placeholder={strings.audioTrackSearchPlaceholder}
                        className="h-8 text-[11px]"
                      />
                      <CommandList>
                        <CommandEmpty className="py-3 text-center text-[11px] text-slate-9">
                          {strings.audioTrackNoMatches}
                        </CommandEmpty>
                        <CommandGroup>
                          {speakerTracks.map((track) => (
                            <CommandItem
                              key={track.id}
                              value={track.label}
                              onSelect={() => {
                                setSpeakerTrack(track.id);
                                setSpeakerTrackOpen(false);
                              }}
                              className="text-[11px] data-[selected=true]:bg-state-hover-strong data-[selected=true]:text-slate-12"
                            >
                              <span className="flex-1 truncate">{track.label}</span>
                              {track.id === speakerTrack && (
                                <Check size={12} className="shrink-0 text-slate-12/80" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="w-px h-5 bg-state-pressed mx-0.5" />
              </>
            )}

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onFlyTo(device.lat, device.lon); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-slate-12/70 bg-state-hover-strong hover:bg-state-selected hover:text-slate-12/90 active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out cursor-pointer focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:outline-none"
              aria-label={strings.centerOnMap}
            >
              <MapPin size={12} />
              {strings.centerOnMap}
            </button>

            {(onPinToFeed || onUnpinFromFeed) && (device.type === 'camera' || device.type === 'drone') && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPinnedToFeed) onUnpinFromFeed?.(device.id);
                  else onPinToFeed?.(device.id);
                }}
                disabled={isOffline || (isPinnedToFeed ? !onUnpinFromFeed : !onPinToFeed)}
                aria-pressed={!!isPinnedToFeed}
                aria-label={isPinnedToFeed ? strings.unpinFromFeedAriaLabel : strings.pinToFeedAriaLabel}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:outline-none ${
                  isPinnedToFeed
                    ? 'text-accent-info bg-accent-info/30 ring-1 ring-inset ring-accent-info/45 hover:bg-accent-info/40'
                    : 'text-accent-info bg-accent-info/15 hover:bg-accent-info/25'
                }`}
              >
                {isPinnedToFeed ? <PinOff size={12} /> : <Pin size={12} />}
                {isPinnedToFeed ? strings.unpinFromFeed : strings.pinToFeed}
              </button>
            )}

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleMute(device.id); }}
              aria-pressed={isMuted}
              disabled={isOffline}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium transition-[background-color,color,transform] duration-150 ease-out cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:outline-none ${
                isMuted
                  ? 'bg-accent-warning/15 text-accent-warning hover:bg-accent-warning/25'
                  : 'text-slate-12/70 bg-state-hover-strong hover:bg-state-selected hover:text-slate-12/90'
              } ${isOffline ? 'disabled:opacity-50 disabled:cursor-not-allowed' : ''}`}
              aria-label={isMuted ? strings.unmute : strings.mute}
            >
              <BellOff size={12} />
              {isMuted ? strings.unmute : strings.mute}
            </button>

            {device.type === 'drone' && (
              <>
                <div className="w-px h-5 bg-state-pressed mx-0.5" />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-12/60">{strings.wipers}</span>
                  <Switch
                    checked={wipersOn}
                    onCheckedChange={setWipersOn}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isOffline}
                    aria-label={strings.wipersAriaLabel}
                    className="h-[18px] w-8 data-[state=checked]:bg-accent-info/80 data-[state=unchecked]:bg-state-hover-strong"
                  />
                </div>
                <button
                  type="button"
                  disabled={isOffline || calibState !== 'idle'}
                  aria-busy={calibState === 'running'}
                  onClick={(e) => { e.stopPropagation(); setCalibState('running'); }}
                  className="ms-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-slate-12/70 bg-state-hover-strong hover:bg-state-selected hover:text-slate-12/90 active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:outline-none"
                  aria-label={strings.calibrateAriaLabel}
                >
                  {calibState === 'running' ? (
                    <Loader2 size={12} className="animate-spin motion-reduce:animate-none" />
                  ) : calibState === 'done' ? (
                    <Check size={12} className="text-accent-success" />
                  ) : (
                    <Wrench size={12} />
                  )}
                  {calibState === 'running' ? strings.calibrating : calibState === 'done' ? strings.calibrated : strings.calibrate}
                </button>
              </>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="w-full flex flex-col justify-center items-start gap-1 text-xs">
      <span className="text-slate-12/60 text-[10px]">{label}</span>
      <span className={`font-sans tabular-nums text-xs ${color ?? 'text-slate-12'}`}>{value}</span>
    </div>
  );
}

export interface DevicesPanelProps {
  /** All devices to render. Group by `type` is computed from this list. */
  devices: Device[];
  open: boolean;
  onClose: () => void;
  onFlyTo: (lat: number, lon: number) => void;
  onDeviceHover?: (id: string | null) => void;
  onDeviceSelect?: (id: string | null) => void;
  onJamActivate?: (jammerId: string) => void;
  /** Toggle a floodlight on/off. Renders the header-row Switch + footer Switch when provided. */
  onFloodlightToggle?: (floodlightId: string, next: boolean) => void;
  /** Toggle a speaker between play/stop. Renders the header-row Play/Stop button when provided. */
  onSpeakerToggle?: (speakerId: string, next: boolean) => void;
  /** Set of floodlight device IDs currently lit. Drives the active icon variant + Switch state. */
  floodlightOnIds?: Set<string>;
  /** Set of speaker device IDs currently playing. Drives the active icon variant + Play/Stop state. */
  speakerPlayingIds?: Set<string>;
  /** Override audio tracks rendered in the speaker combobox. Defaults to `DEFAULT_SPEAKER_TRACKS`. */
  speakerTracks?: { id: string; label: string }[];
  /** Pin a camera/drone to a video feed slot. Visible on camera + drone cards only. */
  onPinToFeed?: (deviceId: string) => void;
  /** Unpin a camera/drone from its video feed slot. Visible on camera + drone cards only. */
  onUnpinFromFeed?: (deviceId: string) => void;
  /** Set / list of device ids currently pinned to a feed. Drives the Pin/Unpin toggle state. */
  pinnedDeviceIds?: ReadonlySet<string> | readonly string[];
  /**
   * @deprecated The Dashboard now renders DevicesPanel inside a CSS
   * Grid cell that owns the slide animation, so per-panel transition
   * suppression is no longer needed. Kept for prop-shape compatibility.
   */
  noTransition?: boolean;
  /**
   * @deprecated Width is now controlled by the parent grid cell
   * (`LAYOUT_TOKENS.panelWidthPx`). Kept for prop-shape compatibility.
   */
  width?: number;
  focusedDeviceId?: string | null;
  /** Override per-type group labels. Falls back to `DEFAULT_TYPE_LABELS` (English). */
  typeLabels?: Partial<Record<DeviceType, string>>;
  /** Override per-state connection labels. Falls back to `DEFAULT_CONNECTION_STATE_LABELS` (English). */
  connectionStateLabels?: Partial<Record<ConnectionState, string>>;
  /** Header title above the device list. Defaults to 'Devices'. */
  title?: string;
  /** Close-button aria-label. Defaults to 'Close'. */
  closeAriaLabel?: string;
  /** Override any of the internal labels. Falls back to `DEFAULT_DEVICE_PANEL_STRINGS` (English). */
  strings?: Partial<DevicesPanelStrings>;
}

export function DevicesPanel({
  devices,
  open,
  onClose,
  onFlyTo,
  onDeviceHover,
  onDeviceSelect,
  onJamActivate,
  onFloodlightToggle,
  onSpeakerToggle,
  floodlightOnIds,
  speakerPlayingIds,
  speakerTracks,
  onPinToFeed,
  onUnpinFromFeed,
  pinnedDeviceIds,
  focusedDeviceId,
  typeLabels: typeLabelsProp,
  connectionStateLabels: connectionStateLabelsProp,
  title = 'Devices',
  closeAriaLabel = 'Close',
  strings: stringsProp,
}: DevicesPanelProps) {
  const strings = useMemo<DevicesPanelStrings>(
    () => ({ ...DEFAULT_DEVICE_PANEL_STRINGS, ...(stringsProp ?? {}) }),
    [stringsProp],
  );
  const typeLabels = useMemo(
    () => ({ ...DEFAULT_TYPE_LABELS, ...(typeLabelsProp ?? {}) }) as Record<DeviceType, string>,
    [typeLabelsProp],
  );
  const connectionStateLabels = useMemo(
    () => ({ ...DEFAULT_CONNECTION_STATE_LABELS, ...(connectionStateLabelsProp ?? {}) }) as Record<ConnectionState, string>,
    [connectionStateLabelsProp],
  );

  // Normalize the `pinnedDeviceIds` prop so consumers can pass either a Set
  // (cheap O(1) lookup, what PlaygroundPage uses) or a plain array (cheaper
  // to build for callers without state).
  const pinnedSet = useMemo<ReadonlySet<string>>(
    () => (pinnedDeviceIds instanceof Set ? pinnedDeviceIds : new Set(pinnedDeviceIds ?? [])),
    [pinnedDeviceIds],
  );

  /** Pick a representative icon per type from the first device of that type. */
  const typeFilterIcons = useMemo<Partial<Record<DeviceType, Device['Icon']>>>(() => {
    const map: Partial<Record<DeviceType, Device['Icon']>> = {};
    for (const t of TYPE_ORDER) {
      const first = devices.find((d) => d.type === t);
      if (first) map[t] = first.Icon;
    }
    return map;
  }, [devices]);

  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<DeviceType[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const focusedRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusedDeviceId) return;
    const device = devices.find(d => d.id === focusedDeviceId);
    if (!device) return;
    setExpandedId(focusedDeviceId);
    setSelectedTypes(prev => {
      if (prev.length === 0 || prev.includes(device.type)) return prev;
      return [...prev, device.type];
    });
    setQuery('');
    requestAnimationFrame(() => {
      focusedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [focusedDeviceId]);

  const [mutedDevices, setMutedDevices] = useState<Map<string, number>>(new Map());

  // Sweep expired mutes every 1s, but only update state when at least
  // one mute actually expired (the `setMutedDevices` callback returns
  // `prev` otherwise, so React skips the re-render). Live countdown
  // refresh is owned by per-row `<MuteCountdown />` so this effect
  // never has to force a panel-wide tick just to repaint MM:SS text.
  useEffect(() => {
    if (mutedDevices.size === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setMutedDevices(prev => {
        if (prev.size === 0) return prev;
        const next = new Map(prev);
        let changed = false;
        for (const [deviceId, expiry] of next) {
          if (expiry <= now) {
            next.delete(deviceId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [mutedDevices.size > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleMute = useCallback((deviceId: string) => {
    setMutedDevices(prev => {
      const next = new Map(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.set(deviceId, Date.now() + 30 * 60 * 1000);
      }
      return next;
    });
  }, []);

  // Live countdown text now lives in <MuteCountdown />, which ticks
  // itself once per second only when actually rendered. The panel just
  // forwards the raw expiry timestamp, so unrelated devices don't pay
  // a render cost just because someone muted one row.

  const typeCounts = useMemo(() => {
    const counts = {} as Record<DeviceType, number>;
    for (const type of TYPE_ORDER) {
      counts[type] = devices.filter(d => d.type === type).length;
    }
    return counts;
  }, [devices]);

  const handleReset = useCallback(() => {
    setQuery('');
    setSelectedTypes([]);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const typeSet = selectedTypes.length === 0 ? null : new Set(selectedTypes);
    return devices
      .filter(d => !typeSet || typeSet.has(d.type))
      .filter(d => !q || d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q))
      .sort((a, b) => (STATUS_SORT[a.status] ?? 2) - (STATUS_SORT[b.status] ?? 2));
  }, [query, selectedTypes, devices]);

  const grouped = useMemo(() => {
    const groups: { type: DeviceType; label: string; devices: Device[] }[] = [];
    for (const type of TYPE_ORDER) {
      const devices = filtered.filter(d => d.type === type);
      if (devices.length > 0) {
        groups.push({ type, label: typeLabels[type], devices });
      }
    }
    return groups;
  }, [filtered]);

  const handleRowClick = useCallback((device: Device) => {
    const next = expandedId === device.id ? null : device.id;
    setExpandedId(next);
    onDeviceSelect?.(next);
  }, [expandedId, onDeviceSelect]);

  const typeFilterDef = useMemo<FilterDef>(() => ({
    id: 'type',
    label: strings.typeFilterLabel,
    options: TYPE_ORDER
      .filter((t) => typeCounts[t] > 0)
      .map((t) => ({
        value: t,
        label: typeLabels[t],
        icon: typeFilterIcons[t],
      })),
  }), [strings.typeFilterLabel, typeCounts, typeLabels, typeFilterIcons]);

  // Header title carries an inline device count so the operator sees
  // the total at a glance, matching the legacy `Devices (12)` chrome.
  const headerTitle = (
    <>
      {title} <span className="text-[var(--gridblock-text-muted)]">({devices.length})</span>
    </>
  );

  return (
    <>
      <DeviceDragPreviewLayer />
      {/* The Dashboard mounts this panel inside its own CSS Grid cell that
      owns the slide-in animation, so the panel itself just fills the
      cell and lets the GridblockPanel chrome drive header + scroll.
      The panel is also conditionally mounted by the parent — `open` is
      effectively always true here, but we keep the prop for back-compat
      callers. */}
      <GridblockPanel
      title={headerTitle}
      onClose={onClose}
      closeAriaLabel={closeAriaLabel}
      testId="devices-panel"
      toolbar={
        <FilterBar
          query={query}
          onQueryChange={setQuery}
          filters={[typeFilterDef]}
          selections={{ type: selectedTypes }}
          onFilterChange={(_id, next) => setSelectedTypes(next as DeviceType[])}
          onReset={handleReset}
          searchPlaceholder={strings.searchPlaceholder}
          clearSearchAriaLabel={strings.clearSearch}
          resetLabel={strings.resetFiltersLabel}
          resetAriaLabel={strings.resetFilters}
        />
      }
    >
      {grouped.length === 0 ? (
        <div className="px-3 py-8 text-center text-[12px] text-[var(--gridblock-text-muted)]">
          {strings.noMatches}
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.type}>
            {/*
             * Category strip. Each header carries a bottom hairline that
             * closes off its row list below.
             */}
            <div
              className="px-4 py-1.5 text-xs font-normal uppercase tracking-wider text-[var(--gridblock-text-primary)] border-b border-[var(--gridblock-border)] bg-[var(--gridblock-bar)]"
            >
              {group.label} ({group.devices.length})
            </div>
            {group.devices.map(device => (
              <div key={device.id} ref={device.id === focusedDeviceId ? focusedRowRef : undefined}>
                <DeviceRow
                  device={device}
                  isExpanded={expandedId === device.id}
                  onToggle={() => handleRowClick(device)}
                  onHover={onDeviceHover ?? (() => {})}
                  onJamActivate={onJamActivate}
                  onFloodlightToggle={onFloodlightToggle}
                  onSpeakerToggle={onSpeakerToggle}
                  isFloodlightOn={floodlightOnIds?.has(device.id)}
                  isSpeakerPlaying={speakerPlayingIds?.has(device.id)}
                  speakerTracks={speakerTracks}
                  onFlyTo={onFlyTo}
                  isMuted={mutedDevices.has(device.id)}
                  muteExpiry={mutedDevices.get(device.id) ?? null}
                  onToggleMute={handleToggleMute}
                  onPinToFeed={onPinToFeed}
                  onUnpinFromFeed={onUnpinFromFeed}
                  isPinnedToFeed={pinnedSet.has(device.id)}
                  connectionStateLabels={connectionStateLabels}
                  strings={strings}
                />
              </div>
            ))}
          </div>
        ))
      )}
    </GridblockPanel>
    </>
  );
}
