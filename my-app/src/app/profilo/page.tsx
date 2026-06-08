"use client";
import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { AppShell, EdisonHeader } from "@/components/edison";

const items = [
  { label: "I miei dati", href: "/profilo" },
  { label: "Notifiche", href: "/profilo" },
  { label: "Domande frequenti", href: "/faq" },
  { label: "Come funziona", href: "/profilo" },
  { label: "Contatti", href: "/profilo" },
];

export default function ProfiloPage() {
  return (
    <AppShell>
      <EdisonHeader title="Profilo" />
      <div className="px-6 pt-6">
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex items-center justify-between py-5 text-base text-foreground"
              >
                <span>{item.label}</span>
                <ChevronRight
                  className="h-5 w-5 text-foreground/60"
                  strokeWidth={1.5}
                />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-2 border-t border-b border-border">
          <button
            type="button"
            className="flex w-full items-center justify-between py-5 text-base text-foreground"
          >
            <span>Log out</span>
            <LogOut className="h-5 w-5 text-foreground/80" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div className="mt-16 flex justify-center pb-8">
        <img
          src="/edison-logo.png"
          alt="Edison"
          width={200}
          height={70}
          loading="lazy"
          className="h-16 w-auto object-contain"
        />
      </div>
    </AppShell>
  );
}
