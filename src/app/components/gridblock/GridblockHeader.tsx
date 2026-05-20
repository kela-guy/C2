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

interface GridblockHeaderProps {
  /**
   * Brand cluster rendered in the inline-start corner. Pass your
   * product logo here. The shell does not ship a default brand —
   * leaving this out renders an empty cluster.
   */
  brand?: ReactNode;
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
}: GridblockHeaderProps) {
  const t = useStrings();
  const { tz } = useTimezone(
    timezoneOptions ?? defaultTimezoneOptions(),
  );
  const now = useGridblockClock();

  return (
    <header
      className="gridblock-edge-bottom flex items-center justify-between bg-[var(--gridblock-bar)] pr-2"
      style={{ height: "var(--gridblock-header-height)" }}
    >
      <nav className="flex items-center gap-2">
        {brand}
        {centerSlot}
        <KelaLogo size={16} className="text-slate-12" />
      </nav>

      <nav className="flex items-center gap-1">
        <div className="px-2 text-[12px] tabular-nums text-[var(--gridblock-text-secondary)]">
          {formatGridblockClock(now, tz)}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="gridblock-iconbtn"
              aria-label={t.gridblock.settings}
            >
              <SettingsGear4 size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {t.gridblock.settings}
          </TooltipContent>
        </Tooltip>
      </nav>
    </header>
  );
}

// Memoized so unrelated dashboard re-renders (target sim ticks,
// devices panel state, etc.) don't reconcile this header subtree.
// It only depends on the clock tick (1 Hz, internal) and locale.
export const GridblockHeader = memo(GridblockHeaderImpl);
GridblockHeader.displayName = "GridblockHeader";
