import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Separator } from "./separator";

const meta = {
  title: "Layout/Separator",
  component: Separator,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Separator primitive — Radix Separator wrapper. Supports horizontal/vertical orientation and 4 surface variants (default, divider, seam, surface).",
      },
    },
  },
} satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <p className="text-sm text-foreground">Above the separator</p>
      <Separator />
      <p className="text-sm text-foreground">Below the separator</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-10 items-center gap-3">
      <span className="text-sm text-foreground">Left</span>
      <Separator orientation="vertical" />
      <span className="text-sm text-foreground">Right</span>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-mono text-muted-foreground">default</p>
        <Separator variant="default" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-mono text-muted-foreground">divider</p>
        <Separator variant="divider" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-mono text-muted-foreground">seam</p>
        <Separator variant="seam" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-mono text-muted-foreground">surface</p>
        <Separator variant="surface" />
      </div>
    </div>
  ),
};
