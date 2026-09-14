import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LogoWithTitle } from "./logo-with-title";

const meta = {
  title: "Content/LogoWithTitle",
  component: LogoWithTitle,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "LogoWithTitle — brand mark used in auth screens. Uses the dark logo asset on light backgrounds and the white logo on dark backgrounds (CSS-only swap; no JS theme detection needed).",
      },
    },
  },
} satisfies Meta<typeof LogoWithTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InCard: Story = {
  render: () => (
    <div className="rounded-2xl bg-card p-12">
      <LogoWithTitle />
    </div>
  ),
};
