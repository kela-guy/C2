import React from "react";
import { Badge } from "@/app/components/ui/badge";
import type { MissionPhaseType } from "@/imports/ListOfSystems";

const PHASE_CONFIG: Record<string, { label: string; bg: string; text: string; dot?: string; pulse?: boolean }> = {
  planning:  { label: 'תכנון', bg: 'bg-white/8', text: 'text-zinc-400', dot: 'bg-zinc-400', pulse: true },
  active:    { label: 'פעילה', bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400', pulse: true },
  paused:    { label: 'מושהית', bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  override:  { label: 'שליטה ידנית', bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-400', pulse: true },
  completed: { label: 'הושלמה', bg: 'bg-zinc-500/15', text: 'text-zinc-400', dot: 'bg-zinc-400' },
};

export function MissionPhaseChip({ phase }: { phase?: MissionPhaseType }) {
  const c = PHASE_CONFIG[phase || ''] || PHASE_CONFIG.planning;
  return (
    <Badge variant="outline" className={`${c.bg} ${c.text} border-transparent text-[10px]`} role="status">
      {c.dot && <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.pulse ? 'animate-pulse motion-reduce:animate-none' : ''}`} aria-hidden="true" />}
      {c.label}
    </Badge>
  );
}
