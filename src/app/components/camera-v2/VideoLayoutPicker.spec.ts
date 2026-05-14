import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'VideoLayoutPicker',
  filePath: 'src/app/components/camera-v2/VideoLayoutPicker.tsx',
  purpose:
    'Panel-level segmented icon picker for the camera-v2 surface. Four presets (Single, Stack-2, Grid 2x2, Hero+Filmstrip) rendered as a glass row anchored to the panel\'s top inline-end corner. Mirrors the Apple Finder view-mode segmented control: dense, always-on, icon-only. Picker contents stay LTR even in RTL apps because the layout-shape glyphs would otherwise read backwards; only the picker\'s placement flips with app direction (handled by the parent).',
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'value', type: "LayoutKind ('single' | 'stack-2' | 'grid-2x2' | 'hero-filmstrip')", required: true, description: 'Currently-selected layout. The picker never auto-corrects this; rendering fallback is the panel\'s job.' },
    { name: 'onChange', type: '(next: LayoutKind) => void', required: true, description: 'Fired when the operator picks a non-disabled, non-selected option.' },
    { name: 'feedCount', type: 'number', required: true, description: 'Drives per-option disabled state. Stack-2 and Hero+Filmstrip require >= 2 feeds; Single and Grid 2x2 require >= 1.' },
    { name: 'className', type: 'string', required: false, description: 'Forwarded to the segmented row wrapper for parent-side positioning tweaks.' },
  ],

  states: [
    { name: 'default (selected = grid-2x2)', trigger: "value === 'grid-2x2'", description: 'Grid icon shows the selected treatment (white text + faint inset highlight); other icons read as muted.', implementedInPrototype: true, storyProps: { value: 'grid-2x2', feedCount: 4 } },
    { name: 'selected = single', trigger: "value === 'single'", description: 'Square icon active.', implementedInPrototype: true, storyProps: { value: 'single', feedCount: 4 } },
    { name: 'selected = stack-2', trigger: "value === 'stack-2'", description: 'Rows2 icon active.', implementedInPrototype: true, storyProps: { value: 'stack-2', feedCount: 4 } },
    { name: 'selected = hero-filmstrip', trigger: "value === 'hero-filmstrip'", description: 'LayoutPanelTop icon active.', implementedInPrototype: true, storyProps: { value: 'hero-filmstrip', feedCount: 5 } },
    { name: 'option disabled (insufficient feeds)', trigger: 'feedCount < option.minFeeds', description: 'Icon is muted to opacity-30 and pointer events are blocked. Click is a no-op even if the icon is somehow focused.', implementedInPrototype: true, storyProps: { value: 'single', feedCount: 1 } },
    { name: 'hovered (non-selected)', trigger: 'pointer enters a non-selected, non-disabled icon', description: 'Background fades to white/10; icon brightens to white.', implementedInPrototype: true },
    { name: 'focus-visible', trigger: 'keyboard focus on an icon', description: 'Inset 1px white/40 ring; selection still requires Space/Enter.', implementedInPrototype: true },
    { name: 'loading', trigger: 'never', description: 'No async behaviour — picker reflects parent state synchronously. Listed to satisfy the mandatory checklist.', implementedInPrototype: false },
    { name: 'error', trigger: 'never', description: 'No error path — selecting an invalid option is prevented client-side via disabled state.', implementedInPrototype: false },
    { name: 'empty', trigger: 'parent hides the picker when feeds.length <= 1', description: 'Picker is unmounted by VideoPanel when there is no meaningful choice.', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'click', element: 'segmented icon button', result: 'Calls onChange with that option\'s LayoutKind. No-op if the option is disabled or already selected.' },
    { trigger: 'keydown', element: 'focused icon button', result: 'Space / Enter activate the radio (native button semantics).', keyboard: 'Space, Enter' },
    { trigger: 'hover', element: 'icon button', result: 'Tooltip with the localized layout name appears below the picker.' },
  ],

  tokens: {
    colors: [
      { name: 'picker-bg', value: 'rgba(0,0,0,0.45)', usage: 'Glass background for the segmented row' },
      { name: 'picker-ring', value: 'rgba(255,255,255,0.10)', usage: 'Outer + divider rings between icons' },
      { name: 'icon-default', value: 'rgba(255,255,255,0.70)', usage: 'Non-selected icon foreground' },
      { name: 'icon-hover', value: '#FFFFFF', usage: 'Hovered icon foreground' },
      { name: 'icon-selected-bg', value: 'rgba(255,255,255,0.15)', usage: 'Selected icon background' },
      { name: 'icon-selected-fg', value: '#FFFFFF', usage: 'Selected icon foreground' },
      { name: 'icon-disabled-opacity', value: '0.30', usage: 'Insufficient-feeds opacity' },
    ],
    typography: [],
    spacing: [
      { name: 'icon-cell', value: '28px x 28px', usage: 'Each segmented icon button (h-7 w-7)' },
      { name: 'icon-glyph', value: '14px', usage: 'Lucide icon size inside each button' },
    ],
    animations: [
      { name: 'icon-color-transition', property: 'color, background-color', duration: '150ms', easing: 'ease-out', usage: 'Hover / selected state changes' },
    ],
  },

  accessibility: {
    role: 'radiogroup',
    ariaAttributes: ['aria-label="View layout" (localized)', 'role="radio" + aria-checked on each button', 'aria-label per button (localized layout name)'],
    keyboardNav: ['Tab to enter the picker', 'Space / Enter to activate the focused option'],
    focusManagement: 'Each icon is independently tabbable (native <button>). focus-visible ring matches the rest of the camera-v2 chrome.',
    screenReaderNotes: 'Disabled options carry the disabled attribute so AT skip them. Selected state announces via aria-checked.',
  },

  tasks: [
    {
      id: 'VLP-1',
      title: 'Keyboard arrow navigation',
      priority: 'P2',
      estimate: 'S',
      description: 'Add ArrowLeft/ArrowRight cycling through enabled options to match the WAI-ARIA radiogroup pattern more strictly. Native button semantics already cover Space/Enter activation.',
      files: [{ path: 'src/app/components/camera-v2/VideoLayoutPicker.tsx', action: 'modify', description: 'Add a roving tabindex + key handler' }],
      acceptanceCriteria: ['Arrow keys move focus between enabled options', 'Disabled options are skipped'],
    },
  ],

  hardcodedData: [],

  notes: [
    'Picker is intentionally `dir="ltr"`. Icon glyphs schematise the layout shape; mirroring them in RTL apps would invert the schematic and confuse the operator.',
    'Disabled rules are hard-coded against feed count — the picker has no opinion about *why* a layout would be invalid beyond "not enough feeds". Future additions (e.g. premium tier locks) should add a separate `disabledReason` prop, not extend this rule.',
    'Visual chrome (glass bg, ring, divides) intentionally matches the camera control bar palette so operators read the picker as part of the same family of panel-level controls.',
  ],
};
