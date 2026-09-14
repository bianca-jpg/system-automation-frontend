import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./input";

const meta = {
  title: "Form/Input",
  component: Input,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Input primitive — function statement, native HTML <input> with DS focus ring, aria-invalid styling, disabled state.",
      },
    },
  },
  args: { placeholder: "Type something..." },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "wrong@" },
};
export const Password: Story = {
  args: { type: "password", defaultValue: "secret" },
};
export const Email: Story = {
  args: { type: "email", placeholder: "you@example.com" },
};
export const FileType: Story = { args: { type: "file" } };
