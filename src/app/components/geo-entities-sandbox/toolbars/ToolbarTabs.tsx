/**
 * Variant — tabs by category.
 *
 * The toolbar is split into two rows: a tab strip across the top picks a
 * category (Areas / Lines / Points / Free), and below it the tools for the
 * active category render as labeled buttons. This trades horizontal space
 * for a two-step pick — useful when more drawing tools land later because
 * the second row stays at the same width regardless of total tool count.
 *
 * The active category auto-syncs with the active tool, so picking
 * "No Fly Zone" from elsewhere flips this variant onto the Areas tab.
 */

import { useEffect, useMemo, useState } from 'react';
import { DRAWABLE_TOOLS, type ToolDescriptor } from '../drawTools';
import { SHAPE_ACTIONS } from './actions';
import type { ToolbarProps } from './types';

const CATEGORY_ORDER: ReadonlyArray<{ id: ToolDescriptor['group']; label: string }> = [
  { id: 'areas', label: 'Areas' },
  { id: 'lines', label: 'Lines' },
  { id: 'points', label: 'Points' },
  { id: 'free', label: 'Free' },
];

export function ToolbarTabs({
  activeToolId,
  onSelectTool,
  selectedShape,
  onAction,
  className,
}: ToolbarProps) {
  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map((c) => ({
        ...c,
        tools: DRAWABLE_TOOLS.filter((t) => t.group === c.id),
      })).filter((g) => g.tools.length > 0),
    [],
  );

  const activeTool = DRAWABLE_TOOLS.find((t) => t.id === activeToolId);
  const [activeCategory, setActiveCategory] = useState<ToolDescriptor['group']>(
    activeTool?.group ?? groups[0].id,
  );

  // Auto-flip the tab when the active tool's category changes (e.g. tool
  // picked from elsewhere, or auto-snap-back to select after commit).
  useEffect(() => {
    if (activeTool) setActiveCategory(activeTool.group);
  }, [activeTool]);

  const visible = groups.find((g) => g.id === activeCategory) ?? groups[0];

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-md border border-border-default bg-surface-2/90 shadow-md backdrop-blur-md">
        {/* Tab strip */}
        <div
          role="tablist"
          aria-label="Drawing tool categories"
          className="flex items-center gap-0 border-b border-border-subtle bg-surface-1/60 px-1 pt-1"
        >
          {groups.map((g) => {
            const isActive = g.id === activeCategory;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(g.id)}
                className={`relative px-3 py-1.5 text-xs-plus font-medium transition-colors ${
                  isActive
                    ? 'text-slate-12'
                    : 'text-slate-9 hover:text-slate-11'
                }`}
              >
                {g.label}
                <span className="ms-1 font-mono text-2xs text-slate-9">
                  {g.tools.length}
                </span>
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-slate-12"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tools row for the active category */}
        <div role="tabpanel" className="flex flex-wrap items-center gap-1 p-1.5">
          {visible.tools.map((tool) => {
            const active = tool.id === activeToolId;
            return (
              <button
                key={tool.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectTool(tool.id)}
                className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-state-hover-strong text-slate-12'
                    : 'text-slate-10 hover:bg-state-hover-strong hover:text-slate-12'
                }`}
                style={active ? { color: tool.color } : undefined}
              >
                <tool.Icon size={14} />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedShape && (
        <div className="mt-2 flex flex-wrap items-center gap-1 rounded-md border border-border-default bg-surface-2/90 p-1.5 shadow-md backdrop-blur-md">
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
