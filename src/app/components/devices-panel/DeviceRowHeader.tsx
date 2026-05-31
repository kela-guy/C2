/**
 * Collapsed row header — the always-visible part of every device card.
 *
 * Owns:
 *   - the icon tile + its connection-state status dot
 *   - the device name + malfunction warning + connection chip
 *   - inline meta (mute countdown, pin toggle, battery)
 *   - the type-specific inline action: ECM jam, floodlight switch,
 *     or speaker play.
 *
 * Pure presentational — all state and callbacks come from the parent
 * `DeviceRow`. The whole component is rendered inside a clickable row
 * container, so every interactive child stops click propagation to
 * keep expand/collapse independent from action presses.
 */

import { AlertTriangle, BellOff } from '@/lib/icons/central';
import { StatusChip } from '@/primitives/StatusChip';
import { BatteryIcon } from '@/primitives/ProductIcons';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  CONNECTION_STATE_CHIP_COLORS,
  CONNECTION_STATE_COLORS,
} from './constants';
import { buildCollapsedMetricLine, isPinnableType } from './utils';
import type {
  ConnectionState,
  Device,
  DevicesPanelStrings,
} from './types';
import { JamButton } from './controls/JamButton';
import { SpeakerPlayButton } from './controls/SpeakerPlayButton';
import { PinToFeedToggle } from './controls/PinToFeedToggle';

interface DeviceRowHeaderProps {
  device: Device;
  isExpanded: boolean;
  isMuted: boolean;
  muteRemaining: string | null;
  isFloodlightOn: boolean;
  isSpeakerPlaying: boolean;
  isPinnedToFeed: boolean;
  strings: DevicesPanelStrings;
  connectionStateLabels: Record<ConnectionState, string>;
  onJamActivate?: (jammerId: string) => void;
  onSpeakerToggle?: (speakerId: string, next: boolean) => void;
  onPinToFeed?: (deviceId: string) => void;
  onUnpinFromFeed?: (deviceId: string) => void;
}

export function DeviceRowHeader({
  device,
  isExpanded,
  isMuted,
  muteRemaining,
  isFloodlightOn,
  isSpeakerPlaying,
  isPinnedToFeed,
  strings,
  connectionStateLabels,
  onJamActivate,
  onSpeakerToggle,
  onPinToFeed,
  onUnpinFromFeed,
}: DeviceRowHeaderProps) {
  const isMalfunctioning = device.operationalStatus === 'malfunctioning';
  const isOffline = device.connectionState === 'offline';
  const isFloodlight = device.type === 'floodlight';
  const isSpeaker = device.type === 'speaker';
  const isEcm = device.type === 'ecm';
  const showStatusDot = device.connectionState !== 'online';
  const metricLine = buildCollapsedMetricLine(device);

  const showPinToggle = (onPinToFeed || onUnpinFromFeed) && isPinnableType(device.type);

  return (
    <>
      <div
        className={`relative w-8 h-8 rounded flex items-center justify-center shrink-0 ${
          isMalfunctioning ? 'bg-orange-900/40' : 'bg-white/10'
        }`}
        data-handoff-component="device-icon"
      >
        <device.Icon
          size={20}
          fill={isMalfunctioning ? '#f97316' : 'white'}
          active={(isFloodlight && isFloodlightOn) || (isSpeaker && isSpeakerPlaying)}
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
            <span
              className={`text-sm font-medium truncate ${
                isMalfunctioning ? 'text-orange-300' : 'text-zinc-300'
              }`}
            >
              {device.name}
            </span>
            {isMalfunctioning && (
              <AlertTriangle size={11} className="text-orange-400 shrink-0" />
            )}
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
            {showPinToggle && (
              <PinToFeedToggle
                device={device}
                isPinned={isPinnedToFeed}
                isOffline={isOffline}
                strings={strings}
                onPinToFeed={onPinToFeed}
                onUnpinFromFeed={onUnpinFromFeed}
              />
            )}
            {device.batteryPct != null && (
              <span className="flex items-center gap-1.5 text-xs font-['Heebo'] tabular-nums text-white/50 align-middle">
                <BatteryIcon pct={device.batteryPct} />
                {device.batteryPct}%
              </span>
            )}
          </div>
        </div>
        {metricLine && (
          <div className="text-start text-xs font-mono tabular-nums text-white/50 truncate">
            {metricLine}
          </div>
        )}
      </div>

      {isEcm && (
        <JamButton
          device={device}
          strings={strings}
          onJamActivate={onJamActivate}
        />
      )}
      {isSpeaker && (
        <SpeakerPlayButton
          device={device}
          isPlaying={isSpeakerPlaying}
          strings={strings}
          onSpeakerToggle={onSpeakerToggle}
        />
      )}
      {/* `isExpanded` is reserved for future use — e.g. swapping the
          chevron glyph — but is not visually represented today. The
          parent `Collapsible` reads expansion state directly. */}
      {isExpanded ? null : null}
    </>
  );
}
