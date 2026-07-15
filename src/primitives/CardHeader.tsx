import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/components/ui/tooltip';
import { useStrings } from '@/lib/intl';
import { CARD_TOKENS, hexToRgba } from './tokens';
import { AFFILIATION_PALETTES, type Affiliation } from './markerStyles';

/**
 * Custom solid chevron used by the card-header expand/collapse trigger.
 * Inlined here (rather than re-exported from `@/lib/icons/central`) because
 * Central's outlined `IconChevronBottom` is too thin to read at the
 * 18px header size against the dark card surface — this chunkier filled
 * variant matches the header's visual weight. Uses `currentColor` so it
 * inherits the wrapper's `text-slate-9`.
 */
function CardChevronDown({ size = 18, ...rest }: { size?: number } & React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...rest}
    >
      <path
        d="M19.4141 9.5L12 16.9141L4.58594 9.5L6 8.08594L12 14.0859L18 8.08594L19.4141 9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export interface CardHeaderProps {
  icon?: React.ElementType;
  iconColor?: string;
  iconBgActive?: boolean;
  /**
   * Explicit icon-surface background color. When set, wins over both
   * `iconBgActive` and the affiliation-derived background — used by
   * the unified urgency model (see `src/primitives/urgency.ts`) to
   * tint the icon box by severity rather than by IFF affiliation.
   * Accepts any valid CSS color (rgba recommended so the surface
   * tints rather than overwrites).
   */
  iconBgColor?: string;
  affiliation?: Affiliation;
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  badge?: React.ReactNode;
  quickAction?: React.ReactNode;
  open?: boolean;
}

// Background opacity for affiliation-tinted icon wrapper. Tuned to match the
// existing active-bg ratio (0.2) so cards keep a consistent quiet lift.
const AFFILIATION_BG_OPACITY = 0.12;
// `friendly` and `neutral` palettes use white as the glyph/surface color,
// which would render an invisible icon box. Fall back to the neutral default.
const AFFILIATION_USES_DEFAULT_SURFACE: Record<Affiliation, boolean> = {
  friendly: true,
  hostile: false,
  possibleThreat: false,
  neutral: true,
  unknown: false,
};

export function CardHeader({
  icon: Icon,
  iconColor,
  iconBgActive,
  iconBgColor,
  affiliation,
  title,
  subtitle,
  status,
  badge,
  quickAction,
  open,
}: CardHeaderProps) {
  const d = CARD_TOKENS;
  const t = useStrings();
  // Localized IFF label. Drives both the icon-wrapper `aria-label` and the
  // hover tooltip so Hebrew-first users (and the `/demo` English route) see
  // a single, locale-correct string per affiliation.
  const affiliationLabel = affiliation ? t.cards.affiliationLabels[affiliation] : undefined;

  const affPalette = affiliation ? AFFILIATION_PALETTES[affiliation] : undefined;
  const affGlyph = affPalette?.glyph;
  const affBg = affPalette
    ? (AFFILIATION_USES_DEFAULT_SURFACE[affiliation!]
      ? d.iconBox.defaultBg
      : hexToRgba(affPalette.glyph, AFFILIATION_BG_OPACITY))
    : undefined;

  // Resolution order for the icon-box background:
  //   1. `iconBgColor` — explicit caller override, used by the unified
  //      urgency model (severity-driven tint).
  //   2. Affiliation palette — IFF-driven tint.
  //   3. `iconBgActive` — legacy red active-bg toggle.
  //   4. Default neutral surface.
  const iconBoxBg = iconBgColor ?? affBg ?? (iconBgActive
    ? `${d.iconBox.activeBg}${Math.round(d.iconBox.activeBgOpacity * 255).toString(16).padStart(2, '0')}`
    : d.iconBox.defaultBg);
  const iconBoxFg = affGlyph ?? iconColor ?? (iconBgActive ? d.iconBox.activeBg : undefined);
  const iconBoxNeedsDefaultFg = !iconBoxFg;

  const iconBox = Icon ? (
    <div
      className={`flex items-center justify-center shrink-0${iconBoxNeedsDefaultFg ? ' text-slate-10' : ''}`}
      style={{
        width: `${d.iconBox.size}px`,
        height: `${d.iconBox.size}px`,
        borderRadius: `${d.iconBox.borderRadius}px`,
        backgroundColor: iconBoxBg,
        ...(iconBoxFg ? { color: iconBoxFg } : {}),
      }}
      aria-label={affiliationLabel}
    >
      <Icon size={d.iconBox.iconSize} aria-hidden="true" />
    </div>
  ) : null;

  // When affiliation is set, wrap the icon box in a tooltip that surfaces the
  // IFF classification (עוין / ידידותי / לא ידוע ...) for sighted users. The
  // wrapper keeps its `aria-label`, so screen readers continue to hear the
  // same localized label even while the tooltip is closed.
  const iconBoxWithTooltip = iconBox && affiliationLabel ? (
    <Tooltip>
      <TooltipTrigger asChild>{iconBox}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="whitespace-nowrap">
        {affiliationLabel}
      </TooltipContent>
    </Tooltip>
  ) : iconBox;

  return (
    <div className="flex justify-between items-center" style={{ gap: `${d.header.gap}px` }}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {iconBoxWithTooltip}

        <div className="flex flex-col min-w-0">
          <h2
            className="text-sm font-semibold text-balance leading-tight truncate"
            style={{
              color: d.title.color,
              fontWeight: d.title.fontWeight,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <span
              className="text-xs font-mono truncate"
              style={{ color: d.subtitle.color }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 items-center shrink-0">
        {!open && quickAction && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            {quickAction}
          </div>
        )}

        {badge}
        {status}

        <div
          className={`text-slate-9 shrink-0 transition-transform duration-[var(--motion-moderate)]${open ? ' rotate-180' : ''}`}
        >
          <CardChevronDown size={d.animation.chevronSize} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
