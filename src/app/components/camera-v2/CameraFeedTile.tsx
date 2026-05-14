/**
 * Single camera feed tile - composes the video element with all overlays
 * (top HUD, control bar, detections, crosshair, telemetry, drone HUD,
 * playback split, context menu). Owns its hover/focus state and the
 * tile-level keyboard shortcuts (T, D, F, X, S, P, Esc).
 *
 * Stateless w.r.t. the panel: every action is bubbled up.
 */

import { useCallback, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useDrop } from 'react-dnd';
import { Maximize2, Pin } from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';
import { CameraTopHud } from './CameraTopHud';
import type { PickerAsset } from './CameraAssetPicker';
import { CameraControlBar } from './CameraControlBar';
import { CameraDetectionsOverlay } from './CameraDetectionsOverlay';
import { CenterCrosshair } from './CenterCrosshair';
import { DesignateTargetOverlay } from './DesignateTargetOverlay';
import { CameraTelemetryStrip } from './CameraTelemetryStrip';
import { DroneHud } from './DroneHud';
import { CameraContextMenu } from './CameraContextMenu';
import { PlaybackContainer } from './playback/PlaybackContainer';
import { TileDetectionAlert } from './TileDetectionAlert';
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

/**
 * How this tile is being rendered inside the parent layout.
 *
 *   - `fill`  — single / stack-2 / grid-2x2 (the default). Full HUD.
 *   - `hero`  — the large feed in `hero-filmstrip`. Same chrome as fill.
 *   - `thumb` — a small filmstrip preview. Drops the noisy bottom
 *               strips and gains the centered "Use as main" overlay.
 */
export type TileVariant = 'fill' | 'hero' | 'thumb';

// Stable fallbacks so a tile rendered without picker plumbing doesn't
// build a fresh Set / closure on every render — Radix would otherwise
// thrash the picker tree.
const EMPTY_PINNED_SET: Set<string> = new Set<string>();
function noopSwap(_cameraId: string): void {
  /* no-op */
}

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
  /** Layout role this tile is playing. Defaults to `'fill'`. */
  tileVariant?: TileVariant;
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
  /** Operator wants to swap this tile into the hero slot. Only wired
   *  by the panel for `tileVariant === 'thumb'`. When provided, the
   *  tile shows a centered hover button and treats double-click on the
   *  body as a promote shortcut. */
  onPromoteToHero?: () => void;
  /** Every device the operator could swap into this tile. Forwarded
   *  to `CameraTopHud` → `CameraAssetPicker`. Empty = picker
   *  self-disables. */
  availableAssets?: PickerAsset[];
  /** Camera ids currently mounted in *any* tile. Forwarded to the
   *  asset picker so it can disable rows that would cause a
   *  double-mount. */
  pinnedCameraIds?: Set<string>;
  /** Operator picked a different device from the asset picker. The
   *  panel reuses the same swap path drag-drop uses, so playback
   *  resets cleanly between cameras. */
  onSwapAsset?: (cameraId: string) => void;
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
  tileVariant = 'fill',
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
  onPromoteToHero,
  availableAssets,
  pinnedCameraIds,
  onSwapAsset,
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
  const isThumb = tileVariant === 'thumb';
  const isHero = tileVariant === 'hero';
  // Hero tiles already paint the boxes when the operator has detections
  // turned on, so the alert ring would be redundant noise. Thumbs and
  // fill tiles always show it: the whole point is to flag activity on
  // a feed the operator may not be looking at.
  const suppressDetectionAlert = isHero && detectionsOn;

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
        // Empty-tile bezel sits in the same below-substrate well as
        // VideoPanel.tsx — see palette.css §2 for the `--surface-void`
        // contract. A near-black surface keeps empty tiles distinct
        // from the substrate-1 page bg around them.
        className={`w-full h-full relative flex items-center justify-center bg-surface-void transition-shadow duration-150 ease-out
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

  // Thumbs hide the bottom strips (telemetry, control bar, playback)
  // and the live HUD that ride at thumbnail scale would just look like
  // visual noise. Right-click context menu still applies.
  const showLiveHud = !isThumb;
  const showPlayback = !isThumb;

  // The live frame shrinks to the top half whenever playback is open,
  // matching the legacy v1 split. Thumbs never open playback so they
  // always render the live frame edge-to-edge.
  const liveFrameClass =
    playbackEnabled && showPlayback
      ? 'absolute top-0 inset-x-0 h-1/2 overflow-hidden'
      : 'absolute inset-0 overflow-hidden';

  const handleTileDoubleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      // Only the panel-supplied promote callback acts on double-click.
      // Without it (the default `'fill'` and `'hero'` variants) the
      // gesture stays a no-op so we don't steal it from the platform.
      if (!onPromoteToHero) return;
      // Ignore double-clicks that originated inside an interactive
      // child (the control bar buttons, designate overlay, etc.) so
      // the operator can still use those without accidentally
      // promoting the tile.
      const target = e.target as HTMLElement;
      if (target.closest('button, [role="button"], a, input, [data-no-promote]')) return;
      onPromoteToHero();
    },
    [onPromoteToHero],
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
        onDoubleClick={handleTileDoubleClick}
        className={`w-full h-full relative isolate bg-black overflow-hidden focus:outline-none transition-shadow duration-150 ease-out
          ${cursorClass}
          ${showDropAccent ? 'shadow-[inset_0_0_0_2px_rgba(56,189,248,0.6)]' : 'focus-visible:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.3)]'}`}
        data-tile-variant={tileVariant}
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
          {/* Center crosshair sits beneath detections (boxes win) but
              above the video. Skipped on thumbs (too small to be
              useful) and while designate-target is armed (the
              designate overlay supplies its own follow-cursor reticle —
              two crosses would compete). */}
          {!isThumb && !designateMode && <CenterCrosshair />}
          <CameraDetectionsOverlay detections={detections} visible={detectionsOn} />
          {!playbackEnabled && !isThumb && (
            <DesignateTargetOverlay active={designateMode} onDesignate={handleDesignate} />
          )}
          {showLiveHud && (
            <>
              <DroneHud status={status} />
              <CameraTelemetryStrip visible={controlsVisible} status={status} />
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
                onZoomChange={onZoomChange}
              />
            </>
          )}
        </div>

        {/* Playback investigation surface — fills the bottom half of
            the tile while the live video sits on top. Thumbs never
            open playback (no transport at thumbnail scale). */}
        {showPlayback && playbackEnabled && playback && (
          <PlaybackContainer
            src={playbackSrc}
            state={playback}
            onPatch={onPlaybackChange}
          />
        )}

        <CameraTopHud
          cameraLabel={cameraLabel}
          mode={feed.mode}
          status={status}
          onAssignmentClick={onAssignmentClick}
          cameraId={feed.cameraId}
          availableAssets={availableAssets ?? []}
          pinnedCameraIds={pinnedCameraIds ?? EMPTY_PINNED_SET}
          onSwapAsset={onSwapAsset ?? noopSwap}
        />

        {/* Detection signal: state-based ring + one-shot pulse on new.
            Mounted *outside* the live frame so the ring frames the
            whole tile (matching the existing inset-shadow accents). */}
        {!suppressDetectionAlert && (
          <TileDetectionAlert detections={detections} />
        )}

        {/* Promote-to-hero affordance — thumbs only. Centered, hover-
            and focus-revealed; opacity-only so it doesn't interfere
            with `prefers-reduced-motion`. The control sits *above* the
            top HUD gradient so it stays legible regardless of the
            scene behind it. */}
        {isThumb && onPromoteToHero && (
          <div
            className={`absolute inset-0 z-30 flex items-center justify-center pointer-events-none transition-opacity duration-150 ease-out
              ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPromoteToHero();
              }}
              aria-label={tile.useAsMainAriaLabel}
              data-no-promote
              data-testid="promote-to-hero"
              className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm
                bg-black/60 backdrop-blur-sm ring-1 ring-inset ring-white/20
                text-white text-xs font-medium
                hover:bg-black/75 hover:ring-white/30
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50
                active:scale-[0.98] transition-[background-color,box-shadow,transform] duration-150 ease-out"
            >
              <Maximize2 size={12} aria-hidden="true" />
              <span>{tile.useAsMain}</span>
            </button>
          </div>
        )}
      </div>
    </CameraContextMenu>
  );
}
