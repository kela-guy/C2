import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'MapIcons',
  filePath: 'src/primitives/MapIcons.tsx',
  purpose: 'Card-compatible SVG icon components for target types — drone, jam wave, and missile — using currentColor fill/stroke for theme-aware rendering.',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'size', type: 'number', required: false, defaultValue: '15 (Drone/Missile) / 20 (JamWave)', description: 'Width and height of the SVG element in pixels' },
  ],

  states: [
    {
      name: 'default',
      trigger: 'Rendered with default size',
      description: 'SVG icon at default size, inheriting currentColor from parent',
      implementedInPrototype: true,
    },
    {
      name: 'drone icon',
      trigger: '<DroneCardIcon /> rendered',
      description: 'Arrow/chevron shape pointing right, uses fill="currentColor"',
      implementedInPrototype: true,
      visualNotes: 'viewBox="2 -2 22 36", filled path',
    },
    {
      name: 'jam wave icon',
      trigger: '<JamWaveIcon /> rendered',
      description: 'Wavy interference pattern, uses stroke="currentColor" with strokeWidth=2',
      implementedInPrototype: true,
      visualNotes: 'viewBox="0 0 24 24", stroked path with round caps',
    },
    {
      name: 'missile icon',
      trigger: '<MissileCardIcon /> rendered',
      description: 'Projectile shape pointing right, uses fill="currentColor"',
      implementedInPrototype: true,
      visualNotes: 'viewBox="2 6 36 18", filled path',
    },
    {
      name: 'custom size',
      trigger: 'size prop overridden',
      description: 'SVG scales to specified size while maintaining viewBox aspect ratio',
      implementedInPrototype: true,
    },
    {
      name: 'color inherited',
      trigger: 'Parent element has text color class (e.g. text-red-400)',
      description: 'Icon inherits parent text color via currentColor',
      implementedInPrototype: true,
    },
    {
      name: 'loading',
      trigger: 'Not applicable — static SVG icons',
      description: 'Icons are purely presentational, no loading state needed',
      implementedInPrototype: false,
    },
    {
      name: 'error',
      trigger: 'Not applicable — static SVG icons',
      description: 'No error state — icons always render',
      implementedInPrototype: false,
    },
    {
      name: 'disabled',
      trigger: 'Parent applies opacity or pointer-events-none',
      description: 'Icons dim via inherited CSS — no built-in disabled prop',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'none',
      element: 'SVG icons',
      result: 'Icons are purely presentational — no interactive behavior. aria-hidden="true" on all SVGs.',
    },
  ],

  tokens: {
    colors: [
      { name: 'fill', value: 'currentColor', usage: 'DroneCardIcon and MissileCardIcon fill' },
      { name: 'stroke', value: 'currentColor', usage: 'JamWaveIcon stroke' },
    ],
    typography: [],
    spacing: [
      { name: 'drone-default-size', value: '15px', usage: 'Default DroneCardIcon dimensions' },
      { name: 'jam-default-size', value: '20px', usage: 'Default JamWaveIcon dimensions' },
      { name: 'missile-default-size', value: '15px', usage: 'Default MissileCardIcon dimensions' },
    ],
  },

  accessibility: {
    role: 'presentation (aria-hidden)',
    ariaAttributes: ['aria-hidden="true" on all SVG elements'],
    keyboardNav: ['Not applicable — decorative icons'],
    focusManagement: 'Icons are not focusable',
    screenReaderNotes: 'All icons are hidden from assistive technology. Parent components should provide text alternatives.',
  },

  tasks: [
    {
      id: 'MI-1',
      title: 'Add missing target type icons',
      priority: 'P1',
      estimate: 'M',
      description: 'Only 3 icon types exist — add icons for additional target types (bird, balloon, unknown)',
      files: [{ path: 'src/primitives/MapIcons.tsx', action: 'modify', description: 'Add BirdCardIcon, BalloonCardIcon, UnknownCardIcon components' }],
      acceptanceCriteria: ['Each new icon follows same pattern: size prop, currentColor, aria-hidden', 'Visual consistency with existing icons', 'Exported from module'],
    },
    {
      id: 'MI-2',
      title: 'Unify default sizes',
      priority: 'P2',
      estimate: 'S',
      description: 'DroneCardIcon and MissileCardIcon default to 15px but JamWaveIcon defaults to 20px — standardize',
      files: [{ path: 'src/primitives/MapIcons.tsx', action: 'modify', description: 'Align default size or add size token constant' }],
      acceptanceCriteria: ['All icons share a consistent default size or sizes are intentionally documented', 'No visual regressions in existing usage'],
    },
    {
      id: 'MI-3',
      title: 'Add icon lookup map',
      priority: 'P1',
      estimate: 'S',
      description: 'Create a targetType → IconComponent map for dynamic icon rendering in cards',
      files: [
        { path: 'src/primitives/MapIcons.tsx', action: 'modify', description: 'Export MAP_ICON_BY_TYPE record' },
        { path: 'src/primitives/index.ts', action: 'modify', description: 'Re-export the lookup map' },
      ],
      acceptanceCriteria: ['Lookup map covers all target types', 'Fallback icon for unknown types', 'Type-safe key union'],
    },
  ],

  notes: [
    'These icons are adapted from tactical map SVGs for card-level use',
    'JamWaveIcon uses stroke instead of fill — different rendering approach from others',
    'viewBox values differ per icon to match original SVG proportions',
  ],
};
