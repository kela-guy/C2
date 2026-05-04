import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'DesignateTargetOverlay',
  filePath: 'src/app/components/camera-v2/DesignateTargetOverlay.tsx',
  purpose:
    '"Designate target" overlay for a camera feed. While `active`, forces the cursor to a crosshair, draws a follow-cursor reticle, paints an amber inset ring on the feed, and shows an RTL hint banner ("לחץ כדי לסמן יעד · Esc לביטול"). The next click anywhere on the feed fires onDesignate(normX, normY) with normalised coords (0..1, top-left origin) and triggers a brief amber "ping" at the chosen point as a visual receipt; the parent is responsible for clearing the active flag (single-shot mode).',
  location: 'Primitive (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'active', type: 'boolean', required: true, description: 'When true, the overlay is armed: cursor → crosshair, reticle follows the pointer, hint banner + amber ring are visible, and the next click designates a target.' },
    { name: 'onDesignate', type: '(normX: number, normY: number) => void', required: true, description: 'Fires on the click that designates a target. Coords are clamped to [0, 1] and measured from the top-left of the overlay (= the feed) bounding rect.' },
  ],

  states: [
    { name: 'inactive', trigger: 'active === false (and no recent designation)', description: 'Overlay renders nothing; cursor is the platform default.', implementedInPrototype: true },
    { name: 'armed (cursor outside)', trigger: 'active === true, pointer not yet inside', description: 'Amber inset ring + hint banner; no reticle until the pointer enters.', implementedInPrototype: true },
    { name: 'armed (cursor tracking)', trigger: 'active === true, mousemove inside', description: 'Reticle follows the cursor in real time.', implementedInPrototype: true },
    { name: 'designation flash', trigger: 'click while active, ~1.1s after the click', description: 'Amber "ping" rings out from the chosen point; persists across the active=false flip so the operator sees feedback even after the parent exits the mode.', implementedInPrototype: true },
    { name: 'loading', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'error', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'disabled', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'empty', trigger: 'N/A', description: '-', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'mousemove', element: 'overlay', result: 'Reticle re-anchors to the cursor position (px coords inside the bounding rect)' },
    { trigger: 'mouseleave', element: 'overlay', result: 'Reticle is hidden until the cursor re-enters' },
    { trigger: 'click', element: 'overlay', result: 'Calls onDesignate with normalised coords, then renders a brief amber ping at the click point' },
  ],

  tokens: {
    colors: [
      { name: 'reticle', value: '#fde047', usage: 'Follow-cursor reticle stroke + center dot' },
      { name: 'ring', value: 'rgba(252,211,77,0.55)', usage: 'Inset 2px amber ring framing the feed while armed' },
      { name: 'hint-bg', value: 'rgba(251,191,36,0.95)', usage: 'Hint banner background' },
      { name: 'flash', value: '#fcd34d', usage: 'Designation ping ring + center dot' },
    ],
    typography: [
      { name: 'hint', fontFamily: 'Heebo', fontSize: '10px', fontWeight: '600', lineHeight: '1', usage: '"לחץ כדי לסמן יעד · Esc לביטול" hint banner' },
    ],
    spacing: [
      { name: 'reticle-size', value: '56px', usage: 'Total bounding box of the follow-cursor reticle SVG' },
      { name: 'flash-size', value: '44px', usage: 'Total bounding box of the designation ping' },
    ],
  },

  accessibility: {
    role: 'button',
    ariaAttributes: ['role="button"', 'aria-label="לחץ כדי לסמן יעד"', 'aria-hidden on the decorative ring / hint / reticle'],
    keyboardNav: ['Esc on the parent tile cancels designate mode (handled by the tile, not the overlay).'],
    focusManagement: 'Overlay is tabIndex=-1; the click target is acquired with the mouse. Keyboard cancellation routes through the parent tile.',
    screenReaderNotes: 'Hint banner is aria-hidden; for assistive tech, the parent button label "סמן יעד" / "בטל סימון יעד" carries the mode state.',
  },

  tasks: [
    {
      id: 'DTO-1',
      title: 'Bubble designation up to a real targeting backend',
      priority: 'P1',
      estimate: 'M',
      description: 'PlaygroundPage currently console.logs the normalised coords. In the live dashboard, route the (cameraId, normX, normY) tuple to the targeting service so it can spawn / re-anchor a tracked target.',
      files: [
        { path: 'src/app/components/Dashboard.tsx', action: 'modify', description: 'Wire VideoPanel.onDesignateTarget to the targeting service' },
      ],
      acceptanceCriteria: ['Designation creates / re-anchors a tracked target', 'Target appears on the map and the camera HUD'],
    },
    {
      id: 'DTO-2',
      title: 'Keyboard-driven designation',
      priority: 'P2',
      estimate: 'S',
      description: 'Allow keyboard users to designate the geometric center of the feed (or last reticle position) via Enter while designate mode is armed.',
      files: [{ path: 'src/app/components/camera-v2/DesignateTargetOverlay.tsx', action: 'modify', description: 'Add Enter handler that fires onDesignate(0.5, 0.5) when no cursor position is recorded' }],
      acceptanceCriteria: ['Designate mode is fully usable from the keyboard'],
    },
  ],

  hardcodedData: [],

  notes: [
    'The overlay sits at z-10 so the bottom control bar (z-20) stays clickable while armed - this lets the user press the crosshair button again to cancel without leaving the overlay.',
    'Click coordinates are normalised against the overlay\'s bounding rect, which equals the feed\'s rendered pixels (object-cover + absolute inset-0). A future "video intrinsic bounds" mapping can convert these to detector-space coordinates.',
    'The flash deliberately survives the parent\'s active=false flip so the operator sees a receipt even though the mode self-exits on click.',
    'Hidden inside the playback split: the parent only renders this overlay on the live view, mirroring the existing detections behavior.',
  ],
};
