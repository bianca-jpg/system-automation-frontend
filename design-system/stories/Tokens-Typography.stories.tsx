import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Typography,
  type TypographyVariant,
} from "../components/data-display/typography";

const meta = {
  title: "Tokens/Typography",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "The design system owns the stable `--font-sans`, `--font-heading` and `--font-satoshi` contract. Each app intentionally acts as the `next/font/local` adapter and injects Satoshi without moving font binaries into this package. Supported weights are 400, 500 and 700.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type FamilyToken = {
  name: string;
  varName: string;
  cssVar: string;
  description: string;
  sample: string;
};

const Families: FamilyToken[] = [
  {
    name: "Sans (body)",
    varName: "--font-sans",
    cssVar: "var(--font-sans)",
    description:
      "Satoshi first via the app adapter; then --font-inter and offline-safe system fallbacks.",
    sample: "System Automation — interface clara e direta para decisões rápidas.",
  },
  {
    name: "Heading",
    varName: "--font-heading",
    cssVar: "var(--font-heading)",
    description:
      "Apps load Satoshi through next/font/local and inject --font-satoshi; the design system keeps the shared alias and fallback contract.",
    sample: "Vagas, candidatos e admissões em uma única vitrine.",
  },
  {
    name: "Mono",
    varName: "--font-mono",
    cssVar: "var(--font-mono)",
    description:
      "System monospace stack (ui-monospace, SFMono-Regular, Menlo, ...). Used for code, IDs, numeric data.",
    sample: "TOKEN_ID = 0xA1B2C3 // process.env.NEXT_PUBLIC_API_URL",
  },
];

const Scale: Array<{ variant: TypographyVariant; label: string }> = [
  { variant: "h1", label: "Heading 1 · 32/40px · 700" },
  { variant: "h2", label: "Heading 2 · 28/32px · 700" },
  { variant: "h3", label: "Heading 3 · 22/24px · 700" },
  { variant: "h4", label: "Heading 4 · 18/20px · 700" },
  { variant: "lead", label: "Lead · 16/18px · 500" },
  { variant: "body", label: "Body · 16px · 500" },
  { variant: "small", label: "Small · 14px · 500" },
  { variant: "caption", label: "Caption · 12px · 500" },
];

const Weights = [
  {
    name: "Regular",
    token: "--typography-font-weight-regular",
    utility: "font-normal / font-regular",
    className: "font-normal",
    value: 400,
  },
  {
    name: "Medium",
    token: "--typography-font-weight-medium",
    utility: "font-medium",
    className: "font-medium",
    value: 500,
  },
  {
    name: "Bold",
    token: "--typography-font-weight-bold",
    utility: "font-bold",
    className: "font-bold",
    value: 700,
  },
] as const;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Font families
        </h3>
        <div className="flex flex-col gap-6">
          {Families.map(({ name, varName, cssVar, description, sample }) => (
            <div
              key={varName}
              className="flex flex-col gap-2 rounded-md border ds-border-control p-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {name}
                </span>
                <code className="text-xs font-mono text-muted-foreground">
                  {varName}
                </code>
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
              <p
                className="text-xl text-foreground"
                style={{ fontFamily: cssVar }}
              >
                {sample}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Supported weights
        </h3>
        <div className="grid gap-control-gap rounded-surface border ds-border-control p-4 sm:grid-cols-3">
          {Weights.map(({ name, token, utility, className, value }) => (
            <div key={token} className="flex flex-col gap-inline-compact">
              <span className={`${className} text-foreground`}>
                {name} · {value}
              </span>
              <code className="text-xs font-mono text-muted-foreground">
                {utility} · {token}
              </code>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Semantic role scale
        </h3>
        <div className="flex flex-col gap-2 rounded-md border ds-border-control p-4">
          {Scale.map(({ variant, label }) => (
            <Typography key={variant} variant={variant}>
              {label}
            </Typography>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Heading vs body
        </h3>
        <div className="flex flex-col gap-2 rounded-md border ds-border-control p-4">
          <Typography as="h2" variant="h2">
            Heading via the shared role contract
          </Typography>
          <Typography variant="body" color="soft">
            Body copy via font-sans utility — same paragraph, different family.
            Switch theme in toolbar to confirm font tokens stay consistent.
          </Typography>
          <code className="text-sm font-mono text-foreground">
            const ratio = (heading / body).toFixed(2);
          </code>
        </div>
      </section>
    </div>
  ),
};
