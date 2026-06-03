/**
 * Settings dropdown triggered by the gear button in the bottom control bar.
 *
 * Sections:
 *   1. Playback investigation — toggle split-view playback on/off.
 *   2. Display — AI detection markers.
 *
 * Both rows are `DropdownMenuCheckboxItem`s — Radix-driven, keyboard
 * navigable, with the standard left-aligned checkmark indicator. The
 * menu stays open across toggles (`onSelect` preventDefault) so the
 * operator can flip multiple settings in one trip.
 */

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Switch } from '@/app/components/ui/switch';
import {
  ArrowUp,
  BellOff,
  Crosshair,
  Settings,
} from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';
import { useIsRtl } from '@/lib/direction';

export type CameraAngle = 'front' | 'down' | 'straight';

// shadcn `DropdownMenuCheckboxItem` ships the checkmark indicator at
// inline-start (`start-2`) with matching `ps-8` padding. This product
// wants the indicator at inline-end instead so it never competes with
// the row label for the operator's first glance. Flip the indicator
// span via an arbitrary variant and swap the padding.
const CHECKBOX_INDICATOR_AT_END =
  'ps-2 pe-8 [&>span:first-child]:start-auto [&>span:first-child]:end-2';

// `DropdownMenuShortcut` is `ms-auto` (pushes to inline-end). With the
// checkmark now occupying inline-end, the shortcut moves to inline-start.
const SHORTCUT_AT_START = 'ms-0 me-auto';

interface SettingsLabelOverrides {
  playbackLabel?: string;
  displaySection?: string;
  aiDetectionsLabel?: string;
}

interface CameraSettingsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detectionsOn: boolean;
  playbackEnabled: boolean;
  onDetectionsToggle: () => void;
  onPlaybackToggle: () => void;
  mutedAlerts?: boolean;
  onMutedAlertsToggle?: () => void;
  deviceKind?: 'camera' | 'drone' | 'pathfinder';
  cameraAngle?: CameraAngle;
  onCameraAngleChange?: (angle: CameraAngle) => void;
  onAutoTrackStart?: () => void;
  /** Copy overrides for individual rows (sandbox). */
  labelOverrides?: SettingsLabelOverrides;
  /** Render the alerts row as an inline switch instead of a checkbox. */
  alertsAsSwitch?: boolean;
  /** Show the pathfinder auto-track action. Defaults to true. */
  showAutoTrackItem?: boolean;
}

const ANGLE_ICON_ROTATION: Record<CameraAngle, string> = {
  front: 'rotate-[135deg]',
  down: 'rotate-180',
  straight: 'rotate-90',
};

export function CameraSettingsMenu({
  open,
  onOpenChange,
  detectionsOn,
  playbackEnabled,
  onDetectionsToggle,
  onPlaybackToggle,
  mutedAlerts,
  onMutedAlertsToggle,
  deviceKind,
  cameraAngle = 'straight',
  onCameraAngleChange,
  onAutoTrackStart,
  labelOverrides,
  alertsAsSwitch = false,
  showAutoTrackItem = true,
}: CameraSettingsMenuProps) {
  const t = useStrings().camera.settingsMenu;
  const dir = useIsRtl() ? 'rtl' : 'ltr';
  const isPathfinder = deviceKind === 'pathfinder';
  const showAlertsSection = onMutedAlertsToggle != null;
  const playbackLabel = labelOverrides?.playbackLabel ?? t.playbackLabel;
  const displaySection = labelOverrides?.displaySection ?? t.displaySection;
  const aiDetectionsLabel = labelOverrides?.aiDetectionsLabel ?? t.aiDetectionsLabel;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} dir={dir}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t.settingsTriggerAriaLabel}
              aria-pressed={open}
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ease-out
                focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:outline-none
                active:scale-[0.97]
                ${open
                  ? 'bg-state-selected text-slate-12 ring-1 ring-inset ring-border-default'
                  : 'text-slate-12/80 hover:bg-state-hover-strong hover:text-slate-12'}`}
            >
              <Settings size={14} />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="rounded-none text-[10px]">
          {t.settingsHeading}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-[240px]">
        <DropdownMenuLabel className="text-[10px] font-semibold text-slate-9 uppercase tracking-[0.18em]">
          {t.playbackSection}
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={playbackEnabled}
          onCheckedChange={onPlaybackToggle}
          onSelect={(e) => e.preventDefault()}
          className={CHECKBOX_INDICATOR_AT_END}
        >
          {playbackLabel}
          <DropdownMenuShortcut className={SHORTCUT_AT_START}>P</DropdownMenuShortcut>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-[10px] font-semibold text-slate-9 uppercase tracking-[0.18em]">
          {displaySection}
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={detectionsOn}
          onCheckedChange={onDetectionsToggle}
          onSelect={(e) => e.preventDefault()}
          className={CHECKBOX_INDICATOR_AT_END}
        >
          {aiDetectionsLabel}
        </DropdownMenuCheckboxItem>

        {showAlertsSection && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-semibold text-slate-9 uppercase tracking-[0.18em]">
              {t.alertsSection}
            </DropdownMenuLabel>
            {alertsAsSwitch ? (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onMutedAlertsToggle?.();
                }}
                className="ps-2 pe-2 justify-between gap-2"
              >
                <span className="flex items-center">
                  <BellOff size={14} className="me-2 text-slate-11" />
                  {t.muteAlertsLabel}
                </span>
                <Switch
                  checked={mutedAlerts ?? false}
                  tabIndex={-1}
                  aria-hidden
                  className="pointer-events-none"
                />
              </DropdownMenuItem>
            ) : (
              <DropdownMenuCheckboxItem
                checked={mutedAlerts ?? false}
                onCheckedChange={onMutedAlertsToggle}
                onSelect={(e) => e.preventDefault()}
                className={CHECKBOX_INDICATOR_AT_END}
              >
                <BellOff size={14} className="me-2 text-slate-11" />
                {t.muteAlertsLabel}
              </DropdownMenuCheckboxItem>
            )}
          </>
        )}

        {isPathfinder && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-semibold text-slate-9 uppercase tracking-[0.18em]">
              {t.pathfinderSection}
            </DropdownMenuLabel>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="ps-2 pe-2">
                <ArrowUp
                  size={14}
                  className={`me-2 text-slate-11 ${ANGLE_ICON_ROTATION[cameraAngle]}`}
                />
                {t.cameraAnglesLabel}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-[180px]">
                <DropdownMenuRadioGroup
                  value={cameraAngle}
                  onValueChange={(v) => onCameraAngleChange?.(v as CameraAngle)}
                >
                  <AngleRadioItem
                    value="front"
                    icon={ANGLE_ICON_ROTATION.front}
                    label={t.cameraAngleFront}
                  />
                  <AngleRadioItem
                    value="straight"
                    icon={ANGLE_ICON_ROTATION.straight}
                    label={t.cameraAngleStraight}
                  />
                  <AngleRadioItem
                    value="down"
                    icon={ANGLE_ICON_ROTATION.down}
                    label={t.cameraAngleDown}
                  />
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {showAutoTrackItem && (
              <DropdownMenuItem
                className="ps-2 pe-2"
                onSelect={() => {
                  onOpenChange(false);
                  onAutoTrackStart?.();
                }}
              >
                <Crosshair size={14} className="me-2 text-accent-warning" />
                {t.autoTrackLabel}
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AngleRadioItem({
  value,
  icon,
  label,
}: {
  value: CameraAngle;
  icon: string;
  label: string;
}) {
  return (
    <DropdownMenuRadioItem
      value={value}
      onSelect={(e) => e.preventDefault()}
      className={CHECKBOX_INDICATOR_AT_END}
    >
      <ArrowUp size={14} className={`me-2 text-slate-11 ${icon}`} />
      {label}
    </DropdownMenuRadioItem>
  );
}
