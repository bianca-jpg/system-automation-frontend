import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { UnderDevelopment } from "./under-development";

const meta = {
  title: "Content/UnderDevelopment",
  component: UnderDevelopment,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "UnderDevelopment — placeholder screen for sections not yet implemented. Drift cleaned (Pitfall #3): palette-default classes replaced with semantic tokens (bg-info, bg-warning, text-warning-foreground, text-muted-foreground).",
      },
    },
  },
} satisfies Meta<typeof UnderDevelopment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
