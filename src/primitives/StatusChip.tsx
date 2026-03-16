import React from "react";

export function StatusChip({ label, color = "green", className = "" }: { label: string; color?: "green" | "gray" | "red" | "orange"; className?: string }) {
  let bg = "bg-[rgba(255,255,255,0.15)]";
  let text = "text-white";

  if (color === "green") {
    bg = "bg-[rgba(18,184,134,0.15)]";
    text = "text-[#12b886]";
  } else if (color === "red") {
    bg = "bg-[rgba(250,82,82,0.15)]";
    text = "text-[#fa5252]";
  } else if (color === "orange") {
    bg = "bg-[rgba(253,126,20,0.15)]";
    text = "text-[#fd7e14]";
  }

  return (
    <div className={`${bg} flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium ${text} ${className}`} role="status">
      {label}
    </div>
  );
}
