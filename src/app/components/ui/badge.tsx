import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded border border-transparent px-2 py-0.5 text-xs font-medium transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 [&>svg]:pointer-events-none [&>svg]:size-3 [&_[data-icon=inline-start]]:-ms-0.5 [&_[data-icon=inline-end]]:-me-0.5",
  {
    variants: {
      variant: {
        default: "bg-white/[0.12] text-zinc-100 [a&]:hover:bg-white/[0.16]",
        secondary: "bg-white/[0.06] text-zinc-300 [a&]:hover:bg-white/[0.09]",
        destructive: "bg-red-400/15 text-red-400 [a&]:hover:bg-red-400/20",
        outline:
          "text-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.12)] [a&]:hover:bg-white/[0.06]",
        ghost: "text-zinc-400 [a&]:hover:bg-white/[0.06] [a&]:hover:text-zinc-200",
        link: "text-zinc-200 underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
