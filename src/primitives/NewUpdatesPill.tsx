import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
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
          'h-8 gap-1.5 rounded-full border-0 bg-sky-500 px-3 text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(29,155,240,0.35),0_0_0_1px_rgba(255,255,255,0.1)] transition-[background-color,transform] duration-150 ease-out hover:bg-sky-400 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 active:scale-[0.97]',
          'hover:text-white',
        )}
      >
        <ArrowUp className="size-[13px]" size={13} strokeWidth={2.5} aria-hidden="true" />
        <span>{text}</span>
      </Button>
    </motion.div>
  );
}
