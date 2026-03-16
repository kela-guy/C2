import React, { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CARD_TOKENS, type ThreatAccent } from './tokens';

export interface TargetCardProps {
  header: React.ReactNode;
  children?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  accent?: ThreatAccent;
  completed?: boolean;
  className?: string;
}

export function TargetCard({
  header,
  children,
  open,
  onToggle,
  accent = 'idle',
  completed,
  className = '',
}: TargetCardProps) {
  const d = CARD_TOKENS;
  const cardRef = useRef<HTMLDivElement>(null);
  const prevOpen = useRef(open);
  const prefersReducedMotion = useReducedMotion();
  const contentId = useId();

  useEffect(() => {
    if (open && !prevOpen.current && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }
    prevOpen.current = open;
  }, [open, prefersReducedMotion]);

  return (
    <div
      ref={cardRef}
      className={`w-full text-white overflow-hidden transition-colors group/card relative ${className}`}
      style={{
        backgroundColor: d.container.bgColor,
        borderColor: d.container.borderColor,
        borderRadius: `${d.container.borderRadius}px`,
        borderWidth: `${d.container.borderWidth}px`,
        borderStyle: 'solid',
        marginBottom: `${d.container.marginBottom}px`,
        filter: completed ? 'saturate(0.4) brightness(0.85)' : undefined,
        boxShadow: open
          ? `0 0 0 ${d.selectedRing.ringWidth}px ${d.selectedRing.ringColor}${Math.round(d.selectedRing.ringOpacity * 255).toString(16).padStart(2, '0')}`
          : undefined,
      }}
      dir="rtl"
    >
      <div
        className="transition-colors cursor-pointer hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
        style={{
          padding: `${d.header.paddingY}px ${d.header.paddingX}px`,
          backgroundColor: open ? `rgba(255,255,255,${d.header.selectedBgOpacity})` : undefined,
          borderTopLeftRadius: `${d.container.borderRadius}px`,
          borderTopRightRadius: `${d.container.borderRadius}px`,
        }}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={contentId}
      >
        {header}
      </div>

      <AnimatePresence initial={false}>
        {open && children && (
          <motion.div
            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : d.animation.expandDuration,
              ease: 'easeOut',
            }}
            className="overflow-hidden"
            id={contentId}
          >
            <div
              className="flex flex-col"
              style={{
                backgroundColor: d.content.bgColor,
                borderTopColor: d.content.borderColor,
                borderTopWidth: '1px',
                borderTopStyle: 'solid',
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
