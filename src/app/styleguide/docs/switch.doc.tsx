/**
 * Co-located doc module for the Switch primitive
 * (`@/shared/components/ui/switch`) — the Radix on/off switch for
 * immediate-effect settings. Meta lives in `registry/manifest.json`.
 */
import { useState } from 'react';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import switchSrc from '@/shared/components/ui/switch.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

function ArmDemo() {
  const [armed, setArmed] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <Switch id="sw-arm" checked={armed} onCheckedChange={setArmed} />
      <Label htmlFor="sw-arm">חימוש אוטומטי</Label>
      <span className="text-xs text-slate-9">{armed ? 'פעיל' : 'כבוי'}</span>
    </div>
  );
}

export const switchDoc: ComponentDocModule = {
  id: 'switch',
  source: switchSrc,
  usage: `import { Switch } from "@/shared/components/ui/switch"
import { Label } from "@/shared/components/ui/label"

<div className="flex items-center gap-3">
  <Switch id="auto-track" checked={autoTrack} onCheckedChange={setAutoTrack} />
  <Label htmlFor="auto-track">מעקב אוטומטי</Label>
</div>`,
  examples: [
    {
      id: 'default',
      title: 'Interactive',
      description:
        'A switch commits immediately — no submit step. The thumb slides to the inline-end and the track takes the accent fill when on.',
      render: () => <ArmDemo />,
    },
    {
      id: 'settings-list',
      title: 'Settings rows',
      description: 'The standard settings-panel grammar: label on the inline-start, switch pinned at the end.',
      code: `<div className="flex items-center justify-between">
  <Label htmlFor="s1">התראות קוליות</Label>
  <Switch id="s1" defaultChecked />
</div>`,
      render: () => (
        <div className="flex w-64 flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="sw-a">התראות קוליות</Label>
            <Switch id="sw-a" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sw-b">מעקב אוטומטי</Label>
            <Switch id="sw-b" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sw-c">שיתוף מיקום לחמ״ל</Label>
            <Switch id="sw-c" defaultChecked />
          </div>
        </div>
      ),
    },
    {
      id: 'disabled',
      title: 'Disabled',
      description: 'Both positions dim and lock.',
      code: `<Switch disabled />
<Switch disabled defaultChecked />`,
      render: () => (
        <div className="flex items-center gap-4">
          <Switch disabled aria-label="כבוי ונעול" />
          <Switch disabled defaultChecked aria-label="פעיל ונעול" />
        </div>
      ),
    },
  ],
};
