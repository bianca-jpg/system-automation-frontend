import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SkipLink } from "./skip-link";

const meta = {
  title: "Navigation/SkipLink",
  component: SkipLink,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A keyboard-first shortcut to the primary landmark. Press Tab in the canvas to reveal it; pair the target with `tabIndex={-1}`.",
      },
    },
  },
} satisfies Meta<typeof SkipLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="min-h-[28rem] bg-background p-page-gutter text-foreground">
      <SkipLink targetId="storybook-main-content" />
      <p className="text-sm text-muted-foreground">
        Pressione Tab para revelar o atalho de navegação.
      </p>
      <main
        id="storybook-main-content"
        tabIndex={-1}
        className="mt-section-gap rounded-surface border ds-border-control bg-card p-6 shadow-card outline-none focus-visible:ds-focus-ring "
      >
        Conteúdo principal
      </main>
    </div>
  ),
};

export const CustomLabel: Story = {
  render: () => (
    <div className="min-h-[20rem] bg-background p-page-gutter">
      <SkipLink targetId="search-results">Ir para os resultados</SkipLink>
      <main id="search-results" tabIndex={-1}>
        Resultados da busca
      </main>
    </div>
  ),
};
