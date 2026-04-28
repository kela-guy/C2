import { ChevronLeft, ChevronRight } from 'lucide-react';
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
            className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.06)] px-3 py-2 text-[13px] font-medium text-n-11 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
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
            className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.06)] px-3 py-2 text-[13px] font-medium text-n-11 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            <span>{next.label}</span>
            <ChevronRight size={14} className="shrink-0" />
          </button>
        )}
      </div>
    </nav>
  );
}
