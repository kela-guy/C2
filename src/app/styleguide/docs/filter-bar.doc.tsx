/**
 * Co-located doc module for the FilterBar block — search input plus
 * data-driven filter dropdowns. Meta lives in `registry/manifest.json`.
 */
import { useState } from 'react';
import { Camera, Radar, Radio, Zap } from '@/lib/icons/central';
import { FilterBar, type FilterDef } from '@/primitives';
import filterBarSrc from '@/primitives/FilterBar.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

const TYPE_FILTER: FilterDef = {
  id: 'type',
  label: 'סוג',
  options: [
    { value: 'camera', label: 'מצלמה', icon: Camera },
    { value: 'radar', label: 'מכ״ם', icon: Radar },
    { value: 'rf', label: 'סורק RF', icon: Radio },
    { value: 'jammer', label: 'משבש', icon: Zap },
  ],
};

const STATUS_FILTER: FilterDef = {
  id: 'status',
  label: 'סטטוס',
  options: [
    { value: 'online', label: 'מחובר' },
    { value: 'warning', label: 'אזהרה' },
    { value: 'offline', label: 'מנותק' },
  ],
};

function FilterBarDemo({
  filters,
  initialSelections = {},
}: {
  filters: FilterDef[];
  initialSelections?: Record<string, string[]>;
}) {
  const [query, setQuery] = useState('');
  const [selections, setSelections] = useState<Record<string, string[]>>(initialSelections);
  return (
    <div className="w-[300px] rounded-lg bg-surface-2">
      <FilterBar
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        selections={selections}
        onFilterChange={(id, values) => setSelections((prev) => ({ ...prev, [id]: values }))}
        onReset={() => {
          setQuery('');
          setSelections({});
        }}
        searchPlaceholder="חיפוש מכשיר…"
        searchAriaLabel="חיפוש"
        clearSearchAriaLabel="נקה חיפוש"
        resetLabel="איפוס"
        resetAriaLabel="איפוס מסננים"
        emptyOptionsLabel="אין אפשרויות"
      />
    </div>
  );
}

export const filterBarDoc: ComponentDocModule = {
  id: 'filter-bar',
  source: filterBarSrc,
  usage: `import { FilterBar, type FilterDef } from "@/primitives"

const filters: FilterDef[] = [
  { id: "type", label: "סוג", options: [
    { value: "camera", label: "מצלמה", icon: Camera },
    { value: "radar", label: "מכ״ם", icon: Radar },
  ]},
]

<FilterBar
  query={query}
  onQueryChange={setQuery}
  filters={filters}
  selections={selections}
  onFilterChange={(id, values) => setSelections((s) => ({ ...s, [id]: values }))}
  onReset={() => { setQuery(""); setSelections({}); }}
/>`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description:
        'Fully controlled: search query, a FilterDef[] of dimensions, and a selections map. Open a filter to multi-select; the trigger summarizes the selection ("All", one label, or "n selected"). A Reset button appears once anything is active.',
      code: `<FilterBar
  query={query}
  onQueryChange={setQuery}
  filters={[typeFilter, statusFilter]}
  selections={selections}
  onFilterChange={(id, values) => setSelections((s) => ({ ...s, [id]: values }))}
  onReset={reset}
/>`,
      render: () => <FilterBarDemo filters={[TYPE_FILTER, STATUS_FILTER]} />,
    },
    {
      id: 'active',
      title: 'Active selections',
      description:
        'Filters with a selection tint sky and the Reset affordance is visible. Selection state lives entirely in the caller — the bar is a pure projection of it.',
      code: `<FilterBar … selections={{ type: ["camera"], status: ["online", "warning"] }} />`,
      render: () => (
        <FilterBarDemo
          filters={[TYPE_FILTER, STATUS_FILTER]}
          initialSelections={{ type: ['camera'], status: ['online', 'warning'] }}
        />
      ),
    },
    {
      id: 'search-only',
      title: 'Search only',
      description: 'With filters=[] the bar collapses to just the search input row.',
      code: `<FilterBar query={query} onQueryChange={setQuery} filters={[]} selections={{}} … />`,
      render: () => <FilterBarDemo filters={[]} />,
    },
  ],
  edgeCases: [
    {
      id: 'empty-options',
      label: 'Empty options',
      note: 'A filter with no options renders its emptyLabel (or the bar-level emptyOptionsLabel) inside the popover instead of a bare panel.',
      render: () => (
        <FilterBarDemo
          filters={[{ id: 'zone', label: 'גזרה', options: [], emptyLabel: 'אין גזרות מוגדרות' }]}
        />
      ),
    },
    {
      id: 'many-filters',
      label: 'Many filters',
      note: 'Columns cap at 8rem each and shrink evenly when the bar is narrow, so triggers never stretch across the whole panel.',
      render: () => (
        <FilterBarDemo
          filters={[
            TYPE_FILTER,
            STATUS_FILTER,
            { id: 'zone', label: 'גזרה', options: [{ value: 'north', label: 'צפון' }, { value: 'south', label: 'דרום' }] },
          ]}
        />
      ),
    },
  ],
};
