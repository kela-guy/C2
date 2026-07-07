/**
 * Variant — card-grid picker.
 *
 * The opposite end of the density spectrum from the icon row: each tool
 * gets a generous card with a tinted icon tile, the full name, and the
 * short description from the tool registry. Optimized for discoverability
 * — useful for first-time operators who haven't memorized which glyph maps
 * to which entity. Active card carries the tool's accent color as a left
 * spine.
 *
 * The action row stays compact below to leave the cards as the focal point.
 */

import { DRAWABLE_TOOLS } from '../drawTools';
import { SHAPE_ACTIONS } from './actions';
import type { ToolbarProps } from './types';

export function ToolbarCardPicker({
  activeToolId,
  onSelectTool,
  selectedShape,
  onAction,
  className,
}: ToolbarProps) {
  return (
    <div className={className}>
      <div className="rounded-md border border-border-default bg-surface-2/90 p-2 shadow-md backdrop-blur-md">
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
          {DRAWABLE_TOOLS.map((tool) => {
            const active = tool.id === activeToolId;
            return (
              <button
                key={tool.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectTool(tool.id)}
                className={`group relative flex items-start gap-2 overflow-hidden rounded border px-2.5 py-2 text-start transition-colors ${
                  active
                    ? 'border-border-strong bg-state-hover-strong'
                    : 'border-border-subtle bg-surface-1 hover:border-border-default hover:bg-state-hover-strong'
                }`}
              >
                {/* Accent spine for the active card */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 start-0 w-0.5"
                    style={{ background: tool.color }}
                  />
                )}
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded"
                  style={{
                    background: active ? `${tool.color}33` : `${tool.color}22`,
                    color: tool.color,
                  }}
                >
                  <tool.Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-xs font-medium ${
                      active ? 'text-slate-12' : 'text-slate-11'
                    }`}
                  >
                    {tool.label}
                  </p>
                  <p className="line-clamp-2 text-2xs text-slate-9">
                    {tool.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedShape && (
        <div className="mt-2 flex flex-wrap items-center gap-1 rounded-md border border-border-default bg-surface-2/90 p-1 shadow-md backdrop-blur-md">
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
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
