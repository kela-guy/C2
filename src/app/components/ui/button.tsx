import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded text-xs font-medium transition-[background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-focus-ring [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-white/[0.08] text-slate-11 hover:bg-white/[0.14] active:bg-white/[0.06]",
        primary:
          "bg-slate-12 text-slate-1 font-semibold hover:bg-slate-12/90 active:bg-slate-11",
        destructive:
          "bg-accent-danger-soft text-white hover:bg-accent-danger-soft-hover active:bg-accent-danger-soft-active",
        warning:
          "bg-accent-warning-soft text-white hover:bg-accent-warning-soft-hover active:bg-accent-warning-soft-active",
        outline:
          "bg-white/[0.03] text-slate-10 shadow-[0_0_0_1px_var(--border-subtle)] hover:bg-state-hover-strong active:bg-white/[0.02]",
        secondary:
          "bg-slate-4 text-white hover:bg-slate-5 active:bg-slate-2",
        ghost: "text-slate-11 hover:bg-state-hover-overlay active:bg-white/[0.06]",
        link: "text-slate-11 underline-offset-4 hover:underline",
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

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
