import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "./input-otp";

const meta = {
  title: "Form/InputOTP",
  component: InputOTP,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "InputOTP compound primitive — wraps the `input-otp` package's OTPInput. Ref-as-prop converted on 4 sub-components (InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator). InputOTPSlot consumes OTPInputContext to render char/caret/active state.",
      },
    },
  },
} satisfies Meta<typeof InputOTP>;
export default meta;
type Story = StoryObj<typeof meta>;

// InputOTP requires children at the type level but stories provide them in render,
// so we satisfy a Story shape that omits the required `children` arg.
type RenderOnlyStory = Pick<Story, "render" | "parameters">;

export const Default: RenderOnlyStory = {
  render: () => (
    <InputOTP maxLength={6} aria-label="One-time code">
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  ),
};

export const FourDigits: RenderOnlyStory = {
  render: () => (
    <InputOTP maxLength={4} aria-label="Four-digit code">
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  ),
};

export const Disabled: RenderOnlyStory = {
  render: () => (
    <InputOTP maxLength={6} disabled aria-label="Disabled one-time code">
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
    </InputOTP>
  ),
};
