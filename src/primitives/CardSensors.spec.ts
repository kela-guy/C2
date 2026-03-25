import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CardSensors',
  filePath: 'src/primitives/CardSensors.tsx',
  purpose: 'Renders a vertical list of contributing sensor rows for a target card — each row shows sensor type, distance, detection time, and optional icon. Rows can be interactive buttons or static displays.',
  location: 'TargetCard/Slots',
  status: 'prototype',

  props: [
    { name: 'sensors', type: 'CardSensor[]', required: true, description: 'Array of sensor objects: id, typeLabel, icon, distanceLabel, detectedAt' },
    { name: 'label', type: 'string', required: false, defaultValue: "'חיישנים'", description: 'Section label (currently unused in render but available for future header)' },
    { name: 'onSensorHover', type: '(id: string | null) => void', required: false, description: 'Callback fired on mouseEnter (sensor id) and mouseLeave (null) — used to highlight sensor on map' },
    { name: 'onSensorClick', type: '(id: string) => void', required: false, description: 'When provided, rows render as <button> elements instead of <div>, enabling keyboard activation and click handling' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on outer container' },
  ],

  states: [
    {
      name: 'default (static rows)',
      trigger: 'sensors[] provided, no onSensorClick',
      description: 'Renders sensor rows as non-interactive divs with type label, distance, and optional icon',
      implementedInPrototype: true,
      storyProps: {
        sensors: [
          { id: 'cam-north-01', typeLabel: 'Pixelsight', distanceLabel: '450m' },
          { id: 'regulus-02', typeLabel: 'Regulus', distanceLabel: '1.2km' },
          { id: 'radar-main', typeLabel: 'Radar', distanceLabel: '800m' },
        ],
      },
    },
    {
      name: 'interactive rows (clickable)',
      trigger: 'onSensorClick callback provided',
      description: 'Each sensor row renders as a <button> with cursor-pointer, enabling keyboard and click interaction',
      implementedInPrototype: true,
      storyProps: {
        sensors: [
          { id: 'cam-01', typeLabel: 'Pixelsight', distanceLabel: '450m' },
        ],
      },
      visualNotes: 'Rows become <button> elements with cursor-pointer and font-sans override',
    },
    {
      name: 'single sensor',
      trigger: 'sensors[] has exactly one entry',
      description: 'Single row displayed, no visual difference from multi-sensor',
      implementedInPrototype: true,
      storyProps: {
        sensors: [
          { id: 'cam-01', typeLabel: 'PTZ Camera', distanceLabel: '200m' },
        ],
        label: 'חיישנים תורמים',
      },
    },
    {
      name: 'hover highlight',
      trigger: 'Mouse enters a sensor row',
      description: 'Row brightness increases and cyan ring appears (hover:brightness-125, hover:shadow cyan)',
      implementedInPrototype: true,
      visualNotes: 'hover:brightness-125 + hover:shadow-[0_0_0_1px_rgba(6,182,212,0.3)]',
    },
    {
      name: 'with detection time',
      trigger: 'Sensor has detectedAt field',
      description: 'Detection timestamp shown in monospace font on the right side of the row',
      implementedInPrototype: true,
    },
    {
      name: 'loading',
      trigger: 'Sensors data is still being fetched',
      description: 'No loading state — parent must handle skeleton',
      implementedInPrototype: false,
      visualNotes: 'Should show 2-3 skeleton rows at matching height',
    },
    {
      name: 'error',
      trigger: 'Sensor data fetch fails',
      description: 'No error handling — component expects valid data from parent',
      implementedInPrototype: false,
      visualNotes: 'Should show inline error message or retry option',
    },
    {
      name: 'empty',
      trigger: 'sensors[] is empty array',
      description: 'Component returns null — renders nothing',
      implementedInPrototype: true,
    },
    {
      name: 'disabled',
      trigger: 'Parent card is in resolved/expired state',
      description: 'No disabled visual — rows appear identical regardless of card state',
      implementedInPrototype: false,
      visualNotes: 'Should reduce opacity or remove hover effects when card is resolved',
    },
  ],

  interactions: [
    {
      trigger: 'hover (mouseEnter)',
      element: 'Sensor row',
      result: 'Row brightness increases, cyan ring appears. onSensorHover(sensor.id) fires.',
      animation: { property: 'brightness, box-shadow', from: '100%, none', to: '125%, 0 0 0 1px rgba(6,182,212,0.3)', duration: '150ms', easing: 'ease' },
      keyboard: 'N/A (hover only)',
    },
    {
      trigger: 'hover (mouseLeave)',
      element: 'Sensor row',
      result: 'Row returns to default brightness. onSensorHover(null) fires.',
    },
    {
      trigger: 'click',
      element: 'Sensor row (when onSensorClick provided)',
      result: 'Calls onSensorClick(sensor.id)',
      keyboard: 'Enter/Space (native button behavior)',
    },
    {
      trigger: 'focus',
      element: 'Sensor button row',
      result: 'Native focus ring appears (browser default)',
      keyboard: 'Tab to navigate between sensor buttons',
    },
  ],

  tokens: {
    colors: [
      { name: 'row-bg', value: 'CARD_TOKENS.surface.level4', usage: 'Sensor row background color' },
      { name: 'row-ring', value: 'rgba(255,255,255,0.1)', usage: 'Default row border ring (shadow)' },
      { name: 'row-hover-ring', value: 'rgba(6,182,212,0.3)', usage: 'Cyan hover ring highlight' },
      { name: 'row-text', value: 'white', usage: 'Primary row text color (text-white)' },
      { name: 'icon-opacity', value: '0.6', usage: 'Sensor icon opacity (opacity-60)' },
      { name: 'distance-text', value: '#a1a1aa (zinc-400)', usage: 'Distance label text color' },
      { name: 'top-border', value: 'CARD_TOKENS.surface.level2', usage: 'Inset top border via box-shadow' },
    ],
    typography: [
      { name: 'row-text', fontFamily: 'system', fontSize: '11px', fontWeight: '400', lineHeight: '1.4', usage: 'Base row text size (text-[11px])' },
      { name: 'type-label', fontFamily: 'system', fontSize: '12px', fontWeight: '400', lineHeight: '1.4', usage: 'Sensor type label (text-xs)' },
      { name: 'detected-at', fontFamily: 'monospace', fontSize: '12px', fontWeight: '400', lineHeight: '1.4', usage: 'Detection timestamp (font-mono tabular-nums)' },
      { name: 'distance', fontFamily: 'monospace', fontSize: '10px', fontWeight: '400', lineHeight: '1.4', usage: 'Distance label (text-[10px] font-mono tabular-nums)' },
    ],
    spacing: [
      { name: 'row-px', value: '8px', usage: 'Row horizontal padding (px-2)' },
      { name: 'row-py', value: '6px', usage: 'Row vertical padding (py-1.5)' },
      { name: 'row-gap', value: '8px', usage: 'Gap between icon, label, and data (gap-2)' },
      { name: 'list-gap', value: '4px', usage: 'Gap between sensor rows (gap-1)' },
    ],
    borderRadius: [
      { name: 'row-radius', value: '4px', usage: 'Sensor row rounded corners (rounded)' },
    ],
  },

  accessibility: {
    role: 'button (when onSensorClick is provided)',
    ariaAttributes: [
      'aria-label="${typeLabel} — ${id}" on each row (both button and div variants)',
      'aria-hidden="true" on sensor icons (decorative)',
      'aria-hidden="true" on flex spacer span',
    ],
    keyboardNav: [
      'Tab: navigates between sensor rows (only when rendered as buttons)',
      'Enter/Space: activates sensor click (native button behavior)',
    ],
    focusManagement: 'No custom focus management — relies on native button focus. When rows are divs, they are not keyboard-focusable.',
    screenReaderNotes: 'Each row has an aria-label combining typeLabel and id. Distance and detection time are visible but included in the accessible name only indirectly. Consider adding aria-description for these values.',
  },

  flows: [
    {
      name: 'Highlight sensor on map',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Hovers over a sensor row', result: 'Row highlights with cyan ring, onSensorHover(id) fires' },
        { actor: 'system', action: 'Parent highlights sensor marker on tactical map', result: 'Map marker for sensor becomes prominent' },
        { actor: 'user', action: 'Moves mouse away from row', result: 'onSensorHover(null) fires, map marker returns to default' },
      ],
    },
    {
      name: 'Open sensor detail',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks on sensor row (onSensorClick provided)', result: 'onSensorClick(id) fires' },
        { actor: 'system', action: 'Parent opens sensor detail panel or zooms map to sensor', result: 'User sees detailed sensor info' },
      ],
    },
  ],

  tasks: [
    {
      id: 'CS-1',
      title: 'Add loading skeleton rows',
      priority: 'P1',
      estimate: 'S',
      description: 'Support a loading prop or skeleton variant that shows 2-3 shimmer rows matching the row height while sensor data is being fetched.',
      files: [{ path: 'src/primitives/CardSensors.tsx', action: 'modify', description: 'Add loading prop with skeleton row rendering' }],
      acceptanceCriteria: [
        'Loading state shows 2-3 skeleton rows at matching height',
        'Skeleton has pulse animation consistent with other card skeletons',
        'Transitions smoothly to real data when sensors load',
      ],
    },
    {
      id: 'CS-2',
      title: 'Add section header with label',
      priority: 'P2',
      estimate: 'S',
      description: 'The label prop exists but is not rendered. Add a small section header above the sensor list using the label value.',
      files: [{ path: 'src/primitives/CardSensors.tsx', action: 'modify', description: 'Render label as section header before sensor rows' }],
      acceptanceCriteria: [
        'Label renders as small header text above sensor list',
        'Header has consistent typography with other card section headers',
        'Header is hidden when label is undefined/empty',
      ],
    },
    {
      id: 'CS-3',
      title: 'Add focus-visible styling for button rows',
      priority: 'P1',
      estimate: 'S',
      description: 'Button rows lack visible focus indicators beyond the browser default. Add a focus-visible ring matching the hover cyan ring.',
      files: [{ path: 'src/primitives/CardSensors.tsx', action: 'modify', description: 'Add focus-visible:shadow-[0_0_0_1px_rgba(6,182,212,0.5)] class' }],
      acceptanceCriteria: [
        'Focus-visible shows cyan ring similar to hover state',
        'Focus ring is clearly visible on dark background',
        'Ring disappears on mouse click (focus-visible only)',
      ],
    },
    {
      id: 'CS-4',
      title: 'Add aria-description for distance and time',
      priority: 'P2',
      estimate: 'S',
      description: 'Distance and detection time are visible but not fully communicated via the aria-label. Add aria-description that includes these values.',
      files: [{ path: 'src/primitives/CardSensors.tsx', action: 'modify', description: 'Build descriptive string from distanceLabel and detectedAt' }],
      acceptanceCriteria: [
        'Screen reader announces distance when row is focused',
        'Detection time is included in accessible description',
      ],
    },
  ],

  hardcodedData: [
    {
      current: "Inline hover shadow: hover:shadow-[0_0_0_1px_rgba(6,182,212,0.3)]",
      replaceWith: 'CSS custom property or CARD_TOKENS.sensors.hoverRing',
      location: 'CardSensors.tsx line 22 (rowClassName)',
    },
    {
      current: "Ring shadow: shadow-[0_0_0_1px_rgba(255,255,255,0.1)]",
      replaceWith: 'CSS custom property or CARD_TOKENS.sensors.borderRing',
      location: 'CardSensors.tsx line 22 (rowClassName)',
    },
  ],

  notes: [
    'Row rendering is split between <button> (when onSensorClick is provided) and <div> (static) — they share the same inner content via the `inner` JSX fragment.',
    'The label prop is declared but never rendered in the component. It exists for future section header usage.',
    'RTL direction is set on the outer container (dir="rtl") for Hebrew layout.',
    'The inset top border uses box-shadow instead of CSS border to avoid layout shift and keep consistent row sizing.',
    'Icon rendering uses sensor.icon as a component (React.ElementType) with size={16} and fill="currentColor".',
  ],
};
