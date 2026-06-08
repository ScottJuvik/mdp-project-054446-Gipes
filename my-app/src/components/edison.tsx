"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Sun, User } from "lucide-react";
import type { ReactNode } from "react";
import { ChatButton } from "@/components/chat-button";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/dispositivi", label: "Dispositivi", icon: LayoutGrid, plus: true },
  { to: "/smart", label: "Smart", icon: Sun },
  { to: "/profilo", label: "Profilo", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[oklch(0.93_0.005_260)] py-6 flex justify-center">
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] border-[10px] border-neutral-900 bg-background shadow-2xl">
        <main className="relative flex-1 pb-24">{children}</main>

        <div className="absolute bottom-26 right-4 z-50">
          <ChatButton />
        </div>

        <nav className="absolute bottom-0 left-0 right-0 z-50 border-t border-border bg-card rounded-b-[2rem]">
          <ul className="grid grid-cols-4 px-2 pt-2 pb-6">
            {tabs.map(({ to, label, icon: Icon, plus }) => {
              const active = pathname === to;
              return (
                <li key={to}>
                  <Link
                    href={to}
                    className={`flex flex-col items-center gap-1 py-1 text-xs font-medium transition-colors ${
                      active ? "text-edison-green" : "text-foreground/70"
                    }`}
                  >
                    <span className="relative">
                      <Icon className="h-6 w-6" strokeWidth={1.5} />
                      {plus && (
                        <span
                          className={`absolute -top-1 -right-2 text-[10px] font-bold ${
                            active ? "text-edison-green" : "text-foreground/70"
                          }`}
                        >
                          +
                        </span>
                      )}
                    </span>
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function EdisonHeader({
  title,
  subtitle,
  compact = false,
  rightSlot,
  leftSlot,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
  rightSlot?: ReactNode;
  leftSlot?: ReactNode;
}) {
  return (
    <header
      className={`edison-header rounded-b-[2rem] px-6 pt-14 ${
        subtitle ? "pb-12" : compact ? "pb-6" : "pb-10"
      }`}
    >
      <div className="relative flex items-center gap-3">
        {leftSlot}
        <h1
          className={`font-bold text-white ${
            compact ? "text-xl tracking-wide uppercase" : "text-4xl"
          }`}
        >
          {title}
        </h1>
        {rightSlot && <div className="ml-auto">{rightSlot}</div>}
      </div>
      {subtitle && (
        <p className="relative mt-3 text-base leading-snug text-white/95">
          {subtitle}
        </p>
      )}
    </header>
  );
}

export function EmptyInverterState({ onAdd }: { onAdd?: () => void }) {
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

export function EdisonFooterLogo() {
  return (
    <div className="mt-12 flex flex-col items-center pb-8">
      <img
        src="/edison-logo.png"
        alt="Edison"
        width={180}
        height={64}
        loading="lazy"
        className="h-16 w-auto object-contain"
      />
      <div className="mt-2 h-px w-20 bg-border" />
      <p className="mt-2 text-sm text-muted-foreground">Edison My Sun</p>
    </div>
  );
}

export default function Edison() {
  return (
    <AppShell>
      <EdisonHeader title="Edison" subtitle="Gestisci il tuo impianto solare" />
      <EmptyInverterState />
      <EdisonFooterLogo />
    </AppShell>
  );
}
