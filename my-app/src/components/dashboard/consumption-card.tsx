"use client";

import { Home, Settings } from "lucide-react";

export function ConsumptionCard({
  kwh = "2,40",
  selfPercent = 78,
  message = "Stai usando l'energia del tuo impianto",
}: {
  kwh?: string;
  selfPercent?: number;
  message?: string;
}) {
  return (
    <div className="rounded-[1.7rem] bg-card px-5 py-5 shadow-xl shadow-black/10">
      <div className="flex items-center justify-center gap-5">
        <Home className="h-16 w-16 text-foreground/70" strokeWidth={1.5} />
        <div>
          <p className="text-4xl font-bold text-foreground/80">
            {kwh}
            <span className="text-2xl">kW</span>
          </p>
          <p className="text-xs font-bold text-muted-foreground">
            CONSUMO ABITAZIONE
          </p>
        </div>
      </div>

      <div className="mt-4 h-7 overflow-hidden rounded-full bg-edison-orange">
        <div
          style={{ width: `${selfPercent}%` }}
          className="flex h-full items-center justify-end rounded-full bg-edison-green px-3 text-xs font-bold text-white"
        >
          {selfPercent}% self
        </div>
      </div>

      <p className="mt-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{message}</span>
        <Settings className="h-4 w-4" />
      </p>
    </div>
  );
}
