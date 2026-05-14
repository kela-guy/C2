/**
 * GridblockRailButton — single icon tab in either rail. Centralises
 * the active/inactive styling, tooltip wiring, and `role="tab"`
 * semantics so the rail components stay declarative.
 */

import { type ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

interface GridblockRailButtonProps {
  name: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  /**
   * Tooltip side — defaults to `right` for the left rail. The
   * right rail passes `"left"`. In RTL the rails physically flip
   * but the logical side strings still point inboard, so callers
   * generally don't need to change this prop based on direction.
   */
  tooltipSide?: "left" | "right";
}

export function GridblockRailButton({
  name,
  label,
  icon,
  active,
  onClick,
  tooltipSide = "right",
}: GridblockRailButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          name={name}
          role="tab"
          aria-selected={active}
          aria-label={label}
          data-active={active}
          onClick={onClick}
          className="gridblock-rail-btn"
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
