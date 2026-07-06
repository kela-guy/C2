/**
 * Map-draw tools — Photoshop-style vertical icon palette docked to the
 * inline-start edge of the map (just beside the open drawing panel).
 *
 * Replaces the in-panel `ToolsSection` that used to live inside
 * {@link MapDrawPanel}. Surfacing the tools on the map keeps the panel
 * focused on per-shape editing (Name / Type / Color / Layers) while the
 * tool affordance reads as "this is a drawing surface" the way every
 * graphics editor (Photoshop, Figma, Sketch) does.
 *
 * Layout: a single-column stack of icon-only buttons; a Select cursor on
 * top, then the four drawing geometries (Polygon / Line / Arrow /
 * Circle / Pin). The active tool gets a lit pressed state; hover shows
 * a tooltip with the tool's label.
 *
 * Reads/mutates `useMapDraw()` directly, so mounting it inside the
 * `<MapDrawProvider>` is enough — no props beyond the optional inline
 * offset that pushes it past the open panel.
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import { ArrowUpRight, MapPin, type IconProps } from '@/lib/icons/central';
import { DirIsland } from '@/lib/direction/DirIsland';
import type { ComponentType, SVGProps } from 'react';
import { CircleDrawIcon, LineDrawIcon, PolygonDrawIcon } from './icons';
import { useMapDraw, type MapDrawTool } from './MapDrawProvider';

export interface MapDrawToolbarProps {
  /**
   * Inline-start offset (CSS px) — typically the width of the open
   * drawing panel so the toolbar sits just to the right of it (or
   * just to the left, in RTL). Defaults to 0 if the panel isn't
   * docked next to the map.
   */
  inlineStartOffset?: number;
}

type ToolEntry =
  | {
      kind: 'tool';
      id: MapDrawTool;
      label: string;
      Icon: ComponentType<IconProps> | ((props: { size?: number } & SVGProps<SVGSVGElement>) => JSX.Element);
    }
  | {
      kind: 'select';
      label: string;
      Icon: ComponentType<IconProps> | ((props: { size?: number } & SVGProps<SVGSVGElement>) => JSX.Element);
    };

const ENTRIES: ToolEntry[] = [
  { kind: 'select', label: 'Select', Icon: SelectCursorIcon },
  { kind: 'tool', id: 'polygon', label: 'Polygon', Icon: PolygonDrawIcon },
  { kind: 'tool', id: 'line', label: 'Line', Icon: LineDrawIcon },
  { kind: 'tool', id: 'arrow', label: 'Arrow', Icon: ArrowUpRight },
  { kind: 'tool', id: 'circle', label: 'Circle', Icon: CircleDrawIcon },
  { kind: 'tool', id: 'point', label: 'Pin', Icon: MapPin },
];

export function MapDrawToolbar({ inlineStartOffset = 0 }: MapDrawToolbarProps) {
  const { drawTool, setDrawTool } = useMapDraw();

  return (
    <TooltipProvider delayDuration={150}>
      {/* Pin the toolbar to LTR so `insetInlineStart` always anchors on
          the left edge of the map (Photoshop convention) regardless of
          the app's global Hebrew direction — and tooltips that open
          `side="right"` keep flying out to the right of the buttons. */}
      <DirIsland direction="ltr">
      <div
        role="toolbar"
        aria-label="Drawing tools"
        className="pointer-events-auto absolute top-3 z-30 flex flex-col items-stretch gap-0.5 rounded-md border border-white/10 bg-black/70 p-1 shadow-lg backdrop-blur-md"
        style={{ insetInlineStart: inlineStartOffset + 12 }}
      >
        {ENTRIES.map((entry) => {
          const isSelect = entry.kind === 'select';
          const active = isSelect ? drawTool === null : drawTool === entry.id;
          return (
            <Tooltip key={isSelect ? 'select' : entry.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={entry.label}
                  title={entry.label}
                  onClick={() => {
                    if (isSelect) {
                      setDrawTool(null);
                    } else {
                      // Re-clicking the active tool drops back into Select
                      // mode — matches the in-panel ToolPicker behaviour
                      // the toolbar replaces.
                      setDrawTool(active ? null : entry.id);
                    }
                  }}
                  className={`grid size-8 place-items-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                    active
                      ? 'bg-white/[0.16] text-white ring-1 ring-inset ring-white/25'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <entry.Icon size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="text-[11px]">
                {entry.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      </DirIsland>
    </TooltipProvider>
  );
}

/**
 * Bespoke cursor/arrow glyph for the Select tool. The Central icon set
 * doesn't ship a classic pointer-arrow; the closest match (`Crosshair`)
 * is actually a target reticle, which reads as "aiming" instead of
 * "pick". This SVG is the standard mouse-arrow pointer used by graphics
 * editors so the toolbar's resting state reads correctly.
 */
function SelectCursorIcon({ size = 16, ...rest }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      {...rest}
    >
      <path d="M5 3.2 L5 18.6 L9.1 14.7 L11.4 19.9 L13.7 18.9 L11.4 13.6 L17.2 13.6 Z" />
    </svg>
  );
}
