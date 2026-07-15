import { motion, useReducedMotion } from 'framer-motion';
import { spring } from '@/lib/springs';
import { ArrowUp } from '@/lib/icons/central';
import { Bdi } from '@/lib/direction';
import { Badge } from '@/shared/components/ui/badge';
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
      transition={prefersReducedMotion ? { duration: 0 } : spring.moderate}
    >
      {/*
        A floating count *badge* that happens to be clickable: the shadcn
        Badge owns the chip styling (asChild renders it onto a real button),
        with the pill geometry + accent surface layered on top.
      */}
      <Badge
        asChild
        className={cn(
          'h-8 gap-1.5 rounded-full border-0 bg-sky-500 px-3 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(29,155,240,0.35),0_0_0_1px_rgba(255,255,255,0.1)] transition-[background-color,transform] duration-[var(--motion-fast)] ease-out hover:bg-sky-400 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring active:scale-[0.98]',
          'hover:text-white [&>svg]:size-[13px]',
        )}
      >
        <button type="button" onClick={onClick} aria-label={text}>
          <ArrowUp className="size-[13px]" size={13} strokeWidth={2.5} aria-hidden="true" />
          {/*
            Label may contain a leading Latin numeral (e.g. "3 new") plus
            locale text — isolate so the count digit doesn't reorder
            relative to the Hebrew word in RTL.
          */}
          <Bdi as="span">{text}</Bdi>
        </button>
      </Badge>
    </motion.div>
  );
}
