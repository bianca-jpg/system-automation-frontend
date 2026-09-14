import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Markdown } from "./markdown";

const meta = {
  title: "Content/Markdown",
  component: Markdown,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Markdown — react-markdown renderer with GFM + line-break plugins. Anchors get DS link styling and open in a new tab by default. Pass `components` to override individual element renderers.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLE = `# Markdown

A short demo of **inline bold**, *italic*, [a link](https://example.com), and a list:

- First item
- Second item
- Third item

> Blockquote text
`;

export const Default: Story = {
  args: { children: SAMPLE },
};

export const Empty: Story = {
  args: { children: null },
};
