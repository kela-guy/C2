/**
 * Expanded-card footer: the action bar shared by every device type.
 *
 * Always present: Center-on-map + Mute. Conditionally rendered:
 *   - speaker: track combobox at the start of the bar
 *   - camera/drone: pin/unpin button
 *   - drone: wipers + calibrate (rendered after a divider on the end)
 */

import { BellOff, MapPin } from '@/lib/icons/central';
import { isPinnableType } from './utils';
import type { Device, DevicesPanelStrings, SpeakerTrack } from './types';
import { SpeakerTrackSelect } from './controls/SpeakerTrackSelect';
import { PinToFeedButton } from './controls/PinToFeedButton';
import { DroneControls } from './controls/DroneControls';
import { FloodlightToggle } from './controls/FloodlightToggle';

interface DeviceRowActionsProps {
  device: Device;
  isMuted: boolean;
  isPinnedToFeed: boolean;
  isFloodlightOn: boolean;
  speakerTracks: SpeakerTrack[];
  strings: DevicesPanelStrings;
  onFlyTo: (lat: number, lon: number) => void;
  onToggleMute: (deviceId: string) => void;
  onFloodlightToggle?: (floodlightId: string, next: boolean) => void;
  onPinToFeed?: (deviceId: string) => void;
  onUnpinFromFeed?: (deviceId: string) => void;
}

export function DeviceRowActions({
  device,
  isMuted,
  isPinnedToFeed,
  isFloodlightOn,
  speakerTracks,
  strings,
  onFlyTo,
  onToggleMute,
  onFloodlightToggle,
  onPinToFeed,
  onUnpinFromFeed,
}: DeviceRowActionsProps) {
  const isOffline = device.connectionState === 'offline';
  const isSpeaker = device.type === 'speaker';
  const isFloodlight = device.type === 'floodlight';
  const isDrone = device.type === 'drone';
  const showPinButton = (onPinToFeed || onUnpinFromFeed) && isPinnableType(device.type);

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]"
      data-handoff-component="device-row-actions"
    >
      {isSpeaker && speakerTracks.length > 0 && (
        <>
          <SpeakerTrackSelect tracks={speakerTracks} strings={strings} />
          <div className="w-px h-5 bg-white/[0.08] mx-0.5" />
        </>
      )}

      {isFloodlight && (
        <FloodlightToggle
          device={device}
          isOn={isFloodlightOn}
          isOffline={isOffline}
          strings={strings}
          onToggle={onFloodlightToggle}
        />
      )}

      <CenterOnMapButton device={device} strings={strings} onFlyTo={onFlyTo} />

      {showPinButton && (
        <PinToFeedButton
          device={device}
          isPinned={isPinnedToFeed}
          isOffline={isOffline}
          strings={strings}
          onPinToFeed={onPinToFeed}
          onUnpinFromFeed={onUnpinFromFeed}
        />
      )}

      <MuteButton
        device={device}
        isMuted={isMuted}
        isOffline={isOffline}
        strings={strings}
        onToggleMute={onToggleMute}
      />

      {isDrone && <DroneControls device={device} strings={strings} />}
    </div>
  );
}

function CenterOnMapButton({
  device,
  strings,
  onFlyTo,
}: {
  device: Device;
  strings: DevicesPanelStrings;
  onFlyTo: (lat: number, lon: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onFlyTo(device.lat, device.lon);
      }}
      data-handoff-component="device-center-on-map"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90 active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out cursor-pointer focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
      aria-label={strings.centerOnMap}
    >
      <MapPin size={12} />
      {strings.centerOnMap}
    </button>
  );
}

function MuteButton({
  device,
  isMuted,
  isOffline,
  strings,
  onToggleMute,
}: {
  device: Device;
  isMuted: boolean;
  isOffline: boolean;
  strings: DevicesPanelStrings;
  onToggleMute: (deviceId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggleMute(device.id);
      }}
      aria-pressed={isMuted}
      disabled={isOffline}
      data-handoff-component="device-mute"
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
  );
}
