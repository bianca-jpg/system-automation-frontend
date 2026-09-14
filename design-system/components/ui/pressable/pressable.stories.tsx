import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Pressable } from "./pressable";

const meta = {
  title: "Primitives/Pressable",
  component: Pressable,
  args: {
    children: "Área pressionável",
    variant: "surface",
    size: "md",
  },
} satisfies Meta<typeof Pressable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Pressed: Story = { args: { pressed: true } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
