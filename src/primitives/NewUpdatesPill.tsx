import { motion, useReducedMotion } from 'motion/react';
import { ArrowUp } from '@/lib/icons/central';
import { Bdi } from '@/lib/direction';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/components/ui/utils';

interface NewUpdatesPillProps {
  count: number;
  onClick: () => void;
  /** Formatter for the pill label. Defaults to `(n) => \`${n} new\``. */
  label?: (count: number) => string;
}

export function NewUpdatesPill({
  count,
  onClick,
  label = (n: number) => `${n} new`,
}: NewUpdatesPillProps) {
  const prefersReducedMotion = useReducedMotion();
  const text = label(count);

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
        aria-label={text}
        className={cn(
          'h-8 gap-1.5 rounded-full border-0 bg-accent-info px-3 text-[12px] font-semibold text-slate-1 shadow-[0_8px_24px_color-mix(in_oklch,var(--accent-info)_35%,transparent),0_0_0_1px_var(--border-default)] transition-[background-color,transform] duration-150 ease-out hover:bg-accent-info/90 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong active:scale-[0.98]',
          'hover:text-slate-1',
        )}
      >
        <ArrowUp className="size-[13px]" size={13} strokeWidth={2.5} aria-hidden="true" />
        {/*
          Label may contain a leading Latin numeral (e.g. "3 new") plus
          locale text — isolate so the count digit doesn't reorder
          relative to the Hebrew word in RTL.
        */}
        <Bdi as="span">{text}</Bdi>
      </Button>
    </motion.div>
  );
}
