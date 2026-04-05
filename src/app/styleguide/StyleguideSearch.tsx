import { useEffect, useCallback, useMemo } from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/shared/components/ui/command';
import { flattenNavForSearch, NAV } from './navConfig';

interface StyleguideSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (id: string) => void;
}

export function StyleguideSearch({
  open,
  onOpenChange,
  onNavigate,
}: StyleguideSearchProps) {
  const items = useMemo(() => flattenNavForSearch(), []);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const entry of items) {
      const list = map.get(entry.group) ?? [];
      list.push(entry);
      map.set(entry.group, list);
    }
    return map;
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = useCallback(
    (id: string) => {
      onNavigate(id);
      onOpenChange(false);
    },
    [onNavigate, onOpenChange],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Styleguide"
      description="Find components, tokens, and sections."
    >
      <CommandInput placeholder="Type to search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Array.from(grouped.entries()).map(([groupLabel, entries]) => (
          <CommandGroup key={groupLabel} heading={groupLabel}>
            {entries.map((entry) => {
              const parentLabel = entry.parentId
                ? NAV.flatMap((g) => g.items).find((i) => i.id === entry.parentId)?.label
                : undefined;
              return (
                <CommandItem
                  key={entry.id}
                  value={`${entry.label} ${parentLabel ?? ''} ${entry.group}`}
                  onSelect={() => handleSelect(entry.id)}
                  className="cursor-pointer"
                >
                  <span className="flex-1">{entry.label}</span>
                  {parentLabel && (
                    <span className="text-[11px] text-n-8 ml-2">{parentLabel}</span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
