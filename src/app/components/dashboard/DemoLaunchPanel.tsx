/**
 * DemoLaunchPanel — the live control surface for the scripted `/demo`
 * flows. Mirrors the sibling CUAS-scenarios popover (`HeaderActions`)
 * for visual consistency: a rail button opening a small menu, one row
 * per flow plus a divided reset. Rendered only in `demoMode`.
 */

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { Sparkles } from "@/lib/icons/central";
import type { DemoDirectorApi } from "@/app/hooks/useDemoDirector";

interface DemoLaunchPanelProps {
  labels: {
    title: string;
    ariaLabel: string;
    hostileCycle: string;
    threeDrones: string;
    jammerFailsGotcha: string;
    jammerFailsGotchaAuto: string;
    reset: string;
  };
  director: DemoDirectorApi;
}

export function DemoLaunchPanel({ labels, director }: DemoLaunchPanelProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="gridblock-rail-btn"
          aria-label={labels.ariaLabel}
          title={labels.ariaLabel}
        >
          <Sparkles size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="w-60 p-1 text-slate-12"
      >
        <div className="flex flex-col">
          <div className="px-2 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-9">
            {labels.title}
          </div>
          <DemoItem label={labels.hostileCycle} onClick={director.runHostileCycle} />
          <DemoItem label={labels.threeDrones} onClick={director.runThreeDrones} />
          <DemoItem
            label={labels.jammerFailsGotcha}
            onClick={director.runJammerFailsGotcha}
          />
          <DemoItem
            label={labels.jammerFailsGotchaAuto}
            onClick={director.runJammerFailsGotchaAuto}
          />
          <div className="my-1 h-px bg-border-default" />
          <DemoItem label={labels.reset} onClick={director.reset} tone="muted" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DemoItem({
  label,
  onClick,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "muted";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex items-center rounded px-2 py-1.5 text-start text-[12px] transition-colors duration-150 ease-out hover:bg-state-hover-strong motion-reduce:transition-none ${
        tone === "muted" ? "text-slate-10" : "text-slate-12"
      }`}
    >
      {label}
    </button>
  );
}
