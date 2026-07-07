import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraToggleButton',
  filePath: 'src/primitives/CameraToggleButton.tsx',
  purpose: 'Single on/off camera control for target cards. Off invites "point the camera"; pressing it slews (pending) and settles into a brighter "on" state ("Release camera"). The on state reads the same idle or hovered. Replaces the former separate Point Camera + Cancel buttons with one toggle.',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'on', type: 'boolean', required: true, description: 'Whether the camera is currently live/locked on the target' },
    { name: 'pending', type: 'boolean', required: false, defaultValue: 'false', description: 'Transient slew phase between off and on — shows a spinner and is non-interactive' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", required: false, defaultValue: "'sm'", description: 'Size tier — aliased through BUTTON_SIZES in buttonTokens onto the ui/button cva sizes' },
    { name: 'offLabel', type: 'string', required: true, description: 'Label in the off (idle) state, e.g. "Point camera"' },
    { name: 'onLabel', type: 'string', required: true, description: 'Label in the on (live) state, e.g. "Release camera"' },
    { name: 'pendingLabel', type: 'string', required: false, description: 'Label while slewing; falls back to onLabel' },
    { name: 'offIcon', type: 'React.ElementType', required: false, description: 'Icon for the off state (e.g. Video)' },
    { name: 'onIcon', type: 'React.ElementType', required: false, description: 'Icon for the on state (e.g. Video)' },
    { name: 'onToggle', type: '(e: React.MouseEvent) => void', required: true, description: 'Invoked for both on and off presses — caller decides start vs stop based on `on`' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Extra classes merged onto the underlying button' },
  ],

  states: [
    {
      name: 'off',
      trigger: 'on=false, pending=false',
      description: 'Idle "point the camera" affordance — fill variant, Video icon, aria-pressed="false"',
      implementedInPrototype: true,
      storyProps: { on: false, offLabel: 'Point camera', onLabel: 'Release camera' },
      visualNotes: 'bg-white/[0.08], neutral text',
    },
    {
      name: 'pending',
      trigger: 'pending=true',
      description: 'Slewing toward the target — spinner with pendingLabel, non-interactive, aria-pressed="true"',
      implementedInPrototype: true,
      visualNotes: 'Loader2 spinner; cursor-wait; transient (~1.5s)',
    },
    {
      name: 'on',
      trigger: 'on=true, pending=false',
      description: 'Camera live — brighter white "filled" treatment, "Release camera" + Video icon, aria-pressed="true". Identical idle or hovered.',
      implementedInPrototype: true,
      storyProps: { on: true, offLabel: 'Point camera', onLabel: 'Release camera' },
      visualNotes: 'Brighter white fill (bg-white/[0.20], shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)])',
    },
  ],

  interactions: [
    { trigger: 'click', element: 'Button (off)', result: 'Calls onToggle — caller starts the camera (pointing)' },
    { trigger: 'click', element: 'Button (on)', result: 'Calls onToggle — caller stops/releases the camera' },
    { trigger: 'click', element: 'Button (pending)', result: 'No-op — button is non-interactive while slewing' },
  ],

  tokens: {
    colors: [
      { name: 'off-bg', value: 'rgba(255,255,255,0.08)', usage: 'Off-state fill background' },
      { name: 'on-bg', value: 'rgba(255,255,255,0.20)', usage: 'Brighter white fill behind the live state' },
      { name: 'on-ring', value: 'rgba(255,255,255,0.22)', usage: 'White inset ring marking the live state' },
      { name: 'on-text', value: '#ffffff (white)', usage: 'Live-state label/icon color' },
    ],
    typography: [
      { name: 'label', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '500', lineHeight: '1', usage: 'Button label (sm size)' },
    ],
    spacing: [
      { name: 'btn-height', value: '30px', usage: 'sm button height (min-h-[30px])' },
      { name: 'btn-px', value: '12px', usage: 'Horizontal padding (px-3)' },
    ],
    animations: [
      { name: 'state-transition', property: 'background-color, box-shadow, transform', duration: '150ms', easing: 'ease-out', usage: 'Off ⇄ on shell transition' },
      { name: 'label-swap', property: 'opacity, y', duration: '0.3s', easing: 'spring(bounce:0)', usage: 'Label crossfade shared with the button family (respects prefers-reduced-motion)' },
    ],
  },

  accessibility: {
    role: 'button',
    ariaAttributes: [
      'aria-pressed reflects the on state via Radix Toggle (true while pending and on, false when off)',
      'aria-busy while pending',
    ],
    keyboardNav: [
      'Tab: focuses the toggle (native)',
      'Enter/Space: toggles on/off (native button)',
    ],
    focusManagement: 'Standard focus-visible inset ring shared with the button family.',
    screenReaderNotes: 'aria-pressed communicates toggle state; pending announces via aria-live polite.',
  },

  flows: [
    {
      name: 'Point then release',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks the off toggle', result: 'Camera slews (pending spinner)' },
        { actor: 'system', action: 'Slew completes', result: 'Toggle settles into the brighter white on state ("Release camera")' },
        { actor: 'user', action: 'Clicks again', result: 'onToggle fires — caller stops the camera, returns to off' },
      ],
    },
  ],

  tasks: [],

  notes: [
    'Built on the vendored shadcn Toggle (Radix Toggle) for real aria-pressed / data-state=on toggle semantics; the shell wears the ui/button buttonVariants cva (fill variant + size scale via the buttonTokens alias maps) so visuals stay unified with the button family.',
    'Driven by data via CardAction.toggle in CardActions; emitted from useCardSlots for both the CUAS investigate flow and the jamming/BDA flow.',
    'The on state uses a brighter white fill so the toggle visibly "fills" when live; the on state reads the same idle or hovered.',
  ],
};
