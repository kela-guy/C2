/**
 * Co-located doc module for the Dialog primitive
 * (`@/shared/components/ui/dialog`) — the Radix modal for confirmations and
 * focused edit tasks. Meta lives in `registry/manifest.json`.
 */
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import dialogSrc from '@/shared/components/ui/dialog.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const dialogDoc: ComponentDocModule = {
  id: 'dialog',
  source: dialogSrc,
  usage: `import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button variant="destructive">נטרל מטרה</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>נטרול מטרה T-042</DialogTitle>
      <DialogDescription>הפעולה תפעיל את האפקטור הנבחר. לא ניתן לבטל.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="destructive" onClick={confirm}>אשר נטרול</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
  examples: [
    {
      id: 'confirm',
      title: 'Destructive confirmation',
      description:
        'The canonical use: an irreversible engagement action gets a modal pause. The backdrop dims the app, focus is trapped, Esc / backdrop / the close button dismiss.',
      render: () => (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive">נטרל מטרה</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>נטרול מטרה T-042</DialogTitle>
              <DialogDescription>
                הפעולה תפעיל את האפקטור הנבחר נגד המטרה. לא ניתן לבטל לאחר האישור.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">ביטול</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive">אשר נטרול</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
    },
    {
      id: 'form',
      title: 'Focused edit task',
      description: 'A small form in a modal — rename a zone without leaving the map context.',
      code: `<DialogContent>
  <DialogHeader>
    <DialogTitle>שינוי שם אזור</DialogTitle>
  </DialogHeader>
  <div className="flex flex-col gap-2">
    <Label htmlFor="zone-name">שם האזור</Label>
    <Input id="zone-name" defaultValue="אזור מוגבל צפוני" />
  </div>
  <DialogFooter>
    <Button onClick={save}>שמור</Button>
  </DialogFooter>
</DialogContent>`,
      render: () => (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">שינוי שם אזור</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>שינוי שם אזור</DialogTitle>
              <DialogDescription>השם יופיע על המפה ובכל ההתראות.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="zone-name">שם האזור</Label>
              <Input id="zone-name" defaultValue="אזור מוגבל צפוני" />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button>שמור</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
    },
  ],
};
