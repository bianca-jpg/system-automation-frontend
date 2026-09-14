import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ActionButton } from "./action-button";

const meta = {
  title: "Content/ActionButton",
  component: ActionButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "ActionButton composite — wraps Button (variant=ghost, ripple). 4 cva axes (variant × size × width × shape) — at the cva-max-axes cap (4). Default width is `full`; pass `width=\"auto\"` for inline buttons.",
      },
    },
  },
  args: { children: "Action" },
} satisfies Meta<typeof ActionButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { width: "auto" } };
export const Secondary: Story = {
  args: { variant: "secondary", width: "auto" },
};
export const Danger: Story = { args: { variant: "danger", width: "auto" } };
export const Subtle: Story = { args: { variant: "subtle", width: "auto" } };
export const Contrast: Story = {
  args: { variant: "contrast", width: "auto" },
};

export const Overlay: Story = {
  args: { variant: "overlay", width: "auto" },
  decorators: [
    (Story) => (
      // eslint-disable-next-line better-tailwindcss/no-restricted-classes -- TODO(@dudxs 2026-05-10): Storybook decorator only — `bg-zinc-900` is the dark backdrop used to visualize the overlay variant. Not production code; decorator backgrounds intentionally use palette defaults for visual contrast against the variant being shown.
      <div className="rounded-md bg-zinc-900 p-6">
        <Story />
      </div>
    ),
  ],
};

export const SizeSmall: Story = {
  args: { size: "sm", width: "auto", children: "Small" },
};
export const SizeDefault: Story = {
  args: { size: "default", width: "auto", children: "Default" },
};
export const SizeLarge: Story = {
  args: { size: "lg", width: "auto", children: "Large" },
};

export const WidthFull: Story = {
  args: { width: "full", children: "Full width (default)" },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const ShapePill: Story = {
  args: { shape: "pill", width: "auto", children: "Pill shape" },
};

export const Disabled: Story = {
  args: { disabled: true, width: "auto" },
};

export const VariantStack: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton variant="primary" width="auto">
        Primary
      </ActionButton>
      <ActionButton variant="secondary" width="auto">
        Secondary
      </ActionButton>
      <ActionButton variant="danger" width="auto">
        Danger
      </ActionButton>
      <ActionButton variant="subtle" width="auto">
        Subtle
      </ActionButton>
      <ActionButton variant="contrast" width="auto">
        Contrast
      </ActionButton>
    </div>
  ),
};
