import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Spinner } from "./spinner";

const meta = {
  title: "Feedback/Spinner",
  component: Spinner,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Spinner — animated SVG loading indicator, sized via Tailwind size-* classes on wrapper.",
      },
    },
  },
} satisfies Meta<typeof Spinner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Spinner className="size-6" />,
};
export const Small: Story = {
  render: () => <Spinner className="size-4" />,
};
export const Large: Story = {
  render: () => <Spinner className="size-12" />,
};
export const ColoredViaCurrentColor: Story = {
  render: () => (
    <div className="text-info">
      <Spinner className="size-8" />
    </div>
  ),
};
