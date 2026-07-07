/**
 * Co-located doc module for the DropdownMenu primitive
 * (`@/shared/components/ui/dropdown-menu`) — the Radix action menu behind
 * every overflow (⋯) and split-button menu. Meta lives in
 * `registry/manifest.json`.
 */
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Button } from '@/shared/components/ui/button';
import { EllipsisVertical, MapPin, Pencil, Trash2 } from '@/lib/icons/central';
import dropdownMenuSrc from '@/shared/components/ui/dropdown-menu.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

function LayerMenuDemo() {
  const [radar, setRadar] = useState(true);
  const [zones, setZones] = useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">שכבות מפה</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuLabel>שכבות</DropdownMenuLabel>
        <DropdownMenuCheckboxItem checked={radar} onCheckedChange={setRadar}>
          כיסוי מכ״ם
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={zones} onCheckedChange={setZones}>
          אזורים מוגבלים
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const dropdownMenuDoc: ComponentDocModule = {
  id: 'dropdown-menu',
  source: dropdownMenuSrc,
  usage: `import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="פעולות נוספות">
      <EllipsisVertical />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onSelect={centerOnMap}>הצג במפה</DropdownMenuItem>
    <DropdownMenuItem onSelect={rename}>שינוי שם</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onSelect={remove}>מחק</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
  examples: [
    {
      id: 'overflow',
      title: 'Overflow (⋯) menu',
      description:
        'The standard row-overflow grammar: quiet icon trigger, icon-led items, a separator before the destructive action (which reads in the danger tone).',
      render: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="פעולות נוספות">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44">
            <DropdownMenuItem>
              <MapPin size={14} />
              הצג במפה
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil size={14} />
              שינוי שם
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <Trash2 size={14} />
              מחק אזור
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
    {
      id: 'checkbox-items',
      title: 'Checkbox items',
      description: 'DropdownMenuCheckboxItem keeps toggleable state inside the menu — e.g. map layer visibility.',
      code: `<DropdownMenuCheckboxItem checked={radar} onCheckedChange={setRadar}>
  כיסוי מכ״ם
</DropdownMenuCheckboxItem>`,
      render: () => <LayerMenuDemo />,
    },
    {
      id: 'disabled-item',
      title: 'Disabled item',
      description: 'A disabled item dims and is skipped by keyboard navigation.',
      code: `<DropdownMenuItem disabled>ייצוא (בקרוב)</DropdownMenuItem>`,
      render: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">פעולות</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44">
            <DropdownMenuItem>שכפל</DropdownMenuItem>
            <DropdownMenuItem disabled>ייצוא (בקרוב)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ],
};
