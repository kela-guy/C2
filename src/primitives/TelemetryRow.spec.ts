import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'TelemetryRow',
  filePath: 'src/primitives/TelemetryRow.tsx',
  purpose: 'Simple key-value row for displaying telemetry data — label on top, monospaced value below, with optional leading icon.',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'label', type: 'string', required: true, description: 'Row label text (Hebrew), displayed in smaller muted style' },
    { name: 'value', type: 'string', required: true, description: 'Telemetry value displayed in monospaced font below the label' },
    { name: 'icon', type: 'React.ElementType', required: false, description: 'Optional lucide icon component rendered next to the label' },
  ],

  states: [
    {
      name: 'default',
      trigger: 'label and value provided',
      description: 'Label with optional icon above, monospaced value below',
      implementedInPrototype: true,
      storyProps: { label: 'מיקום', value: '32.0853° N, 34.7818° E' },
    },
    {
      name: 'with icon',
      trigger: 'icon prop provided',
      description: 'Icon rendered at 12px next to the label in zinc-400',
      implementedInPrototype: true,
      storyProps: { label: 'מרחק', value: '2.4 ק״מ' },
    },
    {
      name: 'without icon',
      trigger: 'icon prop omitted',
      description: 'Label rendered without icon — no empty space',
      implementedInPrototype: true,
      storyProps: { label: 'סטטוס', value: 'פעיל' },
    },
    {
      name: 'long value overflow',
      trigger: 'Very long value string',
      description: 'Value truncates with ellipsis (truncate class)',
      implementedInPrototype: true,
      visualNotes: 'text truncates via truncate class',
    },
    {
      name: 'empty value',
      trigger: 'value is empty string',
      description: 'Row renders with empty value area — no guard',
      implementedInPrototype: false,
      visualNotes: 'Should show "—" or placeholder',
    },
    {
      name: 'loading',
      trigger: 'Data is being fetched',
      description: 'Skeleton pulse placeholder for value',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'none',
      element: 'TelemetryRow',
      result: 'Purely presentational — no direct user interaction',
      keyboard: 'N/A (not focusable)',
    },
  ],

  tokens: {
    colors: [
      { name: 'label-text', value: 'zinc-400', usage: 'Label and icon color' },
      { name: 'value-text', value: 'zinc-200', usage: 'Value text color' },
    ],
    typography: [
      { name: 'label', fontFamily: 'Heebo', fontSize: '11px', fontWeight: '400', lineHeight: '1.4', usage: 'Label text (text-[11px] text-zinc-400)' },
      { name: 'value', fontFamily: 'mono', fontSize: '13px', fontWeight: '400', lineHeight: '1.4', usage: 'Value text (text-[13px] font-mono tabular-nums)' },
    ],
    spacing: [
      { name: 'row-py', value: '4px', usage: 'Vertical padding (py-1)' },
      { name: 'row-gap', value: '4px', usage: 'Gap between label row and value (gap-1)' },
      { name: 'label-gap', value: '6px', usage: 'Gap between icon and label text (gap-1.5)' },
    ],
  },

  accessibility: {
    ariaAttributes: [
      'aria-hidden="true" on icon (decorative)',
    ],
    screenReaderNotes: 'No semantic grouping between label and value — screen reader reads them as separate text nodes. Consider adding a dl/dt/dd structure.',
  },

  tasks: [
    {
      id: 'TR-1',
      title: 'Add empty value fallback',
      priority: 'P1',
      estimate: 'S',
      description: 'Show "—" or a dash when value is empty string or undefined.',
      files: [{ path: 'src/primitives/TelemetryRow.tsx', action: 'modify', description: 'Add fallback for empty value' }],
      acceptanceCriteria: [
        'Empty string value renders "—"',
        'Layout remains consistent with populated rows',
      ],
    },
    {
      id: 'TR-2',
      title: 'Add semantic HTML structure',
      priority: 'P2',
      estimate: 'S',
      description: 'Wrap in a description list (dl > dt + dd) for better screen reader semantics.',
      files: [{ path: 'src/primitives/TelemetryRow.tsx', action: 'modify', description: 'Replace divs with dl/dt/dd' }],
      acceptanceCriteria: [
        'Uses dl > dt (label) + dd (value) structure',
        'Visual appearance unchanged',
        'Screen readers announce label-value pairs correctly',
      ],
    },
    {
      id: 'TR-3',
      title: 'Add loading skeleton variant',
      priority: 'P2',
      estimate: 'S',
      description: 'Support a loading prop that shows a shimmer placeholder for the value.',
      files: [{ path: 'src/primitives/TelemetryRow.tsx', action: 'modify', description: 'Add loading prop and skeleton value' }],
      acceptanceCriteria: [
        'loading=true shows skeleton pulse for value',
        'Label remains visible during loading',
      ],
    },
  ],

  notes: [
    'dir="rtl" is set on the root div for Hebrew layout.',
    'Value uses text-left which may conflict with RTL direction — likely intentional for numeric/coordinate data.',
    'Icon renders at 12px — smaller than most lucide defaults.',
  ],
};
