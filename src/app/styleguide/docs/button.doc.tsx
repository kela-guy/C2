/**
 * Co-located doc module for the generic Button primitive
 * (`@/shared/components/ui/button`), wearing the C2 design — the variant +
 * size token system rendered as layered white opacities (and an oklch
 * destructive) on the dark control-room surface. Meta lives in
 * `registry/manifest.json`; the family children (ActionButton,
 * SplitActionButton, CameraToggleButton, CopyButton) link back via `parentId`.
 */
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import buttonSrc from '@/shared/components/ui/button.tsx?raw';
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
  ],
};
