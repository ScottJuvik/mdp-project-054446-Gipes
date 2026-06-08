"use client";

import type { LucideIcon } from "lucide-react";

export function MetricCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center shadow-lg shadow-black/5">
      <Icon className={`mx-auto h-6 w-6 ${tone}`} strokeWidth={1.6} />
      <p className="mt-2 text-2xl font-bold text-foreground/80">
        {value}
        <span className="text-sm"> kW</span>
      </p>
      <p className="text-[10px] font-bold text-muted-foreground">{label}</p>
    </div>
  );
}
