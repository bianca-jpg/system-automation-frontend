import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Tokens/Radius",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Border-radius tokens with canonical control/card/pill roles plus consumer aliases: interactive/surface/round. `--border-radius` remains a legacy compatibility alias.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type RadiusToken = {
  name: string;
  varName: string;
  cssValue: string;
  description: string;
};

const Tokens: RadiusToken[] = [
  {
    name: "Radius base",
    varName: "--radius",
    cssValue: "0.625rem",
    description:
      "Base radius (10px). Inherited by --radius-control unless overridden.",
  },
  {
    name: "Radius control",
    varName: "--radius-control",
    cssValue: "0.625rem",
    description:
      "Buttons, inputs, selects. Same as base; locked here so future tweaks decouple from card.",
  },
  {
    name: "Radius card",
    varName: "--radius-card",
    cssValue: "1rem",
    description:
      "Cards, dialog surfaces, popovers. Bigger to read as 'container'.",
  },
  {
    name: "Radius pill",
    varName: "--radius-pill",
    cssValue: "9999px",
    description: "Pill shapes (badges, status chips, segmented controls).",
  },
  {
    name: "Interactive alias",
    varName: "--radius-interactive",
    cssValue: "var(--radius-control)",
    description: "Consumer alias for controls (`rounded-interactive`).",
  },
  {
    name: "Surface alias",
    varName: "--radius-surface",
    cssValue: "var(--radius-card)",
    description: "Consumer alias for containers (`rounded-surface`).",
  },
  {
    name: "Round alias",
    varName: "--radius-round",
    cssValue: "var(--radius-pill)",
    description: "Consumer alias for pills/circles (`rounded-round`).",
  },
];

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Radius tokens
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Tokens.map(({ name, varName, cssValue, description }) => (
            <div key={varName} className="flex flex-col gap-2">
              <div
                className="flex h-24 w-full items-center justify-center bg-secondary text-secondary-foreground-strong"
                style={{ borderRadius: `var(${varName})` }}
                aria-label={`Radius sample for ${name}`}
              >
                <span className="text-sm font-medium">{cssValue}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">
                  {name}
                </span>
                <code className="text-xs font-mono text-muted-foreground">
                  {varName}
                </code>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Applied to typical components
        </h3>
        <div className="flex flex-col gap-3 rounded-surface border ds-border-control p-4">
          <button
            type="button"
            className="bg-primary px-4 py-2 text-primary-foreground"
            style={{ borderRadius: "var(--radius-control)" }}
          >
            Button — radius-control
          </button>
          <div
            className="bg-card p-4 text-card-foreground border ds-border-control"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            Card surface — radius-card
          </div>
          <span
            className="inline-flex w-max bg-secondary px-3 py-1 text-secondary-foreground-strong"
            style={{ borderRadius: "var(--radius-pill)" }}
          >
            Pill badge — radius-pill
          </span>
        </div>
      </section>
    </div>
  ),
};
