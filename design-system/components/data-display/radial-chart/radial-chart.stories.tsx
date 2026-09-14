import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import RadialChart from "./radial-chart";

const meta = {
  title: "DataDisplay/RadialChart",
  component: RadialChart,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "RadialChart — circular progress indicator with semantic-token color (`info` / `success` / `warning` / `destructive` / `muted`). Renders inline SVG with smooth dashOffset animation.",
      },
    },
  },
} satisfies Meta<typeof RadialChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 75, max: 100 },
};

export const Success: Story = {
  args: { value: 92, color: "success" },
};

export const Warning: Story = {
  args: { value: 60, color: "warning" },
};

export const Destructive: Story = {
  args: { value: 22, color: "destructive" },
};

export const Compact: Story = {
  args: { value: 47, size: 120, strokeWidth: 12 },
};

export const WithCustomLabel: Story = {
  args: {
    value: 8,
    max: 10,
    labelFormatter: (v, m) => `${v} / ${m}`,
  },
};
