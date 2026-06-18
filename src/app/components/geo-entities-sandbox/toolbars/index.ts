/**
 * Geo Drawing Sandbox — toolbar variant registry.
 *
 * The host renders ONE variant at a time, but the user can flip between all
 * variants from a segmented switcher in the sandbox header. Adding a new
 * variant is a single entry here; every variant consumes the same
 * {@link ToolbarProps} so the underlying drawing controller is shared.
 */

import { ToolbarIconRow } from './ToolbarIconRow';
import { ToolbarMenu } from './ToolbarMenu';
import { ToolbarGrouped } from './ToolbarGrouped';
import { ToolbarTabs } from './ToolbarTabs';
import { ToolbarCardPicker } from './ToolbarCardPicker';
import { ToolbarCommand } from './ToolbarCommand';
import { ToolbarForCursor } from './ToolbarForCursor';
import type { ToolbarVariantDescriptor } from './types';

export type ToolbarVariantId =
  | 'forCursor'
  | 'iconRow'
  | 'menu'
  | 'grouped'
  | 'tabs'
  | 'cards'
  | 'command';

export const TOOLBAR_VARIANTS: ReadonlyArray<ToolbarVariantDescriptor & { id: ToolbarVariantId }> = [
  {
    id: 'forCursor',
    label: 'For Cursor',
    blurb: 'Geometry trigger that expands into Polygon / Line / Curve',
    Component: ToolbarForCursor,
  },
  {
    id: 'iconRow',
    label: 'Icon row',
    blurb: 'Icon-only horizontal bar',
    Component: ToolbarIconRow,
  },
  {
    id: 'menu',
    label: 'Add menu',
    blurb: '"+" trigger with named dropdown',
    Component: ToolbarMenu,
  },
  {
    id: 'grouped',
    label: 'Grouped',
    blurb: 'Segmented bar by purpose',
    Component: ToolbarGrouped,
  },
  {
    id: 'tabs',
    label: 'Tabs',
    blurb: 'Category tabs with tools per tab',
    Component: ToolbarTabs,
  },
  {
    id: 'cards',
    label: 'Card picker',
    blurb: 'Icon + name + description cards',
    Component: ToolbarCardPicker,
  },
  {
    id: 'command',
    label: 'Command',
    blurb: 'Search input with quick-pick chips',
    Component: ToolbarCommand,
  },
];

export type { ToolbarProps, ToolbarActionId } from './types';
