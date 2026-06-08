"use client";
import {
  AppShell,
  EdisonFooterLogo,
  EdisonHeader,
  EmptyInverterState,
} from "@/components/edison";

export default function DispositiviPage() {
  return (
    <AppShell>
      <EdisonHeader title="Dispositivi" />
      <EmptyInverterState />
      <EdisonFooterLogo />
    </AppShell>
  );
}
