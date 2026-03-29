import React from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { CARD_TOKENS } from "./tokens";

export function AccordionSection({
  title,
  children,
  defaultOpen = false,
  className = "",
  headerAction = null,
  icon: HeaderIcon = null,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerAction?: React.ReactNode;
  icon?: React.ElementType | null;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={["group", className].filter(Boolean).join(" ")}
    >
      <CollapsibleTrigger
        className="flex w-full cursor-pointer items-center justify-between rounded-none bg-white/[0.05] p-[8px] transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
      >
        <div className="flex items-center gap-2 text-sm font-normal text-zinc-300">
          {HeaderIcon && (
            <HeaderIcon size={14} className="text-zinc-500" aria-hidden="true" />
          )}
          {title}
        </div>

        <div className="flex items-center gap-2">
          {headerAction}
          <div
            className="text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          >
            <ChevronDown size={16} />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div
          className="flex flex-wrap px-[8px] py-[0px]"
          style={{
            backgroundColor: `rgba(255,255,255,${CARD_TOKENS.elevation.overlay.level2})`,
          }}
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
