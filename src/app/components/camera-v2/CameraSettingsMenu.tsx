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
import { Eye, History, Moon, Settings, Sun } from 'lucide-react';
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
  const writeDisabled = status.controlOwner === 'other';

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="הגדרות"
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
          הגדרות (S)
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-[280px] p-0 rounded-none bg-[#1a1a1a]/95 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_25px_50px_-12px_rgba(0,0,0,0.5)] border-none"
        dir="rtl"
      >
        <Section title="חקירת פלייבק" icon={<History size={11} />}>
          <Row
            label={playbackEnabled ? 'מפוצל: שידור חי + פלייבק' : 'שידור חי'}
            description={playbackEnabled
              ? 'התצוגה מפוצלת לשידור חי ולקובץ הקלוט.'
              : 'הפעל כדי לפצל את הפיד לשידור חי לעומת קלוט.'}
          >
            <Switch
              checked={playbackEnabled}
              onCheckedChange={onPlaybackToggle}
              aria-label="הפעל פלייבק"
            />
          </Row>
        </Section>

        <SectionDivider />

        <Section title="תצוגה" icon={<Eye size={11} />}>
          <Row label="זיהוי AI" description="סמן ברירת זיהויים על הפיד.">
            <Switch
              checked={detectionsOn}
              onCheckedChange={onDetectionsToggle}
              aria-label="זיהוי AI"
            />
          </Row>
          <Row
            label={mode === 'day' ? 'מצב יום' : 'מצב לילה (IR)'}
            description="עבור בין מצלמת יום לאינפרא-אדום."
            disabled={writeDisabled}
          >
            <button
              type="button"
              onClick={onModeToggle}
              disabled={writeDisabled}
              aria-label={mode === 'day' ? 'מצב לילה' : 'מצב יום'}
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
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-white/95">{label}</span>
        {description && <span className="text-[10px] text-white/55 leading-snug">{description}</span>}
      </div>
      {children}
    </div>
  );
}

