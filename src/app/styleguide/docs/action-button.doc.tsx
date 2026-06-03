/**
 * Co-located doc module for ActionButton — now a back-compat *preset* of the
 * base Button (see `button.doc.tsx`). It renders the base Button with the
 * legacy `action-button` handoff stamp so existing card action rows and
 * toolbars keep deep-linking correctly. New code should import `Button`.
 *
 * The full variant/size/state matrix lives on the Button doc; this page just
 * shows the preset in context and points up to its parent.
 */
import { Crosshair } from '@/lib/icons/central';
import { ActionButton } from '@/primitives';
import actionButtonSrc from '@/primitives/ActionButton.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const actionButtonDoc: ComponentDocModule = {
  id: 'action-button',
  source: actionButtonSrc,
  usage: `import { ActionButton } from "@/primitives"
import { Crosshair } from "@/lib/icons/central"

// Equivalent to <Button … dataHandoff="action-button" />
<ActionButton label="Track" icon={Crosshair} variant="fill" onClick={handleTrack} />`,
  examples: [
    {
      id: 'preset',
      title: 'Preset of Button',
      description: 'ActionButton forwards every prop to the base Button and only overrides the handoff stamp. It supports the same variants, sizes, and states — see the Button doc for the full matrix.',
      code: `<ActionButton label="Track" icon={Crosshair} />`,
      render: () => (
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton label="Track" icon={Crosshair} />
          <ActionButton label="Ghost" variant="ghost" />
          <ActionButton label="Working" loading />
        </div>
      ),
    },
  ],
};
