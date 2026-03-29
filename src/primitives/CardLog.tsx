import React, { useState } from 'react';
import { History } from 'lucide-react';
import { AccordionSection } from './AccordionSection';
import { CARD_TOKENS } from './tokens';

export interface LogEntry {
  time: string;
  label: string;
}

export interface CardLogProps {
  entries: LogEntry[];
  maxVisible?: number;
  defaultOpen?: boolean;
  className?: string;
}

export function CardLog({
  entries,
  maxVisible = 5,
  defaultOpen = false,
  className = '',
}: CardLogProps) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) return null;

  const reversed = [...entries].reverse();
  const visible = expanded ? reversed : reversed.slice(0, maxVisible);
  const hasMore = reversed.length > maxVisible;

  return (
    <AccordionSection
      title={
        <>
          לוג (<span className="tabular-nums">{entries.length}</span>)
        </>
      }
      defaultOpen={defaultOpen}
      icon={History}
      className={className}
    >
      <div className="flex flex-col py-2 px-1">
        <div className="flex flex-col justify-center items-start">
          {visible.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-center gap-2.5 mb-2 relative w-full">
              <div className="w-[11px] h-[11px] rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.2)] shrink-0 mt-0.5 z-[1]" style={{ backgroundColor: CARD_TOKENS.surface.level1 }} />
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="text-[11px] text-zinc-300">{entry.label}</span>
              </div>
              <span className="text-[9px] text-white/50 font-mono shrink-0 tabular-nums leading-6 align-middle">
                {entry.time}
              </span>
            </div>
          ))}
        </div>

        {hasMore && !expanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            className="w-full text-center text-[12px] text-white hover:text-zinc-300 transition-colors py-0.5"
          >
            עוד {reversed.length - maxVisible} רשומות
          </button>
        )}
      </div>
    </AccordionSection>
  );
}
