import React from "react";

export function StatusChip({ text }: { text: string }) {
  return (
    <div className="bg-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded text-[10px] font-medium text-zinc-300 font-mono tabular-nums">
      {text}
    </div>
  );
}
