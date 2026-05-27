import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraContextMenu',
  filePath: 'src/app/components/camera-v2/CameraContextMenu.tsx',
  purpose:
    'Right-click context menu for a camera feed tile. Wraps the live <video> + overlays so a right-click anywhere inside the tile opens the menu. Four operator actions: a read-only coordinates row with an inline copy button, Tracker, Look at, and Create target. Direction follows the app (RTL in Hebrew).',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'children', type: 'React.ReactNode', required: true, description: 'The tile root that should host the context menu trigger' },
    { name: 'coordinates', type: 'string', required: false, description: 'Coord string rendered in the first row. Defaults to a mock value until right-click → world raycast is wired.' },
    { name: 'onCopyCoordinates', type: '() => void', required: false, description: 'Stub for the copy button. UI phase only — wire to clipboard later.' },
    { name: 'onTracker', type: '() => void', required: false, description: 'Stub for the Tracker action. Wired to a single-use mode in a later pass.' },
    { name: 'onLookAt', type: '() => void', required: false, description: 'Stub for the Look at action. Wired to a single-use mode in a later pass.' },
    { name: 'onCreateTarget', type: '() => void', required: false, description: 'Stub for the Create target action. Wired to a single-use mode in a later pass.' },
  ],

  states: [
    { name: 'closed', trigger: 'No right-click yet', description: 'Children render normally; menu is not in DOM', implementedInPrototype: true },
    { name: 'open', trigger: 'right-click', description: 'Menu appears at the cursor with four rows in reading order', implementedInPrototype: true },
    { name: 'loading', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'error', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'disabled', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'empty', trigger: 'N/A', description: '-', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'right-click', element: 'tile body', result: 'Menu appears at the cursor' },
    { trigger: 'click', element: 'Copy button (inside Coordinates row)', result: 'Calls onCopyCoordinates. Row stays open (onSelect.preventDefault on the row, stopPropagation on the button).' },
    { trigger: 'click', element: 'Tracker row', result: 'Calls onTracker' },
    { trigger: 'click', element: 'Look at row', result: 'Calls onLookAt' },
    { trigger: 'click', element: 'Create target row', result: 'Calls onCreateTarget' },
  ],

  tokens: {
    colors: [
      { name: 'menu-bg', value: 'rgba(26,26,26,0.95)', usage: 'Menu background (matches the project glass style)' },
      { name: 'menu-shadow', value: '0_0_0_1px_rgba(255,255,255,0.15)', usage: 'Inset hairline + drop shadow' },
    ],
    typography: [
      { name: 'menu-item', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '400', lineHeight: '1.2', usage: 'Menu item text' },
      { name: 'coordinates', fontFamily: 'IBM Plex Mono', fontSize: '11px', fontWeight: '400', lineHeight: '1', usage: 'Coordinates value rendered inside <Bdi direction="ltr"> so the LTR coord string stays readable inside an RTL menu' },
    ],
    spacing: [
      { name: 'min-width', value: '220px', usage: 'Min menu width' },
    ],
  },

  accessibility: {
    role: 'menu',
    ariaAttributes: ['Radix ContextMenu handles roving focus + aria-haspopup', 'Each item exposes its own role="menuitem"', 'Copy button carries its own aria-label from i18n'],
    keyboardNav: ['Arrow keys navigate within an open menu', 'Esc closes'],
    focusManagement: 'Radix focus-trap inside the menu; focus returns to the tile on close.',
  },

  tasks: [],

  notes: [
    'Right-click is consumed by Radix ContextMenu so the browser-native menu never shows.',
    'Tracker / Look at / Create target are intended as single-use modes — activate from menu, consume on the next click on the feed, then revert to default. That wiring is not implemented in the UI phase; the handlers are stubs.',
    'Menu direction follows the app via `useDirection()` → `dir={direction}` on ContextMenuContent. The coordinates value is wrapped in `<Bdi direction="ltr">` so the LTR coord string never reorders inside an RTL paragraph.',
    'No keyboard shortcut hints in this menu — shortcuts (T, D, X, S) remain on the control bar tooltips.',
  ],
};
