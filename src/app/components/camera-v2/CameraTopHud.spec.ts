import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraTopHud',
  filePath: 'src/app/components/camera-v2/CameraTopHud.tsx',
  purpose:
    'Always-visible top overlay for a camera tile. Top-left cluster of pills (LIVE, DAY/IR, camera name, linked-from device, optional target assignment) and the CoD-Warzone heading strip in the center. Right side is intentionally empty - ownership state lives on the bottom control bar.',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'cameraLabel', type: 'string', required: true, description: 'Human-readable camera name (e.g. "PTZ Camera (North)")' },
    { name: 'mode', type: '"day" | "night"', required: true, description: 'Current optical mode for the day/night pill' },
    { name: 'status', type: 'CameraStatus', required: true, description: 'Bearing, FOV, ownership, assignment, linked-from device, area name' },
    { name: 'onAssignmentClick', type: '() => void', required: false, description: 'Click handler on the assignment pill (e.g. focus target on map)' },
  ],

  states: [
    { name: 'default', trigger: 'Always', description: 'LIVE + DAY/IR + camera name pills + CoD compass strip', implementedInPrototype: true },
    { name: 'with target assignment', trigger: 'status.assignedTargetLabel is set', description: 'Amber assignment pill renders next to the camera name; clickable; sub-label of the compass shows the target', implementedInPrototype: true },
    { name: 'linked from device', trigger: 'status.linkedFromDeviceLabel is set', description: 'Sky-blue Link2 pill shows the slewing device id (e.g. RAD-NVT-RADA)', implementedInPrototype: true },
    { name: 'day mode', trigger: 'mode === "day"', description: 'Sun icon + DAY label', implementedInPrototype: true },
    { name: 'night mode', trigger: 'mode === "night"', description: 'Moon icon + IR label', implementedInPrototype: true },
    { name: 'loading', trigger: 'Telemetry not yet received', description: 'Compass + bearing show placeholder; pills greyed', implementedInPrototype: false },
    { name: 'error', trigger: 'Telemetry stream errored', description: 'Show error tag in the top cluster', implementedInPrototype: false },
    { name: 'disabled', trigger: 'Camera offline', description: 'Pills shown with reduced opacity', implementedInPrototype: false },
    { name: 'empty', trigger: 'Not applicable - HUD only renders for live feeds', description: '-', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'click', element: 'Assignment pill', result: 'Calls onAssignmentClick (focus target on map in Dashboard; no-op on Playground)' },
    { trigger: 'hover', element: 'Linked-from pill', result: 'Tooltip shows the slewing relationship in plain Hebrew' },
  ],

  tokens: {
    colors: [
      { name: 'gradient', value: 'linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(0,0,0,0))', usage: 'Top legibility gradient' },
      { name: 'live-dot', value: '#ef4444', usage: 'Pulsing live indicator' },
      { name: 'ir-accent', value: '#7dd3fc', usage: 'Night/IR pill icon' },
      { name: 'day-accent', value: '#fcd34d', usage: 'Day pill icon' },
      { name: 'linked-pill-bg', value: 'rgba(14,165,233,0.20)', usage: 'Linked-from pill background' },
      { name: 'assignment-pill-bg', value: 'rgba(245,158,11,0.15)', usage: 'Target assignment pill' },
    ],
    typography: [
      { name: 'pill-label', fontFamily: 'Heebo', fontSize: '9-10px', fontWeight: '500', lineHeight: '1', usage: 'Pill labels (LIVE, DAY, IR, camera name, linked-from)' },
    ],
    spacing: [
      { name: 'hud-padding', value: '10px 12px', usage: 'Padding from the tile edges' },
      { name: 'pill-gap', value: '6px', usage: 'Gap between adjacent pills' },
    ],
  },

  accessibility: {
    ariaAttributes: ['Compass strip is role="img" with sr-only description', 'Linked-from pill is wrapped in a tooltip for sighted users + retains label for SR'],
    keyboardNav: ['Assignment pill is keyboard-focusable when present'],
    focusManagement: 'focus-visible:ring-2 ring-white/25 on the assignment pill',
  },

  tasks: [],

  notes: [
    'Wrapped in pointer-events-none with selectively pointer-events-auto sub-areas so the HUD never blocks underlying drag handlers.',
    'Pills always render with dir="ltr" for the LTR-only acronyms (LIVE, IR, ids, etc.) inside the RTL parent.',
    'Right-side empty by design - ownership pills were removed in v2; the lock icon on the control bar is the single source of truth.',
  ],
};
