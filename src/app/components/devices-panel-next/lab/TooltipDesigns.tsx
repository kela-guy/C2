/**
 * `/devices-lab` tooltip study — edge-case matrix for the chosen direction,
 * option 2 ("Titled header + divider"): a severity dot + label + optional
 * count badge over a hairline, with the reason and a `connection · freshness`
 * line fenced below.
 *
 * This gallery stress-tests that one form against everything it has to carry
 * in production: both health tones (error / ok),
 * error-count extremes (0, 1, many, 99+), short/long/missing reasons, partial
 * or absent footers, and an over-long severity label. Every case is shown in
 * English (LTR) and Hebrew (RTL). Square corners; the inner badge uses a 2px
 * radius. Sandbox-only — the winner folds into `DeviceRowHeader`.
 */

import type { ReactNode } from 'react';
import { HEALTH_BADGE_CLASS, HEALTH_DOT_CLASS } from '@/primitives/HealthStatus';

/** Worst-wins health tone, mirroring `deviceHealth.ts`. */
type Tone = 'error' | 'ok';

interface ToneStyle {
  /** Leading severity dot. */
  dot: string;
  /** Count-badge palette; `null` tones never surface a badge. */
  badge: string | null;
}

/**
 * Tone palette grounded in the existing tokens (`CONNECTION_STATE_COLORS`,
 * `DEVICE_HEALTH_VISUAL`). Only error carries a count badge.
 */
const TONES: Record<Tone, ToneStyle> = {
  error: { dot: HEALTH_DOT_CLASS.error, badge: HEALTH_BADGE_CLASS.error },
  ok: { dot: HEALTH_DOT_CLASS.ok, badge: null },
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
      className={`overflow-hidden bg-slate-4 text-xs text-slate-11 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] ${className}`}
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
        <span className="w-full min-w-0 truncate text-xs font-semibold text-slate-12">
          {content.severity}
        </span>
        {showBadge && (
          <span
            className={`h-4 shrink-0 rounded-[2px] px-1.5 align-middle text-2xs font-medium leading-4 tabular-nums ${style.badge}`}
          >
            {badgeLabel}
          </span>
        )}
      </div>
      {hasFence && (
        <div className="border-t border-white/10 px-2.5 py-1.5">
          {content.reason != null && (
            <div className="max-w-[220px] text-xs text-slate-11">{content.reason}</div>
          )}
          {hasFooter && <div className="mt-0.5 text-2xs text-white/50">{footer}</div>}
        </div>
      )}
    </TipSurface>
  );
}

const SCENARIOS: Scenario[] = [
  {
    label: 'Error · 2 reasons · full footer (canonical)',
    tone: 'error',
    errors: 2,
    en: { severity: 'Error', reason: 'Sensor fault', connection: 'Warning', updated: '3m ago' },
    he: { severity: 'שגיאה', reason: 'תקלת חיישן', connection: 'אזהרה', updated: 'לפני 3 ד׳' },
  },
  {
    label: 'Error · 99+ reasons (count clamp)',
    tone: 'error',
    errors: 248,
    en: { severity: 'Error', reason: 'Repeated command timeouts', connection: 'Error', updated: 'just now' },
    he: { severity: 'שגיאה', reason: 'פסקי זמן חוזרים בפקודות', connection: 'שגיאה', updated: 'הרגע' },
  },
  {
    label: 'Error · 1 reason (singular count)',
    tone: 'error',
    errors: 1,
    en: { severity: 'Error', reason: 'Motor stall', connection: 'Error', updated: '1m ago' },
    he: { severity: 'שגיאה', reason: 'תקיעת מנוע', connection: 'שגיאה', updated: 'לפני דקה' },
  },
  {
    label: 'Error · 0 logged reasons (badge hidden)',
    tone: 'error',
    errors: 0,
    en: { severity: 'Error', reason: 'Malfunction', connection: 'Online', updated: '2m ago' },
    he: { severity: 'שגיאה', reason: 'תקלה', connection: 'מחובר', updated: 'לפני 2 ד׳' },
  },
  {
    label: 'Error · low-battery reason · full footer',
    tone: 'error',
    errors: 1,
    en: { severity: 'Error', reason: 'Battery 34%', connection: 'Warning', updated: '5m ago' },
    he: { severity: 'שגיאה', reason: 'סוללה 34%', connection: 'אזהרה', updated: 'לפני 5 ד׳' },
  },
  {
    label: 'Error · offline reason · freshness-only footer',
    tone: 'error',
    en: { severity: 'Error', reason: 'Device offline', updated: '12m ago' },
    he: { severity: 'שגיאה', reason: 'המכשיר מנותק', updated: 'לפני 12 ד׳' },
  },
  {
    label: 'OK · no badge · no footer (minimal / header-only)',
    tone: 'ok',
    en: { severity: 'Healthy' },
    he: { severity: 'תקין' },
  },
  {
    label: 'Long reason (wrap test)',
    tone: 'error',
    errors: 7,
    en: {
      severity: 'Error',
      reason: 'GPS module unresponsive after firmware rollback; awaiting reconnection and operator acknowledgement',
      connection: 'Error',
      updated: '8m ago',
    },
    he: {
      severity: 'שגיאה',
      reason: 'מודול ה-GPS אינו מגיב לאחר חזרת קושחה; ממתין לחיבור מחדש ולאישור מפעיל',
      connection: 'שגיאה',
      updated: 'לפני 8 ד׳',
    },
  },
  {
    label: 'Missing reason (header-only, no divider)',
    tone: 'error',
    errors: 3,
    en: { severity: 'Error' },
    he: { severity: 'שגיאה' },
  },
  {
    label: 'Long malfunction reason vs badge (wrap test)',
    tone: 'error',
    errors: 12,
    en: { severity: 'Error', reason: 'Communications subsystem malfunction; link degraded', connection: 'Error', updated: '4m ago' },
    he: { severity: 'שגיאה', reason: 'תקלה במערכת התקשורת המשנית; הקישור מתדרדר', connection: 'שגיאה', updated: 'לפני 4 ד׳' },
  },
  {
    label: 'Footer: connection-only',
    tone: 'error',
    errors: 1,
    en: { severity: 'Error', reason: 'Latency spike', connection: 'Warning' },
    he: { severity: 'שגיאה', reason: 'קפיצת השהיה', connection: 'אזהרה' },
  },
  {
    label: 'Footer: freshness-only',
    tone: 'error',
    errors: 2,
    en: { severity: 'Error', reason: 'Sensor fault', updated: '3m ago' },
    he: { severity: 'שגיאה', reason: 'תקלת חיישן', updated: 'לפני 3 ד׳' },
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
      <span className="text-2xs font-medium uppercase tracking-wide text-white/35">{label}</span>
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
            <div className="text-xs-plus leading-snug text-white/55">{sc.label}</div>
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
