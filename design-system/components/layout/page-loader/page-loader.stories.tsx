import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PageLoader } from "./page-loader";

const meta = {
  title: "Layout/PageLoader",
  component: PageLoader,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "PageLoader — full-screen loading affordance built on Spinner. Used by Next.js `loading.tsx` boundaries.",
      },
    },
  },
} satisfies Meta<typeof PageLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomMessage: Story = {
  args: { message: "Buscando candidatos..." },
};

export const Inline: Story = {
  args: { fullScreen: false, className: "min-h-[300px]" },
};
