/**
 * The manifest-driven design system shell — the new home for component docs,
 * mounted at `/design-system`. Two tiers (Primitives / Blocks), a nav
 * generated entirely from the manifest, a ⌘K command palette, and the generic
 * {@link ComponentDoc} renderer. The legacy `/styleguide` monolith stays live
 * behind it during the strangler migration.
 *
 * Holds the terminal/tactical intent: dark control-room surfaces, layered
 * shadow rings (one depth strategy), instrument-grade type. No marketing
 * chrome.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, Component as ComponentIcon, Search } from 'lucide-react';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/shared/components/ui/command';
import { cn } from '@/shared/components/ui/utils';
import { COMPONENTS, childrenOf, getComponent, groupsForTier, TIER_LABEL } from './manifest';
import type { ComponentTier, ResolvedComponent } from './types';
import { ComponentDoc } from './ComponentDoc';
import { RING } from './docPrimitives';

const TIERS: ComponentTier[] = ['primitive', 'block'];

function TierToggle({
  tier,
  onChange,
}: {
  tier: ComponentTier;
  onChange: (t: ComponentTier) => void;
}) {
  return (
    <div className={cn('flex gap-1 rounded-lg p-1', RING)}>
      {TIERS.map((t) => {
        const active = t === tier;
        const Icon = t === 'block' ? Boxes : ComponentIcon;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            aria-pressed={active}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25',
              active ? 'bg-white/[0.10] text-n-12' : 'text-n-9 hover:text-n-11',
            )}
          >
            <Icon size={13} fill="currentColor" strokeWidth={0} aria-hidden="true" />
            {TIER_LABEL[t]}
          </button>
        );
      })}
    </div>
  );
}

function NavItem({
  item,
  selectedId,
  onSelect,
  nested = false,
}: {
  item: ResolvedComponent;
  selectedId: string;
  onSelect: (id: string) => void;
  nested?: boolean;
}) {
  const active = item.id === selectedId;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center justify-between rounded-md py-1.5 text-left text-sm transition-colors duration-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25',
        nested ? 'pl-3.5 pr-2 text-[13px]' : 'px-2',
        active
          ? 'bg-white/[0.06] font-medium text-n-12'
          : 'text-n-9 hover:bg-white/[0.03] hover:text-n-11',
      )}
    >
      <span>{item.name}</span>
      {!item.doc && (
        <span className="ml-2 rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-n-120">
          soon
        </span>
      )}
    </button>
  );
}

function SidebarNav({
  tier,
  selectedId,
  onSelect,
}: {
  tier: ComponentTier;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const groups = useMemo(() => groupsForTier(tier), [tier]);
  return (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.label} className="space-y-1">
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-white/60">
            {group.label}
          </h3>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const children = childrenOf(item.id);
              return (
                <li key={item.id}>
                  <NavItem item={item} selectedId={selectedId} onSelect={onSelect} />
                  {children.length > 0 && (
                    <ul className="mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-2">
                      {children.map((child) => (
                        <li key={child.id}>
                          <NavItem item={child} selectedId={selectedId} onSelect={onSelect} nested />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function DesignSystem() {
  const first = COMPONENTS.find((c) => c.tier === 'primitive') ?? COMPONENTS[0];
  const [tier, setTier] = useState<ComponentTier>(first?.tier ?? 'primitive');
  const [selectedId, setSelectedId] = useState<string>(first?.id ?? '');
  const [searchOpen, setSearchOpen] = useState(false);

  const navigate = useCallback((id: string) => {
    const c = getComponent(id);
    if (!c) return;
    setTier(c.tier);
    setSelectedId(id);
    window.history.replaceState(null, '', `#${id}`);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  }, []);

  // Initialize from the URL hash + keep ⌘K wired.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && getComponent(hash)) navigate(hash);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const selected = getComponent(selectedId) ?? first;

  return (
    <TooltipProvider>
      <div dir="ltr" className="flex min-h-screen bg-[#09090b] font-sans text-white antialiased" style={{ WebkitFontSmoothing: 'antialiased' }}>
        {/* Sidebar */}
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-white/[0.06] px-4 py-5">
          <div className="space-y-1">
            <span className="text-sm font-semibold tracking-tight text-n-12">C2 Hub</span>
            <span className="block text-xs text-n-120">Design System</span>
          </div>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2 text-sm text-n-9 transition-colors duration-150 hover:text-n-11 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25',
              RING,
            )}
          >
            <span className="flex items-center gap-2">
              <Search size={14} />
              Search
            </span>
            <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-n-10">⌘K</kbd>
          </button>

          <TierToggle tier={tier} onChange={setTier} />
          <SidebarNav tier={tier} selectedId={selectedId} onSelect={navigate} />
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 overflow-y-auto py-4 pr-4">
          <div
            className={cn('min-h-[calc(100vh-2rem)] rounded-2xl px-8 py-10 sm:px-10 lg:px-14 lg:py-12', RING)}
            style={{ backgroundColor: '#0c0c0e' }}
          >
            {selected && <ComponentDoc key={selected.id} component={selected} onNavigate={navigate} />}
          </div>
        </main>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search components…" />
        <CommandList>
          <CommandEmpty>No components found.</CommandEmpty>
          {TIERS.map((t) => (
            <CommandGroup key={t} heading={TIER_LABEL[t]}>
              {COMPONENTS.filter((c) => c.tier === t).map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.id} ${c.group}`}
                  onSelect={() => {
                    navigate(c.id);
                    setSearchOpen(false);
                  }}
                >
                  {c.tier === 'block' ? <Boxes /> : <ComponentIcon />}
                  <span>{c.name}</span>
                  <span className="ml-auto text-xs text-n-120">{c.group}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </TooltipProvider>
  );
}
