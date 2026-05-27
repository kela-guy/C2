/**
 * Hover/focus-revealed bottom control bar.
 *
 * Anatomy (physical left -> right, fixed regardless of app direction):
 *   [Lock (take/release)] [Day/Night] [AI scan] [Designate target] [Zoom]   [Settings] [Fullscreen]
 *
 * The bar is pinned to LTR via `<DirIsland direction="ltr">` so primary
 * controls always sit on the physical left edge and Settings/Fullscreen
 * always sit on the physical right edge. Operators learn the spatial
 * layout once; mirroring it in RTL would undermine recall during
 * high-stakes operations — the same convention the rest of the camera
 * HUD chrome uses (PlaybackTimeline, CameraTelemetryStrip, DroneHud,
 * Live/Playback badges).
 *
 * No labels on buttons; tooltips carry state + keyboard shortcuts (the
 * Hebrew tooltip labels still render correctly inside the LTR island —
 * `<DirIsland>` only repositions chrome, not text content). Zoom is a
 * YouTube-volume-style icon that reveals a vertical slider on hover/focus
 * (no tooltip on the trigger so the popover wins). Switch device dropdown
 * was removed in favour of the PIN flow on device cards.
 */

import { useCallback, useEffect, useId, useRef, useState, type FocusEvent } from 'react';
import {
  DesignateTarget,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  Moon,
  Search,
  Sun,
} from '@/lib/icons/central';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { DirIsland } from '@/lib/direction';
import { useStrings } from '@/lib/intl';
import { CameraSettingsMenu } from './CameraSettingsMenu';
import type { CameraStatus, DayNightMode } from './types';

interface CameraControlBarProps {
  visible: boolean;
  mode: DayNightMode;
  status: CameraStatus;
  detectionsOn: boolean;
  designateMode: boolean;
  isFullscreen: boolean;
  settingsOpen: boolean;
  playbackEnabled: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  onTakeRelease: () => void;
  onModeToggle: () => void;
  onDetectionsToggle: () => void;
  onDesignateModeToggle: () => void;
  onFullscreenToggle: () => void;
  onPlaybackToggle: () => void;
  onZoomChange: (next: number) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 30;
// Grace delay before the zoom popover collapses on mouse-leave / blur. Long
// enough that a user moving the cursor between the icon and the slider thumb
// can't accidentally fall into a deadzone, short enough that the popover
// doesn't linger after they've clearly moved on.
const ZOOM_HOVER_CLOSE_DELAY_MS = 200;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 10) / 10));
}

function fmtZoom(z: number): string {
  return `${z.toFixed(1)}x`;
}

function ControlButton({
  label,
  shortcut,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active ?? undefined}
          className={`flex flex-col items-center justify-center h-[30px] p-2 transition-colors duration-150 ease-out
            focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-border-strong
            disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]
            ${active
              ? 'bg-state-selected text-slate-12 ring-[1px] ring-inset ring-border-default'
              : 'text-slate-12/80 hover:text-slate-12 hover:bg-state-hover-strong'}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="rounded-none text-[10px]">
        {shortcut ? `${label} (${shortcut})` : label}
      </TooltipContent>
    </Tooltip>
  );
}

interface ZoomControlProps {
  zoom: number;
  mode: DayNightMode;
  disabled?: boolean;
  onChange: (next: number) => void;
}

/**
 * YouTube-volume-style zoom control. Collapsed = round icon trigger only.
 * Hover or focus expands a single horizontal pill: icon + inline range
 * slider (same container, no vertical popover). A
 * `ZOOM_HOVER_CLOSE_DELAY_MS` grace timeout prevents snap-shut when the
 * pointer briefly leaves the pill.
 *
 * No tooltip wrapper here - the expanded pill IS the affordance.
 */
function ZoomControl({ zoom, mode, disabled, onChange }: ZoomControlProps) {
  const [open, setOpen] = useState(false);
  // Tracked across mouse + focus events; cleared on unmount so a delayed
  // setState can't fire on a dead component.
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, ZOOM_HOVER_CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleBlurCapture = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      // Only schedule close when focus is leaving the wrapper entirely, not
      // when it's just hopping from the trigger to the slider inside it.
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        scheduleClose();
      }
    },
    [scheduleClose],
  );

  const sensorLabel = mode === 'day' ? 'EO' : 'IR';

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocusCapture={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlurCapture={handleBlurCapture}
    >
      <div
        className={`flex h-9 items-center overflow-hidden rounded-full bg-surface-3/90 ring-[1px] ring-inset ring-border-default backdrop-blur-sm transition-[gap,padding] duration-150 ease-out motion-reduce:transition-none
          ${open ? 'gap-2 pl-1 pr-3' : 'w-9'}`}
      >
        <button
          type="button"
          aria-label={`Zoom (${fmtZoom(zoom)}, ${sensorLabel})`}
          aria-expanded={open}
          aria-controls={popoverId}
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-12 transition-colors duration-150 ease-out hover:bg-state-hover-strong focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-border-strong active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search size={14} aria-hidden="true" />
        </button>

        <div
          id={popoverId}
          role="group"
          aria-label="Zoom level"
          aria-hidden={!open}
          className={`flex items-center overflow-hidden transition-[width,opacity] duration-150 ease-out motion-reduce:transition-none
            ${open
              ? 'w-[96px] opacity-100'
              : 'w-0 opacity-0 pointer-events-none'}`}
        >
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            value={zoom}
            disabled={disabled}
            onChange={(e) => onChange(clampZoom(parseFloat(e.target.value)))}
            aria-label="Zoom level"
            className="h-1 w-[96px] shrink-0 cursor-pointer appearance-none rounded-full bg-slate-9/80 accent-slate-12 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-12"
          />
        </div>
      </div>
    </div>
  );
}

function LockButton({ status, onClick }: { status: CameraStatus; onClick: () => void }) {
  const t = useStrings().camera.controlBar;
  const ownsControl = status.controlOwner === 'self';
  const lockedByOther = status.controlOwner === 'other';
  const requestPending = !!status.controlRequestPending;

  let label: string;
  let icon: React.ReactNode;
  let tone: string;
  if (requestPending) {
    label = status.controlRequestCountdown != null
      ? t.requestingControlCountdown(status.controlRequestCountdown)
      : t.requestingControl;
    icon = <Lock size={14} className="animate-pulse motion-reduce:animate-none" aria-hidden="true" />;
    tone = 'text-accent-warning bg-accent-warning/15 ring-1 ring-inset ring-accent-warning/40';
  } else if (ownsControl) {
    label = t.releaseControl;
    icon = <LockOpen size={14} aria-hidden="true" />;
    tone = 'text-accent-success bg-accent-success/20 ring-1 ring-inset ring-accent-success/40 hover:bg-accent-success/30';
  } else if (lockedByOther) {
    label = t.lockedByOperator(status.controlOwnerName ?? t.lockedByOtherOperator);
    icon = <Lock size={14} aria-hidden="true" />;
    tone = 'text-slate-11 bg-surface-3/70 ring-1 ring-inset ring-slate-9/40';
  } else {
    label = t.takeControl;
    icon = <Lock size={14} aria-hidden="true" />;
    tone = 'text-slate-12/90 hover:text-slate-12 hover:bg-state-hover-strong';
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={lockedByOther || requestPending}
          aria-label={label}
          aria-pressed={ownsControl}
          className={`p-2 transition-colors duration-150 ease-out
            focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-border-strong
            disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]
            ${tone}`}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="rounded-none text-[10px]">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function CameraControlBar({
  visible,
  mode,
  status,
  detectionsOn,
  designateMode,
  isFullscreen,
  settingsOpen,
  playbackEnabled,
  onSettingsOpenChange,
  onTakeRelease,
  onModeToggle,
  onDetectionsToggle,
  onDesignateModeToggle,
  onFullscreenToggle,
  onPlaybackToggle,
  onZoomChange,
}: CameraControlBarProps) {
  const t = useStrings().camera.controlBar;
  const writeDisabled = status.controlOwner === 'other';
  const zoom = status.zoomLevel ?? 1;

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-200 ease-out
        ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!visible}
    >
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 via-black/35 to-transparent pointer-events-none" />

      {/*
        Bar is pinned to LTR so the primary cluster (lock, day/night, AI,
        designate, zoom) always sits on the physical left and the
        secondary cluster (Settings, Fullscreen) always sits on the
        physical right — operators learn the spatial layout once and
        rely on it across both reading directions. Inner `dir`-sensitive
        subtrees (zoom popover slider direction trick, PlaybackTimeline)
        handle their own direction explicitly.
      */}
      <DirIsland
        direction="ltr"
        className="relative flex items-center justify-between gap-1 px-2 pb-2 pt-1"
      >
        <div className="flex items-center gap-1">
          <LockButton status={status} onClick={onTakeRelease} />
          <ControlButton
            label={mode === 'day' ? t.switchToNight : t.switchToDay}
            shortcut="D"
            onClick={onModeToggle}
            disabled={writeDisabled}
          >
            {mode === 'day' ? <Moon size={14} /> : <Sun size={14} />}
          </ControlButton>
          {/*
            AI-detections toggle intentionally lives only on the Settings
            popover (and the right-click context menu) now. It used to be
            duplicated here on the control bar, but that made the bar
            feel cluttered and the Settings affordance is well-discovered
            (the gear is the second-to-last icon on every tile). The
            `onDetectionsToggle` prop is still threaded through so the
            popover and context menu can fire it.
          */}
          <ControlButton
            label={designateMode ? t.cancelDesignate : t.designateTarget}
            shortcut="X"
            onClick={onDesignateModeToggle}
            active={designateMode}
          >
            <DesignateTarget size={14} className={designateMode ? 'text-accent-warning' : ''} />
          </ControlButton>
          <ZoomControl
            zoom={zoom}
            mode={mode}
            disabled={writeDisabled}
            onChange={onZoomChange}
          />
        </div>

        <div className="flex items-center gap-1">
          <CameraSettingsMenu
            open={settingsOpen}
            onOpenChange={onSettingsOpenChange}
            detectionsOn={detectionsOn}
            playbackEnabled={playbackEnabled}
            onDetectionsToggle={onDetectionsToggle}
            onPlaybackToggle={onPlaybackToggle}
          />
          <ControlButton
            label={isFullscreen ? t.exitFullscreen : t.enterFullscreen}
            shortcut={isFullscreen ? 'F/Esc' : 'F'}
            onClick={onFullscreenToggle}
            active={isFullscreen}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </ControlButton>
        </div>
      </DirIsland>
    </div>
  );
}
