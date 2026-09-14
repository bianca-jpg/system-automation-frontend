import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Tokens/Layers",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Global stacking scale for content, sticky UI, popovers, modals and toasts. Local component internals may still use small relative z-index values; portal-level surfaces consume these semantic layers.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const Layers = [
  {
    name: "Content",
    varName: "--layer-content",
    utility: "z-content",
    value: 0,
  },
  {
    name: "Raised",
    varName: "--layer-raised",
    utility: "z-raised",
    value: 10,
  },
  {
    name: "Sticky",
    varName: "--layer-sticky",
    utility: "z-sticky",
    value: 20,
  },
  {
    name: "Navigation",
    varName: "--layer-navigation",
    utility: "z-navigation",
    value: 30,
  },
  {
    name: "Popover",
    varName: "--layer-popover",
    utility: "z-popover",
    value: 40,
  },
  {
    name: "Overlay",
    varName: "--layer-overlay",
    utility: "z-overlay",
    value: 45,
  },
  {
    name: "Modal",
    varName: "--layer-modal",
    utility: "z-modal",
    value: 50,
  },
  {
    name: "Toast",
    varName: "--layer-toast",
    utility: "z-toast",
    value: 60,
  },
  {
    name: "Skip link",
    varName: "--layer-skip-link",
    utility: "z-skip-link",
    value: 70,
  },
] as const;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-section-gap">
      <div>
        <h3 className="text-lg font-heading font-bold text-foreground">
          Global layer scale
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Higher roles always sit above lower roles. Prefer the named utility or
          `z-[var(--layer-role)]` over numeric/z-[9999] values.
        </p>
      </div>

      <div className="grid gap-content-gap sm:grid-cols-2 lg:grid-cols-3">
        {Layers.map(({ name, varName, utility, value }) => (
          <article
            key={varName}
            className="relative rounded-surface border ds-border-control bg-card p-4 shadow-card"
            style={{ zIndex: `var(${varName})` }}
          >
            <span className="text-sm font-bold text-foreground">{name}</span>
            <div className="mt-3 flex flex-col gap-inline-compact">
              <code className="text-xs font-mono text-muted-foreground">
                {varName}: {value}
              </code>
              <code className="text-xs font-mono text-info-text">
                {utility}
              </code>
            </div>
          </article>
        ))}
      </div>
    </div>
  ),
};
