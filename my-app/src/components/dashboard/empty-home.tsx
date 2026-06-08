"use client";

import { EdisonFooterLogo } from "@/components/edison";

function EmptyInverterState({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 pt-20 text-center">
      <p className="max-w-xs text-lg text-foreground/85">
        Aggiungi un inverter per utilizzare l'app Edison My Sun
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-10 w-full max-w-sm rounded-2xl bg-edison-button px-8 py-5 text-base font-semibold tracking-wide text-white shadow-lg shadow-black/10 transition-transform active:scale-[0.98]"
      >
        AGGIUNGI INVERTER
      </button>
    </div>
  );
}

export function EmptyHome({ onAdd }: { onAdd: () => void }) {
  return (
    <>
      <header className="edison-header rounded-b-[2rem] px-6 pt-14 pb-10">
        <div className="relative flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white">
            0
          </div>
          <h1 className="text-xl font-bold uppercase tracking-wide text-white">
            Ottimizzazione Smart
          </h1>
        </div>
      </header>
      <EmptyInverterState onAdd={onAdd} />
      <EdisonFooterLogo />
    </>
  );
}
