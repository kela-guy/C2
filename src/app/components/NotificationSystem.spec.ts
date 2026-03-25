import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'NotificationSystem',
  filePath: 'src/app/components/NotificationSystem.tsx',
  purpose: 'Global notification system rendering batched toast notifications via sonner with a full-screen vignette overlay for critical/suspect alerts. Exposes showTacticalNotification() for imperative toast dispatch.',
  location: 'CUAS',
  status: 'prototype',

  props: [],

  states: [
    {
      name: 'default (idle)',
      trigger: 'Component mounts',
      description: 'Renders invisible vignette overlay and <Toaster /> — no visible UI until notification is triggered',
      implementedInPrototype: true,
    },
    {
      name: 'single toast',
      trigger: 'showTacticalNotification() called once',
      description: 'Single notification toast appears with title, message, close button. Auto-dismisses after 15s batch window.',
      implementedInPrototype: true,
    },
    {
      name: 'batched toast (collapsed)',
      trigger: 'Multiple showTacticalNotification() calls within batch window',
      description: 'Single toast shows "X התראות חדשות" with latest title preview and expand button',
      implementedInPrototype: true,
    },
    {
      name: 'batched toast (expanded)',
      trigger: 'User clicks "הרחב" on batched toast',
      description: 'Toast expands to scrollable list of all batched notifications with color-coded dots',
      implementedInPrototype: true,
    },
    {
      name: 'critical vignette',
      trigger: 'showTacticalNotification() with level="critical"',
      description: 'Red vignette overlay pulses at edges of screen for 4 seconds',
      implementedInPrototype: true,
      visualNotes: 'box-shadow: inset 0 0 40px 20px #dc2626, pulsing animation 2s infinite',
    },
    {
      name: 'suspect vignette',
      trigger: 'showTacticalNotification() with level="suspect"',
      description: 'Amber vignette overlay pulses at edges of screen for 4 seconds',
      implementedInPrototype: true,
      visualNotes: 'box-shadow: inset 0 0 40px 20px #f59e0b, pulsing animation 2s infinite',
    },
    {
      name: 'toast dismissed',
      trigger: 'User clicks close or batch window expires (15s)',
      description: 'Toast removed, pending batch cleared',
      implementedInPrototype: true,
    },
    {
      name: 'loading',
      trigger: 'Notification connection being established',
      description: 'Connection status indicator',
      implementedInPrototype: false,
    },
    {
      name: 'error',
      trigger: 'Notification channel disconnects',
      description: 'Reconnection indicator and queued notification handling',
      implementedInPrototype: false,
    },
    {
      name: 'disabled',
      trigger: 'Notifications muted globally',
      description: 'All notifications suppressed, visual indicator that muting is active',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Single toast body',
      result: 'Dispatches "toast-clicked" CustomEvent with notification data',
      keyboard: 'Enter or Space activates (role="button")',
    },
    {
      trigger: 'click',
      element: 'Close button (X) on toast',
      result: 'Dismisses toast and flushes pending batch',
    },
    {
      trigger: 'click',
      element: '"הרחב" / "סגור" toggle on batched toast',
      result: 'Toggles expanded/collapsed view of batched notifications',
    },
    {
      trigger: 'click',
      element: 'Individual item in expanded batch',
      result: 'Dispatches "toast-clicked" CustomEvent with that item\'s data (if has code)',
    },
    {
      trigger: 'system',
      element: 'Batch timer (15s)',
      result: 'Auto-dismisses toast and clears batch after BATCH_WINDOW_MS',
    },
  ],

  tokens: {
    colors: [
      { name: 'toast-bg', value: '#1c1c20', usage: 'Toast card background' },
      { name: 'toast-border', value: 'rgba(255,255,255,0.12)', usage: 'Toast border (box-shadow ring)' },
      { name: 'level-critical', value: '#ef4444', usage: 'Critical notification accent dot' },
      { name: 'level-high', value: '#f97316', usage: 'High notification accent dot' },
      { name: 'level-suspect', value: '#eab308', usage: 'Suspect notification accent dot' },
      { name: 'level-medium', value: '#eab308', usage: 'Medium notification accent dot' },
      { name: 'level-info', value: '#a1a1aa', usage: 'Info notification accent dot' },
      { name: 'level-success', value: '#22c55e', usage: 'Success notification accent dot' },
      { name: 'vignette-critical', value: '#dc2626', usage: 'Critical alert vignette color' },
      { name: 'vignette-suspect', value: '#f59e0b', usage: 'Suspect alert vignette color' },
    ],
    typography: [
      { name: 'toast-title', fontFamily: 'Heebo', fontSize: '13px', fontWeight: '500', lineHeight: '1.5', usage: 'Toast notification title' },
      { name: 'toast-message', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '400', lineHeight: '1.6', usage: 'Toast notification message body' },
      { name: 'batch-count', fontFamily: 'Heebo', fontSize: '13px', fontWeight: '500', lineHeight: '1.5', usage: 'Batched toast count header' },
      { name: 'item-title', fontFamily: 'Heebo', fontSize: '11px', fontWeight: '500', lineHeight: '1.5', usage: 'Expanded batch item title' },
      { name: 'item-time', fontFamily: 'monospace', fontSize: '9px', fontWeight: '400', lineHeight: '1', usage: 'Item timestamp' },
    ],
    spacing: [
      { name: 'toast-width', value: '356px', usage: 'Fixed toast width' },
      { name: 'toast-padding', value: '12px', usage: 'Toast internal padding (py-3 px-3)' },
      { name: 'batch-max-h', value: '260px', usage: 'Max height of expanded batch list' },
    ],
    animations: [
      { name: 'vignette-pulse', property: 'opacity', duration: '2s', easing: 'cubic-bezier(0.4, 0, 0.6, 1)', usage: 'Pulsing vignette overlay (0.4 → 0.2 → 0.4)' },
      { name: 'vignette-fade', property: 'opacity', duration: '300ms', easing: 'ease-out', usage: 'Vignette appear/disappear transition' },
    ],
  },

  flows: [
    {
      name: 'Critical alert notification',
      type: 'happy',
      steps: [
        { actor: 'system', action: 'Detection triggers showTacticalNotification with level="critical"', result: 'Toast appears with notification details' },
        { actor: 'system', action: 'CustomEvent "trigger-critical-alert" fired', result: 'Red vignette overlay pulses for 4 seconds' },
        { actor: 'user', action: 'Clicks toast body', result: '"toast-clicked" event dispatched for app to handle' },
      ],
    },
    {
      name: 'Batch accumulation',
      type: 'happy',
      steps: [
        { actor: 'system', action: 'First notification arrives', result: 'Single toast shown with notification' },
        { actor: 'system', action: 'More notifications arrive within 15s', result: 'Toast updates to show batch count' },
        { actor: 'user', action: 'Clicks "הרחב"', result: 'Expanded list shows all batched items' },
        { actor: 'system', action: '15s batch window expires', result: 'Toast auto-dismisses, batch cleared' },
      ],
    },
  ],

  accessibility: {
    role: 'status',
    ariaAttributes: ['aria-hidden on vignette overlay', 'role="button" on toast body', 'aria-expanded on batch toggle', 'aria-label="סגור" on close buttons'],
    keyboardNav: ['Enter/Space to activate toast click', 'Tab to close and expand/collapse buttons'],
    focusManagement: 'Toasts are rendered by sonner — focus management follows sonner defaults.',
    screenReaderNotes: 'Vignette is aria-hidden. Toast announcements depend on sonner ARIA live region. Reduced motion disables vignette pulse animation.',
  },

  tasks: [
    {
      id: 'NS-1',
      title: 'Replace module-level global state with proper store',
      priority: 'P0',
      estimate: 'M',
      description: 'pendingBatch, batchTimerId, and batchListeners are module-level globals. Migrate to a proper state management solution (Zustand, context, or singleton class) for better testability.',
      files: [
        { path: 'src/app/components/NotificationSystem.tsx', action: 'modify', description: 'Replace module globals with proper state management' },
      ],
      acceptanceCriteria: [
        'No module-level mutable state',
        'Batch state is testable and resettable',
        'Multiple NotificationSystem instances do not conflict',
      ],
    },
    {
      id: 'NS-2',
      title: 'Connect to real WebSocket notification channel',
      priority: 'P0',
      estimate: 'L',
      description: 'showTacticalNotification is currently called imperatively. Connect to a WebSocket or SSE channel for real-time notifications from the backend.',
      files: [
        { path: 'src/app/components/NotificationSystem.tsx', action: 'modify', description: 'Add WebSocket/SSE connection for real-time notifications' },
      ],
      acceptanceCriteria: [
        'Notifications arrive from backend in real-time',
        'Reconnection logic on disconnect',
        'Graceful degradation if channel unavailable',
      ],
    },
    {
      id: 'NS-3',
      title: 'Add notification persistence and history',
      priority: 'P1',
      estimate: 'M',
      description: 'Batched notifications are lost after dismissal. Add persistence so users can review past notifications.',
      files: [
        { path: 'src/app/components/NotificationSystem.tsx', action: 'modify', description: 'Persist notifications to store/API' },
      ],
      acceptanceCriteria: [
        'Dismissed notifications are stored in history',
        'NotificationCenter can display past tactical notifications',
        'History survives page refresh',
      ],
    },
    {
      id: 'NS-4',
      title: 'Add notification sound/audio alerts',
      priority: 'P2',
      estimate: 'M',
      description: 'Critical and high-priority notifications should have audio alerts.',
      files: [
        { path: 'src/app/components/NotificationSystem.tsx', action: 'modify', description: 'Add audio playback for critical/high notifications' },
      ],
      acceptanceCriteria: [
        'Critical notifications play alert sound',
        'Sound can be muted via user preference',
        'Respects system audio settings',
      ],
    },
  ],

  hardcodedData: [
    { current: 'MOCK_NOTIFICATIONS array (11 items)', replaceWith: 'Real-time notification feed from backend', location: 'NotificationSystem.tsx lines 202-214' },
    { current: 'BATCH_WINDOW_MS = 15000', replaceWith: 'Configurable batch window from settings', location: 'NotificationSystem.tsx line 28' },
    { current: 'VIGNETTE_DURATION_MS = 4000', replaceWith: 'Configurable vignette duration from settings', location: 'NotificationSystem.tsx line 216' },
    { current: 'STABLE_TOAST_ID constant', replaceWith: 'Dynamic or configurable toast ID', location: 'NotificationSystem.tsx line 28' },
    { current: 'Hebrew string literals', replaceWith: 'i18n translation keys', location: 'NotificationSystem.tsx throughout' },
  ],

  notes: [
    'Uses module-level globals (pendingBatch, batchTimerId) — state persists between renders and across component remounts.',
    'LiveBatchedToast subscribes to batch changes via a custom pub/sub pattern (batchListeners Set).',
    'Vignette uses CSS @keyframes animation with prefers-reduced-motion media query.',
    'showTacticalNotification is exported for imperative use — called from outside React render cycle.',
    'toast.custom() from sonner with duration: Infinity ensures batch toast stays until explicitly dismissed.',
    'CustomEvent "toast-clicked" is the bridge between notification clicks and app navigation.',
  ],
};
