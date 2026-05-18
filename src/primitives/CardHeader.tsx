import React from 'react';
import { ChevronDown } from '@/lib/icons/central';
import { CARD_TOKENS, hexToRgba } from './tokens';
import { AFFILIATION_PALETTES, AFFILIATION_LABELS, type Affiliation } from './markerStyles';

export interface CardHeaderProps {
  icon?: React.ElementType;
  iconColor?: string;
  iconBgActive?: boolean;
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
  affiliation,
  title,
  subtitle,
  status,
  badge,
  quickAction,
  open,
}: CardHeaderProps) {
  const d = CARD_TOKENS;

  const affPalette = affiliation ? AFFILIATION_PALETTES[affiliation] : undefined;
  const affGlyph = affPalette?.glyph;
  const affBg = affPalette
    ? (AFFILIATION_USES_DEFAULT_SURFACE[affiliation!]
      ? d.iconBox.defaultBg
      : hexToRgba(affPalette.glyph, AFFILIATION_BG_OPACITY))
    : undefined;

  const iconBoxBg = affBg ?? (iconBgActive
    ? `${d.iconBox.activeBg}${Math.round(d.iconBox.activeBgOpacity * 255).toString(16).padStart(2, '0')}`
    : d.iconBox.defaultBg);
  const iconBoxFg = affGlyph ?? iconColor ?? (iconBgActive ? d.iconBox.activeBg : undefined);
  const iconBoxNeedsDefaultFg = !iconBoxFg;

  return (
    <div className="flex justify-between items-center" style={{ gap: `${d.header.gap}px` }}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {Icon && (
          <div
            className={`flex items-center justify-center shrink-0${iconBoxNeedsDefaultFg ? ' text-zinc-400' : ''}`}
            style={{
              width: `${d.iconBox.size}px`,
              height: `${d.iconBox.size}px`,
              borderRadius: `${d.iconBox.borderRadius}px`,
              backgroundColor: iconBoxBg,
              ...(iconBoxFg ? { color: iconBoxFg } : {}),
            }}
            aria-label={affiliation ? AFFILIATION_LABELS[affiliation] : undefined}
          >
            <Icon size={d.iconBox.iconSize} aria-hidden="true" />
          </div>
        )}

        <div className="flex flex-col min-w-0">
          <h2
            className="font-semibold text-balance leading-tight truncate"
            style={{
              fontSize: `${d.title.fontSize}px`,
              color: d.title.color,
              fontWeight: d.title.fontWeight,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <span
              className="font-mono truncate"
              style={{ fontSize: `${d.subtitle.fontSize}px`, color: d.subtitle.color }}
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
          className={`text-zinc-500 shrink-0 transition-transform duration-200${open ? ' rotate-180' : ''}`}
        >
          <ChevronDown size={d.animation.chevronSize} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
