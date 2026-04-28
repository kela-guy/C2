import React, { useMemo, useState } from 'react';
import { ChevronDown, Search, TimerReset, X } from 'lucide-react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';

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

  // Lay filters across columns; reset takes the last cell.
  const colCount = filters.length + 1;

  return (
    <div className="border-b border-white/5 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search size={12} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            className="h-7 w-full rounded-md bg-white/[0.04] ps-7 pe-7 text-[11px] text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.07)] placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400/40 focus-visible:shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="absolute end-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-zinc-500 transition-colors duration-150 hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
              aria-label={clearSearchAriaLabel}
            >
              <X size={10} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div
        className="grid items-center gap-1.5 mt-1.5"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
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

        <button
          type="button"
          onClick={onReset}
          disabled={activeFilterCount === 0}
          className={`inline-flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded px-2 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.10] transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 active:scale-[0.97] ${
            activeFilterCount === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label={resetAriaLabel}
        >
          <TimerReset size={11} className="shrink-0" aria-hidden="true" />
          <span>{resetLabel}</span>
        </button>
      </div>
    </div>
  );
}

function FilterPopoverButton({
  open,
  onOpenChange,
  icon: Icon,
  label,
  value,
  active,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: React.ElementType;
  label: string;
  value: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-7 w-full items-center justify-center gap-1 rounded px-2 text-xs font-medium text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 active:scale-[0.97] ${
            active || open
              ? 'bg-sky-500/[0.12]'
              : 'bg-white/[0.06] hover:bg-white/[0.10]'
          }`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={label}
        >
          {Icon && <Icon size={11} className="shrink-0 opacity-80" aria-hidden="true" />}
          <span className="shrink-0">{label}</span>
          <span className="truncate text-end text-zinc-400 flex-1">{value}</span>
          <ChevronDown size={10} className={`shrink-0 opacity-50 ms-auto transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        className="w-64 origin-top-right overflow-hidden rounded-lg p-0.5 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      >
        <div className="overflow-y-auto p-0.5">{children}</div>
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
      <div className="px-3 py-4 text-center text-[10px] text-zinc-500">
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
            className={`flex h-7 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-end text-xs transition-colors duration-150 focus-within:bg-white/10 focus-within:outline-none ${
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
