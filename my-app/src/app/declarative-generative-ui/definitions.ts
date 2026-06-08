/**
 * Edison A2UI Catalog — Component Definitions
 */

import { z } from "zod";

export const demonstrationCatalogDefinitions = {
  Title: {
    description: "A heading. Use for section titles and page headers.",
    props: z.object({
      text: z.string(),
      level: z.string().optional(),
    }),
  },

  Row: {
    description: "Horizontal layout container.",
    props: z.object({
      gap: z.number().optional(),
      align: z.string().optional(),
      justify: z.string().optional(),
      children: z.union([
        z.array(z.string()),
        z.object({ componentId: z.string(), path: z.string() }),
      ]),
    }),
  },

  Column: {
    description: "Vertical layout container.",
    props: z.object({
      gap: z.number().optional(),
      align: z.string().optional(),
      children: z.union([
        z.array(z.string()),
        z.object({ componentId: z.string(), path: z.string() }),
      ]),
    }),
  },

  DashboardCard: {
    description:
      "A card container with title and optional subtitle. Has a 'child' slot for content.",
    props: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      child: z.string().optional(),
    }),
  },

  Metric: {
    description:
      "A key metric display with label, value, and optional trend indicator.",
    props: z.object({
      label: z.string(),
      value: z.string(),
      trend: z.enum(["up", "down", "neutral"]).optional(),
      trendValue: z.string().optional(),
    }),
  },

  PieChart: {
    description:
      "A pie/donut chart. Provide data as array of {label, value, color} objects.",
    props: z.object({
      data: z.array(
        z.object({
          label: z.string(),
          value: z.number(),
          color: z.string().optional(),
        }),
      ),
      innerRadius: z.number().optional(),
    }),
  },

  BarChart: {
    description:
      "A bar chart. Provide data as array of {label, value} objects.",
    props: z.object({
      data: z.array(z.object({ label: z.string(), value: z.number() })),
      color: z.string().optional(),
    }),
  },

  Badge: {
    description: "A small status badge. Use for labels, statuses, categories.",
    props: z.object({
      text: z.string(),
      variant: z
        .enum(["success", "warning", "error", "info", "neutral"])
        .optional(),
    }),
  },

  DataTable: {
    description: "A data table with columns and rows.",
    props: z.object({
      columns: z.array(z.object({ key: z.string(), label: z.string() })),
      rows: z.array(z.record(z.any())),
    }),
  },

  Button: {
    description: "An interactive button with an action event.",
    props: z.object({
      child: z
        .string()
        .describe("The ID of the child component for the label."),
      variant: z.enum(["primary", "secondary", "ghost"]).optional(),
      action: z
        .union([
          z.object({
            event: z.object({
              name: z.string(),
              context: z.record(z.any()).optional(),
            }),
          }),
          z.null(),
        ])
        .optional(),
    }),
  },

  EdisonMetricCard: {
    description:
      "An Edison solar energy metric card showing a kW value with label. Use for fotovoltaico, batteria, rete.",
    props: z.object({
      label: z.string(),
      value: z.string(),
      unit: z.string().optional(),
      tone: z.enum(["green", "orange"]).optional(),
    }),
  },

  EdisonDeviceRow: {
    description:
      "A device row in the Edison dashboard showing a device name and energy value.",
    props: z.object({
      name: z.string(),
      value: z.string(),
    }),
  },

  EdisonConsumptionCard: {
    description:
      "The Edison home consumption card showing total kW usage and self-consumption percentage bar.",
    props: z.object({
      kwh: z.string(),
      selfPercent: z.number(),
      message: z.string().optional(),
    }),
  },
};

export type DemonstrationCatalogDefinitions =
  typeof demonstrationCatalogDefinitions;
