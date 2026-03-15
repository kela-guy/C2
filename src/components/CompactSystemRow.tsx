import React from "react";

export function CompactSystemRow({
  time,
  name,
  icon: Icon,
}: {
  time: string;
  name: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-white/5 transition-colors" dir="rtl">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-zinc-500" />}
        <span className="text-xs text-zinc-300">{name}</span>
      </div>
      <span className="text-[10px] text-zinc-500 font-mono tabular-nums">{time}</span>
    </div>
  );
}
