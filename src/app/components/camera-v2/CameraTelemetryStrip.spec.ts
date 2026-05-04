import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraTelemetryStrip',
  filePath: 'src/app/components/camera-v2/CameraTelemetryStrip.tsx',
  purpose:
    'Bottom-center telemetry strip. Hover-revealed. Camera mode shows a zoom slider + FOV; drone mode shows zoom + altitude + velocity. All numerics use tabular-nums to avoid jitter.',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'visible', type: 'boolean', required: true, description: 'Drives the fade in/out (mirrors the control bar)' },
    { name: 'status', type: 'CameraStatus', required: true, description: 'Drives the readouts: zoomLevel, fovDeg, altitudeM, velocityMps, deviceType' },
    { name: 'disabled', type: 'boolean', required: false, description: 'Disables the zoom slider when the camera is foreign-locked' },
    { name: 'onZoomChange', type: '(zoom: number) => void', required: true, description: 'Bubbles the new zoom (clamped 1.0..30.0, 1 decimal)' },
  ],

  states: [
    { name: 'camera', trigger: 'status.deviceType === "camera"', description: 'Zoom slider + FOV readout', implementedInPrototype: true },
    { name: 'drone', trigger: 'status.deviceType === "drone"', description: 'Zoom slider + altitude + velocity', implementedInPrototype: true },
    { name: 'hidden', trigger: 'visible === false', description: 'Strip is opacity-0 + pointer-events-none', implementedInPrototype: true },
    { name: 'disabled', trigger: 'disabled === true', description: 'Slider is non-interactive', implementedInPrototype: true },
    { name: 'loading', trigger: 'No telemetry yet', description: 'Strip would show "--" placeholders', implementedInPrototype: false },
    { name: 'error', trigger: 'Telemetry stream errored', description: 'Strip dims and tooltips explain the error', implementedInPrototype: false },
    { name: 'empty', trigger: 'N/A', description: '-', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'click', element: 'Zoom +/- buttons', result: 'Increments zoom by 0.5x' },
    { trigger: 'input', element: 'Zoom slider', result: 'Calls onZoomChange with the parsed (clamped) value' },
  ],

  tokens: {
    colors: [
      { name: 'strip-bg', value: 'rgba(0,0,0,0.55)', usage: 'Strip background' },
      { name: 'slider-accent', value: '#fcd34d', usage: 'Zoom slider thumb (amber)' },
    ],
    typography: [
      { name: 'stat-label', fontFamily: 'system-ui', fontSize: '9px', fontWeight: '500', lineHeight: '1', usage: 'ZOOM / FOV / ALT / VEL labels' },
      { name: 'stat-value', fontFamily: 'IBM Plex Mono', fontSize: '11px', fontWeight: '500', lineHeight: '1', usage: 'Numeric values (tabular-nums)' },
    ],
    spacing: [
      { name: 'strip-padding', value: '6px 10px', usage: 'Inner padding' },
      { name: 'item-gap', value: '12px', usage: 'Gap between stats' },
    ],
  },

  accessibility: {
    ariaAttributes: ['aria-label on Zoom +/- buttons', 'aria-label="Zoom level" on the slider', 'aria-hidden when visible=false'],
    keyboardNav: ['Arrow keys move the slider when focused'],
    focusManagement: 'focus-visible:ring-2 ring-white/25 on every button + the slider',
  },

  tasks: [
    {
      id: 'CTS-1',
      title: 'Wire real PTZ zoom command',
      priority: 'P0',
      estimate: 'M',
      description: 'Bubble onZoomChange to the camera control backend; reflect actual hardware position back into status.zoomLevel.',
      files: [{ path: 'src/app/components/PlaygroundPage.tsx', action: 'modify', description: 'Replace local zoom state with backend round-trip' }],
      acceptanceCriteria: ['Zoom slider drives the real PTZ command', 'Slider position reflects the latest hardware-confirmed zoom'],
    },
  ],

  hardcodedData: [
    { current: 'Local zoom state in PlaygroundPage', replaceWith: 'Backend PTZ command + telemetry feedback', location: 'PlaygroundPage zoomById' },
  ],

  notes: [
    'Numeric readouts use tabular-nums to avoid the bouncy "9.2 -> 10" jitter when value width changes.',
    'Drone variant intentionally drops FOV - operators care about altitude/velocity instead.',
  ],
};
