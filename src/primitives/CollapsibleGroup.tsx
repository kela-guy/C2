import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export function CollapsibleGroup({ 
  title, 
  count, 
  children, 
  icon: Icon,
  defaultOpen = false,
  className = ""
}: { 
  title: string; 
  count: number; 
  children: React.ReactNode; 
  icon: React.ElementType;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`mb-3 ${className}`} dir="rtl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-1 py-2 rounded-md hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={14} className="text-zinc-500 shrink-0" />
          <span className="text-xs text-zinc-300 font-semibold truncate text-balance">
            {title}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
            {count}
          </span>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          className="text-zinc-500 shrink-0"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={prefersReducedMotion ? false : { height: 0 }}
            animate={{ height: 'auto' }}
            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-2 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
