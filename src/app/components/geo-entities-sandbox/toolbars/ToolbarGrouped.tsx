/**
 * Variant — grouped/segmented bar with labels.
 *
 * Drawing tools cluster by purpose with a faint group label above each
 * cluster (Areas / Lines / Points / Free). No Select cursor segment —
 * clicking on a shape on the canvas is the selection gesture. The action
 * row appears below the segmented bar when a shape is selected, also
 * grouped (Manipulate / Edit / Destructive).
 */

import { useMemo } from 'react';
import { DRAWABLE_TOOLS, type ToolDescriptor } from '../drawTools';
import { SHAPE_ACTIONS } from './actions';
import type { ToolbarActionId, ToolbarProps } from './types';

const TOOL_GROUP_ORDER: ReadonlyArray<{ id: ToolDescriptor['group']; label: string }> = [
  { id: 'areas', label: 'Areas' },
  { id: 'lines', label: 'Lines' },
  { id: 'points', label: 'Points' },
  { id: 'free', label: 'Free' },
];

const ACTION_GROUP_ORDER: ReadonlyArray<{ label: string; ids: ToolbarActionId[] }> = [
  { label: 'Manipulate', ids: ['move', 'rotate', 'scale'] },
  { label: 'Edit', ids: ['rename', 'description', 'color', 'coords'] },
  { label: 'Destructive', ids: ['delete'] },
];

export function ToolbarGrouped({
  activeToolId,
  onSelectTool,
  selectedShape,
  onAction,
  className,
}: ToolbarProps) {
  const grouped = useMemo(() => {
    return TOOL_GROUP_ORDER.map((group) => ({
      ...group,
      tools: DRAWABLE_TOOLS.filter((t) => t.group === group.id),
    })).filter((g) => g.tools.length > 0);
  }, []);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-stretch gap-3 rounded-md border border-border-default bg-surface-2/90 p-2 shadow-md backdrop-blur-md">
        {grouped.map((group, gi) => (
          <div key={group.id} className="flex">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-9">
                {group.label}
              </span>
              <div className="flex items-center gap-0.5 rounded border border-border-subtle bg-surface-1 p-0.5">
                {group.tools.map((tool) => {
                  const active = tool.id === activeToolId;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onSelectTool(tool.id)}
                      className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                        active
                          ? 'bg-state-hover-strong text-slate-12'
                          : 'text-slate-10 hover:bg-state-hover-strong hover:text-slate-12'
                      }`}
                      style={active ? { color: tool.color } : undefined}
                    >
                      <tool.Icon size={12} />
                      <span>{tool.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {gi < grouped.length - 1 && (
              <span aria-hidden className="ms-3 self-stretch w-px bg-border-default" />
            )}
          </div>
        ))}
      </div>

      {selectedShape && (
        <div className="mt-2 flex flex-wrap items-stretch gap-3 rounded-md border border-border-default bg-surface-2/90 p-2 shadow-md backdrop-blur-md">
          {ACTION_GROUP_ORDER.map((group, gi) => {
            const items = SHAPE_ACTIONS.filter((a) => group.ids.includes(a.id));
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="flex">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-9">
                    {group.label}
                  </span>
                  <div className="flex items-center gap-0.5 rounded border border-border-subtle bg-surface-1 p-0.5">
                    {items.map((a) => (
                      <button
                        key={a.id}
                        type="button"
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
                    ))}
                  </div>
                </div>
                {gi < ACTION_GROUP_ORDER.length - 1 && (
                  <span aria-hidden className="ms-3 self-stretch w-px bg-border-default" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
