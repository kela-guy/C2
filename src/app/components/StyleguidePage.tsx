import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Eye, Radio, ShieldAlert, Zap, Crosshair, Ban, AlertTriangle,
  Trash2, Send, Compass, Gauge, Navigation, MapPin, CheckCircle2,
  Bird, Activity, History, Radar, Hand, Copy, Check,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TooltipProvider } from '@/app/components/ui/tooltip';
import {
  CARD_TOKENS, ELEVATION, SURFACE, surfaceAt,
  StatusChip, ActionButton, AccordionSection, TelemetryRow,
  TargetCard, CardHeader, CardActions,
  CardDetails, CardSensors, CardMedia, CardLog, CardClosure,
  FilterBar, NewUpdatesPill,
  type CardAction, type CardSensor,
  type LogEntry, type ClosureOutcome, type DetailRow,
} from '@/primitives';
import { SplitActionButton } from '@/primitives/SplitActionButton';
import {
  CameraIcon, SensorIcon, RadarIcon, DroneIcon, DroneHiveIcon,
  LidarIcon, LauncherIcon, MissileIcon,
} from '@/app/components/TacticalMap';
import { useCardSlots, type CardCallbacks, type CardContext } from '@/imports/useCardSlots';
import { cuas_classified, cuas_mitigating, cuas_bda_complete } from '@/test-utils/mockDetections';
import type { Detection, RegulusEffector } from '@/imports/ListOfSystems';
import { getActivityStatus } from '@/imports/useActivityStatus';

import statusChipSrc from '@/primitives/StatusChip.tsx?raw';
import actionButtonSrc from '@/primitives/ActionButton.tsx?raw';
import splitActionButtonSrc from '@/primitives/SplitActionButton.tsx?raw';
import accordionSectionSrc from '@/primitives/AccordionSection.tsx?raw';
import telemetryRowSrc from '@/primitives/TelemetryRow.tsx?raw';
import targetCardSrc from '@/primitives/TargetCard.tsx?raw';
import cardHeaderSrc from '@/primitives/CardHeader.tsx?raw';
import cardActionsSrc from '@/primitives/CardActions.tsx?raw';
import cardDetailsSrc from '@/primitives/CardDetails.tsx?raw';
import cardSensorsSrc from '@/primitives/CardSensors.tsx?raw';
import cardMediaSrc from '@/primitives/CardMedia.tsx?raw';
import cardLogSrc from '@/primitives/CardLog.tsx?raw';
import cardClosureSrc from '@/primitives/CardClosure.tsx?raw';
import filterBarSrc from '@/primitives/FilterBar.tsx?raw';
import newUpdatesPillSrc from '@/primitives/NewUpdatesPill.tsx?raw';
import tacticalMapSrc from '@/app/components/TacticalMap.tsx?raw';

// ─── Sidebar nav structure ───────────────────────────────────────────────────

interface NavGroup { label: string; items: { id: string; label: string }[] }

const NAV: NavGroup[] = [
  {
    label: 'Foundations',
    items: [{ id: 'tokens', label: 'Design Tokens' }],
  },
  {
    label: 'Indicators',
    items: [
      { id: 'status-chip', label: 'StatusChip' },
      { id: 'new-updates', label: 'NewUpdatesPill' },
    ],
  },
  {
    label: 'Actions',
    items: [
      { id: 'action-button', label: 'ActionButton' },
      { id: 'split-action', label: 'SplitActionButton' },
    ],
  },
  {
    label: 'Card Slots',
    items: [
      { id: 'card-header', label: 'CardHeader' },
      { id: 'card-details', label: 'CardDetails' },
      { id: 'card-sensors', label: 'CardSensors' },
      { id: 'card-media', label: 'CardMedia' },
      { id: 'card-log', label: 'CardLog' },
      { id: 'card-closure', label: 'CardClosure' },
      { id: 'card-actions', label: 'CardActions' },
    ],
  },
  {
    label: 'Composed',
    items: [
      { id: 'target-card', label: 'TargetCard' },
      { id: 'filter-bar', label: 'FilterBar' },
      { id: 'accordion', label: 'AccordionSection' },
    ],
  },
  {
    label: 'Icons',
    items: [
      { id: 'map-icons', label: 'MapIcons' },
      { id: 'telemetry', label: 'TelemetryRow' },
    ],
  },
];

// ─── Layout primitives ───────────────────────────────────────────────────────

function ComponentSection({
  id,
  name,
  description,
  children,
}: {
  id: string;
  name: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight text-zinc-100">{name}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function PreviewPanel({
  children,
  className = '',
  tight = false,
}: {
  children: React.ReactNode;
  className?: string;
  tight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)] ${tight ? 'p-3' : 'p-6'} ${className}`}
      style={{ backgroundColor: SURFACE.level0 }}
    >
      {children}
    </div>
  );
}

function ExampleBlock({
  title,
  children,
  tight = false,
}: {
  title: string;
  children: React.ReactNode;
  tight?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-[13px] font-medium text-zinc-300">{title}</h3>
      <PreviewPanel tight={tight}>{children}</PreviewPanel>
    </div>
  );
}

interface PropDef {
  name: string;
  type: string;
  default?: string;
  description: string;
}

function PropsTable({ items }: { items: PropDef[] }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-[13px] font-medium text-zinc-300">Props</h3>
      <div className="overflow-x-auto rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-white/5" style={{ backgroundColor: SURFACE.level1 }}>
              <th className="py-2 px-3 text-right font-medium text-zinc-400">Prop</th>
              <th className="py-2 px-3 text-right font-medium text-zinc-400">Type</th>
              <th className="py-2 px-3 text-right font-medium text-zinc-400">Default</th>
              <th className="py-2 px-3 text-right font-medium text-zinc-400">Description</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.name} className="border-b border-white/[0.03] last:border-0">
                <td className="py-2 px-3 font-mono text-sky-300/80">{p.name}</td>
                <td className="py-2 px-3 font-mono text-zinc-500">{p.type}</td>
                <td className="py-2 px-3 font-mono text-zinc-600">{p.default ?? '—'}</td>
                <td className="py-2 px-3 text-zinc-400">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Syntax highlighting ──────────────────────────────────────────────────────

type Highlighter = Awaited<ReturnType<typeof import('shiki')['createHighlighter']>>;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({ themes: ['vitesse-dark'], langs: ['tsx'] }),
    );
  }
  return highlighterPromise;
}

function HighlightedCode({ code }: { code: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((highlighter) => {
      if (cancelled) return;
      setHtml(
        highlighter.codeToHtml(code, {
          lang: 'tsx',
          theme: 'vitesse-dark',
        }),
      );
    });
    return () => { cancelled = true; };
  }, [code]);

  if (!html) {
    return (
      <pre className="text-[12px] leading-[1.7] font-mono text-zinc-300 whitespace-pre" dir="ltr">
        {code}
      </pre>
    );
  }

  return (
    <div
      className="[&_pre]:!bg-transparent [&_pre]:text-[12px] [&_pre]:leading-[1.7] [&_pre]:font-mono [&_code]:font-mono"
      dir="ltr"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Tailwind class extraction ────────────────────────────────────────────────

const TW_CATEGORIES: [string, RegExp][] = [
  ['Layout',      /^(flex|grid|block|inline|hidden|relative|absolute|sticky|fixed|overflow|z-|order-|col-|row-|place-|justify-|items-|self-|content-|float-|clear-|isolat|object-|box-|display|table|aspect-|columns-)/],
  ['Sizing',      /^(w-|h-|min-w-|min-h-|max-w-|max-h-|size-)/],
  ['Spacing',     /^(p-|px-|py-|pt-|pr-|pb-|pl-|m-|mx-|my-|mt-|mr-|mb-|ml-|gap-|space-|-m)/],
  ['Typography',  /^(text-\[?\d|text-xs|text-sm|text-base|text-lg|text-xl|text-2xl|text-3xl|font-|leading-|tracking-|whitespace-|break-|truncat|uppercase|lowercase|capitalize|italic|not-italic|underline|overline|line-through|no-underline|tabular-nums|oldstyle-nums|lining-nums|proportional-nums|slashed-zero|ordinal|diagonal)/],
  ['Colors',      /^(text-(?!xs|sm|base|lg|xl|2xl|3xl|\[?\d)|bg-|from-|via-|to-|border-(?!0|2|4|8|\[)|outline-(?!none|offset)|ring-(?!0|1|2|4|8|\[)|accent-|caret-|fill-|stroke-|decoration-|shadow-\[|placeholder-)/],
  ['Borders',     /^(border|rounded|outline|ring-(?:0|1|2|4|8|\[)|divide|border-(?:0|2|4|8|\[))/],
  ['Effects',     /^(shadow(?!-\[)|opacity-|mix-blend-|backdrop-|blur|brightness|contrast|grayscale|hue-rotate|invert|saturate|sepia|drop-shadow|animate-|will-change)/],
  ['Transitions', /^(transition|duration-|ease-|delay-)/],
  ['Transforms',  /^(transform|scale-|rotate-|translate-|skew-|origin-)/],
  ['Interactivity', /^(cursor-|pointer-events-|resize|select-|scroll-|snap-|touch-|appearance-)/],
];

function extractTailwindClasses(source: string): { category: string; classes: string[] }[] {
  const classStrings: string[] = [];

  const patterns = [
    /className="([^"]+)"/g,
    /className=\{`([^`]+)`\}/g,
    /className=\{cn\(([^)]+)\)\}/g,
    /'([^']+)'/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      classStrings.push(match[1]);
    }
  }

  const allClasses = new Set<string>();
  for (const str of classStrings) {
    for (const token of str.split(/\s+/)) {
      const cleaned = token.replace(/^['",]+|['",]+$/g, '').trim();
      if (cleaned && /^[a-z!-]/.test(cleaned) && !cleaned.includes('(') && !cleaned.includes('{')) {
        allClasses.add(cleaned);
      }
    }
  }

  const categorized = new Map<string, Set<string>>();
  const used = new Set<string>();

  for (const cls of allClasses) {
    const base = cls.replace(/^(hover:|focus:|active:|focus-visible:|focus-within:|disabled:|group-hover:|peer-|dark:|sm:|md:|lg:|xl:|2xl:)+/, '');
    for (const [category, regex] of TW_CATEGORIES) {
      if (regex.test(base)) {
        if (!categorized.has(category)) categorized.set(category, new Set());
        categorized.get(category)!.add(cls);
        used.add(cls);
        break;
      }
    }
  }

  const uncategorized = [...allClasses].filter((c) => !used.has(c));
  if (uncategorized.length > 0) {
    categorized.set('Other', new Set(uncategorized));
  }

  return [...categorized.entries()].map(([category, classes]) => ({
    category,
    classes: [...classes].sort(),
  }));
}

function TailwindClassesPanel({ code }: { code: string }) {
  const groups = useMemo(() => extractTailwindClasses(code), [code]);

  if (groups.length === 0) {
    return <p className="text-[12px] text-zinc-500 p-4">No Tailwind classes found.</p>;
  }

  return (
    <div className="space-y-4" dir="ltr">
      {groups.map(({ category, classes }) => (
        <div key={category}>
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
            {category}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {classes.map((cls) => (
              <code
                key={cls}
                className="inline-block px-1.5 py-0.5 rounded bg-white/[0.06] text-[11px] font-mono text-zinc-300 whitespace-nowrap"
              >
                {cls}
              </code>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── LLM markdown generation ──────────────────────────────────────────────────

function extractPropsInterface(source: string): string | null {
  const fnMatch = source.match(/export\s+function\s+\w+\(\{[^}]*\}:\s*\{([\s\S]*?)\}\s*\)/);
  if (fnMatch) return fnMatch[1].trim();

  const interfaceMatch = source.match(/(?:export\s+)?interface\s+\w+Props\s*\{([\s\S]*?)\}/);
  if (interfaceMatch) return interfaceMatch[1].trim();

  const typeMatch = source.match(/(?:export\s+)?type\s+\w+Props\s*=\s*\{([\s\S]*?)\}/);
  if (typeMatch) return typeMatch[1].trim();

  return null;
}

function extractDependencies(source: string): { external: string[]; internal: string[] } {
  const external: string[] = [];
  const internal: string[] = [];
  const importRegex = /^import\s+.*?from\s+['"]([^'"]+)['"]/gm;
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    const line = match[0];
    const path = match[1];
    if (path.startsWith('.') || path.startsWith('@/')) {
      internal.push(line);
    } else {
      external.push(line);
    }
  }
  return { external, internal };
}

function generateComponentMarkdown(name: string, description: string, source: string): string {
  const lines: string[] = [];

  lines.push(`# ${name}\n`);
  lines.push(`> ${description}\n`);

  const props = extractPropsInterface(source);
  if (props) {
    lines.push(`## Props Interface\n`);
    lines.push('```typescript');
    lines.push(props);
    lines.push('```\n');
  }

  lines.push(`## Source Code\n`);
  lines.push('```tsx');
  lines.push(source.trim());
  lines.push('```\n');

  const twGroups = extractTailwindClasses(source);
  if (twGroups.length > 0) {
    lines.push(`## Tailwind Classes\n`);
    for (const { category, classes } of twGroups) {
      lines.push(`- **${category}**: \`${classes.join('`, `')}\``);
    }
    lines.push('');
  }

  const deps = extractDependencies(source);
  if (deps.external.length > 0 || deps.internal.length > 0) {
    lines.push(`## Dependencies\n`);
    if (deps.external.length > 0) {
      lines.push('**External:**');
      for (const d of deps.external) lines.push(`- \`${d}\``);
      lines.push('');
    }
    if (deps.internal.length > 0) {
      lines.push('**Internal:**');
      for (const d of deps.internal) lines.push(`- \`${d}\``);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Animated copy button ─────────────────────────────────────────────────────

function CopyIconButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  const iconTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.15, ease: [0, 0, 0.2, 1] };

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : 'Copy component as markdown'}
      className="flex items-center gap-1.5 h-7 px-2.5 rounded-[10px_4px_4px_4px] cursor-pointer text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] active:scale-[0.96] transition-[color,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            className="flex items-center gap-1.5"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
            transition={iconTransition}
          >
            <Check size={13} className="text-emerald-400" />
            <span className="text-[11px] font-medium text-emerald-400">Copied</span>
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            className="flex items-center gap-1.5"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
            transition={iconTransition}
          >
            <Copy size={13} />
            <span className="text-[11px] font-medium">Copy .md</span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

// ─── Code preview with tabs ───────────────────────────────────────────────────

type CodeTab = 'preview' | 'source' | 'tailwind';

function CodePreviewBlock({
  name,
  description,
  code,
  children,
  tight = false,
}: {
  name: string;
  description: string;
  code: string;
  children: React.ReactNode;
  tight?: boolean;
}) {
  const [tab, setTab] = useState<CodeTab>('preview');

  const tabs: { id: CodeTab; label: string }[] = [
    { id: 'preview', label: 'Preview' },
    { id: 'source', label: 'Source' },
    { id: 'tailwind', label: 'Tailwind' },
  ];

  const markdown = useMemo(
    () => generateComponentMarkdown(name, description, code),
    [name, description, code],
  );

  return (
    <div className="rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
      <div className="flex items-center border-b border-white/[0.06]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-[12px] font-medium cursor-pointer transition-[color,border-color] duration-150 ease-out active:scale-[0.97] ${
              tab === t.id
                ? 'text-zinc-100 border-b border-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 border-b border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto w-full flex flex-col justify-center items-end pl-1.5">
          <CopyIconButton text={markdown} />
        </div>
      </div>
      {tab === 'preview' && (
        <div className={tight ? 'p-3' : 'p-6'}>{children}</div>
      )}
      {tab === 'source' && (
        <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
          <HighlightedCode code={code} />
        </div>
      )}
      {tab === 'tailwind' && (
        <div className="p-4 overflow-y-auto max-h-[600px]">
          <TailwindClassesPanel code={code} />
        </div>
      )}
    </div>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-12 h-12 rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
        style={{ backgroundColor: color }}
      />
      <span className="text-[10px] text-zinc-500 font-mono leading-none">{label}</span>
      <span className="text-[10px] text-zinc-600 font-mono leading-none">{color}</span>
    </div>
  );
}


// ─── Shared noop / data ──────────────────────────────────────────────────────

const noop = () => {};

const ACTIVITY_STATUS_CHIP_COLOR: Record<string, 'green' | 'red' | 'orange' | 'gray'> = {
  active: 'green', recently_active: 'orange', timeout: 'gray', dismissed: 'gray', mitigated: 'green',
};
const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  active: 'פעיל', recently_active: 'פעיל לאחרונה', timeout: 'פג תוקף', dismissed: 'בוטל', mitigated: 'נוטרל',
};

function styleguideStatusChip(target: Detection) {
  const status = getActivityStatus(target);
  return <StatusChip label={ACTIVITY_STATUS_LABELS[status] ?? status} color={ACTIVITY_STATUS_CHIP_COLOR[status] ?? 'gray'} />;
}

const noopCallbacks: CardCallbacks = {
  onVerify: noop, onEngage: noop, onDismiss: noop,
  onCancelMission: noop, onCompleteMission: noop, onSendDroneVerification: noop,
  onSensorHover: noop, onCameraLookAt: noop, onTakeControl: noop,
  onReleaseControl: noop, onSensorModeChange: noop, onPlaybookSelect: noop,
  onClosureOutcome: noop, onAdvanceFlowPhase: noop, onEscalateCreatePOI: noop,
  onEscalateSendDrone: noop, onDroneSelect: noop, onDroneOverride: noop,
  onDroneResume: noop, onDroneRTB: noop, onMissionActivate: noop,
  onMissionPause: noop, onMissionResume: noop, onMissionOverride: noop,
  onMissionCancel: noop, onMitigate: noop, onMitigateAll: noop,
  onEffectorSelect: noop, onBdaOutcome: noop, onSensorFocus: noop,
};

const styleguideEffectors: RegulusEffector[] = [
  { id: 'eff-1', name: 'Regulus-1', lat: 32.09, lon: 34.78, coverageRadiusM: 5000, status: 'available' },
];

function StyleguideUnifiedCard({ detection, defaultOpen = true }: { detection: Detection; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const ctx: CardContext = { regulusEffectors: styleguideEffectors };
  const slots = useCardSlots(detection, noopCallbacks, ctx);
  const isSuccess = detection.status === 'event_resolved' || detection.status === 'event_neutralized';
  const isExpired = detection.status === 'expired';
  const showDetails = !isSuccess && !isExpired && detection.flowType !== 4;

  return (
    <TargetCard
      accent={slots.accent}
      completed={slots.completed}
      open={open}
      onToggle={() => setOpen(!open)}
      header={
        <CardHeader
          {...slots.header}
          status={styleguideStatusChip(detection)}
          open={open}
        />
      }
    >
      {slots.closureType && (
        <div className="px-2 pt-1.5 flex items-center gap-1">
          {slots.closureType === 'manual' ? (
            <div className="flex items-center gap-1 text-[9px] text-zinc-500">
              <Hand size={10} className="text-zinc-500" aria-hidden="true" />
              <span>סגירה ידנית</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[9px] text-zinc-500">
              <Zap size={10} className="text-zinc-500" aria-hidden="true" />
              <span>סגירה אוטומטית</span>
            </div>
          )}
        </div>
      )}
      {slots.media && <CardMedia {...slots.media} />}
      {slots.actions.length > 0 && <CardActions actions={slots.actions} />}
      {showDetails && (
        <CardDetails rows={slots.details.rows} classification={slots.details.classification} />
      )}
      {slots.laserPosition.length > 0 && (
        <AccordionSection title="מיקום יחסי ללייזר" icon={Crosshair}>
          <div className="w-full py-1">
            <div className="grid grid-cols-3 grid-rows-1 gap-0">
              {slots.laserPosition.map((row, idx) => (
                <TelemetryRow key={idx} label={row.label} value={row.value} icon={row.icon} />
              ))}
            </div>
          </div>
        </AccordionSection>
      )}
      {slots.sensors.length > 0 && (
        <AccordionSection title={`חיישנים (${slots.sensors.length})`} icon={Radar}>
          <div className="px-0 pb-2 w-full pt-2">
            <CardSensors sensors={slots.sensors} label="" onSensorHover={noop} />
          </div>
        </AccordionSection>
      )}
      {slots.log.length > 0 && <CardLog entries={slots.log} />}
      {slots.closure && (
        <CardClosure outcomes={slots.closure.outcomes} onSelect={slots.closure.onSelect} />
      )}
    </TargetCard>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function StyleguidePage() {
  const [loading, setLoading] = useState<string | null>(null);

  const simulateLoading = (id: string) => {
    setLoading(id);
    setTimeout(() => setLoading(null), 2000);
  };

  const sampleDetailRows: DetailRow[] = [
    { label: 'גובה', value: '120m', icon: Navigation },
    { label: 'מהירות', value: '45 km/h', icon: Gauge },
    { label: 'כיוון', value: '270°', icon: Compass },
    { label: 'מרחק', value: '1.2 km', icon: MapPin },
  ];

  const sampleSensors: CardSensor[] = [
    { id: 'rf-01', typeLabel: 'RF Scanner', icon: Radio, distanceLabel: '1.2 km', detectedAt: '14:32:01' },
    { id: 'radar-01', typeLabel: 'Radar X-Band', icon: Activity, distanceLabel: '0.8 km', detectedAt: '14:32:05' },
    { id: 'eo-01', typeLabel: 'EO/IR Camera', icon: Eye, distanceLabel: '0.5 km', detectedAt: '14:32:12' },
  ];

  const sampleLogEntries: LogEntry[] = [
    { time: '14:30:01', label: 'זוהה אות RF חדש' },
    { time: '14:30:15', label: 'סיווג ראשוני: רחפן מסחרי' },
    { time: '14:31:02', label: 'מצלמה הופנתה ליעד' },
    { time: '14:31:30', label: 'אישור חזותי — DJI Mavic 3' },
    { time: '14:32:00', label: 'יעד נכנס לאזור מוגבל' },
    { time: '14:32:15', label: 'התראת איום שודרגה' },
    { time: '14:32:40', label: 'ג׳אמר RF הופעל' },
  ];

  const sampleClosureOutcomes: ClosureOutcome[] = [
    { id: 'bird', label: 'ציפור — סגור', icon: Bird },
    { id: 'threat', label: 'איום אמיתי', icon: ShieldAlert },
    { id: 'false-alarm', label: 'התרעת שווא', icon: AlertTriangle },
    { id: 'resolved', label: 'טופל בהצלחה', icon: CheckCircle2 },
  ];

  const sampleActions: CardAction[] = [
    {
      id: 'jam', label: 'הפעל ג׳אמר', icon: Zap, variant: 'danger', size: 'sm',
      group: 'effector', onClick: noop,
      dropdownActions: [
        { id: 'jam-rf', label: 'ג׳אמר RF', icon: Radio, onClick: noop },
        { id: 'jam-gps', label: 'ג׳אמר GPS', icon: Crosshair, onClick: noop },
      ],
    },
    { id: 'camera', label: 'הפנה מצלמה', icon: Eye, variant: 'fill', size: 'sm', group: 'investigation', onClick: noop },
    { id: 'dismiss', label: 'בטל', icon: Ban, variant: 'ghost', size: 'sm', group: 'investigation', onClick: noop },
  ];

  const [filterState, setFilterState] = useState({
    query: '',
    activityStatus: [] as string[],
    detectedByDeviceIds: [] as string[],
  });

  const mockSensorsForFilter = [
    { id: 'rf-01', label: 'RF Scanner 01' },
    { id: 'radar-01', label: 'Radar X-Band' },
    { id: 'eo-01', label: 'EO/IR Camera' },
  ];

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-[#0a0a0b] text-white font-sans">

        {/* ── Sidebar ── */}
        <nav className="sticky top-0 h-screen w-52 shrink-0 overflow-y-auto border-l border-white/[0.04] bg-[#0f0f10] py-6 px-4">
          <a href="#top" className="block text-[13px] font-semibold text-zinc-200 mb-6 tracking-tight">CUAS Styleguide</a>
          {NAV.map((group) => (
            <div key={group.label} className="mb-5">
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1.5 px-2">{group.label}</span>
              <ul className="space-y-px">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block rounded-md px-2 py-1.5 text-[12px] text-zinc-400 transition-colors duration-150 hover:bg-white/[0.04] hover:text-zinc-100"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Main content ── */}
        <main id="top" className="flex-1 overflow-y-auto py-10 px-10">
          <div className="mx-auto max-w-[720px] space-y-20">

            {/* ────────────────────────────────────────────────────────────── */}
            {/*  FOUNDATIONS                                                  */}
            {/* ────────────────────────────────────────────────────────────── */}

            <ComponentSection id="tokens" name="Design Tokens" description="Surface elevations, accent palette, and spacing primitives that every component inherits.">
              <PreviewPanel>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Surface Levels</span>
                    <div className="flex flex-wrap gap-4">
                      {(Object.keys(SURFACE) as Array<keyof typeof SURFACE>).map((level) => (
                        <ColorSwatch key={level} color={SURFACE[level]} label={level} />
                      ))}
                      <ColorSwatch color={ELEVATION.baseSurface} label="baseSurface" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Spine / Accent Colors</span>
                    <div className="flex flex-wrap gap-4">
                      {Object.entries(CARD_TOKENS.spine.colors).map(([name, color]) => (
                        <ColorSwatch key={name} color={color} label={name} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">surfaceAt() Helper</span>
                    <div className="flex flex-wrap gap-4">
                      {([0, 1, 2, 3, 4] as const).map((n) => (
                        <ColorSwatch key={n} color={surfaceAt(`level${n}` as `level${typeof n}`)} label={`level${n}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </PreviewPanel>
            </ComponentSection>

            {/* ────────────────────────────────────────────────────────────── */}
            {/*  INDICATORS                                                  */}
            {/* ────────────────────────────────────────────────────────────── */}

            <ComponentSection id="status-chip" name="StatusChip" description="Compact colored badge indicating operational status of a target or system.">
              <CodePreviewBlock name="StatusChip" description="Compact colored badge indicating operational status of a target or system." code={statusChipSrc}>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusChip label="פעיל" color="green" />
                  <StatusChip label="פעיל לאחרונה" color="orange" />
                  <StatusChip label="פג תוקף" color="gray" />
                  <StatusChip label="נדחה" color="gray" />
                  <StatusChip label="טופל" color="green" />
                </div>
              </CodePreviewBlock>
              <PropsTable items={[
                { name: 'label', type: 'string', description: 'Display text' },
                { name: 'color', type: '"green" | "gray" | "red" | "orange"', default: '"green"', description: 'Semantic color variant' },
                { name: 'className', type: 'string', description: 'Additional Tailwind classes' },
              ]} />
            </ComponentSection>

            <ComponentSection id="new-updates" name="NewUpdatesPill" description="Floating pill that appears above the list to surface new incoming detections.">
              <CodePreviewBlock name="NewUpdatesPill" description="Floating pill that appears above the list to surface new incoming detections." code={newUpdatesPillSrc}>
                <div className="flex flex-wrap items-center gap-4">
                  <NewUpdatesPill count={1} onClick={noop} />
                  <NewUpdatesPill count={5} onClick={noop} />
                  <NewUpdatesPill count={42} onClick={noop} />
                  <NewUpdatesPill count={147} onClick={noop} />
                </div>
              </CodePreviewBlock>
              <PropsTable items={[
                { name: 'count', type: 'number', description: 'Number of new updates to display' },
                { name: 'onClick', type: '() => void', description: 'Scroll-to-top handler' },
              ]} />
            </ComponentSection>

            {/* ────────────────────────────────────────────────────────────── */}
            {/*  ACTIONS                                                     */}
            {/* ────────────────────────────────────────────────────────────── */}

            <ComponentSection id="action-button" name="ActionButton" description="Tactical action trigger with variant, size, icon, and loading states. Used in card action rows and standalone controls.">
              <CodePreviewBlock name="ActionButton" description="Tactical action trigger with variant, size, icon, and loading states. Used in card action rows and standalone controls." code={actionButtonSrc}>
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton label="הפנה מצלמה" icon={Eye} variant="fill" size="md" />
                  <ActionButton label="ביטול" icon={Ban} variant="ghost" size="md" />
                  <ActionButton label="מחק" icon={Trash2} variant="danger" size="md" />
                  <ActionButton label="אזהרה" icon={AlertTriangle} variant="warning" size="md" />
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'label', type: 'string', description: 'Button text' },
                { name: 'icon', type: 'React.ElementType', description: 'Lucide icon component' },
                { name: 'variant', type: '"fill" | "ghost" | "danger" | "warning"', default: '"fill"', description: 'Visual treatment' },
                { name: 'size', type: '"sm" | "md" | "lg"', default: '"md"', description: 'Height and padding scale' },
                { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable interaction' },
                { name: 'loading', type: 'boolean', default: 'false', description: 'Show spinner, disable click' },
                { name: 'onClick', type: '(e: MouseEvent) => void', description: 'Click handler' },
              ]} />

              <ExampleBlock title="Size Scale">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionButton label="sm" icon={Eye} variant="fill" size="sm" />
                    <ActionButton label="md" icon={Eye} variant="fill" size="md" />
                    <ActionButton label="lg" icon={Eye} variant="fill" size="lg" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionButton label="sm" icon={Trash2} variant="danger" size="sm" />
                    <ActionButton label="md" icon={Trash2} variant="danger" size="md" />
                    <ActionButton label="lg" icon={Trash2} variant="danger" size="lg" />
                  </div>
                </div>
              </ExampleBlock>

              <ExampleBlock title="All Variants × sm">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton label="הפנה מצלמה" icon={Eye} variant="fill" size="sm" />
                  <ActionButton label="ביטול" icon={Ban} variant="ghost" size="sm" />
                  <ActionButton label="מחק" icon={Trash2} variant="danger" size="sm" />
                  <ActionButton label="אזהרה" icon={AlertTriangle} variant="warning" size="sm" />
                </div>
              </ExampleBlock>

              <ExampleBlock title="Without Icon">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton label="fill" variant="fill" size="sm" />
                  <ActionButton label="ghost" variant="ghost" size="sm" />
                  <ActionButton label="danger" variant="danger" size="sm" />
                  <ActionButton label="warning" variant="warning" size="sm" />
                </div>
              </ExampleBlock>

              <ExampleBlock title="Disabled">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton label="fill" icon={Eye} variant="fill" size="sm" disabled />
                  <ActionButton label="danger" icon={Trash2} variant="danger" size="sm" disabled />
                </div>
              </ExampleBlock>

              <ExampleBlock title="Loading (click to test)">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton label="שולח..." icon={Send} variant="fill" size="sm" loading={loading === 'ab-fill'} onClick={() => simulateLoading('ab-fill')} />
                  <ActionButton label="מוחק..." icon={Trash2} variant="danger" size="sm" loading={loading === 'ab-danger'} onClick={() => simulateLoading('ab-danger')} />
                </div>
              </ExampleBlock>
            </ComponentSection>

            <ComponentSection id="split-action" name="SplitActionButton" description="Two-segment button: primary action on the left, dropdown menu on the right. Used for effector controls with sub-options.">
              <CodePreviewBlock name="SplitActionButton" description="Two-segment button: primary action on the left, dropdown menu on the right. Used for effector controls with sub-options." code={splitActionButtonSrc}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-48">
                    <SplitActionButton label="שיגור" icon={Zap} variant="fill" size="sm" onClick={noop} dropdownItems={[
                      { id: '1', label: 'אפשרות א׳', icon: Radio, onClick: noop },
                      { id: '2', label: 'אפשרות ב׳', icon: Crosshair, onClick: noop },
                    ]} />
                  </div>
                  <div className="w-48">
                    <SplitActionButton label="מחק" icon={Trash2} variant="danger" size="sm" onClick={noop} dropdownItems={[
                      { id: '1', label: 'מחק לצמיתות', icon: Trash2, onClick: noop },
                    ]} />
                  </div>
                  <div className="w-48">
                    <SplitActionButton label="אזהרה" icon={AlertTriangle} variant="warning" size="sm" onClick={noop} dropdownItems={[
                      { id: '1', label: 'פעולה', onClick: noop },
                    ]} />
                  </div>
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'label', type: 'string', description: 'Primary button text' },
                { name: 'badge', type: 'string', description: 'Inline chip displayed after the label (e.g. effector name)' },
                { name: 'icon', type: 'React.ElementType', description: 'Lucide icon' },
                { name: 'variant', type: '"fill" | "ghost" | "danger" | "warning"', default: '"fill"', description: 'Color treatment' },
                { name: 'size', type: '"sm" | "md" | "lg"', default: '"sm"', description: 'Height scale' },
                { name: 'dropdownItems', type: 'SplitDropdownItem[]', description: 'Sub-action menu items' },
                { name: 'dropdownGroups', type: 'SplitDropdownGroup[]', description: 'Grouped dropdown sections with labels and separators' },
                { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable both segments' },
                { name: 'loading', type: 'boolean', default: 'false', description: 'Show spinner on primary' },
                { name: 'dimDisabledShell', type: 'boolean', default: 'true', description: 'Reduce opacity when disabled' },
                { name: 'onHover', type: '(hovering: boolean) => void', description: 'Fires on mouseEnter/Leave of primary segment — used to highlight effector on map' },
              ]} />

              <ExampleBlock title="Size Scale">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="w-44">
                    <SplitActionButton label="sm" icon={Zap} variant="fill" size="sm" onClick={noop} dropdownItems={[{ id: '1', label: 'Option', onClick: noop }]} />
                  </div>
                  <div className="w-48">
                    <SplitActionButton label="md" icon={Zap} variant="fill" size="md" onClick={noop} dropdownItems={[{ id: '1', label: 'Option', onClick: noop }]} />
                  </div>
                  <div className="w-52">
                    <SplitActionButton label="lg" icon={Zap} variant="fill" size="lg" onClick={noop} dropdownItems={[{ id: '1', label: 'Option', onClick: noop }]} />
                  </div>
                </div>
              </ExampleBlock>

              <ExampleBlock title="Disabled">
                <div className="w-48">
                  <SplitActionButton label="שיגור" icon={Zap} variant="fill" size="sm" disabled onClick={noop} dropdownItems={[{ id: '1', label: 'אפשרות א׳', onClick: noop }]} />
                </div>
              </ExampleBlock>

              <ExampleBlock title="Loading (click to test)">
                <div className="w-48">
                  <SplitActionButton label="שולח..." icon={Zap} variant="fill" size="sm" loading={loading === 'split-fill'} onClick={() => simulateLoading('split-fill')} dropdownItems={[{ id: '1', label: 'אפשרות א׳', onClick: noop }]} />
                </div>
              </ExampleBlock>

              <ExampleBlock title="With Badge (effector name inline)">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="w-56">
                    <SplitActionButton label="שיבוש" badge="Regulus North" icon={Radio} variant="danger" size="sm" onClick={noop} dropdownItems={[
                      { id: '1', label: 'שיבוש כללי', icon: Radio, onClick: noop },
                      { id: '2', label: 'שיבוש ממוקד', icon: Crosshair, onClick: noop },
                    ]} />
                  </div>
                  <div className="w-56">
                    <SplitActionButton label="משבש אות..." badge="Regulus South" icon={Radio} variant="danger" size="sm" loading onClick={noop} dropdownItems={[
                      { id: '1', label: 'שיבוש כללי', onClick: noop },
                    ]} />
                  </div>
                </div>
              </ExampleBlock>

              <ExampleBlock title="Grouped Dropdown (RTL, effector selection)">
                <div className="w-56">
                  <SplitActionButton label="שיבוש" badge="Regulus North" icon={Radio} variant="danger" size="sm" onClick={noop} dropdownItems={[]} dropdownGroups={[
                    { label: 'בחירת ג׳אמר', items: [
                      { id: 'eff-1', label: 'Regulus North (1.2 ק״מ)', checked: true, onClick: noop },
                      { id: 'eff-2', label: 'Regulus South (3.8 ק״מ)', checked: false, onClick: noop },
                    ]},
                    { items: [
                      { id: 'mode-1', label: 'שיבוש כללי', icon: Radio, onClick: noop },
                      { id: 'mode-2', label: 'שיבוש ממוקד', icon: Crosshair, onClick: noop },
                    ]},
                  ]} />
                </div>
              </ExampleBlock>
            </ComponentSection>

            {/* ────────────────────────────────────────────────────────────── */}
            {/*  CARD SLOTS                                                  */}
            {/* ────────────────────────────────────────────────────────────── */}

            <ComponentSection id="card-header" name="CardHeader" description="Top row of a TargetCard — icon, title, subtitle, status chip, badge, and chevron.">
              <CodePreviewBlock name="CardHeader" description="Top row of a TargetCard — icon, title, subtitle, status chip, badge, and chevron." tight code={cardHeaderSrc}>
                <div className="rounded-lg p-2" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardHeader
                    icon={ShieldAlert}
                    iconColor="#ef4444"
                    iconBgActive
                    title="רחפן DJI Mavic 3"
                    subtitle="TGT-0042"
                    status={<StatusChip label="פעיל" color="red" />}
                    open={false}
                  />
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'title', type: 'string', description: 'Target display name' },
                { name: 'subtitle', type: 'string', description: 'Target ID or secondary label' },
                { name: 'icon', type: 'React.ElementType', description: 'Threat type icon' },
                { name: 'iconColor', type: 'string', description: 'Icon color override' },
                { name: 'iconBgActive', type: 'boolean', default: 'false', description: 'Use active (red) icon background' },
                { name: 'status', type: 'ReactNode', description: 'StatusChip or similar' },
                { name: 'badge', type: 'ReactNode', description: 'Optional badge element' },
                { name: 'open', type: 'boolean', description: 'Controls chevron rotation' },
              ]} />

              <ExampleBlock title="Open State" tight>
                <div className="rounded-lg p-2" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardHeader icon={Eye} title="עצם לא מזוהה" subtitle="TGT-0099" status={<StatusChip label="חשוד" color="orange" />} open />
                </div>
              </ExampleBlock>

              <ExampleBlock title="Minimal (no icon, no badge)" tight>
                <div className="rounded-lg p-2" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardHeader title="יעד בסיסי" subtitle="TGT-0001" open={false} />
                </div>
              </ExampleBlock>
            </ComponentSection>

            <ComponentSection id="card-details" name="CardDetails" description="Collapsible telemetry accordion displaying key target metrics with a copy-all button.">
              <CodePreviewBlock name="CardDetails" description="Collapsible telemetry accordion displaying key target metrics with a copy-all button." tight code={cardDetailsSrc}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardDetails rows={sampleDetailRows} defaultOpen />
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'rows', type: 'DetailRow[]', description: 'Array of { label, value, icon }' },
                { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Start expanded' },
              ]} />
            </ComponentSection>

            <ComponentSection id="card-sensors" name="CardSensors" description="Lists detecting sensors for a target with type, distance, and timestamp. Supports read-only and interactive modes.">
              <CodePreviewBlock name="CardSensors" description="Lists detecting sensors for a target with type, distance, and timestamp. Supports read-only and interactive modes." tight code={cardSensorsSrc}>
                <div className="max-w-sm rounded-lg overflow-hidden p-1" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardSensors sensors={sampleSensors} />
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'sensors', type: 'CardSensor[]', description: 'Array of sensor entries' },
                { name: 'onSensorClick', type: '(id: string) => void', description: 'Makes rows clickable buttons' },
                { name: 'onSensorHover', type: '(id: string | null) => void', description: 'Hover callback for map highlighting' },
              ]} />

              <ExampleBlock title="Clickable (interactive)" tight>
                <div className="max-w-sm rounded-lg overflow-hidden p-1" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardSensors sensors={sampleSensors} onSensorClick={(id) => console.log('sensor clicked:', id)} />
                </div>
              </ExampleBlock>
            </ComponentSection>

            <ComponentSection id="card-media" name="CardMedia" description="Image or video slot for target surveillance feed. Supports live badge, playback controls, and lightbox expansion.">
              <CodePreviewBlock name="CardMedia" description="Image or video slot for target surveillance feed. Supports live badge, playback controls, and lightbox expansion." code={cardMediaSrc}>
                <div className="flex flex-wrap gap-4">
                  <div className="w-64 rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
                    <CardMedia
                      src="https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=200&fit=crop"
                      type="image"
                      badge="threat"
                      alt="Drone surveillance image"
                    />
                  </div>
                  <div className="w-64 rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
                    <CardMedia
                      src="https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=200&fit=crop"
                      type="image"
                      badge="bird"
                      alt="Bird detection image"
                    />
                  </div>
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'src', type: 'string', description: 'Image or video URL' },
                { name: 'type', type: '"video" | "image"', default: '"image"', description: 'Media type' },
                { name: 'badge', type: '"threat" | "warning" | "bird" | null', description: 'Overlay badge icon' },
                { name: 'showControls', type: 'boolean', default: 'false', description: 'Show video playback controls' },
                { name: 'trackingLabel', type: 'string', description: 'Bottom-left tracking status label' },
              ]} />
            </ComponentSection>

            <ComponentSection id="card-log" name="CardLog" description="Chronological event log accordion with newest-first ordering and expand-all.">
              <CodePreviewBlock name="CardLog" description="Chronological event log accordion with newest-first ordering and expand-all." tight code={cardLogSrc}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardLog entries={sampleLogEntries} maxVisible={4} defaultOpen />
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'entries', type: 'LogEntry[]', description: 'Array of { time, label }' },
                { name: 'maxVisible', type: 'number', default: '5', description: 'Entries shown before "show more"' },
                { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Start accordion expanded' },
              ]} />
            </ComponentSection>

            <ComponentSection id="card-closure" name="CardClosure" description="Outcome selection grid for closing a detection event. Operator picks the resolution reason.">
              <CodePreviewBlock name="CardClosure" description="Outcome selection grid for closing a detection event. Operator picks the resolution reason." tight code={cardClosureSrc}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardClosure outcomes={sampleClosureOutcomes} onSelect={(id) => console.log('closure:', id)} />
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'outcomes', type: 'ClosureOutcome[]', description: 'Array of { id, label, icon }' },
                { name: 'onSelect', type: '(outcomeId: string) => void', description: 'Selection handler' },
                { name: 'title', type: 'string', default: '"סגירת אירוע — בחר סיבה"', description: 'Section heading' },
              ]} />
            </ComponentSection>

            <ComponentSection id="card-actions" name="CardActions" description="Action bar for TargetCard. Supports grouped effector/investigation layout, flat grid, and confirm dialogs with double-confirm.">
              <CodePreviewBlock name="CardActions" description="Action bar for TargetCard. Supports grouped effector/investigation layout, flat grid, and confirm dialogs with double-confirm." tight code={cardActionsSrc}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardActions actions={sampleActions} />
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'actions', type: 'CardAction[]', description: 'Action definitions with group, variant, confirm' },
                { name: 'layout', type: '"row" | "grid" | "stack"', default: '"row"', description: 'Fallback layout when no groups' },
              ]} />

              <ExampleBlock title="Flat Grid (no groups)" tight>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardActions actions={[
                    { id: 'cam', label: 'הפנה מצלמה', icon: Eye, variant: 'fill', size: 'sm', onClick: noop },
                    { id: 'del', label: 'מחק', icon: Trash2, variant: 'danger', size: 'sm', onClick: noop },
                    { id: 'cancel', label: 'ביטול', icon: Ban, variant: 'ghost', size: 'sm', onClick: noop },
                  ]} />
                </div>
              </ExampleBlock>

              <ExampleBlock title="With Confirm Dialog" tight>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardActions actions={[
                    {
                      id: 'danger-confirm', label: 'שיגור טיל', icon: Zap, variant: 'danger', size: 'lg',
                      onClick: noop,
                      confirm: { title: 'אישור שיגור', description: 'פעולה זו אינה הפיכה. האם אתה בטוח?', confirmLabel: 'שגר', doubleConfirm: true },
                    },
                    { id: 'cancel-confirm', label: 'ביטול', icon: Ban, variant: 'ghost', size: 'sm', onClick: noop },
                  ]} />
                </div>
              </ExampleBlock>
            </ComponentSection>

            {/* ────────────────────────────────────────────────────────────── */}
            {/*  COMPOSED                                                    */}
            {/* ────────────────────────────────────────────────────────────── */}

            <ComponentSection id="target-card" name="TargetCard" description="The core card shell. Composes CardHeader with slot children via the useCardSlots hook. These examples use real Detection mock data and the same composition as the main app.">
              <CodePreviewBlock name="TargetCard" description="The core card shell. Composes CardHeader with slot children via the useCardSlots hook." tight code={targetCardSrc}>
                <div className="max-w-sm mx-auto">
                  <StyleguideUnifiedCard detection={cuas_classified} defaultOpen />
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'header', type: 'ReactNode', description: 'CardHeader element' },
                { name: 'children', type: 'ReactNode', description: 'Slot components (media, actions, details, sensors, log, closure)' },
                { name: 'open', type: 'boolean', description: 'Expanded state' },
                { name: 'onToggle', type: '() => void', description: 'Toggle handler' },
                { name: 'accent', type: 'ThreatAccent', default: '"idle"', description: 'Spine color key' },
                { name: 'completed', type: 'boolean', description: 'Desaturate card' },
              ]} />

              <ExampleBlock title="Mitigating (active jam)" tight>
                <div className="max-w-sm mx-auto">
                  <StyleguideUnifiedCard detection={cuas_mitigating} defaultOpen />
                </div>
              </ExampleBlock>

              <ExampleBlock title="Completed (resolved)" tight>
                <div className="max-w-sm mx-auto">
                  <StyleguideUnifiedCard detection={cuas_bda_complete} defaultOpen={false} />
                </div>
              </ExampleBlock>
            </ComponentSection>

            <ComponentSection id="filter-bar" name="FilterBar" description="Search, sort, and multi-select filter controls for the target list sidebar.">
              <CodePreviewBlock name="FilterBar" description="Search, sort, and multi-select filter controls for the target list sidebar." tight code={filterBarSrc}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <FilterBar
                    filters={filterState}
                    activeFilterCount={filterState.activityStatus.length + filterState.detectedByDeviceIds.length}
                    availableSensors={mockSensorsForFilter}
                    onUpdate={(key, value) => setFilterState(prev => ({ ...prev, [key]: value }))}
                    onToggleActivity={(status) => setFilterState(prev => ({
                      ...prev,
                      activityStatus: prev.activityStatus.includes(status)
                        ? prev.activityStatus.filter(s => s !== status)
                        : [...prev.activityStatus, status],
                    }))}
                    onToggleSensor={(id) => setFilterState(prev => ({
                      ...prev,
                      detectedByDeviceIds: prev.detectedByDeviceIds.includes(id)
                        ? prev.detectedByDeviceIds.filter(s => s !== id)
                        : [...prev.detectedByDeviceIds, id],
                    }))}
                    onReset={() => setFilterState({ query: '', activityStatus: [], detectedByDeviceIds: [] })}
                  />
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'filters', type: 'FilterState', description: 'Current filter values' },
                { name: 'activeFilterCount', type: 'number', description: 'Controls reset button visibility' },
                { name: 'availableSensors', type: '{ id, label }[]', description: 'Sensor options for popover' },
                { name: 'onUpdate', type: '(key, value) => void', description: 'Generic filter field update' },
                { name: 'onToggleActivity', type: '(status) => void', description: 'Toggle activity status filter' },
                { name: 'onToggleSensor', type: '(id) => void', description: 'Toggle sensor filter' },
                { name: 'onReset', type: '() => void', description: 'Clear all filters' },
              ]} />
            </ComponentSection>

            <ComponentSection id="accordion" name="AccordionSection" description="Collapsible section with animated expand/collapse. Used inside cards for details, logs, and sensors.">
              <CodePreviewBlock name="AccordionSection" description="Collapsible section with animated expand/collapse. Used inside cards for details, logs, and sensors." tight code={accordionSectionSrc}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <AccordionSection title="ברירת מחדל (סגור)" icon={Eye}>
                    <div className="p-3 text-xs text-zinc-400">תוכן AccordionSection</div>
                  </AccordionSection>
                  <AccordionSection title="פתוח כברירת מחדל" icon={History} defaultOpen>
                    <div className="p-3 text-xs text-zinc-400">תוכן AccordionSection שנפתח אוטומטית.</div>
                  </AccordionSection>
                  <AccordionSection title="עם פעולת כותרת" icon={Activity} headerAction={<StatusChip label="3" color="orange" />}>
                    <div className="p-3 text-xs text-zinc-400">AccordionSection עם badge בכותרת</div>
                  </AccordionSection>
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'title', type: 'ReactNode', description: 'Section heading' },
                { name: 'icon', type: 'React.ElementType | null', description: 'Leading icon' },
                { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Start expanded' },
                { name: 'headerAction', type: 'ReactNode', description: 'Right-side action slot (badge, button)' },
              ]} />
            </ComponentSection>

            {/* ────────────────────────────────────────────────────────────── */}
            {/*  ICONS & DATA                                                */}
            {/* ────────────────────────────────────────────────────────────── */}

            <ComponentSection id="map-icons" name="MapIcons" description="Full icon catalog — map-layer icons from TacticalMap and card-layer icons from MapIcons. All support a size prop.">
              <CodePreviewBlock name="MapIcons" description="Full icon catalog — map-layer icons from TacticalMap and card-layer icons from MapIcons. All support a size prop." code={tacticalMapSrc}>
                <div className="grid grid-cols-4 gap-6">
                  {([
                    { Icon: CameraIcon, label: 'CameraIcon', fill: true },
                    { Icon: SensorIcon, label: 'SensorIcon', fill: true },
                    { Icon: RadarIcon, label: 'RadarIcon', fill: true },
                    { Icon: LidarIcon, label: 'LidarIcon', fill: true },
                    { Icon: LauncherIcon, label: 'LauncherIcon', fill: true },
                    { Icon: DroneHiveIcon, label: 'DroneHiveIcon', fill: true },
                  ] as const).map(({ Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-2.5">
                      <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
                        <Icon size={28} fill="white" />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">{label}</span>
                    </div>
                  ))}
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
                      <DroneIcon />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">DroneIcon</span>
                  </div>
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
                      <DroneIcon color="#ef4444" />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">DroneIcon (enemy)</span>
                  </div>
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
                      <MissileIcon />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">MissileIcon</span>
                  </div>
                </div>
              </CodePreviewBlock>


            </ComponentSection>

            <ComponentSection id="telemetry" name="TelemetryRow" description="Single telemetry metric display with icon, label, and monospace value. Laid out in a 3-column grid — rows wrap automatically based on item count.">
              <CodePreviewBlock name="TelemetryRow" description="Single telemetry metric display with icon, label, and monospace value. Laid out in a 3-column grid." tight code={telemetryRowSrc}>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
                  <TelemetryRow label="גובה" value="120m" icon={Navigation} />
                  <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
                  <TelemetryRow label="כיוון" value="270°" icon={Compass} />
                  <TelemetryRow label="מרחק" value="1.2 km" icon={MapPin} />
                </div>
              </CodePreviewBlock>

              <PropsTable items={[
                { name: 'label', type: 'string', description: 'Metric name' },
                { name: 'value', type: 'string', description: 'Metric value (monospace, tabular-nums)' },
                { name: 'icon', type: 'React.ElementType', description: 'Leading icon' },
              ]} />

              <ExampleBlock title="3 items (single row)" tight>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
                  <TelemetryRow label="גובה" value="120m" icon={Navigation} />
                  <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
                  <TelemetryRow label="כיוון" value="270°" icon={Compass} />
                </div>
              </ExampleBlock>

              <ExampleBlock title="6 items (2 rows)" tight>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
                  <TelemetryRow label="גובה" value="120m" icon={Navigation} />
                  <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
                  <TelemetryRow label="כיוון" value="270°" icon={Compass} />
                  <TelemetryRow label="מרחק" value="1.2 km" icon={MapPin} />
                  <TelemetryRow label="RCS" value="0.01 m²" icon={Radio} />
                  <TelemetryRow label="סוג" value="DJI Mavic 3" icon={Eye} />
                </div>
              </ExampleBlock>

              <ExampleBlock title="2 items (partial row)" tight>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
                  <TelemetryRow label="גובה" value="120m" icon={Navigation} />
                  <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
                </div>
              </ExampleBlock>
            </ComponentSection>

          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
