import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";

import { ShimmeringText } from "./shimmering-text";

const meta = {
  title: "Content/ShimmeringText",
  component: ShimmeringText,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "ShimmeringText — framer-motion text crossfade with vertical offset. Honors prefers-reduced-motion (no blur, near-zero duration when set). Useful for status messages that update frequently.",
      },
    },
  },
  args: { text: "Loading something amazing..." },
} satisfies Meta<typeof ShimmeringText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Heading: Story = {
  args: {
    text: "System Automation",
    className: "text-2xl font-heading",
  },
};

export const Cycling: Story = {
  render: () => {
    const Demo = () => {
      const messages = [
        "Searching candidates",
        "Ranking matches",
        "Almost there",
        "Done!",
      ];
      const [index, setIndex] = React.useState(0);
      React.useEffect(() => {
        const id = window.setInterval(() => {
          setIndex((current) => (current + 1) % messages.length);
        }, 1500);
        return () => window.clearInterval(id);
      }, [messages.length]);
      return <ShimmeringText text={messages[index] ?? ""} className="text-base" />;
    };
    return <Demo />;
  },
};
