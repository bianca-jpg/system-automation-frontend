import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TextReveal } from "./text-reveal";

const meta = {
  title: "Content/TextReveal",
  component: TextReveal,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "TextReveal — framer-motion word-by-word reveal triggered by viewport intersection. Honors prefers-reduced-motion (renders inline plain text without animation when set).",
      },
    },
  },
} satisfies Meta<typeof TextReveal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    segments: [{ text: "Reveal me word by word, smoothly." }],
  },
};

export const MultiSegment: Story = {
  args: {
    segments: [
      { text: "Welcome to" },
      { text: "System Automation.", className: "font-bold text-primary" },
    ],
    className: "text-2xl",
  },
};
