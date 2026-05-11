import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraSettingsMenu',
  filePath: 'src/app/components/camera-v2/CameraSettingsMenu.tsx',
  purpose:
    'Settings popover triggered by the gear button on the bottom control bar. Hosts Playback investigation and Display toggles (crosshair / AI / day-night).',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'open', type: 'boolean', required: true, description: 'Popover open state' },
    { name: 'onOpenChange', type: '(open: boolean) => void', required: true, description: 'Open / close handler' },
    { name: 'status', type: 'CameraStatus', required: true, description: 'Drives the foreign-locked dimming on the day/night row' },
    { name: 'mode', type: '"day" | "night"', required: true, description: 'Drives the day/night row' },
    { name: 'detectionsOn', type: 'boolean', required: true, description: 'Drives the AI detection switch' },
    { name: 'playbackEnabled', type: 'boolean', required: true, description: 'Drives the playback investigation switch' },
    { name: 'onModeToggle', type: '() => void', required: true, description: 'Day/night toggle' },
    { name: 'onDetectionsToggle', type: '() => void', required: true, description: 'AI detection toggle' },
    { name: 'onPlaybackToggle', type: '() => void', required: true, description: 'Playback investigation toggle' },
  ],

  states: [
    { name: 'closed', trigger: 'open === false', description: 'Just the gear trigger button, popover not in DOM (Radix portal)', implementedInPrototype: true },
    { name: 'open', trigger: 'open === true', description: 'Popover renders two sections (Playback, Display)', implementedInPrototype: true },
    { name: 'foreign-locked', trigger: 'status.controlOwner === "other"', description: 'Day/night row is dimmed and disabled', implementedInPrototype: true },
    { name: 'playback enabled', trigger: 'playbackEnabled === true', description: 'Playback row text switches to "מפוצל: שידור חי + פלייבק"', implementedInPrototype: true },
    { name: 'loading', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'error', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'disabled', trigger: 'N/A', description: '-', implementedInPrototype: true },
    { name: 'empty', trigger: 'N/A', description: '-', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'click', element: 'Gear trigger', result: 'Toggles open state' },
    { trigger: 'click', element: 'Switch in Playback row', result: 'Calls onPlaybackToggle - tile re-renders into the live-vs-playback split' },
    { trigger: 'click', element: 'Switch in Display rows', result: 'Calls onDetectionsToggle' },
    { trigger: 'click', element: 'Day/Night button', result: 'Calls onModeToggle (disabled if foreign-locked)' },
    { trigger: 'keydown', element: 'Trigger', result: 'S keyboard shortcut (handled by parent tile) toggles open' },
  ],

  tokens: {
    colors: [
      { name: 'popover-bg', value: 'rgba(26,26,26,0.95)', usage: 'Popover background (matches the project glass style)' },
      { name: 'popover-shadow', value: '0_0_0_1px_rgba(255,255,255,0.15)', usage: 'Inset hairline + drop shadow' },
      { name: 'section-divider', value: 'rgba(255,255,255,0.10)', usage: '1px between the three sections' },
      { name: 'section-title', value: 'rgba(255,255,255,0.55)', usage: 'Uppercase section heading' },
    ],
    typography: [
      { name: 'section-title', fontFamily: 'Heebo', fontSize: '10px', fontWeight: '600', lineHeight: '1', usage: 'Uppercase tracked-out section title' },
      { name: 'row-label', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '400', lineHeight: '1.2', usage: 'Row main text' },
      { name: 'row-description', fontFamily: 'Heebo', fontSize: '10px', fontWeight: '400', lineHeight: '1.3', usage: 'Row helper text' },
      { name: 'detail-mono', fontFamily: 'IBM Plex Mono', fontSize: '11px', fontWeight: '400', lineHeight: '1', usage: 'Detail values (id, FOV, bearing)' },
    ],
    spacing: [
      { name: 'popover-width', value: '280px', usage: 'Fixed width of the popover' },
      { name: 'section-padding', value: '10px 12px', usage: 'Section inner padding' },
    ],
  },

  accessibility: {
    role: 'dialog',
    ariaAttributes: ['Popover handles aria-controls / aria-expanded via Radix', 'Switches expose aria-checked', 'Trigger has aria-label="הגדרות"'],
    keyboardNav: ['Esc closes', 'S toggles open (delegated through CameraFeedTile)'],
    focusManagement: 'Radix focus-trap inside the popover; focus returns to the gear trigger on close.',
  },

  tasks: [
    {
      id: 'CSM-1',
      title: 'Persist preferences per camera',
      priority: 'P1',
      estimate: 'S',
      description: 'Persist crosshair / detection / day-night preferences per camera id in local storage so they survive a refresh.',
      files: [{ path: 'src/app/components/PlaygroundPage.tsx', action: 'modify', description: 'Hydrate feed display state from local storage' }],
      acceptanceCriteria: ['Preferences round-trip across refreshes'],
    },
  ],

  hardcodedData: [],

  notes: [
    'About section is intentionally text-only - no edit handles - so the popover stays a fast settings switcher rather than a properties editor.',
    'When playbackEnabled flips on, the parent tile dispatches the necessary state into feed.playback (with a default duration / position).',
  ],
};
