import { memo } from "react";
import { X } from "@/lib/icons/central";
import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

interface GridblockPanelProps {
  title: ReactNode;
  onClose: () => void;
  closeAriaLabel?: string;
  closeTooltip?: string;
  testId?: string;
  /**
   * Optional node rendered inside the header strip, between the title
   * and the close button. Use for panel-scoped chrome that needs to
   * sit alongside the title rather than below it — e.g. tab strips,
   * a layout picker, or a small action cluster.
   *
   * The slot is laid out as `flex-1 min-w-0` so children can scroll
   * horizontally when the header is narrow. Pass content unstyled.
   */
  headerActions?: ReactNode;
  /**
   * Optional sticky strip rendered between the header and the scroll body.
   * Typical content: a search input + filter chips, a tab bar, or a
   * count + sort row. Lives outside the scroll container so it stays
   * pinned while the body scrolls.
   *
   * Pass content unstyled — the surrounding wrapper paints the
   * gridblock seam (border-bottom + surface tone) so toolbars across
   * panels read identically.
   */
  toolbar?: ReactNode;
  /**
   * Optional sticky strip rendered below the scroll body. Typical
   * content: an action bar ("Apply", "Reset", batch-action buttons,
   * count summary). Lives outside the scroll container so it stays
   * pinned while the body scrolls.
   *
   * Like `toolbar`, the surrounding wrapper paints the gridblock seam
   * — pass content unstyled.
   */
  footer?: ReactNode;
  children: ReactNode;
}

function GridblockPanelImpl({
  title,
  onClose,
  closeAriaLabel,
  closeTooltip,
  testId = "gridblock-panel",
  headerActions,
  toolbar,
  footer,
  children,
}: GridblockPanelProps) {
  const fallbackAria =
    typeof title === "string" ? `Close ${title}` : "Close panel";

  /*
   * The close button paints a 1px hairline on its inline-start
   * edge — the side that faces the title text. This visually
   * splits the title region from the affordance region within
   * the header strip, the same way the rest of the chrome uses
   * the gridblock-border token to delineate functional zones.
   *
   * Using `border-s` (logical inline-start) instead of a physical
   * `border-l` / `border-r` keeps the seam between title and
   * close button correctly oriented in both LTR and RTL — in
   * RTL it paints on the button's visual right edge, in LTR on
   * its visual left.
   */
  const closeBtn = (
    <button
      type="button"
      onClick={onClose}
      aria-label={closeAriaLabel ?? fallbackAria}
      className="gridblock-iconbtn border-s border-s-[var(--gridblock-border)]"
    >
      <X size={16} />
    </button>
  );

  return (
    <aside
      data-testid={testId}
      className="flex h-full w-full flex-col"
    >
      <header className="flex h-8 items-center border-b border-[var(--gridblock-border)] bg-[var(--gridblock-bar)]">
        {title !== null && title !== undefined && title !== "" ? (
          <h4 className="relative shrink-0 ps-2 text-[12px] font-semibold leading-4 text-[var(--gridblock-text-primary)]">
            {title}
          </h4>
        ) : null}
        {headerActions ? (
          <div className="flex h-full min-w-0 flex-1 items-center">{headerActions}</div>
        ) : (
          <div className="flex-1" />
        )}
        {closeTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>{closeBtn}</TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {closeTooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          closeBtn
        )}
      </header>
      {toolbar ? (
        <div
          data-testid={`${testId}-toolbar`}
          className="shrink-0 border-b border-[var(--gridblock-border)]"
        >
          {toolbar}
        </div>
      ) : null}
      <div className="relative flex-1 overflow-y-auto">{children}</div>
      {footer ? (
        <div
          data-testid={`${testId}-footer`}
          className="shrink-0 border-t border-[var(--gridblock-border)] bg-[var(--gridblock-bar)]"
        >
          {footer}
        </div>
      ) : null}
    </aside>
  );
}

/**
 * Memoised so the 1Hz `useGridblockClock()` re-render in
 * `GridblockHeader` / `GridblockFooter` (siblings within `GridblockShell`)
 * doesn't propagate through the panel chrome — and through the
 * device list / camera grid / icon detail body that lives inside it.
 *
 * Memoisation is by referential equality of every prop. The migrated
 * panels (Devices, Tracks, IconDetail) all hand-build a stable
 * `headerTitle` / `toolbar` ReactNode per render, so a re-render of
 * the panel itself still busts memo (intentional — its own state
 * changed). The win is when an unrelated ancestor re-renders and the
 * props referentially match.
 */
export const GridblockPanel = memo(GridblockPanelImpl);
GridblockPanel.displayName = "GridblockPanel";
