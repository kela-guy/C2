import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'NotificationCenter',
  filePath: 'src/app/components/NotificationCenter.tsx',
  purpose: 'Dropdown notification panel with bell trigger, tab-filtered notification list (all/alerts/unread), date-grouped items, mark-all-as-read, and portal-based positioning.',
  location: 'CUAS',
  status: 'prototype',

  props: [
    { name: 'trigger', type: 'React.ReactElement', required: false, description: 'Optional custom trigger element (e.g. sidebar icon). Receives onClick injection via cloneElement.' },
  ],

  states: [
    {
      name: 'default (closed)',
      trigger: 'Component mounts',
      description: 'Bell button visible with unread count badge (red dot with number)',
      implementedInPrototype: true,
      storyProps: {},
    },
    {
      name: 'panel open',
      trigger: 'User clicks bell button or custom trigger',
      description: 'Dropdown panel animates in (opacity+y+scale), shows notification list with tabs and date groups',
      implementedInPrototype: true,
    },
    {
      name: 'tab: all',
      trigger: 'Default tab or user clicks "הכל"',
      description: 'Shows all notifications grouped by date category',
      implementedInPrototype: true,
    },
    {
      name: 'tab: alerts',
      trigger: 'User clicks "דחוף"',
      description: 'Filters to only type="alert" notifications',
      implementedInPrototype: true,
    },
    {
      name: 'tab: unread',
      trigger: 'User clicks "לא נקראו"',
      description: 'Filters to only read=false notifications, shows count badge',
      implementedInPrototype: true,
    },
    {
      name: 'all read',
      trigger: 'User clicks "סמן הכל כנקרא"',
      description: 'All notifications marked as read, unread count resets, blue accent bars disappear',
      implementedInPrototype: true,
    },
    {
      name: 'empty (no notifications)',
      trigger: 'All notifications filtered out or none exist',
      description: 'Empty state with CheckCircle2 icon and "הכל נקי, אין התראות" message',
      implementedInPrototype: true,
    },
    {
      name: 'with custom trigger',
      trigger: 'trigger prop provided',
      description: 'Panel positions to the left of the trigger element instead of below',
      implementedInPrototype: true,
    },
    {
      name: 'loading',
      trigger: 'Notification data fetching from API',
      description: 'Skeleton list or spinner in the dropdown while loading',
      implementedInPrototype: false,
      visualNotes: 'Shimmer rows matching NotificationRow height',
    },
    {
      name: 'error',
      trigger: 'Notification API fails',
      description: 'Error message in dropdown with retry option',
      implementedInPrototype: false,
    },
    {
      name: 'disabled',
      trigger: 'System in restricted mode',
      description: 'Bell button disabled, panel cannot open',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Bell button / custom trigger',
      result: 'Toggles panel open/closed',
    },
    {
      trigger: 'click',
      element: 'Tab buttons (הכל / דחוף / לא נקראו)',
      result: 'Switches notification filter, active tab gets blue underline',
    },
    {
      trigger: 'click',
      element: '"סמן הכל כנקרא" button',
      result: 'All notifications set to read=true',
    },
    {
      trigger: 'click',
      element: 'Settings icon button',
      result: 'Currently no handler — placeholder for settings panel',
    },
    {
      trigger: 'click',
      element: '"כל ההיסטוריה" footer button',
      result: 'Currently no handler — placeholder for full history view',
    },
    {
      trigger: 'click outside',
      element: 'Document (mousedown)',
      result: 'Panel closes via click-outside listener',
    },
    {
      trigger: 'hover',
      element: 'Notification row',
      result: 'Row background highlights to bg-white/[0.03]',
      animation: { property: 'background-color', from: 'transparent', to: 'rgba(255,255,255,0.03)', duration: '150ms', easing: 'ease' },
    },
  ],

  tokens: {
    colors: [
      { name: 'panel-bg', value: '#141414', usage: 'Dropdown background' },
      { name: 'panel-border', value: '#333', usage: 'Panel border and dividers' },
      { name: 'unread-badge', value: '#ef4444', usage: 'Red unread count badge (red-500)' },
      { name: 'unread-accent', value: '#3b82f6', usage: 'Blue left accent bar on unread notifications' },
      { name: 'tab-active', value: '#3b82f6', usage: 'Active tab underline (blue-500)' },
      { name: 'critical-icon-bg', value: 'rgba(239,68,68,0.1)', usage: 'Critical notification icon background' },
      { name: 'high-icon-bg', value: 'rgba(249,115,22,0.1)', usage: 'High priority icon background' },
      { name: 'message-icon-bg', value: 'rgba(59,130,246,0.1)', usage: 'Message type icon background' },
      { name: 'system-icon-bg', value: 'rgba(168,85,247,0.1)', usage: 'System type icon background' },
    ],
    typography: [
      { name: 'panel-title', fontFamily: 'Heebo', fontSize: '14px', fontWeight: '700', lineHeight: '1.5', usage: 'Panel header "מרכז התראות"' },
      { name: 'notification-title', fontFamily: 'Heebo', fontSize: '13px', fontWeight: '500', lineHeight: '20px', usage: 'Notification item title' },
      { name: 'notification-body', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '300', lineHeight: '20px', usage: 'Notification description text' },
      { name: 'sender', fontFamily: 'Heebo', fontSize: '11px', fontWeight: '500', lineHeight: '20px', usage: 'Sender name (uppercase, tracked)' },
      { name: 'time', fontFamily: 'monospace', fontSize: '10px', fontWeight: '500', lineHeight: '1', usage: 'Timestamp text' },
    ],
    spacing: [
      { name: 'panel-width', value: '380px', usage: 'Fixed dropdown width' },
      { name: 'row-padding', value: '16px', usage: 'Notification row horizontal padding (p-4)' },
      { name: 'row-gap', value: '16px', usage: 'Gap between icon and content (gap-4)' },
    ],
    animations: [
      { name: 'panel-enter', property: 'opacity, y, scale', duration: '150ms', easing: 'ease', usage: 'Panel open animation via framer-motion' },
    ],
  },

  flows: [
    {
      name: 'Read notification flow',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks bell button', result: 'Panel opens showing unread notifications at top' },
        { actor: 'user', action: 'Scans notifications', result: 'Unread items have blue left accent bar' },
        { actor: 'user', action: 'Clicks "סמן הכל כנקרא"', result: 'All notifications marked as read, badge disappears' },
      ],
    },
    {
      name: 'Filter critical alerts',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks "דחוף" tab', result: 'Only alert-type notifications shown' },
        { actor: 'user', action: 'Clicks "הכל" tab', result: 'All notifications restored' },
      ],
    },
  ],

  accessibility: {
    ariaAttributes: ['aria-label on bell button (implicit)'],
    keyboardNav: ['Tab to bell button', 'Click-outside closes panel'],
    focusManagement: 'No focus trap in dropdown — click-outside to close. Tab order follows DOM.',
    screenReaderNotes: 'Dropdown is rendered via createPortal to document.body. Need aria-expanded on trigger and focus management for screen readers.',
  },

  tasks: [
    {
      id: 'NC-1',
      title: 'Replace mock notifications with real API data',
      priority: 'P0',
      estimate: 'L',
      description: 'Replace MOCK_NOTIFICATIONS_HISTORY with WebSocket or polling-based real notification data.',
      files: [
        { path: 'src/app/components/NotificationCenter.tsx', action: 'modify', description: 'Integrate notification API/WebSocket' },
      ],
      acceptanceCriteria: [
        'Notifications come from a real data source',
        'New notifications appear in real-time',
        'Read state persists across sessions',
      ],
    },
    {
      id: 'NC-2',
      title: 'Add loading and error states',
      priority: 'P1',
      estimate: 'M',
      description: 'Show skeleton rows during data fetch and error state with retry on failure.',
      files: [
        { path: 'src/app/components/NotificationCenter.tsx', action: 'modify', description: 'Add loading/error states to dropdown content' },
      ],
      acceptanceCriteria: [
        'Loading state shows skeleton notification rows',
        'Error state shows message with retry button',
      ],
      dependencies: ['NC-1'],
    },
    {
      id: 'NC-3',
      title: 'Add keyboard navigation and focus trap',
      priority: 'P1',
      estimate: 'M',
      description: 'Trap focus in panel when open, add Escape to close, arrow keys for notification navigation.',
      files: [
        { path: 'src/app/components/NotificationCenter.tsx', action: 'modify', description: 'Add focus trap, Escape handler, arrow key navigation' },
      ],
      acceptanceCriteria: [
        'Escape key closes panel',
        'Focus is trapped within open panel',
        'Arrow keys navigate between notification rows',
        'aria-expanded on trigger button',
      ],
    },
    {
      id: 'NC-4',
      title: 'Add individual notification actions (mark read, dismiss)',
      priority: 'P2',
      estimate: 'M',
      description: 'Allow marking individual notifications as read and dismissing them.',
      files: [
        { path: 'src/app/components/NotificationCenter.tsx', action: 'modify', description: 'Add per-row action buttons on hover' },
      ],
      acceptanceCriteria: [
        'Hover shows action buttons (mark read, dismiss)',
        'Mark read toggles individual notification read state',
        'Dismiss removes notification with animation',
      ],
    },
  ],

  hardcodedData: [
    { current: 'MOCK_NOTIFICATIONS_HISTORY array (7 items)', replaceWith: 'Real-time notification API', location: 'NotificationCenter.tsx lines 38-116' },
    { current: 'Hebrew string literals throughout', replaceWith: 'i18n translation keys', location: 'NotificationCenter.tsx' },
  ],

  notes: [
    'Panel is portaled to document.body via createPortal to escape backdrop-blur containing block in nav.',
    'useLayoutEffect for positioning prevents flash but may cause hydration issues in SSR.',
    'Framer Motion AnimatePresence wraps the panel for enter/exit animations.',
    'Click-outside listener uses mousedown to catch clicks before they propagate.',
    'Date grouping is hardcoded in notification items (dateCategory field) — should be computed dynamically.',
  ],
};
