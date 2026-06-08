"use client";
import {
  AppShell,
  EdisonFooterLogo,
  EdisonHeader,
  EmptyInverterState,
} from "@/components/edison";

export default function SmartPage() {
  return (
    <AppShell>
      <EdisonHeader
        title="Ottimizzazione smart"
        subtitle="Avvia in automatico i tuoi dispositivi quando c'è il sole e risparmia!"
      />
      <EmptyInverterState />
      <EdisonFooterLogo />
    </AppShell>
  );
}
