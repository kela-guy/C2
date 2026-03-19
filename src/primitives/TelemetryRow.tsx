import React from "react";

export function TelemetryRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="w-full flex flex-col items-start justify-start py-1 gap-1" dir="rtl">
      <div className="flex items-center gap-1.5 shrink-0">
        {Icon && <Icon size={12} className="text-zinc-400" aria-hidden="true" />}
        <span className="text-[11px] text-zinc-400">{label}</span>
      </div>
      <span className="text-[13px] text-zinc-200 font-mono tabular-nums truncate text-left">{value}</span>
    </div>
  );
}
