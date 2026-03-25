import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, Plane, Ship, Target } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';
import type { DetectionType } from '@/imports/ListOfSystems';
import { DroneCardIcon, MissileCardIcon } from './MapIcons';

interface NewUpdatesPillProps {
  count: number;
  entityTypes: DetectionType[];
  onClick: () => void;
}

const ENTITY_ICON: Record<DetectionType, React.ElementType> = {
  uav: DroneCardIcon,
  missile: MissileCardIcon,
  naval: Ship,
  aircraft: Plane,
  unknown: Target,
};

export function NewUpdatesPill({ count, entityTypes, onClick }: NewUpdatesPillProps) {
  const prefersReducedMotion = useReducedMotion();
  const uniqueTypes = Array.from(new Set(entityTypes));
  const visibleTypes = uniqueTypes.slice(0, 3);

  return (
    <motion.div
      className="inline-flex"
      initial={prefersReducedMotion ? false : { opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={onClick}
        aria-label={`${count} עדכונים חדשים`}
        className={cn(
          'h-8 gap-1.5 rounded-full border-0 bg-sky-500 px-2.5 text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(29,155,240,0.35),0_0_0_1px_rgba(255,255,255,0.1)] transition-[background-color,transform] duration-150 ease-out hover:bg-sky-400 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 active:scale-[0.97]',
          'hover:text-white',
        )}
      >
        <ArrowUp className="size-[13px]" size={13} strokeWidth={2.5} aria-hidden="true" />
        <span className="tabular-nums">{count}</span>
        {visibleTypes.length > 0 && (
          <span className="flex items-center -space-x-1">
            {visibleTypes.map((type) => {
              const Icon = ENTITY_ICON[type];
              return (
                <span
                  key={type}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 [&_svg]:size-[11px]"
                  aria-label={type}
                >
                  <Icon size={11} />
                </span>
              );
            })}
          </span>
        )}
      </Button>
    </motion.div>
  );
}
