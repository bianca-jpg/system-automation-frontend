import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Tokens/Shadows",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Elevation tokens. Defined in `tokens/shadows.css`; light theme uses softer slate-tinted shadows, dark theme uses stronger black-tinted shadows for legibility on dark surfaces. Switch theme in toolbar to compare.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type ShadowToken = {
  name: string;
  varName: string;
  description: string;
  exampleLabel: string;
};

const Tokens: ShadowToken[] = [
  {
    name: "Shadow control",
    varName: "--shadow-control",
    description: "Interactive-control hover/pressed elevation.",
    exampleLabel: "Control surface",
  },
  {
    name: "Shadow card",
    varName: "--shadow-card",
    description: "Resting elevation for contained card surfaces.",
    exampleLabel: "Card surface",
  },
  {
    name: "Shadow popover",
    varName: "--shadow-popover",
    description:
      "Floating surfaces (popovers, dropdowns, tooltips). Higher blur (40-48px) and stronger alpha.",
    exampleLabel: "Popover surface",
  },
  {
    name: "Shadow modal",
    varName: "--shadow-modal",
    description: "Highest surface elevation for modal dialogs.",
    exampleLabel: "Modal surface",
  },
];

const ElevationUtilities: Array<{
  className: string;
  description: string;
}> = [
  {
    className: "shadow-control",
    description: "Controls and compact interactive surfaces",
  },
  {
    className: "shadow-card",
    description: "Resting cards",
  },
  {
    className: "shadow-popover",
    description: "Menus, tooltips and popovers",
  },
  {
    className: "shadow-modal",
    description: "Modal dialogs",
  },
];

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          DS elevation tokens
        </h3>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 p-6">
          {Tokens.map(({ name, varName, description, exampleLabel }) => (
            <div key={varName} className="flex flex-col gap-3">
              <div
                className="flex h-32 w-full items-center justify-center rounded-surface bg-card text-card-foreground"
                style={{ boxShadow: `var(${varName})` }}
                aria-label={`Shadow sample for ${name}`}
              >
                <span className="text-sm font-medium">{exampleLabel}</span>
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
          Semantic elevation utilities
        </h3>
        <p className="text-sm text-muted-foreground">
          `@theme inline` exposes each token as a stable Tailwind utility.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 p-4">
          {ElevationUtilities.map(({ className, description }) => (
            <div key={className} className="flex flex-col gap-2">
              <div
                className={`flex h-24 w-full items-center justify-center rounded-surface bg-card text-card-foreground ${className}`}
              >
                <code className="text-xs font-mono">{className}</code>
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  ),
};
