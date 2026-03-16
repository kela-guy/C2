import React from "react";

export function ActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon?: React.ElementType;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-8 flex items-center justify-center gap-2 px-3 rounded font-medium text-xs transition-all active:scale-[0.98] bg-[rgba(34,139,230,0.15)] hover:bg-[rgba(34,139,230,0.25)] border border-[#74c0fc] text-[#74c0fc]"
    >
      {Icon && <Icon size={14} />}
      <span>{label}</span>
    </button>
  );
}
