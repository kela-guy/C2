import React from "react";
import { Loader2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/app/components/ui/tooltip";

export function ActionButton({ 
  label, 
  icon: Icon, 
  onClick, 
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  title,
  dataTour,
}: { 
  label: string; 
  icon?: React.ElementType; 
  onClick?: (e: React.MouseEvent) => void;
  variant?: "primary" | "secondary" | "ghost" | "glass" | "danger" | "amber";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  dataTour?: string;
}) {
  const sizeStyles = {
    sm: "h-[30px] text-xs gap-1",
    md: "h-8 text-xs gap-2",
    lg: "h-9 text-[13px] gap-2 font-semibold",
  };

  const isDisabled = disabled || loading;

  const base = `${sizeStyles[size]} flex items-center justify-center px-3 rounded font-medium transition-[background-color,transform,box-shadow] duration-150 ease-out active:scale-[0.98] will-change-transform focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none`;
  const disabledStyle = isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "";
  const loadingStyle = loading ? "!opacity-100 cursor-wait pointer-events-none" : "";

  const variantStyles: Record<string, string> = {
    primary: "flex-1 bg-[rgba(34,139,230,0.15)] hover:bg-[rgba(34,139,230,0.25)] shadow-[0_0_0_1px_#74c0fc] text-[#74c0fc]",
    danger:
      "flex-1 bg-[oklch(0.348_0.111_17)] hover:bg-[oklch(0.445_0.151_17)] active:bg-[oklch(0.295_0.082_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)] font-semibold",
    amber:
      "flex-1 bg-[oklch(0.348_0.111_70)] hover:bg-[oklch(0.445_0.151_70)] active:bg-[oklch(0.295_0.082_70)] text-[oklch(0.927_0.062_70)] ring-1 ring-inset ring-[oklch(0.348_0.111_70_/_0.4)] font-semibold",
    glass: "flex-1 bg-white/10 hover:bg-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.2)] text-white",
    ghost: "w-full text-[#909296] hover:text-white hover:bg-white/5",
    secondary:
      "flex-1 bg-[oklch(0.302_0_0)] hover:bg-[oklch(0.388_0_0)] active:bg-[oklch(0.238_0_0)] text-white",
  };

  const iconSize = size === 'sm' ? 11 : size === 'lg' ? 16 : 14;

  const btn = (
    <button 
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={`${base} ${variantStyles[variant] || variantStyles.primary} ${disabledStyle} ${loadingStyle} ${className}`}
      {...(dataTour ? { 'data-tour': dataTour } : {})}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon size={iconSize} aria-hidden="true" />
      )}
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
