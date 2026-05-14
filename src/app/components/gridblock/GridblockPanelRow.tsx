/**
 * GridblockPanelRow — base list-row primitive used inside any of the
 * side panels (Targets, Cameras, Devices, etc.). Centralises the
 * shell row geometry (4px vertical / 10px horizontal padding, 12px
 * Inter, hover wash, inset selected ring) so panel content lands on
 * a consistent shape without re-deriving it. See
 * `.gridblock-panel-row` in `gridblock.css`.
 */

import type { ReactNode } from "react";

interface GridblockPanelRowProps {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

export function GridblockPanelRow({
  selected,
  onClick,
  children,
}: GridblockPanelRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-selected={selected ? "true" : undefined}
      className="gridblock-panel-row"
    >
      {children}
    </button>
  );
}
