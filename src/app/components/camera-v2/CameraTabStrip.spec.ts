import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CameraTabStrip',
  filePath: 'src/app/components/camera-v2/CameraTabStrip.tsx',
  purpose:
    "Horizontal tab strip rendered inside the cameras panel header. Each pinned feed gets one tab; the active tab marks the operator's focal feed (`activeFeedIndex`) that the panel's `single` and `hero-filmstrip` layouts render and that the multi-tile layouts highlight as the focused tile. A trailing `+` button opens a popover of pinnable devices so the operator can add a feed without touching the device tree.",
  location: 'Composition (camera-v2)',
  status: 'prototype',

  props: [
    { name: 'feeds', type: 'CameraFeed[]', required: true, description: 'Currently pinned feeds. One tab per entry.' },
    { name: 'cameraLabelById', type: 'Record<string, string>', required: true, description: 'Display label for each camera id; falls back to the id and finally to a dash placeholder when the slot is empty.' },
    { name: 'activeFeedIndex', type: 'number', required: true, description: "Index into `feeds[]` of the operator's focal selection. Drives the `aria-selected` / roving tab-index pattern." },
    { name: 'onActivate', type: '(index: number) => void', required: true, description: 'Fired when a tab is clicked or activated via keyboard.' },
    { name: 'onClose', type: '(index: number) => void', required: true, description: 'Fired when the tab X is clicked or `Delete` / `Backspace` is pressed on the focused tab. The host is expected to splice the feed and re-clamp the active index.' },
    { name: 'availableAssets', type: 'PickerAsset[]', required: true, description: "Every device the operator could pin. Filtered against `pinnedCameraIds` in the trailing `+` popover." },
    { name: 'pinnedCameraIds', type: 'Set<string>', required: true, description: 'Camera ids already mounted in any tile. Used to filter the pin list.' },
    { name: 'onPin', type: '(cameraId: string) => void', required: true, description: "Selecting a row in the `+` popover. Routes through the host's existing pin-or-LRU-swap logic." },
    { name: 'canPinMore', type: 'boolean', required: true, description: 'Hide the `+` button when the feed count is at `MAX_VIDEO_FEEDS`.' },
  ],

  states: [
    { name: 'empty', trigger: 'feeds.length === 0', description: 'Tab strip unmounts entirely; the panel header renders the title instead.', implementedInPrototype: true },
    { name: 'single tab', trigger: 'feeds.length === 1', description: 'One tab + `+` button. The tab is always active.', implementedInPrototype: true },
    { name: 'many tabs', trigger: 'feeds.length > 1', description: 'Tabs flow inline-start to inline-end with `overflow-x-auto`. Each tab has min 64px / max 160px width with truncated label.', implementedInPrototype: true },
    { name: 'active tab', trigger: 'i === activeFeedIndex', description: 'Tab uses `bg-state-selected` + `text-slate-12`. Roving tabindex puts focus here.', implementedInPrototype: true },
    { name: 'hover (non-active)', trigger: 'pointer over a non-active tab', description: '`bg-state-hover` + `text-slate-12`. X button fades to opacity 1.', implementedInPrototype: true },
    { name: 'focus-within', trigger: 'keyboard focus inside the tab', description: 'Same close-X reveal as hover; tab itself uses `focus-visible:bg-state-hover-strong`.', implementedInPrototype: true },
    { name: 'empty slot label', trigger: 'feed.cameraId === ""', description: 'Tab renders the localized em-dash placeholder. Close still works.', implementedInPrototype: true },
    { name: 'pin button hidden', trigger: 'canPinMore === false', description: 'Trailing `+` button is unmounted because no more feeds can be pinned (LRU-swap is reserved for drag-drop).', implementedInPrototype: true },
    { name: 'pin button disabled', trigger: 'availableAssets minus pinnedCameraIds is empty', description: '`+` button stays mounted but is `disabled` and opens to a one-row empty message.', implementedInPrototype: true },
    { name: 'loading', trigger: 'never', description: 'No async data — the strip mirrors parent state synchronously.', implementedInPrototype: false },
    { name: 'error', trigger: 'never', description: 'No error path.', implementedInPrototype: false },
    { name: 'disabled', trigger: 'never', description: 'No global disabled state.', implementedInPrototype: false },
  ],

  interactions: [
    { trigger: 'click', element: 'tab body', result: 'Calls onActivate(i); active state moves to that tab.' },
    { trigger: 'click', element: 'tab X button', result: 'Calls onClose(i); the host removes the feed and re-clamps the active index.' },
    { trigger: 'keydown', element: 'focused tab', result: 'ArrowLeft / ArrowRight move focus + selection, direction-aware (visual left = previous in LTR, next in RTL). Home / End jump. Delete / Backspace close the focused tab.', keyboard: 'ArrowLeft, ArrowRight, Home, End, Delete, Backspace' },
    { trigger: 'click', element: 'trailing `+` button', result: 'Opens a dropdown listing pinnable cameras and drones; selecting one calls onPin(id).' },
  ],

  tokens: {
    colors: [
      { name: 'tab-active-bg', value: 'var(--state-selected)', usage: 'Active tab background' },
      { name: 'tab-active-fg', value: 'var(--slate-12)', usage: 'Active tab text' },
      { name: 'tab-default-fg', value: 'var(--slate-10)', usage: 'Inactive tab text' },
      { name: 'tab-hover-bg', value: 'var(--state-hover)', usage: 'Hovered non-active tab' },
      { name: 'tab-separator', value: 'var(--gridblock-border)', usage: 'Inline-end hairline between adjacent tabs' },
    ],
    typography: [
      { name: 'tab-label', fontSize: '11px', fontWeight: '500', lineHeight: '1', usage: 'Tab label' },
    ],
    spacing: [
      { name: 'tab-min-width', value: '64px', usage: 'Lower bound on tab width before truncation kicks in' },
      { name: 'tab-max-width', value: '160px', usage: 'Upper bound on tab width' },
      { name: 'tab-inline-padding', value: '8px', usage: 'Inline padding inside a tab' },
      { name: 'close-icon', value: '10px', usage: 'X glyph inside the close button' },
      { name: 'pin-icon', value: '14px', usage: 'Plus glyph inside the pin button' },
    ],
    animations: [
      { name: 'tab-color-transition', property: 'background-color, color', duration: '150ms', easing: 'ease-out', usage: 'Active / hover transitions' },
      { name: 'close-x-fade', property: 'opacity', duration: '100ms', easing: 'ease-out', usage: 'Reveal on hover / focus-within' },
    ],
  },

  accessibility: {
    role: 'tablist',
    ariaAttributes: [
      'role="tablist" aria-orientation="horizontal" aria-label="Pinned cameras" (localized)',
      'role="tab" + aria-selected per tab',
      'roving tabindex (only the active tab is in the Tab order; arrows move within the strip)',
      'aria-label on each close button announces the camera name',
    ],
    keyboardNav: ['Tab to enter the strip (focus lands on the active tab)', 'ArrowLeft / ArrowRight cycle within the strip (direction-aware)', 'Home / End jump to first / last tab', 'Delete / Backspace close the focused tab', 'Tab again to leave the strip'],
    focusManagement: "Roving tabindex (`tabIndex={i === activeFeedIndex ? 0 : -1}`) keeps the strip a single Tab stop. The close X button uses `tabIndex={-1}` so keyboard users reach it via Delete on the tab instead of an extra Tab step.",
    screenReaderNotes: 'Direction-aware arrow keys match `GridblockResizeHandle` and Radix tablists: in RTL, ArrowLeft advances to the next tab in logical order, ArrowRight steps backward.',
  },

  tasks: [
    {
      id: 'CTS-1',
      title: 'Drag-to-reorder tabs',
      priority: 'P2',
      estimate: 'M',
      description: 'Let the operator reorder pinned feeds by dragging a tab horizontally. Reordering writes back to the parent `feeds[]` (and the activeFeedIndex shifts accordingly).',
      files: [{ path: 'src/app/components/camera-v2/CameraTabStrip.tsx', action: 'modify', description: 'Add react-dnd source on each tab and reorder on drop' }],
      acceptanceCriteria: ['Tab drag preview reads cleanly inside the panel header', 'Drop reorders feeds in `useVideoFeeds`', 'Persisted snapshot reflects the new order', 'Active tab tracks its feed through the reorder'],
    },
    {
      id: 'CTS-2',
      title: 'Overflow indicator at narrow widths',
      priority: 'P2',
      estimate: 'S',
      description: "Show a subtle gradient on the inline-end edge when the strip is scrollable, so operators know there are tabs offscreen.",
      files: [{ path: 'src/app/components/camera-v2/CameraTabStrip.tsx', action: 'modify', description: 'Mask-image gradient on the scroll container when scrollWidth > clientWidth' }],
      acceptanceCriteria: ['Gradient appears only when overflow is present', 'Renders correctly in RTL (gradient mirrors)'],
    },
  ],

  hardcodedData: [],

  notes: [
    'The strip lives in the panel header `headerActions` slot. The host (`CamerasPanel`) owns all state — the strip is fully presentational.',
    'Tab = feed: closing a tab unpins the feed. Activating a tab moves the focal selection that `VideoPanel.single` and `VideoPanel.hero-filmstrip` render. The multi-tile layouts use it as the keyboard-shortcut target.',
    'The `+` popover is a sibling concept to the per-tile `CameraAssetPicker` but scoped to "add a feed" rather than "swap this tile". The host hides the per-tile picker (via `VideoPanel.showTileAssetPicker={false}`) so the two affordances don\'t fight.',
    'Inline-end hairline between tabs uses `border-e` (logical) so it lands on the correct visual edge in both LTR and RTL.',
  ],
};
