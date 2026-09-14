import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "../input";
import { Label } from "./label";

const meta = {
  title: "Form/Label",
  component: Label,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Label primitive — Radix Label wrapper with ref-as-prop signature. Pair with <Input> via htmlFor or implicit nesting.",
      },
    },
  },
  args: { children: "Email" },
} satisfies Meta<typeof Label>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInput: Story = {
  render: (args) => (
    <div className="flex w-80 flex-col gap-2">
      <Label htmlFor="email-demo" {...args}>
        Email
      </Label>
      <Input id="email-demo" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export const WithDisabledPeer: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <Label htmlFor="d" className="peer-disabled:cursor-not-allowed">
        Disabled peer
      </Label>
      <Input
        id="d"
        disabled
        defaultValue="Cannot edit"
        className="peer"
      />
    </div>
  ),
};
