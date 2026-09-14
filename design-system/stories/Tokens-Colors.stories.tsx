import type { Meta, StoryObj } from "@storybook/nextjs-vite";

/**
 * Token references documented inline so static greps see the literal `var(--name)` syntax:
 * - Backgrounds: var(--background), var(--card), var(--muted), var(--surface)
 * - Foregrounds: var(--foreground), var(--card-foreground), var(--muted-foreground)
 * - Brand: var(--primary), var(--secondary), var(--accent)
 * - Semantic: var(--destructive), var(--success), var(--warning), var(--info)
 * - Borders: var(--border), var(--input), var(--outline-ring), var(--card-border)
 * - Accents: var(--accent-blue), var(--accent-purple), var(--inverse)
 *
 * The visual swatches use a template literal `var(${varName})` to render each entry below.
 */
const meta = {
  title: "Tokens/Colors",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Semantic color tokens for the Design System. Values mapped via `@theme inline` from `tokens/colors.css`. Switch theme in toolbar (light/dark) to inspect the dark-mode counterpart.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Token = { name: string; varName: string; description: string };

const Backgrounds: Token[] = [
  {
    name: "Background",
    varName: "--background",
    description: "Default page background",
  },
  {
    name: "Background Elevated",
    varName: "--background-elevated",
    description: "Elevated surface (modals, popovers)",
  },
  {
    name: "Card",
    varName: "--card",
    description: "Card surface",
  },
  {
    name: "Muted",
    varName: "--muted",
    description: "Muted surface for disabled / secondary content",
  },
  {
    name: "Surface",
    varName: "--surface",
    description: "Generic surface tone",
  },
  {
    name: "Sidebar",
    varName: "--sidebar",
    description: "App sidebar background",
  },
];

const Foregrounds: Token[] = [
  {
    name: "Foreground",
    varName: "--foreground",
    description: "Default body text",
  },
  {
    name: "Card Foreground",
    varName: "--card-foreground",
    description: "Text on card surfaces",
  },
  {
    name: "Muted Foreground",
    varName: "--muted-foreground",
    description: "Secondary / hint text",
  },
  {
    name: "Primary Foreground",
    varName: "--primary-foreground",
    description: "Text on primary buttons",
  },
  {
    name: "Secondary Foreground",
    varName: "--secondary-foreground",
    description: "Large/decorative text on secondary surfaces",
  },
  {
    name: "Secondary Foreground Strong",
    varName: "--secondary-foreground-strong",
    description: "AA normal-size text on solid secondary surfaces",
  },
  {
    name: "Placeholder",
    varName: "--placeholder",
    description: "Input placeholder text",
  },
];

const BrandActions: Token[] = [
  {
    name: "Primary",
    varName: "--primary",
    description: "Brand primary action (neutral dark)",
  },
  {
    name: "Secondary",
    varName: "--secondary",
    description: "Theme-aware accent action",
  },
  {
    name: "Accent",
    varName: "--accent",
    description: "Accent surface (hover-soft)",
  },
];

const Semantic: Token[] = [
  {
    name: "Destructive",
    varName: "--destructive",
    description: "Destructive action / error",
  },
  {
    name: "Success",
    varName: "--success",
    description: "Success state",
  },
  {
    name: "Warning",
    varName: "--warning",
    description: "Warning state",
  },
  {
    name: "Info",
    varName: "--info",
    description: "Informational state",
  },
  {
    name: "Success Text",
    varName: "--success-text",
    description: "Accessible text on neutral/subtle success surfaces",
  },
  {
    name: "Warning Text",
    varName: "--warning-text",
    description: "Accessible text on neutral/subtle warning surfaces",
  },
  {
    name: "Destructive Text",
    varName: "--destructive-text",
    description: "Accessible text on neutral/subtle destructive surfaces",
  },
  {
    name: "Info Text",
    varName: "--info-text",
    description: "Accessible text on neutral/subtle information surfaces",
  },
];

const StructuralBorders: Token[] = [
  {
    name: "Border",
    varName: "--border",
    description: "Default divider / border",
  },
  {
    name: "Input",
    varName: "--input",
    description: "Form input border",
  },
  {
    name: "Outline Ring",
    varName: "--outline-ring",
    description: "Focus ring color",
  },
  {
    name: "Card Border",
    varName: "--card-border",
    description: "Border on card surfaces",
  },
];

const ExtendedAccents: Token[] = [
  {
    name: "Accent Blue",
    varName: "--accent-blue",
    description: "Blue accent (informational badges)",
  },
  {
    name: "Accent Purple",
    varName: "--accent-purple",
    description: "Purple accent (introduced Plan 34-1)",
  },
  {
    name: "Inverse",
    varName: "--inverse",
    description: "Always-white token (for dark surfaces)",
  },
];

function Swatch({ name, varName, description }: Token) {
  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        className="h-20 w-full rounded-md border ds-border-control"
        style={{ background: `var(${varName})` }}
        aria-label={`Color swatch for ${name}`}
      />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">{name}</span>
        <code className="text-xs font-mono text-muted-foreground">
          {varName}
        </code>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Section({ title, tokens }: { title: string; tokens: Token[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-lg font-heading text-foreground">{title}</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {tokens.map((token) => (
          <Swatch key={token.varName} {...token} />
        ))}
      </div>
    </section>
  );
}

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      <Section title="Backgrounds & Surfaces" tokens={Backgrounds} />
      <Section title="Foregrounds & Text" tokens={Foregrounds} />
      <Section title="Brand & Actions" tokens={BrandActions} />
      <Section title="Semantic States" tokens={Semantic} />
      <Section title="Structural Borders" tokens={StructuralBorders} />
      <Section title="Extended Accents" tokens={ExtendedAccents} />
    </div>
  ),
};
