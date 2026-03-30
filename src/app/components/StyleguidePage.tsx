import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Eye, Radio, ShieldAlert, Zap, Crosshair, Ban, AlertTriangle,
  Trash2, Send, Compass, Gauge, Navigation, MapPin, CheckCircle2,
  Bird, Activity, History, Radar, Hand, Copy, Check, Download,
  BellOff, Camera, Wrench, Loader2, Search, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/shared/components/ui/sonner';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import {
  CARD_TOKENS, ELEVATION, SURFACE, LAYOUT_TOKENS, surfaceAt, overlayAt,
  StatusChip, STATUS_CHIP_COLORS, type StatusChipColor,
  ActionButton, ACTION_BUTTON_VARIANTS, ACTION_BUTTON_SIZES, type ActionButtonVariant,
  SplitActionButton, SPLIT_BUTTON_VARIANTS,
  AccordionSection, TelemetryRow,
  TargetCard, CardHeader, CardActions,
  CardDetails, CardSensors, CardMedia, MEDIA_BADGE_CONFIG, CardLog, CardClosure,
  FilterBar, NewUpdatesPill,
  type CardAction, type CardSensor,
  type LogEntry, type ClosureOutcome, type DetailRow,
} from '@/primitives';
import {
  CameraIcon, SensorIcon, RadarIcon, DroneIcon, DroneHiveIcon,
  LidarIcon, LauncherIcon, MissileIcon,
} from '@/shared/components/TacticalMap';
import { DroneCardIcon, MissileCardIcon } from '@/primitives/MapIcons';
import { downloadAllStyleguideIcons, iconPublicUrl } from '@/lib/styleguideIconAssets';
import { DevicesPanel } from '@/shared/components/DevicesPanel';
import { useCardSlots, type CardCallbacks, type CardContext } from '@/imports/useCardSlots';
import {
  cuas_raw, cuas_classified, cuas_classified_bird, cuas_mitigating, cuas_mitigated, cuas_bda_complete,
  flow1_suspicion, flow2_tracking, flow3_onStation, flow4_mission, flow4_complete, flow5_mitigated,
} from '@/test-utils/mockDetections';
import type { Detection, RegulusEffector } from '@/imports/ListOfSystems';
import { getActivityStatus } from '@/imports/useActivityStatus';

import tokensSrc from '@/primitives/tokens.ts?raw';
import themeCssSrc from '@/styles/theme.css?raw';

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
import tacticalMapSrc from '@/shared/components/TacticalMap.tsx?raw';
import devicesPanelSrc from '@/shared/components/DevicesPanel.tsx?raw';

// ─── Sidebar nav structure ───────────────────────────────────────────────────

interface NavItem { id: string; label: string; children?: { id: string; label: string }[] }
interface NavGroup { label: string; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    label: 'Foundations',
    items: [
      { id: 'layout-tokens', label: 'Layout Tokens' },
      { id: 'elevation', label: 'Elevation System' },
      { id: 'card-tokens', label: 'Card Tokens' },
      { id: 'theme-vars', label: 'CSS Theme Variables' },
    ],
  },
  {
    label: 'Primitives',
    items: [
      { id: 'status-chip', label: 'StatusChip' },
      { id: 'new-updates', label: 'NewUpdatesPill' },
      { id: 'action-button', label: 'ActionButton' },
      { id: 'split-action', label: 'SplitActionButton' },
      { id: 'accordion', label: 'AccordionSection' },
      { id: 'telemetry', label: 'TelemetryRow' },
    ],
  },
  {
    label: 'Card building blocks',
    items: [
      { id: 'card-header', label: 'CardHeader' },
      { id: 'card-media', label: 'CardMedia' },
      { id: 'card-actions', label: 'CardActions' },
      { id: 'card-details', label: 'CardDetails' },
      { id: 'card-sensors', label: 'CardSensors' },
      { id: 'card-log', label: 'CardLog' },
      { id: 'card-closure', label: 'CardClosure' },
    ],
  },
  {
    label: 'Assemblies & list chrome',
    items: [
      { id: 'card-states', label: 'Card States' },
      { id: 'target-card', label: 'TargetCard' },
      { id: 'filter-bar', label: 'FilterBar' },
      {
        id: 'devices-panel', label: 'DevicesPanel',
        children: [
          { id: 'devices-empty', label: 'Empty state' },
          { id: 'devices-header', label: 'Header' },
          { id: 'devices-search', label: 'Search & filters' },
          { id: 'devices-rows', label: 'Device rows' },
          { id: 'devices-camera', label: 'Camera device' },
          { id: 'devices-ecm', label: 'ECM device' },
          { id: 'devices-drone', label: 'Drone device' },
          { id: 'devices-actions', label: 'Action bar' },
        ],
      },
    ],
  },
  {
    label: 'Tactical',
    items: [{ id: 'map-icons', label: 'MapIcons' }],
  },
];

function findGroupForId(id: string): NavGroup | undefined {
  return NAV.find((g) =>
    g.items.some((item) => item.id === id || item.children?.some((c) => c.id === id)),
  );
}

function findParentItemForChild(childId: string): NavItem | undefined {
  for (const g of NAV) {
    for (const item of g.items) {
      if (item.children?.some((c) => c.id === childId)) return item;
    }
  }
  return undefined;
}

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
    <section id={id} className="scroll-mt-12 space-y-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[28px] font-semibold tracking-tight text-zinc-50">{name}</h2>
        <p className="text-[15px] leading-relaxed text-zinc-400">{description}</p>
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
      dir="rtl"
      className={`rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)] ${tight ? 'p-3' : 'p-6'} ${className}`}
      style={{ backgroundColor: SURFACE.level0 }}
    >
      {children}
    </div>
  );
}

function ExampleBlock({
  id,
  title,
  children,
  tight = false,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  tight?: boolean;
}) {
  return (
    <div id={id} className={`space-y-2.5 ${id ? 'scroll-mt-20' : ''}`}>
      <h3 className="text-[13px] font-medium text-zinc-300">{title}</h3>
      <PreviewPanel tight={tight}>{children}</PreviewPanel>
    </div>
  );
}

function StyleguideIconDownloadTile({
  label,
  subdir,
  fileName,
  children,
}: {
  label: string;
  subdir: 'tactical' | 'card';
  fileName: string;
  children: React.ReactNode;
}) {
  const href = iconPublicUrl(subdir, fileName);
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] text-zinc-200">
        {children}
      </div>
      <span className="text-center text-[10px] font-mono text-zinc-400">{label}</span>
      <a
        href={href}
        download={fileName}
        className="inline-flex max-w-full items-center justify-center gap-1 text-[10px] font-medium text-white underline-offset-2 hover:text-zinc-200 hover:underline"
      >
        <Download className="size-3 shrink-0 opacity-90" aria-hidden />
        <span className="truncate">{fileName}</span>
      </a>
    </div>
  );
}

function StyleguideDeviceTile({ label, children, width = 380 }: { label: string; children: React.ReactNode; width?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-medium text-zinc-400">{label}</span>
      <div className="bg-zinc-950 border border-white/10 rounded-lg overflow-hidden" style={{ width }}>
        {children}
      </div>
    </div>
  );
}

function StyleguideBatteryIcon({ pct }: { pct: number }) {
  const colorClass = pct > 60 ? 'text-emerald-400' : pct > 30 ? 'text-amber-400' : pct >= 20 ? 'text-orange-400' : 'text-red-400';
  const fillWidth = Math.max(1, (pct / 100) * 17);
  return (
    <svg className={colorClass} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width={16} height={16}>
      <rect x="1" y="5" width="19" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="2.5" y="6.5" width={fillWidth} height="11" rx="1" fill="currentColor" />
      <rect x="20" y="10" width="3" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}

function StyleguideJamIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width={size} height={size} className={className}>
      <path d="M22 12C19.5 10.5 19.5 5 17.5 5C15.5 5 15.5 10 13 10C10.5 10 10.5 2 8 2C5.5 2 5 10.5 2 12C5 13.5 5.5 22 8 22C10.5 22 10.5 14 13 14C15.5 14 15.5 19 17.5 19C19.5 19 19 13.5 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
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
              <th className="py-2 px-3 text-left font-medium text-zinc-400">Prop</th>
              <th className="py-2 px-3 text-left font-medium text-zinc-400">Type</th>
              <th className="py-2 px-3 text-left font-medium text-zinc-400">Default</th>
              <th className="py-2 px-3 text-left font-medium text-zinc-400">Description</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.name} className="border-b border-white/[0.03] last:border-0">
                <td className="py-2 px-3 font-mono text-sky-300/80">{p.name}</td>
                <td className="py-2 px-3 font-mono text-zinc-400">{p.type}</td>
                <td className="py-2 px-3 font-mono text-zinc-400">{p.default ?? '—'}</td>
                <td className="py-2 px-3 text-zinc-400">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section layout helpers (shadcn-style) ───────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[15px] font-semibold text-zinc-200 tracking-tight pt-4 first:pt-0">
      {children}
    </h3>
  );
}

function InlineCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : 'Copy code'}
      className="p-1.5 rounded cursor-pointer text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.08] active:scale-[0.94] transition-[color,background-color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  );
}

function ImportBlock({ path, names }: { path: string; names: string[] }) {
  const code = `import { ${names.join(', ')} } from '${path}'`;
  return (
    <div className="flex items-center rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
      <div className="flex-1 min-w-0 px-4 py-3 overflow-x-auto">
        <HighlightedCode code={code} />
      </div>
      <div className="shrink-0 pr-2">
        <InlineCopyButton text={code} />
      </div>
    </div>
  );
}

function UsageBlock({ code, name }: { code: string; name: string }) {
  const snippet = useMemo(() => {
    const exportMatch = code.match(/export\s+(?:function|const)\s+(\w+)/);
    const componentName = exportMatch?.[1] ?? name;

    const propsBlock = extractPropsInterface(code);
    if (!propsBlock) return `<${componentName} />`;

    const lines = propsBlock.split('\n').map(l => l.trim()).filter(Boolean);
    const requiredProps: string[] = [];
    for (const line of lines) {
      if (line.startsWith('//') || line.startsWith('/*')) continue;
      const propMatch = line.match(/^(\w+)(\?)?:\s*(.*?)(?:;|$)/);
      if (propMatch && !propMatch[2]) {
        const propName = propMatch[1];
        const propType = propMatch[3].trim();
        if (propName === 'children') continue;
        let value: string;
        if (propType.includes('string')) value = `"..."`;
        else if (propType.includes('boolean')) value = '';
        else if (propType.includes('number')) value = `{0}`;
        else if (propType === 'ReactNode' || propType === 'React.ReactNode') value = `{...}`;
        else if (propType.includes('=>') || propType.includes('Function')) value = `{() => {}}`;
        else if (propType.includes('ElementType') || propType.includes('FC') || propType.includes('ComponentType')) value = `{Icon}`;
        else value = `{...}`;

        requiredProps.push(value ? `${propName}=${value}` : propName);
      }
    }

    if (requiredProps.length === 0) return `<${componentName} />`;
    if (requiredProps.length <= 2) return `<${componentName} ${requiredProps.join(' ')} />`;
    return `<${componentName}\n  ${requiredProps.join('\n  ')}\n/>`;
  }, [code, name]);

  return (
    <div className="flex items-start rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
      <div className="flex-1 min-w-0 px-4 py-3 overflow-x-auto">
        <HighlightedCode code={snippet} />
      </div>
      <div className="shrink-0 pt-2.5 pr-2">
        <InlineCopyButton text={snippet} />
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
      <pre className="text-[12px] leading-[1.7] font-mono text-zinc-300 whitespace-pre">
        {code}
      </pre>
    );
  }

  return (
    <div
      className="[&_pre]:!bg-transparent [&_pre]:text-[12px] [&_pre]:leading-[1.7] [&_pre]:font-mono [&_code]:font-mono"
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
    <div className="space-y-4">
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
    { id: 'tailwind', label: 'Tailwind' },
    { id: 'source', label: 'Source' },
    { id: 'preview', label: 'Preview' },
  ];

  const markdown = useMemo(
    () => generateComponentMarkdown(name, description, code),
    [name, description, code],
  );

  return (
    <div className="rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden" style={{ backgroundColor: SURFACE.level0 }}>
      <div className="flex items-center border-b border-white/[0.06]">
        <div className="ml-auto w-full flex flex-col justify-center items-start pl-1.5">
          <CopyIconButton text={markdown} />
        </div>
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
      </div>
      {tab === 'preview' && (
        <div dir="rtl" className={tight ? 'p-3' : 'p-6'}>{children}</div>
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

function CopyIcon({ copied }: { copied: boolean }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={copied ? 'check' : 'copy'}
        initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
        transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
        className="flex items-center justify-center"
      >
        {copied
          ? <Check size={14} className="text-emerald-400" />
          : <Copy size={14} className="text-white/90" />}
      </motion.span>
    </AnimatePresence>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(color).then(() => {
      setCopied(true);
      toast.success(`Copied ${color}`, { duration: 1500 });
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="group relative w-12 h-12 rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.08)] cursor-pointer transition-[box-shadow,transform] duration-150 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)] active:scale-95"
        style={{ backgroundColor: color }}
      >
        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <CopyIcon copied={copied} />
        </span>
      </button>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-zinc-300 font-mono leading-none">{label}</span>
        <span className="text-[11px] text-zinc-200 font-mono leading-none tabular-nums">{color}</span>
      </div>
    </div>
  );
}

function TokenTable({ rows }: { rows: { token: string; value: string | number; note?: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-white/5" style={{ backgroundColor: SURFACE.level1 }}>
            <th className="py-2 px-3 text-right font-medium text-zinc-300">Token</th>
            <th className="py-2 px-3 text-right font-medium text-zinc-300">Value</th>
            <th className="py-2 px-3 text-right font-medium text-zinc-300">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.token} className="border-b border-white/[0.03] last:border-0">
              <td className="py-2 px-3 font-mono text-sky-300/80">{r.token}</td>
              <td className="py-2 px-3 font-mono text-zinc-300">{String(r.value)}</td>
              <td className="py-2 px-3 text-zinc-400">{r.note ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VariantGrid({ entries, renderSample }: {
  entries: { key: string; usage?: string }[];
  renderSample: (key: string) => React.ReactNode;
}) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
      {entries.map(({ key, usage }) => (
        <div key={key} className="flex flex-col items-center gap-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
          {renderSample(key)}
          <span className="text-[11px] font-mono text-zinc-300">{key}</span>
          {usage && <span className="text-[10px] text-zinc-500 text-center leading-tight">{usage}</span>}
        </div>
      ))}
    </div>
  );
}

function CSSVarSwatch({ varName, label }: { varName: string; label?: string }) {
  const [computed, setComputed] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    setComputed(val);
  }, [varName]);

  const handleCopy = () => {
    const value = computed || varName;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      toast.success(`Copied ${value}`, { duration: 1500 });
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="group relative w-12 h-12 rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.08)] cursor-pointer transition-[box-shadow,transform] duration-150 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)] active:scale-95"
        style={{ backgroundColor: `var(${varName})` }}
      >
        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <CopyIcon copied={copied} />
        </span>
      </button>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-zinc-300 font-mono leading-none">{label ?? varName}</span>
        <span className="text-[10px] text-zinc-400 font-mono leading-none max-w-20 truncate" title={computed}>{computed}</span>
      </div>
    </div>
  );
}

function ElevationRamp() {
  const levels = (Object.keys(ELEVATION.overlay) as Array<keyof typeof ELEVATION.overlay>).map((key) => ({
    key,
    opacity: ELEVATION.overlay[key],
    hex: SURFACE[key],
    overlay: overlayAt(key),
  }));

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (hex: string, key: string) => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopiedKey(key);
      toast.success(`Copied ${hex}`, { duration: 1500 });
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Ramp strip ── */}
      <div className="flex rounded-xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        {levels.map(({ key, opacity, hex }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleCopy(hex, key)}
            className="group relative flex-1 h-24 cursor-pointer transition-[filter] duration-200 hover:brightness-125"
            style={{ backgroundColor: hex }}
          >
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <CopyIcon copied={copiedKey === key} />
            </span>
          </button>
        ))}
      </div>

      {/* ── Level data ── */}
      <div className="flex">
        {levels.map(({ key, opacity, hex }) => (
          <div key={key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[11px] font-medium text-zinc-300 tabular-nums">{key}</span>
            <span className="text-[10px] font-mono text-zinc-400 tabular-nums">α {opacity}</span>
            <span className="text-[10px] font-mono text-zinc-400">{hex}</span>
          </div>
        ))}
      </div>

      {/* ── Base + shadow ── */}
      <div className="flex gap-6 pt-2">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]" style={{ backgroundColor: SURFACE.level0 }}>
          <div
            className="w-6 h-6 rounded shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
            style={{ backgroundColor: ELEVATION.baseSurface }}
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-zinc-300">Base surface</span>
            <span className="text-[11px] font-mono text-zinc-300">{ELEVATION.baseSurface}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-3 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]" style={{ backgroundColor: SURFACE.level0 }}>
          <div
            className="w-10 h-6 rounded"
            style={{ backgroundColor: SURFACE.level2, boxShadow: ELEVATION.shadow }}
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-zinc-300">Shadow</span>
            <code className="text-[10px] font-mono text-zinc-400 max-w-[220px] truncate" title={ELEVATION.shadow}>{ELEVATION.shadow}</code>
          </div>
        </div>
      </div>
    </div>
  );
}

function TokenSubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-white">{title}</span>
      {children}
    </div>
  );
}

function generateAllTokensMarkdown(): string {
  const lines: string[] = [];

  lines.push('# Design Token System\n');
  lines.push('> Complete token reference for the CUAS design system. Two source files define every color, spacing, elevation, and typography value used across the app.\n');

  lines.push('## File: src/primitives/tokens.ts\n');
  lines.push('```typescript');
  lines.push(tokensSrc.trim());
  lines.push('```\n');

  lines.push('## File: src/styles/theme.css\n');
  lines.push('```css');
  lines.push(themeCssSrc.trim());
  lines.push('```\n');

  lines.push('## Quick Reference — Computed Values\n');

  lines.push('### LAYOUT_TOKENS');
  lines.push(`| Token | Value |`);
  lines.push(`|-------|-------|`);
  for (const [k, v] of Object.entries(LAYOUT_TOKENS)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push('');

  lines.push('### SURFACE (computed hex)');
  lines.push(`| Level | Hex |`);
  lines.push(`|-------|-----|`);
  for (const [k, v] of Object.entries(SURFACE)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push('');

  lines.push('### CARD_TOKENS.spine.colors');
  lines.push(`| State | Hex |`);
  lines.push(`|-------|-----|`);
  for (const [k, v] of Object.entries(CARD_TOKENS.spine.colors)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push('');

  lines.push('### Tailwind CSS Variable Mappings');
  lines.push('Use these as Tailwind utility classes (e.g. `bg-primary`, `text-muted-foreground`, `border-border`):');
  lines.push('`background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `destructive-foreground`, `border`, `input`, `ring`, `chart-1`..`chart-5`, `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`\n');

  lines.push('### Radius Scale');
  lines.push('- `radius-sm`: calc(0.625rem - 4px)');
  lines.push('- `radius-md`: calc(0.625rem - 2px)');
  lines.push('- `radius-lg`: 0.625rem');
  lines.push('- `radius-xl`: calc(0.625rem + 4px)\n');

  lines.push('### Fonts');
  lines.push('- Sans: "Heebo", sans-serif');
  lines.push('- Mono: "IBM Plex Mono", monospace\n');

  return lines.join('\n');
}

function CopyAllTokensButton() {
  const [copied, setCopied] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const markdown = useMemo(() => generateAllTokensMarkdown(), []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [markdown]);

  const iconTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.15, ease: [0, 0, 0.2, 1] };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 h-9 px-4 rounded-lg cursor-pointer border border-white/10 bg-white/[0.04] text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.08] active:scale-[0.97] transition-[color,background-color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            className="flex items-center gap-2"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
            transition={iconTransition}
          >
            <Check size={14} className="text-emerald-400" />
            <span className="text-[12px] font-medium text-emerald-400">Copied all tokens</span>
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            className="flex items-center gap-2"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
            transition={iconTransition}
          >
            <Copy size={14} />
            <span className="text-[12px] font-medium">Copy all tokens for LLM</span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
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

// ─── Card state playground ────────────────────────────────────────────────────

interface StateEntry {
  id: string;
  label: string;
  detection: Detection;
  accent: keyof typeof CARD_TOKENS.spine.colors;
}

const sg_expired: Detection = {
  ...cuas_classified,
  id: 'sg-expired',
  status: 'expired' as const,
};

const STATE_GROUPS: { label: string; entries: StateEntry[] }[] = [
  {
    label: 'CUAS Lifecycle',
    entries: [
      { id: 'raw', label: 'Raw Detection', detection: cuas_raw, accent: 'detection' },
      { id: 'classified', label: 'Classified Drone', detection: cuas_classified, accent: 'detection' },
      { id: 'bird', label: 'Classified Bird', detection: cuas_classified_bird, accent: 'detection' },
      { id: 'mitigating', label: 'Mitigating', detection: cuas_mitigating, accent: 'mitigating' },
      { id: 'mitigated', label: 'Neutralized (BDA pending)', detection: cuas_mitigated, accent: 'active' },
      { id: 'resolved', label: 'Resolved', detection: cuas_bda_complete, accent: 'resolved' },
      { id: 'expired', label: 'Expired', detection: sg_expired, accent: 'expired' },
    ],
  },
  {
    label: 'Flow Variants',
    entries: [
      { id: 'suspicion', label: 'Suspicion', detection: flow1_suspicion, accent: 'suspicion' },
      { id: 'tracking', label: 'Tracking', detection: flow2_tracking, accent: 'tracking' },
      { id: 'drone-station', label: 'Drone On Station', detection: flow3_onStation, accent: 'active' },
      { id: 'mission', label: 'Mission Executing', detection: flow4_mission, accent: 'detection' },
      { id: 'mission-done', label: 'Mission Complete', detection: flow4_complete, accent: 'resolved' },
      { id: 'full-resolved', label: 'Fully Resolved (BDA)', detection: flow5_mitigated, accent: 'resolved' },
    ],
  },
];

const ALL_STATE_ENTRIES = STATE_GROUPS.flatMap((g) => g.entries);

function CardStatePlayground() {
  const [activeId, setActiveId] = useState(ALL_STATE_ENTRIES[0].id);
  const entry = ALL_STATE_ENTRIES.find((e) => e.id === activeId) ?? ALL_STATE_ENTRIES[0];
  const ctx: CardContext = { regulusEffectors: styleguideEffectors };
  const slots = useCardSlots(entry.detection, noopCallbacks, ctx);
  const activityStatus = getActivityStatus(entry.detection);
  const chipColor = ACTIVITY_STATUS_CHIP_COLOR[activityStatus] ?? 'gray';
  const chipLabel = ACTIVITY_STATUS_LABELS[activityStatus] ?? activityStatus;

  const iconName = entry.detection.flowType === 4
    ? 'ScanLine / Route'
    : entry.detection.type === 'uav'
      ? 'DroneCardIcon'
      : entry.detection.type === 'missile'
        ? 'MissileCardIcon'
        : 'Target';

  return (
    <div className="space-y-6">
      {/* State selector pills */}
      <div className="space-y-3">
        {STATE_GROUPS.map((group) => (
          <div key={group.label}>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.entries.map((e) => {
                const isActive = e.id === activeId;
                const dotColor = CARD_TOKENS.spine.colors[e.accent];
                return (
                  <button
                    key={e.id}
                    onClick={() => setActiveId(e.id)}
                    className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium cursor-pointer transition-[color,background-color,box-shadow] duration-150 ease-out active:scale-[0.97] ${
                      isActive
                        ? 'bg-white/[0.1] text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.15)]'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Live card preview */}
      <PreviewPanel tight>
        <div className="max-w-sm mx-auto">
          <StyleguideUnifiedCard detection={entry.detection} defaultOpen />
        </div>
      </PreviewPanel>

      {/* Visual properties annotation */}
      <div className="space-y-2.5">
        <h3 className="text-[13px] font-medium text-zinc-300">Computed Visual Properties</h3>
        <div className="overflow-x-auto rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-white/5" style={{ backgroundColor: SURFACE.level1 }}>
                <th className="py-2 px-3 text-right font-medium text-zinc-400">Property</th>
                <th className="py-2 px-3 text-right font-medium text-zinc-400">Value</th>
                <th className="py-2 px-3 text-right font-medium text-zinc-400">Visual</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">accent</td>
                <td className="py-2 px-3 font-mono text-zinc-300">{slots.accent}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                      style={{ backgroundColor: CARD_TOKENS.spine.colors[slots.accent] }}
                    />
                    <span className="font-mono text-zinc-400 text-[11px]">{CARD_TOKENS.spine.colors[slots.accent]}</span>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">completed</td>
                <td className="py-2 px-3 font-mono text-zinc-300">{slots.completed ? 'true' : 'false'}</td>
                <td className="py-2 px-3 text-zinc-400">
                  {slots.completed ? 'saturate(0.4) brightness(0.85)' : 'none'}
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">icon</td>
                <td className="py-2 px-3 font-mono text-zinc-300">{iconName}</td>
                <td className="py-2 px-3">
                  {slots.header.icon && (
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: CARD_TOKENS.iconBox.size,
                        height: CARD_TOKENS.iconBox.size,
                        borderRadius: CARD_TOKENS.iconBox.borderRadius,
                        backgroundColor: slots.header.iconBgActive
                          ? `${CARD_TOKENS.iconBox.activeBg}${Math.round(CARD_TOKENS.iconBox.activeBgOpacity * 255).toString(16).padStart(2, '0')}`
                          : CARD_TOKENS.iconBox.defaultBg,
                        color: slots.header.iconColor ?? (slots.header.iconBgActive ? CARD_TOKENS.iconBox.activeBg : undefined),
                      }}
                    >
                      <slots.header.icon size={CARD_TOKENS.iconBox.iconSize} aria-hidden />
                    </div>
                  )}
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">iconColor</td>
                <td className="py-2 px-3 font-mono text-zinc-300">{slots.header.iconColor ?? 'none'}</td>
                <td className="py-2 px-3">
                  {slots.header.iconColor && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                        style={{ backgroundColor: slots.header.iconColor }}
                      />
                      <span className="font-mono text-zinc-400 text-[11px]">{slots.header.iconColor}</span>
                    </div>
                  )}
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">iconBgActive</td>
                <td className="py-2 px-3 font-mono text-zinc-300">{slots.header.iconBgActive ? 'true' : 'false'}</td>
                <td className="py-2 px-3 text-zinc-400">
                  {slots.header.iconBgActive
                    ? `${CARD_TOKENS.iconBox.activeBg} @ ${CARD_TOKENS.iconBox.activeBgOpacity} opacity`
                    : CARD_TOKENS.iconBox.defaultBg}
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">closureType</td>
                <td className="py-2 px-3 font-mono text-zinc-300">{slots.closureType ?? 'null'}</td>
                <td className="py-2 px-3 text-zinc-400">
                  {slots.closureType === 'manual' ? 'Hand icon — manual closure' : slots.closureType === 'auto' ? 'Zap icon — auto closure' : '—'}
                </td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-2 px-3 font-mono text-sky-300/80">activityStatus</td>
                <td className="py-2 px-3 font-mono text-zinc-300">{activityStatus}</td>
                <td className="py-2 px-3">
                  <StatusChip label={chipLabel} color={chipColor} />
                </td>
              </tr>
              <tr className="border-b border-white/[0.03] last:border-0">
                <td className="py-2 px-3 font-mono text-sky-300/80">badge</td>
                <td className="py-2 px-3 font-mono text-zinc-300">
                  {slots.header.badge ? 'visible' : 'hidden'}
                </td>
                <td className="py-2 px-3">
                  {slots.header.badge ?? <span className="text-zinc-600">—</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function StyleguidePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<string>(NAV[0].items[0].id);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const navigateTo = useCallback((id: string) => {
    const parent = findParentItemForChild(id);
    setActiveItem(parent ? parent.id : id);
    setActiveAnchor(id);

    if (parent) {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash) navigateTo(hash);
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [navigateTo]);

  useEffect(() => {
    const navItem = NAV.flatMap(g => g.items).find(i => i.id === activeItem);
    const children = navItem?.children;
    if (!children) { setActiveAnchor(null); return; }

    observerRef.current?.disconnect();
    const visibleIds = new Set<string>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleIds.add(entry.target.id);
          else visibleIds.delete(entry.target.id);
        });
        const ordered = children.filter(c => visibleIds.has(c.id));
        if (ordered.length > 0) {
          setActiveAnchor(ordered[0].id);
          window.history.replaceState(null, '', `#${ordered[0].id}`);
        }
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: 0 },
    );

    requestAnimationFrame(() => {
      children.forEach(c => {
        const el = document.getElementById(c.id);
        if (el) observerRef.current?.observe(el);
      });
    });

    if (!activeAnchor && children.length > 0) setActiveAnchor(children[0].id);

    return () => observerRef.current?.disconnect();
  }, [activeItem]);

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
      <div dir="ltr" className="flex min-h-screen bg-[#09090b] text-white font-sans antialiased">

        {/* ── Sidebar ── */}
        <nav className="sticky top-0 h-screen w-60 shrink-0 overflow-y-auto py-6 px-4">
          <a href="#top" className="flex items-center gap-2 px-2 mb-8">
            <span className="text-[15px] font-semibold text-white tracking-tight">CUAS</span>
            <span className="text-[15px] font-normal text-white tracking-tight">Styleguide</span>
          </a>
          {NAV.map((group) => (
            <div key={group.label} className="mb-5">
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-white mb-2 px-2">{group.label}</span>
              <ul className="space-y-px">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => { e.preventDefault(); setActiveItem(item.id); window.history.replaceState(null, '', `#${item.id}`); }}
                      className={`block rounded-lg px-2 py-[6px] text-[13px] transition-colors duration-150 ${
                        activeItem === item.id
                          ? 'text-zinc-50 bg-white/[0.06]'
                          : 'text-white/60 font-medium hover:bg-white/[0.04] hover:text-zinc-300'
                      }`}
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
        <main id="top" className="flex-1 min-w-0 overflow-y-auto py-4 pr-4">
          <div
            className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e] min-h-[calc(100vh-2rem)]"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.02), 0 2px 8px rgba(0,0,0,0.2)' }}
          >
          <div className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-3xl space-y-10">

            {findGroupForId(activeItem)?.label === 'Foundations' && (
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-[28px] font-semibold tracking-tight text-zinc-50">Foundations</h2>
                  <p className="text-[15px] leading-relaxed text-zinc-400">
                    All design tokens — source files, computed values, and CSS variables — in one copy.
                  </p>
                </div>
                <CopyAllTokensButton />
              </div>
            )}

            {activeItem === 'layout-tokens' && (
            <ComponentSection id="layout-tokens" name="Layout Tokens" description="Sidebar dimensions and snap grid values used by the resizable layout shell.">
              <PreviewPanel>
                <TokenTable rows={[
                  { token: 'sidebarWidthPx', value: LAYOUT_TOKENS.sidebarWidthPx, note: 'Default sidebar width' },
                  { token: 'sidebarMinWidth', value: LAYOUT_TOKENS.sidebarMinWidth, note: 'Min resize bound' },
                  { token: 'sidebarMaxWidth', value: LAYOUT_TOKENS.sidebarMaxWidth, note: 'Max resize bound' },
                  { token: 'sidebarSnapInterval', value: LAYOUT_TOKENS.sidebarSnapInterval, note: 'Drag snap step' },
                ]} />
              </PreviewPanel>
            </ComponentSection>
            )}

            {activeItem === 'elevation' && (
            <ComponentSection id="elevation" name="Elevation System" description="Surfaces rise from a dark base (#141414) by mixing white overlays at increasing opacity. Click any level to copy its hex.">
              <PreviewPanel>
                <ElevationRamp />
              </PreviewPanel>
            </ComponentSection>
            )}

            {activeItem === 'card-tokens' && (
            <ComponentSection id="card-tokens" name="Card Tokens" description="All spacing, color, and typography tokens consumed by the card component family (TargetCard, CardHeader, CardActions, etc.).">
              <PreviewPanel>
                <div className="space-y-8">
                  <TokenSubSection title="Container">
                    <div className="flex flex-wrap gap-4 mb-3">
                      <ColorSwatch color={CARD_TOKENS.container.bgColor} label="bgColor" />
                    </div>
                    <TokenTable rows={[
                      { token: 'borderRadius', value: CARD_TOKENS.container.borderRadius, note: 'px' },
                      { token: 'borderWidth', value: CARD_TOKENS.container.borderWidth, note: 'px' },
                      { token: 'borderColor', value: CARD_TOKENS.container.borderColor },
                      { token: 'marginBottom', value: CARD_TOKENS.container.marginBottom, note: 'px — gap between cards' },
                      { token: 'completedOpacity', value: CARD_TOKENS.container.completedOpacity, note: 'Desaturated resolved cards' },
                    ]} />
                  </TokenSubSection>

                  <TokenSubSection title="Header">
                    <TokenTable rows={[
                      { token: 'paddingX', value: CARD_TOKENS.header.paddingX, note: 'px' },
                      { token: 'paddingY', value: CARD_TOKENS.header.paddingY, note: 'px' },
                      { token: 'gap', value: CARD_TOKENS.header.gap, note: 'px — between elements' },
                      { token: 'hoverBgOpacity', value: CARD_TOKENS.header.hoverBgOpacity, note: 'White overlay on hover' },
                      { token: 'selectedBgOpacity', value: CARD_TOKENS.header.selectedBgOpacity, note: 'White overlay when selected' },
                    ]} />
                  </TokenSubSection>

                  <TokenSubSection title="Selected Ring">
                    <div className="flex items-start gap-6 mb-3">
                      <div
                        className="w-20 h-14 rounded-lg"
                        style={{
                          backgroundColor: SURFACE.level1,
                          boxShadow: `0 0 0 ${CARD_TOKENS.selectedRing.ringWidth}px rgba(0,0,0,${CARD_TOKENS.selectedRing.ringOpacity})`,
                        }}
                      />
                    </div>
                    <TokenTable rows={[
                      { token: 'ringWidth', value: CARD_TOKENS.selectedRing.ringWidth, note: 'px' },
                      { token: 'ringColor', value: CARD_TOKENS.selectedRing.ringColor },
                      { token: 'ringOpacity', value: CARD_TOKENS.selectedRing.ringOpacity },
                    ]} />
                  </TokenSubSection>

                  <TokenSubSection title="Typography — Title & Subtitle">
                    <div className="flex items-baseline gap-6 mb-3 rounded-lg p-4" style={{ backgroundColor: SURFACE.level1 }}>
                      <span style={{ fontSize: CARD_TOKENS.title.fontSize, fontWeight: CARD_TOKENS.title.fontWeight, color: CARD_TOKENS.title.color }}>
                        Card Title (13px / 600)
                      </span>
                      <span style={{ fontSize: CARD_TOKENS.subtitle.fontSize, color: CARD_TOKENS.subtitle.color }}>
                        Subtitle (10px)
                      </span>
                    </div>
                    <TokenTable rows={[
                      { token: 'title.fontSize', value: CARD_TOKENS.title.fontSize, note: 'px' },
                      { token: 'title.fontWeight', value: CARD_TOKENS.title.fontWeight },
                      { token: 'title.color', value: CARD_TOKENS.title.color },
                      { token: 'subtitle.fontSize', value: CARD_TOKENS.subtitle.fontSize, note: 'px' },
                      { token: 'subtitle.color', value: CARD_TOKENS.subtitle.color },
                    ]} />
                  </TokenSubSection>

                  <TokenSubSection title="Icon Box">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className="flex items-center justify-center rounded-md"
                          style={{
                            width: CARD_TOKENS.iconBox.size,
                            height: CARD_TOKENS.iconBox.size,
                            borderRadius: CARD_TOKENS.iconBox.borderRadius,
                            backgroundColor: CARD_TOKENS.iconBox.defaultBg,
                          }}
                        >
                          <ShieldAlert size={CARD_TOKENS.iconBox.iconSize} className="text-zinc-300" />
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">default</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className="flex items-center justify-center rounded-md"
                          style={{
                            width: CARD_TOKENS.iconBox.size,
                            height: CARD_TOKENS.iconBox.size,
                            borderRadius: CARD_TOKENS.iconBox.borderRadius,
                            backgroundColor: CARD_TOKENS.iconBox.activeBg,
                            opacity: CARD_TOKENS.iconBox.activeBgOpacity,
                          }}
                        >
                          <ShieldAlert size={CARD_TOKENS.iconBox.iconSize} className="text-red-400" />
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">active</span>
                      </div>
                    </div>
                    <TokenTable rows={[
                      { token: 'size', value: CARD_TOKENS.iconBox.size, note: 'px — box width & height' },
                      { token: 'borderRadius', value: CARD_TOKENS.iconBox.borderRadius, note: 'px' },
                      { token: 'iconSize', value: CARD_TOKENS.iconBox.iconSize, note: 'px — inner icon' },
                      { token: 'defaultBg', value: CARD_TOKENS.iconBox.defaultBg },
                      { token: 'activeBg', value: CARD_TOKENS.iconBox.activeBg },
                      { token: 'activeBgOpacity', value: CARD_TOKENS.iconBox.activeBgOpacity },
                    ]} />
                  </TokenSubSection>

                  <TokenSubSection title="Content Area">
                    <div className="flex flex-wrap gap-4 mb-3">
                      <ColorSwatch color={CARD_TOKENS.content.bgColor} label="bgColor" />
                      <ColorSwatch color={CARD_TOKENS.content.borderColor} label="borderColor" />
                    </div>
                    <TokenTable rows={[
                      { token: 'paddingX', value: CARD_TOKENS.content.paddingX, note: 'px' },
                      { token: 'paddingY', value: CARD_TOKENS.content.paddingY, note: 'px' },
                    ]} />
                  </TokenSubSection>

                  <TokenSubSection title="Animation">
                    <TokenTable rows={[
                      { token: 'expandDuration', value: CARD_TOKENS.animation.expandDuration, note: 'seconds — expand/collapse' },
                      { token: 'chevronSize', value: CARD_TOKENS.animation.chevronSize, note: 'px' },
                    ]} />
                  </TokenSubSection>

                  <TokenSubSection title="Spine">
                    <div className="flex flex-wrap gap-4 mb-3">
                      {Object.entries(CARD_TOKENS.spine.colors).map(([name, color]) => (
                        <ColorSwatch key={name} color={color} label={name} />
                      ))}
                    </div>
                    <TokenTable rows={[
                      { token: 'width', value: CARD_TOKENS.spine.width, note: 'px — left accent bar' },
                    ]} />
                  </TokenSubSection>

                  <TokenSubSection title="Timeline">
                    <div className="flex items-center gap-6 mb-3">
                      {[
                        { label: 'dot', size: CARD_TOKENS.timeline.dotSize },
                        { label: 'active dot', size: CARD_TOKENS.timeline.activeDotSize },
                      ].map((d) => (
                        <div key={d.label} className="flex flex-col items-center gap-1.5">
                          <div className="rounded-full bg-zinc-400" style={{ width: d.size, height: d.size }} />
                          <span className="text-[10px] text-zinc-400 font-mono">{d.label} ({d.size}px)</span>
                        </div>
                      ))}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="bg-zinc-600 rounded-full" style={{ width: CARD_TOKENS.timeline.lineWidth, height: 24 }} />
                        <span className="text-[10px] text-zinc-400 font-mono">line ({CARD_TOKENS.timeline.lineWidth}px)</span>
                      </div>
                    </div>
                    <TokenTable rows={[
                      { token: 'dotSize', value: CARD_TOKENS.timeline.dotSize, note: 'px' },
                      { token: 'activeDotSize', value: CARD_TOKENS.timeline.activeDotSize, note: 'px' },
                      { token: 'lineWidth', value: CARD_TOKENS.timeline.lineWidth, note: 'px' },
                      { token: 'gap', value: CARD_TOKENS.timeline.gap, note: 'px' },
                    ]} />
                  </TokenSubSection>

                  <TokenSubSection title="Actions">
                    <TokenTable rows={[
                      { token: 'gap', value: CARD_TOKENS.actions.gap, note: 'px — between action buttons' },
                      { token: 'gridMinCols', value: CARD_TOKENS.actions.gridMinCols, note: 'Minimum grid columns' },
                    ]} />
                  </TokenSubSection>
                </div>
              </PreviewPanel>
            </ComponentSection>
            )}

            {activeItem === 'theme-vars' && (
            <ComponentSection id="theme-vars" name="CSS Theme Variables" description="Semantic color tokens defined as CSS custom properties in theme.css. The app uses dark mode — these map to Tailwind utility classes via the @theme inline block.">
              <PreviewPanel>
                <div className="space-y-8">
                  <TokenSubSection title="Core Colors (Dark)">
                    <div className="flex flex-wrap gap-4">
                      <CSSVarSwatch varName="--background" label="background" />
                      <CSSVarSwatch varName="--foreground" label="foreground" />
                      <CSSVarSwatch varName="--card" label="card" />
                      <CSSVarSwatch varName="--card-foreground" label="card-fg" />
                      <CSSVarSwatch varName="--popover" label="popover" />
                      <CSSVarSwatch varName="--popover-foreground" label="popover-fg" />
                    </div>
                  </TokenSubSection>

                  <TokenSubSection title="Interactive Colors">
                    <div className="flex flex-wrap gap-4">
                      <CSSVarSwatch varName="--primary" label="primary" />
                      <CSSVarSwatch varName="--primary-foreground" label="primary-fg" />
                      <CSSVarSwatch varName="--secondary" label="secondary" />
                      <CSSVarSwatch varName="--secondary-foreground" label="secondary-fg" />
                      <CSSVarSwatch varName="--muted" label="muted" />
                      <CSSVarSwatch varName="--muted-foreground" label="muted-fg" />
                      <CSSVarSwatch varName="--accent" label="accent" />
                      <CSSVarSwatch varName="--accent-foreground" label="accent-fg" />
                      <CSSVarSwatch varName="--destructive" label="destructive" />
                      <CSSVarSwatch varName="--destructive-foreground" label="destruct-fg" />
                    </div>
                  </TokenSubSection>

                  <TokenSubSection title="Border / Input / Ring">
                    <div className="flex flex-wrap gap-4">
                      <CSSVarSwatch varName="--border" label="border" />
                      <CSSVarSwatch varName="--input" label="input" />
                      <CSSVarSwatch varName="--ring" label="ring" />
                    </div>
                  </TokenSubSection>

                  <TokenSubSection title="Chart Palette">
                    <div className="flex flex-wrap gap-4">
                      <CSSVarSwatch varName="--chart-1" label="chart-1" />
                      <CSSVarSwatch varName="--chart-2" label="chart-2" />
                      <CSSVarSwatch varName="--chart-3" label="chart-3" />
                      <CSSVarSwatch varName="--chart-4" label="chart-4" />
                      <CSSVarSwatch varName="--chart-5" label="chart-5" />
                    </div>
                  </TokenSubSection>

                  <TokenSubSection title="Sidebar">
                    <div className="flex flex-wrap gap-4">
                      <CSSVarSwatch varName="--sidebar" label="sidebar" />
                      <CSSVarSwatch varName="--sidebar-foreground" label="sidebar-fg" />
                      <CSSVarSwatch varName="--sidebar-primary" label="sidebar-pri" />
                      <CSSVarSwatch varName="--sidebar-primary-foreground" label="sidebar-pri-fg" />
                      <CSSVarSwatch varName="--sidebar-accent" label="sidebar-acc" />
                      <CSSVarSwatch varName="--sidebar-accent-foreground" label="sidebar-acc-fg" />
                      <CSSVarSwatch varName="--sidebar-border" label="sidebar-brd" />
                      <CSSVarSwatch varName="--sidebar-ring" label="sidebar-ring" />
                    </div>
                  </TokenSubSection>

                  <TokenSubSection title="Radius Scale">
                    <div className="flex flex-wrap gap-6">
                      {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                        <div key={size} className="flex flex-col items-center gap-1.5">
                          <div
                            className="w-16 h-12 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
                            style={{ backgroundColor: SURFACE.level2, borderRadius: `var(--radius-${size})` }}
                          />
                          <span className="text-[10px] text-zinc-400 font-mono">radius-{size}</span>
                        </div>
                      ))}
                    </div>
                  </TokenSubSection>

                  <TokenSubSection title="Font Families">
                    <div className="space-y-3 rounded-lg p-4" style={{ backgroundColor: SURFACE.level1 }}>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1 block">Sans — Heebo</span>
                        <p className="font-sans text-base text-zinc-200">אבגדהו The quick brown fox jumps over the lazy dog — 0123456789</p>
                      </div>
                      <div className="border-t border-white/5 pt-3">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1 block">Mono — IBM Plex Mono</span>
                        <p className="font-mono text-base text-zinc-200">const x = 42; // 0123456789 → tabular-nums</p>
                      </div>
                    </div>
                  </TokenSubSection>

                  <TokenSubSection title="Typography Defaults">
                    <div className="space-y-2 rounded-lg p-4" style={{ backgroundColor: SURFACE.level1 }}>
                      <h1 className="text-zinc-200">h1 — 2xl / medium</h1>
                      <h2 className="text-zinc-200">h2 — xl / medium</h2>
                      <h3 className="text-zinc-200">h3 — lg / medium</h3>
                      <h4 className="text-zinc-200">h4 — base / medium</h4>
                      <p className="text-zinc-400 text-sm mt-2">Body text inherits base font-size (16px) from --font-size.</p>
                    </div>
                    <TokenTable rows={[
                      { token: '--font-size', value: '16px', note: 'Root html font-size' },
                      { token: '--font-weight-medium', value: '500', note: 'Headings, labels, buttons' },
                      { token: '--font-weight-normal', value: '400', note: 'Body, inputs' },
                    ]} />
                  </TokenSubSection>
                </div>
              </PreviewPanel>
            </ComponentSection>
            )}

            {activeItem === 'status-chip' && (
            <ComponentSection id="status-chip" name="StatusChip" description="Compact colored badge indicating operational status of a target or system.">
              <CodePreviewBlock name="StatusChip" description="Compact colored badge indicating operational status of a target or system." code={statusChipSrc}>
                <div className="flex flex-wrap items-center gap-3">
                  {(Object.keys(STATUS_CHIP_COLORS) as StatusChipColor[]).map((color) => (
                    <StatusChip key={color} label={color} color={color} />
                  ))}
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['StatusChip', 'STATUS_CHIP_COLORS', 'type StatusChipColor']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={statusChipSrc} name="StatusChip" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'label', type: 'string', description: 'Display text' },
                { name: 'color', type: 'StatusChipColor', default: '"green"', description: 'Semantic color variant' },
                { name: 'className', type: 'string', description: 'Additional Tailwind classes' },
              ]} />

              <SectionHeading>Color Variants</SectionHeading>
              <VariantGrid
                entries={Object.entries(STATUS_CHIP_COLORS).map(([key, val]) => ({ key, usage: val.usage }))}
                renderSample={(key) => <StatusChip label={key} color={key as StatusChipColor} />}
              />
            </ComponentSection>
            )}

            {activeItem === 'new-updates' && (
            <ComponentSection id="new-updates" name="NewUpdatesPill" description="Floating pill that appears above the list to surface new incoming detections.">
              <CodePreviewBlock name="NewUpdatesPill" description="Floating pill that appears above the list to surface new incoming detections." code={newUpdatesPillSrc}>
                <div className="flex flex-wrap items-center gap-4">
                  <NewUpdatesPill count={1} onClick={noop} />
                  <NewUpdatesPill count={5} onClick={noop} />
                  <NewUpdatesPill count={42} onClick={noop} />
                  <NewUpdatesPill count={147} onClick={noop} />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['NewUpdatesPill']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={newUpdatesPillSrc} name="NewUpdatesPill" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'count', type: 'number', description: 'Number of new updates to display' },
                { name: 'onClick', type: '() => void', description: 'Scroll-to-top handler' },
              ]} />
            </ComponentSection>
            )}

            {/* ────────────────────────────────────────────────────────────── */}
            {/*  PRIMITIVES — actions                                        */}
            {/* ────────────────────────────────────────────────────────────── */}

            {activeItem === 'action-button' && (
            <ComponentSection id="action-button" name="ActionButton" description="Tactical action trigger with variant, size, icon, and loading states. Used in card action rows and standalone controls.">
              <CodePreviewBlock name="ActionButton" description="Tactical action trigger with variant, size, icon, and loading states. Used in card action rows and standalone controls." code={actionButtonSrc}>
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton label="הפנה מצלמה" icon={Eye} variant="fill" size="md" />
                  <ActionButton label="ביטול" icon={Ban} variant="ghost" size="md" />
                  <ActionButton label="מחק" icon={Trash2} variant="danger" size="md" />
                  <ActionButton label="אזהרה" icon={AlertTriangle} variant="warning" size="md" />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['ActionButton', 'ACTION_BUTTON_VARIANTS', 'ACTION_BUTTON_SIZES', 'type ActionButtonVariant', 'type ActionButtonSize']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={actionButtonSrc} name="ActionButton" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'label', type: 'string', description: 'Button text' },
                { name: 'icon', type: 'React.ElementType', description: 'Lucide icon component' },
                { name: 'variant', type: 'ActionButtonVariant', default: '"fill"', description: 'Visual treatment' },
                { name: 'size', type: 'ActionButtonSize', default: '"md"', description: 'Height and padding scale' },
                { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable interaction' },
                { name: 'loading', type: 'boolean', default: 'false', description: 'Show spinner, disable click' },
                { name: 'onClick', type: '(e: MouseEvent) => void', description: 'Click handler' },
              ]} />

              <SectionHeading>Variants</SectionHeading>
              <VariantGrid
                entries={(Object.keys(ACTION_BUTTON_VARIANTS) as ActionButtonVariant[]).map((key) => ({ key }))}
                renderSample={(key) => <ActionButton label={key} icon={Eye} variant={key as ActionButtonVariant} size="sm" />}
              />

              <SectionHeading>Sizes</SectionHeading>
              <VariantGrid
                entries={Object.keys(ACTION_BUTTON_SIZES).map((key) => ({ key }))}
                renderSample={(key) => <ActionButton label={key} icon={Eye} variant="fill" size={key as keyof typeof ACTION_BUTTON_SIZES} />}
              />

              <SectionHeading>Examples</SectionHeading>
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
            )}

            {activeItem === 'split-action' && (
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['SplitActionButton', 'SPLIT_BUTTON_VARIANTS', 'type SplitButtonVariant']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={splitActionButtonSrc} name="SplitActionButton" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'label', type: 'string', description: 'Primary button text' },
                { name: 'badge', type: 'string', description: 'Inline chip displayed after the label (e.g. effector name)' },
                { name: 'icon', type: 'React.ElementType', description: 'Lucide icon' },
                { name: 'variant', type: 'SplitButtonVariant', default: '"fill"', description: 'Color treatment' },
                { name: 'size', type: 'SplitButtonSize', default: '"sm"', description: 'Height scale' },
                { name: 'dropdownItems', type: 'SplitDropdownItem[]', description: 'Sub-action menu items' },
                { name: 'dropdownGroups', type: 'SplitDropdownGroup[]', description: 'Grouped dropdown sections with labels and separators' },
                { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable both segments' },
                { name: 'loading', type: 'boolean', default: 'false', description: 'Show spinner on primary' },
                { name: 'dimDisabledShell', type: 'boolean', default: 'true', description: 'Reduce opacity when disabled' },
                { name: 'onHover', type: '(hovering: boolean) => void', description: 'Fires on mouseEnter/Leave of primary segment — used to highlight effector on map' },
              ]} />

              <SectionHeading>Variants</SectionHeading>
              <VariantGrid
                entries={Object.keys(SPLIT_BUTTON_VARIANTS).map((key) => ({ key }))}
                renderSample={(key) => (
                  <div className="w-36">
                    <SplitActionButton label={key} icon={Zap} variant={key as keyof typeof SPLIT_BUTTON_VARIANTS} size="sm" onClick={noop} dropdownItems={[{ id: '1', label: 'Option', onClick: noop }]} />
                  </div>
                )}
              />

              <SectionHeading>Examples</SectionHeading>
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
            )}

            {/* ────────────────────────────────────────────────────────────── */}
            {/*  PRIMITIVES — layout                                         */}
            {/* ────────────────────────────────────────────────────────────── */}

            {activeItem === 'accordion' && (
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['AccordionSection']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={accordionSectionSrc} name="AccordionSection" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'title', type: 'ReactNode', description: 'Section heading' },
                { name: 'icon', type: 'React.ElementType | null', description: 'Leading icon' },
                { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Start expanded' },
                { name: 'headerAction', type: 'ReactNode', description: 'Right-side action slot (badge, button)' },
              ]} />
            </ComponentSection>
            )}

            {activeItem === 'telemetry' && (
            <ComponentSection id="telemetry" name="TelemetryRow" description="Single telemetry metric display with icon, label, and monospace value. Laid out in a 3-column grid — rows wrap automatically based on item count.">
              <CodePreviewBlock name="TelemetryRow" description="Single telemetry metric display with icon, label, and monospace value. Laid out in a 3-column grid." tight code={telemetryRowSrc}>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3" style={{ backgroundColor: SURFACE.level1 }}>
                  <TelemetryRow label="גובה" value="120m" icon={Navigation} />
                  <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
                  <TelemetryRow label="כיוון" value="270°" icon={Compass} />
                  <TelemetryRow label="מרחק" value="1.2 km" icon={MapPin} />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['TelemetryRow']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={telemetryRowSrc} name="TelemetryRow" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'label', type: 'string', description: 'Metric name' },
                { name: 'value', type: 'string', description: 'Metric value (monospace, tabular-nums)' },
                { name: 'icon', type: 'React.ElementType', description: 'Leading icon' },
              ]} />

              <SectionHeading>Examples</SectionHeading>
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
            )}

            {activeItem === 'card-header' && (
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardHeader']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardHeaderSrc} name="CardHeader" />

              <SectionHeading>API Reference</SectionHeading>
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

              <SectionHeading>Examples</SectionHeading>
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
            )}

            {activeItem === 'card-media' && (
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardMedia', 'MEDIA_BADGE_CONFIG', 'type MediaBadgeType']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardMediaSrc} name="CardMedia" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'src', type: 'string', description: 'Image or video URL' },
                { name: 'type', type: '"video" | "image"', default: '"image"', description: 'Media type' },
                { name: 'badge', type: 'MediaBadgeType | null', description: 'Overlay badge icon' },
                { name: 'showControls', type: 'boolean', default: 'false', description: 'Show video playback controls' },
                { name: 'trackingLabel', type: 'string', description: 'Bottom-left tracking status label' },
              ]} />

              <SectionHeading>Badge Types</SectionHeading>
              <VariantGrid
                entries={Object.entries(MEDIA_BADGE_CONFIG).map(([key, val]) => ({ key, usage: val.usage }))}
                renderSample={(key) => {
                  const bc = MEDIA_BADGE_CONFIG[key as keyof typeof MEDIA_BADGE_CONFIG];
                  const Icon = bc.icon;
                  return <Icon size={20} className={bc.color} />;
                }}
              />
            </ComponentSection>
            )}

            {activeItem === 'card-actions' && (
            <ComponentSection id="card-actions" name="CardActions" description="Action bar for TargetCard. Composes ActionButton, SplitActionButton, and the confirm pattern. Grouped effector/investigation layout, flat grid, and double-confirm dialogs.">
              <CodePreviewBlock name="CardActions" description="Action bar for TargetCard. Composes ActionButton, SplitActionButton, and the confirm pattern." tight code={cardActionsSrc}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardActions actions={sampleActions} />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardActions']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardActionsSrc} name="CardActions" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'actions', type: 'CardAction[]', description: 'Action definitions with group, variant, confirm' },
                { name: 'layout', type: '"row" | "grid" | "stack"', default: '"row"', description: 'Fallback layout when no groups' },
              ]} />

              <SectionHeading>Examples</SectionHeading>
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
            )}

            {activeItem === 'card-details' && (
            <ComponentSection id="card-details" name="CardDetails" description="Collapsible telemetry accordion with a copy-all button. Composes AccordionSection and TelemetryRow in a grid layout for metrics.">
              <CodePreviewBlock name="CardDetails" description="Collapsible telemetry accordion with a copy-all button; uses AccordionSection and TelemetryRow." tight code={cardDetailsSrc}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardDetails rows={sampleDetailRows} defaultOpen />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardDetails']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardDetailsSrc} name="CardDetails" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'rows', type: 'DetailRow[]', description: 'Array of { label, value, icon }' },
                { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Start expanded' },
              ]} />
            </ComponentSection>
            )}

            {activeItem === 'card-sensors' && (
            <ComponentSection id="card-sensors" name="CardSensors" description="Lists detecting sensors for a target with type, distance, and timestamp. Supports read-only and interactive modes.">
              <CodePreviewBlock name="CardSensors" description="Lists detecting sensors for a target with type, distance, and timestamp. Supports read-only and interactive modes." tight code={cardSensorsSrc}>
                <div className="max-w-sm rounded-lg overflow-hidden p-1" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardSensors sensors={sampleSensors} />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardSensors']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardSensorsSrc} name="CardSensors" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'sensors', type: 'CardSensor[]', description: 'Array of sensor entries' },
                { name: 'onSensorClick', type: '(id: string) => void', description: 'Makes rows clickable buttons' },
                { name: 'onSensorHover', type: '(id: string | null) => void', description: 'Hover callback for map highlighting' },
              ]} />

              <SectionHeading>Examples</SectionHeading>
              <ExampleBlock title="Clickable (interactive)" tight>
                <div className="max-w-sm rounded-lg overflow-hidden p-1" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardSensors sensors={sampleSensors} onSensorClick={(id) => console.log('sensor clicked:', id)} />
                </div>
              </ExampleBlock>
            </ComponentSection>
            )}

            {activeItem === 'card-log' && (
            <ComponentSection id="card-log" name="CardLog" description="Chronological event log accordion with newest-first ordering and expand-all.">
              <CodePreviewBlock name="CardLog" description="Chronological event log accordion with newest-first ordering and expand-all." tight code={cardLogSrc}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardLog entries={sampleLogEntries} maxVisible={4} defaultOpen />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardLog']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardLogSrc} name="CardLog" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'entries', type: 'LogEntry[]', description: 'Array of { time, label }' },
                { name: 'maxVisible', type: 'number', default: '5', description: 'Entries shown before "show more"' },
                { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Start accordion expanded' },
              ]} />
            </ComponentSection>
            )}

            {activeItem === 'card-closure' && (
            <ComponentSection id="card-closure" name="CardClosure" description="Outcome selection grid for closing a detection event. Operator picks the resolution reason.">
              <CodePreviewBlock name="CardClosure" description="Outcome selection grid for closing a detection event. Operator picks the resolution reason." tight code={cardClosureSrc}>
                <div className="max-w-sm rounded-lg overflow-hidden" style={{ backgroundColor: SURFACE.level1 }}>
                  <CardClosure outcomes={sampleClosureOutcomes} onSelect={(id) => console.log('closure:', id)} />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['CardClosure']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={cardClosureSrc} name="CardClosure" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'outcomes', type: 'ClosureOutcome[]', description: 'Array of { id, label, icon }' },
                { name: 'onSelect', type: '(outcomeId: string) => void', description: 'Selection handler' },
                { name: 'title', type: 'string', default: '"סגירת אירוע — בחר סיבה"', description: 'Section heading' },
              ]} />
            </ComponentSection>
            )}

            {activeItem === 'card-states' && (
            <ComponentSection id="card-states" name="Card States" description="Interactive playground to explore how each detection lifecycle state affects the card's visual treatment — spine accent, icon design, ring, opacity, status chip, and closure type.">
              <CardStatePlayground />
            </ComponentSection>
            )}

            {activeItem === 'target-card' && (
            <ComponentSection id="target-card" name="TargetCard" description="The core card shell. Composes CardHeader with slot children via the useCardSlots hook. These examples use real Detection mock data and the same composition as the main app.">
              <CodePreviewBlock name="TargetCard" description="The core card shell. Composes CardHeader with slot children via the useCardSlots hook." tight code={targetCardSrc}>
                <div className="max-w-sm mx-auto">
                  <StyleguideUnifiedCard detection={cuas_classified} defaultOpen />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['TargetCard']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={targetCardSrc} name="TargetCard" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'header', type: 'ReactNode', description: 'CardHeader element' },
                { name: 'children', type: 'ReactNode', description: 'Slot components (media, actions, timeline, details, sensors, log, closure)' },
                { name: 'open', type: 'boolean', description: 'Expanded state' },
                { name: 'onToggle', type: '() => void', description: 'Toggle handler' },
                { name: 'accent', type: 'ThreatAccent', default: '"idle"', description: 'Spine color key' },
                { name: 'completed', type: 'boolean', description: 'Desaturate card' },
              ]} />

              <SectionHeading>Examples</SectionHeading>
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
            )}

            {activeItem === 'filter-bar' && (
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

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/primitives" names={['FilterBar']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={filterBarSrc} name="FilterBar" />

              <SectionHeading>API Reference</SectionHeading>
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
            )}

            {activeItem === 'devices-panel' && (
            <ComponentSection id="devices-panel" name="DevicesPanel" description="Right-hand sidebar listing all connected field devices grouped by type. Supports search, type-filter isolation, device expansion with stats grid, camera preview with presets, ECM jam activation, mute with 30-min countdown, drone wipers/calibration, and drag-to-camera-viewer for camera rows.">
              <CodePreviewBlock name="DevicesPanel" description="Full interactive panel — try searching, filtering by type, expanding rows, and clicking actions." tight code={devicesPanelSrc}>
                <div className="relative mx-auto overflow-hidden rounded-lg border border-white/10" style={{ width: LAYOUT_TOKENS.sidebarWidthPx, height: 400 }}>
                  <DevicesPanel open onClose={() => {}} onFlyTo={() => {}} noTransition />
                </div>
              </CodePreviewBlock>

              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/shared/components/DevicesPanel" names={['DevicesPanel']} />

              <SectionHeading>Usage</SectionHeading>
              <UsageBlock code={devicesPanelSrc} name="DevicesPanel" />

              <SectionHeading>API Reference</SectionHeading>
              <PropsTable items={[
                { name: 'open', type: 'boolean', description: 'Controls sidebar visibility (slide in/out)' },
                { name: 'onClose', type: '() => void', description: 'Called when the X close button is clicked' },
                { name: 'onFlyTo', type: '(lat, lon) => void', description: 'Called when "מרכז במפה" is clicked on an expanded device' },
                { name: 'onDeviceHover', type: '(id | null) => void', description: 'Called on row mouse enter/leave for map highlight sync' },
                { name: 'onJamActivate', type: '(jammerId) => void', description: 'Called when the ECM jam button is clicked on an effector device' },
                { name: 'noTransition', type: 'boolean', default: 'false', description: 'Skip the slide-in CSS transition (useful for styleguide / tests)' },
                { name: 'width', type: 'number', default: 'LAYOUT_TOKENS.sidebarWidthPx', description: 'Override the default sidebar width' },
                { name: 'focusedDeviceId', type: 'string | null', default: 'undefined', description: 'Auto-expand this device, ensure its type filter is active, clear search, and scroll it into view' },
              ]} />

              <SectionHeading>Examples</SectionHeading>
              {/* ── Empty state ─────────────────────────────────── */}
              <ExampleBlock id="devices-empty" title="Empty state" tight>
                <StyleguideDeviceTile label="When no devices match the current search or filter, the panel shows this placeholder.">
                  <div className="flex flex-col gap-2 px-4 pt-3 pb-2 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-medium text-white uppercase tracking-wider">מכשירים (0)</h2>
                      <div className="p-2 -m-1 rounded text-zinc-500"><X size={14} /></div>
                    </div>
                    <div className="relative">
                      <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                      <div className="w-full bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded text-[12px] text-zinc-600 pr-7 pl-7 py-1.5">חיפוש...</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[CameraIcon, RadarIcon, DroneHiveIcon, SensorIcon, LauncherIcon, LidarIcon].map((Icon, i) => (
                        <div key={i} className="p-2 rounded text-white hover:text-zinc-300 hover:bg-white/[0.06]">
                          <Icon size={20} fill="currentColor" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="px-3 py-8 text-center text-[12px] text-zinc-600">אין מכשירים תואמים</div>
                </StyleguideDeviceTile>
              </ExampleBlock>

              {/* ── Header ──────────────────────────────────────── */}
              <ExampleBlock id="devices-header" title="Header" tight>
                <StyleguideDeviceTile label="Panel title with device count and close button.">
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <h2 className="text-xs font-medium text-white uppercase tracking-wider">מכשירים (16)</h2>
                    <button className="p-2 -m-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </StyleguideDeviceTile>
              </ExampleBlock>

              {/* ── Search & type filters ───────────────────────── */}
              <ExampleBlock id="devices-search" title="Search & type filters" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Default state — all device types active, search empty.">
                    <div className="flex flex-col gap-2 px-4 py-3">
                      <div className="relative">
                        <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        <div className="w-full bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded text-[12px] text-zinc-600 pr-7 pl-7 py-1.5">חיפוש...</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[CameraIcon, RadarIcon, DroneHiveIcon, SensorIcon, LauncherIcon, LidarIcon].map((Icon, i) => (
                          <div key={i} className="p-2 rounded text-white hover:text-zinc-300 hover:bg-white/[0.06]">
                            <Icon size={20} fill="currentColor" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Isolated filter — only cameras selected. 'ניקוי' reset button appears.">
                    <div className="flex flex-col gap-2 px-4 py-3">
                      <div className="relative">
                        <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        <div className="w-full bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded text-[12px] text-zinc-300 pr-7 pl-7 py-1.5">MAGOS</div>
                        <button className="absolute left-1 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300">
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="p-2 rounded bg-white/15 text-white ring-1 ring-white/30">
                          <CameraIcon size={20} fill="currentColor" />
                        </div>
                        {[RadarIcon, DroneHiveIcon, SensorIcon, LauncherIcon, LidarIcon].map((Icon, i) => (
                          <div key={i} className="p-2 rounded text-white hover:text-zinc-300 hover:bg-white/[0.06]">
                            <Icon size={20} fill="currentColor" />
                          </div>
                        ))}
                        <button className="mr-auto px-2 py-1 rounded text-[11px] text-white/70 hover:text-zinc-300 hover:bg-white/[0.06]">
                          ניקוי
                        </button>
                      </div>
                    </div>
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>

              {/* ── Group header ────────────────────────────────── */}
              <ExampleBlock title="Group header" tight>
                <StyleguideDeviceTile label="Each device type gets a grouped section header with count.">
                  <div className="px-4 py-1.5 text-xs font-normal uppercase tracking-wider text-white border-b border-white/5 bg-white/5">
                    מצלמות (3)
                  </div>
                </StyleguideDeviceTile>
              </ExampleBlock>

              {/* ── Device row — collapsed states ──────────────── */}
              <ExampleBlock id="devices-rows" title="Device row — collapsed states" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Normal — camera device with battery indicator.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06] hover:bg-white/[0.04] cursor-grab">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <CameraIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-zinc-300">PTZ Camera (North)</span>
                          <span className="flex items-center gap-1.5 text-[11px] font-['Heebo'] tabular-nums text-white/50">
                            <StyleguideBatteryIcon pct={18} />
                            18%
                          </span>
                        </div>
                      </div>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Malfunctioning — orange icon, warning triangle, connection dot.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06] hover:bg-white/[0.04] cursor-pointer">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-orange-900/40">
                        <SensorIcon size={20} fill="#f97316" />
                        <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-zinc-950 bg-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-orange-300">Magos (South)</span>
                          <AlertTriangle size={11} className="text-orange-400 shrink-0" />
                        </div>
                      </div>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Muted — BellOff icon with 30-min countdown timer.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06] bg-white/[0.04] cursor-pointer">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <RadarIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-zinc-300">RADA ieMHR</span>
                          <span className="flex items-center gap-1 text-xs font-mono tabular-nums text-white">
                            <BellOff size={12} className="text-white" />
                            28:42
                          </span>
                        </div>
                      </div>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="ECM row — jam button inline on the collapsed row.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right border-b border-white/[0.06] hover:bg-white/[0.04] cursor-pointer">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <SensorIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium text-zinc-300">Regulus North</span>
                        <div className="text-[11px] font-mono tabular-nums text-white/50">1.5km</div>
                      </div>
                      <button className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)]">
                        <StyleguideJamIcon size={12} />
                        הפעל
                      </button>
                    </div>
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>

              {/* ── Connection state dots ───────────────────────── */}
              <ExampleBlock title="Connection state dots" tight>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { label: 'Warning (אזהרה)', color: 'bg-amber-400' },
                    { label: 'Error (שגיאה)', color: 'bg-red-400' },
                    { label: 'Offline (לא מקוון)', color: 'bg-zinc-500' },
                  ] as const).map(({ label, color }) => (
                    <div key={label} className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-4">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center bg-white/10">
                        <SensorIcon size={20} fill="white" />
                        <span className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-zinc-950 ${color}`} />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">{label}</span>
                    </div>
                  ))}
                </div>
              </ExampleBlock>

              {/* ── Battery indicator ───────────────────────────── */}
              <ExampleBlock title="Battery indicator" tight>
                <div className="grid grid-cols-4 gap-3">
                  {([
                    { pct: 18, label: 'Critical' },
                    { pct: 35, label: 'Low' },
                    { pct: 63, label: 'Medium' },
                    { pct: 91, label: 'Good' },
                  ] as const).map(({ pct, label }) => (
                    <div key={pct} className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-4">
                      <span className="flex items-center gap-1.5 text-[11px] font-['Heebo'] tabular-nums text-white/50">
                        <StyleguideBatteryIcon pct={pct} />
                        {pct}%
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">{label}</span>
                    </div>
                  ))}
                </div>
              </ExampleBlock>

              {/* ── Expanded — Camera device ────────────────────── */}
              <ExampleBlock id="devices-camera" title="Expanded — Camera device" tight>
                <StyleguideDeviceTile label="Camera rows expand to show preset tabs, live preview, stats grid, and action bar. Camera rows are draggable to the viewer panel.">
                  <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right bg-white/[0.04] border-b border-white/[0.06] cursor-grab">
                    <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                      <CameraIcon size={20} fill="white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-zinc-300">PTZ Camera (North)</span>
                        <span className="flex items-center gap-1.5 text-[11px] font-['Heebo'] tabular-nums text-white/50">
                          <StyleguideBatteryIcon pct={18} />
                          18%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col bg-white/[0.03]">
                    <div className="flex items-center gap-0 px-3 border-b border-white/[0.06]">
                      {['רגיל', 'לילה', 'זום'].map((tab, i) => (
                        <button key={tab} className={`px-3 py-2 text-[12px] font-medium border-b-2 ${i === 0 ? 'text-white border-white' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div className="relative w-full h-[200px] overflow-hidden bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera size={24} className="text-white/20" />
                      </div>
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
                        <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[9px] font-medium text-white/90 uppercase tracking-wide">Live</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3">
                      {[
                        { l: 'מיקום', v: '32.4700, 35.0050' },
                        { l: 'כיוון', v: '45°' },
                        { l: 'שדה ראייה', v: '120°' },
                        { l: 'תקינות', v: 'תקין', c: 'text-emerald-400' },
                        { l: 'סוללה', v: '18%', c: 'text-red-400' },
                      ].map(r => (
                        <div key={r.l} className="flex flex-col gap-1 text-xs">
                          <span className="text-white/60 text-[10px]">{r.l}</span>
                          <span className={`font-sans tabular-nums text-xs ${r.c ?? 'text-white'}`}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10">
                        <MapPin size={12} />
                        מרכז במפה
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10">
                        <BellOff size={12} />
                        השתק
                      </button>
                    </div>
                  </div>
                </StyleguideDeviceTile>
              </ExampleBlock>

              {/* ── Expanded — ECM device (jam button states) ──── */}
              <ExampleBlock id="devices-ecm" title="Expanded — ECM device (jam button states)" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Ready — jam button enabled.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right bg-white/[0.04] border-b border-white/[0.06]">
                      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <SensorIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium text-zinc-300">Regulus North</span>
                        <div className="text-[11px] font-mono tabular-nums text-white/50">1.5km</div>
                      </div>
                      <button className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)]">
                        <StyleguideJamIcon size={12} />
                        הפעל
                      </button>
                    </div>
                    <div className="flex flex-col bg-white/[0.03]">
                      <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3">
                        {[
                          { l: 'מיקום', v: '32.4650, 35.0020' },
                          { l: 'כיסוי', v: '1,500m' },
                          { l: 'תקינות', v: 'תקין', c: 'text-emerald-400' },
                        ].map(r => (
                          <div key={r.l} className="flex flex-col gap-1 text-xs">
                            <span className="text-white/60 text-[10px]">{r.l}</span>
                            <span className={`font-sans tabular-nums text-xs ${r.c ?? 'text-white'}`}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06]">
                          <MapPin size={12} />
                          מרכז במפה
                        </button>
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06]">
                          <BellOff size={12} />
                          השתק
                        </button>
                      </div>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Active — jam already running, button shows active state.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right bg-white/[0.04] border-b border-white/[0.06]">
                      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                        <SensorIcon size={20} fill="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium text-zinc-300">Regulus East</span>
                      </div>
                      <button disabled className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium opacity-40 cursor-not-allowed bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)]">
                        <StyleguideJamIcon size={12} />
                        שיבוש פעיל
                      </button>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Malfunctioning — jam disabled, device in error state.">
                    <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right bg-white/[0.04] border-b border-white/[0.06]">
                      <div className="relative w-8 h-8 rounded flex items-center justify-center shrink-0 bg-orange-900/40">
                        <SensorIcon size={20} fill="#f97316" />
                        <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-zinc-950 bg-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-orange-300">Regulus South</span>
                          <AlertTriangle size={11} className="text-orange-400 shrink-0" />
                        </div>
                      </div>
                      <button disabled className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium opacity-40 cursor-not-allowed bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)]">
                        <StyleguideJamIcon size={12} />
                        הפעל
                      </button>
                    </div>
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>

              {/* ── Expanded — Drone device ─────────────────────── */}
              <ExampleBlock id="devices-drone" title="Expanded — Drone device" tight>
                <StyleguideDeviceTile label="Drone rows show altitude, wipers toggle, and calibration button with three states.">
                  <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right bg-white/[0.04] border-b border-white/[0.06] cursor-pointer">
                    <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white/10">
                      <svg width={20} height={20} viewBox="0 0 28 32" fill="none"><path d="M23.334 15.7502L9.33696 0.583495L5.86139 4.0835L10.5007 11.0835L9.32456 15.7502L10.5007 20.4168L5.86139 27.4168L9.32456 30.6801L23.334 15.7502Z" fill="white" stroke="#0a0a0a" strokeWidth="1"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium text-zinc-300">סיור-3</span>
                    </div>
                  </div>
                  <div className="flex flex-col bg-white/[0.03]">
                    <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3">
                      {[
                        { l: 'מיקום', v: '32.4700, 35.0050' },
                        { l: 'גובה', v: '80 מ׳' },
                        { l: 'תקינות', v: 'תקין', c: 'text-emerald-400' },
                      ].map(r => (
                        <div key={r.l} className="flex flex-col gap-1 text-xs">
                          <span className="text-white/60 text-[10px]">{r.l}</span>
                          <span className={`font-sans tabular-nums text-xs ${r.c ?? 'text-white'}`}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06]">
                        <MapPin size={12} />
                        מרכז במפה
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06]">
                        <BellOff size={12} />
                        השתק
                      </button>
                      <div className="w-px h-5 bg-white/[0.08] mx-0.5" />
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-white/60">מגבים</span>
                        <div className="h-[18px] w-8 rounded-full bg-white/10 relative">
                          <div className="absolute left-[2px] top-[2px] size-[14px] rounded-full bg-white/60 transition-transform" />
                        </div>
                      </div>
                      <button className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06]">
                        <Wrench size={12} />
                        כיול
                      </button>
                    </div>
                  </div>
                </StyleguideDeviceTile>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {([
                    { label: 'Idle', icon: <Wrench size={12} />, text: 'כיול' },
                    { label: 'Running', icon: <Loader2 size={12} className="animate-spin" />, text: 'מכייל...' },
                    { label: 'Done', icon: <Check size={12} className="text-emerald-400" />, text: 'הושלם' },
                  ] as const).map(({ label, icon, text }) => (
                    <div key={label} className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-4">
                      <button disabled={label !== 'Idle'} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed">
                        {icon}
                        {text}
                      </button>
                      <span className="text-[10px] font-mono text-zinc-400">{label}</span>
                    </div>
                  ))}
                </div>
              </ExampleBlock>

              {/* ── Action bar ──────────────────────────────────── */}
              <ExampleBlock id="devices-actions" title="Action bar" tight>
                <div className="space-y-4">
                  <StyleguideDeviceTile label="Default state — fly-to and mute buttons.">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90">
                        <MapPin size={12} />
                        מרכז במפה
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90">
                        <BellOff size={12} />
                        השתק
                      </button>
                    </div>
                  </StyleguideDeviceTile>

                  <StyleguideDeviceTile label="Muted state — amber highlight on the mute button.">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90">
                        <MapPin size={12} />
                        מרכז במפה
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25">
                        <BellOff size={12} />
                        בטל השתקה
                      </button>
                    </div>
                  </StyleguideDeviceTile>
                </div>
              </ExampleBlock>
            </ComponentSection>
            )}

            {activeItem === 'map-icons' && (
            <ComponentSection id="map-icons" name="MapIcons" description="Tactical map icons (TacticalMap.tsx) and card-scale icons (MapIcons.tsx). SVGs are available under /icons with filenames matching each React export.">
              <p className="text-[13px] leading-relaxed text-zinc-500">
                Download individual <span className="font-mono text-zinc-400">.svg</span> files named after the component (
                <span className="font-mono text-zinc-400">CameraIcon.svg</span>
                , etc.). Tactical assets use white fill and black stroke like the map; card assets use{' '}
                <span className="font-mono text-zinc-400">currentColor</span>. When you change path data in code, update the matching file under{' '}
                <span className="font-mono text-zinc-400">public/icons/</span>.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void downloadAllStyleguideIcons()}
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/80"
                >
                  Download all SVGs
                </button>
                <span className="text-[11px] text-zinc-600">Browsers may limit bulk saves; use per-file links if some downloads are blocked.</span>
              </div>
              <SectionHeading>Import</SectionHeading>
              <ImportBlock path="@/shared/components/TacticalMap" names={['CameraIcon', 'RadarIcon', 'SensorIcon', 'DroneIcon', 'DroneHiveIcon', 'LidarIcon', 'LauncherIcon', 'MissileIcon']} />

              <SectionHeading>Preview</SectionHeading>
              <CodePreviewBlock name="MapIcons" description="Full icon catalog — map-layer icons from TacticalMap and card-layer icons from MapIcons. All support a size prop." code={tacticalMapSrc}>
                <div className="space-y-8">
                  <div>
                    <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-zinc-400">TacticalMap.tsx — /icons/tactical/</h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      <StyleguideIconDownloadTile label="CameraIcon" subdir="tactical" fileName="CameraIcon.svg">
                        <CameraIcon size={28} fill="white" />
                      </StyleguideIconDownloadTile>
                      <StyleguideIconDownloadTile label="SensorIcon" subdir="tactical" fileName="SensorIcon.svg">
                        <SensorIcon size={28} fill="white" />
                      </StyleguideIconDownloadTile>
                      <StyleguideIconDownloadTile label="RadarIcon" subdir="tactical" fileName="RadarIcon.svg">
                        <RadarIcon size={28} fill="white" />
                      </StyleguideIconDownloadTile>
                      <StyleguideIconDownloadTile label="LidarIcon" subdir="tactical" fileName="LidarIcon.svg">
                        <LidarIcon size={28} fill="white" />
                      </StyleguideIconDownloadTile>
                      <StyleguideIconDownloadTile label="LauncherIcon" subdir="tactical" fileName="LauncherIcon.svg">
                        <LauncherIcon size={28} fill="white" />
                      </StyleguideIconDownloadTile>
                      <StyleguideIconDownloadTile label="DroneHiveIcon" subdir="tactical" fileName="DroneHiveIcon.svg">
                        <DroneHiveIcon size={28} fill="white" />
                      </StyleguideIconDownloadTile>
                      <StyleguideIconDownloadTile label="DroneIcon" subdir="tactical" fileName="DroneIcon.svg">
                        <DroneIcon />
                      </StyleguideIconDownloadTile>
                      <StyleguideIconDownloadTile label="DroneIcon (enemy)" subdir="tactical" fileName="DroneIcon-enemy.svg">
                        <DroneIcon color="#ef4444" />
                      </StyleguideIconDownloadTile>
                      <StyleguideIconDownloadTile label="MissileIcon" subdir="tactical" fileName="MissileIcon.svg">
                        <MissileIcon />
                      </StyleguideIconDownloadTile>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-zinc-400">MapIcons.tsx — /icons/card/</h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      <StyleguideIconDownloadTile label="DroneCardIcon" subdir="card" fileName="DroneCardIcon.svg">
                        <DroneCardIcon size={28} />
                      </StyleguideIconDownloadTile>
                      <StyleguideIconDownloadTile label="MissileCardIcon" subdir="card" fileName="MissileCardIcon.svg">
                        <MissileCardIcon size={28} />
                      </StyleguideIconDownloadTile>
                    </div>
                  </div>
                </div>
              </CodePreviewBlock>
            </ComponentSection>
            )}

          </div>
          </div>
          </div>
        </main>

        {/* ── On This Page (anchor sidebar) ── */}
        {(() => {
          const activeNavItem = NAV.flatMap(g => g.items).find(i => i.id === activeItem);
          const anchors = activeNavItem?.children;
          if (!anchors) return null;
          return (
            <aside className="sticky top-0 h-screen w-48 shrink-0 overflow-y-auto py-6 pl-6 pr-4">
              <p className="flex h-7 items-center text-[12px] font-medium text-zinc-400 mb-1.5">On This Page</p>
              <div className="relative flex flex-col ml-3 before:absolute before:inset-y-0 before:right-0 before:w-px before:bg-white/[0.08]">
                {anchors.map((a) => {
                  const isActive = activeAnchor === a.id;
                  return (
                    <a
                      key={a.id}
                      href={`#${a.id}`}
                      onClick={(e) => { e.preventDefault(); setActiveAnchor(a.id); window.history.replaceState(null, '', `#${a.id}`); document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                      className={`relative py-1.5 pr-3 text-[13px] leading-snug no-underline transition-colors duration-150 before:absolute before:inset-y-px before:right-0 before:rounded-full before:transition-all before:duration-200 ${
                        isActive
                          ? 'text-zinc-100 before:w-[2px] before:bg-sky-400'
                          : 'text-zinc-500 hover:text-zinc-300 before:w-px before:bg-transparent'
                      }`}
                    >
                      {a.label}
                    </a>
                  );
                })}
              </div>
            </aside>
          );
        })()}

      </div>
      <Toaster />
    </TooltipProvider>
  );
}
