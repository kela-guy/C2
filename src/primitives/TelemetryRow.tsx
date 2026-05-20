import React, { useEffect, useRef, useState } from "react";
import { Bdi } from "@/lib/direction";

const HEBREW_RE = /[\u0590-\u05FF]/;

function telemetryValueClassName(value: string): string {
  const base = "text-[12px] text-slate-11 truncate text-start";
  return HEBREW_RE.test(value) ? base : `${base} font-mono tabular-nums`;
}

/**
 * Telemetry row — label (Hebrew/locale text) above a value. Numeric and
 * Latin payloads use mono; Hebrew locale strings use the sans stack
 * (Heebo). The value is wrapped in `<Bdi>` so any embedded Latin
 * tokens (callsigns, frequencies, lat/long, MGRS) keep their natural
 * left-to-right reading order even when the row is rendered inside a
 * Hebrew/RTL context.
 *
 * Pass `copyValue` to make the row click-to-copy. The displayed
 * `value` stays compact (e.g. UTM `687985 / 3594214 · 50 m`); the
 * clipboard receives `copyValue` (e.g. full-precision lat/lon). On
 * success the value briefly swaps to the copied string so the
 * operator sees exactly what landed on the clipboard.
 */
export function TelemetryRow({
  label,
  value,
  copyValue,
  copyLabel,
}: {
  label: string;
  value: string;
  copyValue?: string;
  copyLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!copyValue) return;
    navigator.clipboard.writeText(copyValue);
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="w-full flex flex-col items-start justify-start py-1 gap-1">
      <span className="text-[11px] text-slate-10 shrink-0">{label}</span>
      {copyValue ? (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copyLabel}
          title={copyLabel}
          className="group/copybtn relative w-full min-w-0 flex items-center text-start cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong"
        >
          <Bdi
            as="span"
            className={`min-w-0 max-w-full rounded px-1 -mx-1 transition-colors group-hover/copybtn:bg-state-hover-strong ${telemetryValueClassName(copied ? copyValue : value)}`}
          >
            {copied ? copyValue : value}
          </Bdi>
        </button>
      ) : (
        <Bdi className={telemetryValueClassName(value)} as="span">
          {value}
        </Bdi>
      )}
    </div>
  );
}
