import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { CARD_TOKENS } from "./tokens";

let accordionIdCounter = 0;

export function AccordionSection({
  title,
  children,
  defaultOpen = false,
  className = "",
  headerAction = null,
  icon: HeaderIcon = null
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerAction?: React.ReactNode;
  icon?: React.ElementType | null;
}) {
  const [isOpen, setOpen] = useState(defaultOpen);
  const prefersReducedMotion = useReducedMotion();
  const [panelId] = useState(() => `accordion-panel-${++accordionIdCounter}`);

  return (
    <div className={`last:border-0 ${className}`} style={{ borderBottom: `1px solid ${CARD_TOKENS.surface.level2}` }} dir="rtl">
      <div 
        className="flex w-full items-center justify-between p-[8px] cursor-pointer transition-colors rounded-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none bg-white/[0.05] hover:bg-white/[0.08]"
        onClick={() => setOpen(!isOpen)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!isOpen); } }}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <div className="flex items-center gap-2 text-sm font-normal text-zinc-300">
          {HeaderIcon && <HeaderIcon size={14} className="text-zinc-500" aria-hidden="true" />}
          {title}
        </div>

        <div className="flex items-center gap-2">
           {headerAction}
           <motion.div
             animate={{ rotate: isOpen ? 180 : 0 }}
             transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
             className="text-zinc-500"
           >
             <ChevronDown size={16} aria-hidden="true" />
           </motion.div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div id={panelId} className="flex flex-wrap px-[8px] py-[0px]" style={{ backgroundColor: `rgba(255,255,255,${CARD_TOKENS.elevation.overlay.level2})` }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
