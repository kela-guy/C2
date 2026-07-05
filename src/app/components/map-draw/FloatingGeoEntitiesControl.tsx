/**
 * Floating Geo Entities control — the map's top-right entry point into
 * the geo-drawing flow.
 *
 * Shape: a unified TWO-STAGE strip (ported from the Floating Panel
 * sandbox V1).
 *
 *   - CLOSED (default): a single 28x28 chip showing the SELECTED tool's
 *     icon (Polygon on first load). This chip is the always-visible
 *     affordance and the trigger that expands the strip. A fresh draft
 *     begins with whatever tool this chip currently shows — the "closed
 *     selected state" IS the tool you draw with.
 *   - OPEN: the SAME chip grows horizontally (`w-7` -> `w-[106px]`) ON HOVER
 *     to reveal the three OTHER tools beside the selected one. One shared
 *     container (single background, border, shadow) holds flat icon
 *     glyphs — no per-icon chip. Hovering an icon paints a subtle
 *     interior fill; the SELECTED icon (anchored on the right) carries a
 *     stronger fill so the active tool reads at a glance.
 *
 * EXPANDING and moving between tools is HOVER-driven (also opens on
 * keyboard focus): the strip opens while the pointer is over it and
 * collapses when the pointer leaves. CHOOSING a tool, however, is not
 * hover-bound — clicking any icon (an OTHER tool, or the anchor to
 * re-pick the shown tool) promotes it to the selected slot (the closed
 * chip's face swaps to that icon), arms it, and snaps the strip shut
 * IMMEDIATELY, regardless of where the pointer is.
 *
 * Interaction with the docked panel:
 *   - Opening / arming a tool does NOT close the docked panel. If the
 *     panel is already open, we let it stay open so the user's context
 *     (e.g. the Layers list) survives the switch — placing the first
 *     point on the map then transitions the same open panel from
 *     LayersView to DraftDetailView in-place.
 *   - When the engine finishes a shape (`pendingShapeId`) or opens a
 *     draft (`draft`), the docked panel opens if it wasn't already so
 *     the Save / Cancel editor is available.
 *
 * State ownership: the active drawing tool + pending-shape come from
 * `useMapDraw()`; the closed-chip "face" and open/closed transition are
 * local UI state. The face tracks the live `drawTool` whenever one is
 * armed so the chip always mirrors the real engine tool. Panel
 * open/close is passed in from Dashboard, which owns the docked-panel
 * mutual-exclusion group.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { MapPin, type IconProps } from '@/lib/icons/central';
import { DirIsland } from '@/lib/direction/DirIsland';
import type { ComponentType, SVGProps } from 'react';
import { CircleDrawIcon, LineDrawIcon, PolygonDrawIcon } from './icons';
import { useMapDraw, type MapDrawTool } from './MapDrawProvider';

export interface FloatingGeoEntitiesControlProps {
  /** Whether the docked geo-entities panel is currently open. */
  panelOpen: boolean;
  /** Ask Dashboard to open the docked panel (e.g. after a shape commits). */
  onOpenPanel: () => void;
  /** Ask Dashboard to close the docked panel (e.g. when arming a tool). */
  onClosePanel: () => void;
}

/**
 * The subset of `MapDrawTool` the strip actually surfaces. `arrow`
 * exists in the engine alphabet but is not part of the four canonical
 * primitives shown here, so it can never become the closed-chip face.
 */
type DisplayToolId = 'polygon' | 'line' | 'circle' | 'point';

type ToolEntry = {
  id: DisplayToolId;
  label: string;
  Icon:
    | ComponentType<IconProps>
    | ((props: { size?: number } & SVGProps<SVGSVGElement>) => JSX.Element);
};

/**
 * The four canonical drawing primitives, in stable registry order. The
 * SELECTED tool anchors on the right edge of the strip; the remaining
 * three render to its left (in this order) and reveal on expand. "POI"
 * is the engine's `point` tool (single-click drops a pin). Freehand has
 * been retired from the public surface.
 */
const TOOLS: ToolEntry[] = [
  { id: 'polygon', label: 'Polygon', Icon: PolygonDrawIcon },
  { id: 'line', label: 'Line', Icon: LineDrawIcon },
  { id: 'circle', label: 'Circle', Icon: CircleDrawIcon },
  { id: 'point', label: 'POI', Icon: MapPin },
];

function isDisplayToolId(id: MapDrawTool | null): id is DisplayToolId {
  return (
    id === 'polygon' || id === 'line' || id === 'circle' || id === 'point'
  );
}

export function FloatingGeoEntitiesControl({
  panelOpen,
  onOpenPanel,
  onClosePanel,
}: FloatingGeoEntitiesControlProps) {
  const { draw, drawTool, setDrawTool } = useMapDraw();

  // The tool shown on the closed chip AND the one a fresh draft begins
  // with. Defaults to Polygon; tracks the live engine tool whenever one
  // is armed (see effect below) so the chip mirrors reality even when
  // the tool is armed from elsewhere (e.g. entering a shape edit).
  const [faceTool, setFaceTool] = useState<DisplayToolId>('polygon');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDisplayToolId(drawTool)) setFaceTool(drawTool);
  }, [drawTool]);

  // Reopen the docked panel once a shape has been committed so the user
  // can name it / save it. We watch the null -> non-null transition of
  // `pendingShapeId` rather than its current value so re-selecting an
  // already-pending shape from elsewhere doesn't repeatedly force the
  // panel back open.
  const prevPendingRef = useRef<string | null>(draw.pendingShapeId);
  useEffect(() => {
    const prev = prevPendingRef.current;
    const next = draw.pendingShapeId;
    if (!prev && next && !panelOpen) onOpenPanel();
    prevPendingRef.current = next;
  }, [draw.pendingShapeId, panelOpen, onOpenPanel]);

  // Open the docked panel the instant the user starts a draft — the
  // panel is the ONLY surface where coordinates render live while the
  // shape is being drawn (the map deliberately shows no numbered dots
  // or vertex labels). We treat this as a null -> non-null transition
  // on `draw.draft` so re-opening the panel manually doesn't get
  // clobbered while the draft continues.
  const prevDraftRef = useRef(draw.draft);
  useEffect(() => {
    const prev = prevDraftRef.current;
    const next = draw.draft;
    if (!prev && next && !panelOpen) onOpenPanel();
    prevDraftRef.current = next;
  }, [draw.draft, panelOpen, onOpenPanel]);

  // Picking a tool (any slot — including the anchor to re-pick the tool
  // already shown) promotes it to the selected slot, arms it, and
  // collapses the strip IMMEDIATELY. Hover only governs opening and
  // moving between tools; the moment a tool is CHOSEN the strip snaps
  // shut regardless of where the pointer is, rather than waiting for it
  // to leave. Arming does NOT close the docked panel — the MapDrawPanel
  // switches its render branch off `draw.draft` / `pendingShapeId`, so
  // dropping the first point transitions any open panel in-place.
  const saveRequired = draw.requiresSaveBeforeDraw;

  const chooseTool = (id: DisplayToolId) => {
    if (saveRequired) return;
    setFaceTool(id);
    setDrawTool(id);
    setOpen(false);
  };

  // Keyboard analog of mouse-leave: collapse when focus leaves the strip
  // entirely. `relatedTarget` is where focus is moving; if it's still
  // inside the strip we stay open.
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!rootRef.current) return;
    const next = e.relatedTarget as Node | null;
    if (!next || !rootRef.current.contains(next)) setOpen(false);
  };

  const selectedTool = TOOLS.find((t) => t.id === faceTool) ?? TOOLS[0];
  const others = TOOLS.filter((t) => t.id !== faceTool);
  // Whether the shown/selected tool is actually armed on the engine.
  // Chosen-state chrome lives on the icon slot (full-cell fill + white
  // glyph), not on the container border.
  const anchorArmed = drawTool === selectedTool.id;

  return (
    <TooltipProvider delayDuration={150}>
      {/* Pin to LTR so flex order + justify-end stay stable in the RTL
          app shell. Physical `right-3` keeps the strip on the map's
          visual top-right; extras clip from the left when collapsed. */}
      <DirIsland
        direction="ltr"
        className="pointer-events-auto absolute top-3 right-3 z-40"
      >
        <div
          ref={rootRef}
          role="toolbar"
          aria-label="Geo Entities"
          // Hover (and keyboard focus) drives the two-stage reveal: the
          // strip expands while the pointer is over it and collapses the
          // moment it leaves — so moving out onto the map to drop the
          // first point closes the strip on its own.
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocusCapture={() => setOpen(true)}
          onBlur={handleBlur}
          // `p-[2px]` + `gap-[2px]` = 2 px on every edge and between
          // every cell. Open width = 2 + 4×24 + 3×2 + 2 = 106 px.
          className={`flex h-7 items-center justify-end gap-[2px] overflow-hidden rounded-[2px] p-[2px] bg-black/70 shadow-[0_4px_12px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/10 backdrop-blur-md transition-[width] duration-200 ease-out ${
            open ? 'w-[106px]' : 'w-7'
          }`}
        >
          {others.map((tool) => (
            <IconSlot
              key={tool.id}
              tool={tool}
              active={false}
              blocked={saveRequired}
              onClick={() => chooseTool(tool.id)}
              reachable={open}
            />
          ))}
          <IconSlot
            tool={selectedTool}
            // The anchor is the current selection; mirror the engine's
            // armed state so the chip highlights only when the tool is
            // actually live. Clicking it re-arms the shown tool.
            active={anchorArmed}
            pendingHint={saveRequired}
            onClick={() => chooseTool(selectedTool.id)}
            reachable
          />
        </div>
      </DirIsland>
    </TooltipProvider>
  );
}

/**
 * One flat icon inside the shared strip container. Hover and chosen states
 * paint the full 24×24 cell so edge padding matches inter-cell gaps; an
 * extra inset frame made the right margin look wider than 2 px in RTL.
 */
function IconSlot({
  tool,
  active,
  blocked = false,
  pendingHint = false,
  onClick,
  reachable,
  tooltipOverride,
}: {
  tool: ToolEntry;
  active: boolean;
  blocked?: boolean;
  /** While a shape awaits Save/Cancel, only the anchor chip shows this hint. */
  pendingHint?: boolean;
  onClick: () => void;
  reachable: boolean;
  tooltipOverride?: string;
}) {
  const tooltip = pendingHint
    ? 'Save Changes'
    : (tooltipOverride ?? tool.label);
  // Blocked sibling tools stay inert with no tooltip; the anchor keeps
  // hover + "Save Changes" so the user knows where to go next.
  const showTooltip = !blocked || pendingHint;

  const button = (
    <button
      type="button"
      aria-pressed={active}
      aria-disabled={blocked || pendingHint || undefined}
      aria-label={pendingHint ? 'Save Changes' : tool.label}
      aria-hidden={!reachable || undefined}
      tabIndex={reachable && !blocked ? 0 : -1}
      disabled={blocked}
      onClick={onClick}
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-[2px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-white/[0.08] text-white'
          : 'text-[#949494] hover:bg-white/[0.08] hover:text-white'
      }`}
    >
      <tool.Icon size={16} />
    </button>
  );

  if (!showTooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6} className="text-[11px]">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
