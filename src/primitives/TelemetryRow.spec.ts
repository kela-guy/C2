import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'TelemetryRow',
  filePath: 'src/primitives/TelemetryRow.tsx',
  purpose: 'Simple key-value row for displaying telemetry data — label on top, monospaced value below. Optional click-to-copy on the value swaps the displayed string to the full-precision payload for ~1.2s on success.',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'label', type: 'string', required: true, description: 'Row label text (Hebrew), displayed in smaller muted style' },
    { name: 'value', type: 'string', required: true, description: 'Telemetry value displayed in monospaced font below the label' },
    { name: 'copyValue', type: 'string', required: false, description: 'Optional full-precision payload copied to the clipboard on click. When set, the value becomes a button — display stays as `value` (compact form), clipboard receives `copyValue`.' },
    { name: 'copyLabel', type: 'string', required: false, description: 'aria-label / tooltip for the copy button when `copyValue` is set.' },
  ],

  states: [
    {
      name: 'default',
      trigger: 'label and value provided',
      description: 'Label above, monospaced value below',
      implementedInPrototype: true,
      storyProps: { label: 'מיקום', value: '32.0853° N, 34.7818° E' },
    },
    {
      name: 'copy-on-click',
      trigger: 'copyValue provided, operator clicks the value',
      description: 'Value is a button; hover wash on `state-hover-strong`; on click the displayed value swaps to `copyValue` for 1.2s before reverting.',
      implementedInPrototype: true,
      storyProps: { label: 'מיקום', value: '687985 / 3594214 · 50 m', copyValue: '32.085345, 34.781789' },
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
      trigger: 'click',
      element: 'value button (only when copyValue is set)',
      result: 'Writes copyValue to the clipboard; displayed value briefly swaps to copyValue for 1.2s as the operator-visible confirmation.',
      keyboard: 'Enter / Space activate when focused.',
    },
  ],

  tokens: {
    colors: [
      { name: 'label-text', value: 'zinc-400', usage: 'Label color' },
      { name: 'value-text', value: 'zinc-200', usage: 'Value text color' },
      { name: 'value-hover-bg', value: 'state-hover-strong', usage: 'Wash painted under the value when the row is hoverable (copyValue set).' },
    ],
    typography: [
      { name: 'label', fontFamily: 'Heebo', fontSize: '11px', fontWeight: '400', lineHeight: '1.4', usage: 'Label text (text-[11px] text-slate-10)' },
      { name: 'value-mono', fontFamily: 'IBM Plex Mono', fontSize: '12px', fontWeight: '400', lineHeight: '1.4', usage: 'Numeric/Latin values (font-mono tabular-nums)' },
      { name: 'value-locale', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '400', lineHeight: '1.4', usage: 'Hebrew locale values such as classification labels (sans stack)' },
    ],
    spacing: [
      { name: 'row-py', value: '4px', usage: 'Vertical padding (py-1)' },
      { name: 'row-gap', value: '4px', usage: 'Gap between label row and value (gap-1)' },
    ],
  },

  accessibility: {
    ariaAttributes: [
      'aria-label on the copy button when copyValue is set (consumer-supplied via copyLabel).',
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
    'Value is wrapped in <Bdi> so embedded Latin tokens (callsigns, lat/lon, MGRS) keep their natural LTR reading order inside a Hebrew/RTL context.',
    'Copy feedback is purely textual — the value swap reads the freshly-copied payload back to the operator. No icon affordances.',
  ],
};
