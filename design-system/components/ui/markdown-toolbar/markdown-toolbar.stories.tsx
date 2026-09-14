import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";

import { MarkdownToolbar, type MarkdownToolbarAction } from "./markdown-toolbar";

const meta = {
  title: "Form/MarkdownToolbar",
  component: MarkdownToolbar,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "MarkdownToolbar — strip of formatting buttons for a markdown editor. Each button delegates the action via `onAction`. Configurable via `actions` (subset of bold/italic/bullet-list/ordered-list/heading/link).",
      },
    },
  },
  args: { onAction: () => undefined },
} satisfies Meta<typeof MarkdownToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Reduced: Story = {
  args: { actions: ["bold", "italic", "link"] },
};

export const WithLog: Story = {
  render: () => {
    const Demo = () => {
      const [last, setLast] = React.useState<MarkdownToolbarAction | null>(
        null,
      );
      return (
        <div className="flex flex-col gap-2">
          <MarkdownToolbar onAction={(action) => setLast(action)} />
          <p className="text-xs text-muted-foreground">
            last action: {last ?? "—"}
          </p>
        </div>
      );
    };
    return <Demo />;
  },
};
