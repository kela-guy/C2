import React from "react";
import { Badge } from "@/app/components/ui/badge";

const VARIANT_MAP = {
  green: "status-green",
  gray: "status-gray",
  red: "status-red",
  orange: "status-orange",
} as const;

export function StatusChip({ label, color = "green", className }: { label: string; color?: "green" | "gray" | "red" | "orange"; className?: string }) {
  return (
    <Badge variant={VARIANT_MAP[color]} className={className} role="status">
      {label}
    </Badge>
  );
}
