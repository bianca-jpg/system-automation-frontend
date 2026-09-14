import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Inbox } from "lucide-react";

import { Button } from "../../ui/button";
import { EmptyState } from "./empty-state";

const meta = {
  title: "Feedback/EmptyState",
  component: EmptyState,
  args: {
    icon: <Inbox className="size-6" />,
    title: "Nenhum resultado encontrado",
    description: "Ajuste os filtros ou tente novamente mais tarde.",
    action: <Button>Tentar novamente</Button>,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Inline: Story = { args: { variant: "inline", size: "sm" } };
export const Dashed: Story = { args: { variant: "dashed" } };
