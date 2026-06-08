"use client";

import {
  BatteryCharging,
  CloudSun,
  PlugZap,
  Radio,
  ShowerHead,
  Sun,
  ToggleRight,
  WashingMachine,
  Zap,
} from "lucide-react";
import { MetricCard } from "./metric-card";
import { ConsumptionCard } from "./consumption-card";
import { DeviceRow } from "./device-row";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const COLORS = ["#22c55e", "#f97316", "#3b82f6", "#8b5cf6", "#ec4899"];
const defaultDevices = [
  { name: "Doccia", value: "+250 Wh", icon: ShowerHead },
  { name: "Lavatrice", value: "+300 Wh", icon: WashingMachine },
];

export function InverterDashboard({
  state,
  componentOverrides = {},
  onResetAll,
}: {
  state?: any;
  componentOverrides?: Record<string, any>;
  onResetAll?: () => void;
}) {
  const temperature = state?.temperature ?? "29°C";
  const devices = state?.devices?.length ? state.devices : defaultDevices;

  const overrides: Record<string, any> = {
    ...componentOverrides,
    ...(state?.dashboardOverrides ?? {}),
  };

  // Default section order — agent can override this
  const sections: string[] = overrides.sections ?? [
    "metrics",
    "consumption",
    "devices",
  ];

  const metrics = [
    {
      icon: Sun,
      value: state?.fotovoltaico ?? "1,10",
      label: "FOTOVOLTAICO",
      tone: "text-edison-green",
    },
    {
      icon: BatteryCharging,
      value: state?.batteria ?? "0,20",
      label: "BATTERIA",
      tone: "text-edison-green",
    },
    {
      icon: PlugZap,
      value: state?.rete ?? "0,30",
      label: "RETE",
      tone: "text-edison-orange",
    },
  ];

  const toNumber = (val: any): number => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const parsed = parseFloat(val.replace(/,/g, "."));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const deriveEnergyData = () => {
    const fv = toNumber(state?.fotovoltaico ?? 0);
    const bat = toNumber(state?.batteria ?? 0);
    const net = toNumber(state?.rete ?? 0);
    const total = fv + bat + net;
    if (total === 0) return [];
    return [
      { label: `Fotovoltaico`, value: fv, color: COLORS[0] },
      { label: `Batteria`, value: bat, color: COLORS[2] },
      { label: `Rete`, value: net, color: COLORS[1] },
    ];
  };

  // ── Section renderers ───────────────────────────────────────────────

  const getSeries = (override: any, data: any[]) => {
    if (override.series?.length) return override.series;
    const first = data[0] ?? {};
    const keys = Object.keys(first).filter(
      (key) => !["label", "value", "color"].includes(key),
    );
    if (keys.length) {
      return keys.map((key, index) => ({
        key,
        label: key,
        color: COLORS[index % COLORS.length],
      }));
    }
    return [
      {
        key: "value",
        label: override.title ?? "Valore",
        color: override.color ?? COLORS[0],
      },
    ];
  };

  const chartCard = (title: string | undefined, children: React.ReactNode) => (
    <div className="rounded-[1.7rem] bg-card px-5 py-5 shadow-xl shadow-black/10">
      {title && (
        <p className="mb-2 text-sm font-semibold text-foreground/60">
          {title}
        </p>
      )}
      {children}
    </div>
  );

  const renderLine = (override: any, data: any[], className = "") =>
    chartCard(
      override.title,
      <div className={className} style={{ width: "100%", height: 210 }}>
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              interval={data.length <= 8 ? 0 : "preserveEnd"}
              tick={{ fontSize: data.length <= 8 ? 9 : 10 }}
              angle={data.length <= 8 ? -25 : 0}
              textAnchor={data.length <= 8 ? "end" : "middle"}
              height={data.length <= 8 ? 46 : 30}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            {getSeries(override, data).map((series: any) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                stroke={series.color}
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>,
    );

  const renderStackedBar = (override: any, data: any[], className = "") =>
    chartCard(
      override.title,
      <div className={className} style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              interval={data.length <= 8 ? 0 : "preserveEnd"}
              tick={{ fontSize: data.length <= 8 ? 9 : 10 }}
              angle={data.length <= 8 ? -25 : 0}
              textAnchor={data.length <= 8 ? "end" : "middle"}
              height={data.length <= 8 ? 46 : 30}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            {getSeries(override, data).map((series: any) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                stackId="energy"
                fill={series.color}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>,
    );

  const renderGauge = (override: any, value: number) =>
    chartCard(
      override.title ?? "Autoconsumo",
      <div className="relative mx-auto h-[190px] max-w-[260px]">
        <ResponsiveContainer width="100%" height={190}>
          <RadialBarChart
            cx="50%"
            cy="80%"
            innerRadius="78%"
            outerRadius="100%"
            barSize={18}
            data={[
              {
                name: "Autoconsumo",
                value,
                fill: override.color ?? COLORS[0],
              },
            ]}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background cornerRadius={12} />
            <Tooltip />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-5 text-center">
          <p className="text-4xl font-bold text-foreground/80">{value}%</p>
          <p className="text-xs font-bold uppercase text-muted-foreground">
            self
          </p>
        </div>
      </div>,
    );

  const renderMetrics = () => {
    const override = overrides.metrics;
    if (!override || override.type === "grid") {
      return (
        <div className="mt-5 grid grid-cols-3 gap-3">
          {metrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      );
    }
    const data = override.data?.length
      ? override.data
      : [
          { label: "Fotovoltaico", value: toNumber(state?.fotovoltaico) },
          { label: "Batteria", value: toNumber(state?.batteria) },
          { label: "Rete", value: toNumber(state?.rete) },
        ];
    if (override.type === "pie") {
      return (
        <div className="mt-5 rounded-[1.7rem] bg-card px-5 py-5 shadow-xl shadow-black/10">
          {override.title && (
            <p className="text-sm font-semibold text-foreground/60 mb-2">
              {override.title}
            </p>
          )}
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.map((item: any, j: number) => (
                    <Cell
                      key={j}
                      fill={item.color ?? COLORS[j % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }
    if (override.type === "bar") {
      return (
        <div className="mt-5 rounded-[1.7rem] bg-card px-5 py-5 shadow-xl shadow-black/10">
          {override.title && (
            <p className="text-sm font-semibold text-foreground/60 mb-2">
              {override.title}
            </p>
          )}
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  interval={data.length <= 8 ? 0 : "preserveEnd"}
                  tick={{ fontSize: data.length <= 8 ? 9 : 10 }}
                  angle={data.length <= 8 ? -25 : 0}
                  textAnchor={data.length <= 8 ? "end" : "middle"}
                  height={data.length <= 8 ? 46 : 30}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar
                  dataKey="value"
                  name={override.unit ?? override.title ?? "Valore"}
                  fill={override.color ?? "#22c55e"}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }
    if (override.type === "line") return renderLine(override, data, "mt-5");
    if (override.type === "stackedBar") {
      return renderStackedBar(override, data, "mt-5");
    }
    if (override.type === "gauge") {
      return (
        <div className="mt-5">
          {renderGauge(override, override.value ?? state?.selfPercent ?? 78)}
        </div>
      );
    }
    return (
      <div className="mt-5 grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>
    );
  };

  const renderConsumption = () => {
    const override = overrides.consumption;
    const selfPercent = override?.selfPercent ?? state?.selfPercent ?? 78;
    if (!override || override.type === "card") {
      return (
        <ConsumptionCard
          kwh={override?.kwh ?? state?.consumption ?? "2,40"}
          selfPercent={selfPercent}
        />
      );
    }
    const data = override.data?.length ? override.data : deriveEnergyData();
    if (override.type === "pie") {
      return (
        <div className="rounded-[1.7rem] bg-card px-5 py-5 shadow-xl shadow-black/10">
          {override.title && (
            <p className="text-sm font-semibold text-foreground/60 mb-2">
              {override.title}
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {data.map((item: any, j: number) => (
                      <Cell
                        key={j}
                        fill={item.color ?? COLORS[j % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 pt-2">
              {data.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 text-sm text-foreground/80"
                >
                  <span
                    className="inline-flex h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        item.color ?? COLORS[idx % COLORS.length],
                    }}
                  />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (override.type === "bar") {
      return (
        <div className="rounded-[1.7rem] bg-card px-5 py-5 shadow-xl shadow-black/10">
          {override.title && (
            <p className="text-sm font-semibold text-foreground/60 mb-2">
              {override.title}
            </p>
          )}
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  interval={data.length <= 8 ? 0 : "preserveEnd"}
                  tick={{ fontSize: data.length <= 8 ? 9 : 10 }}
                  angle={data.length <= 8 ? -25 : 0}
                  textAnchor={data.length <= 8 ? "end" : "middle"}
                  height={data.length <= 8 ? 46 : 30}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill={override.color ?? "#22c55e"}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }
    if (override.type === "line") return renderLine(override, data);
    if (override.type === "stackedBar") return renderStackedBar(override, data);
    if (override.type === "gauge") {
      return renderGauge(override, override.value ?? selfPercent);
    }
    return (
      <ConsumptionCard
        kwh={state?.consumption ?? "2,40"}
        selfPercent={selfPercent}
      />
    );
  };

  const renderDevices = () => (
    <>
      <div className="mt-5 flex border-b border-border text-center text-base font-semibold">
        <button className="flex flex-1 items-center justify-center gap-1.5 border-b-2 border-edison-green py-3 text-edison-green">
          <Radio className="h-4 w-4" strokeWidth={2.2} /> Live
        </button>
        <button className="flex-1 py-3 text-muted-foreground">Dicembre</button>
      </div>
      <div className="mt-4 space-y-3 pb-5">
        {devices.map((d: any) => (
          <DeviceRow
            key={d.name}
            name={d.name}
            value={d.value}
            icon={WashingMachine}
          />
        ))}
      </div>
    </>
  );

  // ── Section map ─────────────────────────────────────────────────────
  const sectionMap: Record<string, () => React.ReactNode> = {
    metrics: renderMetrics,
    consumption: renderConsumption,
    devices: renderDevices,
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-secondary">
      <header className="edison-header px-5 pt-10 pb-4">
        <div className="relative flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <h1 className="text-base font-bold uppercase tracking-wide">
              Ottimizzazione Smart
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {onResetAll && (
              <button
                type="button"
                onClick={onResetAll}
                className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white/80 transition hover:bg-white/10"
              >
                Reset
              </button>
            )}
            <ToggleRight className="h-8 w-8" />
          </div>
        </div>
      </header>

      <section className="px-4 pt-4">
        {/* Weather — always visible */}
        <div className="flex items-center justify-between text-sm font-semibold text-foreground/70">
          <span>Previsione meteo</span>
          <span className="flex items-center gap-1">
            <CloudSun className="h-6 w-6" />
            {temperature}
          </span>
        </div>

        {/* Connector lines — only show if both metrics and consumption are present */}
        {sections.includes("metrics") && sections.includes("consumption") && (
          <div className="mx-auto mt-4 grid w-[78%] grid-cols-3 items-end text-center">
            <div className="h-10 rounded-bl-2xl border-b-2 border-l-2 border-edison-green-light" />
            <div className="mx-auto h-12 w-px bg-edison-green" />
            <div className="h-10 rounded-br-2xl border-b-2 border-r-2 border-edison-orange" />
          </div>
        )}

        {/* Render sections in agent-controlled order */}
        {sections.map((section) => (
          <div key={section} className="mt-4">
            {sectionMap[section]?.()}
          </div>
        ))}
      </section>
    </div>
  );
}
