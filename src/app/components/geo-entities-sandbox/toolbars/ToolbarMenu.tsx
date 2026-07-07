/**
 * Variant — single "+" trigger that opens a named dropdown menu of tools.
 *
 * Minimum chrome at rest: just an "Add shape" trigger. Clicking it opens a
 * `DropdownMenu` listing each drawing tool by name with its icon and a
 * one-liner subtitle. There's no Select tool button — clicking a shape on
 * the canvas is the selection gesture. Once a shape is selected the action
 * row appears inline next to the trigger, labeled.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { ChevronDown, Plus } from '@/lib/icons/central';
import { DRAWABLE_TOOLS } from '../drawTools';
import { SHAPE_ACTIONS } from './actions';
import type { ToolbarProps } from './types';

export function ToolbarMenu({
  activeToolId,
  onSelectTool,
  selectedShape,
  onAction,
  className,
}: ToolbarProps) {
  const activeDrawable = DRAWABLE_TOOLS.find((t) => t.id === activeToolId);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border-default bg-surface-2/90 p-1.5 shadow-md backdrop-blur-md">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-haspopup="menu"
              className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium transition-colors ${
                activeDrawable
                  ? 'border-border-strong bg-state-hover-strong text-slate-12'
                  : 'border-border-default text-slate-11 hover:border-border-strong hover:bg-state-hover-strong'
              }`}
              style={activeDrawable ? { color: activeDrawable.color } : undefined}
            >
              {activeDrawable ? (
                <activeDrawable.Icon size={14} />
              ) : (
                <Plus size={14} />
              )}
              {activeDrawable ? activeDrawable.label : 'Add shape'}
              {/*
                The button is a dropdown trigger — show a chevron so the
                affordance is explicit even when an active tool's name and
                glyph have replaced the default "+ Add shape" content.
              */}
              <ChevronDown size={12} className="ms-0.5 text-slate-9" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            <DropdownMenuLabel>Drawing tools</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DRAWABLE_TOOLS.map((tool) => (
              <DropdownMenuItem
                key={tool.id}
                onSelect={() => onSelectTool(tool.id)}
                className="gap-3"
              >
                <span
                  aria-hidden
                  className="grid size-6 place-items-center rounded"
                  style={{ background: `${tool.color}33`, color: tool.color }}
                >
                  <tool.Icon size={14} />
                </span>
                <div className="flex flex-col">
                  <span className="text-xs">{tool.label}</span>
                  <span className="text-2xs text-slate-9">{tool.description}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedShape && (
          <>
            <span aria-hidden className="mx-1 h-5 w-px bg-border-default" />
            {SHAPE_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onAction(a.id)}
                className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs-plus font-medium transition-colors ${
                  a.tone === 'caution'
                    ? 'text-rose-300 hover:bg-rose-500/15'
                    : 'text-slate-10 hover:bg-state-hover-strong hover:text-slate-12'
                }`}
              >
                <a.Icon size={12} />
                {a.label}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
