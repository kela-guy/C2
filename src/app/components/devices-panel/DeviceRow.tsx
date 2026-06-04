/**
 * Single device row.
 *
 * The container owns the `Collapsible` open state, the `react-dnd`
 * source (gated by `capabilities.draggableToFeed`), the expand toggle /
 * hover signal, and the per-row local state (timed notifications window,
 * lifted speaker track selection). Everything type-specific is delegated
 * to the registry + resolver via the three subviews:
 *   - `DeviceRowHeader`  — collapsed: health tile, name, primary cluster
 *   - `DeviceRowDetails` — expanded stat grid + optional camera preview
 *   - `DeviceActionBar`  — expanded footer action bar + 3-dot overflow
 *
 * Props remain tolerant (optional with defaults) so the styleguide can
 * render a single row without wiring the full panel. Re-exported from
 * `DevicesPanel.tsx`.
 */

import { useState } from 'react';
import { useDrag } from 'react-dnd';
import { Collapsible, CollapsibleContent } from '../ui/collapsible';
import {
  DEFAULT_CONNECTION_STATE_LABELS,
  DEFAULT_DEVICE_PANEL_STRINGS,
  DEFAULT_SPEAKER_TRACKS,
  DEVICE_CAMERA_DRAG_TYPE,
} from './constants';
import { DEVICE_REGISTRY } from './deviceRegistry';
import { getDeviceErrorCount } from './deviceHealth';
import type { DeviceActionContext } from './deviceActions';
import { useDeviceNotify } from './useDeviceNotify';
import { DeviceRowHeader } from './DeviceRowHeader';
import { DeviceRowDetails } from './DeviceRowDetails';
import { DeviceActionBar } from './DeviceActionBar';
import { DeviceErrorsDialog } from './controls/DeviceErrorsDialog';
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
  onOpenLogs,
  onArmNotifications,
  connectionStateLabels = DEFAULT_CONNECTION_STATE_LABELS,
  strings = DEFAULT_DEVICE_PANEL_STRINGS,
}: DeviceRowProps) {
  const cfg = DEVICE_REGISTRY[device.type];
  const draggable = !!cfg.capabilities.draggableToFeed;
  const online = device.connectionState !== 'offline';

  const [selectedTrackId, setSelectedTrackId] = useState<string>(speakerTracks[0]?.id ?? '');
  const [errorsOpen, setErrorsOpen] = useState(false);
  const notify = useDeviceNotify(device.id, online, onArmNotifications);

  const ctx: DeviceActionContext = {
    device,
    strings,
    isMuted,
    muteRemaining,
    isFloodlightOn: !!isFloodlightOn,
    isSpeakerPlaying: !!isSpeakerPlaying,
    isPinnedToFeed: !!isPinnedToFeed,
    speakerTracks,
    selectedTrackId: selectedTrackId || (speakerTracks[0]?.id ?? ''),
    onSelectTrack: setSelectedTrackId,
    errorCount: getDeviceErrorCount(device),
    isNotifyOn: notify.armed,
    notifyRemaining: notify.remaining,
    onToggleNotify: notify.toggle,
    onOpenLogs: () => onOpenLogs?.(device.id),
    onOpenErrors: () => setErrorsOpen(true),
    onFlyTo,
    onToggleMute,
    onFloodlightToggle,
    onSpeakerToggle,
    onJamActivate,
    onPinToFeed,
    onUnpinFromFeed,
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
          cfg={cfg}
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

      <DeviceErrorsDialog
        open={errorsOpen}
        onOpenChange={setErrorsOpen}
        device={device}
        strings={strings}
      />
    </Collapsible>
  );
}
