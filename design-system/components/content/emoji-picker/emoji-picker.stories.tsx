import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";

import { EmojiPickerButton } from "./emoji-picker";

const meta = {
  title: "Form/EmojiPicker",
  component: EmojiPickerButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "EmojiPickerButton — toggle button + lazy-loaded emoji picker. The picker is pre-loaded on first hover (optimistic) and toggled on click. Closes on outside click or Escape key.",
      },
    },
  },
  args: { onEmojiSelect: () => undefined },
} satisfies Meta<typeof EmojiPickerButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Connected: Story = {
  render: () => {
    const Demo = () => {
      const [picked, setPicked] = React.useState<string[]>([]);
      return (
        <div className="flex flex-col items-center gap-3">
          <EmojiPickerButton
            onEmojiSelect={(emoji) => setPicked((prev) => [...prev, emoji])}
          />
          <div className="text-2xl">{picked.join(" ")}</div>
        </div>
      );
    };
    return <Demo />;
  },
};
