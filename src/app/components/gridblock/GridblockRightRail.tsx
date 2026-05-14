/**
 * GridblockRightRail — mirror of `GridblockLeftRail` on the
 * inline-end side. Today the production dashboard ships with no
 * right-rail tabs; the rail still occupies a column so the grid
 * stays symmetric and adding tabs later is a no-op layout change.
 *
 * Tooltips flip to `side="left"` so they don't get clipped by the
 * viewport edge.
 */

import { memo } from "react";
import type { GridblockRailTab } from "./types";
import { GridblockRailButton } from "./GridblockRailButton";

interface GridblockRightRailProps<Id extends string> {
  tabs?: ReadonlyArray<GridblockRailTab<Id>>;
  value?: Id | null;
  onChange?: (next: Id | null) => void;
  ariaLabel?: string;
}

function GridblockRightRailImpl<Id extends string>({
  tabs,
  value = null,
  onChange,
  ariaLabel = "Right sidebar",
}: GridblockRightRailProps<Id>) {
  const handle = (id: Id) => onChange?.(value === id ? null : id);
  return (
    <section
      role="tablist"
      aria-label={ariaLabel}
      data-testid="gridblock-right-rail"
      className="flex h-full flex-col items-center gap-1 py-1"
    >
      {tabs?.map((tab) => (
        <GridblockRailButton
          key={tab.id}
          name={tab.id}
          label={tab.label}
          icon={tab.icon}
          active={value === tab.id}
          onClick={() => handle(tab.id)}
          tooltipSide="left"
        />
      ))}
    </section>
  );
}

export const GridblockRightRail = memo(
  GridblockRightRailImpl,
) as typeof GridblockRightRailImpl;
