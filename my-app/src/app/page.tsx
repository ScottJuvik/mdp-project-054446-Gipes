"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { AppShell } from "@/components/edison";
import { InverterDashboard } from "@/components/dashboard";

function sameOverrides(
  a?: Record<string, any> | null,
  b?: Record<string, any> | null,
) {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

function isEmptyOverride(value?: Record<string, any> | null) {
  return Object.keys(value ?? {}).length === 0;
}

function DashboardPreview({
  state,
  previewOverrides,
  onAccept,
  onDecline,
}: {
  state: Record<string, any>;
  previewOverrides: Record<string, any>;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="absolute inset-x-4 bottom-32 z-[90] rounded-3xl border border-border bg-card p-4 shadow-2xl shadow-black/20">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Preview</p>
          <p className="text-xs text-muted-foreground">
            Review before updating your dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDecline}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground/70 transition hover:bg-secondary"
            aria-label="Decline preview"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-edison-green text-white shadow-sm transition active:scale-95"
            aria-label="Accept preview"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[42vh] overflow-y-auto rounded-2xl border border-border bg-secondary">
        <InverterDashboard
          state={{ ...state, dashboardOverrides: previewOverrides }}
          componentOverrides={{}}
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { agent } = useAgent();
  const state = agent.state ?? {};

  const [componentOverrides, setComponentOverrides] = useState(
    {} as Record<string, any>,
  );
  const [pendingPreview, setPendingPreview] =
    useState<Record<string, any> | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem("dashboardOverrides");
    } catch (e) {
      console.warn("[HomePage] Failed to clear saved overrides:", e);
    }

    agent.setState({
      hasInverter: true,
      fotovoltaico: state.fotovoltaico ?? "1,10",
      batteria: state.batteria ?? "0,20",
      rete: state.rete ?? "0,30",
      consumption: state.consumption ?? "2,40",
      selfPercent: state.selfPercent ?? 78,
      temperature: state.temperature ?? "29°C",
      dashboardOverrides: {},
      devices: state.devices ?? [
        { name: "Doccia", value: "+250 Wh" },
        { name: "Lavatrice", value: "+300 Wh" },
      ],
    });
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (state.dashboardOverrides === undefined) return;

    const nextOverrides = state.dashboardOverrides ?? {};

    try {
      if (isEmptyOverride(nextOverrides)) {
        if (!isEmptyOverride(componentOverrides)) {
          setComponentOverrides({});
        }
        if (pendingPreview !== null) {
          setPendingPreview(null);
        }
      } else if (
        !sameOverrides(nextOverrides, componentOverrides) &&
        !sameOverrides(nextOverrides, pendingPreview)
      ) {
        setPendingPreview(nextOverrides);
      }
    } catch (e) {
      console.warn("[HomePage] Failed to sync overrides:", e);
    }
  }, [hasHydrated, state.dashboardOverrides, componentOverrides, pendingPreview]);

  const resetAll = () => {
    setComponentOverrides({});
    setPendingPreview(null);
    agent.setState({ dashboardOverrides: {} });
  };

  const acceptPreview = () => {
    if (!pendingPreview) return;

    setComponentOverrides(pendingPreview);
    agent.setState({ dashboardOverrides: pendingPreview });
    setPendingPreview(null);
  };

  const declinePreview = () => {
    setPendingPreview(null);
    agent.setState({ dashboardOverrides: componentOverrides });
  };

  const dashboardState = {
    ...state,
    dashboardOverrides: componentOverrides,
  };

  return (
    <AppShell>
      <InverterDashboard
        state={dashboardState}
        componentOverrides={componentOverrides}
        onResetAll={resetAll}
      />
      {pendingPreview && (
        <DashboardPreview
          state={state}
          previewOverrides={pendingPreview}
          onAccept={acceptPreview}
          onDecline={declinePreview}
        />
      )}
    </AppShell>
  );
}
