import React, { useState } from "react";

interface TelemetryRowProps {
  label: string;
  value: string;
  icon?: React.ElementType;
  unit?: string;
  copyable?: boolean;
  highlight?: boolean;
}

export function TelemetryRow({
  label,
  value,
  icon: Icon,
  unit,
  copyable = false,
  highlight = false,
}: TelemetryRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!copyable) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`flex items-center justify-between py-1.5 gap-4 ${
        copyable ? "cursor-pointer hover:bg-white/5 rounded px-1 -mx-1" : ""
      } ${highlight ? "bg-white/5 rounded px-1 -mx-1" : ""}`}
      dir="rtl"
      onClick={handleCopy}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        {Icon && <Icon size={12} className="text-zinc-500" />}
        <span className="text-[11px] text-[#909296]">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span
          className={`text-[11px] font-mono tabular-nums truncate text-left ${
            highlight ? "text-white" : "text-zinc-300"
          }`}
        >
          {value}
        </span>
        {unit && <span className="text-[10px] text-zinc-600">{unit}</span>}
        {copied && <span className="text-[9px] text-emerald-400">copied</span>}
      </div>
    </div>
  );
}

export const TELEMETRY_FIELDS = [
  { key: "location", label: "מיקום", icon: "MapPin" },
  { key: "distance", label: "מרחק", icon: "Ruler", unit: "מ׳" },
  { key: "altitude", label: "גובה", icon: "Mountain", unit: "מ׳" },
  { key: "speed", label: "מהירות", icon: "Activity", unit: 'קמ"ש' },
  { key: "heading", label: "כיוון", icon: "Navigation", unit: "°" },
  { key: "timestamp", label: "זמן", icon: "Clock" },
] as const;

export type TelemetryFieldKey = (typeof TELEMETRY_FIELDS)[number]["key"];

export interface TelemetryData {
  location?: string;
  distance?: string;
  altitude?: string;
  speed?: string;
  heading?: string;
  timestamp?: string;
}

export function TelemetryGrid({
  data,
  icons,
}: {
  data: TelemetryData;
  icons?: Record<string, React.ElementType>;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {TELEMETRY_FIELDS.map((field) => {
        const value = data[field.key];
        if (!value) return null;
        return (
          <TelemetryRow
            key={field.key}
            label={field.label}
            value={value}
            icon={icons?.[field.icon]}
            unit={field.unit}
            copyable
          />
        );
      })}
    </div>
  );
}
