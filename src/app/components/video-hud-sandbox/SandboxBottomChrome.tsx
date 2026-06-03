import { useCallback, useEffect, useId, useRef, useState, type FocusEvent } from 'react';
import {
  TakeControl,
  LockOpen,
  Maximize2,
  Minimize2,
  Moon,
  Zoom,
  Sun,
} from '@/lib/icons/central';
import type { CameraStatus, DayNightMode, FeedDeviceType } from '@/app/components/camera-v2/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { DirIsland } from '@/lib/direction';
import { useStrings } from '@/lib/intl';
import {
  CameraSettingsMenu,
  type CameraAngle,
} from '@/app/components/camera-v2/CameraSettingsMenu';

const MIN_ZOOM = 1;
const MAX_ZOOM = 30;
const ZOOM_HOVER_CLOSE_DELAY_MS = 200;
const BOTTOM_ICON_SIZE = 16;
const DAY_NIGHT_ICON_SIZE = 12;

const CHROME_PILL =
  'rounded-full border border-border-default/45 bg-black/25 backdrop-blur-sm';

// Luminous white text-shadow from the Figma spec. No palette token exists
// for a glow text-shadow, so the rgba literal is kept inline (sandbox only).
const DOCK_STOP_TEXT_GLOW = '[text-shadow:0_4px_24px_rgba(255,255,255,0.55)]';

function DockGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M13.6409 1.18815L13.7192 4.44135L14.4518 4.81672L14.6176 5.52909C14.8468 6.51427 14.2527 7.50847 13.272 7.76107L11.316 8.265L12.3906 10.2885L9.57159 11.034L6.65013 9.46293L3.29606 10.2543C2.65793 10.4048 1.99493 10.1482 1.6212 9.61013C1.1804 8.97567 1.25206 8.11473 1.79293 7.56273L2.86946 6.46402C3.1068 6.22183 3.404 6.04919 3.73413 5.9653C4.84413 5.68323 8.18313 4.83344 9.59077 4.46116C9.84308 4.39443 10.0532 4.21685 10.1629 3.97306L11.1158 1.85599L13.6409 1.18815Z"
        fill="currentColor"
      />
      <path
        d="M14.6666 12.3335V13.3335H1.33327V12.3335H14.6666Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CornerBrackets() {
  const corner = 'pointer-events-none absolute size-1.5 border-slate-12/80';
  return (
    <span aria-hidden>
      <span className={`${corner} left-0 top-0 border-l border-t`} />
      <span className={`${corner} right-0 top-0 border-r border-t`} />
      <span className={`${corner} bottom-0 left-0 border-b border-l`} />
      <span className={`${corner} bottom-0 right-0 border-b border-r`} />
    </span>
  );
}

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 10) / 10));
}

function fmtZoom(z: number): string {
  return `${clampZoom(z).toFixed(1)}x`;
}

interface SandboxBottomChromeProps {
  mode: DayNightMode;
  onModeToggle: () => void;
  zoomLevel: number;
  onZoomChange: (next: number) => void;
  deviceType: FeedDeviceType;
  controlOwner: CameraStatus['controlOwner'];
  onTakeRelease: () => void;
  detectionsOn: boolean;
  playbackOn: boolean;
  onDetectionsToggle: () => void;
  onPlaybackToggle: () => void;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  dockArmed: boolean;
  stopArmed: boolean;
  onDockToggle: () => void;
  onStopToggle: () => void;
  videoHovered?: boolean;
  mutedAlerts?: boolean;
  onMutedAlertsToggle?: () => void;
  deviceKind?: 'camera' | 'drone' | 'pathfinder';
  cameraAngle?: CameraAngle;
  onCameraAngleChange?: (angle: CameraAngle) => void;
  onAutoTrackStart?: () => void;
  settingsLabelOverrides?: {
    playbackLabel?: string;
    displaySection?: string;
    aiDetectionsLabel?: string;
  };
  alertsAsSwitch?: boolean;
  showAutoTrackItem?: boolean;
}

export function SandboxBottomChrome({
  mode,
  onModeToggle,
  zoomLevel,
  onZoomChange,
  deviceType,
  controlOwner,
  onTakeRelease,
  detectionsOn,
  playbackOn,
  onDetectionsToggle,
  onPlaybackToggle,
  settingsOpen,
  onSettingsOpenChange,
  isFullscreen,
  onFullscreenToggle,
  dockArmed,
  stopArmed,
  onDockToggle,
  onStopToggle,
  videoHovered = false,
  mutedAlerts,
  onMutedAlertsToggle,
  deviceKind,
  cameraAngle,
  onCameraAngleChange,
  onAutoTrackStart,
  settingsLabelOverrides,
  alertsAsSwitch,
  showAutoTrackItem,
}: SandboxBottomChromeProps) {
  const t = useStrings();
  const isDrone = deviceType === 'drone';
  const dockStopVisible = videoHovered || dockArmed || stopArmed;
  const owned = controlOwner === 'self';
  const takeReleaseLabel = (
    owned ? t.camera.controlBar.releaseControl : t.camera.controlBar.takeControl
  ).replace(/\s*\([^)]*\)\s*$/, '');
  const TakeReleaseIcon = owned ? LockOpen : TakeControl;
  const fullscreenLabel = isFullscreen ? 'Exit fullscreen' : 'Fullscreen';
  const FullscreenIcon = isFullscreen ? Minimize2 : Maximize2;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 pointer-events-none">
      <DirIsland direction="ltr" className="relative h-[96px]">
        <div className="absolute inset-x-3 top-8 h-1 rounded-full bg-slate-12/70">
          <div className="h-full w-[18%] rounded-full bg-slate-12" />
          <div className="absolute left-[18%] top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-info" />
        </div>

        {isDrone && (
          <div
            className={`absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-3 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
              dockStopVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-1 pointer-events-none'
            }`}
            aria-hidden={!dockStopVisible}
          >
            <button
              type="button"
              aria-pressed={stopArmed}
              onClick={onStopToggle}
              className={`pointer-events-auto relative inline-flex items-center justify-center gap-1.5 border border-slate-12/50 pl-2.5 pr-1.5 py-1 text-[12px] text-slate-12 backdrop-blur-sm transition-colors duration-150 focus-visible:border-slate-12 focus-visible:outline-none ${
                stopArmed
                  ? 'bg-accent-danger/30 motion-safe:animate-pulse'
                  : 'bg-accent-danger-tint hover:bg-accent-danger/25'
              }`}
            >
              <span className={DOCK_STOP_TEXT_GLOW}>עצור</span>
              <span
                className="size-3 shrink-0 rounded-[1px] bg-accent-danger"
                aria-hidden
              />
              <CornerBrackets />
            </button>
            <button
              type="button"
              aria-pressed={dockArmed}
              onClick={onDockToggle}
              className={`pointer-events-auto relative inline-flex items-center justify-center gap-1.5 border border-slate-12/50 px-1.5 py-1 text-[12px] text-slate-12 backdrop-blur-sm transition-colors duration-150 focus-visible:border-slate-12 focus-visible:outline-none ${
                dockArmed
                  ? 'bg-black/70'
                  : 'bg-black/40 hover:bg-black/60'
              }`}
            >
              <span className={DOCK_STOP_TEXT_GLOW}>חזרה לעגינה</span>
              <DockGlyph />
              <CornerBrackets />
            </button>
          </div>
        )}

        <div className="absolute inset-x-3 bottom-4 flex h-11 items-center justify-between gap-3">
          <div className="pointer-events-auto flex items-center gap-2 text-slate-12/80">
            <ControlGroup className="px-0.5">
              <ChromeTooltip label={takeReleaseLabel}>
                <button
                  type="button"
                  aria-label={takeReleaseLabel}
                  aria-pressed={owned}
                  onClick={onTakeRelease}
                  className={`flex h-8 items-center gap-1.5 rounded-full border border-transparent px-2 text-[11px] transition-colors duration-150 focus-visible:border-border-strong focus-visible:outline-none ${
                    owned
                      ? 'bg-state-selected text-slate-12'
                      : 'text-slate-12/85 hover:bg-state-hover-overlay hover:text-slate-12'
                  }`}
                >
                  <TakeReleaseIcon size={BOTTOM_ICON_SIZE} />
                  <span>{takeReleaseLabel}</span>
                </button>
              </ChromeTooltip>
            </ControlGroup>

            <SandboxZoomControl zoom={zoomLevel} onChange={onZoomChange} />
          </div>

          <ControlGroup className="pointer-events-auto shrink-0 gap-1 px-0.5 text-slate-12/80">
            <DayNightToggle mode={mode} onToggle={onModeToggle} />
            <CameraSettingsMenu
              open={settingsOpen}
              onOpenChange={onSettingsOpenChange}
              detectionsOn={detectionsOn}
              playbackEnabled={playbackOn}
              onDetectionsToggle={onDetectionsToggle}
              onPlaybackToggle={onPlaybackToggle}
              mutedAlerts={mutedAlerts}
              onMutedAlertsToggle={onMutedAlertsToggle}
              deviceKind={deviceKind}
              cameraAngle={cameraAngle}
              onCameraAngleChange={onCameraAngleChange}
              onAutoTrackStart={onAutoTrackStart}
              labelOverrides={settingsLabelOverrides}
              alertsAsSwitch={alertsAsSwitch}
              showAutoTrackItem={showAutoTrackItem}
            />
            <IconButton
              label={fullscreenLabel}
              onClick={onFullscreenToggle}
              pressed={isFullscreen}
            >
              <FullscreenIcon size={BOTTOM_ICON_SIZE} />
            </IconButton>
          </ControlGroup>
        </div>
      </DirIsland>
    </div>
  );
}

function SandboxZoomControl({
  zoom,
  onChange,
  disabled,
}: {
  zoom: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const scrubbingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sliderId = useId();
  const readoutId = useId();
  const zoomLabel = fmtZoom(zoom);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    if (scrubbingRef.current) return;
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
      if (scrubbingRef.current) return;
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        scheduleClose();
      }
    },
    [scheduleClose],
  );

  const handleScrubStart = useCallback(() => {
    cancelClose();
    scrubbingRef.current = true;
    setOpen(true);
  }, [cancelClose]);

  const handleScrubEnd = useCallback(() => {
    scrubbingRef.current = false;
    scheduleClose();
  }, [scheduleClose]);

  const handleZoomInput = useCallback(
    (value: number) => {
      onChange(clampZoom(value));
    },
    [onChange],
  );

  return (
    <div
      className="relative flex items-center py-2 -my-2"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocusCapture={() => {
        if (!disabled) {
          cancelClose();
          setOpen(true);
        }
      }}
      onBlurCapture={handleBlurCapture}
    >
      <div
        className={`flex h-9 items-center gap-0 ${CHROME_PILL} transition-[gap,padding] duration-150 ease-out motion-reduce:transition-none
          ${open ? 'overflow-visible pl-0 pr-2.5' : 'overflow-hidden pl-0 pr-2'}`}
      >
        <ChromeTooltip label={`Zoom (${zoomLabel})`}>
          <button
            type="button"
            aria-label={`Zoom (${zoomLabel})`}
            aria-expanded={open}
            aria-controls={sliderId}
            onClick={() => setOpen(true)}
            disabled={disabled}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-12/85 transition-colors duration-150 ease-out hover:bg-state-hover-overlay hover:text-slate-12 focus-visible:border-border-strong focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Zoom size={BOTTOM_ICON_SIZE} aria-hidden="true" />
          </button>
        </ChromeTooltip>

        <span
          id={readoutId}
          aria-live="polite"
          aria-atomic="true"
          className="min-w-[2.25rem] shrink-0 font-mono text-[11px] leading-none tabular-nums text-slate-12/90"
        >
          {zoomLabel}
        </span>

        <div
          id={sliderId}
          role="group"
          aria-labelledby={readoutId}
          aria-hidden={!open}
          className={`flex items-center transition-[width,opacity] duration-150 ease-out motion-reduce:transition-none
            ${open ? 'w-24 opacity-100' : 'w-0 overflow-hidden opacity-0 pointer-events-none'}`}
        >
          <div
            className="flex h-8 w-24 shrink-0 items-center"
            onPointerDown={handleScrubStart}
            onPointerUp={handleScrubEnd}
            onPointerCancel={handleScrubEnd}
          >
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.1}
              value={zoom}
              disabled={disabled}
              onChange={(e) => handleZoomInput(parseFloat(e.target.value))}
              onInput={(e) => handleZoomInput(parseFloat(e.currentTarget.value))}
              aria-labelledby={readoutId}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-12/55 accent-slate-12 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-12"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlGroup({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex h-9 items-center ${CHROME_PILL} ${className ?? ''}`}>
      {children}
    </div>
  );
}

function ChromeTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="rounded-none text-[10px]">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function DayNightToggle({
  mode,
  onToggle,
  disabled,
}: {
  mode: DayNightMode;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const isNight = mode === 'night';
  const label = isNight ? 'Switch to day' : 'Switch to night';
  return (
    <ChromeTooltip label={label}>
      <button
        type="button"
        role="switch"
        aria-checked={isNight}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className="flex h-6 w-11 shrink-0 items-center rounded-full bg-slate-12 p-0.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span
          className={`flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-void text-slate-12 transition-[margin] duration-200 ease-out motion-reduce:transition-none ${isNight ? 'ms-auto' : ''}`}
        >
          {isNight ? <Moon size={DAY_NIGHT_ICON_SIZE} aria-hidden /> : <Sun size={DAY_NIGHT_ICON_SIZE} aria-hidden />}
        </span>
      </button>
    </ChromeTooltip>
  );
}

function IconButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <ChromeTooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
        className={`flex size-8 items-center justify-center rounded-full border border-transparent transition-colors duration-150 focus-visible:border-border-strong focus-visible:outline-none ${
          pressed
            ? 'bg-state-selected text-slate-12'
            : 'text-slate-12/80 hover:bg-state-hover-overlay hover:text-slate-12'
        }`}
      >
        {children}
      </button>
    </ChromeTooltip>
  );
}
