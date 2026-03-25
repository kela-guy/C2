import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'StackedCard',
  filePath: 'src/primitives/StackedCard.tsx',
  purpose: 'Collapsible card that groups a burst of co-located detections into a single visual stack with ghost layers, expand/collapse animation, and bulk mitigation actions.',
  location: 'CUAS/Primitives',
  status: 'prototype',

  props: [
    { name: 'burst', type: 'TargetBurst', required: true, description: 'Burst object containing grouped targets, timestamps, and type breakdown' },
    { name: 'expanded', type: 'boolean', required: true, description: 'Whether the card list is expanded (controlled)' },
    { name: 'onToggleExpanded', type: '() => void', required: true, description: 'Callback to toggle the expanded state' },
    { name: 'activeTargetId', type: 'string | null', required: true, description: 'ID of the currently active/selected target' },
    { name: 'onTargetClick', type: '(target: Detection) => void', required: true, description: 'Callback when a child target card is clicked' },
    { name: 'buildCallbacks', type: '(target: Detection) => CardCallbacks', required: true, description: 'Factory function returning action callbacks for each target card' },
    { name: 'buildCtx', type: '(target: Detection) => CardContext', required: true, description: 'Factory function returning context (effectors, etc.) for each target card' },
    { name: 'renderCard', type: '(target, isActive, callbacks, ctx) => ReactNode', required: true, description: 'Render prop for individual target cards inside the expanded list' },
    { name: 'onBulkMitigate', type: '(targets: Detection[]) => void', required: false, description: 'Callback for bulk "jam all" action — when present, renders a bulk action bar' },
    { name: 'onTargetHover', type: '(targetId: string | null) => void', required: false, description: 'Callback fired on mouseEnter/mouseLeave for each card (map highlight)' },
  ],

  states: [
    {
      name: 'collapsed',
      trigger: 'expanded = false',
      description: 'Shows stacked ghost layers behind the header with count, type breakdown, and time range',
      implementedInPrototype: true,
      storyProps: { expanded: false },
      visualNotes: 'Two ghost layers at translateY(5px)/scale(0.96) and translateY(2.5px)/scale(0.98)',
    },
    {
      name: 'expanded',
      trigger: 'expanded = true',
      description: 'Ghost layers hidden; child cards rendered in a scrollable list with bulk actions',
      implementedInPrototype: true,
      storyProps: { expanded: true },
      visualNotes: 'Header gets selected bg opacity; content animates in via framer-motion height+opacity',
    },
    {
      name: 'active child auto-expand',
      trigger: 'activeTargetId matches a child target',
      description: 'Card auto-expands when a child becomes active (via useEffect)',
      implementedInPrototype: true,
    },
    {
      name: 'growing burst',
      trigger: 'New target added while already expanded',
      description: 'Skips expand animation when count grows to avoid layout jump',
      implementedInPrototype: true,
      visualNotes: 'isGrowing flag sets initial={false} on motion.div',
    },
    {
      name: 'bulk mitigating',
      trigger: 'Any child target has mitigationStatus === "mitigating"',
      description: 'Bulk action button shows loading state with progress count',
      implementedInPrototype: true,
    },
    {
      name: 'empty burst',
      trigger: 'burst.targets is empty array',
      description: 'Header shows "0 איתורים" — no guard for empty state',
      implementedInPrototype: false,
      visualNotes: 'Should either hide the card or show a placeholder',
    },
    {
      name: 'reduced motion',
      trigger: 'prefers-reduced-motion media query active',
      description: 'Expand/collapse animation skipped; immediate transition',
      implementedInPrototype: true,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Header row',
      result: 'Calls onToggleExpanded to expand/collapse the card list',
      animation: { property: 'height, opacity', from: '0, 0', to: 'auto, 1', duration: '0.2s', easing: 'easeOut' },
      keyboard: 'Enter, Space',
    },
    {
      trigger: 'click',
      element: 'Bulk mitigate button',
      result: 'Calls onBulkMitigate with all burst targets',
    },
    {
      trigger: 'hover',
      element: 'Individual target card',
      result: 'Calls onTargetHover with target ID (mouseEnter) or null (mouseLeave)',
    },
  ],

  tokens: {
    colors: [
      { name: 'container-bg', value: 'SURFACE.level1', usage: 'Main card and ghost layer background' },
      { name: 'header-hover', value: 'rgba(255,255,255,0.03)', usage: 'Header hover highlight' },
      { name: 'ghost-layer-1', value: 'opacity: 0.15', usage: 'Deepest ghost layer opacity' },
      { name: 'ghost-layer-2', value: 'opacity: 0.3', usage: 'Front ghost layer opacity' },
      { name: 'badge-bg', value: 'rgba(255,255,255,0.06)', usage: 'Count badge background' },
      { name: 'breakdown-text', value: 'zinc-400', usage: 'Type breakdown and time range text' },
    ],
    typography: [
      { name: 'title', fontFamily: 'Heebo', fontSize: '13px', fontWeight: '600', lineHeight: '1.4', usage: 'Burst count title ("X איתורים")' },
      { name: 'badge', fontFamily: 'mono', fontSize: '9px', fontWeight: '700', lineHeight: '1', usage: 'Count badge (tabular-nums)' },
      { name: 'breakdown', fontFamily: 'mono', fontSize: '9px', fontWeight: '400', lineHeight: '1', usage: 'Type breakdown labels and time range' },
    ],
    spacing: [
      { name: 'header-px', value: '8px', usage: 'Header horizontal padding (from CARD_TOKENS)' },
      { name: 'header-py', value: '8px', usage: 'Header vertical padding (paddingY + 2)' },
      { name: 'content-px', value: '8px', usage: 'Inner card list padding' },
      { name: 'content-py', value: '8px', usage: 'Inner card list padding' },
      { name: 'ghost-offset', value: '5px / 2.5px', usage: 'Ghost layer vertical offset (translateY)' },
      { name: 'margin-bottom', value: '10px / 15px', usage: 'Bottom margin (expanded / collapsed)' },
    ],
    borderRadius: [
      { name: 'card-radius', value: '8px', usage: 'Card and ghost layer border radius (from CARD_TOKENS)' },
    ],
    shadows: [
      { name: 'elevation', value: '0 2px 4px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)', usage: 'Card elevation shadow' },
    ],
    animations: [
      { name: 'expand', property: 'height, opacity', duration: '0.2s', easing: 'easeOut', usage: 'Expand/collapse content transition' },
      { name: 'chevron-rotate', property: 'transform', duration: '0.2s', easing: 'ease', usage: 'Chevron 180° rotation on expand' },
    ],
  },

  flows: [
    {
      name: 'Expand and browse targets',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks stacked card header', result: 'Card expands revealing individual target cards' },
        { actor: 'user', action: 'Hovers a target card', result: 'onTargetHover fires — map highlights target' },
        { actor: 'user', action: 'Clicks a target card', result: 'renderCard handles inner card toggle/expand' },
      ],
    },
    {
      name: 'Bulk mitigate all targets',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Expands stacked card', result: 'Bulk action bar visible' },
        { actor: 'user', action: 'Clicks "שיבוש הכל"', result: 'onBulkMitigate called with all burst targets' },
        { actor: 'system', action: 'Targets begin mitigating', result: 'Button shows loading with progress count' },
      ],
    },
    {
      name: 'Auto-expand on active child',
      type: 'edge-case',
      steps: [
        { actor: 'system', action: 'External selection sets activeTargetId to a child', result: 'useEffect triggers onToggleExpanded' },
        { actor: 'system', action: 'Card expands', result: 'Active child card is visible in the list' },
      ],
    },
  ],

  accessibility: {
    role: 'button (header)',
    ariaAttributes: [
      'role="button" on header div',
      'tabIndex="0" for keyboard focus',
      'aria-expanded="{expanded}" indicates open/closed state',
      'aria-label="X איתורים — סגור/הרחב"',
      'aria-hidden="true" on decorative icons (Layers, ChevronDown)',
    ],
    keyboardNav: [
      'Enter: toggle expand/collapse',
      'Space: toggle expand/collapse',
      'Tab: focus moves to header, then into expanded children',
    ],
    focusManagement: 'Header is focusable via tabIndex=0. Inner cards receive focus through natural tab order when expanded.',
    screenReaderNotes: 'aria-label includes count and action hint in Hebrew. Ghost layers are pointer-events-none and visually decorative.',
  },

  tasks: [
    {
      id: 'SC-1',
      title: 'Guard against empty burst',
      priority: 'P1',
      estimate: 'S',
      description: 'Return null or a minimal placeholder when burst.targets is empty to avoid rendering "0 איתורים" with ghost layers.',
      files: [{ path: 'src/primitives/StackedCard.tsx', action: 'modify', description: 'Add early return for empty targets array' }],
      acceptanceCriteria: [
        'Empty burst renders nothing or a placeholder',
        'No ghost layers shown for empty burst',
      ],
    },
    {
      id: 'SC-2',
      title: 'Virtualize long target lists',
      priority: 'P1',
      estimate: 'L',
      description: 'The scrollable list has max-height 480px but no virtualization. Large bursts (50+ targets) will cause performance issues.',
      files: [{ path: 'src/primitives/StackedCard.tsx', action: 'modify', description: 'Add react-window or similar for long lists' }],
      acceptanceCriteria: [
        'Bursts with 50+ targets scroll smoothly',
        'Only visible cards are rendered in the DOM',
      ],
    },
    {
      id: 'SC-3',
      title: 'Extract ghost layer styling to tokens',
      priority: 'P2',
      estimate: 'S',
      description: 'Ghost layer scale, translateY, and opacity values are inline — move to CARD_TOKENS for consistency.',
      files: [{ path: 'src/primitives/tokens.ts', action: 'modify', description: 'Add ghostLayer token group' }],
      acceptanceCriteria: [
        'Ghost layer values come from CARD_TOKENS',
        'Visual output is identical',
      ],
    },
  ],

  hardcodedData: [
    {
      current: "Ghost layer transforms: translateY(5px) scale(0.96), translateY(2.5px) scale(0.98)",
      replaceWith: 'CARD_TOKENS.ghostLayer.offset / scale values',
      location: 'StackedCard.tsx lines 88-107',
    },
    {
      current: "formatTime uses 'he-IL' locale hardcoded",
      replaceWith: 'Locale from context or i18n provider',
      location: 'StackedCard.tsx formatTime function',
    },
  ],

  notes: [
    'Ghost layers create a visual stacking effect when collapsed — purely decorative, not interactive.',
    'The growing-burst optimization (isGrowing) prevents jarring re-animation when new targets arrive while expanded.',
    'max-h-[480px] on the scroll container limits visible area — consider making this configurable.',
    'RTL layout (dir="rtl") is hardcoded on the root div.',
  ],
};
