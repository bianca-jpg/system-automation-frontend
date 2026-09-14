import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { fn } from "storybook/test";

import { ConfirmCodeScreen } from "./confirm-code-screen";

const meta = {
  title: "Content/ConfirmCodeScreen",
  component: ConfirmCodeScreen,
  args: {
    value: "",
    onValueChange: fn(),
    email: "pessoa@example.com",
    onVerify: fn(),
    onResend: fn(),
  },
} satisfies Meta<typeof ConfirmCodeScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = React.useState("");
    return (
      <ConfirmCodeScreen
        {...args}
        value={value}
        onValueChange={setValue}
      />
    );
  },
};

export const Error: Story = {
  args: {
    value: "123456",
    onValueChange: fn(),
    error: "Código inválido ou expirado.",
  },
};

export const Cooldown: Story = {
  args: {
    value: "",
    onValueChange: fn(),
    resendCooldownSeconds: 87,
  },
};
