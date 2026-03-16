import React from "react";
import type { MissionPhaseType } from "@/imports/ListOfSystems";

export function MissionPhaseChip({ phase }: { phase?: MissionPhaseType }) {
  const config: Record<string, { label: string; bg: string; text: string; dot?: string; pulse?: boolean }> = {
    planning: { label: 'תכנון', bg: 'bg-white/8', text: 'text-zinc-400', dot: 'bg-zinc-400', pulse: true },
    active:   { label: 'פעילה', bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400', pulse: true },
    paused:   { label: 'מושהית', bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
    override: { label: 'שליטה ידנית', bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-400', pulse: true },
    completed: { label: 'הושלמה', bg: 'bg-zinc-500/15', text: 'text-zinc-400', dot: 'bg-zinc-400' },
  };
  const c = config[phase || ''] || config.planning;
  return (
    <div className={`${c.bg} flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium ${c.text}`} role="status">
      {c.dot && <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.pulse ? 'animate-pulse' : ''}`} aria-hidden="true" />}
      {c.label}
    </div>
  );
}
