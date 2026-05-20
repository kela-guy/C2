import React from "react";
import { ChevronDown } from "@/lib/icons/central";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";

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
        className="flex w-full cursor-pointer items-center justify-between rounded-none p-[8px] transition-colors hover:bg-state-hover data-[state=open]:bg-state-hover-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
      >
        <div className="flex items-center gap-2 text-sm font-normal text-slate-11">
          {HeaderIcon && (
            <HeaderIcon size={14} className="text-slate-12" aria-hidden="true" />
          )}
          {title}
        </div>

        <div className="flex items-center gap-2">
          {headerAction}
          <div
            className="text-slate-9 transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          >
            <ChevronDown size={16} />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="flex flex-wrap bg-surface-4 px-[8px] py-[0px]">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
