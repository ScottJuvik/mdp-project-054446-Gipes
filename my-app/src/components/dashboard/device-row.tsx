"use client";

import type { LucideIcon } from "lucide-react";
import { Lightbulb } from "lucide-react";

export function DeviceRow({
  name,
  value,
  icon: Icon,
}: {
  name: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-4 shadow-sm">
      <span className="flex items-center gap-3 font-semibold text-foreground/70">
        <Icon className="h-6 w-6" /> {name}
      </span>
      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground/70">
        <Lightbulb
          className="h-5 w-5 text-edison-green"
          fill="currentColor"
          strokeWidth={1.8}
        />
        {value}
      </span>
    </div>
  );
}
