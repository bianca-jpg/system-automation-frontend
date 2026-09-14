import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ThemeIconToggle } from "./theme-icon-toggle";

const meta = {
  title: "Content/ThemeToggle",
  component: ThemeIconToggle,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "ThemeToggle — ThemeIconToggle (icon-only) flips between light and dark themes via useTheme.",
      },
    },
  },
} satisfies Meta<typeof ThemeIconToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Icon: Story = {
  render: () => <ThemeIconToggle />,
};
