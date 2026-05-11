import { ExternalLink, Search } from '@/lib/icons/central';
import { useDirection } from '@/lib/direction';
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
  const { direction, setDirection } = useDirection();

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
        {/*
          Direction switcher — segmented control wired to the global
          DirectionProvider. The choice persists to localStorage and
          mirrors onto `<html dir>` + `<html lang>` immediately, so the
          rest of the styleguide (and every preview frame inside it)
          re-renders in the new direction without a reload.
          A long-term home for this control is the user-settings panel;
          the styleguide header is the natural temporary location while
          we audit the visual diff between RTL and LTR.
        */}
        <div
          role="group"
          aria-label="Writing direction"
          className="flex items-stretch rounded-md border border-white/[0.06] bg-white/[0.02] p-0.5 text-[12px]"
        >
          <button
            type="button"
            onClick={() => setDirection('rtl')}
            aria-pressed={direction === 'rtl'}
            title="Switch to Right-to-Left (Hebrew)"
            className={`px-2 py-1 rounded-sm transition-[color,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
              direction === 'rtl'
                ? 'bg-white/10 text-n-11'
                : 'text-n-8 hover:text-n-10 hover:bg-white/[0.04]'
            }`}
          >
            עב
          </button>
          <button
            type="button"
            onClick={() => setDirection('ltr')}
            aria-pressed={direction === 'ltr'}
            title="Switch to Left-to-Right (English)"
            className={`px-2 py-1 rounded-sm transition-[color,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
              direction === 'ltr'
                ? 'bg-white/10 text-n-11'
                : 'text-n-8 hover:text-n-10 hover:bg-white/[0.04]'
            }`}
          >
            EN
          </button>
        </div>

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
