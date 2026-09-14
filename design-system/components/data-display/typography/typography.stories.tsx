import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Typography } from "./typography";

const meta = {
  title: "Content/Typography",
  component: Typography,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Polymorphic Typography composite — renders as any HTML element via the `as` prop. Variants (h1..caption) and colors (primary, soft, info, etc.) are class maps applied via `cn()`. Role classes live in `tokens.ts`.",
      },
    },
  },
  args: { children: "The quick brown fox jumps over the lazy dog" },
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Typography as="h1" variant="h1">
        H1 — Headline
      </Typography>
      <Typography as="h2" variant="h2">
        H2 — Section
      </Typography>
      <Typography as="h3" variant="h3">
        H3 — Subsection
      </Typography>
      <Typography as="h4" variant="h4">
        H4 — Card title
      </Typography>
      <Typography variant="lead">Lead — intro paragraph</Typography>
      <Typography variant="body">Body — paragraph copy</Typography>
      <Typography variant="small">Small — supporting text</Typography>
      <Typography variant="caption">Caption — metadata</Typography>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-2 bg-background p-4">
      <Typography color="primary">primary</Typography>
      <Typography color="soft">soft (muted-foreground)</Typography>
      <Typography color="info">info</Typography>
      <Typography color="destructive">destructive</Typography>
      <Typography color="secondary">secondary</Typography>
    </div>
  ),
};

export const Default: Story = {};
