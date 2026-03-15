import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { CARD_TOKENS } from './tokens';

export interface CardHeaderProps {
  icon?: React.ElementType;
  iconColor?: string;
  iconBgActive?: boolean;
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  badge?: React.ReactNode;
  quickAction?: React.ReactNode;
  open?: boolean;
}

export function CardHeader({
  icon: Icon,
  iconColor,
  iconBgActive,
  title,
  subtitle,
  status,
  badge,
  quickAction,
  open,
}: CardHeaderProps) {
  const d = CARD_TOKENS;
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex justify-between items-center" style={{ gap: `${d.header.gap}px` }}>
      <div className="flex gap-1.5 items-center min-w-0 flex-1">
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          className="text-zinc-500 shrink-0"
        >
          <ChevronDown size={d.animation.chevronSize} />
        </motion.div>

        {status}
        {badge}

        {!open && quickAction && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {quickAction}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-right shrink-0">
        <div className="flex flex-col items-end">
          <h2
            className="font-semibold text-balance leading-tight"
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
              className="font-mono"
              style={{ fontSize: `${d.subtitle.fontSize}px`, color: d.subtitle.color }}
            >
              {subtitle}
            </span>
          )}
        </div>

        {Icon && (
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: `${d.iconBox.size}px`,
              height: `${d.iconBox.size}px`,
              borderRadius: `${d.iconBox.borderRadius}px`,
              backgroundColor: iconBgActive
                ? `${d.iconBox.activeBg}${Math.round(d.iconBox.activeBgOpacity * 255).toString(16).padStart(2, '0')}`
                : d.iconBox.defaultBg,
              color: iconColor ?? (iconBgActive ? d.iconBox.activeBg : '#9ca3af'),
            }}
          >
            <Icon size={d.iconBox.iconSize} />
          </div>
        )}
      </div>
    </div>
  );
}
