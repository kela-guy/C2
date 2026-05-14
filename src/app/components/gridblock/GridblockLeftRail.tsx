/**
 * GridblockLeftRail — vertical icon strip on the inline-start edge
 * of the map. Generic: callers pass their own `tabs` array, so
 * different pages can declare different tab sets without forking
 * the shell.
 *
 * The rail is intentionally tab-only. If a divider between tab
 * groups is needed (e.g. Top vs Bottom in the reference shell)
 * that's the caller's job — pass two rails or render a divider
 * between two `GridblockLeftRail` instances inside one container.
 * Keeping the rail flat avoids hardcoding a specific arrangement
 * here.
 */

import { memo, type ReactNode } from "react";
import type { GridblockRailTab } from "./types";
import { GridblockRailButton } from "./GridblockRailButton";

interface GridblockLeftRailProps<Id extends string> {
  tabs: ReadonlyArray<GridblockRailTab<Id>>;
  value: Id | null;
  onChange: (next: Id | null) => void;
  /**
   * Optional aria-label override. The default is "Left sidebar".
   */
  ariaLabel?: string;
  /**
   * Content pinned to the bottom of the rail, below the tab buttons.
   * Rendered outside the `role="tablist"` section so it doesn't
   * participate in tab semantics.
   */
  bottomSlot?: ReactNode;
}

function GridblockLeftRailImpl<Id extends string>({
  tabs,
  value,
  onChange,
  ariaLabel = "Left sidebar",
  bottomSlot,
}: GridblockLeftRailProps<Id>) {
  const handle = (id: Id) => onChange(value === id ? null : id);
  return (
    <div className="flex h-full flex-col">
      <section
        role="tablist"
        aria-label={ariaLabel}
        data-testid="gridblock-left-rail"
        className="flex flex-col items-center gap-1 py-1"
      >
        {tabs.map((tab) => (
          <GridblockRailButton
            key={tab.id}
            name={tab.id}
            label={tab.label}
            icon={tab.icon}
            active={value === tab.id}
            onClick={() => handle(tab.id)}
          />
        ))}
      </section>
      {bottomSlot && (
        <nav className="mt-auto flex flex-col items-center gap-1 py-1">
          {bottomSlot}
        </nav>
      )}
    </div>
  );
}

// Cast preserves the generic signature that `memo()` would otherwise
// erase. Memoization here matters because the rail is rendered next
// to the map and was being re-reconciled on every dashboard parent
// render, even when `value`/`tabs`/`onChange` were referentially
// stable.
export const GridblockLeftRail = memo(
  GridblockLeftRailImpl,
) as typeof GridblockLeftRailImpl;
