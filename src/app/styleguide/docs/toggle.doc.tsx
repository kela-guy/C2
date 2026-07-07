/**
 * Co-located doc module for the Toggle primitive
 * (`@/shared/components/ui/toggle`) — a Radix two-state pressed/unpressed
 * button with real `aria-pressed` + `data-state` semantics — plus the domain
 * composition built on it: CameraToggleButton, the single on/off camera
 * control that wears the ui/button `buttonVariants` cva (the button family's
 * one styling source) over Toggle semantics.
 * Meta lives in `registry/manifest.json`.
 */
import { useState } from 'react';
import { Toggle } from '@/shared/components/ui/toggle';
import { Eye, Pin, Video, Radar } from '@/lib/icons/central';
import { CameraToggleButton } from '@/primitives';
import toggleSrc from '@/shared/components/ui/toggle.tsx?raw';
import cameraToggleSrc from '@/primitives/CameraToggleButton.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

function CameraToggleDemo() {
  const [on, setOn] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <div className="w-40">
      <CameraToggleButton
        on={on}
        pending={pending}
        offLabel="Point camera"
        onLabel="Release camera"
        offIcon={Video}
        onIcon={Video}
        onToggle={() => {
          if (pending) return;
          setPending(true);
          window.setTimeout(() => {
            setPending(false);
            setOn((v) => !v);
          }, 900);
        }}
      />
    </div>
  );
}

export const toggleDoc: ComponentDocModule = {
  id: 'toggle',
  source: toggleSrc,
  usage: `import { Toggle } from "@/shared/components/ui/toggle"
import { Eye } from "@/lib/icons/central"

<Toggle aria-label="הצג שכבה" pressed={visible} onPressedChange={setVisible}>
  <Eye size={14} />
  שכבה
</Toggle>`,
  examples: [
    {
      id: 'default',
      title: 'On / off',
      description:
        'A real toggle, not a styled button: Radix drives aria-pressed and data-state=on, and the on state lifts onto the accent surface. Click to flip.',
      code: `<Toggle aria-label="הצג מסלול"><Radar size={14} /> מכ״ם</Toggle>
<Toggle defaultPressed aria-label="נעץ"><Pin size={14} /> נעץ</Toggle>`,
      render: () => (
        <div className="flex flex-wrap items-center gap-3">
          <Toggle aria-label="הצג מכ״ם">
            <Radar size={14} />
            מכ״ם
          </Toggle>
          <Toggle defaultPressed aria-label="נעץ">
            <Pin size={14} />
            נעץ
          </Toggle>
          <Toggle aria-label="הצג שכבה">
            <Eye size={14} />
            שכבה
          </Toggle>
        </div>
      ),
    },
    {
      id: 'variants',
      title: 'Variants & sizes',
      description:
        'default rests transparent; outline adds a layered ring for standalone placement. Sizes sm / default / lg scale the hit target.',
      code: `<Toggle variant="outline">Outline</Toggle>
<Toggle size="sm">sm</Toggle>
<Toggle size="lg">lg</Toggle>
<Toggle disabled>Disabled</Toggle>`,
      render: () => (
        <div dir="ltr" className="flex flex-wrap items-center gap-3">
          <Toggle variant="outline" aria-label="Outline">
            Outline
          </Toggle>
          <Toggle size="sm" aria-label="Small">
            sm
          </Toggle>
          <Toggle size="lg" aria-label="Large">
            lg
          </Toggle>
          <Toggle disabled aria-label="Disabled">
            Disabled
          </Toggle>
        </div>
      ),
    },
    {
      id: 'camera-toggle',
      title: 'Domain composition: CameraToggleButton',
      description:
        'CameraToggleButton = Toggle wearing the ui/button buttonVariants cva: Radix supplies the pressed semantics while the shell layers the button family\'s fill variant + size scale (via the buttonTokens alias maps) over the Toggle. Click to slew (pending spinner); it settles into the brighter live state; click again to release.',
      code: `import { CameraToggleButton } from "@/primitives"
import { Video } from "@/lib/icons/central"

<CameraToggleButton
  on={live}
  pending={slewing}
  offLabel="Point camera"
  onLabel="Release camera"
  offIcon={Video}
  onIcon={Video}
  onToggle={handleToggle}
/>`,
      render: () => <CameraToggleDemo />,
    },
  ],
  edgeCases: [
    {
      id: 'camera-states',
      label: 'CameraToggleButton: off / live',
      note: 'The off state invites pointing; the live state reads the same idle or hovered so "live" stays legible.',
      render: () => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40">
            <CameraToggleButton
              on={false}
              offLabel="Point camera"
              onLabel="Release camera"
              offIcon={Video}
              onIcon={Video}
              onToggle={() => {}}
            />
          </div>
          <div className="w-40">
            <CameraToggleButton
              on
              offLabel="Point camera"
              onLabel="Release camera"
              offIcon={Video}
              onIcon={Video}
              onToggle={() => {}}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'camera-badge',
      label: 'CameraToggleButton: trailing badge',
      note: 'The optional badge pill (e.g. the selected track) rides after the label and hides while pending.',
      render: () => (
        <div className="w-48">
          <CameraToggleButton
            on
            offLabel="Point camera"
            onLabel="Release camera"
            offIcon={Video}
            onIcon={Video}
            badge="T-042"
            onToggle={() => {}}
          />
        </div>
      ),
    },
  ],
  relatedFiles: [{ file: 'src/primitives/CameraToggleButton.tsx', code: cameraToggleSrc }],
};
