/**
 * The exposed "mini debug tool" — the centrepiece of the reference's philosophy.
 * Each chip is a clickable control bound to a keyboard shortcut; the reader gets
 * the same toggles the author used to sand the interaction's edge cases.
 *
 * Several chapters reuse the same keys, so a single shared keydown listener owns
 * routing: it hands each keystroke to exactly one chip strip — the one whose
 * centre is closest to the viewport centre (i.e. the one the reader is actually
 * looking at). That keeps keys live whenever a strip is on screen, even if it is
 * only partly visible, and guarantees two strips never fire from one keystroke.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/app/components/ui/utils';

export interface DebugChip {
  /** Single-character keyboard shortcut (case-insensitive). */
  shortcut: string;
  label: string;
  onTrigger: () => void;
}

interface Owner {
  el: HTMLElement;
  getChips: () => DebugChip[];
  fire: (chip: DebugChip) => void;
}

const owners = new Set<Owner>();
let keyListener: ((e: KeyboardEvent) => void) | null = null;

function handleKey(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target as HTMLElement | null;
  const tag = target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
    return;
  }

  const vh = window.innerHeight || document.documentElement.clientHeight;
  const center = vh / 2;

  // Hand the key to the single strip closest to the viewport centre, ignoring
  // any strip scrolled fully out of view.
  let best: Owner | null = null;
  let bestDist = Infinity;
  owners.forEach((o) => {
    const r = o.el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= vh) return;
    const dist = Math.abs(r.top + r.height / 2 - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = o;
    }
  });
  if (!best) return;

  const key = e.key.toLowerCase();
  const chip = (best as Owner).getChips().find((c) => c.shortcut.toLowerCase() === key);
  if (chip) {
    e.preventDefault();
    (best as Owner).fire(chip);
  }
}

function register(owner: Owner) {
  owners.add(owner);
  if (!keyListener) {
    keyListener = handleKey;
    window.addEventListener('keydown', keyListener);
  }
}

function unregister(owner: Owner) {
  owners.delete(owner);
  if (owners.size === 0 && keyListener) {
    window.removeEventListener('keydown', keyListener);
    keyListener = null;
  }
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
  const [flash, setFlash] = useState<string | null>(null);

  const trigger = (chip: DebugChip) => {
    chip.onTrigger();
    setFlash(chip.shortcut);
    window.setTimeout(() => setFlash((f) => (f === chip.shortcut ? null : f)), 180);
  };
  const triggerRef = useRef(trigger);
  triggerRef.current = trigger;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const owner: Owner = {
      el,
      getChips: () => chipsRef.current,
      fire: (chip) => triggerRef.current(chip),
    };
    register(owner);
    return () => unregister(owner);
  }, []);

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
