import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraCompassStrip',
  filePath: 'src/app/components/camera-v2/CameraCompassStrip.tsx',
  purpose:
    'Horizontal heading strip inspired by Call of Duty: Warzone. Cardinals + ticks on top, big yellow degrees number below. The strip "scrolls" as bearing changes; the center marker stays fixed.',
  location: 'Primitive (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'bearingDeg', type: 'number', required: true, description: '0..360 true bearing of the camera' },
    { name: 'rangeDeg', type: 'number', required: false, description: 'Total visible angular range in degrees. Default 120.' },
    { name: 'width', type: 'number', required: false, description: 'Strip width in CSS pixels. Default 280.' },
    { name: 'className', type: 'string', required: false, description: 'Outer wrapper className' },
  ],

  states: [
    { name: 'default', trigger: 'Always', description: 'Big yellow heading number + ticks + cardinals', implementedInPrototype: true },
    { name: 'wrap-around', trigger: 'bearing near 0 or 360', description: 'Cardinal labels render at +/- 360 offsets so the wrap is seamless', implementedInPrototype: true },
    { name: 'loading', trigger: 'Telemetry not yet received', description: 'Render with bearing 0 + dimmed appearance', implementedInPrototype: false },
    { name: 'error', trigger: 'Telemetry errored', description: '"---" placeholder', implementedInPrototype: false },
    { name: 'disabled', trigger: 'Camera offline', description: 'Strip dimmed', implementedInPrototype: false },
    { name: 'empty', trigger: 'Not applicable', description: '-', implementedInPrototype: true },
  ],

  interactions: [],

  tokens: {
    colors: [
      { name: 'heading-number', value: '#fde047', usage: 'Big center degrees label' },
      { name: 'cardinal-default', value: 'rgba(255,255,255,0.75)', usage: 'Cardinals + intercardinals' },
      { name: 'cardinal-north', value: '#fca5a5', usage: 'North marker uses a soft red so the user can find it instantly' },
      { name: 'tick-major', value: 'rgba(255,255,255,0.55)', usage: '10° ticks' },
      { name: 'tick-minor', value: 'rgba(255,255,255,0.28)', usage: '5° ticks' },
      { name: 'center-marker', value: '#fde047', usage: 'Fixed center pointer (yellow)' },
    ],
    typography: [
      { name: 'heading-number', fontFamily: 'IBM Plex Mono', fontSize: '20px', fontWeight: '500', lineHeight: '1', usage: 'Big yellow degrees number' },
      { name: 'cardinal', fontFamily: 'system-ui', fontSize: '8.5-10px', fontWeight: '500-700', lineHeight: '1', usage: 'Cardinal/intercardinal labels' },
    ],
    spacing: [
      { name: 'strip-width', value: '280px (default)', usage: 'Outer width of the strip' },
      { name: 'strip-height', value: '28px', usage: 'SVG body height (excludes the heading number below)' },
    ],
  },

  accessibility: {
    role: 'img',
    ariaAttributes: ['<title> inside the SVG with "Camera bearing N degrees"', 'aria-live="polite" on the heading number'],
    keyboardNav: [],
    focusManagement: 'Decorative; not in the focus order.',
  },

  tasks: [],

  notes: [
    'Replaces the previous circular CameraCompassHud - same role (read-only bearing indicator) but the CoD-Warzone language is much closer to the operator\'s muscle memory.',
    'Cardinal labels render at -360 / 0 / +360 offsets per cardinal so wrap-around at North works without an explicit modulo gate.',
  ],
};
