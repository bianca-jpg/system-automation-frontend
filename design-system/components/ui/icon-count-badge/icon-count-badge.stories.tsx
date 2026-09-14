import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bell } from "lucide-react";

import { IconCountBadge } from "./icon-count-badge";

const meta = {
  title: "DataDisplay/IconCountBadge",
  component: IconCountBadge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "IconCountBadge — small indicator usually overlaid on an icon (e.g., notification bell). Returns null when count <= 0 unless `showZero=true`. Use `display=dot` for unread/status indicators without numeric quantity.",
      },
    },
  },
} satisfies Meta<typeof IconCountBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { count: 3 } };
export const Info: Story = {
  args: { count: 3, variant: "info" },
  parameters: {
    docs: {
      description: {
        story:
          "Info variant (azul) — para indicadores não-críticos como mensagens novas e notificações, onde o vermelho destructive comunicaria urgência indevida.",
      },
    },
  },
};
export const Dot: Story = {
  args: { count: 3, display: "dot" },
  parameters: {
    docs: {
      description: {
        story:
          "Dot display — unread/status indicator without exposing the quantity visually.",
      },
    },
  },
};
export const Zero: Story = {
  args: { count: 0, showZero: true },
  parameters: {
    docs: {
      description: {
        story: "With `showZero=true`, renders 0 instead of returning null.",
      },
    },
  },
};
export const ZeroHidden: Story = {
  args: { count: 0 },
  parameters: {
    docs: {
      description: {
        story:
          "Default behavior — count <= 0 returns null (renders nothing). Storybook shows empty.",
      },
    },
  },
};
export const Many: Story = { args: { count: 99 } };
export const Overflow: Story = { args: { count: 150 } };
export const CustomMax: Story = { args: { count: 15, maxCount: 9 } };

export const OnIcon: Story = {
  args: { count: 3 },
  render: () => (
    <span className="relative inline-flex">
      <Bell className="size-6 text-foreground" aria-hidden />
      <IconCountBadge
        count={3}
        display="dot"
        className="absolute -top-1 -right-1.5"
      />
    </span>
  ),
};

export const Counts: Story = {
  args: { count: 0 },
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex items-center gap-4">
      <IconCountBadge count={1} />
      <IconCountBadge count={5} />
      <IconCountBadge count={12} />
      <IconCountBadge count={99} />
      <IconCountBadge count={150} />
    </div>
  ),
};
