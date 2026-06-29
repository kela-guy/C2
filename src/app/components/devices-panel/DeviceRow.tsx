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

import { memo, useCallback, useMemo, useState } from 'react';
import { useDrag } from 'react-dnd';
import { Collapsible, CollapsibleContent } from '../ui/collapsible';
import {
  DEFAULT_CONNECTION_STATE_LABELS,
  DEFAULT_DEVICE_PANEL_STRINGS,
  DEFAULT_SPEAKER_TRACKS,
  DEVICE_CAMERA_DRAG_TYPE,
} from './constants';
import { DEVICE_REGISTRY } from './deviceRegistry';
import { getAggregatedIssues, getCompositeErrorCount, getDeviceErrorCount } from './deviceHealth';
import type { DeviceActionContext } from './deviceActions';
import { useDeviceNotify } from './useDeviceNotify';
import { DeviceRowHeader } from './DeviceRowHeader';
import { DeviceRowDetails } from './DeviceRowDetails';
import { DeviceActionBar } from './DeviceActionBar';
import { DeviceChildGroup } from './DeviceChildGroup';
import { DeviceErrorsDialog } from './controls/DeviceErrorsDialog';
import type { Device, DeviceCameraDragItem, DeviceRowProps } from './types';

export const DeviceRow = memo(function DeviceRow({
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
  onPinToFeed,
  onUnpinFromFeed,
  isPinnedToFeed,
  pathfinderFlightState,
  onLaunch,
  onAbort,
  onReturnToBase,
  onOpenLogs,
  onArmNotifications,
  onChildSelect,
  selectedChildId,
  connectionStateLabels = DEFAULT_CONNECTION_STATE_LABELS,
  strings = DEFAULT_DEVICE_PANEL_STRINGS,
}: DeviceRowProps) {
  const cfg = DEVICE_REGISTRY[device.type];
  const draggable = !!cfg.capabilities.draggableToFeed;
  const online = device.connectionState !== 'offline';
  const composite = !!cfg.capabilities.composite && (device.children?.length ?? 0) > 0;

  const [selectedTrackId, setSelectedTrackId] = useState<string>(speakerTracks[0]?.id ?? '');
  const [errorsOpen, setErrorsOpen] = useState(false);
  // Which device the errors modal lists — the parent itself (composite parents
  // get their children's errors rolled up) or a specific child row.
  const [errorsDevice, setErrorsDevice] = useState<Device | null>(null);
  const notify = useDeviceNotify(device.id, online, onArmNotifications);

  const handleToggle = useCallback(() => onToggle(device.id), [onToggle, device.id]);

  // Memoized so a parent re-render (or another row's notify countdown) does
  // not hand `DeviceRowHeader` / `DeviceActionBar` a fresh context object.
  // Only this row's own inputs (notify state, device, toggles) rebuild it.
  const ctx = useMemo<DeviceActionContext>(
    () => ({
      device,
      strings,
      isFloodlightOn: !!isFloodlightOn,
      isSpeakerPlaying: !!isSpeakerPlaying,
      isPinnedToFeed: !!isPinnedToFeed,
      speakerTracks,
      selectedTrackId: selectedTrackId || (speakerTracks[0]?.id ?? ''),
      onSelectTrack: setSelectedTrackId,
      errorCount: composite ? getCompositeErrorCount(device) : getDeviceErrorCount(device),
      isNotifyOn: notify.armed,
      notifyRemaining: notify.remaining,
      onToggleNotify: notify.toggle,
      // Logs opens the device's errors/logs modal directly; the optional
      // panel callback stays as a side-channel for hosts that track it.
      onOpenLogs: () => {
        setErrorsDevice(null);
        setErrorsOpen(true);
        onOpenLogs?.(device.id);
      },
      onOpenErrors: () => {
        setErrorsDevice(null);
        setErrorsOpen(true);
      },
      onFlyTo,
      onFloodlightToggle,
      onSpeakerToggle,
      onJamActivate,
      onPinToFeed,
      onUnpinFromFeed,
      pathfinderFlightState,
      onLaunch,
      onAbort,
      onReturnToBase,
    }),
    [
      device,
      composite,
      strings,
      isFloodlightOn,
      isSpeakerPlaying,
      isPinnedToFeed,
      speakerTracks,
      selectedTrackId,
      notify.armed,
      notify.remaining,
      notify.toggle,
      onOpenLogs,
      onFlyTo,
      onFloodlightToggle,
      onSpeakerToggle,
      onJamActivate,
      onPinToFeed,
      onUnpinFromFeed,
      pathfinderFlightState,
      onLaunch,
      onAbort,
      onReturnToBase,
    ],
  );

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
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
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
          {/*
            Composite children render as a collapsible inset panel between the
            telemetry grid and the action bar (V3 "grouped inset"), so the
            parent ↔ sensor hierarchy reads as one contained unit instead of a
            flat list trailing below the footer.
          */}
          {composite && (
            <DeviceChildGroup
              device={device}
              strings={strings}
              selectedChildId={selectedChildId}
              connectionStateLabels={connectionStateLabels}
              onHover={onHover}
              onChildSelect={onChildSelect}
              onOpenChildErrors={(child) => {
                setErrorsDevice(child);
                setErrorsOpen(true);
              }}
              onFlyTo={onFlyTo}
            />
          )}
          <DeviceActionBar cfg={cfg} ctx={ctx} />
        </div>
      </CollapsibleContent>

      <DeviceErrorsDialog
        open={errorsOpen}
        onOpenChange={(next) => {
          setErrorsOpen(next);
          if (!next) setErrorsDevice(null);
        }}
        device={
          errorsDevice
            ? { ...errorsDevice, errors: getAggregatedIssues(errorsDevice, strings, connectionStateLabels) }
            : composite
              ? { ...device, errors: getAggregatedIssues(device, strings, connectionStateLabels) }
              : device
        }
        strings={strings}
      />
    </Collapsible>
  );
});
