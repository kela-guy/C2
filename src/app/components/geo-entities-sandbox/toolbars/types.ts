import type { ComponentType } from 'react';
import type { GeoShape, GeoToolId } from '../drawTypes';

/**
 * Common props every toolbar variant consumes. Variants are pure presentation
 * — they read the active tool, render the {@link DRAW_TOOLS} registry their
 * own way, and call back into the shared controller via `onSelectTool` /
 * `onAction`.
 *
 * The 5 design variants split into two families:
 *   - layout-only differences (icon-only row vs labeled row vs vertical rail
 *     vs grouped vs speed-dial) — same buttons, different chrome.
 *   - dropdown-driven (a single "+" trigger that lists tools by name).
 */
export type ToolbarActionId =
  | 'rename'
  | 'description'
  | 'color'
  | 'coords'
  | 'rotate'
  | 'scale'
  | 'move'
  | 'save'
  | 'delete';

export interface ToolbarProps {
  /** Currently active drawing tool. */
  activeToolId: GeoToolId;
  onSelectTool: (id: GeoToolId) => void;
  /** Selected shape, if any — drives whether the action row is visible. */
  selectedShape: GeoShape | null;
  /** User clicked an action; the host decides what to do (focus inputs, etc). */
  onAction: (action: ToolbarActionId) => void;
  /** Optional className for the outer wrapper so the host can position. */
  className?: string;
}

export interface ToolbarVariantDescriptor {
  id: string;
  label: string;
  /** One-line description shown in the variant switcher. */
  blurb: string;
  Component: ComponentType<ToolbarProps>;
}
