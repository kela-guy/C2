import React from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/app/components/ui/tooltip";

export function ActionButton({ 
  label, 
  icon: Icon, 
  onClick, 
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  title,
}: { 
  label: string; 
  icon?: React.ElementType; 
  onClick?: (e: React.MouseEvent) => void;
  variant?: "primary" | "secondary" | "ghost" | "glass" | "danger" | "amber";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const sizeStyles = {
    sm: "h-[30px] text-[10px] gap-1",
    md: "h-8 text-xs gap-2",
    lg: "h-9 text-[13px] gap-2 font-semibold",
  };

  const base = `${sizeStyles[size]} flex items-center justify-center px-3 rounded font-medium transition-all active:scale-[0.98] will-change-transform focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none`;
  const disabledStyle = disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "";

  const variantStyles: Record<string, string> = {
    primary: "flex-1 bg-[rgba(34,139,230,0.15)] hover:bg-[rgba(34,139,230,0.25)] border border-[#74c0fc] text-[#74c0fc]",
    danger: "flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500 text-red-400 font-semibold",
    amber: "flex-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 text-amber-400",
    glass: "flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white",
    ghost: "w-full text-[#909296] hover:text-white hover:bg-white/5",
    secondary: "flex-1 bg-white/5 hover:bg-white/10 border border-white/15 text-white",
  };

  const iconSize = size === 'sm' ? 11 : size === 'lg' ? 16 : 14;

  const btn = (
    <button 
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${variantStyles[variant] || variantStyles.primary} ${disabledStyle} ${className}`}
    >
      {Icon && <Icon size={iconSize} aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );

  if (!title) return btn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>{title}</TooltipContent>
    </Tooltip>
  );
}
