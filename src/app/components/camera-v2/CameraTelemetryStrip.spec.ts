import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraTelemetryStrip',
  filePath: 'src/app/components/camera-v2/CameraTelemetryStrip.tsx',
  purpose:
    'Bottom-center read-only telemetry strip. Hover-revealed and drone-only - shows altitude + velocity. Cameras do not render the strip at all; their controllable telemetry (zoom, day/night, AI scan, designate, etc.) lives on the control bar instead. All numerics use tabular-nums to avoid jitter.',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'visible', type: 'boolean', required: true, description: 'Drives the fade in/out (mirrors the control bar)' },
    { name: 'status', type: 'CameraStatus', required: true, description: 'Drives the readouts: altitudeM, velocityMps, deviceType' },
  ],

  states: [
    { name: 'drone', trigger: 'status.deviceType === "drone"', description: 'Altitude + velocity stats', implementedInPrototype: true },
    { name: 'camera', trigger: 'status.deviceType === "camera"', description: 'Strip is not rendered at all', implementedInPrototype: true },
    { name: 'hidden', trigger: 'visible === false', description: 'Strip is opacity-0 + pointer-events-none', implementedInPrototype: true },
    { name: 'loading', trigger: 'No telemetry yet', description: 'Strip would show "--" placeholders', implementedInPrototype: false },
    { name: 'error', trigger: 'Telemetry stream errored', description: 'Strip dims and tooltips explain the error', implementedInPrototype: false },
    { name: 'disabled', trigger: 'N/A', description: 'Strip is read-only - nothing to disable', implementedInPrototype: true },
    { name: 'empty', trigger: 'See "camera"', description: '-', implementedInPrototype: true },
  ],

  interactions: [],

  tokens: {
    colors: [
      { name: 'strip-bg', value: 'rgba(0,0,0,0.55)', usage: 'Strip background' },
    ],
    typography: [
      { name: 'stat-label', fontFamily: 'system-ui', fontSize: '9px', fontWeight: '500', lineHeight: '1', usage: 'ALT / VEL labels' },
      { name: 'stat-value', fontFamily: 'IBM Plex Mono', fontSize: '11px', fontWeight: '500', lineHeight: '1', usage: 'Numeric values (tabular-nums)' },
    ],
    spacing: [
      { name: 'strip-padding', value: '6px 10px', usage: 'Inner padding' },
      { name: 'item-gap', value: '12px', usage: 'Gap between stats' },
    ],
  },

  accessibility: {
    ariaAttributes: ['aria-hidden when visible=false'],
    keyboardNav: ['No interactive elements - the strip is purely informational'],
    focusManagement: 'N/A - no focusable children',
  },

  tasks: [],

  hardcodedData: [],

  notes: [
    'Numeric readouts use tabular-nums to avoid the bouncy "9.2 -> 10" jitter when value width changes.',
    'Cameras get nothing here in v2: zoom moved to CameraControlBar and FOV was removed entirely (the FOV cone in CameraCompassStrip already conveys it visually). Drone-only telemetry keeps the strip useful without producing an empty pill on cameras.',
  ],
};
