import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  HorizontalBarChart,
  type HorizontalBarData,
} from "./horizontal-bar-chart";

const meta = {
  title: "DataDisplay/HorizontalBarChart",
  component: HorizontalBarChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "HorizontalBarChart — minimal percentage chart. Legacy color names remain API-compatible but resolve to semantic `--analytics-chart-*` tokens, so bars follow light/dark and color themes.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HorizontalBarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLE: HorizontalBarData[] = [
  { name: "Engineering", value: 78, color: "blue" },
  { name: "Product", value: 56, color: "sky" },
  { name: "Design", value: 42, color: "cyan" },
  { name: "Operations", value: 23, color: "indigo" },
];

const WITH_TOOLTIPS: HorizontalBarData[] = SAMPLE.map((item) => ({
  ...item,
  tooltip: {
    title: item.name,
    description: `Score-card breakdown for the ${item.name} pipeline.`,
  },
}));

export const Default: Story = {
  args: { data: SAMPLE },
};

export const WithTooltips: Story = {
  args: { data: WITH_TOOLTIPS },
};

export const HideValues: Story = {
  args: { data: SAMPLE, showValues: false },
};
