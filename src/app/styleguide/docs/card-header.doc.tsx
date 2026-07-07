/**
 * Co-located doc module for the CardHeader block — the top row of a
 * TargetCard. Meta + anatomy live in `registry/manifest.json`.
 */
import { Crosshair, Camera } from '@/lib/icons/central';
import { CardHeader, StatusChip, ActivityTimestampChip } from '@/primitives';
import { DroneCardIcon } from '@/primitives/MapIcons';
import cardHeaderSrc from '@/primitives/CardHeader.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

function HeaderFrame({ children }: { children: React.ReactNode }) {
  return <div className="w-[340px] rounded bg-surface-2 px-3 py-2">{children}</div>;
}

export const cardHeaderDoc: ComponentDocModule = {
  id: 'card-header',
  source: cardHeaderSrc,
  usage: `import { CardHeader, StatusChip } from "@/primitives"
import { Crosshair } from "@/lib/icons/central"

<CardHeader
  icon={Crosshair}
  title="DJI Mavic 3"
  subtitle="רחפן מסחרי"
  status={<StatusChip label="פעיל" color="green" />}
  open={open}
/>`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description:
        'Icon box, title + monospace subtitle, status chip, and the chevron. `open` rotates the chevron 180° — the header itself is presentation-only; TargetCard owns the toggle.',
      code: `<CardHeader
  icon={Crosshair}
  title="DJI Mavic 3"
  subtitle="רחפן מסחרי"
  status={<StatusChip label="פעיל" color="green" />}
/>`,
      render: () => (
        <HeaderFrame>
          <CardHeader
            icon={Crosshair}
            title="DJI Mavic 3"
            subtitle="רחפן מסחרי"
            status={<StatusChip label="פעיל" color="green" />}
          />
        </HeaderFrame>
      ),
    },
    {
      id: 'affiliation',
      title: 'Affiliation tint',
      description:
        'With `affiliation` the icon box tints by IFF palette (hostile red, possible-threat orange) and gains a localized tooltip + aria-label. friendly / neutral keep the neutral surface so a white glyph never disappears.',
      code: `<CardHeader icon={DroneCardIcon} title="מזל״ט עוין" affiliation="hostile" … />
<CardHeader icon={DroneCardIcon} title="איום אפשרי" affiliation="possibleThreat" … />
<CardHeader icon={DroneCardIcon} title="כוח ידידותי" affiliation="friendly" … />`,
      render: () => (
        <div className="flex w-[340px] flex-col gap-2">
          <HeaderFrame>
            <CardHeader
              icon={DroneCardIcon}
              title="מזל״ט עוין"
              subtitle="TRK-4471"
              affiliation="hostile"
              status={<StatusChip label="איום" color="red" />}
            />
          </HeaderFrame>
          <HeaderFrame>
            <CardHeader
              icon={DroneCardIcon}
              title="איום אפשרי"
              subtitle="TRK-4472"
              affiliation="possibleThreat"
              status={<StatusChip label="פעיל לאחרונה" color="orange" />}
            />
          </HeaderFrame>
          <HeaderFrame>
            <CardHeader
              icon={DroneCardIcon}
              title="כוח ידידותי"
              subtitle="UAV-07"
              affiliation="friendly"
              status={<StatusChip label="פעיל" color="green" />}
            />
          </HeaderFrame>
        </div>
      ),
    },
    {
      id: 'timestamp-status',
      title: 'Activity timestamp in the status slot',
      description:
        'The status slot takes any node — the production cards pass an ActivityTimestampChip so activity tone + detection time read as one element.',
      code: `<CardHeader
  icon={Crosshair}
  title="רחפן לא מזוהה"
  status={
    <ActivityTimestampChip
      timestamp="00:14:10"
      color="green"
      statusLabel="פעיל"
    />
  }
/>`,
      render: () => (
        <HeaderFrame>
          <CardHeader
            icon={Crosshair}
            title="רחפן לא מזוהה"
            subtitle="TRK-9921"
            status={<ActivityTimestampChip timestamp="00:14:10" color="green" statusLabel="פעיל" />}
          />
        </HeaderFrame>
      ),
    },
    {
      id: 'quick-action',
      title: 'Collapsed quick action',
      description:
        'quickAction renders only while the card is collapsed (open=false) and swallows clicks so it never toggles the card — used for one-tap camera slew from the list.',
      code: `<CardHeader
  icon={Crosshair}
  title="DJI Mavic 3"
  open={false}
  quickAction={<button aria-label="הפנה מצלמה">…</button>}
/>`,
      render: () => (
        <HeaderFrame>
          <CardHeader
            icon={Crosshair}
            title="DJI Mavic 3"
            subtitle="רחפן מסחרי"
            open={false}
            status={<StatusChip label="פעיל" color="green" />}
            quickAction={
              <button
                type="button"
                aria-label="הפנה מצלמה"
                className="flex size-6 items-center justify-center rounded bg-state-hover-overlay text-slate-11 transition-colors hover:bg-state-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
              >
                <Camera size={13} aria-hidden="true" />
              </button>
            }
          />
        </HeaderFrame>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-title',
      label: 'Long title + subtitle',
      note: 'Both truncate inside min-w-0 so the status cluster and chevron never get pushed out of the row.',
      render: () => (
        <div className="w-[260px] rounded bg-surface-2 px-3 py-2">
          <CardHeader
            icon={Crosshair}
            title="רחפן לא מזוהה בגזרה הצפונית ליד קו הגבול"
            subtitle="TRK-4471-ALPHA-LONG-IDENTIFIER"
            status={<StatusChip label="פעיל" color="green" />}
          />
        </div>
      ),
    },
    {
      id: 'no-icon',
      label: 'No icon',
      note: 'The icon box is optional; the text block starts at the inline-start edge.',
      render: () => (
        <div className="w-[260px] rounded bg-surface-2 px-3 py-2">
          <CardHeader title="אירוע ללא אייקון" subtitle="EVT-102" />
        </div>
      ),
    },
  ],
};
