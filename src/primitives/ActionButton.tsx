import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/app/components/ui/tooltip";

type ActionButtonVariant = "primary" | "secondary" | "ghost" | "glass" | "danger" | "amber";

const VARIANT_CONFIG: Record<
  ActionButtonVariant,
  { buttonVariant: React.ComponentProps<typeof Button>["variant"]; className: string }
> = {
  primary: {
    buttonVariant: "outline",
    className:
      "flex-1 border-transparent bg-[rgba(34,139,230,0.15)] hover:bg-[rgba(34,139,230,0.25)] shadow-[0_0_0_1px_#74c0fc] text-[#74c0fc] hover:text-[#74c0fc]",
  },
  secondary: {
    buttonVariant: "secondary",
    className:
      "flex-1 bg-[oklch(0.302_0_0)] hover:bg-[oklch(0.388_0_0)] active:bg-[oklch(0.238_0_0)] text-white",
  },
  ghost: {
    buttonVariant: "ghost",
    className: "w-full text-[#909296] hover:text-white hover:bg-white/5",
  },
  glass: {
    buttonVariant: "ghost",
    className:
      "flex-1 bg-white/10 hover:bg-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.2)] text-white",
  },
  danger: {
    buttonVariant: "destructive",
    className:
      "flex-1 bg-[oklch(0.348_0.111_17)] hover:bg-[oklch(0.445_0.151_17)] active:bg-[oklch(0.295_0.082_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)] font-semibold",
  },
  amber: {
    buttonVariant: "secondary",
    className:
      "flex-1 bg-[oklch(0.348_0.111_70)] hover:bg-[oklch(0.445_0.151_70)] active:bg-[oklch(0.295_0.082_70)] text-[oklch(0.927_0.062_70)] ring-1 ring-inset ring-[oklch(0.348_0.111_70_/_0.4)] font-semibold",
  },
};

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
  const isDisabled = disabled || loading;
  const { buttonVariant, className: variantClass } =
    VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.primary;

  const sizeProps: Record<
    "sm" | "md" | "lg",
    { buttonSize: React.ComponentProps<typeof Button>["size"]; className: string }
  > = {
    sm: {
      buttonSize: "sm",
      className: "h-[30px] min-h-[30px] text-xs gap-1 px-3 rounded [&_svg]:!size-[11px]",
    },
    md: {
      buttonSize: "sm",
      className: "h-8 min-h-8 text-xs gap-2 px-3 [&_svg]:!size-[14px]",
    },
    lg: {
      buttonSize: "default",
      className: "h-9 min-h-9 text-[13px] gap-2 font-semibold px-3 [&_svg]:!size-4",
    },
  };

  const { buttonSize, className: sizeClass } = sizeProps[size];

  const iconSize = size === "sm" ? 11 : size === "lg" ? 16 : 14;

  const btn = (
    <Button
      type="button"
      variant={buttonVariant}
      size={buttonSize}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        "justify-center transition-[background-color,transform,box-shadow] duration-150 ease-out active:scale-[0.98] will-change-transform",
        variantClass,
        sizeClass,
        isDisabled && !loading && "disabled:opacity-40 disabled:cursor-not-allowed",
        loading && "disabled:!opacity-100 cursor-wait",
        className,
      )}
      {...(dataTour ? { "data-tour": dataTour } : {})}
    >
      {loading ? (
        <Loader2
          size={iconSize}
          className="animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        Icon && <Icon size={iconSize} aria-hidden="true" />
      )}
      <span>{label}</span>
    </Button>
  );

  if (!title) return btn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {title}
      </TooltipContent>
    </Tooltip>
  );
}
