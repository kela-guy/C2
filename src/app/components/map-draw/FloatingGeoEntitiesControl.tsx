/**
 * Floating Geo Entities control — the map's top-right entry point into the
 * geo-drawing flow. Replaces the left-rail "Geo Entities" toggle.
 *
 * Interaction model (collapse-on-idle):
 *   1. Idle    — the control renders as a SINGLE glass pill: the
 *                Polygon tool button (`PolygonDrawIcon`). Polygon is the
 *                primary/default primitive, so its button is always
 *                visible and is the geo-entities identity for the closed
 *                control. The other three tools are collapsed off-screen
 *                to the inline-start side of it.
 *   2. Hover / focus — pure-CSS transition expands the collapsed region
 *                to the left, revealing the three secondary tools (Line ·
 *                Circle · POI). The Polygon button itself never moves,
 *                swaps, or fades — so there is nothing to flicker; the
 *                same element you saw closed is the one you click to arm
 *                Polygon.
 *   3. Arm     — clicking any tool button (Polygon included) arms the
 *                drawing engine (`setDrawTool`). Any open docked panel is
 *                closed so the drawing surface is unobstructed.
 *   4. Commit  — when the user finishes drawing (engine sets
 *                `draw.pendingShapeId`), the docked panel reopens so the
 *                Save / Cancel editor is available.
 *
 * There is no Freehand entry — the floating strip exposes only the
 * canonical four primitives (Polygon, Line, Circle, POI). Freehand
 * has been retired from the user-facing surface.
 *
 * State ownership: the drawing tool + pending-shape come from
 * `useMapDraw()`; panel open/close is passed in from Dashboard, which
 * owns the docked-panel mutual-exclusion group.
 */

import { useEffect, useRef } from 'react';
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

type ToolEntry = {
  id: MapDrawTool;
  label: string;
  Icon:
    | ComponentType<IconProps>
    | ((props: { size?: number } & SVGProps<SVGSVGElement>) => JSX.Element);
};

/**
 * The three secondary tools revealed inside the collapsible region when
 * the control expands. Polygon is NOT here — it's the always-visible
 * primary button (see {@link POLYGON_ENTRY}). Order matches the design
 * ref (Line, Circle, POI). "POI" is the engine's `point` tool (single-
 * click drops a pin) presented with its own label to match product
 * vocabulary.
 */
const SECONDARY_TOOLS: ToolEntry[] = [
  { id: 'line', label: 'Line', Icon: LineDrawIcon },
  { id: 'circle', label: 'Circle', Icon: CircleDrawIcon },
  { id: 'point', label: 'POI', Icon: MapPin },
];

/** The primary tool — always visible, doubles as the closed-state pill. */
const POLYGON_ENTRY: ToolEntry = {
  id: 'polygon',
  label: 'Polygon',
  Icon: PolygonDrawIcon,
};

/**
 * Tool ids that count as "polygon-family" for the pressed / active
 * state of the Polygon button. Only `polygon` remains now that
 * Freehand has been dropped from the public surface.
 */
const POLYGON_TOOL_IDS: MapDrawTool[] = ['polygon'];

export function FloatingGeoEntitiesControl({
  panelOpen,
  onOpenPanel,
  onClosePanel,
}: FloatingGeoEntitiesControlProps) {
  const { draw, drawTool, setDrawTool } = useMapDraw();

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

  const polygonActive =
    drawTool != null && POLYGON_TOOL_IDS.includes(drawTool);

  const armTool = (id: MapDrawTool) => {
    // Re-clicking the active tool drops back into Select mode so the
    // control can be used to "put the pen down" without hunting for
    // a separate Select button.
    const isActive = drawTool === id;
    const next = isActive ? null : id;
    setDrawTool(next);
    // Arming a tool takes the map back into a drawing surface — close
    // the docked panel so it doesn't block the target area. We keep the
    // panel closed on de-arm too since the user just asked for a clear
    // canvas either way.
    if (next != null && panelOpen) onClosePanel();
  };

  return (
    <TooltipProvider delayDuration={150}>
      {/* Pin the control to LTR so `right-3` always anchors on the visual
          right edge of the map regardless of the app's global RTL
          direction — matches how the Cesium 2D/3D toggle is anchored on
          the left. */}
      <DirIsland direction="ltr">
        {/* Outer `group` drives the CSS-only expansion: `group-hover`
            reveals the tools on pointer, `group-focus-within` reveals
            them for keyboard/touch focus. No JS state is needed to
            keep the strip open — the four tools live directly inside
            the group so the pointer never leaves the hover region
            while it's traversing them. */}
        <div
          className="group pointer-events-auto absolute top-3 right-3 z-40"
          role="toolbar"
          aria-label="Geo Entities"
        >
          {/* Single glass sheet holds the collapsed Polygon button AND
              the secondary-tool region — when the extra tools slide in
              they read as part of the same pill, not a second surface. */}
          <div className="flex items-stretch rounded-[2px] border border-white/10 bg-black/70 p-1 shadow-lg backdrop-blur-md">
            {/* Collapsible secondary-tools region (Line · Circle · POI).
                Sits INLINE-START of the persistent Polygon button (LTR
                pinned above), so on expand it grows leftward out of the
                Polygon pill. Collapsed = zero width + transparent +
                slightly nudged; expanded = full width + fully opaque. */}
            <div className="flex items-stretch gap-1 overflow-hidden max-w-0 me-0 opacity-0 -translate-x-1 transition-[max-width,margin,opacity,transform] duration-200 ease-out group-hover:max-w-[220px] group-hover:me-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:max-w-[220px] group-focus-within:me-1 group-focus-within:opacity-100 group-focus-within:translate-x-0">
              {SECONDARY_TOOLS.map((entry) => {
                const active = drawTool === entry.id;
                return (
                  <Tooltip key={entry.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-pressed={active}
                        aria-label={entry.label}
                        onClick={() => armTool(entry.id)}
                        className={`grid size-5 place-items-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                          active
                            ? 'bg-white/[0.16] text-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <entry.Icon size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      sideOffset={8}
                      className="text-[11px]"
                    >
                      {entry.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Persistent Polygon button — the primary tool and the
                only thing visible in the collapsed state. It never
                moves or swaps when the strip expands, so there is
                nothing to flicker: the same element you see closed is
                the one you click to arm Polygon. */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={polygonActive}
                  aria-label={POLYGON_ENTRY.label}
                  onClick={() => armTool(POLYGON_ENTRY.id)}
                  className={`grid size-5 shrink-0 place-items-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                    polygonActive
                      ? 'bg-white/[0.16] text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <POLYGON_ENTRY.Icon size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={8}
                className="text-[11px]"
              >
                {POLYGON_ENTRY.label}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </DirIsland>
    </TooltipProvider>
  );
}
