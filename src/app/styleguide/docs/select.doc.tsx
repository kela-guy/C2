/**
 * Co-located doc module for the Select primitive
 * (`@/shared/components/ui/select`) — the Radix dropdown picker whose trigger
 * reads like an Input and whose panel floats on the overlay surface. Meta
 * lives in `registry/manifest.json`.
 */
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import selectSrc from '@/shared/components/ui/select.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const selectDoc: ComponentDocModule = {
  id: 'select',
  source: selectSrc,
  usage: `import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"

<Select value={sector} onValueChange={setSector}>
  <SelectTrigger className="w-44">
    <SelectValue placeholder="בחר גזרה" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="north">גזרה צפונית</SelectItem>
    <SelectItem value="south">גזרה דרומית</SelectItem>
  </SelectContent>
</Select>`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description:
        'The trigger shares Input\'s surface; the panel floats with the overlay motion and check-marks the selected item.',
      code: `<Select defaultValue="north">
  <SelectTrigger className="w-44">
    <SelectValue placeholder="בחר גזרה" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="north">גזרה צפונית</SelectItem>
    <SelectItem value="south">גזרה דרומית</SelectItem>
    <SelectItem value="east">גזרה מזרחית</SelectItem>
  </SelectContent>
</Select>`,
      render: () => (
        <Select defaultValue="north">
          <SelectTrigger className="w-44">
            <SelectValue placeholder="בחר גזרה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="north">גזרה צפונית</SelectItem>
            <SelectItem value="south">גזרה דרומית</SelectItem>
            <SelectItem value="east">גזרה מזרחית</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'groups',
      title: 'Grouped options',
      description: 'SelectGroup + SelectLabel section a long list — e.g. effectors grouped by kind.',
      code: `<Select>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="בחר אפקטור" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>שיבוש</SelectLabel>
      <SelectItem value="rf">ג׳אמר RF</SelectItem>
      <SelectItem value="gps">ג׳אמר GPS</SelectItem>
    </SelectGroup>
    <SelectGroup>
      <SelectLabel>קינטי</SelectLabel>
      <SelectItem value="net">לוכד רשת</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>`,
      render: () => (
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="בחר אפקטור" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>שיבוש</SelectLabel>
              <SelectItem value="rf">ג׳אמר RF</SelectItem>
              <SelectItem value="gps">ג׳אמר GPS</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>קינטי</SelectLabel>
              <SelectItem value="net">לוכד רשת</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'disabled',
      title: 'Disabled control & item',
      description: 'The whole control or a single option can disable independently.',
      code: `<Select disabled>…</Select>
<SelectItem value="net" disabled>לוכד רשת (לא זמין)</SelectItem>`,
      render: () => (
        <div className="flex flex-wrap items-center gap-3">
          <Select disabled>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="לא זמין" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="x">—</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="בחר אפקטור" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rf">ג׳אמר RF</SelectItem>
              <SelectItem value="net" disabled>
                לוכד רשת (לא זמין)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-option',
      label: 'Long option label',
      note: 'The trigger truncates the selected value with line-clamp-1; the panel grows to fit its widest item.',
      render: () => (
        <Select defaultValue="long">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="long">מצלמה תרמית צפונית — עמדה 4, מאגר עליון</SelectItem>
            <SelectItem value="short">מכ״ם</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
  ],
};
