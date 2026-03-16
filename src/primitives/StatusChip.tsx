import React from "react";

export function StatusChip({ label, color = "green", className = "" }: { label: string; color?: "green" | "gray" | "red" | "orange"; className?: string }) {
  let bg = "bg-[rgba(255,255,255,0.15)]";
  let text = "text-white";

  if (color === "green") {
    bg = "bg-[rgba(110,231,183,0.15)]";
    text = "text-[#6ee7b7]";
  } else if (color === "red") {
    bg = "bg-[rgba(252,165,165,0.15)]";
    text = "text-[#fca5a5]";
  } else if (color === "orange") {
    bg = "bg-[rgba(253,186,116,0.15)]";
    text = "text-[#fdba74]";
  }

  return (
    <div className={`${bg} flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium ${text} ${className}`} role="status">
      {label}
    </div>
  );
}
