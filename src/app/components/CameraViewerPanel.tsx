import React, { useEffect, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useDrop } from 'react-dnd';
import { X, Plus, Camera, ChevronDown, Map, SplitSquareHorizontal } from 'lucide-react';
import { CAMERA_ASSETS } from './TacticalMap';
import { DEVICE_CAMERA_DRAG_TYPE } from './DevicesPanel';
import type { DeviceCameraDragItem } from './DevicesPanel';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/components/ui/dropdown-menu';

export interface CameraFeed {
  cameraId: string;
}

interface CameraViewerPanelProps {
  feeds: CameraFeed[];
  onFeedsChange: (feeds: CameraFeed[]) => void;
  onCameraHover?: (cameraId: string | null) => void;
}

function CameraPickerContent({
  usedIds,
  onSelect,
}: {
  usedIds: string[];
  onSelect: (id: string) => void;
}) {
  return (
    <DropdownMenuContent
      side="bottom"
      align="start"
      sideOffset={6}
      className="min-w-[180px] p-1 rounded-lg bg-[#1a1a1a]/95 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_25px_50px_-12px_rgba(0,0,0,0.5)] border-none"
    >
      {CAMERA_ASSETS.map(cam => {
        const inUse = usedIds.includes(cam.id);
        return (
          <DropdownMenuItem
            key={cam.id}
            disabled={inUse}
            className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-zinc-300 cursor-pointer hover:bg-white/10 hover:text-white transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onSelect(cam.id)}
          >
            <Camera size={14} className="shrink-0 text-zinc-400" aria-hidden="true" />
            <span className="flex-1 text-start">{cam.typeLabel}</span>
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuContent>
  );
}

function FeedSlot({
  cameraId,
  usedIds,
  onSelect,
  onHover,
  onRemove,
  onDropNew,
  autoOpenPicker,
  onAutoOpenConsumed,
}: {
  cameraId: string | null;
  usedIds: string[];
  onSelect: (id: string) => void;
  onHover?: (cameraId: string | null) => void;
  onRemove?: () => void;
  onDropNew?: (cameraId: string) => void;
  autoOpenPicker?: boolean;
  onAutoOpenConsumed?: () => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(!!autoOpenPicker);

  const [{ isOverSlot }, slotDropRef] = useDrop(() => ({
    accept: DEVICE_CAMERA_DRAG_TYPE,
    drop: (item: DeviceCameraDragItem) => {
      if (usedIds.includes(item.cameraId) && item.cameraId !== cameraId) return;
      if (cameraId && item.cameraId !== cameraId && onDropNew) {
        onDropNew(item.cameraId);
      } else {
        onSelect(item.cameraId);
      }
    },
    canDrop: (item: DeviceCameraDragItem) => !usedIds.includes(item.cameraId) || item.cameraId === cameraId,
    collect: (monitor) => ({ isOverSlot: monitor.isOver() && monitor.canDrop() }),
  }), [usedIds, cameraId, onSelect, onDropNew]);

  useEffect(() => {
    if (!autoOpenPicker) return;
    setIsPickerOpen(true);
    onAutoOpenConsumed?.();
  }, [autoOpenPicker, onAutoOpenConsumed]);

  if (!cameraId) {
    return (
      <div ref={slotDropRef} className={`flex-1 min-h-0 relative flex items-center justify-center bg-[#141414] transition-[box-shadow] duration-200 ease-out ${isOverSlot ? 'shadow-[inset_0_0_0_2px_rgba(255,255,255,0.25)]' : ''}`}>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 left-2 p-2.5 rounded text-white/30 hover:text-white hover:bg-red-500/30 transition-colors duration-150 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none z-10"
            title="הסר"
            aria-label="הסר חלון"
          >
            <X size={12} />
          </button>
        )}
        <DropdownMenu open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-md
                         border border-dashed border-white/10
                         cursor-pointer hover:border-white/20 hover:bg-white/[0.04]
                         transition-colors duration-150
                         focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
            >
              <Plus size={14} className="text-white/40 shrink-0" aria-hidden="true" />
              <span className="text-xs text-white/50">בחר תוכן</span>
              <ChevronDown size={12} className="text-white/30 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="bottom"
            align="center"
            sideOffset={6}
            className="min-w-[180px] p-1 rounded-lg bg-[#1a1a1a]/95 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_25px_50px_-12px_rgba(0,0,0,0.5)] border-none"
          >
            {CAMERA_ASSETS.map(cam => {
              const inUse = usedIds.includes(cam.id);
              return (
                <DropdownMenuItem
                  key={cam.id}
                  disabled={inUse}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-zinc-300 cursor-pointer hover:bg-white/10 hover:text-white transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => onSelect(cam.id)}
                >
                  <Camera size={14} className="shrink-0 text-zinc-400" aria-hidden="true" />
                  <span className="flex-1 text-start">{cam.typeLabel}</span>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuItem
              disabled
              className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-zinc-300 cursor-pointer hover:bg-white/10 hover:text-white transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Map size={14} className="shrink-0 text-zinc-400" aria-hidden="true" />
              <span className="flex-1 text-start">מפה</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  const asset = CAMERA_ASSETS.find(c => c.id === cameraId);
  const label = asset?.typeLabel ?? cameraId;

  return (
    <div
      ref={slotDropRef}
      className={`flex-1 min-h-0 relative bg-black overflow-hidden group/feed transition-[box-shadow] duration-200 ease-out ${isOverSlot ? 'shadow-[inset_0_0_0_2px_rgba(255,255,255,0.25)]' : ''}`}
      onMouseEnter={() => onHover?.(cameraId)}
      onMouseLeave={() => onHover?.(null)}
    >
      <video
        src="/videos/target-feed.mov"
        autoPlay
        loop
        muted
        playsInline
        draggable={false}
        className="w-full h-full object-cover pointer-events-none"
      >
        <track kind="captions" />
      </video>
      {/* Transparent layer to capture drag events over the video */}
      <div className="absolute inset-0" />

      {/* Top overlay: always-visible badges + hover controls */}
      <div className="absolute inset-x-0 top-0">
        <div className="h-16 bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover/feed:opacity-100 transition-opacity duration-200 ease-out" />

        <div className="absolute top-0 inset-x-0 px-2.5 pt-2 flex items-center gap-1.5">
          {/* Always-visible: LIVE badge */}
          <div className="flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded-sm">
            <div className="size-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" />
            <span className="text-[9px] font-medium text-white/80 uppercase tracking-wide">Live</span>
          </div>

          <div className="flex-1" />

          {/* Hover-only: camera picker + remove */}
          <div className={`transition-opacity duration-200 ease-out ${
            isPickerOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 group-hover/feed:opacity-100 pointer-events-none group-hover/feed:pointer-events-auto'
          }`}>
            <div className="flex items-center gap-1">
              <DropdownMenu onOpenChange={setIsPickerOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors duration-150 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
                  >
                    <span className="text-[10px] font-medium text-white/90 truncate max-w-[100px]">{label}</span>
                    <ChevronDown size={10} className="text-white/60 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <CameraPickerContent usedIds={usedIds} onSelect={onSelect} />
              </DropdownMenu>

              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="relative p-2 rounded text-white/40 hover:text-white hover:bg-red-500/30 transition-colors duration-150 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none before:absolute before:inset-[-4px] before:content-['']"
                  title="הסר מצלמה"
                  aria-label="הסר מצלמה"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CameraViewerPanel({ feeds, onFeedsChange, onCameraHover }: CameraViewerPanelProps) {
  const MAX_FEEDS = 4;
  const canAddMore = feeds.length < MAX_FEEDS;
  const usedIds = feeds.map(f => f.cameraId);
  const [autoOpenSlot, setAutoOpenSlot] = useState<number | null>(null);
  const [addCamHovered, setAddCamHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleSelectCamera = (slotIndex: number) => (cameraId: string) => {
    const next = [...feeds];
    if (slotIndex < next.length) {
      next[slotIndex] = { cameraId };
    } else {
      next.push({ cameraId });
    }
    onFeedsChange(next);
  };

  const handleRemoveFeed = useCallback((index: number) => () => {
    onCameraHover?.(null);
    if (feeds.length <= 1) {
      onFeedsChange([]);
    } else {
      onFeedsChange(feeds.filter((_, i) => i !== index));
    }
  }, [feeds, onFeedsChange, onCameraHover]);

  const handleAddFeed = useCallback(() => {
    if (feeds.length >= MAX_FEEDS) return;
    const newIndex = feeds.length;
    onFeedsChange([...feeds, { cameraId: '' }]);
    setAutoOpenSlot(newIndex);
  }, [feeds, onFeedsChange]);

  const handleDropNewFeed = useCallback((newCameraId: string) => {
    if (feeds.length >= MAX_FEEDS) return;
    onFeedsChange([...feeds, { cameraId: newCameraId }]);
  }, [feeds, onFeedsChange]);

  const handleAutoOpenConsumed = useCallback(() => {
    setAutoOpenSlot(null);
  }, []);

  const [{ isOverPanel }, panelDropRef] = useDrop(() => ({
    accept: DEVICE_CAMERA_DRAG_TYPE,
    drop: (item: DeviceCameraDragItem, monitor) => {
      if (monitor.didDrop()) return;
      const alreadyUsed = feeds.some(f => f.cameraId === item.cameraId);
      if (alreadyUsed) return;
      if (feeds.length < MAX_FEEDS) {
        onFeedsChange([...feeds, { cameraId: item.cameraId }]);
      } else {
        const emptySlot = feeds.findIndex(f => !f.cameraId);
        if (emptySlot >= 0) {
          const next = [...feeds];
          next[emptySlot] = { cameraId: item.cameraId };
          onFeedsChange(next);
        }
      }
    },
    canDrop: (item: DeviceCameraDragItem) => !feeds.some(f => f.cameraId === item.cameraId),
    collect: (monitor) => ({ isOverPanel: monitor.isOver({ shallow: true }) && monitor.canDrop() }),
  }), [feeds, onFeedsChange]);

  return (
    <div ref={panelDropRef} className={`h-full flex flex-col bg-[#0a0a0a] relative ${isOverPanel ? 'ring-2 ring-inset ring-white/20' : ''}`}>
      {/* Feed area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {feeds.map((feed, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="h-px bg-white/10 shrink-0" />}
            <FeedSlot
              cameraId={feed.cameraId || null}
              usedIds={usedIds}
              onSelect={handleSelectCamera(i)}
              onHover={onCameraHover}
              onRemove={handleRemoveFeed(i)}
              onDropNew={canAddMore ? handleDropNewFeed : undefined}
              autoOpenPicker={autoOpenSlot === i}
              onAutoOpenConsumed={handleAutoOpenConsumed}
            />
          </React.Fragment>
        ))}
      </div>

      {/* "Split screen" — overlays bottom edge, slides up on hover */}
      {canAddMore && (
        <div
          className="absolute bottom-0 inset-x-0 h-10 z-10 overflow-hidden"
          onMouseEnter={() => setAddCamHovered(true)}
          onMouseLeave={() => setAddCamHovered(false)}
        >
          <motion.button
            type="button"
            animate={addCamHovered
              ? { y: 0, opacity: 1 }
              : { y: shouldReduceMotion ? 0 : '100%', opacity: 0 }}
            transition={shouldReduceMotion
              ? { duration: 0.15 }
              : { type: 'spring', duration: 0.35, bounce: 0.1 }}
            className="absolute inset-0 flex items-center justify-center gap-1.5
                       bg-[#0a0a0a]/90 backdrop-blur-sm
                       border-t border-dashed border-white/[0.08]
                       cursor-pointer hover:bg-[#0a0a0a]
                       focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
            onFocus={() => setAddCamHovered(true)}
            onBlur={() => setAddCamHovered(false)}
            onClick={handleAddFeed}
            aria-label="פצל מסך"
          >
            <SplitSquareHorizontal size={14} className="text-white" />
            <span className="text-xs text-white">פצל מסך</span>
          </motion.button>
        </div>
      )}
    </div>
  );
}
