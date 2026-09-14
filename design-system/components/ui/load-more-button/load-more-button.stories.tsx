import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LoadMoreButton } from "./load-more-button";

const meta = {
  title: "Content/LoadMoreButton",
  component: LoadMoreButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          'LoadMoreButton — opinionated wrapper around ActionButton (variant="secondary", size="sm") with default label "Carregar mais". Full-width on mobile, fixed minimum width on sm+ breakpoint.',
      },
    },
  },
} satisfies Meta<typeof LoadMoreButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CustomLabel: Story = {
  args: { children: "Carregar mais 10" },
};
export const Disabled: Story = { args: { disabled: true } };

export const InContext: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">
        Mostrando 20 de 100 resultados
      </p>
      <LoadMoreButton />
    </div>
  ),
};
