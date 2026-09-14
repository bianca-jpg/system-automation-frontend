import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MessageReceipt } from "./message-receipt";

const meta = {
  title: "Data Display/MessageReceipt",
  component: MessageReceipt,
  args: {
    status: "sending",
  },
  argTypes: {
    status: {
      control: "inline-radio",
      options: ["sending", "received", "read"],
    },
  },
  decorators: [
    (Story) => (
      <div className="rounded-3xl bg-(--chat-user-bubble-messaging) px-4 py-3 text-(--chat-user-bubble-foreground-messaging)">
        <span className="mr-2 text-sm">Mensagem enviada</span>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Confirmação acessível de envio, recebimento e leitura. O tooltip nativo não adiciona uma parada de foco ao chat.",
      },
    },
  },
} satisfies Meta<typeof MessageReceipt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sending: Story = {};

export const Received: Story = {
  args: { status: "received" },
};

export const Read: Story = {
  args: { status: "read" },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-xs">
      <span className="inline-flex items-center gap-1">
        Enviando <MessageReceipt status="sending" />
      </span>
      <span className="inline-flex items-center gap-1">
        Recebida <MessageReceipt status="received" />
      </span>
      <span className="inline-flex items-center gap-1">
        Visualizada <MessageReceipt status="read" />
      </span>
    </div>
  ),
};
