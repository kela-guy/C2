import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'Substrate / Elevated',
  filePath: 'src/primitives/Substrate.tsx',
  purpose:
    'Eight-level surface system (fluid-functionalism Surfaces) implemented as a React context + role primitives. Substrate seeds the floor, Elevated lifts a panel above it, and role wrappers (PopoverSurface, MenuSurface, TooltipSurface, DialogSurface, SheetSurface, HoverCardSurface) encode each overlay role\'s elevation policy in one place so callsites stay declarative.',
  location: 'Primitives / Foundations',
  status: 'ready-for-dev',

  props: [
    {
      name: 'level',
      type: 'SubstrateLevel (1..8)',
      required: false,
      description:
        '<Elevated>: absolute substrate level. Ignores the surrounding context. Use for modals (Dialog, Sheet) that need a stable floor regardless of where the trigger lived. <Substrate>: required level seed for the subtree.',
    },
    {
      name: 'lift',
      type: 'number',
      required: false,
      description:
        '<Elevated> only. Relative offset above the current substrate (resolved + clamped to 1..8). Use for popovers, dropdowns, menus, tooltips that should always sit N levels above whatever they\'re mounted inside.',
    },
    {
      name: 'asChild',
      type: 'boolean',
      required: false,
      defaultValue: 'false',
      description:
        '<Elevated> only. Radix-style: merges data-substrate + className into the single child element instead of rendering a wrapper div. Used when wrapping Radix portal content (Popover.Content, Tooltip.Content, etc.) so no extra DOM is introduced.',
    },
    {
      name: 'children',
      type: 'ReactNode',
      required: true,
      description:
        'Subtree that paints at and reads from this substrate level.',
    },
    {
      name: 'className',
      type: 'string',
      required: false,
      description: '<Elevated> only. Merged with the surface/shadow classes via tailwind-merge.',
    },
  ],

  states: [
    {
      name: 'default substrate',
      trigger: 'Component renders outside any <Substrate>',
      description:
        'useSubstrate() returns 1 — the visual contract: the page itself is substrate 1.',
      implementedInPrototype: true,
    },
    {
      name: 'seeded substrate',
      trigger: '<Substrate level={5}> wraps the subtree',
      description:
        'All descendants read level 5 from useSubstrate(). <Substrate> does NOT paint a surface — pure context provider.',
      implementedInPrototype: true,
    },
    {
      name: 'absolute Elevated',
      trigger: '<Elevated level={5}> inside any substrate',
      description:
        'Paints level 5 regardless of parent context. data-substrate="5" applied; --surface and --shadow resolve to surface-5 / shadow-5.',
      implementedInPrototype: true,
    },
    {
      name: 'relative Elevated (lift)',
      trigger: '<Elevated lift={2}> with substrate=3 ancestor',
      description:
        'Paints level 5 (3 + 2). Nested <Elevated lift={2}> inside this one would resolve to level 7, then 8 if nested again (clamped).',
      implementedInPrototype: true,
    },
    {
      name: 'lift overflow clamped',
      trigger: '<Elevated lift={10}> from any base',
      description: 'Clamped to level 8.',
      implementedInPrototype: true,
    },
    {
      name: 'lift underflow clamped',
      trigger: '<Elevated lift={-10}> from any base',
      description: 'Clamped to level 1.',
      implementedInPrototype: true,
    },
    {
      name: 'asChild merge',
      trigger: '<Elevated lift={2} asChild><Foo className="x" /></Elevated>',
      description:
        'data-substrate + bg-/shadow- classes are merged onto <Foo> (single child) instead of a wrapper div being created.',
      implementedInPrototype: true,
    },
    {
      name: 'PopoverSurface',
      trigger: '<PopoverSurface> mounted inside substrate=3',
      description: 'Lifts +2 → substrate 5. Wrapped by ui/popover.tsx PopoverContent.',
      implementedInPrototype: true,
    },
    {
      name: 'MenuSurface',
      trigger: '<MenuSurface> mounted inside substrate=3',
      description:
        'Lifts +2 → substrate 5. Used by dropdown-menu, context-menu, select, menubar Content.',
      implementedInPrototype: true,
    },
    {
      name: 'TooltipSurface',
      trigger: '<TooltipSurface> mounted inside substrate=3',
      description:
        'Lifts +3 → substrate 6. Sits above popovers and menus. Replaces shadcn ui/tooltip\'s bg-primary, which inverted under .dark.',
      implementedInPrototype: true,
    },
    {
      name: 'DialogSurface',
      trigger: '<DialogSurface> from any substrate',
      description:
        'Absolute level 5. Modal anchors at fixed elevation regardless of trigger location. Re-seeds substrate context for its children — a Popover inside a Dialog lifts from 5 to 7.',
      implementedInPrototype: true,
    },
    {
      name: 'SheetSurface',
      trigger: '<SheetSurface> from any substrate',
      description: 'Absolute level 5, same semantics as DialogSurface.',
      implementedInPrototype: true,
    },
    {
      name: 'HoverCardSurface',
      trigger: '<HoverCardSurface> mounted inside substrate=3',
      description: 'Lifts +2 → substrate 5.',
      implementedInPrototype: true,
    },
  ],

  interactions: [
    {
      trigger: 'Substrate context propagation',
      element: '<Elevated>',
      result:
        'Provides new SubstrateContext to children at the resolved level so further-nested overlays lift correctly. A popover-inside-card-inside-dialog stacks: dialog=5, card=5 (no lift), popover=7.',
    },
  ],

  tokens: {
    colors: [
      { name: '--surface-void', value: 'oklch(0.06 0 0)', usage: 'Camera bezels, video wells, map basemap. Below substrate 1.' },
      { name: '--surface-1', value: 'var(--slate-1)', usage: 'Page background. Default substrate seed.' },
      { name: '--surface-2', value: 'var(--slate-2)', usage: 'Panel base. GridblockPanel chrome.' },
      { name: '--surface-3', value: 'var(--slate-3)', usage: 'Card / shadcn --card. Default content surface.' },
      { name: '--surface-4', value: 'var(--slate-4)', usage: 'Card-hover / shadcn --accent.' },
      { name: '--surface-5', value: 'var(--slate-5)', usage: 'Popover / dropdown / select / menubar. shadcn --popover.' },
      { name: '--surface-6', value: 'var(--slate-6)', usage: 'Tooltip above a popover-on-page.' },
      { name: '--surface-7', value: 'var(--slate-7)', usage: 'Popover inside a dialog.' },
      { name: '--surface-8', value: 'var(--slate-8)', usage: 'Tooltip inside a dialog.' },
      { name: '--shadow-N', value: '0..24px multi-layer rgb shadow', usage: 'Paired with each surface level; provides depth when L deltas are subtle.' },
    ],
    typography: [],
    spacing: [],
  },

  accessibility: {
    role: 'none (primitive)',
    ariaAttributes: [],
    screenReaderNotes:
      'Substrate / Elevated produce no semantic role on their own — they are visual scaffolding. Consumers (Dialog, Popover, etc.) supply the appropriate ARIA on their own elements.',
  },

  tasks: [
    {
      id: 'SUB-1',
      title: 'Wire role surfaces into all Radix overlays',
      priority: 'P0',
      estimate: 'M',
      description:
        'Update src/app/components/ui/{popover, dropdown-menu, context-menu, select, menubar, hover-card, tooltip, dialog, sheet}.tsx so their Content wraps in the matching role surface and drops hard-coded bg-popover / bg-primary / bg-background classes.',
      files: [
        { path: 'src/app/components/ui/popover.tsx', action: 'modify', description: 'Wrap Content in <PopoverSurface asChild>.' },
        { path: 'src/app/components/ui/dropdown-menu.tsx', action: 'modify', description: 'Wrap Content + SubContent in <MenuSurface asChild>.' },
        { path: 'src/app/components/ui/context-menu.tsx', action: 'modify', description: 'Wrap Content + SubContent in <MenuSurface asChild>. Delete bg-[#1a1a1a] override.' },
        { path: 'src/app/components/ui/select.tsx', action: 'modify', description: 'Wrap Content in <MenuSurface asChild>.' },
        { path: 'src/app/components/ui/menubar.tsx', action: 'modify', description: 'Wrap Content in <MenuSurface asChild>.' },
        { path: 'src/app/components/ui/hover-card.tsx', action: 'modify', description: 'Wrap Content in <HoverCardSurface asChild>.' },
        { path: 'src/app/components/ui/tooltip.tsx', action: 'modify', description: 'Wrap Content in <TooltipSurface asChild>. Drop bg-primary / fill-primary (inverts under dark).' },
        { path: 'src/app/components/ui/dialog.tsx', action: 'modify', description: 'Wrap Content in <DialogSurface asChild>. Drop bg-background.' },
        { path: 'src/app/components/ui/sheet.tsx', action: 'modify', description: 'Wrap Content in <SheetSurface asChild>. Drop bg-background.' },
      ],
      acceptanceCriteria: [
        'All overlay Content elements paint via Substrate/Elevated, not hard-coded bg-* classes.',
        'A popover inside a dialog renders at substrate 7 (5 + 2).',
        'A tooltip inside a popover renders at substrate 8 (5 + 3, clamped).',
        'Removing hard-coded bg-* does not break shadcn\'s focus/hover states (they read from --accent / --muted, not the wrapper bg).',
      ],
    },
    {
      id: 'SUB-2',
      title: 'Seed substrate at GridblockShell root',
      priority: 'P0',
      estimate: 'S',
      description:
        'Wrap GridblockShell.tsx outer div in <Substrate level={1}> so all popovers/menus/tooltips inside the dashboard inherit the right starting level.',
      files: [{ path: 'src/app/components/gridblock/GridblockShell.tsx', action: 'modify', description: 'Wrap return in <Substrate level={1}>.' }],
      acceptanceCriteria: ['GridblockShell renders inside Substrate level 1 context.'],
    },
  ],

  notes: [
    'Why data-substrate (not inline style)? Cleaner DevTools, fewer React commits write to style.background per render, themes (.light) cascade through one CSS rule instead of through every primitive\'s render.',
    'Why role wrappers? Single point of truth for elevation policy. Changing tooltip lift from +3 to +4 is one edit, not 30+.',
    'Why absolute level for Dialog/Sheet? They portal to <body>, so the parent\'s substrate isn\'t relevant — they need a stable floor.',
    'Substrate.tsx and palette.css are the two halves of the same system — palette.css declares the tokens and the [data-substrate="N"] painting rule, Substrate.tsx manages context propagation and writes the attribute.',
  ],
};
