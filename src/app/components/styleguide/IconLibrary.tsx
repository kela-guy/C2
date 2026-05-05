/**
 * Icon Library — searchable, filterable grid of every glyph in the product.
 *
 * Layout breakdown:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Search input                  Size toggle (16/20/24)       │
 *   │  Source chips (All · Lucide · Tactical · Map · Product…)    │
 *   ├──────────────────────────────────┬──────────────────────────┤
 *   │  Grid (auto-fit min 120px)       │  IconDetailPanel         │
 *   │  – tile = preview + name + src   │  (when selected)         │
 *   └──────────────────────────────────┴──────────────────────────┘
 *
 * Search is `useDeferredValue`-debounced so typing stays snappy even with
 * the full registry mounted. Selected entry id is the only piece of state
 * that changes between key presses. The panel mounts with a fixed Component
 * preview to avoid re-rendering the whole grid for size or selection
 * changes.
 */

import {
  useState,
  useMemo,
  useCallback,
  useDeferredValue,
  useRef,
  useEffect,
  type KeyboardEvent,
} from 'react';
import { Copy, Download, Image as ImageIcon, Search, X } from 'lucide-react';
import {
  ICON_REGISTRY,
  SEARCHABLE_REGISTRY,
  getRegistryCounts,
  type IconEntry,
  type IconSource,
} from '@/lib/iconRegistry';
import { ICON_PREVIEW_SIZES, type IconPreviewSize } from '@/lib/iconTokens';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/app/components/ui/context-menu';
import { IconDetailPanel } from './IconDetailPanel';
import { useIconExportActions } from './useIconExportActions';

type Filter = IconSource | 'all';

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  lucide: 'Lucide',
  tactical: 'Tactical',
  map: 'Map',
  product: 'Product',
  asset: 'Asset files',
};

const FILTER_ORDER: Filter[] = ['all', 'lucide', 'tactical', 'map', 'product', 'asset'];

/**
 * Render style for icon previews. `line` keeps every glyph at its native
 * default (lucide stroked, product/tactical drawn as authored). `fill`
 * passes `fill="currentColor"` to the underlying component, which causes
 * lucide icons to render as filled silhouettes — the visible change users
 * care about. Custom React glyphs that already accept a `fill` prop are
 * re-tinted; ones that hard-code their fill simply ignore it. Static SVG
 * assets ignore the toggle entirely (we never touch the on-disk file).
 */
export type RenderMode = 'line' | 'fill';

const RENDER_MODES: { value: RenderMode; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'fill', label: 'Fill' },
];

export default function IconLibrary() {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [previewSize, setPreviewSize] = useState<IconPreviewSize>(20);
  const [renderMode, setRenderMode] = useState<RenderMode>('line');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => getRegistryCounts(), []);

  const visibleEntries = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return SEARCHABLE_REGISTRY.filter(({ entry, haystack }) => {
      if (filter !== 'all' && entry.source !== filter) return false;
      if (q.length === 0) return true;
      return haystack.includes(q);
    }).map(({ entry }) => entry);
  }, [filter, deferredQuery]);

  const selected = useMemo(
    () => (selectedId ? ICON_REGISTRY.find((e) => e.id === selectedId) ?? null : null),
    [selectedId],
  );

  // Global "/" focus shortcut — convenience that matches the muscle memory
  // from the rest of the styleguide search.
  useEffect(() => {
    function handleGlobalKey(e: globalThis.KeyboardEvent) {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const handleSearchKey = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && query.length > 0) {
      setQuery('');
      e.preventDefault();
    }
  }, [query]);

  const handleReset = useCallback(() => {
    setFilter('all');
    setQuery('');
    setSelectedId(null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-n-120 pointer-events-none" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Search icons by name, keyword, or source… (press /)"
            className="w-full pl-9 pr-9 py-2 text-[13px] bg-white/[0.03] rounded-md text-n-12 placeholder:text-n-120 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] transition-shadow duration-150"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-n-120 hover:text-n-11 hover:bg-white/[0.08] transition-[color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div role="radiogroup" aria-label="Preview size" className="flex items-center gap-1">
            <span className="text-[11px] uppercase tracking-wider text-n-120 mr-1">Size</span>
            {ICON_PREVIEW_SIZES.map((size) => {
              const active = size === previewSize;
              return (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPreviewSize(size)}
                  className={`px-2.5 py-1 text-[12px] font-mono rounded-md transition-[color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25
                    ${active
                      ? 'bg-white/[0.10] text-n-12 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]'
                      : 'bg-white/[0.02] text-n-10 hover:bg-white/[0.06]'}`}
                >
                  {size}
                </button>
              );
            })}
          </div>

          <div role="radiogroup" aria-label="Render style" className="flex items-center gap-1">
            <span className="text-[11px] uppercase tracking-wider text-n-120 mr-1">Style</span>
            {RENDER_MODES.map(({ value, label }) => {
              const active = value === renderMode;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRenderMode(value)}
                  className={`px-2.5 py-1 text-[12px] rounded-md transition-[color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25
                    ${active
                      ? 'bg-white/[0.10] text-n-12 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]'
                      : 'bg-white/[0.02] text-n-10 hover:bg-white/[0.06]'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTER_ORDER.map((f) => {
          const active = f === filter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className={`px-2.5 py-1 text-[12px] rounded-md transition-[color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25
                ${active
                  ? 'bg-white/[0.10] text-n-12 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]'
                  : 'bg-white/[0.02] text-n-10 hover:bg-white/[0.06]'}`}
            >
              {FILTER_LABELS[f]}
              <span className="ml-1.5 text-[11px] text-n-120">{counts[f]}</span>
            </button>
          );
        })}
      </div>

      {/*
        Sticky sidebar: scroll container is `<main id="top" overflow-y-auto>`
        in StyleguidePage, so `lg:top-4` is relative to that. flex-row +
        items-start lets the aside keep its intrinsic height while the
        long icon grid extends the row, giving sticky a real range.
      */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {visibleEntries.length === 0 ? (
            <EmptyState onReset={handleReset} />
          ) : (
            <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(120px,1fr))]">
              {visibleEntries.map((entry) => (
                <IconTile
                  key={entry.id}
                  entry={entry}
                  size={previewSize}
                  renderMode={renderMode}
                  selected={entry.id === selectedId}
                  onSelect={() => setSelectedId(entry.id === selectedId ? null : entry.id)}
                />
              ))}
            </div>
          )}
        </div>

        {selected && (
          <aside className="lg:sticky lg:top-4 lg:w-[320px] lg:shrink-0">
            <IconDetailPanel
              entry={selected}
              previewSize={previewSize}
              renderMode={renderMode}
              onClose={() => setSelectedId(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

interface IconTileProps {
  entry: IconEntry;
  size: number;
  renderMode: RenderMode;
  selected: boolean;
  onSelect: () => void;
}

function IconTile({ entry, size, renderMode, selected, onSelect }: IconTileProps) {
  const Component = entry.Component;
  // Lucide's official "filled icon" recipe is `fill="currentColor"` plus
  // `strokeWidth={0}` (the stroke would otherwise sit on top of the fill and
  // double the silhouette). We only apply it to icons we've curated as
  // fill-friendly — pure-line icons (arrows, chevrons, X) keep the line render.
  const useFill = renderMode === 'fill' && entry.fillable === true;

  // Right-click menu mirrors the IconDetailPanel's three exports so users
  // can grab a glyph without first opening the panel. Uses the same shared
  // recipe so output is identical to what the panel would produce.
  const { busy, copy, downloadSvg, downloadPng } = useIconExportActions(
    entry,
    size,
    renderMode,
    256,
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          title={entry.name}
          className={`group flex flex-col items-center justify-between gap-2 aspect-[1/1] rounded-lg p-2 text-n-10 transition-[color,background-color,box-shadow] duration-150 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25
            ${selected
              ? 'bg-white/[0.08] text-n-12 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]'
              : 'bg-white/[0.02] hover:bg-white/[0.05] hover:text-n-11 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]'}`}
        >
          <div className="flex-1 flex items-center justify-center w-full text-white">
            {Component ? (
              <Component
                size={size}
                strokeWidth={useFill ? 0 : 1.75}
                color="currentColor"
                fill={useFill ? 'currentColor' : undefined}
              />
            ) : entry.assetUrl ? (
              <img
                src={entry.assetUrl}
                alt=""
                width={size}
                height={size}
                loading="lazy"
                decoding="async"
              />
            ) : null}
          </div>
          <span className="block w-full text-[10px] font-mono text-center truncate">
            {entry.name}
          </span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[180px]">
        <ContextMenuLabel className="truncate">{entry.name}</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={copy} disabled={busy === 'copy'}>
          <Copy />
          Copy SVG
        </ContextMenuItem>
        <ContextMenuItem onSelect={downloadSvg} disabled={busy === 'svg'}>
          <Download />
          Download SVG
        </ContextMenuItem>
        <ContextMenuItem onSelect={downloadPng} disabled={busy === 'png'}>
          <ImageIcon />
          Download PNG
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

interface EmptyStateProps {
  onReset: () => void;
}

function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-[240px] rounded-lg bg-white/[0.02] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] text-center px-6">
      <p className="text-[13px] text-n-9">No icons match — try clearing the category.</p>
      <button
        type="button"
        onClick={onReset}
        className="px-3 py-1.5 text-[12px] font-medium text-n-12 bg-white/[0.06] hover:bg-white/[0.10] rounded-md transition-[color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
      >
        Reset filters
      </button>
    </div>
  );
}
