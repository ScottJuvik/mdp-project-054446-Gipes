"use client";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    q: "Dove si trova il codice seriale dell'impianto fotovoltaico Azzurro ZCS?",
    a: "Il codice seriale è riportato sull'etichetta posta sul lato dell'inverter Azzurro ZCS.",
  },
  {
    q: "Posso aggiungere un dispositivo che non è presente nella lista dei brand da configurare?",
    a: "Al momento è possibile aggiungere solo i dispositivi dei brand supportati nella lista.",
  },
  {
    q: "Perché la casa sulla dashboard è offline?",
    a: "La casa risulta offline quando l'inverter non sta comunicando con i nostri server.",
  },
  {
    q: "Perché uno o più dispositivi nella sezione live della dashboard sono offline?",
    a: "Verifica la connessione Wi-Fi del dispositivo e che sia correttamente alimentato.",
  },
  {
    q: "Quando è attiva la modalità smart, tutti i dispositivi si avviano in modo automatico?",
    a: "Sì, i dispositivi configurati si avviano automaticamente quando c'è sufficiente produzione solare.",
  },
  {
    q: "Se la produzione dell'inverter non è sufficiente ad alimentare i dispositivi accesi cosa succede?",
    a: "I dispositivi continueranno a funzionare prelevando energia dalla rete elettrica.",
  },
  {
    q: "Posso utilizzare le stesse credenziali dell'app My Edison?",
    a: "Sì, puoi accedere con le credenziali del tuo account Edison.",
  },
  {
    q: "Cosa significa esattamente se il grafico dei consumi segna 1kWh alle ore 14?",
    a: "Indica che tra le 14:00 e le 15:00 hai consumato 1 kWh di energia.",
  },
  {
    q: "Cosa significa esattamente il consumo riportato su 'adesso' nel grafico dei consumi?",
    a: "È il consumo istantaneo rilevato in questo momento.",
  },
  {
    q: "Cosa significa esattamente il consumo riportato su 'oggi' sopra il grafico dei consumi?",
    a: "È il totale dell'energia consumata dall'inizio della giornata.",
  },
  {
    q: "Posso aggiungere un qualunque dispositivo smart prima di aver aggiunto l'impianto fotovoltaico.",
    a: "No, è necessario aggiungere prima l'inverter per poter configurare i dispositivi smart.",
  },
  {
    q: "L'applicazione funziona anche se non aggiungo dispositivo smart ma solo l'impianti fotovoltaico?",
    a: "Sì, puoi monitorare la produzione del tuo impianto anche senza dispositivi smart.",
  },
  {
    q: "Come posso migliorare l'autoconsumo?",
    a: "Avvia gli elettrodomestici nelle ore di maggior produzione solare, idealmente tra le 11 e le 15.",
  },
];

export default function FaqPage() {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[oklch(0.93_0.005_260)] py-6 flex justify-center">
      <div className="relative mx-auto flex h-[calc(100vh-3rem)] w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] border-[10px] border-neutral-900 bg-background shadow-2xl">
        <header className="edison-header relative shrink-0 rounded-b-[2rem] px-6 pt-14 pb-10">
          <div className="relative flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">Domande frequenti</h1>
            <button
              type="button"
              onClick={() => router.push("/profilo")}
              aria-label="Chiudi"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-edison-green-dark"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </header>
        <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={i} className="rounded-2xl bg-card shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left"
                >
                  <span className="flex-1 text-[15px] leading-snug text-foreground">
                    {f.q}
                  </span>
                  <ChevronDown
                    className={`mt-1 h-5 w-5 shrink-0 text-foreground/60 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    strokeWidth={1.5}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
