import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";

import { PasswordInput } from "./password-input";

const meta = {
  title: "Form/PasswordInput",
  component: PasswordInput,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "PasswordInput — Input wrapper with built-in visibility toggle (controlled or uncontrolled). The toggle is keyboard-focusable in the natural tab order by default.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    placeholder: "Password",
    defaultValue: "secretValue",
  },
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Controlled: Story = {
  render: () => {
    const Demo = () => {
      const [show, setShow] = React.useState(false);
      return (
        <div className="flex flex-col gap-2">
          <PasswordInput
            showPassword={show}
            onShowPasswordChange={setShow}
            defaultValue="value"
            aria-label="Password"
          />
          <p className="text-xs text-muted-foreground">show: {String(show)}</p>
        </div>
      );
    };
    return <Demo />;
  },
};
