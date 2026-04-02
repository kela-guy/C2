import { useEffect, useState, useCallback, useRef } from 'react';
import { NAV, type NavChild } from './navConfig';

interface StyleguideTocProps {
  activeItem: string;
  activeAnchor: string | null;
  onSelect: (id: string) => void;
}

export function StyleguideToc({
  activeItem,
  activeAnchor,
  onSelect,
}: StyleguideTocProps) {
  const navItem = NAV.flatMap((g) => g.items).find((i) => i.id === activeItem);
  const childAnchors = navItem?.children;

  const [headingAnchors, setHeadingAnchors] = useState<NavChild[]>([]);
  const mutationRef = useRef<MutationObserver | null>(null);

  const scanHeadings = useCallback(() => {
    const section = document.getElementById(activeItem);
    if (!section) {
      setHeadingAnchors([]);
      return;
    }
    const headings = section.querySelectorAll<HTMLHeadingElement>('h3[id]');
    const found: NavChild[] = [];
    headings.forEach((h) => {
      if (h.id) {
        found.push({ id: h.id, label: h.textContent?.trim() ?? h.id });
      }
    });
    setHeadingAnchors(found);
  }, [activeItem]);

  useEffect(() => {
    if (childAnchors) {
      setHeadingAnchors([]);
      return;
    }

    scanHeadings();

    mutationRef.current?.disconnect();
    const main = document.querySelector('main');
    if (main) {
      mutationRef.current = new MutationObserver(scanHeadings);
      mutationRef.current.observe(main, { childList: true, subtree: true });
    }

    return () => mutationRef.current?.disconnect();
  }, [activeItem, childAnchors, scanHeadings]);

  const anchors = childAnchors ?? (headingAnchors.length > 0 ? headingAnchors : null);

  if (!anchors || anchors.length === 0) return null;

  return (
    <aside className="sticky top-0 h-screen w-48 shrink-0 overflow-y-auto py-6 pl-6 pr-4 hidden xl:block">
      <p className="flex h-7 items-center text-[12px] font-medium text-zinc-400 mb-1.5">
        On This Page
      </p>
      <div className="relative flex flex-col ml-3 before:absolute before:inset-y-0 before:right-0 before:w-px before:bg-white/[0.08]">
        {anchors.map((a) => {
          const isActive = activeAnchor === a.id;
          return (
            <a
              key={a.id}
              href={`#${a.id}`}
              onClick={(e) => {
                e.preventDefault();
                onSelect(a.id);
                document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`relative py-1.5 pr-3 text-[13px] leading-snug no-underline transition-[color] duration-150 ease-out before:absolute before:inset-y-px before:right-0 before:rounded-full before:transition-all before:duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
                isActive
                  ? 'text-zinc-100 before:w-[2px] before:bg-sky-400'
                  : 'text-zinc-500 hover:text-zinc-300 before:w-px before:bg-transparent'
              }`}
            >
              {a.label}
            </a>
          );
        })}
      </div>
    </aside>
  );
}
