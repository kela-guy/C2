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
    <aside className="sticky top-0 h-screen w-[220px] shrink-0 overflow-y-auto py-8 ps-8 pe-6 hidden xl:block">
      <p className="flex h-7 items-center font-semibold text-[13px] text-n-11">
        On This Page
      </p>
      <div className="relative ms-3.5 flex flex-col gap-0.5 pb-8 before:absolute before:inset-y-0 before:-left-[13px] before:w-px before:bg-n-5">
        {anchors.map((a) => {
          const isActive = activeAnchor === a.id;
          return (
            <a
              key={a.id}
              href={`#${a.id}`}
              data-active={isActive}
              onClick={(e) => {
                e.preventDefault();
                onSelect(a.id);
                document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="relative py-1 text-[.8125rem] leading-[1.125rem] no-underline transition-colors duration-150 ease-out before:absolute before:inset-y-px before:-left-[13px] before:w-px before:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 hover:text-white data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:before:w-0.5 data-[active=true]:before:bg-white data-[active=false]:text-white/50 data-[active=false]:before:bg-transparent"
            >
              {a.label}
            </a>
          );
        })}
      </div>
      <div
        aria-hidden
        className="sticky bottom-0 -mb-8 z-10 h-12 shrink-0 pointer-events-none bg-linear-to-t from-[#111] to-transparent"
      />
    </aside>
  );
}
