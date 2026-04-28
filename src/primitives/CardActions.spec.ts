import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CardActions',
  filePath: 'src/primitives/CardActions.tsx',
  purpose: 'Renders a grid of action buttons for target cards — supports fill/ghost layouts, grouped effector/investigation rows, confirm dialogs, double-confirm flows, split-action dropdowns, and status strips.',
  location: 'TargetCard/Slots',
  status: 'prototype',

  props: [
    { name: 'actions', type: 'CardAction[]', required: true, description: 'Array of action definitions: id, label, icon, variant, size, onClick, plus optional confirm config, dropdown sub-actions, and effector status strips' },
    { name: 'layout', type: "'row' | 'grid' | 'stack'", required: false, defaultValue: "'row'", description: 'Layout mode (currently only legacy row layout is used when no groups exist)' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on outer wrapper' },
  ],

  states: [
    {
      name: 'default',
      trigger: 'actions[] passed with at least one action',
      description: 'Grid of action buttons: fill (lg) spans full width, ghost (sm) in columns',
      implementedInPrototype: true,
      storyProps: {
        actions: [
          { id: 'jam', label: 'שיבוש', variant: 'danger', size: 'lg' },
          { id: 'surveil', label: 'מעקב', variant: 'ghost', size: 'sm' },
          { id: 'drone', label: 'רחפן', variant: 'ghost', size: 'sm' },
        ],
      },
    },
    {
      name: 'grouped layout',
      trigger: 'Actions have group: "effector" or "investigation" or dropdownActions',
      description: 'Effector actions in vertical column with spring animations, investigation actions in horizontal grid',
      implementedInPrototype: true,
      visualNotes: 'AnimatePresence popLayout with spring transitions',
    },
    {
      name: 'confirm dialog',
      trigger: 'User clicks an action with confirm config',
      description: 'Inline alertdialog appears with title, optional description, confirm/cancel buttons',
      implementedInPrototype: true,
      visualNotes: 'Semi-transparent overlay at CARD_TOKENS.elevation.overlay.level2',
    },
    {
      name: 'double confirm',
      trigger: 'User confirms first step on action with confirm.doubleConfirm: true',
      description: 'Second confirmation step appears with final confirm button',
      implementedInPrototype: true,
    },
    {
      name: 'status strip',
      trigger: 'Action has statusStrip config instead of normal button',
      description: 'Read-only status indicator replacing button (e.g. completion confirmation with icon)',
      implementedInPrototype: true,
      visualNotes: 'tone-driven icon color (emerald/sky/amber/red), pointer-events-none',
    },
    {
      name: 'split action button',
      trigger: 'Action has dropdownActions[]',
      description: 'Primary button with dropdown chevron for additional actions',
      implementedInPrototype: true,
    },
    {
      name: 'disabled',
      trigger: 'action.disabled = true',
      description: 'All buttons visually disabled, cannot be clicked',
      implementedInPrototype: true,
      storyProps: {
        actions: [
          { id: 'jam', label: 'שיבוש', variant: 'danger', size: 'lg', disabled: true },
        ],
      },
    },
    {
      name: 'loading',
      trigger: 'action.loading = true',
      description: 'Button shows loading spinner, prevents interaction',
      implementedInPrototype: true,
    },
    {
      name: 'empty',
      trigger: 'actions[] is empty array',
      description: 'Component returns null — renders nothing',
      implementedInPrototype: true,
    },
    {
      name: 'error',
      trigger: 'Action onClick throws or API call fails',
      description: 'No error boundary or feedback — errors propagate silently',
      implementedInPrototype: false,
      visualNotes: 'Should show inline error toast or button error state',
    },
    {
      name: 'rapid double-click',
      trigger: 'User clicks action button twice quickly',
      description: 'No debounce or submission-lock — onClick fires multiple times',
      implementedInPrototype: false,
      visualNotes: 'Should disable button after first click until callback resolves',
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Action button (no confirm)',
      result: 'Calls action.onClick(e) directly',
    },
    {
      trigger: 'click',
      element: 'Action button (with confirm)',
      result: 'Opens inline confirm dialog instead of calling onClick',
    },
    {
      trigger: 'click',
      element: 'Confirm button',
      result: 'Calls original action.onClick(e) and closes dialog',
    },
    {
      trigger: 'click',
      element: 'Cancel button',
      result: 'Closes confirm dialog without calling onClick',
      keyboard: 'Escape (not implemented)',
    },
    {
      trigger: 'click',
      element: 'Confirm button (double-confirm step 1)',
      result: 'Advances to step 2 with "אישור סופי" header',
    },
    {
      trigger: 'click',
      element: 'Final confirm button (step 2)',
      result: 'Calls original action.onClick(e) and closes dialog',
    },
  ],

  tokens: {
    colors: [
      { name: 'confirm-bg', value: 'rgba(255,255,255,0.08)', usage: 'Confirm dialog background overlay' },
      { name: 'confirm-ring', value: 'CARD_TOKENS.surface.level2', usage: 'Confirm dialog border ring' },
      { name: 'danger-cta-bg', value: 'oklch(0.348 0.111 17)', usage: 'Danger button background (var --color-4)' },
      { name: 'danger-cta-hover', value: 'oklch(0.445 0.151 17)', usage: 'Danger button hover' },
      { name: 'danger-cta-text', value: 'oklch(0.927 0.062 17)', usage: 'Danger button text' },
      { name: 'cancel-bg', value: 'oklch(0.302 0 0)', usage: 'Cancel button background' },
      { name: 'effector-success', value: '#34d399 (emerald-400)', usage: 'Status strip success icon color' },
    ],
    typography: [
      { name: 'confirm-title', fontFamily: 'Heebo', fontSize: '11px', fontWeight: '600', lineHeight: '1.4', usage: 'Confirm dialog title' },
      { name: 'confirm-desc', fontFamily: 'Heebo', fontSize: '10px', fontWeight: '400', lineHeight: '1.4', usage: 'Confirm dialog description' },
      { name: 'confirm-btn', fontFamily: 'Heebo', fontSize: '11px', fontWeight: '600', lineHeight: '1', usage: 'Confirm/cancel button labels' },
      { name: 'status-strip', fontFamily: 'Heebo', fontSize: '10px', fontWeight: '500', lineHeight: '1', usage: 'Effector status strip text' },
    ],
    spacing: [
      { name: 'actions-px', value: '8px', usage: 'Outer horizontal padding (px-2)' },
      { name: 'actions-py', value: '8px', usage: 'Outer vertical padding (py-2)' },
      { name: 'grid-gap', value: '6px', usage: 'Gap between grid items (gap-1.5)' },
      { name: 'confirm-padding', value: '12px', usage: 'Confirm dialog inner padding (p-3)' },
    ],
    animations: [
      { name: 'effector-enter', property: 'opacity, y', duration: '0.3s', easing: 'spring(bounce:0)', usage: 'Effector row enter animation via AnimatePresence' },
      { name: 'effector-exit', property: 'opacity, y', duration: '0.3s', easing: 'spring(bounce:0)', usage: 'Effector row exit animation' },
      { name: 'button-press', property: 'transform', duration: '150ms', easing: 'ease-out', usage: 'Active state scale(0.98) on confirm buttons' },
    ],
  },

  accessibility: {
    role: 'alertdialog (confirm dialog)',
    ariaAttributes: [
      'role="alertdialog" on confirm container',
      'aria-labelledby="confirm-title"',
      'aria-describedby="confirm-desc" (when description exists)',
      'aria-modal="true"',
      'aria-label on confirm and cancel buttons',
      'role="status" on StatusStrip',
    ],
    keyboardNav: [
      'Tab: cycles through action buttons (native)',
      'Enter/Space: activates focused button (native)',
      'Escape: should close confirm dialog (NOT IMPLEMENTED)',
    ],
    focusManagement: 'No focus trap in confirm dialog — focus should be trapped within dialog while open, and returned to trigger button on close.',
    screenReaderNotes: 'Confirm dialog uses alertdialog role which interrupts screen reader flow. Status strips use role="status" for live announcements.',
  },

  flows: [
    {
      name: 'Single Confirm',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks danger action button', result: 'Confirm dialog opens' },
        { actor: 'user', action: 'Reads confirmation title and description', result: 'Dialog visible with confirm/cancel' },
        { actor: 'user', action: 'Clicks confirm button', result: 'action.onClick fires, dialog closes' },
      ],
    },
    {
      name: 'Double Confirm',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks action with doubleConfirm: true', result: 'Step 1 confirm dialog opens' },
        { actor: 'user', action: 'Clicks first confirm', result: 'Step 2 "אישור סופי" appears' },
        { actor: 'user', action: 'Clicks final confirm', result: 'action.onClick fires, dialog closes' },
      ],
    },
    {
      name: 'Confirm Cancel',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks action with confirm', result: 'Confirm dialog opens' },
        { actor: 'user', action: 'Clicks cancel button', result: 'Dialog closes, onClick NOT called' },
      ],
    },
    {
      name: 'Error during action',
      type: 'error',
      steps: [
        { actor: 'user', action: 'Confirms action', result: 'onClick fires' },
        { actor: 'api', action: 'API call fails', result: 'No error feedback in CardActions' },
        { actor: 'system', action: 'Error propagates to parent', result: 'User sees no feedback' },
      ],
    },
  ],

  tasks: [
    {
      id: 'CA-1',
      title: 'Add Escape key to close confirm dialog',
      priority: 'P0',
      estimate: 'S',
      description: 'Add onKeyDown handler for Escape key on the confirm dialog to close it. Critical for keyboard accessibility.',
      files: [{ path: 'src/primitives/CardActions.tsx', action: 'modify', description: 'Add useEffect keydown listener for Escape when confirmingId is set' }],
      acceptanceCriteria: [
        'Pressing Escape while confirm dialog is open closes it',
        'onClick is NOT called on Escape',
        'Works in both single and double confirm flows',
      ],
    },
    {
      id: 'CA-2',
      title: 'Add focus trap to confirm dialog',
      priority: 'P0',
      estimate: 'M',
      description: 'Trap focus within the confirm dialog while it is open. Return focus to the trigger button when closed.',
      files: [{ path: 'src/primitives/CardActions.tsx', action: 'modify', description: 'Add focus trap using ref and Tab key handling' }],
      acceptanceCriteria: [
        'Focus moves to confirm button when dialog opens',
        'Tab cycles only within dialog buttons',
        'Focus returns to trigger button after dialog closes',
      ],
      dependencies: ['CA-1'],
    },
    {
      id: 'CA-3',
      title: 'Add double-click prevention',
      priority: 'P1',
      estimate: 'S',
      description: 'Disable the action button after first click until the onClick callback resolves (or a timeout). Prevents rapid re-submission of mitigation commands.',
      files: [{ path: 'src/primitives/CardActions.tsx', action: 'modify', description: 'Add submission-lock state per action id' }],
      acceptanceCriteria: [
        'Button becomes disabled after first click',
        'Button re-enables after onClick resolves or 2s timeout',
        'Loading spinner shows during lock period',
      ],
    },
    {
      id: 'CA-4',
      title: 'Add error feedback for failed actions',
      priority: 'P1',
      estimate: 'M',
      description: 'Catch errors from onClick handlers and show inline error state on the button or a toast notification.',
      files: [
        { path: 'src/primitives/CardActions.tsx', action: 'modify', description: 'Wrap onClick in try/catch, show error state' },
      ],
      acceptanceCriteria: [
        'Failed onClick shows error state on the button',
        'Error state auto-clears after 3 seconds',
        'Error is also surfaced via sonner toast',
      ],
      dependencies: ['CA-3'],
    },
    {
      id: 'CA-5',
      title: 'Add reduced motion support for confirm dialog',
      priority: 'P2',
      estimate: 'S',
      description: 'The effector rows respect prefers-reduced-motion but the confirm dialog has CSS transitions that should also be disabled.',
      files: [{ path: 'src/primitives/CardActions.tsx', action: 'modify', description: 'Conditionally remove transition classes when prefersReducedMotion' }],
      acceptanceCriteria: [
        'Confirm dialog appears instantly with prefers-reduced-motion',
        'Button press scale animation is disabled',
      ],
    },
  ],

  hardcodedData: [
    {
      current: "OKLCH color values in confirm dialog buttons (e.g. 'bg-[oklch(0.348_0.111_17)]')",
      replaceWith: 'CSS custom properties from index.css (var(--danger-cta-bg), var(--danger-cta-bg-hover), etc.)',
      location: 'CardActions.tsx renderConfirmDialog lines 304-331',
    },
  ],

  notes: [
    'The component handles two rendering paths: grouped (effector/investigation) and legacy (fill/rest). Both share the same confirm dialog logic.',
    'AnimatePresence with mode="popLayout" is used for effector rows — spring animations with bounce: 0.',
    'The renderConfirmDialog function is extracted but receives state via closure — consider refactoring to a ConfirmDialog sub-component for reuse.',
    'stopPropagation is called on all click handlers to prevent card toggle from firing when clicking actions.',
    'SplitActionButton is imported for dropdown-capable effector actions — its spec should be generated separately.',
  ],
};
