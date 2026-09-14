import type * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";

const meta = {
  title: "Content/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Button primitive — ref-as-prop React 19, cva variants (variant/size), asChild via Radix Slot, ripple opt-in, loading state with size lock. Default height is 40px with `radius-control`; default `w-full` remains for backwards compatibility.",
      },
    },
  },
  args: { children: "Button" },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Outline: Story = { args: { variant: "outline" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Destructive: Story = { args: { variant: "destructive" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const LinkVariant: Story = { args: { variant: "link" } };
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };
export const IconSize: Story = { args: { size: "icon", children: "★" } };
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };
export const Ripple: Story = { args: { ripple: true } };
export const AsChildAnchor: Story = {
  render: (args) => (
    <Button {...args} asChild>
      <a href="#">Anchor as Button</a>
    </Button>
  ),
};

export const ActionStates: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Common action-button states after the base sizing refresh: smaller default height, control radius, disabled state, and loading state with locked dimensions.",
      },
    },
  },
  render: () => (
    <div className="flex max-w-md flex-wrap items-center gap-3">
      <Button className="w-auto">Enviar atestado</Button>
      <Button className="w-auto" disabled>
        Enviar atestado
      </Button>
      <Button className="w-auto" loading>
        Enviar atestado
      </Button>
    </div>
  ),
};

// FE-STORY-04 — variant matrix story (representative grid).
// Plan 35-4 covered Badge + Card matrices; this completes the >2-axes set per CONTEXT.md.
// Renders 6 variants × 3 sizes = 18 cells (default + sm + lg sizes; icon sizes excluded
// since they don't render with text content). Documents both the visual cross-product
// and the cva axes (variant × size) that consumers can mix.
type ButtonProps = React.ComponentProps<typeof Button>;

const VARIANT_MATRIX_VARIANTS: Array<NonNullable<ButtonProps["variant"]>> = [
  "default",
  "outline",
  "ghost",
  "secondary",
  "destructive",
  "link",
];

const VARIANT_MATRIX_SIZES: Array<NonNullable<ButtonProps["size"]>> = [
  "sm",
  "default",
  "lg",
];

export const VariantMatrix: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Variant matrix (FE-STORY-04) — 6 variants × 3 sizes = 18 representative cells. Mirrors the Plan 35-4 Badge + Card matrices to complete the >2-axes coverage. Icon sizes (`icon`, `icon-sm`, `icon-lg`) are excluded because they don't render text content; render `<Button size='icon'>★</Button>` separately for icon-only variants.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-4">
      {VARIANT_MATRIX_VARIANTS.map((variant) => (
        <section key={variant} className="flex flex-col gap-2">
          <h3 className="text-sm font-heading text-foreground capitalize">
            {variant}
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
            {VARIANT_MATRIX_SIZES.map((size) => (
              <Button key={size} variant={variant} size={size}>
                {variant}/{size}
              </Button>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};
