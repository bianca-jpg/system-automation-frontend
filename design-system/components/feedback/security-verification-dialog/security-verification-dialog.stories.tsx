import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SecurityVerificationDialog } from "./security-verification-dialog";

const meta = {
  title: "Feedback/SecurityVerificationDialog",
  component: SecurityVerificationDialog,
  args: {
    open: true,
    title: "Verificação de segurança",
    description: "Confirme que você é humano para continuar.",
    children: (
      <div className="rounded-lg border ds-border-surface bg-muted/10 p-4 text-sm text-foreground">
        O provedor de verificação é renderizado neste espaço.
      </div>
    ),
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Shell responsivo e temático para verificações de segurança. O app injeta o provedor e escolhe se o modal pode ser dispensado.",
      },
    },
  },
} satisfies Meta<typeof SecurityVerificationDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dismissible: Story = {};

export const Required: Story = {
  args: {
    dismissible: false,
    description:
      "Conclua a verificação obrigatória para continuar o acesso à sua conta.",
  },
};
