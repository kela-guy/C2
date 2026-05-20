/**
 * Multi-feed video panel - the public surface of `camera-v2`.
 *
 * Operator-controlled layouts (picked via the panel's top-end
 * `VideoLayoutPicker` chrome — no auto-selection):
 *
 *   - `single`         — `feeds[activeFeedIndex]` fills the panel.
 *   - `stack-2`        — first two feeds vertically split 50/50.
 *   - `grid-2x2`       — up to four feeds in a 2x2 CSS grid.
 *   - `hero-filmstrip` — `feeds[activeFeedIndex]` takes ~78% on top, the rest
 *                         render as a horizontal filmstrip below.
 *
 * When the chosen `layout` cannot fit `feeds.length`, the panel falls
 * back deterministically: hero-filmstrip → grid-2x2 → stack-2 → single.
 * The chosen value is preserved in props so the picker still shows the
 * operator's intent — only the rendered layout adapts.
 *
 * Drop rules:
 *   - Drop on a tile - replaces that tile's cameraId when `onAddToActiveTab`
 *     is absent; otherwise adds a split stream to the active tab.
 *   - Drop on the panel background - appends via `onAddToActiveTab` or
 *     `onPinDevice` when no tile consumed the drop.
 */

import { useCallback, useMemo, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { CameraFeedTile } from './CameraFeedTile';
import { VideoPanelEmptyState } from './VideoPanelEmptyState';
import {
  VideoLayoutPicker,
  isLayoutEnabledForFeedCount,
} from './VideoLayoutPicker';
import type { PickerAsset } from './CameraAssetPicker';
import {
  DEVICE_CAMERA_DRAG_TYPE,
  type DeviceCameraDragItem,
} from '../DevicesPanel';
import { makeOpenPlaybackState } from './playback/playbackDefaults';
import type {
  CameraFeed,
  CameraStatus,
  DetectionBox,
  LayoutKind,
  PlaybackState,
} from './types';

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
  /** Pin a device into a feed slot (panel-level drop fallback). */
  onPinDevice?: (deviceId: string) => void;
  /** Append a device to the active tab as split view (dashboard). */
  onAddToActiveTab?: (deviceId: string) => void;
  onTileFocus?: (cameraId: string) => void;
  onTileHover?: (cameraId: string | null) => void;
  onZoomChange?: (cameraId: string, zoomLevel: number) => void;
  /** Operator designated a point on a feed as a target. Coordinates are
   * normalised (0..1, top-left origin) to the feed's video bounds. */
  onDesignateTarget?: (cameraId: string, normX: number, normY: number) => void;
  /** Operator-chosen layout preset. */
  layout: LayoutKind;
  onLayoutChange: (next: LayoutKind) => void;
  /** Index into `feeds[]` that the operator is focused on. Drives
   *  the rendered feed in `single`, the hero in `hero-filmstrip`,
   *  and the keyboard-shortcut target / focus ring in the multi-
   *  tile layouts. Clamped to `feeds.length - 1` by the parent. */
  activeFeedIndex: number;
  onActiveFeedChange: (next: number) => void;
  /** When false, the absolute `VideoLayoutPicker` overlay is
   *  suppressed. Hosts that render the picker in their own chrome
   *  (e.g. the gridblock panel header) opt out via this flag.
   *  Defaults to `true` so standalone callers behave as before. */
  showLayoutPicker?: boolean;
  /** When false, every tile's per-tile `CameraAssetPicker` is
   *  suppressed. Hosts that expose asset selection elsewhere (e.g.
   *  a tab strip in the panel header) opt out via this flag.
   *  Defaults to `true` so standalone callers behave as before. */
  showTileAssetPicker?: boolean;
  /** Every device the operator could swap into a tile. Forwarded to
   *  every tile's asset picker. Defaults to an empty array (picker
   *  self-disables). */
  availableAssets?: PickerAsset[];
}

// Stable empty array reference for the `availableAssets` fallback —
// allocating `[]` per render would invalidate every tile's asset
// picker memo on every parent rerender.
const EMPTY_ASSETS: PickerAsset[] = [];

/**
 * Constrains a tile to 16:9 inside its layout slot.
 *
 * The CameraFeedTile renders `w-full h-full` so it fills whatever box
 * we hand it; this wrapper is what *defines* that box's shape:
 *   - `aspect-video` (16:9) on the inner div fixes the ratio.
 *   - `w-full max-h-full` lets the browser pick whichever dimension
 *     constrains first — wide slot → height-limited (letterbox left
 *     and right), tall slot → width-limited (letterbox top and
 *     bottom). Modern CSS `aspect-ratio` shrinks the *other*
 *     dimension to preserve the ratio when a max-* clamp kicks in.
 *   - `flex items-center justify-center` on the outer div centers
 *     the 16:9 box inside the slot so the letterbox bars are even.
 *
 * Black background so letterbox bars read as intentional chrome rather
 * than as the panel's `bg-surface-void` bleeding through.
 */
function VideoTileSlot({
  children,
  className = '',
  testId,
}: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={`min-h-0 min-w-0 bg-black flex items-center justify-center ${className}`}
      data-testid={testId}
    >
      <div className="aspect-video w-full max-h-full">{children}</div>
    </div>
  );
}

const LAYOUT_FALLBACK_ORDER: LayoutKind[] = [
  'hero-filmstrip',
  'grid-2x2',
  'stack-2',
  'single',
];

/**
 * Resolve the operator's chosen layout against the current feed count.
 * If the chosen layout can't fit the feeds we have, walk down the
 * fallback ladder. Pure helper, exported for tests.
 */
export function resolveLayout(layout: LayoutKind, feedCount: number): LayoutKind {
  if (feedCount <= 1) return 'single';
  if (isLayoutEnabledForFeedCount(layout, feedCount)) return layout;
  for (const candidate of LAYOUT_FALLBACK_ORDER) {
    if (isLayoutEnabledForFeedCount(candidate, feedCount)) return candidate;
  }
  return 'single';
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
  onAddToActiveTab,
  onTileFocus,
  onTileHover,
  onZoomChange,
  onDesignateTarget,
  layout,
  onLayoutChange,
  activeFeedIndex,
  onActiveFeedChange,
  showLayoutPicker = true,
  showTileAssetPicker = true,
  availableAssets,
}: VideoPanelProps) {
  const resolvedLayout = useMemo(
    () => resolveLayout(layout, feeds.length),
    [layout, feeds.length],
  );
  const safeActiveFeedIndex = Math.min(
    Math.max(activeFeedIndex, 0),
    Math.max(feeds.length - 1, 0),
  );

  // Camera ids currently mounted in any tile. Used by each tile's
  // asset picker to disable rows that would cause a double-mount.
  // Memoised so the picker tree doesn't re-mount on unrelated state.
  const pinnedCameraIds = useMemo(() => {
    const set = new Set<string>();
    for (const f of feeds) {
      if (f.cameraId) set.add(f.cameraId);
    }
    return set;
  }, [feeds]);

  // Stable empty fallback so a missing prop doesn't allocate a fresh
  // array per render — matches the same trick the tile uses for the
  // pinned-set fallback.
  const safeAvailableAssets = availableAssets ?? EMPTY_ASSETS;
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
      // Reset playback when swapping cameras so the old position /
      // sourceId / errorMessage cannot leak onto the new feed.
      onFeedsChange(
        feeds.map((f, i) =>
          i === index ? { ...f, cameraId, playback: undefined } : f,
        ),
      );
    },
    [feeds, onFeedsChange],
  );

  /**
   * Toggle the playback investigation surface for a feed.
   *
   *   - When opening: build a fresh open-state via
   *     `makeOpenPlaybackState` (rewinds 30s, paused).
   *   - When closing: pause the clip and clear the runtime fields, but
   *     retain the per-feed `playback` object so re-opening from the
   *     same camera is cheap.
   */
  const handlePlaybackToggle = useCallback(
    (index: number) => {
      const feed = feeds[index];
      if (!feed?.cameraId) return;
      const existing = feed.playback;

      if (existing?.enabled) {
        const next: PlaybackState = {
          ...existing,
          enabled: false,
          isPlaying: false,
          status: existing.status === 'error' ? 'error' : 'idle',
          isScrubbing: false,
        };
        updateFeed(index, { playback: next });
        return;
      }

      const next = makeOpenPlaybackState({
        sourceId: feed.cameraId,
        durationSec: existing?.durationSec ?? 0,
      });
      updateFeed(index, { playback: next });
    },
    [feeds, updateFeed],
  );

  const handlePlaybackChange = useCallback(
    (index: number, patch: Partial<PlaybackState>) => {
      const feed = feeds[index];
      if (!feed?.cameraId || !feed.playback) return;
      const next: PlaybackState = { ...feed.playback, ...patch };
      updateFeed(index, { playback: next });
    },
    [feeds, updateFeed],
  );

  // Panel-level drop: append to active tab, or legacy pin fallback.
  const [{ isOver, canDrop }, panelDropRef] = useDrop(
    () => ({
      accept: DEVICE_CAMERA_DRAG_TYPE,
      drop: (item: DeviceCameraDragItem, monitor) => {
        if (monitor.didDrop()) return;
        if (onAddToActiveTab) onAddToActiveTab(item.cameraId);
        else onPinDevice?.(item.cameraId);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [onAddToActiveTab, onPinDevice],
  );

  const showPanelDropAccent = isOver && canDrop;

  /**
   * Per-tile handler bundles. `CameraFeedTile` is shallow-prop heavy
   * and was previously re-rendering on every parent commit because
   * each render created fresh inline arrow functions for ~12 props.
   * Building stable per-index bundles via refs lets the tile memoize
   * cleanly — handlers read latest `feeds[index]` and parent
   * callbacks through the refs below, so they never need new
   * identities.
   */
  const refs = useRef({
    feeds,
    updateFeed,
    handleSwapFeed,
    handlePlaybackToggle,
    handlePlaybackChange,
    onTakeControl,
    onReleaseControl,
    onZoomChange,
    onFullscreenToggle,
    onAssignmentClick,
    onTileFocus,
    onTileHover,
    onDesignateTarget,
    onActiveFeedChange,
    onAddToActiveTab,
  });
  refs.current = {
    feeds,
    updateFeed,
    handleSwapFeed,
    handlePlaybackToggle,
    handlePlaybackChange,
    onTakeControl,
    onReleaseControl,
    onZoomChange,
    onFullscreenToggle,
    onAssignmentClick,
    onTileFocus,
    onTileHover,
    onDesignateTarget,
    onActiveFeedChange,
    onAddToActiveTab,
  };

  type TileHandlers = {
    onTakeControl: () => void;
    onReleaseControl: () => void;
    onModeToggle: () => void;
    onDetectionsToggle: () => void;
    onDesignateModeToggle: () => void;
    onPlaybackToggle: () => void;
    onPlaybackChange: (patch: Partial<PlaybackState>) => void;
    onZoomChange: (zoom: number) => void;
    onFullscreenToggle: () => void;
    onAssignmentClick: () => void;
    onDropDevice: (item: DeviceCameraDragItem) => void;
    onFocus: () => void;
    onHoverChange: (hovering: boolean) => void;
    onResetView: () => void;
    onDesignateTarget: (normX: number, normY: number) => void;
    onPromoteToHero: () => void;
    onSwapAsset: (cameraId: string) => void;
  };
  const tileHandlerCacheRef = useRef<TileHandlers[]>([]);
  const getTileHandlers = (index: number): TileHandlers => {
    const cache = tileHandlerCacheRef.current;
    if (cache[index]) return cache[index];
    const handlers: TileHandlers = {
      onTakeControl: () => {
        const feed = refs.current.feeds[index];
        if (feed?.cameraId) refs.current.onTakeControl(feed.cameraId);
      },
      onReleaseControl: () => {
        const feed = refs.current.feeds[index];
        if (feed?.cameraId) refs.current.onReleaseControl(feed.cameraId);
      },
      onModeToggle: () => {
        const feed = refs.current.feeds[index];
        if (!feed) return;
        refs.current.updateFeed(index, { mode: feed.mode === 'day' ? 'night' : 'day' });
      },
      onDetectionsToggle: () => {
        const feed = refs.current.feeds[index];
        if (!feed) return;
        refs.current.updateFeed(index, { showDetections: !feed.showDetections });
      },
      onDesignateModeToggle: () => {
        const feed = refs.current.feeds[index];
        if (!feed) return;
        refs.current.updateFeed(index, { designateMode: !feed.designateMode });
      },
      onPlaybackToggle: () => refs.current.handlePlaybackToggle(index),
      onPlaybackChange: (patch) => refs.current.handlePlaybackChange(index, patch),
      onZoomChange: (zoom) => {
        const feed = refs.current.feeds[index];
        if (feed?.cameraId) refs.current.onZoomChange?.(feed.cameraId, zoom);
      },
      onFullscreenToggle: () => refs.current.onFullscreenToggle(),
      onAssignmentClick: () => {
        const feed = refs.current.feeds[index];
        if (feed?.cameraId) refs.current.onAssignmentClick?.(feed.cameraId);
      },
      onDropDevice: (item) => {
        if (refs.current.onAddToActiveTab) {
          refs.current.onAddToActiveTab(item.cameraId);
        } else {
          refs.current.handleSwapFeed(index, item.cameraId);
        }
      },
      onFocus: () => {
        const feed = refs.current.feeds[index];
        if (feed?.cameraId) refs.current.onTileFocus?.(feed.cameraId);
        refs.current.onActiveFeedChange(index);
      },
      onHoverChange: (hovering) => {
        const feed = refs.current.feeds[index];
        if (!feed?.cameraId) return;
        refs.current.onTileHover?.(hovering ? feed.cameraId : null);
      },
      onResetView: () =>
        refs.current.updateFeed(index, { designateMode: false, showDetections: false }),
      onDesignateTarget: (normX, normY) => {
        const feed = refs.current.feeds[index];
        if (feed?.cameraId) refs.current.onDesignateTarget?.(feed.cameraId, normX, normY);
      },
      onPromoteToHero: () => refs.current.onActiveFeedChange(index),
      onSwapAsset: (cameraId) => refs.current.handleSwapFeed(index, cameraId),
    };
    cache[index] = handlers;
    return handlers;
  };

  /**
   * Render the tile for `feeds[index]` with all the panel-supplied
   * wiring. `tileVariant` controls the in-tile chrome (thumbs hide
   * the noisy strips, hero gets the full HUD, fill is the default).
   */
  const renderTile = (index: number, tileVariant: 'fill' | 'hero' | 'thumb') => {
    const feed = feeds[index];
    if (!feed) return null;
    const status = feed.cameraId
      ? statusByCameraId[feed.cameraId] ?? defaultStatus()
      : defaultStatus();
    const h = getTileHandlers(index);
    return (
      <CameraFeedTile
        feed={feed.cameraId ? feed : null}
        cameraLabel={cameraLabelById[feed.cameraId] ?? feed.cameraId}
        status={status}
        detections={detectionsByCameraId[feed.cameraId] ?? []}
        videoSrcDay={videoSrcDay}
        videoSrcNight={videoSrcNight}
        videoSrcPlayback={videoSrcPlayback}
        isFullscreen={fullscreen}
        tileVariant={tileVariant}
        onTakeControl={h.onTakeControl}
        onReleaseControl={h.onReleaseControl}
        onModeToggle={h.onModeToggle}
        onDetectionsToggle={h.onDetectionsToggle}
        onDesignateModeToggle={h.onDesignateModeToggle}
        onPlaybackToggle={h.onPlaybackToggle}
        onPlaybackChange={h.onPlaybackChange}
        onZoomChange={h.onZoomChange}
        onFullscreenToggle={h.onFullscreenToggle}
        onAssignmentClick={h.onAssignmentClick}
        onDropDevice={h.onDropDevice}
        onFocus={h.onFocus}
        onHoverChange={h.onHoverChange}
        onResetView={h.onResetView}
        onDesignateTarget={h.onDesignateTarget}
        onPromoteToHero={tileVariant === 'thumb' ? h.onPromoteToHero : undefined}
        availableAssets={safeAvailableAssets}
        pinnedCameraIds={pinnedCameraIds}
        onSwapAsset={h.onSwapAsset}
        showAssetPicker={showTileAssetPicker}
      />
    );
  };

  let layoutBody: React.ReactNode;
  switch (resolvedLayout) {
    case 'single': {
      layoutBody = (
        <VideoTileSlot className="flex-1">
          {renderTile(safeActiveFeedIndex, 'fill')}
        </VideoTileSlot>
      );
      break;
    }
    case 'stack-2': {
      layoutBody = (
        <div className="flex-1 min-h-0 flex flex-col">
          <VideoTileSlot className="flex-1">{renderTile(0, 'fill')}</VideoTileSlot>
          <VideoTileSlot className="flex-1 border-t border-state-hover-strong">
            {renderTile(1, 'fill')}
          </VideoTileSlot>
        </div>
      );
      break;
    }
    case 'grid-2x2': {
      layoutBody = (
        <div
          className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-px bg-state-hover-strong"
          data-testid="video-panel-grid"
        >
          {feeds.slice(0, 4).map((_, i) => (
            <VideoTileSlot key={i}>{renderTile(i, 'fill')}</VideoTileSlot>
          ))}
        </div>
      );
      break;
    }
    case 'hero-filmstrip': {
      const thumbIndices = feeds
        .map((_, i) => i)
        .filter((i) => i !== safeActiveFeedIndex);
      layoutBody = (
        <div className="flex-1 min-h-0 flex flex-col gap-px bg-state-hover-strong">
          <VideoTileSlot
            className="basis-[78%]"
            testId="video-panel-hero"
          >
            {renderTile(safeActiveFeedIndex, 'hero')}
          </VideoTileSlot>
          <div
            className="flex-1 min-h-0 grid grid-flow-col auto-cols-fr gap-px"
            data-testid="video-panel-filmstrip"
          >
            {thumbIndices.map((i) => (
              <VideoTileSlot key={i}>{renderTile(i, 'thumb')}</VideoTileSlot>
            ))}
          </div>
        </div>
      );
      break;
    }
    default: {
      const _exhaustive: never = resolvedLayout;
      layoutBody = _exhaustive;
    }
  }

  // Picker is hidden when there's at most one feed (no meaningful
  // layout choice to make), or when the host suppresses it via
  // `showLayoutPicker={false}` because it renders the picker in its
  // own chrome (panel header). Positioned `inline-end` so it
  // mirrors with app direction; the picker's own contents stay LTR
  // because the layout-shape glyphs would otherwise read backwards.
  const showPicker = showLayoutPicker && feeds.length >= 2;

  return (
    <div
      ref={panelDropRef as unknown as React.Ref<HTMLDivElement>}
      // VideoPanel sits BELOW the substrate ladder. Camera feeds need
      // a true-black well (so letterbox bars read as intentional chrome
      // and the video itself anchors against a non-substrate color).
      // `bg-surface-void` is the formal token for this case — see
      // palette.css §2 for why surface-void exists.
      className={`h-full flex flex-col bg-surface-void relative transition-shadow duration-150 ease-out
        ${showPanelDropAccent ? 'shadow-[inset_0_0_0_2px_color-mix(in_oklch,var(--accent-info)_45%,transparent)]' : ''}`}
      data-testid="video-panel"
    >
      {feeds.length === 0 ? (
        <VideoPanelEmptyState />
      ) : (
        layoutBody
      )}

      {showPicker && (
        <div className="absolute top-2 end-2 z-30 pointer-events-auto">
          <VideoLayoutPicker
            value={layout}
            onChange={onLayoutChange}
            feedCount={feeds.length}
          />
        </div>
      )}
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
