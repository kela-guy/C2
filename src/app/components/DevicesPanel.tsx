import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { X, Camera, AlertTriangle, MapPin, BellOff, Wrench, Check, Loader2, Pin, PinFilled, PinOff } from '@/lib/icons/central';
import { Square, ChevronsUpDown } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Toggle } from './ui/toggle';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './ui/command';
import { Button } from './ui/button';
import { LAYOUT_TOKENS, SURFACE } from '@/primitives/tokens';
import { StatusChip } from '@/primitives/StatusChip';
import { JamIcon, BatteryIcon } from '@/primitives/ProductIcons';
import { FilterBar, type FilterDef } from '@/primitives';

export const DEVICE_CAMERA_DRAG_TYPE = 'DEVICE_CAMERA';
export interface DeviceCameraDragItem {
  cameraId: string;
  label: string;
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
  /** Camera controls. */
  cameraModeAriaLabel: string;
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
  cameraModeAriaLabel: 'Camera mode',
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
  online: 'bg-emerald-400',
  offline: 'bg-zinc-500',
  error: 'bg-red-400',
  warning: 'bg-amber-400',
};

const CONNECTION_STATE_CHIP_COLORS: Record<ConnectionState, 'green' | 'gray' | 'red' | 'orange'> = {
  online: 'green',
  offline: 'gray',
  error: 'red',
  warning: 'orange',
};

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
  muteRemaining,
  onToggleMute,
  onPinToFeed,
  onUnpinFromFeed,
  isPinnedToFeed,
  connectionStateLabels = DEFAULT_CONNECTION_STATE_LABELS,
  cameraPresets,
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
  muteRemaining: string | null;
  onToggleMute: (deviceId: string) => void;
  /** Pin a camera/drone into the next available video feed slot. */
  onPinToFeed?: (deviceId: string) => void;
  /** Unpin a camera/drone from its video feed slot. */
  onUnpinFromFeed?: (deviceId: string) => void;
  /** Whether this device is currently pinned to a feed. Drives the toggle visual + label. */
  isPinnedToFeed?: boolean;
  connectionStateLabels?: Record<ConnectionState, string>;
  cameraPresets?: Record<string, string[]>;
  strings?: DevicesPanelStrings;
}) {
  const metricParts: string[] = [];
  if (device.coverageRadiusM != null) metricParts.push(`${(device.coverageRadiusM / 1000).toFixed(1)}km`);

  const isMalfunctioning = device.operationalStatus === 'malfunctioning';
  const isCamera = device.type === 'camera';
  const isFloodlight = device.type === 'floodlight';
  const isSpeaker = device.type === 'speaker';
  const [speakerTrack, setSpeakerTrack] = useState<string>(speakerTracks[0]?.id ?? '');
  const [speakerTrackOpen, setSpeakerTrackOpen] = useState(false);
  const selectedSpeakerTrack = speakerTracks.find((t) => t.id === speakerTrack) ?? speakerTracks[0];
  const presets = cameraPresets?.[device.id];

  const [activePreset, setActivePreset] = useState(presets?.[0] ?? '');
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

  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: DEVICE_CAMERA_DRAG_TYPE,
    item: { cameraId: device.id, label: device.name } satisfies DeviceCameraDragItem,
    canDrag: isCamera,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [device.id, device.name, isCamera]);

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
    color: isMalfunctioning ? 'text-orange-400' : 'text-emerald-400',
  });
  if (device.batteryPct != null) {
    statRows.push({
      label: strings.battery,
      value: `${device.batteryPct}%`,
      color: device.batteryPct <= 20 ? 'text-red-400' : device.batteryPct <= 40 ? 'text-amber-400' : 'text-emerald-400',
    });
  }

  const showStatusDot = device.connectionState !== 'online';
  const isOffline = device.connectionState === 'offline';

  return (
    <Collapsible open={isExpanded} style={isDragging ? { opacity: 0.4 } : undefined}>
      <div
        ref={isCamera ? dragRef : undefined}
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className={`flex items-center justify-center gap-2.5 px-4 py-2.5 text-end transition-[background-color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 border-b border-white/[0.06] ${
          isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.04] active:bg-white/[0.06]'
        } cursor-pointer`}
        onMouseEnter={() => onHover(device.id)}
        onMouseLeave={() => onHover(null)}
      >
        <div className={`relative w-8 h-8 rounded flex items-center justify-center shrink-0 ${isMalfunctioning ? 'bg-orange-900/40' : 'bg-white/10'}`}>
          <device.Icon
            size={20}
            fill={isMalfunctioning ? '#f97316' : 'white'}
            active={(isFloodlight && !!isFloodlightOn) || (isSpeaker && !!isSpeakerPlaying)}
          />
          {showStatusDot && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`absolute -bottom-0.5 -end-0.5 size-2 rounded-full ring-2 ring-zinc-950 ${CONNECTION_STATE_COLORS[device.connectionState]}`}
                  aria-label={connectionStateLabels[device.connectionState]}
                />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                showArrow={false}
                className="px-2 py-1 text-xs text-zinc-300 bg-zinc-800 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] whitespace-nowrap"
              >
                {connectionStateLabels[device.connectionState]}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-sm font-medium truncate ${isMalfunctioning ? 'text-orange-300' : 'text-zinc-300'}`}>{device.name}</span>
              {isMalfunctioning && <AlertTriangle size={11} className="text-orange-400 shrink-0" />}
              {device.connectionState !== 'online' && (
                <StatusChip
                  label={connectionStateLabels[device.connectionState]}
                  color={CONNECTION_STATE_CHIP_COLORS[device.connectionState]}
                  className="h-5 px-1.5 text-xs leading-none"
                />
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isMuted && muteRemaining && (
                <span className="flex items-center gap-1 text-xs font-mono tabular-nums text-white">
                  <BellOff size={12} className="text-white" />
                  {muteRemaining}
                </span>
              )}
              {(onPinToFeed || onUnpinFromFeed) && (device.type === 'camera' || device.type === 'drone') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      pressed={!!isPinnedToFeed}
                      disabled={isOffline || (isPinnedToFeed ? !onUnpinFromFeed : !onPinToFeed)}
                      onPressedChange={(next) => {
                        if (next) onPinToFeed?.(device.id);
                        else onUnpinFromFeed?.(device.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={isPinnedToFeed ? strings.pinnedToFeedTooltip : strings.pinToFeedTooltip}
                      // Override the default Toggle sizing (h-9/min-w-9) to fit inline
                      // with the other badges in the row, and strip the accent
                      // background normally applied in the on state — we want a clean
                      // white pin glyph (line off, filled on), not a filled chip.
                      className="size-6 min-w-0 p-0 rounded text-white/70 hover:bg-white/10 hover:text-white data-[state=on]:bg-transparent data-[state=on]:text-white [&_svg]:size-3"
                    >
                      {/*
                        On = Central's filled Pin (separate package variant).
                        Off = Central's outlined Pin. Both ship as native variant
                        components so we no longer need the fill/strokeWidth hack.
                      */}
                      {isPinnedToFeed ? <PinFilled /> : <Pin />}
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={6}
                    showArrow={false}
                    className="px-2 py-1 text-xs text-zinc-300 bg-zinc-800 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] whitespace-nowrap"
                  >
                    {isPinnedToFeed ? strings.pinnedToFeedTooltip : strings.pinToFeedTooltip}
                  </TooltipContent>
                </Tooltip>
              )}
              {device.batteryPct != null && (
                <span className="flex items-center gap-1.5 text-xs font-['Heebo'] tabular-nums text-white/50 align-middle">
                  <BatteryIcon pct={device.batteryPct} />
                  {device.batteryPct}%
                </span>
              )}
            </div>
          </div>
          {metricParts.length > 0 && (
            <div className="text-xs font-mono tabular-nums text-white/50 truncate">
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
              className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-[background-color,transform] duration-150 ease-out disabled:opacity-40 disabled:cursor-not-allowed bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)] hover:bg-[oklch(0.445_0.151_17)] active:scale-[0.98] active:bg-[oklch(0.295_0.082_17)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
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
                showArrow={false}
                className="px-2 py-1 text-xs text-zinc-300 bg-zinc-800 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] whitespace-nowrap"
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
                  className="h-[18px] w-8 data-[state=checked]:bg-white data-[state=unchecked]:bg-white/10 [&_[data-slot=switch-thumb]]:data-[state=checked]:bg-zinc-900"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={6}
              showArrow={false}
              className="px-2 py-1 text-xs text-zinc-300 bg-zinc-800 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] whitespace-nowrap"
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
              className="shrink-0 h-7 gap-1.5 px-2 rounded text-xs font-medium"
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
                showArrow={false}
                className="px-2 py-1 text-xs text-zinc-300 bg-zinc-800 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] whitespace-nowrap"
              >
                {strings.speakerDisabledOffline}
              </TooltipContent>
            </Tooltip>
          );
        })()}
      </div>

      <CollapsibleContent className="overflow-hidden animate-in fade-in-0 duration-200">
        <div className="flex flex-col bg-white/[0.03]">
          {isCamera && presets && (
            <Tabs value={activePreset} onValueChange={setActivePreset} onClick={(e) => e.stopPropagation()}>
              <TabsList variant="line" className="justify-end items-end px-3" aria-label={strings.cameraModeAriaLabel}>
                {presets.map((preset) => (
                  <TabsTrigger key={preset} value={preset}>
                    {preset}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {isCamera && (
            <div className="relative w-full h-[200px] overflow-hidden bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera size={24} className="text-white/20" />
              </div>
              <div className="absolute inset-0 bg-black/20 pointer-events-none" />
              <div className="absolute top-1.5 end-1.5 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
                <div className="size-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" />
                <span className="text-xs font-medium text-white/90 uppercase tracking-wide">Live</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3">
            {statRows.map(row => (
              <DetailRow key={row.label} label={row.label} value={row.value} color={row.color} />
            ))}
          </div>

          <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
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
                      className="flex h-7 min-w-0 max-w-[180px] items-center justify-between gap-1.5 px-2 rounded text-xs font-medium text-white/[0.64] hover:text-white bg-white/[0.05] hover:bg-white/[0.10] transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
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
                    className="w-[var(--radix-popover-trigger-width)] min-w-[180px] p-0 bg-zinc-900 text-white border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)] origin-top-left rtl:origin-top-right"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Command className="bg-transparent">
                      <CommandInput
                        placeholder={strings.audioTrackSearchPlaceholder}
                        className="h-8 text-xs"
                      />
                      <CommandList>
                        <CommandEmpty className="py-3 text-center text-xs text-white/50">
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
                              className="text-xs data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                            >
                              <span className="flex-1 truncate">{track.label}</span>
                              {track.id === speakerTrack && (
                                <Check size={12} className="shrink-0 text-white/80" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="w-px h-5 bg-white/[0.08] mx-0.5" />
              </>
            )}

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onFlyTo(device.lat, device.lon); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90 active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out cursor-pointer focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none ${
                  isPinnedToFeed
                    ? 'text-sky-100 bg-sky-500/30 ring-1 ring-inset ring-sky-300/45 hover:bg-sky-500/40'
                    : 'text-sky-200 bg-sky-500/15 hover:bg-sky-500/25'
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
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-[background-color,color,transform] duration-150 ease-out cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none ${
                isMuted
                  ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                  : 'text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90'
              } ${isOffline ? 'disabled:opacity-50 disabled:cursor-not-allowed' : ''}`}
              aria-label={isMuted ? strings.unmute : strings.mute}
            >
              <BellOff size={12} />
              {isMuted ? strings.unmute : strings.mute}
            </button>

            {device.type === 'drone' && (
              <>
                <div className="w-px h-5 bg-white/[0.08] mx-0.5" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">{strings.wipers}</span>
                  <Switch
                    checked={wipersOn}
                    onCheckedChange={setWipersOn}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isOffline}
                    aria-label={strings.wipersAriaLabel}
                    className="h-[18px] w-8 data-[state=checked]:bg-sky-500/80 data-[state=unchecked]:bg-white/10"
                  />
                </div>
                <button
                  type="button"
                  disabled={isOffline || calibState !== 'idle'}
                  aria-busy={calibState === 'running'}
                  onClick={(e) => { e.stopPropagation(); setCalibState('running'); }}
                  className="ms-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90 active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
                  aria-label={strings.calibrateAriaLabel}
                >
                  {calibState === 'running' ? (
                    <Loader2 size={12} className="animate-spin motion-reduce:animate-none" />
                  ) : calibState === 'done' ? (
                    <Check size={12} className="text-emerald-400" />
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
      <span className="text-white/60 text-xs">{label}</span>
      <span className={`font-sans tabular-nums text-xs ${color ?? 'text-white'}`}>{value}</span>
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
  noTransition?: boolean;
  width?: number;
  focusedDeviceId?: string | null;
  /** Override per-type group labels. Falls back to `DEFAULT_TYPE_LABELS` (English). */
  typeLabels?: Partial<Record<DeviceType, string>>;
  /** Override per-state connection labels. Falls back to `DEFAULT_CONNECTION_STATE_LABELS` (English). */
  connectionStateLabels?: Partial<Record<ConnectionState, string>>;
  /** Optional camera-preset map keyed by `device.id`. When omitted, no preset chip strip is rendered. */
  cameraPresets?: Record<string, string[]>;
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
  noTransition,
  width,
  focusedDeviceId,
  typeLabels: typeLabelsProp,
  connectionStateLabels: connectionStateLabelsProp,
  cameraPresets,
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
  const [, setTick] = useState(0);

  useEffect(() => {
    if (mutedDevices.size === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setMutedDevices(prev => {
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
      setTick(t => t + 1);
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

  const getMuteRemaining = useCallback((deviceId: string): string | null => {
    const expiry = mutedDevices.get(deviceId);
    if (!expiry) return null;
    const remaining = Math.max(0, expiry - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [mutedDevices]);

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

  return (
    // Same inline-start docking pattern as the Dashboard sidebar: the panel
    // sits on the inline-start edge (left in LTR, right in RTL), adjacent to
    // the slim rail, and slides off-screen toward that edge in both
    // directions (`-translate-x-full` for LTR, `rtl:translate-x-full` for
    // RTL). Border-end is the divider that faces the map.
    <aside
      data-handoff-component="devices-panel"
      className={`absolute top-0 bottom-0 start-0 border-e border-white/10 flex flex-col z-10 font-sans ${noTransition ? '' : 'transition-transform duration-300 ease-out'} ${open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full pointer-events-none'}`}
      style={{ width: width ?? LAYOUT_TOKENS.sidebarWidthPx, backgroundColor: SURFACE.level1 }}
    >
      <div className="shrink-0">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
          <h2 className="text-xs font-medium text-white uppercase tracking-wider">
            {title} ({devices.length})
          </h2>
          <button
            onClick={onClose}
            className="p-2 -m-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-[color,background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            aria-label={closeAriaLabel}
          >
            <X size={14} />
          </button>
        </div>

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
      </div>

      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-zinc-600">
            {strings.noMatches}
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.type}>
              <div className="px-4 py-1.5 text-xs font-normal uppercase tracking-wider text-white border-b border-white/5 bg-white/[0.08]">
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
                    muteRemaining={getMuteRemaining(device.id)}
                    onToggleMute={handleToggleMute}
                    onPinToFeed={onPinToFeed}
                    onUnpinFromFeed={onUnpinFromFeed}
                    isPinnedToFeed={pinnedSet.has(device.id)}
                    connectionStateLabels={connectionStateLabels}
                    cameraPresets={cameraPresets}
                    strings={strings}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
