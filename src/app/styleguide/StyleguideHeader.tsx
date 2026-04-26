import { ExternalLink, Search } from 'lucide-react';
import { findGroupForId, NAV } from './navConfig';

interface StyleguideHeaderProps {
  activeItem: string;
  onSearchOpen: () => void;
}

export function StyleguideHeader({
  activeItem,
  onSearchOpen,
}: StyleguideHeaderProps) {
  const group = findGroupForId(activeItem);
  const item = NAV.flatMap((g) => g.items).find((i) => i.id === activeItem);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

  return (
    <header className="sticky top-0 z-10 flex items-center h-14 px-8 border-b border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-sm">
      <nav className="flex items-center gap-1.5 text-[14px] min-w-0 flex-1">
        {group && (
          <>
            <span className="text-n-8 shrink-0">{group.label}</span>
            <span className="text-n-7 shrink-0">/</span>
          </>
        )}
        {item && (
          <span className="text-n-11 font-medium truncate">{item.label}</span>
        )}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onSearchOpen}
          className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[13px] text-n-8 cursor-pointer transition-[border-color,background-color] duration-150 ease-out hover:bg-white/[0.04] hover:border-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <Search size={14} />
          <kbd className="text-[11px] font-mono text-n-7 bg-white/[0.06] rounded px-1.5 py-0.5">
            {isMac ? '⌘' : 'Ctrl'} K
          </kbd>
        </button>

        <a
          href="/"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-n-8 cursor-pointer transition-[color] duration-150 ease-out hover:text-n-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <span>App</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </header>
  );
}
