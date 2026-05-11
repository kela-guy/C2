/**
 * Single camera feed tile - composes the video element with all overlays
 * (top HUD, control bar, detections, crosshair, telemetry, drone HUD,
 * playback split, context menu). Owns its hover/focus state and the
 * tile-level keyboard shortcuts (T, D, F, X, S, P, Esc).
 *
 * Stateless w.r.t. the panel: every action is bubbled up.
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useDrop } from 'react-dnd';
import { Pin } from 'lucide-react';
import { CameraTopHud } from './CameraTopHud';
import { CameraControlBar } from './CameraControlBar';
import { CameraDetectionsOverlay } from './CameraDetectionsOverlay';
import { DesignateTargetOverlay } from './DesignateTargetOverlay';
import { CameraTelemetryStrip } from './CameraTelemetryStrip';
import { DroneHud } from './DroneHud';
import { CameraContextMenu } from './CameraContextMenu';
import { PlaybackTimeline } from './PlaybackTimeline';
import {
  DEVICE_CAMERA_DRAG_TYPE,
  type DeviceCameraDragItem,
} from '../DevicesPanel';
import type { CameraFeed, CameraStatus, DetectionBox } from './types';

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
  onTakeControl: () => void;
  onReleaseControl: () => void;
  onModeToggle: () => void;
  onDetectionsToggle: () => void;
  onDesignateModeToggle: () => void;
  onPlaybackToggle: () => void;
  onPlaybackChange: (patch: Partial<NonNullable<CameraFeed['playback']>>) => void;
  onZoomChange: (next: number) => void;
  onFullscreenToggle: () => void;
  onAssignmentClick?: () => void;
  onDropDevice: (item: DeviceCameraDragItem) => void;
  onFocus?: () => void;
  onResetView?: () => void;
  /** Fired when the operator designates a point on the feed as a target.
   * Coordinates are normalised to the feed (0..1, top-left origin). */
  onDesignateTarget?: (normX: number, normY: number) => void;
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
}: CameraFeedTileProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  const playbackVideoRef = useRef<HTMLVideoElement>(null);
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

  const handlePlaybackPlayPause = useCallback(() => {
    if (!playback) return;
    onPlaybackChange({ isPlaying: !playback.isPlaying });
  }, [onPlaybackChange, playback]);

  const handlePlaybackScrub = useCallback(
    (positionSec: number) => {
      onPlaybackChange({ positionSec });
      if (playbackVideoRef.current) playbackVideoRef.current.currentTime = positionSec;
    },
    [onPlaybackChange],
  );

  const handlePlaybackJump = useCallback(
    (delta: number) => {
      if (!playback) return;
      const clamped = Math.max(0, Math.min(playback.durationSec, playback.positionSec + delta));
      handlePlaybackScrub(clamped);
    },
    [handlePlaybackScrub, playback],
  );

  // Keep the playback <video> currentTime in sync with state when state moves.
  useEffect(() => {
    if (!playbackEnabled || !playbackVideoRef.current || !playback) return;
    const v = playbackVideoRef.current;
    if (Math.abs(v.currentTime - playback.positionSec) > 0.5) v.currentTime = playback.positionSec;
    if (playback.isPlaying && v.paused) v.play().catch(() => {});
    if (!playback.isPlaying && !v.paused) v.pause();
  }, [playbackEnabled, playback?.isPlaying, playback?.positionSec]);

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
        if (designateMode) {
          // Cancelling designate mode takes priority — most local intent.
          e.preventDefault();
          onDesignateModeToggle();
        } else if (settingsOpen) {
          e.preventDefault();
          setSettingsOpen(false);
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
      settingsOpen,
      status.controlRequestPending,
      writeDisabled,
    ],
  );

  if (!feed) {
    const showDropAccent = isOver && canDrop;
    return (
      <div
        ref={(node) => {
          dropRef(node);
          tileRef.current = node;
        }}
        className={`w-full h-full relative flex items-center justify-center bg-[#141414] transition-shadow duration-150 ease-out
          ${showDropAccent ? 'shadow-[inset_0_0_0_2px_rgba(56,189,248,0.6)]' : ''}`}
      >
        <div className="flex flex-col items-center gap-2 text-white/60">
          <Pin size={16} className="text-white/30" aria-hidden="true" />
          <span className="text-xs">{emptySlotHint ?? 'גרור או נעץ מכשיר לכאן'}</span>
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

  const liveVideo = (
    <video
      key={`${feed.cameraId}-${feed.mode}`}
      src={liveSrc}
      autoPlay
      loop
      muted
      playsInline
      draggable={false}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      style={useNightFilter ? { filter: 'grayscale(1) contrast(1.25) brightness(0.85) hue-rotate(180deg) invert(0.85)' } : undefined}
    >
      <track kind="captions" />
    </video>
  );

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
      <div
        ref={(node) => {
          dropRef(node);
          tileRef.current = node;
        }}
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
        {playbackEnabled ? (
          <div className="absolute inset-0 grid grid-rows-2">
            <div className="relative overflow-hidden">
              {liveVideo}
              <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
              <div
                className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/65 backdrop-blur-sm px-1.5 py-0.5"
                dir="ltr"
              >
                <span className="size-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" />
                <span className="text-[9px] font-semibold text-white/95 uppercase tracking-wider">Live</span>
              </div>
              <CameraDetectionsOverlay detections={detections} visible={detectionsOn} />
            </div>
            <div className="relative overflow-hidden border-2 border-[#ff0000]">
              <video
                ref={playbackVideoRef}
                key={`${feed.cameraId}-playback`}
                src={playbackSrc}
                autoPlay={playback?.isPlaying ?? false}
                loop
                muted
                playsInline
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ filter: 'sepia(0.18) contrast(1.05)' }}
              >
                <track kind="captions" />
              </video>
              <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-[#ff0000] px-1.5 py-0.5"
                dir="ltr"
              >
                <span className="text-[9px] font-mono font-semibold text-white uppercase tracking-wider">
                  Playback {playback ? `\u00b7 -${formatRemaining(playback)}` : ''}
                </span>
              </div>
              {playback && (
                <PlaybackTimeline
                  state={playback}
                  onScrub={handlePlaybackScrub}
                  onPlayPause={handlePlaybackPlayPause}
                  onJumpRelative={handlePlaybackJump}
                />
              )}
            </div>
          </div>
        ) : (
          <>
            {liveVideo}
            <CameraDetectionsOverlay detections={detections} visible={detectionsOn} />
            <DesignateTargetOverlay active={designateMode} onDesignate={handleDesignate} />
            <DroneHud status={status} />
            <CameraTelemetryStrip
              visible={controlsVisible}
              status={status}
              disabled={writeDisabled}
              onZoomChange={onZoomChange}
            />
          </>
        )}

        <CameraTopHud
          cameraLabel={cameraLabel}
          mode={feed.mode}
          status={status}
          onAssignmentClick={onAssignmentClick}
        />

        {/* Bottom control bar is suppressed while the live-vs-playback split
            is active so the only bottom-bar UI is the PlaybackTimeline.
            Right-click + keyboard shortcuts (P, F, S, T, D, X) still work. */}
        {!playbackEnabled && (
          <CameraControlBar
            visible={controlsVisible}
            mode={feed.mode}
            status={status}
            detectionsOn={detectionsOn}
            designateMode={designateMode}
            isFullscreen={isFullscreen}
            settingsOpen={settingsOpen}
            playbackEnabled={playbackEnabled}
            onSettingsOpenChange={setSettingsOpen}
            onTakeRelease={handleTakeRelease}
            onModeToggle={onModeToggle}
            onDetectionsToggle={onDetectionsToggle}
            onDesignateModeToggle={onDesignateModeToggle}
            onFullscreenToggle={onFullscreenToggle}
            onPlaybackToggle={onPlaybackToggle}
          />
        )}
      </div>
    </CameraContextMenu>
  );
}

function formatRemaining(state: NonNullable<CameraFeed['playback']>): string {
  const remaining = Math.max(0, Math.floor(state.durationSec - state.positionSec));
  const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const ss = (remaining % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}
