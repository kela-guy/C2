/**
 * `/devices-lab` tooltip study — edge-case matrix for the chosen direction,
 * option 2 ("Titled header + divider"): a severity dot + label + optional
 * count badge over a hairline, with the reason and a `connection · freshness`
 * line fenced below.
 *
 * This gallery stress-tests that one form against everything it has to carry
 * in production: all four health tones (critical / warning / offline / ok),
 * error-count extremes (0, 1, many, 99+), short/long/missing reasons, partial
 * or absent footers, and an over-long severity label. Every case is shown in
 * English (LTR) and Hebrew (RTL). Square corners; the inner badge uses a 2px
 * radius. Sandbox-only — the winner folds into `DeviceRowHeader`.
 */

import type { ReactNode } from 'react';

/** Worst-wins health tone, mirroring `deviceHealth.ts`. */
type Tone = 'critical' | 'warning' | 'offline' | 'ok';

interface ToneStyle {
  /** Leading severity dot. */
  dot: string;
  /** Count-badge palette; `null` tones never surface a badge. */
  badge: string | null;
}

/**
 * Tone palette grounded in the existing tokens (`CONNECTION_STATE_COLORS`,
 * `DEVICE_HEALTH_VISUAL`). Only trouble tones carry a count badge — offline is
 * known-absent (not alarmist) and ok has nothing to count.
 */
const TONES: Record<Tone, ToneStyle> = {
  critical: { dot: 'bg-red-400', badge: 'bg-red-500/20 text-red-300' },
  warning: { dot: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  offline: { dot: 'bg-zinc-500', badge: null },
  ok: { dot: 'bg-emerald-400', badge: null },
};

/** Language-specific copy for a single tooltip. */
interface TipContent {
  severity: string;
  reason?: string;
  connection?: string;
  updated?: string;
}

interface Scenario {
  /** English annotation describing the edge case (lab caption only). */
  label: string;
  tone: Tone;
  /** Omitted / 0 hides the badge; values over 99 clamp to "99+". */
  errors?: number;
  en: TipContent;
  he: TipContent;
}

/** Shared tooltip chrome — matches the Radix tooltip surface, square corners. */
function TipSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden bg-zinc-800 text-xs text-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Option 2 rendered for one tone + content set. Handles the edge cases:
 * the badge hides at 0/undefined and clamps past 99; the label truncates
 * (badge holds its width) so a long severity never crushes the count; the
 * reason wraps within a max width; and the lower fence collapses entirely
 * when there is neither a reason nor a footer.
 */
function TitledTip({ tone, errors, content }: { tone: Tone; errors?: number; content: TipContent }) {
  const style = TONES[tone];
  const showBadge = style.badge != null && errors != null && errors > 0;
  const badgeLabel = errors != null && errors > 99 ? '99+' : errors;

  const footer = [content.connection, content.updated].filter(Boolean).join(' · ');
  const hasFooter = footer.length > 0;
  const hasFence = content.reason != null || hasFooter;

  return (
    <TipSurface className="min-w-[184px] max-w-[260px]">
      <div className="flex items-center justify-start gap-1.5 px-2.5 py-1.5">
        <span className={`size-1.5 shrink-0 rounded-full ${style.dot}`} />
        <span className="w-full min-w-0 truncate text-xs font-semibold text-zinc-100">
          {content.severity}
        </span>
        {showBadge && (
          <span
            className={`h-4 shrink-0 rounded-[2px] px-1.5 align-middle text-[10px] font-medium leading-4 tabular-nums ${style.badge}`}
          >
            {badgeLabel}
          </span>
        )}
      </div>
      {hasFence && (
        <div className="border-t border-white/10 px-2.5 py-1.5">
          {content.reason != null && (
            <div className="max-w-[220px] text-xs text-zinc-200">{content.reason}</div>
          )}
          {hasFooter && <div className="mt-0.5 text-[10px] text-white/50">{footer}</div>}
        </div>
      )}
    </TipSurface>
  );
}

const SCENARIOS: Scenario[] = [
  {
    label: 'Critical · 2 errors · full footer (canonical)',
    tone: 'critical',
    errors: 2,
    en: { severity: 'Critical', reason: 'Sensor fault', connection: 'Warning', updated: '3m ago' },
    he: { severity: 'קריטי', reason: 'תקלת חיישן', connection: 'אזהרה', updated: 'לפני 3 ד׳' },
  },
  {
    label: 'Critical · 99+ errors (count clamp)',
    tone: 'critical',
    errors: 248,
    en: { severity: 'Critical', reason: 'Repeated command timeouts', connection: 'Error', updated: 'just now' },
    he: { severity: 'קריטי', reason: 'פסקי זמן חוזרים בפקודות', connection: 'שגיאה', updated: 'הרגע' },
  },
  {
    label: 'Critical · 1 error (singular count)',
    tone: 'critical',
    errors: 1,
    en: { severity: 'Critical', reason: 'Motor stall', connection: 'Error', updated: '1m ago' },
    he: { severity: 'קריטי', reason: 'תקיעת מנוע', connection: 'שגיאה', updated: 'לפני דקה' },
  },
  {
    label: 'Critical · 0 errors (badge hidden)',
    tone: 'critical',
    errors: 0,
    en: { severity: 'Critical', reason: 'Malfunction', connection: 'Online', updated: '2m ago' },
    he: { severity: 'קריטי', reason: 'תקלה', connection: 'מחובר', updated: 'לפני 2 ד׳' },
  },
  {
    label: 'Warning · battery reason · full footer',
    tone: 'warning',
    errors: 1,
    en: { severity: 'Warning', reason: 'Battery 34%', connection: 'Warning', updated: '5m ago' },
    he: { severity: 'אזהרה', reason: 'סוללה 34%', connection: 'אזהרה', updated: 'לפני 5 ד׳' },
  },
  {
    label: 'Offline · no badge · freshness-only footer',
    tone: 'offline',
    en: { severity: 'Offline', reason: 'Disconnected', updated: '12m ago' },
    he: { severity: 'מנותק', reason: 'נותק החיבור', updated: 'לפני 12 ד׳' },
  },
  {
    label: 'OK · no badge · no footer (minimal / header-only)',
    tone: 'ok',
    en: { severity: 'Healthy' },
    he: { severity: 'תקין' },
  },
  {
    label: 'Long reason (wrap test)',
    tone: 'critical',
    errors: 7,
    en: {
      severity: 'Critical',
      reason: 'GPS module unresponsive after firmware rollback; awaiting reconnection and operator acknowledgement',
      connection: 'Error',
      updated: '8m ago',
    },
    he: {
      severity: 'קריטי',
      reason: 'מודול ה-GPS אינו מגיב לאחר חזרת קושחה; ממתין לחיבור מחדש ולאישור מפעיל',
      connection: 'שגיאה',
      updated: 'לפני 8 ד׳',
    },
  },
  {
    label: 'Missing reason (header-only, no divider)',
    tone: 'warning',
    errors: 3,
    en: { severity: 'Warning' },
    he: { severity: 'אזהרה' },
  },
  {
    label: 'Long severity label vs badge (truncate test)',
    tone: 'critical',
    errors: 12,
    en: { severity: 'Communications subsystem malfunction', reason: 'Link degraded', connection: 'Error', updated: '4m ago' },
    he: { severity: 'תקלה במערכת התקשורת המשנית', reason: 'הקישור מתדרדר', connection: 'שגיאה', updated: 'לפני 4 ד׳' },
  },
  {
    label: 'Footer: connection-only',
    tone: 'warning',
    errors: 1,
    en: { severity: 'Warning', reason: 'Latency spike', connection: 'Warning' },
    he: { severity: 'אזהרה', reason: 'קפיצת השהיה', connection: 'אזהרה' },
  },
  {
    label: 'Footer: freshness-only',
    tone: 'critical',
    errors: 2,
    en: { severity: 'Critical', reason: 'Sensor fault', updated: '3m ago' },
    he: { severity: 'קריטי', reason: 'תקלת חיישן', updated: 'לפני 3 ד׳' },
  },
];

function LangSample({
  label,
  dir,
  tone,
  errors,
  content,
}: {
  label: string;
  dir: 'ltr' | 'rtl';
  tone: Tone;
  errors?: number;
  content: TipContent;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-white/35">{label}</span>
      <div dir={dir} className="flex">
        <TitledTip tone={tone} errors={errors} content={content} />
      </div>
    </div>
  );
}

export function TooltipDesigns() {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white/90">Tile tooltip — option 2 edge cases</h2>
        <p className="mt-1 text-xs text-white/45">
          The "Titled header + divider" form across every signal it has to carry — health tones,
          error-count extremes, reason length, partial footers — each in English (LTR) and Hebrew (RTL).
        </p>
      </div>
      <div className="grid gap-x-10 gap-y-9 lg:grid-cols-2">
        {SCENARIOS.map((sc) => (
          <div key={sc.label} className="flex flex-col gap-3">
            <div className="text-[11px] leading-snug text-white/55">{sc.label}</div>
            <div className="flex flex-wrap items-start gap-8">
              <LangSample label="EN" dir="ltr" tone={sc.tone} errors={sc.errors} content={sc.en} />
              <LangSample label="עברית" dir="rtl" tone={sc.tone} errors={sc.errors} content={sc.he} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
