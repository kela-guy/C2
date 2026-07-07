/**
 * Co-located doc module for the CardActions block — the action bar of a
 * TargetCard, composing ActionButton / SplitActionButton / the confirm
 * pattern. Meta + anatomy live in `registry/manifest.json`.
 */
import { Zap, Camera, Ban, CheckCircle2 } from '@/lib/icons/central';
import { CardActions, CARD_ACTION_GROUP } from '@/primitives';
import cardActionsSrc from '@/primitives/CardActions.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

const noop = () => {};

export const cardActionsDoc: ComponentDocModule = {
  id: 'card-actions',
  source: cardActionsSrc,
  usage: `import { CardActions, CARD_ACTION_GROUP } from "@/primitives"
import { Zap, Camera } from "@/lib/icons/central"

<CardActions
  actions={[
    {
      id: 'jam',
      label: 'שיבוש',
      icon: Zap,
      variant: 'danger',
      group: CARD_ACTION_GROUP.primary,
      onClick: handleJam,
      dropdownActions: [
        { id: 'jam-gps', label: 'שיבוש GPS', onClick: handleJamGps },
        { id: 'jam-rf', label: 'שיבוש RF', onClick: handleJamRf },
      ],
    },
    { id: 'camera', label: 'מצלמה', icon: Camera, group: CARD_ACTION_GROUP.secondary, onClick: handleCamera },
  ]}
/>`,
  examples: [
    {
      id: 'grouped',
      title: 'Primary + secondary groups',
      description:
        'group: "primary" renders full-width split buttons (with a dropdown of sub-options); group: "secondary" lays plain buttons out in an equal-column row underneath.',
      code: `<CardActions
  actions={[
    {
      id: 'jam', label: 'שיבוש', icon: Zap, variant: 'danger',
      group: CARD_ACTION_GROUP.primary, onClick: jam,
      dropdownActions: [
        { id: 'gps', label: 'שיבוש GPS', onClick: jamGps },
        { id: 'rf', label: 'שיבוש RF', onClick: jamRf },
      ],
    },
    { id: 'camera', label: 'מצלמה', icon: Camera, group: CARD_ACTION_GROUP.secondary, onClick: cam },
    { id: 'dismiss', label: 'ביטול', icon: Ban, group: CARD_ACTION_GROUP.secondary, onClick: dismiss },
  ]}
/>`,
      render: () => (
        <div className="w-[320px] rounded bg-surface-2">
          <CardActions
            actions={[
              {
                id: 'jam',
                label: 'שיבוש',
                icon: Zap,
                variant: 'danger',
                group: CARD_ACTION_GROUP.primary,
                onClick: noop,
                dropdownActions: [
                  { id: 'gps', label: 'שיבוש GPS', onClick: noop },
                  { id: 'rf', label: 'שיבוש RF', onClick: noop },
                ],
              },
              { id: 'camera', label: 'מצלמה', icon: Camera, group: CARD_ACTION_GROUP.secondary, onClick: noop },
              { id: 'dismiss', label: 'ביטול', icon: Ban, group: CARD_ACTION_GROUP.secondary, onClick: noop },
            ]}
          />
        </div>
      ),
    },
    {
      id: 'confirm',
      title: 'Inline confirm',
      description:
        'An action with `confirm` opens an inline alertdialog instead of firing immediately; `doubleConfirm: true` adds a second, final step for destructive effectors. Click the button to walk through it.',
      code: `{
  id: 'engage', label: 'הפעלת אפקטור', icon: Zap, variant: 'danger',
  group: CARD_ACTION_GROUP.primary,
  confirm: {
    title: 'להפעיל אפקטור?',
    description: 'הפעולה תשבש את הכלי באופן מיידי.',
    confirmLabel: 'הפעל',
    doubleConfirm: true,
  },
  onClick: engage,
}`,
      render: () => (
        <div className="w-[320px] rounded bg-surface-2">
          <CardActions
            confirmLabel="אישור"
            cancelLabel="ביטול"
            finalConfirmTitle="אישור סופי"
            finalConfirmLabel="הפעל"
            actions={[
              {
                id: 'engage',
                label: 'הפעלת אפקטור',
                icon: Zap,
                variant: 'danger',
                group: CARD_ACTION_GROUP.primary,
                confirm: {
                  title: 'להפעיל אפקטור?',
                  description: 'הפעולה תשבש את הכלי באופן מיידי.',
                  confirmLabel: 'הפעל',
                  doubleConfirm: true,
                },
                onClick: noop,
              },
            ]}
          />
        </div>
      ),
    },
    {
      id: 'status-strip',
      title: 'Status strip',
      description:
        'statusStrip swaps the primary button for a read-only completion pill — the AnimatePresence swap animates the strip in when an engagement completes.',
      code: `{
  id: 'jam',
  label: 'שיבוש',
  group: CARD_ACTION_GROUP.primary,
  onClick: noop,
  statusStrip: { label: 'השיבוש הושלם', icon: CheckCircle2, tone: 'success' },
}`,
      render: () => (
        <div className="w-[320px] rounded bg-surface-2">
          <CardActions
            actions={[
              {
                id: 'jam',
                label: 'שיבוש',
                group: CARD_ACTION_GROUP.primary,
                onClick: noop,
                statusStrip: { label: 'השיבוש הושלם', icon: CheckCircle2, tone: 'success' },
              },
              { id: 'camera', label: 'מצלמה', icon: Camera, group: CARD_ACTION_GROUP.secondary, onClick: noop },
              { id: 'close', label: 'סגירה', icon: CheckCircle2, group: CARD_ACTION_GROUP.secondary, onClick: noop },
            ]}
          />
        </div>
      ),
    },
    {
      id: 'toggle',
      title: 'Camera toggle action',
      description:
        'An action with `toggle` renders as a CameraToggleButton — one control that flips between point-camera and stop-tracking.',
      code: `{
  id: 'track', label: 'מצלמה',
  group: CARD_ACTION_GROUP.secondary,
  toggle: { on: false, offLabel: 'הפנה מצלמה', onLabel: 'עוקב' },
  onClick: toggleTracking,
}`,
      render: () => (
        <div className="w-[320px] rounded bg-surface-2">
          <CardActions
            actions={[
              {
                id: 'track',
                label: 'מצלמה',
                group: CARD_ACTION_GROUP.secondary,
                toggle: { on: false, offLabel: 'הפנה מצלמה', onLabel: 'עוקב', offIcon: Camera },
                onClick: noop,
              },
              {
                id: 'track-on',
                label: 'מצלמה',
                group: CARD_ACTION_GROUP.secondary,
                toggle: { on: true, offLabel: 'הפנה מצלמה', onLabel: 'עוקב', onIcon: Camera },
                onClick: noop,
              },
            ]}
          />
        </div>
      ),
    },
  ],
};
