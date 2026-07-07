/**
 * Single camera feed tile - composes the video element with all overlays
 * (top HUD, control bar, detections, crosshair, telemetry, drone HUD,
 * playback split, context menu). Owns its hover/focus state and the
 * tile-level keyboard shortcuts (T, D, F, X, S, P, Esc).
 *
 * Stateless w.r.t. the panel: every action is bubbled up.
 */

import { useCallback, useState, type KeyboardEvent } from 'react';
import { useDrop } from 'react-dnd';
import { Pin } from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';
import { CameraTopHud } from './CameraTopHud';
import { CameraDetectionsOverlay } from './CameraDetectionsOverlay';
import { DesignateTargetOverlay } from './DesignateTargetOverlay';
import { CameraTelemetryStrip } from './CameraTelemetryStrip';
import { DroneHud } from './DroneHud';
import { CameraContextMenu } from './CameraContextMenu';
import { PlaybackContainer } from './playback/PlaybackContainer';
import {
  DEVICE_CAMERA_DRAG_TYPE,
  type DeviceCameraDragItem,
} from '../DevicesPanel';
import type {
  CameraFeed,
  CameraStatus,
  DetectionBox,
  PlaybackState,
} from './types';

interface CameraFeedTileProps {
  feed: CameraFeed | null;
  cameraLabel: string;
  status: CameraStatus;
  detections: DetectionBox[];
  videoSrcDay: string;
  videoSrcNight?: string;
  videoSrcPlayback?: string;
  isFullscreen: boolean;
  emptySlotHint?: string;
  /** Hide the built-in drone HUD overlay (e.g. when a host supplies its own chrome). */
  suppressDroneHud?: boolean;
  /** Hide the built-in bottom telemetry strip (e.g. when a host supplies its own chrome). */
  suppressTelemetryStrip?: boolean;
  onTakeControl: () => void;
  onReleaseControl: () => void;
  onModeToggle: () => void;
  onDetectionsToggle: () => void;
  onDesignateModeToggle: () => void;
  onPlaybackToggle: () => void;
  onPlaybackChange: (patch: Partial<PlaybackState>) => void;
  onZoomChange: (next: number) => void;
  onFullscreenToggle: () => void;
  onAssignmentClick?: () => void;
  onDropDevice: (item: DeviceCameraDragItem) => void;
  onFocus?: () => void;
  onResetView?: () => void;
  /** Fired when the operator designates a point on the feed as a target.
   * Coordinates are normalised to the feed (0..1, top-left origin). */
  onDesignateTarget?: (normX: number, normY: number) => void;
  /** Override the right-click menu. Receives the tile content and must wrap
   * it in a context-menu trigger. Defaults to the standard CameraContextMenu. */
  renderContextMenu?: (content: React.ReactNode) => React.ReactNode;
}

export function CameraFeedTile({
  feed,
  cameraLabel,
  status,
  detections,
  videoSrcDay,
  videoSrcNight,
  videoSrcPlayback,
  isFullscreen,
  emptySlotHint,
  suppressDroneHud = false,
  suppressTelemetryStrip = false,
  onTakeControl,
  onReleaseControl,
  onModeToggle,
  onDetectionsToggle,
  onDesignateModeToggle,
  onPlaybackToggle,
  onPlaybackChange,
  onZoomChange,
  onFullscreenToggle,
  onAssignmentClick,
  onDropDevice,
  onFocus,
  onResetView,
  onDesignateTarget,
  renderContextMenu,
}: CameraFeedTileProps) {
  const tile = useStrings().camera.feedTile;
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const writeDisabled = status.controlOwner === 'other';
  const playback = feed?.playback;
  const playbackEnabled = !!playback?.enabled;
  const designateMode = !!feed?.designateMode;
  const detectionsOn = !!feed?.showDetections;

  const [{ isOver, canDrop }, dropRef] = useDrop(
    () => ({
      accept: DEVICE_CAMERA_DRAG_TYPE,
      drop: (item: DeviceCameraDragItem) => onDropDevice(item),
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [onDropDevice],
  );

  const handleTakeRelease = useCallback(() => {
    if (writeDisabled || status.controlRequestPending) return;
    if (status.controlOwner === 'self') onReleaseControl();
    else onTakeControl();
  }, [onReleaseControl, onTakeControl, status.controlOwner, status.controlRequestPending, writeDisabled]);

  // Playback transport handlers (scrub / play-pause / jump) live inside
  // `PlaybackContainer` now — the container owns the `<video>` ref and
  // patches state on the way out. The tile only needs to bubble up the
  // open/close state and forward snapshot/sync.

  const handleDesignate = useCallback(
    (normX: number, normY: number) => {
      onDesignateTarget?.(normX, normY);
      // Single-shot: exit designate mode after the click so the cursor
      // returns to normal and the operator can keep working.
      if (designateMode) onDesignateModeToggle();
    },
    [designateMode, onDesignateModeToggle, onDesignateTarget],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // The playback transport itself handles `[`/`]` (event step) and
      // `,`/`.` (frame step) when the focus is inside it; those events
      // get `stopPropagation` from the transport so we never see them
      // here. Anything that bubbles up is operator-level intent and we
      // can act on it.
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onFullscreenToggle();
      } else if (e.key === 't' || e.key === 'T') {
        if (writeDisabled || status.controlRequestPending) return;
        e.preventDefault();
        handleTakeRelease();
      } else if (e.key === 'd' || e.key === 'D') {
        if (writeDisabled) return;
        e.preventDefault();
        onModeToggle();
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        onDesignateModeToggle();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setSettingsOpen((prev) => !prev);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onPlaybackToggle();
      } else if (e.key === 'Escape') {
        // Esc priority: designate cancel > settings popover > playback
        // exit > fullscreen exit. Playback comes before fullscreen
        // because it's the most recently invoked context the operator
        // is investigating in.
        if (designateMode) {
          e.preventDefault();
          onDesignateModeToggle();
        } else if (settingsOpen) {
          e.preventDefault();
          setSettingsOpen(false);
        } else if (playbackEnabled) {
          e.preventDefault();
          onPlaybackToggle();
        } else if (isFullscreen) {
          e.preventDefault();
          onFullscreenToggle();
        }
      }
    },
    [
      designateMode,
      handleTakeRelease,
      isFullscreen,
      onDesignateModeToggle,
      onFullscreenToggle,
      onModeToggle,
      onPlaybackToggle,
      playbackEnabled,
      settingsOpen,
      status.controlRequestPending,
      writeDisabled,
    ],
  );

  if (!feed) {
    const showDropAccent = isOver && canDrop;
    return (
      <div
        ref={dropRef}
        className={`w-full h-full relative flex items-center justify-center bg-surface-1 transition-shadow duration-150 ease-out
          ${showDropAccent ? 'shadow-[inset_0_0_0_2px_rgba(56,189,248,0.6)]' : ''}`}
      >
        <div className="flex flex-col items-center gap-2 text-white/60">
          <Pin size={16} className="text-white/30" aria-hidden="true" />
          <span className="text-xs">{emptySlotHint ?? tile.defaultEmptySlotHint}</span>
        </div>
      </div>
    );
  }

  const liveSrc = feed.mode === 'night' && videoSrcNight ? videoSrcNight : videoSrcDay;
  const useNightFilter = feed.mode === 'night' && !videoSrcNight;
  const playbackSrc = videoSrcPlayback ?? videoSrcNight ?? videoSrcDay;
  const controlsVisible = hovered || focusWithin || settingsOpen;
  const showDropAccent = isOver && canDrop;
  // Designate mode supplies its own `cursor-crosshair` from the overlay.
  // Outside of it, the tile uses the platform default cursor.
  const cursorClass = '';

  // The live frame shrinks to the top half whenever playback is open,
  // matching the legacy v1 split. With no other layouts in play this is
  // the only branch we need.
  const liveFrameClass = playbackEnabled
    ? 'absolute top-0 inset-x-0 h-1/2 overflow-hidden'
    : 'absolute inset-0 overflow-hidden';

  const tileContent = (
      <div
        ref={dropRef}
        tabIndex={0}
        role="region"
        aria-label={`Camera feed: ${cameraLabel}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => {
          setFocusWithin(true);
          onFocus?.();
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocusWithin(false);
        }}
        onKeyDown={handleKeyDown}
        className={`w-full h-full relative bg-black overflow-hidden focus:outline-none transition-shadow duration-150 ease-out
          ${cursorClass}
          ${showDropAccent ? 'shadow-[inset_0_0_0_2px_rgba(56,189,248,0.6)]' : 'focus-visible:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.3)]'}`}
      >
        {/* Live frame — always rendered. When playback is open it
            shrinks to the top half so the playback container can take
            the bottom half (a vertical 50/50 split). Otherwise it fills
            the entire tile.
            
            The live HUD (drone overlay, telemetry, control bar) lives
            inside this div so its bottom edge tracks the live frame —
            when playback is open the control bar surfaces on hover at
            the live/playback divider rather than disappearing entirely. */}
        <div className={liveFrameClass}>
          <video
            key={`${feed.cameraId}-${feed.mode}`}
            src={liveSrc}
            autoPlay
            loop
            muted
            playsInline
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={
              useNightFilter
                ? {
                    filter:
                      'grayscale(1) contrast(1.25) brightness(0.85) hue-rotate(180deg) invert(0.85)',
                  }
                : undefined
            }
          >
            <track kind="captions" />
          </video>
          <CameraDetectionsOverlay detections={detections} visible={detectionsOn} />
          {!playbackEnabled && (
            <DesignateTargetOverlay active={designateMode} onDesignate={handleDesignate} />
          )}
          {!suppressDroneHud && <DroneHud status={status} />}
          {!suppressTelemetryStrip && (
            <CameraTelemetryStrip visible={controlsVisible} status={status} />
          )}
        </div>

        {/* Playback investigation surface — fills the bottom half of
            the tile while the live video sits on top. */}
        {playbackEnabled && playback && (
          <PlaybackContainer
            src={playbackSrc}
            state={playback}
            onPatch={onPlaybackChange}
            onExit={onPlaybackToggle}
          />
        )}

        <CameraTopHud
          cameraLabel={cameraLabel}
          mode={feed.mode}
          status={status}
          onAssignmentClick={onAssignmentClick}
        />
      </div>
  );

  if (renderContextMenu) {
    return <>{renderContextMenu(tileContent)}</>;
  }

  return (
    <CameraContextMenu
      mode={feed.mode}
      status={status}
      detectionsOn={detectionsOn}
      designateMode={designateMode}
      onTakeRelease={handleTakeRelease}
      onModeToggle={onModeToggle}
      onDetectionsToggle={onDetectionsToggle}
      onDesignateModeToggle={onDesignateModeToggle}
      onResetView={() => onResetView?.()}
      onOpenSettings={() => setSettingsOpen(true)}
    >
      {tileContent}
    </CameraContextMenu>
  );
}
