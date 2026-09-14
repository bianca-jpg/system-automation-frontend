import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TooltipProvider } from "../tooltip";
import { CopyButton } from "./copy-button";

const meta = {
  title: "Content/CopyButton",
  component: CopyButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          'CopyButton — clipboard wrapper with two appearances: `inline` (lightweight ghost-style with optional icon-only mode) and `button` (composes `buttonVariants` from ui/button). Optional Tooltip envelope shows the current label ("Copiar"/"Copiado").',
      },
    },
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof CopyButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InlineWithLabel: Story = {
  args: { text: "Hello, world!", appearance: "inline", showLabel: true },
};

export const InlineIconOnly: Story = {
  args: { text: "Click to copy", appearance: "inline", showLabel: false },
};

export const ButtonAppearance: Story = {
  args: { text: "Texto longo para copiar", appearance: "button", showLabel: true },
};

export const ButtonIconOnly: Story = {
  args: { text: "Copy me", appearance: "button", showLabel: false },
};

export const WithTooltip: Story = {
  args: {
    text: "Tooltip example",
    appearance: "inline",
    showLabel: false,
    tooltip: true,
  },
};

export const ButtonOutlineVariant: Story = {
  args: {
    text: "Custom variant",
    appearance: "button",
    variant: "outline",
    size: "sm",
  },
};
