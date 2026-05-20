/**
 * Dev-only card design sandbox at `/card-sandbox`.
 *
 * The trick: re-scope `--surface-N` (and `--shadow-3`) on the
 * preview root via inline custom-property overrides. Every
 * `bg-surface-N` utility inside resolves through the Tailwind
 * `@theme` chain (`--color-surface-N → --surface-N`), so the real
 * `TargetCard` + `AccordionSection` + slot primitives pick up the
 * dialled values without any prop plumbing or fork.
 *
 * Bake-back workflow: tune sliders → `Export.copyConfig` action
 * pastes a JSON snapshot to clipboard → hand-port surface numbers
 * to `bg-surface-N` classNames in `TargetCard.tsx` /
 * `AccordionSection.tsx`.
 */

import { useMemo, useRef, type CSSProperties } from 'react';
import { useDialKit } from 'dialkit';
import {
  TargetCard,
  CardHeader,
  CardDetails,
  CardSensors,
  CardLog,
  CardActions,
  CardClosure,
  AccordionSection,
  StatusChip,
  type ThreatAccent,
  type DetailRow,
  type LogEntry,
} from '@/primitives';
import { Radar } from '@/lib/icons/central';
import { accentHex } from '@/primitives/accentHex';
import { formatClock, formatDuration } from '@/app/components/track-history/time';
import { formatUtm } from '@/lib/geo/utm';
import {
  firstSnapshot,
  lastSnapshot,
  peakConfidence,
  sampleAt,
  type HistoricalTrack,
  type TrackSnapshot,
} from '@/app/components/track-history/types';
import { DroneCardIcon } from '@/primitives/MapIcons';
import { historyTrack, liveFixture, type SandboxVariant } from './fixture';

type ShadowLevel = '1' | '2' | '3' | '4' | '5';

interface SandboxParams {
  Surfaces: {
    shell: number;
    content: number;
    sectionBody: number;
    panelBg: number;
  };
  Chrome: {
    shadowLevel: string;
  };
  State: {
    open: boolean;
    completed: boolean;
    accent: string;
    variant: string;
    stack: boolean;
  };
  Compare: {
    splitView: boolean;
  };
}

const ACCENT_OPTIONS: ThreatAccent[] = [
  'idle',
  'suspicion',
  'detection',
  'tracking',
  'mitigating',
  'active',
  'resolved',
  'expired',
];

export default function CardDesignSandbox() {
  const params = useDialKitConfig();
  const now = useNow();
  const track = useMemo(() => historyTrack(now), [now]);

  const variant = params.State.variant as SandboxVariant;
  const accent = params.State.accent as ThreatAccent;

  const scopeStyle = scopedSurfaces({
    shell: params.Surfaces.shell,
    content: params.Surfaces.content,
    sectionBody: params.Surfaces.sectionBody,
    shadowLevel: params.Chrome.shadowLevel as ShadowLevel,
  });

  const panelBgVar = `var(--surface-${params.Surfaces.panelBg})`;

  const previewProps = {
    variant,
    open: params.State.open,
    completed: params.State.completed,
    accent,
    track,
    stack: params.State.stack,
  };

  return (
    <div className="min-h-screen w-full text-slate-12" dir="rtl" style={{ backgroundColor: panelBgVar }}>
      <PageHeader />

      <div className="grid h-[calc(100vh-44px)] gap-px bg-border-subtle"
           style={params.Compare.splitView
             ? { gridTemplateColumns: '1fr 1fr' }
             : { gridTemplateColumns: '1fr' }}>
        <PreviewColumn label="dialled" scopeStyle={scopeStyle} {...previewProps} />
        {params.Compare.splitView && (
          <PreviewColumn label="palette defaults" scopeStyle={undefined} {...previewProps} />
        )}
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="flex h-[44px] items-center gap-3 border-b border-border-subtle px-4 text-[12px]">
      <span className="font-mono text-slate-9">/card-sandbox</span>
      <span className="text-slate-11">Card design sandbox</span>
      <span className="ms-auto text-slate-9">Open the DialKit panel to tune the surface ladder.</span>
    </header>
  );
}

function PreviewColumn({
  label,
  scopeStyle,
  variant,
  open,
  completed,
  accent,
  track,
  stack,
}: {
  label: string;
  scopeStyle: CSSProperties | undefined;
  variant: SandboxVariant;
  open: boolean;
  completed: boolean;
  accent: ThreatAccent;
  track: HistoricalTrack;
  stack: boolean;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden" style={scopeStyle}>
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-9">
        <span>{label}</span>
        {scopeStyle && <span className="font-mono normal-case text-slate-10">scoped vars active</span>}
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-1">
        <div className="mx-auto w-[400px] px-3 py-6">
          {variant === 'history' ? (
            <HistoryPreview track={track} open={open} completed={completed} accent={accent} stack={stack} />
          ) : (
            <LivePreview open={open} completed={completed} accent={accent} stack={stack} />
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryPreview({
  track,
  open,
  completed,
  accent,
  stack,
}: {
  track: HistoricalTrack;
  open: boolean;
  completed: boolean;
  accent: ThreatAccent;
  stack: boolean;
}) {
  const snap = sampleAt(track, track.durationMs / 2);
  const start = firstSnapshot(track);
  const end = lastSnapshot(track);
  const peak = peakConfidence(track);

  const summaryRows: DetailRow[] = [
    { label: 'נקודת התחלה', value: formatFix(start), copyValue: rawLatLon(start) },
    { label: 'נקודת סיום',  value: formatFix(end),   copyValue: rawLatLon(end) },
    { label: 'ביטחון מקסימלי', value: `${Math.round(peak * 100)}%` },
  ];

  const liveRows: DetailRow[] = [
    { label: 'מיקום', value: formatFix(snap), copyValue: rawLatLon(snap) },
    { label: 'סיווג', value: 'רחפן' },
    { label: 'ביטחון', value: `${Math.round(snap.confidence * 100)}%` },
  ];

  const sensors = snap.sensors.map((s) => ({
    id: s.id,
    typeLabel: s.typeLabel,
    distanceLabel: `${Math.round(s.distanceMeters)} m`,
    detectedAt: formatClock(track.startedAt + s.firstDetectedAtMs),
  }));

  const log: LogEntry[] = track.actionLog.map((entry) => ({
    time: formatClock(track.startedAt + entry.tMs),
    label: entry.label,
  }));

  return (
    <CardStack count={stack ? 3 : 1}>
      {() => (
        <TargetCard
          accent={accent}
          completed={completed}
          open={open}
          onToggle={noop}
          header={
            <CardHeader
              icon={DroneCardIcon}
              iconColor={accentHex('danger')}
              title={track.callsign}
              subtitle={`${formatClock(track.startedAt)} · ${formatDuration(track.durationMs)}`}
              status={<StatusChip label="שובש" color="green" />}
              open={open}
            />
          }
        >
          <CardDetails rows={summaryRows} title="סיכום מעקב" copyLabel="העתק" defaultOpen cols={2} />
          <CardDetails rows={liveRows}    title="טלמטריה — בנקודה זו" copyLabel="העתק" cols={2} />
          {sensors.length > 0 && (
            <AccordionSection title={`חיישנים (${sensors.length})`} icon={Radar}>
              <div className="w-full px-0 pb-2 pt-2">
                <CardSensors sensors={sensors} label="" />
              </div>
            </AccordionSection>
          )}
          <CardLog entries={log} title="יומן פעולות" moreLabel={(n) => `עוד ${n} רשומות`} />
        </TargetCard>
      )}
    </CardStack>
  );
}

function LivePreview({
  open,
  completed,
  accent,
  stack,
}: {
  open: boolean;
  completed: boolean;
  accent: ThreatAccent;
  stack: boolean;
}) {
  const f = liveFixture;
  return (
    <CardStack count={stack ? 3 : 1}>
      {() => (
        <TargetCard
          accent={accent}
          completed={completed}
          open={open}
          onToggle={noop}
          header={
            <CardHeader
              icon={f.header.icon}
              iconColor={f.header.iconColor}
              title={f.header.title}
              subtitle={f.header.subtitle}
              status={<StatusChip label={f.header.statusLabel} color="red" />}
              open={open}
            />
          }
        >
          <CardDetails rows={f.summaryRows} title="טלמטריה" copyLabel="העתק" defaultOpen cols={2} />
          <AccordionSection title={`חיישנים (${f.sensors.length})`} icon={Radar} defaultOpen>
            <div className="w-full px-0 pb-2 pt-2">
              <CardSensors sensors={f.sensors} label="" />
            </div>
          </AccordionSection>
          <CardActions actions={f.actions} />
          <CardLog entries={f.log} title="יומן פעולות" moreLabel={(n) => `עוד ${n} רשומות`} />
          <CardClosure title="סגירה — בחר סיבה" outcomes={f.closure} onSelect={noop} />
        </TargetCard>
      )}
    </CardStack>
  );
}

function CardStack({ count, children }: { count: number; children: () => React.ReactNode }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{children()}</div>
      ))}
    </>
  );
}

function useDialKitConfig(): SandboxParams {
  const latest = useRef<SandboxParams | null>(null);

  const params = useDialKit('Card Design', {
    Surfaces: {
      shell:       [4, 1, 8, 1],
      content:     [5, 1, 8, 1],
      sectionBody: [4, 1, 8, 1],
      // Production `--gridblock-floor: var(--surface-2)`. Card shell
      // now sits two ladder steps above the floor — shadow recipe
      // and L delta share the load of separating card from page.
      panelBg:     [2, 1, 8, 1],
    },
    Chrome: {
      shadowLevel: { type: 'select' as const, options: ['1', '2', '3', '4', '5'], default: '4' },
    },
    State: {
      open: true,
      completed: false,
      accent: { type: 'select' as const, options: ACCENT_OPTIONS as unknown as string[], default: 'idle' },
      variant: { type: 'select' as const, options: ['history', 'live'], default: 'history' },
      stack: false,
    },
    Compare: {
      splitView: false,
    },
    Export: {
      copyConfig: { type: 'action' as const, label: 'Copy config to clipboard' },
    },
  }, {
    onAction: (path) => {
      if (path !== 'Export.copyConfig' || !latest.current) return;
      const payload = JSON.stringify(latest.current, null, 2);
      void navigator.clipboard?.writeText(payload);
      console.info('[card-sandbox] config snapshot\n' + payload);
    },
  }) as unknown as SandboxParams;

  latest.current = params;
  return params;
}

/**
 * Re-scopes the surface tokens that `TargetCard` + `AccordionSection`
 * actually paint with.
 *
 * Two CSS quirks make this less obvious than it looks:
 *
 * 1. `bg-surface-N` compiles to `var(--color-surface-N)`, and the
 *    Tailwind side declares `--color-surface-N: var(--surface-N)`
 *    on `:root`. Custom-property substitution is done at the
 *    DECLARING element, so by the time `--color-surface-N` reaches
 *    a descendant it has already been resolved to a slate-N OKLCH
 *    literal. Overriding the inner `--surface-N` further down the
 *    tree has zero effect on `bg-surface-N`. We override the outer
 *    `--color-surface-N` directly.
 *
 * 2. Tailwind v4 tree-shakes theme tokens — `--color-surface-6..8`
 *    aren't emitted because no `bg-surface-6..8` class exists in the
 *    codebase. So we point at the always-defined `--surface-N`
 *    palette tokens on the RHS, not at `--color-surface-N`.
 *
 * Shadow is unwrapped (no `--color-*` indirection), so a plain
 * `--shadow-3` override propagates straight through to the inline
 * `boxShadow: var(--shadow-3)` on `TargetCard`.
 */
function scopedSurfaces({
  shell,
  content,
  sectionBody,
  shadowLevel,
}: {
  shell: number;
  content: number;
  sectionBody: number;
  shadowLevel: ShadowLevel;
}): CSSProperties {
  return {
    ['--color-surface-2' as string]: `var(--surface-${shell})`,
    ['--color-surface-3' as string]: `var(--surface-${content})`,
    ['--color-surface-4' as string]: `var(--surface-${sectionBody})`,
    ['--shadow-3' as string]:         `var(--shadow-${shadowLevel})`,
  };
}

function useNow(): number {
  // Frozen at first render — sandbox does not need a live clock and
  // a stable `now` keeps the seed track's startedAt / endedAt in
  // sync with whatever fixture lookups the page does.
  const ref = useRef<number | null>(null);
  if (ref.current == null) ref.current = Date.now();
  return ref.current;
}

function formatFix(snap: TrackSnapshot): string {
  return `${formatUtm(snap.position.lat, snap.position.lon)} | ${Math.round(snap.altitude)} m`;
}

function rawLatLon(snap: TrackSnapshot): string {
  return `${snap.position.lat}, ${snap.position.lon}`;
}

function noop() {}
