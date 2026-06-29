/**
 * The exposed "mini debug tool" — the centrepiece of the reference's philosophy.
 * Each chip is a clickable control bound to a keyboard shortcut; the reader gets
 * the same toggles the author used to sand the interaction's edge cases.
 *
 * Shortcuts are only live while the chip group is on screen (an
 * `IntersectionObserver` gate), so several chapters can reuse the same keys
 * without colliding, and typing into an input never triggers them.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/app/components/ui/utils';

export interface DebugChip {
  /** Single-character keyboard shortcut (case-insensitive). */
  shortcut: string;
  label: string;
  onTrigger: () => void;
}

export function DebugChips({
  chips,
  className,
}: {
  chips: DebugChip[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chipsRef = useRef(chips);
  chipsRef.current = chips;
  const [visible, setVisible] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const trigger = (chip: DebugChip) => {
    chip.onTrigger();
    setFlash(chip.shortcut);
    window.setTimeout(() => setFlash((f) => (f === chip.shortcut ? null : f)), 180);
  };

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const chip = chipsRef.current.find(
        (c) => c.shortcut.toLowerCase() === e.key.toLowerCase(),
      );
      if (chip) {
        e.preventDefault();
        trigger(chip);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  return (
    <div ref={ref} className={cn('flex flex-wrap items-center justify-center gap-1.5', className)}>
      {chips.map((chip) => {
        const lit = flash === chip.shortcut;
        return (
          <button
            key={chip.shortcut + chip.label}
            type="button"
            onClick={() => trigger(chip)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] transition-colors',
              'border-[color:var(--story-border)] bg-[var(--story-surface)] text-[color:var(--story-muted)] hover:text-[color:var(--story-ink)]',
              lit && 'text-[color:var(--story-ink)]',
            )}
            style={lit ? { borderColor: 'var(--story-accent)' } : undefined}
          >
            <kbd className="grid h-4 min-w-4 place-items-center rounded border border-[color:var(--story-border)] px-1 font-[family:var(--font-mono)] text-[10px] uppercase">
              {chip.shortcut}
            </kbd>
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
