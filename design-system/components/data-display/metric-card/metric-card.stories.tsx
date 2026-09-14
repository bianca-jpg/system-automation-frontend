import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TrendingUp, Users } from "lucide-react";

import { MetricCard } from "./metric-card";

const meta = {
  title: "DataDisplay/MetricCard",
  component: MetricCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "MetricCard — Card composition for KPI/metric display. Combines Card (Plan 35-4) + Tooltip (Plan 35-2) + Typography. The icon is polymorphic (LucideIcon component or any ReactNode).",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Active candidates",
    value: "1,284",
    description: "+12% vs last month",
    icon: Users,
  },
};

export const WithTooltip: Story = {
  args: {
    title: "Conversion rate",
    value: "37%",
    description: "Hover the icon for details",
    icon: TrendingUp,
    tooltip: "Conversion = candidates that signed an offer / total interviews.",
  },
};

export const NoDescription: Story = {
  args: {
    title: "Open positions",
    value: "42",
  },
};
