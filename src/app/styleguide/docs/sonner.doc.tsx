/**
 * Co-located doc module for the app toast system
 * (`@/shared/components/ui/sonner`) — the vendored sonner Toaster wearing the
 * C2 surface, plus the `toast()` API fired from anywhere. The demo mounts one
 * Toaster locally; in the app it is mounted once at the shell. Meta lives in
 * `registry/manifest.json`.
 */
import { toast } from 'sonner';
import { Toaster } from '@/shared/components/ui/sonner';
import { Button } from '@/shared/components/ui/button';
import sonnerSrc from '@/shared/components/ui/sonner.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const sonnerDoc: ComponentDocModule = {
  id: 'sonner',
  source: sonnerSrc,
  usage: `// Mount once at the app shell:
import { Toaster } from "@/shared/components/ui/sonner"
<Toaster />

// Fire from anywhere:
import { toast } from "sonner"

toast("המטרה נוספה למעקב")
toast.success("הג׳אמר הופעל")
toast.error("החיישן לא מגיב")`,
  examples: [
    {
      id: 'default',
      title: 'Fire a toast',
      description:
        'Toasts stack top-center on the surface-3 fill with the layered ring, follow the live text direction, and expand on hover. Click to try — the buttons call toast() / toast.success() / toast.error().',
      code: `toast("המטרה נוספה למעקב")
toast.success("הג׳אמר הופעל")
toast.error("החיישן לא מגיב")`,
      render: () => (
        <>
          <Toaster />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => toast('המטרה נוספה למעקב')}>
              רגיל
            </Button>
            <Button variant="outline" onClick={() => toast.success('הג׳אמר הופעל')}>
              הצלחה
            </Button>
            <Button variant="outline" onClick={() => toast.error('החיישן לא מגיב')}>
              שגיאה
            </Button>
          </div>
        </>
      ),
    },
    {
      id: 'action',
      title: 'With action & description',
      description:
        'A toast can carry a description line and one action button — the standard undo grammar for reversible operations like deletes.',
      code: `toast("האזור נמחק", {
  description: "אזור מוגבל צפוני",
  action: { label: "ביטול", onClick: restoreZone },
})`,
      render: () => (
        <Button
          variant="outline"
          onClick={() =>
            toast('האזור נמחק', {
              description: 'אזור מוגבל צפוני',
              action: { label: 'ביטול', onClick: () => toast.success('האזור שוחזר') },
            })
          }
        >
          מחיקה עם ביטול
        </Button>
      ),
    },
    {
      id: 'promise',
      title: 'Promise lifecycle',
      description: 'toast.promise tracks an async operation through loading → success/error in one toast.',
      code: `toast.promise(activateJammer(), {
  loading: "מפעיל ג׳אמר…",
  success: "הג׳אמר פעיל",
  error: "ההפעלה נכשלה",
})`,
      render: () => (
        <Button
          variant="outline"
          onClick={() =>
            toast.promise(new Promise((resolve) => window.setTimeout(resolve, 1600)), {
              loading: 'מפעיל ג׳אמר…',
              success: 'הג׳אמר פעיל',
              error: 'ההפעלה נכשלה',
            })
          }
        >
          הפעלה אסינכרונית
        </Button>
      ),
    },
  ],
};
