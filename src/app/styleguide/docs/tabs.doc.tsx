/**
 * Co-located doc module for the Tabs primitive
 * (`@/shared/components/ui/tabs`) — Radix tabs with a muted list rail and
 * swappable panels. Meta lives in `registry/manifest.json`.
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import tabsSrc from '@/shared/components/ui/tabs.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const tabsDoc: ComponentDocModule = {
  id: 'tabs',
  source: tabsSrc,
  usage: `import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"

<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">פרטים</TabsTrigger>
    <TabsTrigger value="sensors">חיישנים</TabsTrigger>
    <TabsTrigger value="log">יומן</TabsTrigger>
  </TabsList>
  <TabsContent value="details">…</TabsContent>
  <TabsContent value="sensors">…</TabsContent>
  <TabsContent value="log">…</TabsContent>
</Tabs>`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description:
        'The active trigger lifts onto the active surface; arrow keys move between triggers. Content swaps per tab.',
      render: () => (
        <Tabs defaultValue="details" className="w-80">
          <TabsList>
            <TabsTrigger value="details">פרטים</TabsTrigger>
            <TabsTrigger value="sensors">חיישנים</TabsTrigger>
            <TabsTrigger value="log">יומן</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <div className="rounded bg-surface-2 px-3 py-2 text-xs text-slate-10">
              DJI Mavic 3 · גובה 120m · מהירות 45 km/h
            </div>
          </TabsContent>
          <TabsContent value="sensors">
            <div className="rounded bg-surface-2 px-3 py-2 text-xs text-slate-10">
              3 חיישנים מזהים — מכ״ם צפוני, מצלמה תרמית, RF
            </div>
          </TabsContent>
          <TabsContent value="log">
            <div className="rounded bg-surface-2 px-3 py-2 text-xs text-slate-10">
              18:42 זיהוי ראשוני · 18:43 נעילת מעקב
            </div>
          </TabsContent>
        </Tabs>
      ),
    },
    {
      id: 'full-width',
      title: 'Full-width rail',
      description: 'Stretch the list and let the triggers share the width equally for panel-top navigation.',
      code: `<TabsList className="w-full">
  <TabsTrigger value="live" className="flex-1">שידור חי</TabsTrigger>
  <TabsTrigger value="playback" className="flex-1">הקלטות</TabsTrigger>
</TabsList>`,
      render: () => (
        <Tabs defaultValue="live" className="w-80">
          <TabsList className="w-full">
            <TabsTrigger value="live" className="flex-1">
              שידור חי
            </TabsTrigger>
            <TabsTrigger value="playback" className="flex-1">
              הקלטות
            </TabsTrigger>
          </TabsList>
          <TabsContent value="live">
            <div className="rounded bg-surface-2 px-3 py-2 text-xs text-slate-10">וידאו חי</div>
          </TabsContent>
          <TabsContent value="playback">
            <div className="rounded bg-surface-2 px-3 py-2 text-xs text-slate-10">ציר זמן הקלטות</div>
          </TabsContent>
        </Tabs>
      ),
    },
    {
      id: 'disabled',
      title: 'Disabled tab',
      description: 'A disabled trigger dims and is skipped by keyboard navigation.',
      code: `<TabsTrigger value="analytics" disabled>אנליטיקה</TabsTrigger>`,
      render: () => (
        <Tabs defaultValue="details" className="w-80">
          <TabsList>
            <TabsTrigger value="details">פרטים</TabsTrigger>
            <TabsTrigger value="analytics" disabled>
              אנליטיקה
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <div className="rounded bg-surface-2 px-3 py-2 text-xs text-slate-10">תוכן</div>
          </TabsContent>
        </Tabs>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'many-tabs',
      label: 'Many tabs',
      note: 'The rail does not scroll — keep to 2-5 tabs or move overflow into a Select/DropdownMenu.',
      render: () => (
        <Tabs defaultValue="t1" className="w-80">
          <TabsList>
            <TabsTrigger value="t1">פרטים</TabsTrigger>
            <TabsTrigger value="t2">חיישנים</TabsTrigger>
            <TabsTrigger value="t3">יומן</TabsTrigger>
            <TabsTrigger value="t4">מדיה</TabsTrigger>
            <TabsTrigger value="t5">סגירה</TabsTrigger>
          </TabsList>
          <TabsContent value="t1">
            <div className="rounded bg-surface-2 px-3 py-2 text-xs text-slate-10">תוכן</div>
          </TabsContent>
        </Tabs>
      ),
    },
  ],
};
