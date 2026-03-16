import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export function AccordionSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#333] last:border-0">
      <button
        className="flex w-full items-center justify-between p-2 cursor-pointer hover:bg-white/5 transition-colors rounded-sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            size={16}
            className={`text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
          {title}
          {Icon && <Icon size={14} className="text-zinc-500" />}
        </div>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="bg-[rgba(255,255,255,0.03)] px-2 py-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
