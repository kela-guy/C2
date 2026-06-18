/**
 * Variant — "For Cursor" expand-trigger geometry picker.
 *
 * Mirrors the Paper prototype (file 01KTNYW1RDA8Q5WS9BEC0G35C5, artboard
 * "For Cursor"): the user picks the underlying shape first (Polygon /
 * Line / Curve), not a semantic role.
 *
 * Resting state is a single tool button that reads as the currently
 * active geometry — its icon is whichever of the three is selected
 * (defaults to Polygon when the user is in `select` mode). Clicking the
 * button reveals the two other geometric options to the right, in a
 * compact horizontal row. Picking one switches the active tool and
 * collapses the row back to a single trigger.
 *
 * The selected-shape action row reuses the shared {@link SHAPE_ACTIONS}
 * registry, which now includes the dedicated Save action.
 */

import { useEffect, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { ChevronRight } from '@/lib/icons/central';
import { GEOMETRY_TOOLS } from '../drawTools';
import { SHAPE_ACTIONS } from './actions';
import type { ToolbarProps } from './types';

/** Geometry shown in the collapsed trigger when no geometric tool is active. */
const DEFAULT_GEOMETRY_ID = 'polygon';

export function ToolbarForCursor({
  activeToolId,
  onSelectTool,
  selectedShape,
  onAction,
  className,
}: ToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Whichever geometry is currently active drives the trigger glyph. When
  // the user is in `select` (or any non-geometric tool), we still need a
  // resting glyph — fall back to the default geometry.
  const activeGeometry =
    GEOMETRY_TOOLS.find((t) => t.id === activeToolId) ??
    GEOMETRY_TOOLS.find((t) => t.id === DEFAULT_GEOMETRY_ID) ??
    GEOMETRY_TOOLS[0];

  const isGeometryActive = GEOMETRY_TOOLS.some((t) => t.id === activeToolId);

  // Click outside collapses the row so the resting state can return to
  // a single button — matches the Paper design's tight footprint.
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  const handleTriggerClick = () => {
    // First click on a non-active trigger commits to the active geometry
    // AND opens the row so the user can hop to a different one without a
    // second tap. If the active geometry is already selected, just toggle
    // the row.
    if (!isGeometryActive) {
      onSelectTool(activeGeometry.id);
    }
    setExpanded((v) => !v);
  };

  const handlePick = (id: typeof GEOMETRY_TOOLS[number]['id']) => {
    onSelectTool(id);
    setExpanded(false);
  };

  return (
    <div className={className} ref={rootRef}>
      <div className="flex items-center gap-1 rounded-md border border-border-default bg-surface-2/90 p-1 shadow-md backdrop-blur-md w-fit">
        {/* Trigger: shows the active geometry's icon + label. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-pressed={isGeometryActive}
              aria-expanded={expanded}
              aria-haspopup="true"
              onClick={handleTriggerClick}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-[12px] font-medium transition-colors ${
                isGeometryActive
                  ? 'bg-state-hover-strong text-slate-12'
                  : 'text-slate-11 hover:bg-state-hover-strong hover:text-slate-12'
              }`}
              style={isGeometryActive ? { color: activeGeometry.color } : undefined}
            >
              <activeGeometry.Icon size={16} />
              <span>{activeGeometry.label}</span>
              <ChevronRight
                size={12}
                className={`ms-0.5 text-slate-9 transition-transform ${
                  expanded ? 'rotate-90' : ''
                }`}
                aria-hidden
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isGeometryActive ? activeGeometry.description : 'Pick a geometry'}
          </TooltipContent>
        </Tooltip>

        {/* Expand-row: the two other geometries appear inline. */}
        {expanded && (
          <>
            <span aria-hidden className="mx-0.5 h-5 w-px bg-border-default" />
            {GEOMETRY_TOOLS.filter((t) => t.id !== activeGeometry.id).map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={tool.label}
                    onClick={() => handlePick(tool.id)}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-[12px] font-medium text-slate-10 transition-colors hover:bg-state-hover-strong hover:text-slate-12"
                  >
                    <tool.Icon size={16} />
                    <span>{tool.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{tool.description}</TooltipContent>
              </Tooltip>
            ))}
          </>
        )}
      </div>

      {selectedShape && (
        <div className="mt-2 flex flex-wrap items-center gap-1 rounded-md border border-border-default bg-surface-2/90 p-1 shadow-md backdrop-blur-md w-fit">
          {SHAPE_ACTIONS.map((a) => (
            <Tooltip key={a.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={a.label}
                  onClick={() => onAction(a.id)}
                  className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    a.tone === 'caution'
                      ? 'text-rose-300 hover:bg-rose-500/15'
                      : 'text-slate-10 hover:bg-state-hover-strong hover:text-slate-12'
                  }`}
                >
                  <a.Icon size={12} />
                  <span>{a.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{a.hint}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}
