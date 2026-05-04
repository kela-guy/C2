import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraContextMenu',
  filePath: 'src/app/components/camera-v2/CameraContextMenu.tsx',
  purpose:
    'Right-click context menu for a camera feed tile. Wraps the live <video> + overlays so a right-click anywhere inside the tile (except over a popover) opens the menu. Items disable when the camera is locked by another operator.',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'children', type: 'React.ReactNode', required: true, description: 'The tile root that should host the context menu trigger' },
    { name: 'mode', type: '"day" | "night"', required: true, description: 'Drives the day/night row label' },
    { name: 'status', type: 'CameraStatus', required: true, description: 'Drives ownership disable + lock label' },
    { name: 'detectionsOn', type: 'boolean', required: true, description: 'Drives the AI detection row label' },
    { name: 'designateMode', type: 'boolean', required: true, description: 'Drives the designate-target row label and active style' },
    { name: 'onTakeRelease', type: '() => void', required: true, description: 'Take or release ownership' },
    { name: 'onModeToggle', type: '() => void', required: true, description: 'Day/night toggle' },
    { name: 'onDetectionsToggle', type: '() => void', required: true, description: 'AI detection toggle' },
    { name: 'onDesignateModeToggle', type: '() => void', required: true, description: 'Toggle designate-target mode' },
    { name: 'onResetView', type: '() => void', required: true, description: 'Reset overlays' },
    { name: 'onOpenSettings', type: '() => void', required: true, description: 'Open the settings popover' },
    { name: 'onPinToGrid', type: '() => void', required: false, description: 'Stub - pin this camera to the dashboard grid (future)' },
  ],

  states: [
    { name: 'closed', trigger: 'No right-click yet', description: 'Children render normally; menu is not in DOM', implementedInPrototype: true },
    { name: 'open', trigger: 'right-click', description: 'Menu appears at the cursor', implementedInPrototype: true },
    { name: 'foreign-locked', trigger: 'status.controlOwner === "other"', description: 'Day/night row is disabled; lock row label switches to "נעול ע״י <name>"', implementedInPrototype: true },
    { name: 'request pending', trigger: 'status.controlRequestPending === true', description: 'Take/Release row disabled', implementedInPrototype: true },
    { name: 'loading', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'error', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'disabled', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'empty', trigger: 'N/A', description: '-', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'right-click', element: 'tile body', result: 'Menu appears at the cursor' },
    { trigger: 'click', element: 'Take/Release row', result: 'Calls onTakeRelease' },
    { trigger: 'click', element: 'Day/Night row', result: 'Calls onModeToggle' },
    { trigger: 'click', element: 'AI detection row', result: 'Calls onDetectionsToggle' },
    { trigger: 'click', element: 'Designate target row', result: 'Calls onDesignateModeToggle - enters/exits designate-target mode' },
    { trigger: 'click', element: 'Reset view', result: 'Calls onResetView' },
    { trigger: 'click', element: 'Open settings', result: 'Calls onOpenSettings - opens the gear popover' },
    { trigger: 'click', element: 'Pin to grid (when enabled)', result: 'Calls onPinToGrid (stub)' },
  ],

  tokens: {
    colors: [
      { name: 'menu-bg', value: 'rgba(26,26,26,0.95)', usage: 'Menu background (matches the project glass style)' },
      { name: 'menu-shadow', value: '0_0_0_1px_rgba(255,255,255,0.15)', usage: 'Inset hairline + drop shadow' },
    ],
    typography: [
      { name: 'menu-item', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '400', lineHeight: '1.2', usage: 'Menu item text' },
    ],
    spacing: [
      { name: 'min-width', value: '220px', usage: 'Min menu width' },
    ],
  },

  accessibility: {
    role: 'menu',
    ariaAttributes: ['Radix ContextMenu handles roving focus + aria-haspopup', 'Each item exposes its own role="menuitem"'],
    keyboardNav: ['Arrow keys navigate within an open menu', 'Esc closes', 'Letters / shortcut hints (T, D, X, S) shown in the right gutter'],
    focusManagement: 'Radix focus-trap inside the menu; focus returns to the tile on close.',
  },

  tasks: [],

  notes: [
    'Right-click is consumed by Radix ContextMenu so the browser-native menu never shows.',
    'Pin-to-grid is exposed only if onPinToGrid is provided - keeps the menu clean on the playground.',
  ],
};
