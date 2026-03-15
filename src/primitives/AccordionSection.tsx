import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

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

  return (
    <div className={`border-b border-[#333] last:border-0 ${className}`} dir="rtl">
      <div 
        className="flex w-full items-center justify-between p-[8px] cursor-pointer hover:bg-white/5 transition-colors rounded-sm"
        onClick={() => setOpen(!isOpen)}
        role="button"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300 font-['Inter']">
          {HeaderIcon && <HeaderIcon size={14} className="text-zinc-500" />}
          {title}
        </div>

        <div className="flex items-center gap-2">
           {headerAction}
           <motion.div
             animate={{ rotate: isOpen ? 180 : 0 }}
             transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
             className="text-zinc-500"
           >
             <ChevronDown size={16} />
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
            <div className="bg-[rgba(255,255,255,0.05)] px-[8px] py-[0px]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
