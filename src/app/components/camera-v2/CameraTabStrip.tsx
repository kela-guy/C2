/**
 * Horizontal tab strip rendered inside the cameras panel header.
 *
 * Model:
 *   - One tab per grouped workspace in `tabs[]`. Each tab owns its
 *     own feeds, layout, and focal feed index.
 *   - Split tabs (feeds.length > 1) render inline stream pills —
 *     one chip per feed with icon, label, and close.
 *   - Single-feed tabs render a flat label + close.
 *   - Tabs accept device drag-drop to append a stream to that group.
 *   - Tabs are draggable onto other tabs to merge into split view.
 *   - A trailing `+` button opens a new tab via the pin popover.
 */

import { useCallback, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Camera, Plane, Plus, X } from '@/lib/icons/central';
import { useIsRtl } from '@/lib/direction';
import { useStrings } from '@/lib/intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  DEVICE_CAMERA_DRAG_TYPE,
  type DeviceCameraDragItem,
} from '../DevicesPanel';
import type { CameraFeedTab } from './types';
import type { PickerAsset } from './CameraAssetPicker';
import { MAX_VIDEO_FEEDS } from '@/app/hooks/useVideoFeeds';

export const VIDEO_TAB_DRAG_TYPE = 'VIDEO_TAB';

export interface VideoTabDragItem {
  sourceTabIndex: number;
}

function isVideoTabDragItem(item: unknown): item is VideoTabDragItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'sourceTabIndex' in item &&
    typeof (item as VideoTabDragItem).sourceTabIndex === 'number'
  );
}

function canMergeTabs(
  tabs: CameraFeedTab[],
  sourceTabIndex: number,
  targetTabIndex: number,
): boolean {
  if (sourceTabIndex === targetTabIndex) return false;
  const source = tabs[sourceTabIndex];
  const target = tabs[targetTabIndex];
  if (!source || !target) return false;

  const existingIds = new Set(target.feeds.map((f) => f.cameraId).filter(Boolean));
  const incoming = source.feeds.filter(
    (f) => f.cameraId && !existingIds.has(f.cameraId),
  );
  return target.feeds.length + incoming.length <= MAX_VIDEO_FEEDS;
}

export interface CameraTabStripProps {
  tabs: CameraFeedTab[];
  cameraLabelById: Record<string, string>;
  activeTabIndex: number;
  onActivate: (index: number) => void;
  onClose: (index: number) => void;
  onAddToTab: (tabIndex: number, deviceId: string) => void;
  onMergeTab: (sourceTabIndex: number, targetTabIndex: number) => void;
  onUnpinFeed: (deviceId: string) => void;

  availableAssets: PickerAsset[];
  pinnedCameraIds: Set<string>;
  onPin: (cameraId: string) => void;
  canPinMore: boolean;
}

function assetTypeById(
  assets: PickerAsset[],
  id: string,
): 'camera' | 'drone' | undefined {
  return assets.find((a) => a.id === id)?.type;
}

function StreamIcon({
  type,
  active,
}: {
  type: 'camera' | 'drone' | undefined;
  active: boolean;
}) {
  const className = active ? 'text-accent-info' : 'text-slate-10';
  if (type === 'drone') {
    return <Plane size={11} className={className} aria-hidden="true" />;
  }
  return <Camera size={11} className={className} aria-hidden="true" />;
}

interface CameraTabItemProps {
  tab: CameraFeedTab;
  tabIndex: number;
  tabs: CameraFeedTab[];
  isActive: boolean;
  cameraLabelById: Record<string, string>;
  availableAssets: PickerAsset[];
  pinnedCameraIds: Set<string>;
  closeTabLabel: (name: string) => string;
  emptySlotLabel: string;
  onActivate: (index: number) => void;
  onClose: (index: number) => void;
  onAddToTab: (tabIndex: number, deviceId: string) => void;
  onMergeTab: (sourceTabIndex: number, targetTabIndex: number) => void;
  onUnpinFeed: (deviceId: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, index: number) => void;
  tabRef: (node: HTMLDivElement | null) => void;
}

function CameraTabItem({
  tab,
  tabIndex,
  tabs,
  isActive,
  cameraLabelById,
  availableAssets,
  pinnedCameraIds,
  closeTabLabel,
  emptySlotLabel,
  onActivate,
  onClose,
  onAddToTab,
  onMergeTab,
  onUnpinFeed,
  onKeyDown,
  tabRef,
}: CameraTabItemProps) {
  const canDragTab = tabs.length > 1;

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: VIDEO_TAB_DRAG_TYPE,
      item: { sourceTabIndex: tabIndex } satisfies VideoTabDragItem,
      canDrag: canDragTab,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [canDragTab, tabIndex],
  );

  const [{ isOver, canDrop }, dropRef] = useDrop(
    () => ({
      accept: [DEVICE_CAMERA_DRAG_TYPE, VIDEO_TAB_DRAG_TYPE],
      canDrop: (item) => {
        if (isVideoTabDragItem(item)) {
          return canMergeTabs(tabs, item.sourceTabIndex, tabIndex);
        }
        return !pinnedCameraIds.has((item as DeviceCameraDragItem).cameraId);
      },
      drop: (item) => {
        if (isVideoTabDragItem(item)) {
          onMergeTab(item.sourceTabIndex, tabIndex);
          return;
        }
        onAddToTab(tabIndex, (item as DeviceCameraDragItem).cameraId);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [onAddToTab, onMergeTab, pinnedCameraIds, tabIndex, tabs],
  );

  const mergeRef = useCallback(
    (node: HTMLDivElement | null) => {
      tabRef(node);
      dragRef(dropRef(node));
    },
    [dragRef, dropRef, tabRef],
  );

  const isSplit = tab.feeds.length > 1;
  const showDropAccent = isOver && canDrop;
  const tabDragClass = canDragTab ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer';

  if (isSplit) {
    return (
      <div
        ref={mergeRef}
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        onClick={() => onActivate(tabIndex)}
        onKeyDown={(e) => onKeyDown(e, tabIndex)}
        style={isDragging ? { opacity: 0.45 } : undefined}
        className={`group relative flex h-full min-w-0 shrink-0 items-center gap-1 border-e border-[var(--gridblock-border)] px-1.5 transition-colors duration-150 ease-out outline-none focus-visible:bg-state-hover-strong ${tabDragClass} ${
          isActive
            ? 'bg-state-selected text-slate-12'
            : 'text-slate-10 hover:bg-state-hover hover:text-slate-12'
        } ${showDropAccent ? 'shadow-[inset_0_0_0_2px_color-mix(in_oklch,var(--accent-info)_55%,transparent)]' : ''}`}
        data-active={isActive ? 'true' : undefined}
      >
        {tab.feeds.map((feed, feedIndex) => {
          const label = feed.cameraId
            ? cameraLabelById[feed.cameraId] ?? feed.cameraId
            : emptySlotLabel;
          const deviceType = assetTypeById(availableAssets, feed.cameraId);

          return (
            <div
              key={feed.cameraId || feedIndex}
              className="flex max-w-[120px] min-w-0 items-center gap-1 border border-border-default bg-state-selected px-1.5 py-1 text-[11px] font-medium leading-none text-slate-12"
            >
              <StreamIcon type={deviceType} active={false} />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <button
                type="button"
                tabIndex={-1}
                aria-label={closeTabLabel(label)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (feed.cameraId) onUnpinFeed(feed.cameraId);
                }}
                className="flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center text-slate-10 transition-colors duration-150 ease-out hover:bg-state-hover-strong hover:text-slate-12"
              >
                <X size={9} />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  const focalFeed = tab.feeds[tab.activeFeedIndex] ?? tab.feeds[0];
  const label = focalFeed?.cameraId
    ? cameraLabelById[focalFeed.cameraId] ?? focalFeed.cameraId
    : emptySlotLabel;
  const deviceType = focalFeed?.cameraId
    ? assetTypeById(availableAssets, focalFeed.cameraId)
    : undefined;

  return (
    <div
      ref={mergeRef}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onActivate(tabIndex)}
      onKeyDown={(e) => onKeyDown(e, tabIndex)}
      style={isDragging ? { opacity: 0.45 } : undefined}
      className={`group relative flex h-full min-w-[64px] max-w-[160px] shrink-0 items-center gap-1 border-e border-[var(--gridblock-border)] px-2 text-[11px] font-medium leading-none transition-colors duration-150 ease-out outline-none focus-visible:bg-state-hover-strong ${tabDragClass} ${
        isActive
          ? 'bg-state-selected text-slate-12'
          : 'text-slate-10 hover:bg-state-hover hover:text-slate-12'
      } ${showDropAccent ? 'shadow-[inset_0_0_0_2px_color-mix(in_oklch,var(--accent-info)_55%,transparent)]' : ''}`}
      data-active={isActive ? 'true' : undefined}
    >
      <StreamIcon type={deviceType} active={isActive} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <button
        type="button"
        tabIndex={-1}
        aria-label={closeTabLabel(label)}
        onClick={(e) => {
          e.stopPropagation();
          onClose(tabIndex);
        }}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-slate-10 opacity-0 transition-opacity duration-100 hover:bg-state-hover-strong hover:text-slate-12 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <X size={10} />
      </button>
    </div>
  );
}

export function CameraTabStrip({
  tabs,
  cameraLabelById,
  activeTabIndex,
  onActivate,
  onClose,
  onAddToTab,
  onMergeTab,
  onUnpinFeed,
  availableAssets,
  pinnedCameraIds,
  onPin,
  canPinMore,
}: CameraTabStripProps) {
  const t = useStrings().gridblock.cameraTabs;
  const isRtl = useIsRtl();
  const tabRefs = useRef<Array<HTMLDivElement | null>>([]);

  const focusTab = (index: number) => {
    const node = tabRefs.current[index];
    if (node) {
      node.focus();
      onActivate(index);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, i: number) => {
    const last = tabs.length - 1;
    const tab = tabs[i];
    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault();
        const next = isRtl ? i - 1 : i + 1;
        if (next < 0) focusTab(last);
        else if (next > last) focusTab(0);
        else focusTab(next);
        return;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        const next = isRtl ? i + 1 : i - 1;
        if (next < 0) focusTab(last);
        else if (next > last) focusTab(0);
        else focusTab(next);
        return;
      }
      case 'Home':
        event.preventDefault();
        focusTab(0);
        return;
      case 'End':
        event.preventDefault();
        focusTab(last);
        return;
      case 'Delete':
      case 'Backspace': {
        event.preventDefault();
        if (tab.feeds.length > 1) {
          const activeFeed = tab.feeds[tab.activeFeedIndex] ?? tab.feeds[0];
          if (activeFeed?.cameraId) onUnpinFeed(activeFeed.cameraId);
        } else {
          onClose(i);
        }
        return;
      }
      default:
        return;
    }
  };

  return (
    <div
      role="tablist"
      aria-label={t.tablistAriaLabel}
      aria-orientation="horizontal"
      className="flex h-full min-w-0 flex-1 items-stretch overflow-x-auto"
    >
      {tabs.map((tab, i) => (
        <CameraTabItem
          key={tab.id}
          tab={tab}
          tabIndex={i}
          tabs={tabs}
          isActive={i === activeTabIndex}
          cameraLabelById={cameraLabelById}
          availableAssets={availableAssets}
          pinnedCameraIds={pinnedCameraIds}
          closeTabLabel={t.closeTab}
          emptySlotLabel={t.emptySlot}
          onActivate={onActivate}
          onClose={onClose}
          onAddToTab={onAddToTab}
          onMergeTab={onMergeTab}
          onUnpinFeed={onUnpinFeed}
          onKeyDown={handleKeyDown}
          tabRef={(node) => {
            tabRefs.current[i] = node;
          }}
        />
      ))}
      {canPinMore ? (
        <PinTrigger
          label={t.pinTrigger}
          emptyLabel={t.pinEmpty}
          camerasLabel={t.pinSectionCameras}
          dronesLabel={t.pinSectionDrones}
          availableAssets={availableAssets}
          pinnedCameraIds={pinnedCameraIds}
          onPin={onPin}
        />
      ) : null}
    </div>
  );
}

interface PinTriggerProps {
  label: string;
  emptyLabel: string;
  camerasLabel: string;
  dronesLabel: string;
  availableAssets: PickerAsset[];
  pinnedCameraIds: Set<string>;
  onPin: (cameraId: string) => void;
}

function PinTrigger({
  label,
  emptyLabel,
  camerasLabel,
  dronesLabel,
  availableAssets,
  pinnedCameraIds,
  onPin,
}: PinTriggerProps) {
  const isRtl = useIsRtl();
  const dir: 'rtl' | 'ltr' = isRtl ? 'rtl' : 'ltr';
  const pinnable = availableAssets.filter((a) => !pinnedCameraIds.has(a.id));
  const cameras = pinnable
    .filter((a) => a.type === 'camera')
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));
  const drones = pinnable
    .filter((a) => a.type === 'drone')
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));
  const hasAny = pinnable.length > 0;

  return (
    <DropdownMenu dir={dir}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          disabled={!hasAny}
          className="flex h-full shrink-0 items-center justify-center px-2 text-slate-10 transition-colors duration-150 ease-out hover:bg-state-hover hover:text-slate-12 focus-visible:bg-state-hover-strong focus-visible:outline-none data-[state=open]:bg-state-selected data-[state=open]:text-slate-12 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="min-w-[12rem]">
        {!hasAny ? (
          <DropdownMenuLabel className="px-2 py-1 text-[11px] text-muted-foreground">
            {emptyLabel}
          </DropdownMenuLabel>
        ) : null}
        {cameras.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {camerasLabel}
            </DropdownMenuLabel>
            {cameras.map((asset) => (
              <DropdownMenuItem
                key={asset.id}
                onSelect={() => onPin(asset.id)}
                className="gap-2"
              >
                <span className="flex-1 truncate">{asset.label}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
        {cameras.length > 0 && drones.length > 0 && <DropdownMenuSeparator />}
        {drones.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {dronesLabel}
            </DropdownMenuLabel>
            {drones.map((asset) => (
              <DropdownMenuItem
                key={asset.id}
                onSelect={() => onPin(asset.id)}
                className="gap-2"
              >
                <span className="flex-1 truncate">{asset.label}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
