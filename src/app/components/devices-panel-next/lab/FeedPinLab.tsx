/**
 * `/devices-lab` feed-pin study — copy/labeling options for the action that
 * adds a device's camera stream into the video feed (and removes it once
 * added). The shipped label "Watch video / Watching" reads as passive
 * monitoring; this action is really a pin: it places the live stream into a
 * feed slot, so the on-state should offer to take it back out.
 *
 * Five variants share one visual treatment (the neutral `DeviceAction` pill,
 * lit white while in the feed) and differ only in wording + glyph. Two
 * constraints drive the copy here:
 *   - Filled glyphs (the circle-plus/check/minus + filled pin) so the action
 *     reads as a solid, committed control rather than a thin outline.
 *   - The button width must not change between states, so each pairing uses
 *     near-equal-length copy and the button carries a `min-w` floor sized to
 *     the longest label — both states therefore render at the same width.
 *
 * Sandbox-only: the winner's copy folds into `presentationRules.tsx`
 * (`watchVideo`) and, eventually, the real `pinToFeed` / `unpinFromFeed`
 * strings.
 */

import { useState, type ReactNode } from 'react';
import {
  CirclePlusFilled as IconCirclePlus,
  CircleCheckFilled as IconCircleCheck,
  CircleMinusFilled as IconCircleMinus,
  EyeFilled as IconEyeOpen,
  EyeOffFilled as IconEyeClosed,
  PinFilled,
} from '@/lib/icons/central';
import { cn } from '../../ui/utils';
import { WatchStreamIcon } from '../../devices-panel/icons';

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-xs font-medium text-white/80">{title}</div>
        {note && <div className="mt-0.5 text-xs-plus leading-snug text-white/40">{note}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-x-10 gap-y-6 rounded-md border border-white/[0.06] bg-surface-2 p-4">
        {children}
      </div>
    </div>
  );
}

function Cell({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2">
      {children}
      <span className="text-2xs leading-tight text-white/45">{caption}</span>
    </div>
  );
}

const ICON = 12;

/** One add/remove copy pairing. The only thing that varies between variants. */
interface FeedCopy {
  offIcon: ReactNode;
  offLabel: string;
  onIcon: ReactNode;
  onLabel: string;
}

interface FeedPinButtonProps {
  copy: FeedCopy;
  inFeed: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * Matches the shipped footer action (`DeviceAction`, neutral tone): a solid
 * idle pill that lights white while the stream is in the feed. `aria-pressed`
 * carries the in-feed state for assistive tech. The `min-w` floor (sized to
 * the longest label in the set) plus centered content keeps the width fixed
 * across the off/on swap, so the pill never reflows.
 */
function FeedPinButton({ copy, inFeed, onToggle, disabled }: FeedPinButtonProps) {
  const icon = inFeed ? copy.onIcon : copy.offIcon;
  const label = inFeed ? copy.onLabel : copy.offLabel;
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={inFeed}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium',
        'min-w-[7.5rem]',
        'transition-[background-color,color,transform] duration-150 ease-out',
        'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        inFeed
          ? 'text-white bg-white/15 hover:bg-white/20'
          : 'text-white/70 bg-white/[0.06] hover:bg-state-hover-overlay hover:text-white/90',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

const OPTIONS: { id: string; title: string; note: string; copy: FeedCopy }[] = [
  {
    id: 'add-infeed',
    title: 'Option 1 — Add / In the feed',
    note: 'Plain action then a status confirmation, both 11 chars. Filled circle-plus -> circle-check.',
    copy: {
      offIcon: <IconCirclePlus size={ICON} />,
      offLabel: 'Add to feed',
      onIcon: <IconCircleCheck size={ICON} />,
      onLabel: 'In the feed',
    },
  },
  {
    id: 'add-remove',
    title: 'Option 2 — Add / Remove',
    note: 'Symmetric verbs, both 11 chars — the on-state explicitly offers the reverse action. Filled circle-plus -> circle-minus.',
    copy: {
      offIcon: <IconCirclePlus size={ICON} />,
      offLabel: 'Add to feed',
      onIcon: <IconCircleMinus size={ICON} />,
      onLabel: 'Remove feed',
    },
  },
  {
    id: 'pin-unpin',
    title: 'Option 3 — Pin / Unpin',
    note: 'Pin metaphor matching the code naming (pinToFeed / unpinFromFeed); 11 vs 10 chars. Filled pin in both states.',
    copy: {
      offIcon: <PinFilled size={ICON} />,
      offLabel: 'Pin to feed',
      onIcon: <PinFilled size={ICON} />,
      onLabel: 'Unpin feed',
    },
  },
  {
    id: 'send-infeed',
    title: 'Option 4 — Send / In the feed',
    note: 'Keeps the filled stream glyph and frames it as routing the stream to the feed; status confirm on.',
    copy: {
      offIcon: <WatchStreamIcon size={ICON} />,
      offLabel: 'Send to feed',
      onIcon: <IconCircleCheck size={ICON} />,
      onLabel: 'In the feed',
    },
  },
  {
    id: 'show-hide',
    title: 'Option 5 — Show / Hide',
    note: 'Visibility metaphor, both 9 chars. Filled eye open -> eye closed.',
    copy: {
      offIcon: <IconEyeOpen size={ICON} />,
      offLabel: 'Show feed',
      onIcon: <IconEyeClosed size={ICON} />,
      onLabel: 'Hide feed',
    },
  },
];

/** One variant: a live button starting not-in-feed beside one starting in-feed. */
function OptionRow({ copy }: { copy: FeedCopy }) {
  const [aIn, setAIn] = useState(false);
  const [bIn, setBIn] = useState(true);
  return (
    <>
      <Cell caption="Not in feed → click to add">
        <FeedPinButton copy={copy} inFeed={aIn} onToggle={() => setAIn((v) => !v)} />
      </Cell>
      <Cell caption="In feed → click to remove">
        <FeedPinButton copy={copy} inFeed={bIn} onToggle={() => setBIn((v) => !v)} />
      </Cell>
    </>
  );
}

export function FeedPinLab() {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-semibold text-white/90">Add to feed — button copy options</h2>
        <p className="mt-1 text-xs text-white/45">
          Five wording + glyph pairings for the action that pins a device's camera stream into the video
          feed. All share the shipped neutral pill (lit white while in the feed) with filled glyphs and a
          fixed min-width, so the button never changes size between states. Each is shown not-in-feed and
          in-feed — click to toggle.
        </p>
      </div>

      {OPTIONS.map((opt) => (
        <Group key={opt.id} title={opt.title} note={opt.note}>
          <OptionRow copy={opt.copy} />
        </Group>
      ))}

      <Group title="Disabled" note="Option 2 when the stream is unavailable (offline) — non-interactive and dimmed, in both states.">
        <Cell caption="Not in feed · disabled">
          <FeedPinButton copy={OPTIONS[1].copy} inFeed={false} onToggle={() => {}} disabled />
        </Cell>
        <Cell caption="In feed · disabled">
          <FeedPinButton copy={OPTIONS[1].copy} inFeed onToggle={() => {}} disabled />
        </Cell>
      </Group>
    </section>
  );
}
