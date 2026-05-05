import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'IconLibrary',
  filePath: 'src/app/components/styleguide/IconLibrary.tsx',
  purpose:
    'Searchable, filterable grid of every icon shipping in the product. Reads from the central iconRegistry, exposes preview-size and render-style toggles, and opens a sticky right-side detail panel with copy/download exports.',
  location: 'Styleguide › Foundations › Icon Library',
  status: 'in-progress',

  props: [],

  states: [
    {
      name: 'default (line, size 20, all sources)',
      trigger: 'First mount',
      description:
        'All registry icons rendered as native line glyphs at 20px. No selection — detail panel is absent.',
      implementedInPrototype: true,
    },
    {
      name: 'render mode = fill',
      trigger: 'User clicks the "Fill" button in the Style segmented control',
      description:
        'Tiles whose registry entry is tagged `fillable: true` re-render with lucide\'s official filled-icon recipe — `fill="currentColor"` and `strokeWidth={0}`. Pure-line lucide icons (arrows, chevrons, X, Plus, sliders) and static SVG assets stay as authored, since the recipe would either render them invisible or doubled. Detail panel surfaces a small explanation when a non-fillable entry is selected in this mode.',
      implementedInPrototype: true,
      visualNotes:
        'Style toggle visually matches the Size toggle (same px-2.5 py-1 pill, same active inset shadow). Curated fillable list lives in `LUCIDE_ICONS` in src/lib/iconRegistry.ts.',
    },
    {
      name: 'icon selected',
      trigger: 'User clicks any tile',
      description:
        'Selected tile gets a brighter inset ring; right-side aside mounts with the IconDetailPanel for that entry. Panel sticks at lg:top-4 inside the styleguide scroll container.',
      implementedInPrototype: true,
      visualNotes:
        'Sticky relies on no transformed ancestors. Page-enter motion.div animates only `opacity` (no `y`) so sticky descendants engage cleanly in Chromium.',
    },
    {
      name: 'filtered to a single source',
      trigger: 'User clicks a source chip (Lucide / Tactical / Map / Product / Asset)',
      description: 'Grid narrows to the chosen source; chip count is still visible.',
      implementedInPrototype: true,
    },
    {
      name: 'searching',
      trigger: 'User types into the search input or presses "/" globally',
      description:
        'Grid filters to entries whose name/keywords/source match the deferred query (lowercased substring match).',
      implementedInPrototype: true,
    },
    {
      name: 'empty results',
      trigger: 'No registry entries match the current filter + query',
      description:
        'Grid replaced with EmptyState card and a "Reset filters" button that clears filter, query, and selection.',
      implementedInPrototype: true,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Style toggle button (Line / Fill)',
      result: 'Sets renderMode; re-renders every IconTile and the detail panel preview/snippet/exports.',
      keyboard: 'Enter/Space to toggle when focused',
    },
    {
      trigger: 'click',
      element: 'Size toggle button (16 / 20 / 24)',
      result: 'Sets previewSize used by every tile and the panel snippet/exports.',
      keyboard: 'Enter/Space to toggle when focused',
    },
    {
      trigger: 'click',
      element: 'Source filter chip',
      result: 'Sets filter to the chip value and re-runs the registry filter pipeline.',
    },
    {
      trigger: 'input',
      element: 'Search input',
      result: 'Updates query, then drives a deferred filter pass via useDeferredValue.',
      keyboard: 'Esc clears query while focused; "/" globally focuses the input.',
    },
    {
      trigger: 'click',
      element: 'IconTile',
      result: 'Toggles selection — re-clicking the selected tile closes the panel.',
      keyboard: 'Enter/Space when focused',
    },
  ],

  tokens: {
    colors: [
      { name: 'tile-bg-idle', value: 'rgba(255,255,255,0.02)', usage: 'IconTile resting background' },
      { name: 'tile-bg-hover', value: 'rgba(255,255,255,0.05)', usage: 'IconTile hover background' },
      { name: 'tile-bg-selected', value: 'rgba(255,255,255,0.08)', usage: 'Selected IconTile background' },
      { name: 'toggle-active', value: 'rgba(255,255,255,0.10)', usage: 'Active state on Size and Style toggles' },
    ],
    typography: [
      { name: 'tile-name', fontFamily: 'mono', fontSize: '10px', fontWeight: '400', lineHeight: 'auto', usage: 'Icon name caption' },
      { name: 'toggle-label', fontFamily: 'inherit', fontSize: '12px', fontWeight: '400', lineHeight: 'auto', usage: 'Size and Style toggle buttons' },
    ],
    spacing: [
      { name: 'grid-gap', value: '8px (gap-2)', usage: 'Gap between IconTiles' },
      { name: 'panel-sticky-top', value: '16px (lg:top-4)', usage: 'Detail panel offset within main scroll container' },
    ],
    borderRadius: [
      { name: 'tile', value: 'rounded-lg (8px)', usage: 'IconTile' },
      { name: 'toggle-pill', value: 'rounded-md (6px)', usage: 'Size and Style toggle buttons' },
    ],
    shadows: [
      { name: 'tile-ring-idle', value: 'inset 0 0 0 1px rgba(255,255,255,0.04)', usage: 'IconTile resting ring' },
      { name: 'tile-ring-selected', value: 'inset 0 0 0 1px rgba(255,255,255,0.18)', usage: 'Selected IconTile ring' },
    ],
  },

  accessibility: {
    role: 'search + radiogroup (Size, Style) + grid of toggle buttons',
    ariaAttributes: [
      'role="radiogroup" + aria-label on Size and Style toggles',
      'role="radio" + aria-checked on each toggle button',
      'aria-pressed on each IconTile',
      'aria-label on Clear search button',
    ],
    keyboardNav: [
      'Tab — search → Size buttons → Style buttons → source chips → tiles',
      'Enter/Space — activate buttons and tiles',
      '/ — global shortcut to focus search',
      'Esc — clear search query when input is focused',
    ],
    focusManagement: 'Standard focus-visible:ring-2 ring-white/25 across all interactive elements.',
  },

  tasks: [
    {
      id: 'IL-1',
      title: 'Per-source render mode hints',
      priority: 'P2',
      estimate: 'S',
      description:
        'Some custom glyphs hard-code their fill — currently the Fill toggle silently no-ops on those tiles. Surface that on the detail panel ("This icon ignores the Fill toggle").',
      files: [
        { path: 'src/app/components/styleguide/IconDetailPanel.tsx', action: 'modify', description: 'Detect fill-resistant entries and show inline note' },
      ],
      acceptanceCriteria: [
        'Asset entries always show the note',
        'Custom React glyphs that hard-code `fill` are tagged in the registry and surface the note',
      ],
    },
  ],
};
