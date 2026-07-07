/**
 * Variant — command-style searchable picker.
 *
 * Single search input on the left filters tools by name; matched tools
 * appear as a horizontal chip row to the right of the input. Mirrors
 * Cmd-K / VS-Code style command palettes — the user types a few letters
 * ("no", "wall") and picks the highlighted result with click or Enter.
 *
 * The bar also shows recent quick-pick chips when the search is empty so
 * the surface doesn't feel inert at rest.
 */

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Search, X } from '@/lib/icons/central';
import { DRAWABLE_TOOLS } from '../drawTools';
import { SHAPE_ACTIONS } from './actions';
import type { ToolbarProps } from './types';

export function ToolbarCommand({
  activeToolId,
  onSelectTool,
  selectedShape,
  onAction,
  className,
}: ToolbarProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DRAWABLE_TOOLS;
    return DRAWABLE_TOOLS.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [query]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && matches.length > 0) {
      e.preventDefault();
      onSelectTool(matches[0].id);
      setQuery('');
    } else if (e.key === 'Escape' && query) {
      e.preventDefault();
      setQuery('');
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border-default bg-surface-2/90 p-1.5 shadow-md backdrop-blur-md">
        {/* Search input */}
        <div className="flex min-w-[180px] items-center gap-1.5 rounded border border-border-subtle bg-surface-1 px-2 py-1">
          <Search size={12} className="text-slate-9" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search drawing tools…"
            className="w-32 bg-transparent text-xs text-slate-12 outline-none placeholder:text-slate-9"
            aria-label="Search drawing tools"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="grid size-4 place-items-center rounded text-slate-9 hover:bg-state-hover-strong hover:text-slate-12"
            >
              <X size={10} />
            </button>
          )}
        </div>

        {/* Match chips. When the query is empty this acts as a quick-pick row. */}
        <div className="flex flex-wrap items-center gap-1">
          {matches.length === 0 ? (
            <span className="text-xs-plus text-slate-9">No tools match "{query}"</span>
          ) : (
            matches.map((tool, i) => {
              const active = tool.id === activeToolId;
              const isTopMatch = i === 0 && query.trim().length > 0;
              return (
                <button
                  key={tool.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    onSelectTool(tool.id);
                    setQuery('');
                  }}
                  className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs-plus font-medium transition-colors ${
                    active
                      ? 'border-border-strong bg-state-hover-strong text-slate-12'
                      : isTopMatch
                        ? 'border-border-strong bg-surface-3 text-slate-12'
                        : 'border-border-default bg-surface-1 text-slate-11 hover:border-border-strong hover:bg-state-hover-strong'
                  }`}
                  style={active ? { color: tool.color } : undefined}
                >
                  <tool.Icon size={12} />
                  <span>{tool.label}</span>
                  {isTopMatch && !active && (
                    <span className="ms-0.5 rounded bg-surface-4 px-1 font-mono text-3xs uppercase tracking-wide text-slate-9">
                      ↵
                    </span>
                  )}
                </button>
              );
            })
          )}
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
