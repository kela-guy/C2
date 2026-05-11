/**
 * Settings popover triggered by the gear button in the bottom control bar.
 *
 * Sections:
 *   1. Playback investigation - toggle Live <-> Playback inside this tile.
 *   2. Display - AI detection, day/night.
 */

import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Switch } from '@/shared/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Eye, History, Moon, Settings, Sun } from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';
import type { CameraStatus, DayNightMode } from './types';

interface CameraSettingsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: CameraStatus;
  mode: DayNightMode;
  detectionsOn: boolean;
  playbackEnabled: boolean;
  onModeToggle: () => void;
  onDetectionsToggle: () => void;
  onPlaybackToggle: () => void;
}

export function CameraSettingsMenu({
  open,
  onOpenChange,
  status,
  mode,
  detectionsOn,
  playbackEnabled,
  onModeToggle,
  onDetectionsToggle,
  onPlaybackToggle,
}: CameraSettingsMenuProps) {
  const t = useStrings().camera.settingsMenu;
  const writeDisabled = status.controlOwner === 'other';
  const playbackLabel = playbackEnabled ? t.playbackSplitLabel : t.liveLabel;
  const playbackDescription = playbackEnabled
    ? t.playbackSplitDescription
    : t.liveDescription;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t.settingsTriggerAriaLabel}
              aria-pressed={open}
              className={`p-2 transition-colors duration-150 ease-out
                focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none
                active:scale-[0.97]
                ${open
                  ? 'bg-white/15 text-white ring-1 ring-inset ring-white/20'
                  : 'text-white/80 hover:text-white hover:bg-white/10'}`}
            >
              <Settings size={14} />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="rounded-none text-[10px]">
          {t.settingsHeading}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-[280px] p-0 rounded-none bg-[#1a1a1a]/95 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_25px_50px_-12px_rgba(0,0,0,0.5)] border-none"
      >
        <Section title={t.playbackSection} icon={<History size={11} />}>
          <Row
            label={playbackLabel}
            description={playbackDescription}
            shortcutHint="P"
          >
            <Switch
              checked={playbackEnabled}
              onCheckedChange={onPlaybackToggle}
              aria-label={playbackLabel}
            />
          </Row>
        </Section>

        <SectionDivider />

        <Section title={t.displaySection} icon={<Eye size={11} />}>
          <Row label={t.aiDetectionsLabel} description={t.aiDetectionsDescription}>
            <Switch
              checked={detectionsOn}
              onCheckedChange={onDetectionsToggle}
              aria-label={t.aiDetectionsAriaLabel}
            />
          </Row>
          <Row
            label={mode === 'day' ? t.currentDay : t.currentNight}
            description={t.modeDescription}
            disabled={writeDisabled}
          >
            <button
              type="button"
              onClick={onModeToggle}
              disabled={writeDisabled}
              aria-label={mode === 'day' ? t.switchToNightAriaLabel : t.switchToDayAriaLabel}
              className="p-1.5 text-white/85 hover:text-white hover:bg-white/10 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
            >
              {mode === 'day' ? <Moon size={13} /> : <Sun size={13} />}
            </button>
          </Row>
        </Section>
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-2 text-[10px] font-semibold text-white/55 uppercase tracking-[0.18em]">
        {icon}
        <span>{title}</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function SectionDivider() {
  return <div className="h-px bg-white/10" aria-hidden="true" />;
}

function Row({
  label,
  description,
  children,
  disabled,
  shortcutHint,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  disabled?: boolean;
  /** Optional keyboard hint rendered inline next to the label
   *  (e.g. "P" for playback). */
  shortcutHint?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs text-white/95 flex items-center gap-1.5">
          <span className="truncate">{label}</span>
          {shortcutHint && (
            <kbd
              aria-hidden="true"
              className="font-mono text-[9px] text-white/55 px-1 py-px ring-1 ring-inset ring-white/15 rounded"
            >
              {shortcutHint}
            </kbd>
          )}
        </span>
        {description && (
          <span className="text-[10px] text-white/55 leading-snug">{description}</span>
        )}
      </div>
      {children}
    </div>
  );
}
