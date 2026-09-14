import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { BackButton } from "./back-button";

const meta = {
  title: "Navigation/BackButton",
  component: BackButton,
  args: {
    onBack: fn(),
  },
} satisfies Meta<typeof BackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const IconOnly: Story = {
  args: { iconOnly: true, accessibleLabel: "Voltar para a lista" },
};
export const Link: Story = {
  render: () => <BackButton href="/destino" />,
};

export const HistoryWithFallback: Story = {
  render: () => (
    <BackButton mode="history" fallbackHref="/inicio" label="Voltar ao início" />
  ),
};
