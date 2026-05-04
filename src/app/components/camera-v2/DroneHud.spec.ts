import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'DroneHud',
  filePath: 'src/app/components/camera-v2/DroneHud.tsx',
  purpose:
    'Right-edge stat column inspired by DJI Fly. Mounts only when the active feed is a drone. Shows battery, signal, distance from home, and relative bearing to home.',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'status', type: 'CameraStatus', required: true, description: 'Provides batteryPct, signalPct, distanceFromHomeM, bearingDeg, deviceType' },
  ],

  states: [
    { name: 'rendered', trigger: 'status.deviceType === "drone"', description: 'Stat column renders on the right edge', implementedInPrototype: true },
    { name: 'hidden', trigger: 'status.deviceType !== "drone"', description: 'Returns null', implementedInPrototype: true },
    { name: 'low battery', trigger: 'batteryPct <= 20', description: 'Battery icon switches to BatteryLow + red tint', implementedInPrototype: true },
    { name: 'medium battery', trigger: 'batteryPct <= 40', description: 'Amber tint', implementedInPrototype: true },
    { name: 'low signal', trigger: 'signalPct <= 25', description: 'Signal icon switches to SignalLow + red tint', implementedInPrototype: true },
    { name: 'loading', trigger: 'No telemetry yet', description: 'Show "--" placeholders for each stat', implementedInPrototype: false },
    { name: 'error', trigger: 'Telemetry errored', description: 'Stats show "ERR" and turn amber', implementedInPrototype: false },
    { name: 'disabled', trigger: 'Drone offline', description: 'Stats greyed out', implementedInPrototype: false },
    { name: 'empty', trigger: 'N/A', description: '-', implementedInPrototype: true },
  ],

  interactions: [],

  tokens: {
    colors: [
      { name: 'panel-bg', value: 'rgba(0,0,0,0.45)', usage: 'Stat-column background' },
      { name: 'value-default', value: 'rgba(255,255,255,0.95)', usage: 'Distance + relative heading values' },
      { name: 'value-good', value: '#6ee7b7', usage: 'Battery / signal in healthy range' },
      { name: 'value-warn', value: '#fcd34d', usage: 'Battery 20-40%, signal 25-50%' },
      { name: 'value-bad', value: '#fca5a5', usage: 'Battery <=20%, signal <=25%' },
    ],
    typography: [
      { name: 'stat-label', fontFamily: 'system-ui', fontSize: '8.5px', fontWeight: '500', lineHeight: '1', usage: 'BAT / SIG / HOME / REL labels' },
      { name: 'stat-value', fontFamily: 'IBM Plex Mono', fontSize: '12px', fontWeight: '500', lineHeight: '1', usage: 'Numeric values (tabular-nums)' },
    ],
    spacing: [
      { name: 'tile-gap', value: '6px', usage: 'Vertical gap between stat tiles' },
      { name: 'panel-padding', value: '8px', usage: 'Inner padding of the stat column' },
    ],
  },

  accessibility: {
    ariaAttributes: ['aria-hidden="true" - decorative; the same data is exposed via the settings popover for a11y consumers'],
    keyboardNav: [],
    focusManagement: 'Not interactive.',
  },

  tasks: [
    {
      id: 'DH-1',
      title: 'Wire MAVLink telemetry',
      priority: 'P0',
      estimate: 'M',
      description: 'Replace the synthetic tick in PlaygroundPage with MAVLink (or the project\'s drone bridge) and ensure values converge with the map view.',
      files: [{ path: 'src/app/components/PlaygroundPage.tsx', action: 'modify', description: 'Drop droneTelemetry tick; subscribe to the drone bridge instead' }],
      acceptanceCriteria: ['Battery / signal / distance / heading reflect real drone telemetry', 'Updates at >= 1 Hz'],
    },
  ],

  hardcodedData: [
    { current: 'Synthetic 1Hz jitter loop', replaceWith: 'Real drone telemetry feed', location: 'PlaygroundPage droneTelemetry' },
  ],

  notes: [
    'Right-edge column is intentionally narrow (~76px) to reserve as much of the tile as possible for the actual video.',
    'Heading-vs-home is a delta from home (0° = home in front of the drone) so operators can recover orientation in degraded conditions.',
  ],
};
