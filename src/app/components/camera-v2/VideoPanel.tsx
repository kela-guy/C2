/**
 * Multi-feed video panel - the public surface of `camera-v2`.
 *
 * Layout rules:
 *   1 feed   - fills the panel
 *   2 feeds  - vertical stack with 1px divider
 *   3-4 feeds - 2x2 CSS grid
 *
 * Drop rules:
 *   - Drop on a tile - replaces that tile's cameraId.
 *   - Drop on the panel background (not a tile) - appends if room
 *     (handled via onPinDevice from the devices panel).
 */

import { useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { CameraFeedTile } from './CameraFeedTile';
import {
  DEVICE_CAMERA_DRAG_TYPE,
  type DeviceCameraDragItem,
} from '../DevicesPanel';
import type { CameraFeed, CameraStatus, DetectionBox } from './types';

export interface VideoPanelProps {
  feeds: CameraFeed[];
  onFeedsChange: (feeds: CameraFeed[]) => void;
  cameraLabelById: Record<string, string>;
  statusByCameraId: Record<string, CameraStatus>;
  detectionsByCameraId: Record<string, DetectionBox[]>;
  videoSrcDay: string;
  videoSrcNight?: string;
  videoSrcPlayback?: string;
  fullscreen: boolean;
  onFullscreenToggle: () => void;
  onTakeControl: (cameraId: string) => void;
  onReleaseControl: (cameraId: string) => void;
  onAssignmentClick?: (cameraId: string) => void;
  onPinDevice: (deviceId: string) => void;
  onTileFocus?: (cameraId: string) => void;
  onZoomChange?: (cameraId: string, zoomLevel: number) => void;
  /** Operator designated a point on a feed as a target. Coordinates are
   * normalised (0..1, top-left origin) to the feed's video bounds. */
  onDesignateTarget?: (cameraId: string, normX: number, normY: number) => void;
}

export function VideoPanel({
  feeds,
  onFeedsChange,
  cameraLabelById,
  statusByCameraId,
  detectionsByCameraId,
  videoSrcDay,
  videoSrcNight,
  videoSrcPlayback,
  fullscreen,
  onFullscreenToggle,
  onTakeControl,
  onReleaseControl,
  onAssignmentClick,
  onPinDevice,
  onTileFocus,
  onZoomChange,
  onDesignateTarget,
}: VideoPanelProps) {
  const updateFeed = useCallback(
    (index: number, patch: Partial<CameraFeed>) => {
      const next = feeds.map((f, i) => (i === index ? { ...f, ...patch } : f));
      onFeedsChange(next);
    },
    [feeds, onFeedsChange],
  );

  const handleSwapFeed = useCallback(
    (index: number, cameraId: string) => {
      const existing = feeds[index];
      if (!existing) return;
      onFeedsChange(feeds.map((f, i) => (i === index ? { ...f, cameraId } : f)));
    },
    [feeds, onFeedsChange],
  );

  // Panel-level drop: appends if room, otherwise routes through onPinDevice
  // to keep the swap-the-LRU-tile semantics consistent.
  const [{ isOver, canDrop }, panelDropRef] = useDrop(
    () => ({
      accept: DEVICE_CAMERA_DRAG_TYPE,
      drop: (item: DeviceCameraDragItem, monitor) => {
        if (monitor.didDrop()) return;
        onPinDevice(item.cameraId);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [onPinDevice],
  );

  const containerClass =
    feeds.length <= 2
      ? 'flex-1 min-h-0 flex flex-col'
      : 'flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-px bg-white/10';

  const showPanelDropAccent = isOver && canDrop;

  return (
    <div
      ref={panelDropRef as unknown as React.Ref<HTMLDivElement>}
      className={`h-full flex flex-col bg-[#0a0a0a] relative transition-shadow duration-150 ease-out
        ${showPanelDropAccent ? 'shadow-[inset_0_0_0_2px_rgba(56,189,248,0.45)]' : ''}`}
      data-testid="video-panel"
    >
      <div className={containerClass}>
        {feeds.map((feed, i) => {
          const status = feed.cameraId
            ? statusByCameraId[feed.cameraId] ?? defaultStatus()
            : defaultStatus();
          return (
            <div
              key={i}
              className={
                feeds.length === 2 && i > 0
                  ? 'flex-1 min-h-0 min-w-0 border-t border-white/10'
                  : 'flex-1 min-h-0 min-w-0'
              }
            >
              <CameraFeedTile
                feed={feed.cameraId ? feed : null}
                cameraLabel={cameraLabelById[feed.cameraId] ?? feed.cameraId}
                status={status}
                detections={detectionsByCameraId[feed.cameraId] ?? []}
                videoSrcDay={videoSrcDay}
                videoSrcNight={videoSrcNight}
                videoSrcPlayback={videoSrcPlayback}
                isFullscreen={fullscreen}
                onTakeControl={() => onTakeControl(feed.cameraId)}
                onReleaseControl={() => onReleaseControl(feed.cameraId)}
                onModeToggle={() => updateFeed(i, { mode: feed.mode === 'day' ? 'night' : 'day' })}
                onDetectionsToggle={() => updateFeed(i, { showDetections: !feed.showDetections })}
                onDesignateModeToggle={() => updateFeed(i, { designateMode: !feed.designateMode })}
                onPlaybackToggle={() => {
                  const next = !feed.playback?.enabled;
                  updateFeed(i, {
                    playback: next
                      ? feed.playback
                        ? { ...feed.playback, enabled: true }
                        : { enabled: true, positionSec: 0, durationSec: 60, isPlaying: true }
                      : feed.playback
                        ? { ...feed.playback, enabled: false, isPlaying: false }
                        : undefined,
                  });
                }}
                onPlaybackChange={(patch) =>
                  updateFeed(i, {
                    playback: feed.playback ? { ...feed.playback, ...patch } : undefined,
                  })
                }
                onZoomChange={(zoom) => feed.cameraId && onZoomChange?.(feed.cameraId, zoom)}
                onFullscreenToggle={onFullscreenToggle}
                onAssignmentClick={() => feed.cameraId && onAssignmentClick?.(feed.cameraId)}
                onDropDevice={(item) => handleSwapFeed(i, item.cameraId)}
                onFocus={() => feed.cameraId && onTileFocus?.(feed.cameraId)}
                onResetView={() => updateFeed(i, { designateMode: false, showDetections: false })}
                onDesignateTarget={(normX, normY) =>
                  feed.cameraId && onDesignateTarget?.(feed.cameraId, normX, normY)
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function defaultStatus(): CameraStatus {
  return {
    bearingDeg: 0,
    fovDeg: 0,
    controlOwner: 'none',
    deviceType: 'camera',
  };
}
