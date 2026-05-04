/**
 * Hover/focus-revealed bottom control bar.
 *
 * Anatomy (left -> right):
 *   [Lock (take/release)] [Day/Night] [AI scan] [Designate target]   [Settings] [Fullscreen]
 *
 * No labels on buttons; tooltips carry state + keyboard shortcuts. Switch
 * device dropdown was removed in favour of the PIN flow on device cards.
 */

import {
  Crosshair,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  Moon,
  ScanSearch,
  Sparkles,
  Sun,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
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

function LockButton({ status, onClick }: { status: CameraStatus; onClick: () => void }) {
  const ownsControl = status.controlOwner === 'self';
  const lockedByOther = status.controlOwner === 'other';
  const requestPending = !!status.controlRequestPending;

  let label: string;
  let icon: React.ReactNode;
  let tone: string;
  if (requestPending) {
    label = `מבקש שליטה… ${status.controlRequestCountdown ?? ''}s (T)`.trim();
    icon = <Lock size={14} className="animate-pulse motion-reduce:animate-none" aria-hidden="true" />;
    tone = 'text-amber-200 bg-amber-500/15 ring-1 ring-inset ring-amber-300/40';
  } else if (ownsControl) {
    label = 'שחרר שליטה (T)';
    icon = <LockOpen size={14} aria-hidden="true" />;
    tone = 'text-emerald-200 bg-emerald-500/20 ring-1 ring-inset ring-emerald-400/40 hover:bg-emerald-500/30';
  } else if (lockedByOther) {
    label = `נעול ע״י ${status.controlOwnerName ?? 'מפעיל אחר'}`;
    icon = <Lock size={14} aria-hidden="true" />;
    tone = 'text-zinc-300 bg-zinc-800/70 ring-1 ring-inset ring-zinc-500/40';
  } else {
    label = 'קח שליטה (T)';
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
        className={`absolute -top-1 -right-1 ${active ? 'text-emerald-200' : 'text-white/55'}`}
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
}: CameraControlBarProps) {
  const writeDisabled = status.controlOwner === 'other';

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-200 ease-out
        ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!visible}
    >
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 via-black/35 to-transparent pointer-events-none" />

      <div className="relative flex items-center justify-between gap-1 px-2 pb-2 pt-1" dir="ltr">
        <div className="flex items-center gap-1">
          <LockButton status={status} onClick={onTakeRelease} />
          <ControlButton
            label={mode === 'day' ? 'מצב לילה' : 'מצב יום'}
            shortcut="D"
            onClick={onModeToggle}
            disabled={writeDisabled}
          >
            {mode === 'day' ? <Moon size={14} /> : <Sun size={14} />}
          </ControlButton>
          <ControlButton
            label={detectionsOn ? 'הסתר זיהוי AI' : 'הצג זיהוי AI'}
            onClick={onDetectionsToggle}
            active={detectionsOn}
          >
            <AiScanIcon active={detectionsOn} />
          </ControlButton>
          <ControlButton
            label={designateMode ? 'בטל סימון יעד' : 'סמן יעד'}
            shortcut="X"
            onClick={onDesignateModeToggle}
            active={designateMode}
          >
            <Crosshair size={14} className={designateMode ? 'text-amber-300' : ''} />
          </ControlButton>
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
            label={isFullscreen ? 'צא ממסך מלא' : 'מסך מלא'}
            shortcut={isFullscreen ? 'F/Esc' : 'F'}
            onClick={onFullscreenToggle}
            active={isFullscreen}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
