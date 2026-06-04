import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded text-xs font-medium transition-[background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-white/[0.08] text-zinc-200 hover:bg-white/[0.14] active:bg-white/[0.06]",
        destructive:
          "bg-[oklch(0.435_0.151_25)] text-white hover:bg-[oklch(0.485_0.151_25)] active:bg-[oklch(0.385_0.151_25)]",
        outline:
          "bg-white/[0.03] text-zinc-400 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-white/[0.06] active:bg-white/[0.02]",
        secondary:
          "bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-900",
        ghost: "text-zinc-300 hover:bg-white/[0.08] active:bg-white/[0.06]",
        link: "text-zinc-200 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3 has-[>svg]:px-2.5",
        sm: "h-[30px] gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-9 px-4 text-sm font-semibold has-[>svg]:px-3",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
