import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'MissionPhaseChip',
  filePath: 'src/primitives/MissionPhaseChip.tsx',
  purpose: 'Status chip displaying the current mission phase (planning, active, paused, override, completed) with color-coded background, text, and optional pulsing dot indicator.',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'phase', type: 'MissionPhaseType', required: false, description: 'Mission phase key — determines label, colors, and pulse behavior. Falls back to "planning" config when undefined or unrecognized.' },
  ],

  states: [
    {
      name: 'default (planning)',
      trigger: 'phase is undefined or "planning"',
      description: 'Neutral chip with zinc bg/text, pulsing dot',
      implementedInPrototype: true,
      storyProps: { phase: 'planning' },
      visualNotes: 'bg-white/8 text-zinc-400, pulsing zinc dot',
    },
    {
      name: 'active',
      trigger: 'phase="active"',
      description: 'Green chip indicating active mission, pulsing dot',
      implementedInPrototype: true,
      storyProps: { phase: 'active' },
      visualNotes: 'bg-emerald-500/15 text-emerald-400, pulsing emerald dot',
    },
    {
      name: 'paused',
      trigger: 'phase="paused"',
      description: 'Amber chip indicating paused mission, static dot (no pulse)',
      implementedInPrototype: true,
      storyProps: { phase: 'paused' },
      visualNotes: 'bg-amber-500/15 text-amber-400, static amber dot',
    },
    {
      name: 'override',
      trigger: 'phase="override"',
      description: 'Orange chip indicating manual override, pulsing dot',
      implementedInPrototype: true,
      storyProps: { phase: 'override' },
      visualNotes: 'bg-orange-500/15 text-orange-400, pulsing orange dot',
    },
    {
      name: 'completed',
      trigger: 'phase="completed"',
      description: 'Muted zinc chip indicating completed mission, static dot',
      implementedInPrototype: true,
      storyProps: { phase: 'completed' },
      visualNotes: 'bg-zinc-500/15 text-zinc-400, static zinc dot',
    },
    {
      name: 'unknown phase',
      trigger: 'phase is an unrecognized string',
      description: 'Falls back to planning config — neutral styling',
      implementedInPrototype: true,
    },
    {
      name: 'loading',
      trigger: 'Not implemented — no loading state',
      description: 'Would show skeleton chip or shimmer while phase data loads',
      implementedInPrototype: false,
    },
    {
      name: 'error',
      trigger: 'Not implemented — no error state',
      description: 'Would show error icon or red chip for phase fetch failure',
      implementedInPrototype: false,
    },
    {
      name: 'disabled',
      trigger: 'Not implemented — no disabled prop',
      description: 'Would reduce opacity and remove any interactivity',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'none',
      element: 'Chip container',
      result: 'Purely display component — no interactive behavior. role="status" for live announcements.',
    },
  ],

  tokens: {
    colors: [
      { name: 'planning-bg', value: 'bg-white/8', usage: 'Planning phase background' },
      { name: 'planning-text', value: 'text-zinc-400', usage: 'Planning phase text and dot' },
      { name: 'active-bg', value: 'bg-emerald-500/15', usage: 'Active phase background' },
      { name: 'active-text', value: 'text-emerald-400', usage: 'Active phase text and dot' },
      { name: 'paused-bg', value: 'bg-amber-500/15', usage: 'Paused phase background' },
      { name: 'paused-text', value: 'text-amber-400', usage: 'Paused phase text and dot' },
      { name: 'override-bg', value: 'bg-orange-500/15', usage: 'Override phase background' },
      { name: 'override-text', value: 'text-orange-400', usage: 'Override phase text and dot' },
      { name: 'completed-bg', value: 'bg-zinc-500/15', usage: 'Completed phase background' },
      { name: 'completed-text', value: 'text-zinc-400', usage: 'Completed phase text and dot' },
    ],
    typography: [
      { name: 'chip-label', fontFamily: 'inherit', fontSize: '10px', fontWeight: '500 (font-medium)', lineHeight: 'auto', usage: 'Phase label text' },
    ],
    spacing: [
      { name: 'chip-px', value: '8px (px-2)', usage: 'Chip horizontal padding' },
      { name: 'chip-py', value: '2px (py-0.5)', usage: 'Chip vertical padding' },
      { name: 'dot-gap', value: '6px (gap-1.5)', usage: 'Gap between dot and label' },
      { name: 'dot-size', value: '6px (w-1.5 h-1.5)', usage: 'Status dot dimensions' },
    ],
    borderRadius: [
      { name: 'chip', value: 'rounded (4px)', usage: 'Chip corner radius' },
      { name: 'dot', value: 'rounded-full', usage: 'Status dot — fully circular' },
    ],
    animations: [
      { name: 'pulse', property: 'opacity', duration: '2s (Tailwind default)', easing: 'cubic-bezier(0.4, 0, 0.6, 1)', usage: 'Pulsing dot on planning, active, and override phases' },
    ],
  },

  accessibility: {
    role: 'status',
    ariaAttributes: ['role="status" on chip container', 'aria-hidden="true" on dot span'],
    keyboardNav: ['Not applicable — read-only status display'],
    focusManagement: 'Not focusable — informational display only',
    screenReaderNotes: 'role="status" makes phase changes announced by screen readers as a live region. Dot is decorative (aria-hidden). Hebrew labels provide the accessible text.',
  },

  tasks: [
    {
      id: 'MP-1',
      title: 'Extract phase config to shared tokens',
      priority: 'P1',
      estimate: 'S',
      description: 'Phase color/label config is inline — extract to a shared constant for reuse in other components',
      files: [
        { path: 'src/primitives/tokens.ts', action: 'modify', description: 'Add MISSION_PHASE_CONFIG with phase → colors/label map' },
        { path: 'src/primitives/MissionPhaseChip.tsx', action: 'modify', description: 'Import config from tokens' },
      ],
      acceptanceCriteria: ['Config object exported from tokens.ts', 'MissionPhaseChip imports and uses it', 'No visual change'],
    },
    {
      id: 'MP-2',
      title: 'Add tooltip with phase description',
      priority: 'P2',
      estimate: 'S',
      description: 'Show a tooltip on hover explaining what each phase means for operators',
      files: [{ path: 'src/primitives/MissionPhaseChip.tsx', action: 'modify', description: 'Wrap in Tooltip with phase description text' }],
      acceptanceCriteria: ['Tooltip appears on hover with phase explanation', 'Does not interfere with chip layout', 'Accessible via keyboard focus'],
    },
    {
      id: 'MP-3',
      title: 'Add transition animation between phases',
      priority: 'P2',
      estimate: 'M',
      description: 'When phase prop changes, animate color and label transition smoothly',
      files: [{ path: 'src/primitives/MissionPhaseChip.tsx', action: 'modify', description: 'Add framer-motion AnimatePresence for phase transitions' }],
      acceptanceCriteria: ['Phase change animates bg color and label crossfade', 'Duration ~200ms', 'Respects prefers-reduced-motion'],
    },
    {
      id: 'MP-4',
      title: 'Extract Hebrew labels to i18n',
      priority: 'P2',
      estimate: 'S',
      description: 'Hebrew label strings are hardcoded in config object',
      files: [{ path: 'src/primitives/MissionPhaseChip.tsx', action: 'modify', description: 'Replace inline Hebrew with i18n keys or constants' }],
      acceptanceCriteria: ['Labels reference named constants', 'Easy to add RTL/LTR support later'],
    },
  ],

  hardcodedData: [
    { current: 'תכנון', replaceWith: 'i18n key or PHASE_LABELS constant', location: 'config.planning.label' },
    { current: 'פעילה', replaceWith: 'i18n key', location: 'config.active.label' },
    { current: 'מושהית', replaceWith: 'i18n key', location: 'config.paused.label' },
    { current: 'שליטה ידנית', replaceWith: 'i18n key', location: 'config.override.label' },
    { current: 'הושלמה', replaceWith: 'i18n key', location: 'config.completed.label' },
  ],
};
