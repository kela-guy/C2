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
  Crosshair,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  Moon,
  ScanSearch,
  Search,
  Sparkles,
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
          className={`p-2 transition-colors duration-150 ease-out
            focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none
            disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]
            ${active
              ? 'bg-white/15 text-white ring-1 ring-inset ring-white/20'
              : 'text-white/80 hover:text-white hover:bg-white/10'}`}
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
  disabled?: boolean;
  onChange: (next: number) => void;
}

/**
 * YouTube-volume-style zoom control. Collapsed = single icon button matching
 * the ControlButton chrome. Hover or focus reveals a vertical slider above
 * the icon. Three layered defences keep the cursor from falling into a
 * deadzone between the icon and the slider:
 *
 *   1. The icon button + popover share a single hover container, so hover is
 *      held as long as the cursor is over either child.
 *   2. A transparent bridge between the popover bottom and the icon top
 *      keeps the hit-test continuous even when the popover is offset.
 *   3. A `ZOOM_HOVER_CLOSE_DELAY_MS` grace timeout on close lets a brief
 *      flicker out of the hover region (e.g. crossing the gap diagonally)
 *      re-enter without the popover snapping shut.
 *
 * No tooltip wrapper here - the popover IS the affordance.
 */
function ZoomControl({ zoom, disabled, onChange }: ZoomControlProps) {
  const [open, setOpen] = useState(false);
  // Tracked across mouse + focus events; cleared on unmount so a delayed
  // setState can't fire on a dead component (mirrors the pattern in
  // useCuasTour's notifyTimeoutsRef).
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
      <button
        type="button"
        aria-label={`Zoom (${fmtZoom(zoom)})`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none active:scale-[0.97]"
      >
        <Search size={14} aria-hidden="true" />
        <span
          aria-hidden="true"
          className="font-mono text-[10px] tabular-nums text-amber-100/95 leading-none min-w-[26px] text-start"
        >
          {fmtZoom(zoom)}
        </span>
      </button>

      <div
        id={popoverId}
        role="group"
        aria-label="Zoom level"
        aria-hidden={!open}
        className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-1 origin-bottom z-30
          transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none
          ${open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        {/*
          Hover bridge: a transparent strip that overlaps the gap between
          the popover and the icon button so the cursor keeps registering
          hover while travelling between them.
        */}
        <div
          aria-hidden="true"
          className="absolute -bottom-2 -left-1 -right-1 h-3 pointer-events-auto"
        />

        <div className="flex flex-col items-center gap-1.5 bg-black/75 backdrop-blur-sm ring-1 ring-inset ring-white/10 px-1.5 py-2">
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            value={zoom}
            disabled={disabled}
            onChange={(e) => onChange(clampZoom(parseFloat(e.target.value)))}
            aria-label="Zoom level"
            // Modern vertical-slider syntax: writing-mode flips the layout
            // axis, direction:rtl puts min at the bottom and max at the
            // top. Supported in Chrome 124+, Safari 17.4+, Firefox 113+.
            // No rotate() hack required, so hit-target stays correct.
            // Note: this `direction: 'rtl'` is a *vertical-slider trick*,
            // not bidi text direction — leave it hard-coded regardless of
            // the app's writing direction.
            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
            className="w-7 h-28 accent-amber-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="font-mono text-[10px] tabular-nums text-amber-100 min-w-[28px] text-center">
            {fmtZoom(zoom)}
          </span>
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
    tone = 'text-amber-200 bg-amber-500/15 ring-1 ring-inset ring-amber-300/40';
  } else if (ownsControl) {
    label = t.releaseControl;
    icon = <LockOpen size={14} aria-hidden="true" />;
    tone = 'text-emerald-200 bg-emerald-500/20 ring-1 ring-inset ring-emerald-400/40 hover:bg-emerald-500/30';
  } else if (lockedByOther) {
    label = t.lockedByOperator(status.controlOwnerName ?? t.lockedByOtherOperator);
    icon = <Lock size={14} aria-hidden="true" />;
    tone = 'text-zinc-300 bg-zinc-800/70 ring-1 ring-inset ring-zinc-500/40';
  } else {
    label = t.takeControl;
    icon = <Lock size={14} aria-hidden="true" />;
    tone = 'text-white/90 hover:text-white hover:bg-white/10';
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
            focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none
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

function AiScanIcon({ active }: { active: boolean }) {
  return (
    <span className="relative inline-flex">
      <ScanSearch size={14} className={active ? 'text-emerald-300' : ''} />
      <Sparkles
        size={8}
        className={`absolute -top-1 -end-1 ${active ? 'text-emerald-200' : 'text-white/55'}`}
      />
    </span>
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
          <ControlButton
            label={detectionsOn ? t.hideAiDetections : t.showAiDetections}
            onClick={onDetectionsToggle}
            active={detectionsOn}
          >
            <AiScanIcon active={detectionsOn} />
          </ControlButton>
          <ControlButton
            label={designateMode ? t.cancelDesignate : t.designateTarget}
            shortcut="X"
            onClick={onDesignateModeToggle}
            active={designateMode}
          >
            <Crosshair size={14} className={designateMode ? 'text-amber-300' : ''} />
          </ControlButton>
          <ZoomControl zoom={zoom} disabled={writeDisabled} onChange={onZoomChange} />
        </div>

        <div className="flex items-center gap-1">
          <CameraSettingsMenu
            open={settingsOpen}
            onOpenChange={onSettingsOpenChange}
            status={status}
            mode={mode}
            detectionsOn={detectionsOn}
            playbackEnabled={playbackEnabled}
            onModeToggle={onModeToggle}
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
