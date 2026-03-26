import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'SplitActionButton',
  filePath: 'src/primitives/SplitActionButton.tsx',
  purpose: 'Two-segment action button — primary action on the left with a dropdown chevron on the right for additional actions. Supports multiple color variants, sizes, loading states, and Radix dropdown menu.',
  location: 'Primitives',
  status: 'prototype',

  props: [
    { name: 'label', type: 'string', required: true, description: 'Primary button label text (Hebrew)' },
    { name: 'icon', type: 'React.ElementType', required: false, description: 'Optional icon rendered before the label' },
    { name: 'variant', type: "'fill' | 'ghost' | 'danger' | 'warning'", required: false, defaultValue: "'fill'", description: 'Color variant controlling background, hover, and text colors' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", required: false, defaultValue: "'sm'", description: 'Size variant controlling height, text size, and icon size' },
    { name: 'disabled', type: 'boolean', required: false, defaultValue: 'false', description: 'Disables both primary button and dropdown' },
    { name: 'loading', type: 'boolean', required: false, defaultValue: 'false', description: 'Shows loading spinner, disables interaction, sets cursor to wait' },
    { name: 'dimDisabledShell', type: 'boolean', required: false, defaultValue: 'true', description: 'When false, disabled (non-loading) button stays at full opacity (e.g. completed jam)' },
    { name: 'onClick', type: '(e: React.MouseEvent) => void', required: true, description: 'Callback for primary button click' },
    { name: 'dropdownItems', type: 'SplitDropdownItem[]', required: true, description: 'Array of dropdown menu items with id, label, icon, disabled, and onClick' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on outer wrapper' },
    { name: 'dataTour', type: 'string', required: false, description: 'data-tour attribute for onboarding tour targeting' },
  ],

  states: [
    {
      name: 'default',
      trigger: 'Component renders with label and onClick',
      description: 'Two-segment button: primary action + chevron dropdown trigger',
      implementedInPrototype: true,
      storyProps: { label: 'שיבוש', variant: 'danger' },
    },
    {
      name: 'hover',
      trigger: 'Mouse enters primary or chevron segment',
      description: 'Background lightens independently per segment',
      implementedInPrototype: true,
      visualNotes: 'Each segment has independent hover via Tailwind hover: prefix',
    },
    {
      name: 'active press',
      trigger: 'Mouse down on segment',
      description: 'Scale-down feedback and darker background',
      implementedInPrototype: true,
      visualNotes: 'active:scale-[0.98] will-change-transform',
    },
    {
      name: 'loading',
      trigger: 'loading = true',
      description: 'Spinner replaces icon, label still visible, both segments disabled, cursor: wait',
      implementedInPrototype: true,
      storyProps: { loading: true },
      visualNotes: 'Loader2 with animate-spin, label animates via AnimatePresence popLayout',
    },
    {
      name: 'disabled',
      trigger: 'disabled = true',
      description: 'Both segments non-interactive at reduced opacity',
      implementedInPrototype: true,
      storyProps: { disabled: true },
      visualNotes: 'opacity-45 pointer-events-none',
    },
    {
      name: 'disabled without dim',
      trigger: 'disabled = true, dimDisabledShell = false',
      description: 'Button stays at full opacity but non-interactive (completed state)',
      implementedInPrototype: true,
      storyProps: { disabled: true, dimDisabledShell: false },
    },
    {
      name: 'dropdown open',
      trigger: 'Click on chevron segment',
      description: 'Radix dropdown menu opens below with dropdown items',
      implementedInPrototype: true,
      visualNotes: 'Dark menu with blur shadow, RTL aligned',
    },
    {
      name: 'label transition',
      trigger: 'label prop changes',
      description: 'Label cross-fades with vertical slide animation via AnimatePresence',
      implementedInPrototype: true,
      visualNotes: 'Spring animation: opacity 0→1, y -25→0, exit y→25',
    },
    {
      name: 'danger variant',
      trigger: 'variant="danger"',
      description: 'Red-toned background with OKLCH colors and inset ring',
      implementedInPrototype: true,
      visualNotes: 'Ring: ring-[oklch(0.348_0.111_17_/_0.45)]',
    },
    {
      name: 'reduced motion',
      trigger: 'prefers-reduced-motion media query active',
      description: 'Label transition and spinner animation disabled',
      implementedInPrototype: true,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Primary segment',
      result: 'Calls onClick with event (stopPropagation applied)',
    },
    {
      trigger: 'click',
      element: 'Chevron segment',
      result: 'Opens Radix dropdown menu (event propagation stopped)',
    },
    {
      trigger: 'click',
      element: 'Dropdown menu item',
      result: 'Calls item.onClick with event (stopPropagation applied)',
    },
    {
      trigger: 'focus',
      element: 'Either segment',
      result: 'Focus ring: ring-2 ring-inset ring-white/30',
      keyboard: 'Tab',
    },
  ],

  tokens: {
    colors: [
      { name: 'fill-bg', value: 'rgba(34,139,230,0.15)', usage: 'Fill variant base background' },
      { name: 'fill-text', value: '#74c0fc', usage: 'Fill variant text color' },
      { name: 'ghost-bg', value: 'bg-zinc-800', usage: 'Ghost variant base background' },
      { name: 'danger-bg', value: 'oklch(0.348 0.111 17)', usage: 'Danger variant base background' },
      { name: 'danger-text', value: 'oklch(0.927 0.062 17)', usage: 'Danger variant text color' },
      { name: 'warning-bg', value: 'oklch(0.348 0.111 70)', usage: 'Warning variant base background' },
      { name: 'dropdown-bg', value: '#1c1c20', usage: 'Dropdown menu background' },
      { name: 'dropdown-item-hover', value: 'rgba(255,255,255,0.08)', usage: 'Dropdown item hover' },
    ],
    typography: [
      { name: 'sm-label', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '500', lineHeight: '1', usage: 'Small size label text' },
      { name: 'md-label', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '500', lineHeight: '1', usage: 'Medium size label text' },
      { name: 'lg-label', fontFamily: 'Heebo', fontSize: '13px', fontWeight: '600', lineHeight: '1', usage: 'Large size label text' },
      { name: 'dropdown-item', fontFamily: 'Heebo', fontSize: '12px', fontWeight: '400', lineHeight: '1.4', usage: 'Dropdown menu item text' },
    ],
    spacing: [
      { name: 'primary-px', value: '12px', usage: 'Primary segment horizontal padding (px-3)' },
      { name: 'segment-gap', value: '2px', usage: 'Gap between segments (gap-0.5)' },
      { name: 'dropdown-offset', value: '6px', usage: 'Dropdown menu offset from trigger' },
      { name: 'dropdown-item-px', value: '10px', usage: 'Dropdown item horizontal padding' },
      { name: 'dropdown-item-py', value: '8px', usage: 'Dropdown item vertical padding' },
    ],
    borderRadius: [
      { name: 'segment-inner', value: '4px', usage: 'Inner segment border radius (rounded-s/e-[4px])' },
      { name: 'shell', value: '6px', usage: 'Outer shell radius for danger/amber variants' },
      { name: 'dropdown', value: '8px', usage: 'Dropdown menu border radius' },
      { name: 'dropdown-item', value: '6px', usage: 'Dropdown item border radius' },
    ],
    shadows: [
      { name: 'dropdown-shadow', value: '0 0 0 1px rgba(255,255,255,0.1), 0 8px 30px rgba(0,0,0,0.5)', usage: 'Dropdown menu shadow and ring' },
    ],
    animations: [
      { name: 'label-swap', property: 'opacity, y', duration: '0.3s', easing: 'spring(bounce:0)', usage: 'Label cross-fade on prop change' },
      { name: 'press', property: 'transform', duration: '150ms', easing: 'ease-out', usage: 'Active press scale(0.98)' },
      { name: 'bg-transition', property: 'background-color, transform', duration: '150ms', easing: 'ease-out', usage: 'Hover/active background color transition' },
    ],
  },

  accessibility: {
    role: 'button (primary) + menu trigger (chevron)',
    ariaAttributes: [
      'type="button" on both segments',
      'disabled attribute on primary when isDisabled',
      'aria-label="פעולות נוספות" on chevron trigger',
      'aria-disabled="{isDisabled}" on chevron',
      'aria-busy="true" on wrapper when loading',
      'aria-live="polite" on primary when loading',
      'aria-hidden="true" on decorative icons',
    ],
    keyboardNav: [
      'Tab: focus primary, then chevron',
      'Enter/Space: activate focused segment',
      'Arrow keys: navigate dropdown items (Radix)',
      'Escape: close dropdown menu (Radix)',
    ],
    focusManagement: 'Focus ring via focus-visible:ring-2 ring-inset ring-white/30. Dropdown close auto-focus is prevented via onCloseAutoFocus.',
    screenReaderNotes: 'aria-busy and aria-live announce loading state changes. Dropdown uses Radix DropdownMenu which manages its own ARIA roles.',
  },

  flows: [
    {
      name: 'Primary action',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks primary segment', result: 'onClick fires with event' },
        { actor: 'system', action: 'Parent handles action (e.g. jam command)', result: 'Button may transition to loading state' },
      ],
    },
    {
      name: 'Dropdown secondary action',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Clicks chevron segment', result: 'Dropdown menu opens' },
        { actor: 'user', action: 'Clicks a dropdown item', result: 'Item onClick fires, menu closes' },
      ],
    },
    {
      name: 'Loading to label change',
      type: 'happy',
      steps: [
        { actor: 'system', action: 'Sets loading=true', result: 'Spinner appears, button disabled' },
        { actor: 'system', action: 'Action completes, label changes', result: 'Label cross-fades with spring animation' },
      ],
    },
  ],

  tasks: [
    {
      id: 'SAB-1',
      title: 'Extract color variants to CSS custom properties',
      priority: 'P1',
      estimate: 'M',
      description: 'The colorByVariant object uses hardcoded OKLCH and rgba values in Tailwind arbitrary classes. Move to CSS custom properties for theme consistency.',
      files: [
        { path: 'src/primitives/SplitActionButton.tsx', action: 'modify', description: 'Replace hardcoded color classes with CSS var references' },
        { path: 'src/index.css', action: 'modify', description: 'Add CSS custom properties for each variant' },
      ],
      acceptanceCriteria: [
        'All variant colors use CSS custom properties',
        'Visual output is identical',
        'Dark/light theme switching would only require changing CSS vars',
      ],
    },
    {
      id: 'SAB-2',
      title: 'Add tooltip to chevron for discoverability',
      priority: 'P2',
      estimate: 'S',
      description: 'The chevron segment has an aria-label but no visible tooltip — add a tooltip for sighted users.',
      files: [{ path: 'src/primitives/SplitActionButton.tsx', action: 'modify', description: 'Wrap chevron in Tooltip component' }],
      acceptanceCriteria: [
        'Hovering chevron shows "פעולות נוספות" tooltip',
        'Tooltip does not interfere with dropdown opening',
      ],
    },
    {
      id: 'SAB-3',
      title: 'Add keyboard shortcut support',
      priority: 'P2',
      estimate: 'M',
      description: 'Support an optional keyboard shortcut prop that triggers the primary action (e.g. Ctrl+J for jam).',
      files: [{ path: 'src/primitives/SplitActionButton.tsx', action: 'modify', description: 'Add useEffect for keyboard shortcut listener' }],
      acceptanceCriteria: [
        'Shortcut triggers primary onClick',
        'Shortcut hint shown in tooltip or button label',
        'Shortcut disabled when button is disabled',
      ],
    },
  ],

  hardcodedData: [
    {
      current: "OKLCH color values in colorByVariant (e.g. 'bg-[oklch(0.348_0.111_17)]')",
      replaceWith: 'CSS custom properties (var(--split-danger-bg), etc.)',
      location: 'SplitActionButton.tsx colorByVariant object lines 35-70',
    },
    {
      current: "Dropdown menu bg '#1c1c20'",
      replaceWith: 'SURFACE token or CSS variable',
      location: 'SplitActionButton.tsx DropdownMenuContent className',
    },
  ],

  notes: [
    'The gap between segments (gap-0.5 = 2px) reveals the card surface behind, creating a visual divider without an explicit border.',
    'Label swap uses AnimatePresence with mode="popLayout" — old label exits downward, new label enters from above.',
    'stopPropagation is used on all click handlers to prevent card toggle from firing.',
    'The danger and warning variants add an outer ring (ring-1 ring-inset) via variantShells — other variants do not.',
    'onCloseAutoFocus is prevented on the dropdown to avoid focus jumping back to the chevron after selection.',
  ],
};
