import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CapsLockWarning } from "./caps-lock-warning";

const meta = {
  title: "Feedback/CapsLockWarning",
  component: CapsLockWarning,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          'CapsLockWarning — inline status message rendered next to a password field. Returns null when `visible=false`. Uses `role="status"` + `aria-live="polite"` so screen readers announce the warning when the user toggles Caps Lock.',
      },
    },
  },
} satisfies Meta<typeof CapsLockWarning>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = { args: { visible: true } };
export const Hidden: Story = {
  args: { visible: false },
  parameters: {
    docs: {
      description: {
        story:
          "When `visible=false` the component returns null — nothing renders. Storybook canvas appears empty.",
      },
    },
  },
};
export const CustomMessage: Story = {
  args: {
    visible: true,
    message: "Atenção: Caps Lock está ativado nesta tela.",
  },
};

export const InContext: Story = {
  args: { visible: true },
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex w-80 flex-col gap-1">
      <label htmlFor="cw-pwd" className="text-sm font-medium text-foreground">
        Senha
      </label>
      <input
        id="cw-pwd"
        type="password"
        className="ds-border-control rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="••••••••"
        aria-describedby="cw-warn"
      />
      <CapsLockWarning visible id="cw-warn" />
    </div>
  ),
};
