/**
 * Next-gen device row. The container owns the Collapsible state, the
 * react-dnd source (gated by `capabilities.draggableToFeed`), and the
 * expand toggle / hover signal. Everything type-specific is delegated
 * to the registry + resolver via the three subviews.
 */

import { useDrag } from 'react-dnd';
import { Collapsible, CollapsibleContent } from '../ui/collapsible';
import { DEVICE_CAMERA_DRAG_TYPE } from '../devices-panel/constants';
import type {
  ConnectionState,
  Device,
  DeviceCameraDragItem,
  DevicesPanelStrings,
  SpeakerTrack,
} from '../devices-panel/types';
import { DEVICE_REGISTRY } from './deviceRegistry';
import type { DeviceActionContext } from './deviceActions';
import { DeviceRowHeader } from './DeviceRowHeader';
import { DeviceRowDetails } from './DeviceRowDetails';
import { DeviceActionBar } from './DeviceActionBar';

export interface DeviceRowProps {
  device: Device;
  isExpanded: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
  strings: DevicesPanelStrings;
  connectionStateLabels: Record<ConnectionState, string>;
  isMuted: boolean;
  muteRemaining: string | null;
  isFloodlightOn: boolean;
  isSpeakerPlaying: boolean;
  isPinnedToFeed: boolean;
  speakerTracks: SpeakerTrack[];
  onFlyTo: (lat: number, lon: number) => void;
  onToggleMute: (deviceId: string) => void;
  onFloodlightToggle?: (floodlightId: string, next: boolean) => void;
  onSpeakerToggle?: (speakerId: string, next: boolean) => void;
  onJamActivate?: (jammerId: string) => void;
  onPinToFeed?: (deviceId: string) => void;
  onUnpinFromFeed?: (deviceId: string) => void;
}

export function DeviceRow(props: DeviceRowProps) {
  const { device, isExpanded, onToggle, onHover, strings, connectionStateLabels } = props;
  const cfg = DEVICE_REGISTRY[device.type];
  const draggable = !!cfg.capabilities.draggableToFeed;

  const ctx: DeviceActionContext = {
    device,
    strings,
    isMuted: props.isMuted,
    muteRemaining: props.muteRemaining,
    isFloodlightOn: props.isFloodlightOn,
    isSpeakerPlaying: props.isSpeakerPlaying,
    isPinnedToFeed: props.isPinnedToFeed,
    speakerTracks: props.speakerTracks,
    onFlyTo: props.onFlyTo,
    onToggleMute: props.onToggleMute,
    onFloodlightToggle: props.onFloodlightToggle,
    onSpeakerToggle: props.onSpeakerToggle,
    onJamActivate: props.onJamActivate,
    onPinToFeed: props.onPinToFeed,
    onUnpinFromFeed: props.onUnpinFromFeed,
  };

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: DEVICE_CAMERA_DRAG_TYPE,
      item: { cameraId: device.id, label: device.name } satisfies DeviceCameraDragItem,
      canDrag: draggable,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [device.id, device.name, draggable],
  );

  return (
    <Collapsible
      open={isExpanded}
      style={isDragging ? { opacity: 0.4 } : undefined}
      data-handoff-component="device-row"
      data-device-id={device.id}
      data-device-type={device.type}
    >
      <div
        ref={draggable ? dragRef : undefined}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        onMouseEnter={() => onHover(device.id)}
        onMouseLeave={() => onHover(null)}
        data-handoff-component="device-row-header"
        className={`flex items-center justify-center gap-2.5 px-4 py-2.5 text-end transition-[background-color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 border-b border-white/[0.06] ${
          isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.04] active:bg-white/[0.06]'
        } cursor-pointer`}
      >
        <DeviceRowHeader
          device={device}
          ctx={ctx}
          connectionStateLabels={connectionStateLabels}
        />
      </div>

      <CollapsibleContent
        className="overflow-hidden animate-in fade-in-0 duration-200"
        data-handoff-component="device-row-details"
      >
        <div className="flex flex-col bg-white/[0.03]">
          <DeviceRowDetails device={device} cfg={cfg} strings={strings} />
          <DeviceActionBar cfg={cfg} ctx={ctx} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
