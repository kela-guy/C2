import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from '@/lib/icons/central';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { useScrollEdges } from '@/lib/scroll/useScrollEdges';
import { ScrollEdgeCue } from '@/lib/scroll/ScrollEdgeCue';

export interface FilterOption {
  /** Unique identifier within the parent filter. */
  value: string;
  /** Human-readable label shown in the popover. */
  label: string;
  /** Optional leading icon for the option. */
  icon?: React.ElementType;
}

export interface FilterDef {
  /** Stable identifier — used as the key in the `selections` map. */
  id: string;
  /** Trigger label, shown on the filter button. */
  label: string;
  /** Optional leading icon for the trigger button. */
  icon?: React.ElementType;
  /** Available options for this filter. */
  options: FilterOption[];
  /** Optional label rendered when `options` is empty. Defaults to the bar's `emptyOptionsLabel`. */
  emptyLabel?: string;
  /**
   * Optional formatter for the filter trigger's secondary value (e.g. "All", "3 selected").
   * Receives the values currently selected for this filter.
   */
  summarize?: (selectedValues: string[], options: FilterOption[]) => string;
}

export interface FilterBarProps {
  /** Free-text query (search input). */
  query: string;
  onQueryChange: (next: string) => void;
  /** Filter definitions, in display order. */
  filters: FilterDef[];
  /** Map of filter `id` → array of selected option `value`s. */
  selections: Record<string, string[]>;
  /** Called whenever a filter's selection changes (full replacement of that filter's values). */
  onFilterChange: (filterId: string, nextValues: string[]) => void;
  /** Called when the user clicks reset. Should clear `query` and all `selections`. */
  onReset: () => void;
  /** i18n / generic copy. */
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  clearSearchAriaLabel?: string;
  resetLabel?: string;
  resetAriaLabel?: string;
  emptyOptionsLabel?: string;
  /** Default summary used when a `FilterDef` does not provide its own `summarize`. Receives selection count. */
  defaultSummary?: (selectedValues: string[], options: FilterOption[]) => string;
}

function ResetIcon({ size = 11, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M19.0272 12C19.0272 8.13401 15.8932 5 12.0272 5C10.6574 5 9.58239 5.32722 8.62515 5.91476C8.15098 6.20581 7.69545 6.56697 7.24144 7H9.99983V9H3.99983V3H5.99983V5.42237C6.49705 4.96215 7.01882 4.55402 7.57893 4.21024C8.86186 3.42278 10.3011 3 12.0272 3C16.9977 3 21.0272 7.02944 21.0272 12C21.0272 16.9706 16.9977 21 12.0272 21C8.10696 21 4.77458 18.4941 3.53955 14.9999L5.42523 14.3334C6.38666 17.0536 8.98089 19 12.0272 19C15.8932 19 19.0272 15.866 19.0272 12Z"
        fill="currentColor"
      />
    </svg>
  );
}

const DEFAULT_SUMMARY = (selectedValues: string[], options: FilterOption[]) => {
  if (selectedValues.length === 0) return 'All';
  if (selectedValues.length === 1) {
    const opt = options.find((o) => o.value === selectedValues[0]);
    return opt?.label ?? '1 selected';
  }
  return `${selectedValues.length} selected`;
};

export function FilterBar({
  query,
  onQueryChange,
  filters,
  selections,
  onFilterChange,
  onReset,
  searchPlaceholder = 'Search…',
  searchAriaLabel = 'Search',
  clearSearchAriaLabel = 'Clear search',
  resetLabel = 'Reset',
  resetAriaLabel = 'Reset filters',
  emptyOptionsLabel = 'No options',
  defaultSummary = DEFAULT_SUMMARY,
}: FilterBarProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const activeFilterCount = useMemo(() => {
    let n = query.trim() === '' ? 0 : 1;
    for (const f of filters) n += (selections[f.id]?.length ?? 0) > 0 ? 1 : 0;
    return n;
  }, [filters, selections, query]);

  const toggleValue = (filterId: string, value: string) => {
    const current = selections[filterId] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange(filterId, next);
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="border-b border-white/5 px-2 py-1.5" data-handoff-component="filter-bar">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search size={12} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            className="h-7 w-full rounded bg-white/[0.04] ps-7 pe-7 text-xs text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.07)] placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400/40 focus-visible:shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="absolute end-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-zinc-500 transition-colors duration-150 before:absolute before:-inset-2 before:content-[''] hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
              aria-label={clearSearchAriaLabel}
            >
              <X size={10} aria-hidden="true" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded bg-white/[0.06] px-2 text-xs font-medium text-white transition-[background-color,transform] duration-150 hover:bg-white/[0.10] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 active:scale-[0.99] motion-reduce:active:scale-100 animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
            aria-label={resetAriaLabel}
          >
            <ResetIcon size={11} className="shrink-0" />
            <span>{resetLabel}</span>
          </button>
        )}
      </div>

      {filters.length > 0 && (
        <div
          className="grid items-center gap-1.5 mt-1.5"
          style={{ gridTemplateColumns: `repeat(${filters.length}, minmax(0, 1fr))` }}
        >
          {filters.map((def) => {
            const selected = selections[def.id] ?? [];
            const summarize = def.summarize ?? defaultSummary;
            const value = summarize(selected, def.options);
            return (
              <FilterPopoverButton
                key={def.id}
                open={openId === def.id}
                onOpenChange={(open) => setOpenId(open ? def.id : null)}
                icon={def.icon}
                label={def.label}
                value={value}
                active={selected.length > 0}
              >
                <MultiSelectList
                  items={def.options}
                  selected={selected}
                  onToggle={(v) => toggleValue(def.id, v)}
                  emptyLabel={def.emptyLabel ?? emptyOptionsLabel}
                />
              </FilterPopoverButton>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterPopoverButton({
  open,
  onOpenChange,
  label,
  value,
  active,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Accepted for backward compatibility with existing `FilterDef.icon`
   * configurations but intentionally not rendered — the trigger reads
   * cleaner with just `label / value / chevron`.
   */
  icon?: React.ElementType;
  label: string;
  value: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges({ ref: bodyRef, enabled: open });
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-7 w-full cursor-pointer items-center justify-center gap-1.5 rounded px-2 text-xs font-medium text-white transition-[background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 active:scale-[0.99] motion-reduce:active:scale-100 ${
            active || open
              ? 'bg-sky-500/[0.12]'
              : 'bg-white/[0.06] hover:bg-white/[0.10]'
          }`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={label}
        >
          <span className="shrink-0">{label}</span>
          <span className="flex-1 truncate text-end text-zinc-400 tabular-nums">{value}</span>
          <ChevronDown
            size={10}
            className={`ms-auto shrink-0 opacity-50 transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        // Anchor to the trigger's inline-start edge: the popover's start
        // edge lines up with the trigger's start edge and the menu grows
        // toward inline-end. Floating-UI is RTL-aware (it reads
        // `direction: rtl` from the trigger), so this resolves to
        // left-edge alignment in LTR and right-edge alignment in RTL —
        // mirroring the filter bar's position inside the start-anchored
        // sidebar. The RTL transform-origin override in
        // `src/styles/theme.css` keeps the zoom-in animation rooted at
        // the corner adjacent to the trigger.
        align="start"
        sideOffset={4}
        className="w-64 overflow-hidden rounded-lg p-0.5 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.25),0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl [transform-origin:var(--radix-popover-content-transform-origin)] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[state=open]:duration-150 data-[state=closed]:duration-100"
      >
        <div className="relative">
          <div ref={bodyRef} className="max-h-[min(60vh,20rem)] overflow-y-auto p-0.5">{children}</div>
          <ScrollEdgeCue edge="top" visible={edges.top} surfaceLevel="level2" size="tight" />
          <ScrollEdgeCue edge="bottom" visible={edges.bottom} surfaceLevel="level2" size="tight" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MultiSelectList({
  items,
  selected,
  onToggle,
  emptyLabel,
}: {
  items: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  emptyLabel: string;
}) {
  const listId = React.useId();

  if (items.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-xs text-zinc-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = selected.includes(item.value);
        const fieldId = `${listId}-${item.value}`;
        const ItemIcon = item.icon;
        return (
          <label
            key={item.value}
            htmlFor={fieldId}
            className={`flex h-7 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-start text-xs transition-colors duration-150 focus-within:bg-white/10 focus-within:outline-none ${
              active
                ? 'text-sky-100'
                : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <Checkbox
              id={fieldId}
              checked={active}
              onCheckedChange={() => onToggle(item.value)}
              className="size-3 shrink-0 rounded-[3px] border-white/10 !bg-transparent !shadow-none data-[state=checked]:!border-sky-400/40 data-[state=checked]:!bg-sky-500/20 data-[state=checked]:!text-sky-200 [&_svg]:size-2 [&_svg]:stroke-[3]"
            />
            {ItemIcon && <ItemIcon size={12} className="shrink-0 opacity-80" aria-hidden="true" />}
            <span className="flex-1 truncate">{item.label}</span>
          </label>
        );
      })}
    </div>
  );
}
