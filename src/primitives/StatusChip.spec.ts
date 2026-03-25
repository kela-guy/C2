import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'StatusChip',
  filePath: 'src/primitives/StatusChip.tsx',
  purpose: 'Colored label pill that communicates detection status at a glance (detection, threat, suspicion, unknown).',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'label', type: 'string', required: true, description: 'Display text inside the chip (Hebrew)' },
    { name: 'color', type: "'green' | 'gray' | 'red' | 'orange'", required: false, defaultValue: "'green'", description: 'Semantic color variant mapping to threat level' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes for custom overrides' },
  ],

  states: [
    {
      name: 'default',
      trigger: 'Component renders with label and color',
      description: 'Displays colored pill with label text, green variant',
      implementedInPrototype: true,
      storyProps: { label: 'איתור', color: 'green' },
    },
    {
      name: 'red variant',
      trigger: 'color="red"',
      description: 'Red background/text for active threats',
      implementedInPrototype: true,
      storyProps: { label: 'איום', color: 'red' },
      visualNotes: 'bg-[rgba(252,165,165,0.15)] text-[#fca5a5]',
    },
    {
      name: 'orange variant',
      trigger: 'color="orange"',
      description: 'Orange background/text for suspicion level',
      implementedInPrototype: true,
      storyProps: { label: 'חשד', color: 'orange' },
      visualNotes: 'bg-[rgba(253,186,116,0.15)] text-[#fdba74]',
    },
    {
      name: 'gray variant',
      trigger: 'color="gray"',
      description: 'Neutral gray for unknown or unclassified status',
      implementedInPrototype: true,
      storyProps: { label: 'לא ידוע', color: 'gray' },
      visualNotes: 'bg-[rgba(255,255,255,0.15)] text-white',
    },
    {
      name: 'loading',
      trigger: 'Parent passes undefined label while data is fetching',
      description: 'Skeleton placeholder or shimmer while status is unknown',
      implementedInPrototype: false,
      visualNotes: 'Pulsing bg placeholder at min-width',
    },
    {
      name: 'error',
      trigger: 'API returns invalid status code',
      description: 'Fallback display when status cannot be determined',
      implementedInPrototype: false,
    },
    {
      name: 'empty',
      trigger: 'Empty string label',
      description: 'Chip should either hide or show a fallback label',
      implementedInPrototype: false,
    },
    {
      name: 'disabled',
      trigger: 'Parent card is in resolved/expired state',
      description: 'Reduced opacity chip for completed or archived detections',
      implementedInPrototype: false,
      visualNotes: 'opacity-50 or desaturated variant',
    },
    {
      name: 'long text overflow',
      trigger: 'Very long label string',
      description: 'Text truncates with ellipsis within min-w constraint',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'none',
      element: 'StatusChip',
      result: 'Purely presentational — no direct user interaction',
      keyboard: 'N/A (not focusable)',
    },
  ],

  tokens: {
    colors: [
      { name: 'green-bg', value: 'rgba(110,231,183,0.15)', usage: 'Detection/active status background' },
      { name: 'green-text', value: '#6ee7b7', usage: 'Detection/active status text' },
      { name: 'red-bg', value: 'rgba(252,165,165,0.15)', usage: 'Threat/danger status background' },
      { name: 'red-text', value: '#fca5a5', usage: 'Threat/danger status text' },
      { name: 'orange-bg', value: 'rgba(253,186,116,0.15)', usage: 'Suspicion/warning status background' },
      { name: 'orange-text', value: '#fdba74', usage: 'Suspicion/warning status text' },
      { name: 'gray-bg', value: 'rgba(255,255,255,0.15)', usage: 'Unknown/neutral status background' },
      { name: 'gray-text', value: '#ffffff', usage: 'Unknown/neutral status text' },
    ],
    typography: [
      { name: 'chip-text', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '500', lineHeight: '1', usage: 'Status label text (text-xs font-medium)' },
    ],
    spacing: [
      { name: 'chip-px', value: '8px', usage: 'Horizontal padding (px-2)' },
      { name: 'chip-py', value: '2px', usage: 'Vertical padding (py-0.5)' },
      { name: 'chip-min-w', value: '3.5rem', usage: 'Minimum width for consistent sizing' },
    ],
    borderRadius: [
      { name: 'chip-radius', value: '4px', usage: 'Rounded corners (rounded)' },
    ],
  },

  accessibility: {
    role: 'status',
    ariaAttributes: ['role="status" on root div'],
    screenReaderNotes: 'The role="status" makes screen readers announce status changes as live regions.',
  },

  tasks: [
    {
      id: 'SC-1',
      title: 'Add empty/null label guard',
      priority: 'P1',
      estimate: 'S',
      description: 'Return null or a skeleton when label is empty string or undefined.',
      files: [{ path: 'src/primitives/StatusChip.tsx', action: 'modify', description: 'Add early return for falsy label' }],
      acceptanceCriteria: [
        'Empty string label returns null or placeholder',
        'Undefined label returns null or placeholder',
      ],
    },
    {
      id: 'SC-2',
      title: 'Add disabled/dimmed variant',
      priority: 'P2',
      estimate: 'S',
      description: 'Support a disabled prop that renders the chip at reduced opacity for resolved targets.',
      files: [{ path: 'src/primitives/StatusChip.tsx', action: 'modify', description: 'Add disabled prop and opacity class' }],
      acceptanceCriteria: [
        'disabled prop reduces opacity to 0.5',
        'Chip remains visible but clearly secondary',
      ],
    },
    {
      id: 'SC-3',
      title: 'Add text overflow handling',
      priority: 'P2',
      estimate: 'S',
      description: 'Truncate long labels with text-ellipsis and max-width.',
      files: [{ path: 'src/primitives/StatusChip.tsx', action: 'modify', description: 'Add truncate class and max-w' }],
      acceptanceCriteria: [
        'Labels longer than ~12 characters truncate with ellipsis',
        'Chip never breaks layout or wraps to multiple lines',
      ],
    },
  ],

  hardcodedData: [
    {
      current: 'Tailwind arbitrary values for colors: bg-[rgba(110,231,183,0.15)]',
      replaceWith: 'Design token CSS variables or Tailwind theme extension',
      location: 'StatusChip.tsx lines 8-16',
    },
  ],

  notes: [
    'Currently uses if/else chain for color mapping — consider a lookup object for extensibility.',
    'The gray variant falls through to the default bg/text, which is rgba(255,255,255,0.15)/text-white.',
    'whitespace-nowrap is applied but no max-width or truncation exists for very long labels.',
  ],
};
