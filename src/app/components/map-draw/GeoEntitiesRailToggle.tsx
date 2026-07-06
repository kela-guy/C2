/**
 * Left-rail toggle for the Geo Entities panel.
 *
 * Splits out from Dashboard's inline JSX so we can call `useMapDraw`
 * from within `<MapDrawProvider>` and reset the drawing state machine
 * BEFORE the panel opens. Without that reset, opening the panel from
 * the rail while a shape is mid-draft (or mid-edit) would land the
 * user on the Draft Detail editor — the opposite of what this
 * affordance promises. The rail entry point is a "show me the layers
 * list" action, so we scrub the transient draw state on open and let
 * the panel render its LayersView branch.
 *
 * State we clear on open:
 *   - Active draw tool  → `setDrawTool(null)`   (Select mode)
 *   - In-flight draft   → `draw.cancelDraft()`  (discards half-drawn geom)
 *   - Pending shape     → `draw.cancelPending()`
 *                         For a brand-new shape this hard-deletes it;
 *                         for an existing-shape edit it just closes
 *                         the editor. The soldier explicitly asked to
 *                         see the layers list, so either outcome is
 *                         intentional.
 *
 * Nothing here calls `openMapDrawPanel` directly — Dashboard still
 * owns the docked-panel mutual-exclusion group (Sidebar / Devices /
 * Simulations / Flow Builder / Map-draw) and passes down the open /
 * close callbacks the same way the other rail toggles get them.
 */

import { Toggle } from '@/shared/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { GeoShapesIcon } from './icons';
import { useMapDraw } from './MapDrawProvider';

export interface GeoEntitiesRailToggleProps {
  /** Whether the docked geo-entities panel is currently open. */
  open: boolean;
  /** Ask Dashboard to open the docked panel. */
  onOpen: () => void;
  /** Ask Dashboard to close the docked panel. */
  onClose: () => void;
  /** Side to anchor the tooltip on — LTR = "right", RTL = "left". */
  tooltipSide: 'left' | 'right';
  /** Localized labels — the tooltip text switches with panel state. */
  openLabel: string;
  closeLabel: string;
}

export function GeoEntitiesRailToggle({
  open,
  onOpen,
  onClose,
  tooltipSide,
  openLabel,
  closeLabel,
}: GeoEntitiesRailToggleProps) {
  const { draw, setDrawTool } = useMapDraw();

  const openLayersView = () => {
    // Reset transient draw state so the panel renders LayersView
    // rather than the Draft Detail editor. Order matters: disarm the
    // tool first (so it doesn't re-arm a fresh draft), then cancel
    // the in-flight draft (if any), then the pending shape.
    setDrawTool(null);
    if (draw.draft) draw.cancelDraft();
    if (draw.pendingShapeId) draw.cancelPending();
    onOpen();
  };

  const tryClosePanel = () => {
    if (draw.blocksPanelClose) return;
    onClose();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={open}
          onPressedChange={(next) => {
            if (next) openLayersView();
            else tryClosePanel();
          }}
          className="size-6 min-w-6 px-0 rounded-[2px] bg-transparent text-[#949494] aria-pressed:bg-white/[0.08] aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-white/15 hover:bg-white/10 active:scale-[0.97] transition-[background-color] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
          aria-label={open ? closeLabel : openLabel}
        >
          <GeoShapesIcon size={20} />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} sideOffset={8}>
        {open
          ? draw.blocksPanelClose
            ? 'Save or cancel your changes first'
            : closeLabel
          : openLabel}
      </TooltipContent>
    </Tooltip>
  );
}
