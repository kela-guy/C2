/**
 * Co-located doc module for the Badge concept. Documents the generic
 * primitive (`@/shared/components/ui/badge`) wearing the C2 design —
 * translucent colored fills and layered white opacities on the dark
 * control-room surface — plus every status/indicator chip and dot built on
 * the same `badgeVariants` cva: StatusChip (Badge + activity tone classes),
 * HealthBadge (Badge compressed to the devices-panel chip grammar),
 * ActivityTimestampChip (badgeVariants ghost + tone dot + monospace
 * timestamp), and NewUpdatesPill (Badge asChild on a real button — a
 * floating count pill). StatusDot stays a styled span (it is a dot, not a
 * badge). This doc is the single home for all of them. Meta lives in
 * `registry/manifest.json`.
 */
import { BadgeCheck } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import {
  ActivityTimestampChip,
  HealthBadge,
  HEALTH_TEXT_CLASS,
  NewUpdatesPill,
  StatusChip,
  StatusDot,
  type HealthTone,
} from '@/primitives';
import badgeSrc from '@/shared/components/ui/badge.tsx?raw';
import statusChipSrc from '@/primitives/StatusChip.tsx?raw';
import healthStatusSrc from '@/primitives/HealthStatus.tsx?raw';
import activityTimestampChipSrc from '@/primitives/ActivityTimestampChip.tsx?raw';
import newUpdatesPillSrc from '@/primitives/NewUpdatesPill.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

const HEALTH_TONES: HealthTone[] = ['ok', 'error'];

const HEALTH_TONE_LABEL: Record<HealthTone, string> = {
  ok: 'OK',
  error: 'Error',
};

export const badgeDoc: ComponentDocModule = {
  id: 'badge',
  source: badgeSrc,
  usage: `import { Badge } from "@/components/ui/badge"

<Badge>New</Badge>
<Badge variant="secondary">Beta</Badge>
<Badge variant="destructive">Error</Badge>`,
  examples: [
    {
      id: 'variants',
      title: 'Variants',
      description:
        'Six surface treatments. Destructive uses a translucent red fill so it reads correctly on the dark surface; outline is a layered ring, not a hard border.',
      code: `<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="ghost">Ghost</Badge>
<Badge variant="link">Link</Badge>`,
      render: () => (
        <div dir="ltr" className="flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="ghost">Ghost</Badge>
          <Badge variant="link">Link</Badge>
        </div>
      ),
    },
    {
      id: 'with-icon',
      title: 'With icon',
      description: 'A leading icon sizes to 12px and tucks against the inline-start padding automatically.',
      code: `<Badge variant="secondary">
  <BadgeCheck data-icon="inline-start" />
  Verified
</Badge>`,
      render: () => (
        <div dir="ltr" className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">
            <BadgeCheck data-icon="inline-start" />
            Verified
          </Badge>
          <Badge>
            <BadgeCheck data-icon="inline-start" />
            Active
          </Badge>
        </div>
      ),
    },
    {
      id: 'status-chip',
      title: 'Domain variant: StatusChip',
      description:
        'The target-activity chip — this Badge wearing four semantic tones mapped through STATUS_CHIP_COLORS onto the palette accent tints: green (active/resolved), red (threat/critical), orange (warning/recently active), gray (expired/dismissed). Geometry and typography come from badgeVariants; only the tone classes ride on top. It is the standard status slot content for CardHeader and stays a single truncating line.',
      code: `import { StatusChip } from "@/primitives"

<StatusChip label="פעיל" color="green" />
<StatusChip label="איום" color="red" />
<StatusChip label="פעיל לאחרונה" color="orange" />
<StatusChip label="פג תוקף" color="gray" />`,
      render: () => (
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip label="פעיל" color="green" />
          <StatusChip label="איום" color="red" />
          <StatusChip label="פעיל לאחרונה" color="orange" />
          <StatusChip label="פג תוקף" color="gray" />
        </div>
      ),
    },
    {
      id: 'health-status',
      title: 'Domain variant: HealthStatus (StatusDot / HealthBadge)',
      description:
        'The canonical health tone vocabulary — binary ok / error mapped once onto palette tokens. The cause of an error (offline, low battery, malfunction) is text, never its own tone. StatusDot is the smallest unit (a styled span with a vivid accent fill where the color IS the signal). HealthBadge is this Badge compressed into the devices-panel chip grammar (16px tall, 2px corner) with the tone classes on top. Always pair a dot with a textual label or aria-label.',
      code: `import { StatusDot, HealthBadge, HEALTH_TEXT_CLASS } from "@/primitives"

<StatusDot tone="ok" />
<HealthBadge tone="error">3 שגיאות</HealthBadge>
<span className={HEALTH_TEXT_CLASS.error}>סוללה 18%</span>`,
      render: () => (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-6">
            {HEALTH_TONES.map((tone) => (
              <div key={tone} className="flex items-center gap-2">
                <StatusDot tone={tone} />
                <span className="text-xs text-slate-11">{HEALTH_TONE_LABEL[tone]}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <HealthBadge tone="error">3 שגיאות</HealthBadge>
            <HealthBadge tone="error">מנותק</HealthBadge>
            <HealthBadge tone="ok">מחובר</HealthBadge>
          </div>
        </div>
      ),
    },
    {
      id: 'health-text',
      title: 'HealthStatus: toned text via HEALTH_TEXT_CLASS',
      description:
        'Standalone labels and telemetry values compose from the exported class records instead of re-declaring emerald/red/amber at the call site.',
      code: `<span className={HEALTH_TEXT_CLASS.error}>חיישן מנותק</span>
<span className={HEALTH_TEXT_CLASS.ok}>כל המערכות תקינות</span>`,
      render: () => (
        <div className="flex flex-col items-start gap-1.5 text-xs font-medium">
          <span className={HEALTH_TEXT_CLASS.error}>חיישן מנותק</span>
          <span className={HEALTH_TEXT_CLASS.ok}>כל המערכות תקינות</span>
        </div>
      ),
    },
    {
      id: 'activity-timestamp-chip',
      title: 'Domain variant: ActivityTimestampChip',
      description:
        'Activity + time in one chip for the card-header status slot: badgeVariants (ghost, so no fill) flattened to a status-colored dot (same tone vocabulary as StatusChip) beside a monospace timestamp. The status word stays available on hover (tooltip) and to assistive tech (aria-label), so color is never the only carrier of meaning.',
      code: `import { ActivityTimestampChip } from "@/primitives"

<ActivityTimestampChip
  timestamp="00:14:10"
  color="green"
  statusLabel="פעיל"
  hoverLabel="לפני פחות מדקה"
/>`,
      render: () => (
        <div className="flex flex-wrap items-center gap-6">
          <ActivityTimestampChip timestamp="00:14:10" color="green" statusLabel="פעיל" />
          <ActivityTimestampChip timestamp="00:11:42" color="orange" statusLabel="פעיל לאחרונה" />
          <ActivityTimestampChip timestamp="23:58:05" color="red" statusLabel="איום" />
          <ActivityTimestampChip timestamp="21:14:33" color="gray" statusLabel="פג תוקף" />
        </div>
      ),
    },
    {
      id: 'new-updates',
      title: 'Domain variant: NewUpdatesPill',
      description:
        'A floating count pill surfacing new incoming detections above a list — this Badge rendered asChild onto a real button, with the pill geometry and accent surface layered on top. Enters with a soft drop (respects reduced motion); pass a label formatter for locale text and clamping.',
      code: `import { NewUpdatesPill } from "@/primitives"

<NewUpdatesPill count={3} onClick={scrollToTop} />
<NewUpdatesPill count={12} label={(n) => \`\${n} עדכונים\`} onClick={scrollToTop} />`,
      render: () => (
        <div className="flex flex-col items-center gap-3">
          <NewUpdatesPill count={3} onClick={() => {}} />
          <NewUpdatesPill count={12} label={(n) => `${n} עדכונים`} onClick={() => {}} />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-label',
      label: 'Long label',
      note: 'Constrained by a narrow parent the badge keeps its single line and truncates with an ellipsis rather than overflowing.',
      render: () => (
        <div dir="ltr" className="w-[160px]">
          <Badge className="max-w-full">
            <span className="truncate">A very long status label that overflows</span>
          </Badge>
        </div>
      ),
    },
    {
      id: 'numeric',
      label: 'Numeric / count',
      note: 'Counts use tabular figures (inherited from the grid) so stacked badges stay aligned.',
      render: () => (
        <div dir="ltr" className="flex flex-col items-center gap-2">
          <Badge variant="secondary">128</Badge>
          <Badge variant="secondary">007</Badge>
        </div>
      ),
    },
    {
      id: 'as-link',
      label: 'As link (asChild)',
      note: 'With asChild the styling is applied onto a child anchor via Radix Slot, so a badge can be a real, focusable link.',
      render: () => (
        <div dir="ltr">
          <Badge asChild variant="outline">
            <a href="#badge">Docs ↗</a>
          </Badge>
        </div>
      ),
    },
    {
      id: 'status-chip-long',
      label: 'StatusChip: long label',
      note: 'The chip stays a single line — an over-long label truncates with an ellipsis inside max-w-full instead of wrapping or overflowing.',
      render: () => (
        <div className="w-[140px]">
          <StatusChip label="סטטוס ארוך במיוחד שנחתך עם שלוש נקודות" color="orange" />
        </div>
      ),
    },
    {
      id: 'health-dot-in-row',
      label: 'StatusDot: inside a row',
      note: 'The dot is aria-hidden — the row text carries the meaning. Never ship a color-only signal.',
      render: () => (
        <div className="flex items-center gap-2 rounded bg-surface-2 px-3 py-2 text-xs text-slate-11">
          <StatusDot tone="error" />
          <span>מצלמה צפונית — אות חלש</span>
        </div>
      ),
    },
    {
      id: 'health-badge-numeric',
      label: 'HealthBadge: numeric alignment',
      note: 'tabular-nums keeps stacked counts vertically aligned regardless of digits.',
      render: () => (
        <div className="flex flex-col items-start gap-1.5">
          <HealthBadge tone="error">3</HealthBadge>
          <HealthBadge tone="error">12</HealthBadge>
          <HealthBadge tone="error">147</HealthBadge>
        </div>
      ),
    },
    {
      id: 'timestamp-no-time',
      label: 'ActivityTimestampChip: no timestamp',
      note: 'Without a timestamp the chip falls back to rendering the status word itself, so the slot never goes empty.',
      render: () => <ActivityTimestampChip color="orange" statusLabel="פעיל לאחרונה" />,
    },
    {
      id: 'pill-large-count',
      label: 'NewUpdatesPill: large count',
      note: 'No built-in clamp — use the label formatter to cap (e.g. 99+) so the pill stays compact. It also renders on count={0}; callers gate on count > 0.',
      render: () => (
        <div className="flex flex-col items-center gap-2">
          <NewUpdatesPill count={1284} onClick={() => {}} />
          <NewUpdatesPill count={1284} label={(n) => `${n > 99 ? '99+' : n} new`} onClick={() => {}} />
        </div>
      ),
    },
  ],
  relatedFiles: [
    { file: 'src/primitives/StatusChip.tsx', code: statusChipSrc },
    { file: 'src/primitives/HealthStatus.tsx', code: healthStatusSrc },
    { file: 'src/primitives/ActivityTimestampChip.tsx', code: activityTimestampChipSrc },
    { file: 'src/primitives/NewUpdatesPill.tsx', code: newUpdatesPillSrc },
  ],
};
