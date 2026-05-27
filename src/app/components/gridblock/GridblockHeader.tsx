/**
 * GridblockHeader — top chrome bar.
 *
 * Layout:
 *   - inline-start cluster: brand mark + (optional) inline-start slot
 *   - inline-end cluster: clock + timezone selector + settings + account
 *
 * No vendor wordmarks, no LIVE pill, no version metadata. Anything
 * product-specific (e.g. a C2 logo) is provided by the caller via
 * the `brand` prop so the shell stays generic.
 *
 * The clock displays in the operator's chosen timezone (default
 * `'UTC'`). The picker writes through `useTimezone` so the choice
 * persists across reloads.
 */

import { KelaLogo, SettingsGear4 } from "@/lib/icons/central";
import { memo, type ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { useDirection, type Direction } from "@/lib/direction";
import { useStrings } from "@/lib/intl";

import {
  formatGridblockClock,
  useGridblockClock,
} from "./useGridblockClock";
import {
  defaultTimezoneOptions,
  useTimezone,
  type TimezoneOption,
} from "@/app/hooks/useTimezone";

export interface GridblockHeaderLabels {
  settings?: string;
}

interface GridblockHeaderProps {
  /**
   * Brand cluster rendered in the inline-start corner. Pass your
   * product logo here. When omitted, the C2 Hub mark is shown.
   */
  brand?: ReactNode;
  labels?: GridblockHeaderLabels;
  /**
   * Optional extra slot rendered between the brand and the
   * inline-end cluster. Useful for surface-level breadcrumbs or a
   * status pill.
   */
  centerSlot?: ReactNode;
  /**
   * Override the default timezone option list. Pass a curated set
   * (e.g. operator's home + UTC + deployment) to constrain the
   * picker.
   */
  timezoneOptions?: ReadonlyArray<TimezoneOption>;
}

function GridblockHeaderImpl({
  brand,
  centerSlot,
  timezoneOptions,
  labels,
}: GridblockHeaderProps) {
  const t = useStrings();
  const settingsLabel = labels?.settings ?? t.gridblock.settings;
  const { tz } = useTimezone(
    timezoneOptions ?? defaultTimezoneOptions(),
  );
  const now = useGridblockClock();
  const { direction, setDirection } = useDirection();

  return (
    <header
      className="gridblock-edge-bottom flex items-center justify-between bg-[var(--gridblock-bar)] ps-2"
      style={{ height: "var(--gridblock-header-height)" }}
    >
      <nav className="flex items-center gap-2">
        {brand ?? <KelaLogo size={16} className="text-slate-12" />}
        {centerSlot}
      </nav>

      <nav className="flex items-center gap-1">
        <div className="px-2 text-[12px] tabular-nums text-[var(--gridblock-text-secondary)]">
          {formatGridblockClock(now, tz)}
        </div>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="gridblock-iconbtn"
                  aria-label={settingsLabel}
                >
                  <SettingsGear4 size={18} />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {settingsLabel}
            </TooltipContent>
          </Tooltip>
          <PopoverContent side="bottom" align="end" sideOffset={6} className="w-56 p-2">
            <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-9">
              {t.gridblock.direction}
            </div>
            <div
              role="group"
              aria-label={t.gridblock.directionAriaLabel}
              className="flex items-stretch rounded-sm border border-border-default bg-state-hover p-0.5 text-[12px]"
            >
              <DirectionOption
                value="rtl"
                label="עב"
                title={t.gridblock.directionRtlLabel}
                direction={direction}
                onSelect={setDirection}
              />
              <DirectionOption
                value="ltr"
                label="EN"
                title={t.gridblock.directionLtrLabel}
                direction={direction}
                onSelect={setDirection}
              />
            </div>
          </PopoverContent>
        </Popover>
      </nav>
    </header>
  );
}

interface DirectionOptionProps {
  value: Direction;
  label: string;
  title: string;
  direction: Direction;
  onSelect: (next: Direction) => void;
}

function DirectionOption({
  value,
  label,
  title,
  direction,
  onSelect,
}: DirectionOptionProps) {
  const active = direction === value;

  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={() => onSelect(value)}
      className={`rounded-sm px-2 py-1 transition-[background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-border-strong ${
        active
          ? "bg-state-selected text-slate-12"
          : "text-slate-11 hover:bg-state-hover-strong hover:text-slate-12"
      }`}
    >
      {label}
    </button>
  );
}

// Memoized so unrelated dashboard re-renders (target sim ticks,
// devices panel state, etc.) don't reconcile this header subtree.
// It only depends on the clock tick (1 Hz, internal) and locale.
export const GridblockHeader = memo(GridblockHeaderImpl);
GridblockHeader.displayName = "GridblockHeader";
