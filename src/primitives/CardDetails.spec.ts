import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CardDetails',
  filePath: 'src/primitives/CardDetails.tsx',
  purpose: 'Collapsible accordion section displaying telemetry data rows with a hover-reveal copy-all button.',
  location: 'TargetCard/Slots',
  status: 'prototype',

  props: [
    { name: 'rows', type: 'DetailRow[]', required: true, description: 'Array of { label, value, icon? } entries rendered via TelemetryRow components' },
    { name: 'classification', type: 'CardDetailsClassification', required: false, description: 'Classification badge showing type, confidence %, and color — currently unused in render' },
    { name: 'defaultOpen', type: 'boolean', required: false, defaultValue: 'false', description: 'Whether the accordion section starts expanded' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on the AccordionSection wrapper' },
  ],

  states: [
    {
      name: 'default (collapsed)',
      trigger: 'rows[] provided, defaultOpen=false',
      description: 'Accordion header visible with "נתוני טלמטריה" title and Eye icon — content hidden',
      implementedInPrototype: true,
      storyProps: {
        rows: [
          { label: 'מיקום', value: '32.0853° N, 34.7818° E' },
          { label: 'גובה', value: '85 מ׳' },
        ],
      },
    },
    {
      name: 'expanded',
      trigger: 'User clicks accordion header or defaultOpen=true',
      description: 'Telemetry rows displayed in a horizontal flex layout with copy button appearing on group hover',
      implementedInPrototype: true,
    },
    {
      name: 'copy hover',
      trigger: 'User hovers over the telemetry rows container',
      description: 'Copy button fades in at top-left corner (opacity 0 → 1)',
      implementedInPrototype: true,
      visualNotes: 'group-hover/copy:opacity-100 transition-opacity',
    },
    {
      name: 'with classification',
      trigger: 'classification prop provided',
      description: 'Classification data is accepted but not rendered in current implementation',
      implementedInPrototype: false,
      visualNotes: 'The classification prop exists in the interface but is destructured and unused',
    },
    {
      name: 'empty',
      trigger: 'rows[] is an empty array',
      description: 'Component returns null — renders nothing',
      implementedInPrototype: true,
      storyProps: { rows: [] },
    },
    {
      name: 'loading',
      trigger: 'Telemetry data is being fetched',
      description: 'No loading state — should show skeleton rows while data loads',
      implementedInPrototype: false,
      visualNotes: 'Should display pulsing placeholder rows matching TelemetryRow dimensions',
    },
    {
      name: 'error',
      trigger: 'Telemetry data fetch fails',
      description: 'No error state — should show inline error with retry option',
      implementedInPrototype: false,
      visualNotes: 'Should replace rows area with error message and retry button',
    },
    {
      name: 'disabled',
      trigger: 'Component should be non-interactive',
      description: 'No disabled prop — accordion and copy button always functional when rendered',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Accordion header',
      result: 'Toggles section open/closed (handled by AccordionSection)',
      keyboard: 'Enter/Space toggles accordion (native button)',
    },
    {
      trigger: 'click',
      element: 'Copy button',
      result: 'Copies all rows as "label: value" lines to clipboard via navigator.clipboard.writeText; stopPropagation prevents card toggle',
      keyboard: 'Enter/Space activates copy (native button)',
    },
    {
      trigger: 'hover',
      element: 'Telemetry rows container',
      result: 'Copy button fades in (opacity-0 → opacity-100)',
      animation: { property: 'opacity', from: '0', to: '1', duration: '150ms', easing: 'ease' },
    },
  ],

  tokens: {
    colors: [
      { name: 'copy-icon', value: 'text-zinc-400', usage: 'Copy button icon color' },
      { name: 'copy-hover-bg', value: 'hover:bg-white/10', usage: 'Copy button hover background' },
    ],
    typography: [
      { name: 'section-title', fontFamily: 'Heebo', fontSize: '11px', fontWeight: '600', lineHeight: '1.4', usage: 'Accordion section title (via AccordionSection)' },
    ],
    spacing: [
      { name: 'content-py', value: '4px', usage: 'Inner content vertical padding (py-1)' },
      { name: 'rows-gap', value: '32px', usage: 'Horizontal gap between telemetry rows (gap-8)' },
      { name: 'copy-offset', value: '2px', usage: 'Copy button position offset (top-0.5 left-0.5)' },
      { name: 'copy-padding', value: '4px', usage: 'Copy button inner padding (p-1)' },
    ],
    borderRadius: [
      { name: 'copy-button', value: '4px', usage: 'Copy button border radius (rounded)' },
    ],
  },

  accessibility: {
    role: 'region (via AccordionSection)',
    ariaAttributes: [
      'aria-label="העתק טלמטריה" on copy button',
      'title="העתק טלמטריה" tooltip on copy button',
    ],
    keyboardNav: [
      'Tab: focuses accordion header, then copy button when expanded',
      'Enter/Space: toggles accordion or activates copy',
    ],
    focusManagement: 'Copy button is visually hidden (opacity-0) but remains focusable — keyboard users can reach it even when not hovered.',
    screenReaderNotes: 'Copy button has aria-label for screen readers. No live region announcement after copy succeeds — should add aria-live feedback.',
  },

  flows: [
    {
      name: 'Copy telemetry data',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Expands the accordion section', result: 'Telemetry rows become visible' },
        { actor: 'user', action: 'Hovers over the rows area', result: 'Copy button fades in' },
        { actor: 'user', action: 'Clicks copy button', result: 'All rows copied to clipboard as text' },
      ],
    },
    {
      name: 'Clipboard API unavailable',
      type: 'error',
      steps: [
        { actor: 'user', action: 'Clicks copy button', result: 'navigator.clipboard.writeText called' },
        { actor: 'system', action: 'Clipboard API rejects (insecure context or permission denied)', result: 'Unhandled promise rejection — no feedback to user' },
      ],
    },
  ],

  tasks: [
    {
      id: 'CD-1',
      title: 'Render classification badge',
      priority: 'P0',
      estimate: 'M',
      description: 'The classification prop is accepted but never rendered. Display a badge showing type label, confidence percentage, and colored indicator.',
      files: [{ path: 'src/primitives/CardDetails.tsx', action: 'modify', description: 'Add classification rendering below telemetry rows or in accordion header' }],
      acceptanceCriteria: [
        'Classification type label is visible when classification prop is provided',
        'Confidence percentage is displayed',
        'colorClass is applied to the badge',
        'Badge is not shown when classification is undefined',
      ],
    },
    {
      id: 'CD-2',
      title: 'Add copy success feedback',
      priority: 'P1',
      estimate: 'S',
      description: 'Show a brief confirmation (checkmark icon swap or tooltip) after successful clipboard copy. Handle clipboard API errors gracefully.',
      files: [{ path: 'src/primitives/CardDetails.tsx', action: 'modify', description: 'Add copied state with timeout, swap icon to Check, wrap writeText in try/catch' }],
      acceptanceCriteria: [
        'Copy icon changes to checkmark for 2 seconds after success',
        'Failed clipboard write shows error tooltip',
        'aria-live region announces "הועתק" after copy',
      ],
    },
    {
      id: 'CD-3',
      title: 'Add loading skeleton for telemetry rows',
      priority: 'P1',
      estimate: 'S',
      description: 'Accept a loading prop and render pulsing skeleton rows matching TelemetryRow layout.',
      files: [{ path: 'src/primitives/CardDetails.tsx', action: 'modify', description: 'Add loading prop, render shimmer placeholders when true' }],
      acceptanceCriteria: [
        'Skeleton rows match TelemetryRow height and width',
        'Skeleton animation uses pulse or shimmer',
        'Copy button is hidden during loading',
      ],
    },
    {
      id: 'CD-4',
      title: 'Add vertical layout option for rows',
      priority: 'P2',
      estimate: 'M',
      description: 'Current horizontal flex layout overflows with many rows. Add a layout prop to stack rows vertically for dense telemetry data.',
      files: [{ path: 'src/primitives/CardDetails.tsx', action: 'modify', description: 'Add layout prop ("horizontal" | "vertical"), adjust flex-direction accordingly' }],
      acceptanceCriteria: [
        'layout="vertical" stacks rows top-to-bottom',
        'layout="horizontal" preserves current behavior',
        'Default is horizontal',
      ],
    },
  ],

  hardcodedData: [
    {
      current: "gap-8 — large 32px gap between telemetry rows",
      replaceWith: 'Responsive gap or design token (may be too wide on narrow cards)',
      location: 'CardDetails.tsx line 42',
    },
  ],

  notes: [
    'The classification prop is defined in the interface but destructured and unused in the render — this is an incomplete feature.',
    'Copy button uses stopPropagation to prevent card toggle when clicking copy inside the card.',
    'The group/copy CSS pattern uses Tailwind group-hover to reveal the copy button only on mouse hover — keyboard users can still tab to it.',
    'TelemetryRow is a separate component — its spec should be generated independently.',
  ],
};
