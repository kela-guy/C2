/**
 * Co-located doc module for the Checkbox primitive
 * (`@/shared/components/ui/checkbox`) — Radix checkbox with checked /
 * unchecked / indeterminate states. Meta lives in `registry/manifest.json`.
 */
import { useState } from 'react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import checkboxSrc from '@/shared/components/ui/checkbox.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

function LayerGroupDemo() {
  const [layers, setLayers] = useState({ radar: true, cameras: true, zones: false });
  const values = Object.values(layers);
  const all = values.every(Boolean);
  const none = values.every((v) => !v);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <Checkbox
          id="dl-all"
          checked={all ? true : none ? false : 'indeterminate'}
          onCheckedChange={(next) =>
            setLayers({ radar: next === true, cameras: next === true, zones: next === true })
          }
        />
        <Label htmlFor="dl-all">כל השכבות</Label>
      </div>
      <div className="ms-6 flex flex-col gap-2">
        {(
          [
            ['radar', 'כיסוי מכ״ם'],
            ['cameras', 'שדה ראייה מצלמות'],
            ['zones', 'אזורים מוגבלים'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <Checkbox
              id={`dl-${key}`}
              checked={layers[key]}
              onCheckedChange={(next) => setLayers((s) => ({ ...s, [key]: next === true }))}
            />
            <Label htmlFor={`dl-${key}`}>{label}</Label>
          </div>
        ))}
      </div>
    </div>
  );
}

export const checkboxDoc: ComponentDocModule = {
  id: 'checkbox',
  source: checkboxSrc,
  usage: `import { Checkbox } from "@/shared/components/ui/checkbox"
import { Label } from "@/shared/components/ui/label"

<div className="flex items-center gap-2">
  <Checkbox id="confirm" checked={confirmed} onCheckedChange={setConfirmed} />
  <Label htmlFor="confirm">אשר נטרול מטרה</Label>
</div>`,
  examples: [
    {
      id: 'default',
      title: 'With label',
      description:
        'Pair the box with a Label via htmlFor so the text is part of the hit target. Checked fills with the accent + check glyph.',
      code: `<div className="flex items-center gap-2">
  <Checkbox id="confirm" defaultChecked />
  <Label htmlFor="confirm">אשר נטרול מטרה</Label>
</div>`,
      render: () => (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Checkbox id="cb-1" defaultChecked />
            <Label htmlFor="cb-1">אשר נטרול מטרה</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="cb-2" />
            <Label htmlFor="cb-2">שלח דיווח לחמ״ל</Label>
          </div>
        </div>
      ),
    },
    {
      id: 'indeterminate',
      title: 'Indeterminate group',
      description:
        'A parent "all layers" checkbox reflects partial selection with checked="indeterminate" — the dash glyph. Fully interactive.',
      render: () => <LayerGroupDemo />,
    },
    {
      id: 'disabled',
      title: 'Disabled',
      description: 'Both states dim to 50% and drop pointer events.',
      code: `<Checkbox disabled />
<Checkbox disabled defaultChecked />`,
      render: () => (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Checkbox id="cb-d1" disabled />
            <Label htmlFor="cb-d1" className="opacity-50">
              לא זמין
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="cb-d2" disabled defaultChecked />
            <Label htmlFor="cb-d2" className="opacity-50">
              נעול (מסומן)
            </Label>
          </div>
        </div>
      ),
    },
  ],
};
