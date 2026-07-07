import React from "react";
import { Bdi } from "@/lib/direction";

/**
 * Telemetry row — label (Hebrew/locale text) above a numeric/Latin
 * `value`. The value is wrapped in `<Bdi>` so any embedded Latin
 * tokens (callsigns, frequencies, lat/long, MGRS) keep their natural
 * left-to-right reading order even when the row is rendered inside a
 * Hebrew/RTL context.
 */
export function TelemetryRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="w-full flex flex-col items-start justify-start py-1 gap-1">
      <div className="flex items-center gap-1.5 shrink-0">
        {Icon && <Icon size={12} className="text-slate-10" aria-hidden="true" />}
        <span className="text-xs text-slate-10">{label}</span>
      </div>
      <Bdi className="text-sm text-slate-11 font-mono tabular-nums truncate text-start" as="span">
        {value}
      </Bdi>
    </div>
  );
}
