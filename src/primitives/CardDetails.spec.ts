import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CardDetails',
  filePath: 'src/primitives/CardDetails.tsx',
  purpose: 'Collapsible accordion section displaying telemetry data rows in a fixed 2-column grid. Per-field copy lives on CardIdentity; this section is read-only.',
  location: 'TargetCard/Slots',
  status: 'prototype',

  props: [
    { name: 'rows', type: 'DetailRow[]', required: true, description: 'Array of { label, value, icon? } entries rendered via TelemetryRow components' },
    { name: 'classification', type: 'CardDetailsClassification', required: false, description: 'Classification badge showing type, confidence %, and color — currently unused in render' },
    { name: 'defaultOpen', type: 'boolean', required: false, defaultValue: 'false', description: 'Whether the accordion section starts expanded' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on the AccordionSection wrapper' },
    { name: 'title', type: 'string', required: false, defaultValue: "'Telemetry'", description: 'Section header title shown in the AccordionSection trigger' },
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
      description: 'Telemetry rows displayed in a fixed 2-column grid (gap-x-8 / gap-y-2). With 2-3 metrics per card the prior 3-col layout almost always left a trailing empty cell; 2 cols also gives long values like "32.46356, 35.00042" room to breathe without wrapping.',
      implementedInPrototype: true,
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
      description: 'No disabled prop — accordion is always functional when rendered',
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
  ],

  tokens: {
    colors: [],
    typography: [
      { name: 'section-title', fontFamily: 'Heebo', fontSize: '11px', fontWeight: '600', lineHeight: '1.4', usage: 'Accordion section title (via AccordionSection)' },
    ],
    spacing: [
      { name: 'content-py', value: '4px', usage: 'Inner content vertical padding (py-1)' },
      { name: 'rows-gap-x', value: '32px (gap-x-8)', usage: 'Horizontal gap between the two grid columns' },
      { name: 'rows-gap-y', value: '8px (gap-y-2)', usage: 'Vertical gap between grid rows when telemetry spans multiple rows' },
    ],
    borderRadius: [],
  },

  accessibility: {
    role: 'region (via AccordionSection)',
    ariaAttributes: [],
    keyboardNav: [
      'Tab: focuses accordion header',
      'Enter/Space: toggles accordion',
    ],
    focusManagement: 'AccordionSection owns focus; this section is presentational once expanded (no interactive controls inside the grid).',
    screenReaderNotes: 'Each row is a TelemetryRow which carries its own label-value semantics. There is no copy affordance here — per-field copy lives on CardIdentity.',
  },

  flows: [],

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
      id: 'CD-3',
      title: 'Add loading skeleton for telemetry rows',
      priority: 'P1',
      estimate: 'S',
      description: 'Accept a loading prop and render pulsing skeleton rows matching TelemetryRow layout.',
      files: [{ path: 'src/primitives/CardDetails.tsx', action: 'modify', description: 'Add loading prop, render shimmer placeholders when true' }],
      acceptanceCriteria: [
        'Skeleton rows match TelemetryRow height and width',
        'Skeleton animation uses pulse or shimmer',
      ],
    },
  ],

  hardcodedData: [
    {
      current: 'grid-cols-2 — fixed 2-column layout regardless of row count',
      replaceWith: 'Consider a `columns` prop or `1 | 2` adaptive layout if a card surface ever needs to render 1, 4+, or wildly different counts.',
      location: 'CardDetails.tsx — inner grid',
    },
  ],

  notes: [
    'The classification prop is defined in the interface but destructured and unused in the render — this is an incomplete feature.',
    'Copy-all was removed: it was non-functional in practice (no success feedback, no error handling, no a11y announcement) and per-field copy lives on CardIdentity where each value has a distinct semantic meaning. Telemetry values (lat/lon, altitude, distance) are typically read, not copied wholesale.',
    'TelemetryRow is a separate component — its spec should be generated independently.',
  ],
};
