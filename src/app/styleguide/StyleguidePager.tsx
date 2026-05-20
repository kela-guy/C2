import { ChevronLeft, ChevronRight } from '@/lib/icons/central';
import { NAV } from './navConfig';

interface PagerEntry {
  id: string;
  label: string;
}

function buildEntries(): PagerEntry[] {
  const entries: PagerEntry[] = [];
  for (const group of NAV) {
    for (const item of group.items) {
      entries.push({ id: item.id, label: item.label });
    }
  }
  return entries;
}

const ENTRIES: PagerEntry[] = buildEntries();

interface StyleguidePagerProps {
  activeItem: string;
  onNavigate: (id: string) => void;
}

export function StyleguidePager({ activeItem, onNavigate }: StyleguidePagerProps) {
  const index = ENTRIES.findIndex((e) => e.id === activeItem);
  if (index === -1) return null;

  const prev = index > 0 ? ENTRIES[index - 1] : null;
  const next = index < ENTRIES.length - 1 ? ENTRIES[index + 1] : null;

  return (
    <nav className="mt-16 flex items-center justify-between" aria-label="Pager">
      <div>
        {prev && (
          <button
            type="button"
            onClick={() => onNavigate(prev.id)}
            className="inline-flex items-center gap-1.5 rounded-md bg-state-hover shadow-[0_0_0_1px_var(--border-default)] px-3 py-2 text-[13px] font-medium text-n-11 hover:bg-state-hover-strong hover:text-slate-12 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            <ChevronLeft size={14} className="shrink-0" />
            <span>{prev.label}</span>
          </button>
        )}
      </div>
      <div>
        {next && (
          <button
            type="button"
            onClick={() => onNavigate(next.id)}
            className="inline-flex items-center gap-1.5 rounded-md bg-state-hover shadow-[0_0_0_1px_var(--border-default)] px-3 py-2 text-[13px] font-medium text-n-11 hover:bg-state-hover-strong hover:text-slate-12 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            <span>{next.label}</span>
            <ChevronRight size={14} className="shrink-0" />
          </button>
        )}
      </div>
    </nav>
  );
}
