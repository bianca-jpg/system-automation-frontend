import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ErrorCard } from "./error-card";

const meta = {
  title: "Content/ErrorCard",
  component: ErrorCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "ErrorCard — Card composition for user-facing errors. `variant=\"inline\"` (default) is compact for lists; `variant=\"section\"` is full-width for empty pages. Includes optional retry button.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ErrorCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithRetry: Story = {
  args: {
    title: "Falha ao carregar candidatos",
    description: "Tentamos várias vezes mas a resposta não chegou.",
    onRetry: () => undefined,
  },
};

export const SectionVariant: Story = {
  args: {
    variant: "section",
    title: "Não foi possível carregar a página",
    description:
      "Verifique sua conexão e tente novamente. Se o problema persistir, contate o suporte.",
    onRetry: () => undefined,
  },
};
