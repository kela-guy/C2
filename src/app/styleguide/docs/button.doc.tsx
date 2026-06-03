/**
 * Co-located doc module for the base Button primitive — the father of the
 * button family. Provides the live examples + raw source consumed by the
 * generic ComponentDoc renderer; the meta (props, states, handoff hints) lives
 * in `registry/manifest.json`, and the family children (ActionButton,
 * SplitActionButton, CameraToggleButton, CopyButton) are linked via the
 * manifest's `parentId` -> Family section.
 *
 * Craft gate: examples render the full state set (default / hover / active /
 * focus-visible / disabled / loading / pressed).
 */
import { useState } from 'react';
import { Crosshair, Zap, Ban } from '@/lib/icons/central';
import { Button } from '@/primitives';
import buttonSrc from '@/primitives/Button.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

function PressedDemo() {
  const [on, setOn] = useState(true);
  return (
    <Button label={on ? 'Tracking' : 'Track'} icon={Crosshair} pressed={on} onClick={() => setOn((v) => !v)} />
  );
}

export const buttonDoc: ComponentDocModule = {
  id: 'button',
  source: buttonSrc,
  usage: `import { Button } from "@/primitives"
import { Crosshair } from "@/lib/icons/central"

<Button label="Track" icon={Crosshair} variant="fill" onClick={handleTrack} />`,
  examples: [
    {
      id: 'variants',
      title: 'Variants',
      description: 'Five surface treatments. Danger and warning use oklch so they read correctly on the dark control-room surface.',
      code: `<Button label="Fill" variant="fill" />
<Button label="Ghost" variant="ghost" />
<Button label="Outline" variant="outline" />
<Button label="Jam" variant="danger" icon={Zap} />
<Button label="Caution" variant="warning" />`,
      render: () => (
        <div className="flex flex-wrap items-center gap-3">
          <Button label="Fill" variant="fill" />
          <Button label="Ghost" variant="ghost" />
          <Button label="Outline" variant="outline" />
          <Button label="Jam" variant="danger" icon={Zap} />
          <Button label="Caution" variant="warning" />
        </div>
      ),
    },
    {
      id: 'sizes',
      title: 'Sizes',
      description: 'sm / md / lg map to height and type scale.',
      code: `<Button label="Small" size="sm" />
<Button label="Medium" size="md" />
<Button label="Large" size="lg" />`,
      render: () => (
        <div className="flex flex-wrap items-center gap-3">
          <Button label="Small" size="sm" icon={Crosshair} />
          <Button label="Medium" size="md" icon={Crosshair} />
          <Button label="Large" size="lg" icon={Crosshair} />
        </div>
      ),
    },
    {
      id: 'states',
      title: 'States — disabled, loading, pressed',
      description: 'Disabled dims to 45%; loading swaps the icon for a spinner and sets cursor-wait; pressed brightens with an inset ring.',
      code: `<Button label="Disabled" disabled />
<Button label="Working" loading />
<Button label="Track" pressed onClick={toggle} />`,
      render: () => (
        <div className="flex flex-wrap items-center gap-3">
          <Button label="Disabled" icon={Ban} disabled />
          <Button label="Working" loading />
          <PressedDemo />
        </div>
      ),
    },
  ],
};
