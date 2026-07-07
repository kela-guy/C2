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
import { Eye, History, SettingsFilled } from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';
import type { CameraStatus, DayNightMode } from './types';

/** Camera framing presets exposed by the (optional) auto-track item. */
export type CameraAngle = 'straight' | 'down' | 'up' | 'left' | 'right';

/**
 * Per-instance copy overrides. Lets a host (e.g. the video HUD sandbox)
 * relabel the menu without forking the component or the strings catalog.
 */
export interface SettingsLabelOverrides {
  playbackLabel?: string;
  displaySection?: string;
  aiDetectionsLabel?: string;
}

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
  /** Optional copy overrides for the section/row labels. */
  settingsLabelOverrides?: SettingsLabelOverrides;
  /** Current "alerts muted" state for the mute-alerts row. */
  mutedAlerts?: boolean;
  /** Toggle handler for the mute-alerts row. */
  onMutedAlertsToggle?: () => void;
  /** Render the mute-alerts control as a toggle switch row. */
  alertsAsSwitch?: boolean;
}

export function CameraSettingsMenu({
  open,
  onOpenChange,
  detectionsOn,
  playbackEnabled,
  onDetectionsToggle,
  onPlaybackToggle,
  settingsLabelOverrides,
  mutedAlerts = false,
  onMutedAlertsToggle,
  alertsAsSwitch = false,
}: CameraSettingsMenuProps) {
  const t = useStrings().camera.settingsMenu;
  const playbackLabel = playbackEnabled ? t.playbackSplitLabel : t.liveLabel;
  const playbackDescription = playbackEnabled
    ? t.playbackSplitDescription
    : t.liveDescription;
  const playbackSectionTitle =
    settingsLabelOverrides?.playbackLabel ?? t.playbackSection;
  const displaySectionTitle =
    settingsLabelOverrides?.displaySection ?? t.displaySection;
  const aiDetectionsLabel =
    settingsLabelOverrides?.aiDetectionsLabel ?? t.aiDetectionsLabel;
  const showMuteAlerts = alertsAsSwitch && onMutedAlertsToggle != null;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t.settingsTriggerAriaLabel}
              aria-pressed={open}
              className={`p-2 rounded-full transition-colors duration-150 ease-out
                focus-visible:ring-2 focus-visible:ring-state-focus-ring focus-visible:outline-none
                active:scale-[0.97]
                ${open
                  ? 'bg-white/15 text-white ring-1 ring-inset ring-white/20'
                  : 'text-white/80 hover:text-white hover:bg-state-hover-overlay'}`}
            >
              <SettingsFilled size={14} />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {t.settingsHeading}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-[280px] p-0 rounded-none bg-surface-2/95 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_25px_50px_-12px_rgba(0,0,0,0.5)] border-none"
      >
        <Section title={playbackSectionTitle} icon={<History size={11} />}>
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

        <Section title={displaySectionTitle} icon={<Eye size={11} />}>
          <Row label={aiDetectionsLabel} description={t.aiDetectionsDescription}>
            <Switch
              checked={detectionsOn}
              onCheckedChange={onDetectionsToggle}
              aria-label={t.aiDetectionsAriaLabel}
            />
          </Row>
          {showMuteAlerts && (
            <Row label={t.muteAlertsLabel} description={t.muteAlertsDescription}>
              <Switch
                checked={mutedAlerts}
                onCheckedChange={onMutedAlertsToggle}
                aria-label={t.muteAlertsAriaLabel}
              />
            </Row>
          )}
        </Section>
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-white/55 uppercase tracking-[0.18em]">
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
              className="font-mono text-xs text-white/55 px-1 py-px ring-1 ring-inset ring-white/15 rounded"
            >
              {shortcutHint}
            </kbd>
          )}
        </span>
        {description && (
          <span className="text-xs text-white/55 leading-snug">{description}</span>
        )}
      </div>
      {children}
    </div>
  );
}
