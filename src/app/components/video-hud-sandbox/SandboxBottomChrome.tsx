import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
} from 'react';
import {
  TakeControl,
  LockOpenFilled,
  Maximize2,
  Minimize2,
  ZoomFilled,
  SquareFilled,
} from '@/lib/icons/central';
import { DockIcon } from '@/app/components/devices-panel/icons';
import { DayNightSpringToggle } from './DayNightSpringToggle';
import { glassStyle } from './SandboxDeviceSelect';
import {
  SandboxAngleToggle,
  type CameraAngle as PathfinderCameraAngle,
} from './SandboxAngleToggle';
import type { CameraStatus, DayNightMode, FeedDeviceType } from '@/app/components/camera-v2/types';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
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

// Base UI-style tooltip grouping for the whole bottom bar: the first tooltip
// waits `TIP_OPEN_DELAY`, then sweeping across adjacent controls opens instantly
// (no entrance animation) while within `TIP_SKIP_DELAY` of the last close.
const TIP_OPEN_DELAY = 600;
const TIP_SKIP_DELAY = 300;

// Shape + border only; the glass fill/blur is applied via an inline
// `glassStyle(...)` so the sandbox opacity/blur sliders can drive it live.
const CHROME_PILL = 'rounded-full border border-border-default/45';

function DockGlyph() {
  return <DockIcon size={16} className="shrink-0" />;
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
  forceVisible?: boolean;
  mutedAlerts?: boolean;
  onMutedAlertsToggle?: () => void;
  deviceKind?: 'camera' | 'drone' | 'pathfinder';
  cameraAngle?: CameraAngle;
  onCameraAngleChange?: (angle: CameraAngle) => void;
  /** Pathfinder framing preset (Front / Straight / Down) for the angle pill. */
  pathfinderAngle?: PathfinderCameraAngle;
  onPathfinderAngleChange?: (angle: PathfinderCameraAngle) => void;
  onAutoTrackStart?: () => void;
  settingsLabelOverrides?: {
    playbackLabel?: string;
    displaySection?: string;
    aiDetectionsLabel?: string;
  };
  alertsAsSwitch?: boolean;
  showAutoTrackItem?: boolean;
  /** Glass background opacity, 0..1 (black overlay alpha). Default 0.4. */
  bgOpacity?: number;
  /** Backdrop blur in px. Default 4 (matches `backdrop-blur-sm`). */
  blurPx?: number;
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
  forceVisible = false,
  mutedAlerts,
  onMutedAlertsToggle,
  deviceKind,
  pathfinderAngle = 'straight',
  onPathfinderAngleChange,
  settingsLabelOverrides,
  alertsAsSwitch,
  bgOpacity = 0.4,
  blurPx = 4,
}: SandboxBottomChromeProps) {
  const t = useStrings();
  const glass = glassStyle(bgOpacity, blurPx);
  const isDrone = deviceType === 'drone';
  const isPathfinder = deviceKind === 'pathfinder';
  const dockStopVisible = forceVisible || videoHovered || dockArmed || stopArmed;
  // The entire bottom chrome (gradient + controls) is hover-revealed.
  // Stay visible while the settings menu is open or dock/stop is armed so the
  // chrome never disappears out from under an in-progress interaction.
  const chromeVisible =
    forceVisible || videoHovered || settingsOpen || dockArmed || stopArmed;
  const owned = controlOwner === 'self';
  const takeReleaseLabel = (
    owned ? t.camera.controlBar.releaseControl : t.camera.controlBar.takeControl
  ).replace(/\s*\([^)]*\)\s*$/, '');
  const TakeReleaseIcon = owned ? LockOpenFilled : TakeControl;
  const fullscreenLabel = isFullscreen ? 'Exit fullscreen' : 'Fullscreen';
  const FullscreenIcon = isFullscreen ? Minimize2 : Maximize2;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 pointer-events-none">
      <DirIsland direction="ltr" className="relative h-[96px]">
        <div
          className={`absolute inset-0 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
            chromeVisible ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={!chromeVisible}
        >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

        <TooltipProvider delayDuration={TIP_OPEN_DELAY} skipDelayDuration={TIP_SKIP_DELAY}>
        <div className="absolute inset-x-3 bottom-4 flex h-11 items-center justify-between gap-3">
          <div
            className={`flex items-center gap-2 text-slate-12/80 ${
              chromeVisible ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            <ControlGroup className="px-0.5" style={glass}>
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

            {isDrone && (
              <div
                className={`flex items-center transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
                  dockStopVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-1 pointer-events-none'
                }`}
                aria-hidden={!dockStopVisible}
              >
                <ControlGroup className="pointer-events-auto gap-1 px-0.5" style={glass}>
                  <ChromeTooltip label="עצור">
                    <button
                      type="button"
                      aria-label="עצור"
                      aria-pressed={stopArmed}
                      onClick={onStopToggle}
                      className={`flex size-8 items-center justify-center rounded-full border border-transparent transition-colors duration-150 focus-visible:border-border-strong focus-visible:outline-none ${
                        stopArmed
                          ? 'bg-accent-danger/25 text-accent-danger motion-safe:animate-pulse'
                          : 'text-accent-danger/80 hover:bg-accent-danger/15 hover:text-accent-danger'
                      }`}
                    >
                      <SquareFilled size={BOTTOM_ICON_SIZE} aria-hidden />
                    </button>
                  </ChromeTooltip>

                  <span aria-hidden className="h-5 w-px shrink-0 bg-border-default/45" />

                  <ChromeTooltip label="חזרה לעגינה">
                    <button
                      type="button"
                      aria-label="חזרה לעגינה"
                      aria-pressed={dockArmed}
                      onClick={onDockToggle}
                      className={`flex size-8 items-center justify-center rounded-full border border-transparent transition-colors duration-150 focus-visible:border-border-strong focus-visible:outline-none ${
                        dockArmed
                          ? 'bg-state-selected text-slate-12'
                          : 'text-slate-12/80 hover:bg-state-hover-overlay hover:text-slate-12'
                      }`}
                    >
                      <DockGlyph />
                    </button>
                  </ChromeTooltip>
                </ControlGroup>
              </div>
            )}

            {isPathfinder && (
              <SandboxAngleToggle
                value={pathfinderAngle}
                onChange={onPathfinderAngleChange ?? (() => {})}
                bgOpacity={bgOpacity}
                blurPx={blurPx}
              />
            )}

            <SandboxZoomControl
              zoom={zoomLevel}
              onChange={onZoomChange}
              glass={glass}
            />
          </div>

          <div
            className={`flex shrink-0 items-center gap-1.5 text-slate-12/80 ${
              chromeVisible ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            <DayNightSpringToggle
              mode={mode}
              onToggle={onModeToggle}
              bgOpacity={bgOpacity}
              blurPx={blurPx}
            />
            <ControlGroup className="gap-1 px-0.5" style={glass}>
              <CameraSettingsMenu
                open={settingsOpen}
                onOpenChange={onSettingsOpenChange}
                status={{ controlOwner } as CameraStatus}
                mode={mode}
                detectionsOn={detectionsOn}
                playbackEnabled={playbackOn}
                onModeToggle={onModeToggle}
                onDetectionsToggle={onDetectionsToggle}
                onPlaybackToggle={onPlaybackToggle}
                settingsLabelOverrides={settingsLabelOverrides}
                mutedAlerts={mutedAlerts}
                onMutedAlertsToggle={onMutedAlertsToggle}
                alertsAsSwitch={alertsAsSwitch}
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
        </div>
        </TooltipProvider>
        </div>
      </DirIsland>
    </div>
  );
}

function SandboxZoomControl({
  zoom,
  onChange,
  disabled,
  glass,
}: {
  zoom: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  glass?: CSSProperties;
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
        style={glass}
        className={`flex h-9 items-center gap-0 ${CHROME_PILL} transition-[gap,padding] duration-150 ease-out motion-reduce:transition-none
          ${open ? 'overflow-visible pl-0.5 pr-2.5' : 'overflow-hidden pl-0 pr-2'}`}
      >
        <ChromeTooltip label={`Zoom (${zoomLabel})`}>
          <button
            type="button"
            aria-label={`Zoom (${zoomLabel})`}
            aria-expanded={open}
            aria-controls={sliderId}
            onClick={() => setOpen(true)}
            disabled={disabled}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-12/85 transition-colors duration-150 ease-out hover:bg-state-hover-overlay hover:text-slate-12 focus-visible:border-border-strong focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ZoomFilled size={BOTTOM_ICON_SIZE} aria-hidden="true" />
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
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={style}
      className={`flex h-9 items-center ${CHROME_PILL} ${className ?? ''}`}
    >
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
    <TooltipPrimitive.Root>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="data-[state=instant-open]:animate-none"
      >
        {label}
      </TooltipContent>
    </TooltipPrimitive.Root>
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
