import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Tokens/Spacing",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "The declared layout-level shell token plus the Tailwind utility spacing scale. Only variables implemented in `tokens/spacing.css` are documented here.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type LayoutToken = {
  name: string;
  varName: string;
  description: string;
  utility?: string;
};

const LayoutTokens: LayoutToken[] = [
  {
    name: "Inline compact",
    varName: "--space-inline-compact",
    utility: "gap-inline-compact",
    description: "Tight icon/text and badge internals (4px).",
  },
  {
    name: "Control gap",
    varName: "--space-control-gap",
    utility: "gap-control-gap",
    description: "Standard spacing between control children (8px).",
  },
  {
    name: "Content gap",
    varName: "--space-content-gap",
    utility: "gap-content-gap",
    description: "Spacing between related content groups (16px).",
  },
  {
    name: "Section gap",
    varName: "--space-section-gap",
    utility: "gap-section-gap",
    description: "Separation between sections in a surface (24px).",
  },
  {
    name: "Page gutter",
    varName: "--space-page-gutter",
    utility: "px-page-gutter",
    description: "Responsive page edge padding: clamp(16px, 2.5vw, 32px).",
  },
  {
    name: "Shell max width",
    varName: "--layout-shell-max-width",
    description:
      "Maximum content width for app shells (currently 1600px). Used by the page-shell wrapper.",
  },
];

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Layout tokens (`--layout-*`)
        </h3>
        <p className="text-sm text-muted-foreground">
          Theme-agnostic dimensions. Bars below render at the actual token
          width, capped to the viewport for visibility.
        </p>
        <div className="flex flex-col gap-3 rounded-md border ds-border-control p-4">
          {LayoutTokens.map(({ name, varName, description, utility }) => (
            <div key={varName} className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {name}
                </span>
                <code className="text-xs font-mono text-muted-foreground">
                  {varName}
                </code>
                {utility && (
                  <code className="text-xs font-mono text-info-text">
                    {utility}
                  </code>
                )}
              </div>
              <div
                role="img"
                className="h-3 rounded-pill bg-primary"
                style={{
                  width: `min(var(${varName}), 100%)`,
                  maxWidth: `var(${varName})`,
                }}
                aria-label={`Width sample for ${name}`}
              />
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Consumer utilities
        </h3>
        <p className="text-sm text-muted-foreground">
          The `@theme inline` bridge exposes the semantic spacing roles to
          Tailwind. Arbitrary CSS-var syntax remains available during migration.
        </p>
        <div className="flex flex-col gap-2 rounded-md border ds-border-control p-4">
          {LayoutTokens.filter((token) => token.utility).map(
            ({ varName, utility }) => (
              <div key={varName} className="flex items-center gap-3">
                <code className="w-36 text-xs font-mono text-muted-foreground">
                  {utility}
                </code>
                <div
                  className="flex items-center"
                  style={{ gap: `var(${varName})` }}
                >
                  <div className="h-4 w-4 rounded-interactive bg-secondary" />
                  <div className="h-4 w-4 rounded-interactive bg-secondary" />
                  <div className="h-4 w-4 rounded-interactive bg-secondary" />
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  ),
};
