import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PageShell } from "./page-shell";

const meta = {
  title: "Layout/PageShell",
  component: PageShell,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "PageShell — root layout container for authenticated pages. Constrains width via `--layout-shell-max-width` and applies responsive padding. Wraps PageHeader + page content.",
      },
    },
  },
} satisfies Meta<typeof PageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <PageShell>
      <h1 className="text-2xl font-bold">Welcome</h1>
      <p className="text-muted-foreground">
        Use PageShell as the outer container for any authenticated screen. It
        clamps width and applies the standard responsive padding.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border ds-border-surface p-4">Card 1</div>
        <div className="rounded-lg border ds-border-surface p-4">Card 2</div>
        <div className="rounded-lg border ds-border-surface p-4">Card 3</div>
      </div>
    </PageShell>
  ),
};
