/**
 * Variant 1 — icon-only horizontal bar.
 *
 * The tightest reading of "tools on a line": every drawing tool collapses to
 * a single 32px icon button with a hover/focus tooltip carrying the full
 * name. There is no Select cursor button — clicking on a shape on the canvas
 * is itself the selection gesture. The post-creation action row appears
 * directly below as a second icon strip whenever a shape is selected.
 */

import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { DRAWABLE_TOOLS } from '../drawTools';
import { SHAPE_ACTIONS } from './actions';
import type { ToolbarProps } from './types';

export function ToolbarIconRow({
  activeToolId,
  onSelectTool,
  selectedShape,
  onAction,
  className,
}: ToolbarProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1 rounded-md border border-border-default bg-surface-2/90 p-1 shadow-md backdrop-blur-md">
        {DRAWABLE_TOOLS.map((tool) => {
          const active = tool.id === activeToolId;
          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={tool.label}
                  onClick={() => onSelectTool(tool.id)}
                  className={`grid size-8 place-items-center rounded transition-colors ${
                    active
                      ? 'bg-state-hover-strong text-slate-12'
                      : 'text-slate-10 hover:bg-state-hover-strong hover:text-slate-12'
                  }`}
                  style={active ? { color: tool.color } : undefined}
                >
                  <tool.Icon size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{tool.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {selectedShape && (
        <div className="mt-2 flex items-center gap-1 rounded-md border border-border-default bg-surface-2/90 p-1 shadow-md backdrop-blur-md">
          {SHAPE_ACTIONS.map((a) => (
            <Tooltip key={a.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={a.label}
                  onClick={() => onAction(a.id)}
                  className={`grid size-7 place-items-center rounded transition-colors ${
                    a.tone === 'caution'
                      ? 'text-rose-300 hover:bg-rose-500/15'
                      : 'text-slate-10 hover:bg-state-hover-strong hover:text-slate-12'
                  }`}
                >
                  <a.Icon size={14} />
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
