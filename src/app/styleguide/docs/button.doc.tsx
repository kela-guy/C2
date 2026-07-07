/**
 * Co-located doc module for the one Button foundation. Documents the generic
 * primitive (`@/shared/components/ui/button`) wearing the C2 design — the
 * `buttonVariants` cva rendered as layered white opacities (and an oklch
 * destructive) on the dark control-room surface — plus the domain
 * compositions that literally render it: the primitives Button/ActionButton
 * (ui Button + animated label/loading/pressed behavior), SplitActionButton
 * (ui Button + ui Button size="icon" + DropdownMenu), and CopyButton
 * (ui Button variant="ghost" size="icon"). `src/primitives/buttonTokens.ts`
 * is only an alias map from the domain vocabulary (fill/ghost/outline/
 * danger/warning, sm/md/lg) onto the cva variants, so every one of them is a
 * usage of this one design, not a sibling design. CameraToggleButton is
 * Toggle-based (wearing the same cva) and lives on the Toggle doc. Meta
 * lives in `registry/manifest.json`.
 */
import { Plus, Trash2 } from 'lucide-react';
import { Crosshair, Radio, Zap } from '@/lib/icons/central';
import { Button } from '@/shared/components/ui/button';
import { ActionButton, CopyButton, SplitActionButton } from '@/primitives';
import buttonSrc from '@/shared/components/ui/button.tsx?raw';
import buttonTokensSrc from '@/primitives/buttonTokens.ts?raw';
import copyButtonSrc from '@/primitives/CopyButton.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const buttonDoc: ComponentDocModule = {
  id: 'button',
  source: buttonSrc,
  usage: `import { Button } from "@/components/ui/button"

<Button>Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="destructive">Delete</Button>`,
  examples: [
    {
      id: 'variants',
      title: 'Variants',
      description:
        'Six surface treatments. Destructive uses oklch so it reads correctly on the dark surface; outline is a layered ring rather than a hard border.',
      code: `<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>`,
      render: () => (
        <div dir="ltr" className="flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      ),
    },
    {
      id: 'sizes',
      title: 'Sizes',
      description: 'sm / default / lg map to height and type scale; icon is a square slot for icon-only actions.',
      code: `<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon" aria-label="Add"><Plus /></Button>`,
      render: () => (
        <div dir="ltr" className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Add">
            <Plus />
          </Button>
        </div>
      ),
    },
    {
      id: 'with-icon',
      title: 'With icon & disabled',
      description: 'Icons size to 16px and gap from the label automatically. Disabled drops to 45% opacity and blocks pointer events.',
      code: `<Button><Plus /> New item</Button>
<Button variant="destructive"><Trash2 /> Delete</Button>
<Button disabled>Disabled</Button>`,
      render: () => (
        <div dir="ltr" className="flex flex-wrap items-center gap-3">
          <Button>
            <Plus /> New item
          </Button>
          <Button variant="destructive">
            <Trash2 /> Delete
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      ),
    },
    {
      id: 'as-child',
      title: 'As link (asChild)',
      description: 'With asChild the button styling is applied onto a child element via Radix Slot, so a real anchor can carry the button look.',
      code: `<Button asChild>
  <a href="/docs">Documentation</a>
</Button>`,
      render: () => (
        <div dir="ltr" className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <a href="#button">Documentation</a>
          </Button>
          <Button asChild variant="outline">
            <a href="#button">Learn more</a>
          </Button>
        </div>
      ),
    },
    {
      id: 'action-button',
      title: 'Composition: ActionButton',
      description:
        'ActionButton is a thin preset of the primitives Button — which itself renders this ui Button, mapping fill/ghost/outline/danger/warning onto the cva variants default/secondary/outline/destructive/warning via buttonTokens.ts. It forwards every prop and only stamps the legacy action-button handoff id for deep-links. Prefer the base Button in new code.',
      code: `import { ActionButton } from "@/primitives"
import { Crosshair } from "@/lib/icons/central"

// Equivalent to <Button … dataHandoff="action-button" />
<ActionButton label="Track" icon={Crosshair} variant="fill" onClick={handleTrack} />`,
      render: () => (
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton label="Track" icon={Crosshair} />
          <ActionButton label="Ghost" variant="ghost" />
          <ActionButton label="Working" loading />
        </div>
      ),
    },
    {
      id: 'split-action',
      title: 'Composition: SplitActionButton',
      description:
        'SplitActionButton = Button + Button size="icon" + DropdownMenu: the primary segment is this ui Button firing the main action; the chevron is a ui Button size="icon" acting as the DropdownMenuTrigger. Both wear the same buttonVariants cva, and the joined shell (shared rounded ends, 2px divider) is pure className composition — so the shell can never drift from Button. RTL-aware.',
      code: `import { SplitActionButton } from "@/primitives"
import { Radio, Crosshair, Zap } from "@/lib/icons/central"

<SplitActionButton
  label="הפעל ג׳אמר"
  icon={Zap}
  variant="danger"
  onClick={onJam}
  dropdownItems={[
    { id: "rf", label: "ג׳אמר RF", icon: Radio, onClick: selectRf },
    { id: "gps", label: "ג׳אמר GPS", icon: Crosshair, onClick: selectGps },
  ]}
/>`,
      render: () => (
        <SplitActionButton
          label="הפעל ג׳אמר"
          icon={Zap}
          variant="danger"
          onClick={() => {}}
          dropdownItems={[
            { id: 'rf', label: 'ג׳אמר RF', icon: Radio, onClick: () => {} },
            { id: 'gps', label: 'ג׳אמר GPS', icon: Crosshair, onClick: () => {} },
          ]}
        />
      ),
    },
    {
      id: 'copy-button',
      title: 'Composition: CopyButton',
      description:
        'The quietest member of the family: this ui Button as variant="ghost" size="icon", hover-revealed, copying a single value to the clipboard. The Check glyph lands ~2px larger than Copy for visible success without layout shift. Forced visible here via alwaysVisible.',
      code: `import { CopyButton } from "@/primitives"

<CopyButton value="sk_live_8f2a…" copyLabel="Copy API key" copiedLabel="Copied" />`,
      render: () => (
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono text-sm text-slate-11">
            <span>ORD-48213</span>
            <CopyButton
              value="ORD-48213"
              copyLabel="Copy order id"
              copiedLabel="Copied"
              size="sm"
              alwaysVisible
            />
          </div>
          <div className="flex items-center gap-2 font-mono text-sm text-slate-11">
            <span>sk_live_8f2a4c</span>
            <CopyButton
              value="sk_live_8f2a4c"
              copyLabel="Copy API key"
              copiedLabel="Copied"
              size="md"
              alwaysVisible
            />
          </div>
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'split-long-label',
      label: 'SplitActionButton: long primary label',
      note: 'The primary segment is min-w-0 + overflow-hidden, so a long label truncates while the chevron segment keeps its fixed hit target.',
      render: () => (
        <div className="w-[200px]">
          <SplitActionButton
            label="הפעל ג׳אמר רב-תדרי מיידי"
            icon={Zap}
            variant="danger"
            onClick={() => {}}
            dropdownItems={[{ id: 'rf', label: 'ג׳אמר RF', icon: Radio, onClick: () => {} }]}
          />
        </div>
      ),
    },
    {
      id: 'split-many-items',
      label: 'SplitActionButton: many dropdown items',
      note: 'Open the menu: a long item list extends downward. Items wrap text; keep the menu scoped or group items for long lists.',
      render: () => (
        <SplitActionButton
          label="הפעל ג׳אמר"
          icon={Zap}
          variant="danger"
          onClick={() => {}}
          dropdownItems={[
            { id: 'rf', label: 'ג׳אמר RF', icon: Radio, onClick: () => {} },
            { id: 'gps', label: 'ג׳אמר GPS', icon: Crosshair, onClick: () => {} },
            { id: 'gnss', label: 'ג׳אמר GNSS', icon: Radio, onClick: () => {} },
            { id: 'wifi', label: 'ג׳אמר Wi-Fi', icon: Radio, onClick: () => {} },
            { id: 'cell', label: 'ג׳אמר סלולרי', icon: Radio, onClick: () => {} },
            { id: 'all', label: 'ג׳אמר רב-תדרי', icon: Zap, onClick: () => {} },
          ]}
        />
      ),
    },
    {
      id: 'split-disabled',
      label: 'SplitActionButton: disabled',
      note: 'Both segments dim to 45% and drop pointer events; the dropdown trigger is removed from the tab order.',
      render: () => (
        <SplitActionButton
          label="הפעל ג׳אמר"
          icon={Zap}
          variant="danger"
          disabled
          onClick={() => {}}
          dropdownItems={[{ id: 'rf', label: 'ג׳אמר RF', icon: Radio, onClick: () => {} }]}
        />
      ),
    },
    {
      id: 'copy-hover-revealed',
      label: 'CopyButton: hover-revealed (resting)',
      note: 'Default behavior: hidden at opacity-0 until the parent group/copy row is hovered or the button is focused. Hover this tile to reveal it.',
      render: () => (
        <div className="group/copy flex items-center gap-2 rounded-md px-2 py-1 font-mono text-sm text-slate-11 hover:bg-state-hover">
          <span>ORD-48213</span>
          <CopyButton value="ORD-48213" copyLabel="Copy order id" copiedLabel="Copied" />
        </div>
      ),
    },
    {
      id: 'copy-long-value',
      label: 'CopyButton: long value',
      note: 'The button copies the full value regardless of how the adjacent text is truncated — the glyph stays a fixed 24px and never grows with the value.',
      render: () => (
        <div className="flex w-[220px] items-center gap-2 font-mono text-sm text-slate-11">
          <span className="min-w-0 flex-1 truncate">sk_live_8f2a4c9e1b7d0f6a3e5c2b</span>
          <CopyButton
            value="sk_live_8f2a4c9e1b7d0f6a3e5c2b"
            copyLabel="Copy API key"
            copiedLabel="Copied"
            alwaysVisible
          />
        </div>
      ),
    },
    {
      id: 'copy-empty-disabled',
      label: 'CopyButton: empty value (disabled)',
      note: 'An empty value auto-disables the button (opacity-30, cursor-not-allowed) so there is nothing to copy by accident.',
      render: () => (
        <div className="flex items-center gap-2 font-mono text-sm text-slate-9">
          <span>—</span>
          <CopyButton value="" copyLabel="Copy value" copiedLabel="Copied" alwaysVisible />
        </div>
      ),
    },
  ],
  relatedFiles: [
    { file: 'src/primitives/buttonTokens.ts', code: buttonTokensSrc },
    { file: 'src/primitives/CopyButton.tsx', code: copyButtonSrc },
  ],
};
