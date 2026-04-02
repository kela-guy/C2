import { useCallback, useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/shared/components/ui/collapsible';
import {
  NAV,
  findGroupForId,
  findParentItemForChild,
  type NavGroup,
  type NavItem,
} from './navConfig';

interface StyleguideSidebarProps {
  activeItem: string;
  activeAnchor: string | null;
  onSelectPage: (id: string) => void;
  onSelectSection: (id: string) => void;
  onSearchOpen: () => void;
}

export function StyleguideSidebar({
  activeItem,
  activeAnchor,
  onSelectPage,
  onSelectSection,
  onSearchOpen,
}: StyleguideSidebarProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const g of NAV) {
      for (const item of g.items) {
        if (item.children && (item.id === activeItem || item.children.some((c) => c.id === activeItem))) {
          initial.add(item.id);
        }
      }
    }
    return initial;
  });

  useEffect(() => {
    const parent = findParentItemForChild(activeItem);
    if (parent) {
      setOpenGroups((prev) => {
        if (prev.has(parent.id)) return prev;
        const next = new Set(prev);
        next.add(parent.id);
        return next;
      });
    }
    for (const g of NAV) {
      for (const item of g.items) {
        if (item.id === activeItem && item.children) {
          setOpenGroups((prev) => {
            if (prev.has(item.id)) return prev;
            const next = new Set(prev);
            next.add(item.id);
            return next;
          });
        }
      }
    }
  }, [activeItem]);

  const toggleGroup = useCallback((itemId: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

  return (
    <nav className="sticky top-0 h-screen w-60 shrink-0 overflow-y-auto py-6 px-3 border-r border-white/[0.04] scrollbar-none">
      <a href="#top" className="flex items-center gap-2 px-2 mb-2">
        <span className="text-[15px] font-semibold text-white tracking-tight">C2 - Hub</span>
        <span className="text-[15px] font-normal text-zinc-400 tracking-tight">Styleguide</span>
      </a>

      <span className="block px-2 mb-6 text-[11px] font-mono text-zinc-600">v0.0.1</span>

      <button
        type="button"
        onClick={onSearchOpen}
        className="flex items-center gap-2 w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 mb-6 text-[13px] text-zinc-500 cursor-pointer transition-[border-color,background-color] duration-150 ease-out hover:bg-white/[0.04] hover:border-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
      >
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[11px] font-mono text-zinc-600 bg-white/[0.06] rounded px-1.5 py-0.5">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      {NAV.map((group) => (
        <SidebarGroup
          key={group.label}
          group={group}
          activeItem={activeItem}
          activeAnchor={activeAnchor}
          openGroups={openGroups}
          onSelectPage={onSelectPage}
          onSelectSection={onSelectSection}
          onToggleGroup={toggleGroup}
        />
      ))}
    </nav>
  );
}

function SidebarGroup({
  group,
  activeItem,
  activeAnchor,
  openGroups,
  onSelectPage,
  onSelectSection,
  onToggleGroup,
}: {
  group: NavGroup;
  activeItem: string;
  activeAnchor: string | null;
  openGroups: Set<string>;
  onSelectPage: (id: string) => void;
  onSelectSection: (id: string) => void;
  onToggleGroup: (id: string) => void;
}) {
  return (
    <div className="mb-5">
      <span className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-white mb-2 px-2">
        {group.label}
      </span>
      <ul className="space-y-px">
        {group.items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            activeItem={activeItem}
            activeAnchor={activeAnchor}
            isOpen={openGroups.has(item.id)}
            onSelectPage={onSelectPage}
            onSelectSection={onSelectSection}
            onToggle={() => onToggleGroup(item.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function SidebarItem({
  item,
  activeItem,
  activeAnchor,
  isOpen,
  onSelectPage,
  onSelectSection,
  onToggle,
}: {
  item: NavItem;
  activeItem: string;
  activeAnchor: string | null;
  isOpen: boolean;
  onSelectPage: (id: string) => void;
  onSelectSection: (id: string) => void;
  onToggle: () => void;
}) {
  const isActive = activeItem === item.id;
  const hasChildren = item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <li>
        <a
          href={`#${item.id}`}
          onClick={(e) => {
            e.preventDefault();
            onSelectPage(item.id);
          }}
          className={`block rounded-md px-2 py-[6px] text-[13px] font-medium cursor-pointer transition-[color,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25 ${
            isActive
              ? 'text-zinc-50 bg-white/[0.06]'
              : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-300'
          }`}
        >
          {item.label}
        </a>
      </li>
    );
  }

  return (
    <li>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <div className="flex items-center">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-label={isOpen ? 'Collapse' : 'Expand'}
              className="shrink-0 p-1 rounded-md text-zinc-500 cursor-pointer transition-[color,background-color] duration-150 ease-out hover:bg-white/[0.04] hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25"
            >
              <ChevronRight
                size={14}
                className={`transition-transform duration-150 ease-out ${isOpen ? 'rotate-90' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          <button
            type="button"
            onClick={() => {
              onSelectPage(item.id);
              if (!isOpen) onToggle();
            }}
            className={`flex-1 text-left rounded-md px-1.5 py-[6px] text-[13px] font-medium cursor-pointer transition-[color,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25 ${
              isActive
                ? 'text-zinc-50 bg-white/[0.06]'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-300'
            }`}
          >
            {item.label}
          </button>
        </div>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <ul className="ml-[22px] border-l border-white/[0.06] mt-1 mb-1 space-y-px">
            {item.children!.map((child) => {
              const isChildActive = activeAnchor === child.id || (isActive && activeAnchor === child.id);
              return (
                <li key={child.id}>
                  <a
                    href={`#${child.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectSection(child.id);
                    }}
                    className={`block rounded-md pl-3 pr-2 py-[5px] text-[13px] cursor-pointer transition-[color,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25 ${
                      isChildActive
                        ? 'text-zinc-200 font-medium'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {child.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
