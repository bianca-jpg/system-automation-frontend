import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Progress } from "./progress";

const meta = {
  title: "Feedback/Progress",
  component: Progress,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Progress primitive — Radix Progress wrapper. Dual cva paired by variant axis (root track + indicator fill share { default, success, warning, destructive, info }). Supports `indeterminate` for loading states.",
      },
    },
  },
  args: {
    "aria-label": "Progresso da tarefa",
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { value: 50 } };
export const Empty: Story = { args: { value: 0 } };
export const Quarter: Story = { args: { value: 25 } };
export const Half: Story = { args: { value: 50 } };
export const ThreeQuarters: Story = { args: { value: 75 } };
export const Full: Story = { args: { value: 100 } };

export const Success: Story = { args: { value: 80, variant: "success" } };
export const Warning: Story = { args: { value: 60, variant: "warning" } };
export const Destructive: Story = {
  args: { value: 40, variant: "destructive" },
};
export const Info: Story = { args: { value: 65, variant: "info" } };

export const Indeterminate: Story = { args: { indeterminate: true } };

export const VariantStack: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p
          id="progress-variant-default"
          className="text-xs font-mono text-muted-foreground"
        >
          default 60%
        </p>
        <Progress value={60} aria-labelledby="progress-variant-default" />
      </div>
      <div className="flex flex-col gap-1">
        <p
          id="progress-variant-success"
          className="text-xs font-mono text-muted-foreground"
        >
          success 80%
        </p>
        <Progress
          value={80}
          variant="success"
          aria-labelledby="progress-variant-success"
        />
      </div>
      <div className="flex flex-col gap-1">
        <p
          id="progress-variant-warning"
          className="text-xs font-mono text-muted-foreground"
        >
          warning 60%
        </p>
        <Progress
          value={60}
          variant="warning"
          aria-labelledby="progress-variant-warning"
        />
      </div>
      <div className="flex flex-col gap-1">
        <p
          id="progress-variant-destructive"
          className="text-xs font-mono text-muted-foreground"
        >
          destructive 40%
        </p>
        <Progress
          value={40}
          variant="destructive"
          aria-labelledby="progress-variant-destructive"
        />
      </div>
      <div className="flex flex-col gap-1">
        <p
          id="progress-variant-info"
          className="text-xs font-mono text-muted-foreground"
        >
          info 65%
        </p>
        <Progress
          value={65}
          variant="info"
          aria-labelledby="progress-variant-info"
        />
      </div>
    </div>
  ),
};
