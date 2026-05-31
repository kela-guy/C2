/**
 * Single device row.
 *
 * Composes three pure subviews:
 *   - `DeviceRowHeader` — collapsed header (icon, name, status,
 *     inline type-specific controls)
 *   - `DeviceRowDetails` — expanded stat grid + camera preview
 *   - `DeviceRowActions` — expanded footer action bar
 *
 * The row container itself owns:
 *   - the `Collapsible` open state (driven by the parent panel)
 *   - the `react-dnd` source for camera rows (drag into video tiles)
 *   - the click/keyboard expand toggle and hover signal
 *
 * Re-exported from `DevicesPanel.tsx` so the styleguide can render
 * a single row without mounting the whole panel.
 */

import { useDrag } from 'react-dnd';
import { Collapsible, CollapsibleContent } from '../ui/collapsible';
import {
  DEFAULT_CONNECTION_STATE_LABELS,
  DEFAULT_DEVICE_PANEL_STRINGS,
  DEFAULT_SPEAKER_TRACKS,
  DEVICE_CAMERA_DRAG_TYPE,
} from './constants';
import { DeviceRowHeader } from './DeviceRowHeader';
import { DeviceRowDetails } from './DeviceRowDetails';
import { DeviceRowActions } from './DeviceRowActions';
import type { DeviceCameraDragItem, DeviceRowProps } from './types';

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
  strings = DEFAULT_DEVICE_PANEL_STRINGS,
}: DeviceRowProps) {
  const isCamera = device.type === 'camera';

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: DEVICE_CAMERA_DRAG_TYPE,
      item: { cameraId: device.id, label: device.name } satisfies DeviceCameraDragItem,
      canDrag: isCamera,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [device.id, device.name, isCamera],
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
        ref={isCamera ? dragRef : undefined}
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
          isExpanded={isExpanded}
          isMuted={isMuted}
          muteRemaining={muteRemaining}
          isFloodlightOn={!!isFloodlightOn}
          isSpeakerPlaying={!!isSpeakerPlaying}
          isPinnedToFeed={!!isPinnedToFeed}
          strings={strings}
          connectionStateLabels={connectionStateLabels}
          onJamActivate={onJamActivate}
          onSpeakerToggle={onSpeakerToggle}
          onPinToFeed={onPinToFeed}
          onUnpinFromFeed={onUnpinFromFeed}
        />
      </div>

      <CollapsibleContent
        className="overflow-hidden animate-in fade-in-0 duration-200"
        data-handoff-component="device-row-details"
      >
        <div className="flex flex-col bg-white/[0.03]">
          <DeviceRowDetails device={device} strings={strings} />
          <DeviceRowActions
            device={device}
            isMuted={isMuted}
            isPinnedToFeed={!!isPinnedToFeed}
            isFloodlightOn={!!isFloodlightOn}
            speakerTracks={speakerTracks}
            strings={strings}
            onFlyTo={onFlyTo}
            onToggleMute={onToggleMute}
            onFloodlightToggle={onFloodlightToggle}
            onPinToFeed={onPinToFeed}
            onUnpinFromFeed={onUnpinFromFeed}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
